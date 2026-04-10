#!/usr/bin/env python3
"""
backup_manager.py — MarketHub Pro Backup Manager
=================================================
Moduri:
  python3 backup_manager.py incremental  — doar fișiere modificate de la ultimul backup
  python3 backup_manager.py standard     — cod + config + DB schema + env vars (fără node_modules/videos)
  python3 backup_manager.py total        — tot: cod + DB date complete + env vars + memory + Master_Template

Backup-urile se salvează în: ~/Documents/MarketHub_Backups/
"""

import os, sys, json, zipfile, datetime, subprocess, urllib.request, urllib.error
from pathlib import Path
from typing import Optional

# ── Config ────────────────────────────────────────────────────────────────────

PROJECT_ROOT = Path(__file__).parent
BACKUP_DIR   = Path.home() / "Claude"
MEMORY_DIR   = Path.home() / ".claude" / "projects" / "-Users-edyvanmix" / "memory"
MASTER_TPL   = Path.home() / "Documents" / "Master_Template"
ENV_FILE     = PROJECT_ROOT / ".env.local"
TIMESTAMP    = datetime.datetime.now().strftime("%Y-%m-%d_%H-%M")
LAST_BACKUP_FILE = BACKUP_DIR / ".last_backup"

SB_URL = "https://kashohhwsxyhyhhppvik.supabase.co"
SB_KEY = None  # loaded from .env.local

# Tabele de exportat (ordine contează pentru FK)
DB_TABLES = [
    "profiles", "campaigns", "assets", "client_portal_links",
    "bio_links", "hashtag_sets", "research_leads", "agent_runs",
    "agency_clients", "agency_contracts", "agency_onboarding",
    "affiliate_links", "trending_alert_config", "trending_alerts",
    "instagram_connections", "youtube_connections", "tiktok_connections",
    "scheduled_posts", "ai_credits", "api_cost_logs",
    "abuse_flags", "audit_logs", "discount_codes",
    "stripe_webhook_events", "cron_logs", "admin_platform_config",
]

EXCLUDE_EXTENSIONS = {
    ".mp4", ".mov", ".avi", ".mkv", ".wmv", ".m4v",
    ".mp3", ".wav", ".aiff", ".flac",
    ".psd", ".ai", ".prproj", ".ae", ".aep",
    ".zip", ".dmg", ".pkg", ".rar",
}

EXCLUDE_DIRS = {
    "node_modules", ".next", ".git", "__pycache__",
    ".turbo", "out", "dist", "build",
}

# ── Utils ─────────────────────────────────────────────────────────────────────

def log(msg: str, icon: str = "→"):
    print(f"  {icon} {msg}")

def load_env():
    global SB_KEY
    if not ENV_FILE.exists():
        log("⚠️  .env.local not found — DB backup skipped", "⚠️")
        return
    for line in ENV_FILE.read_text().splitlines():
        if line.startswith("SUPABASE_SERVICE_ROLE_KEY="):
            SB_KEY = line.split("=", 1)[1].strip().strip('"')
            break

def get_last_backup_time() -> Optional[datetime.datetime]:
    if LAST_BACKUP_FILE.exists():
        try:
            ts = float(LAST_BACKUP_FILE.read_text().strip())
            return datetime.datetime.fromtimestamp(ts)
        except Exception:
            pass
    return None

def set_last_backup_time():
    LAST_BACKUP_FILE.write_text(str(datetime.datetime.now().timestamp()))

def add_directory(zf: zipfile.ZipFile, src: Path, arc_prefix: str,
                  modified_after: Optional[datetime.datetime] = None,
                  skip_large: bool = False):
    """Add directory to zip, optionally filtering by modification time."""
    count = 0
    for root, dirs, files in os.walk(src):
        dirs[:] = [d for d in dirs if d not in EXCLUDE_DIRS]
        for fname in files:
            fpath = Path(root) / fname
            if fpath.suffix.lower() in EXCLUDE_EXTENSIONS:
                continue
            if skip_large and fpath.stat().st_size > 10 * 1024 * 1024:  # >10MB
                continue
            if modified_after:
                mtime = datetime.datetime.fromtimestamp(fpath.stat().st_mtime)
                if mtime <= modified_after:
                    continue
            arcname = arc_prefix + "/" + str(fpath.relative_to(src))
            zf.write(fpath, arcname)
            count += 1
    return count

def fetch_table(table: str, limit: int = 10000) -> list:
    if not SB_KEY:
        return []
    try:
        req = urllib.request.Request(
            f"{SB_URL}/rest/v1/{table}?select=*&limit={limit}",
            headers={
                "Authorization": f"Bearer {SB_KEY}",
                "apikey": SB_KEY,
            }
        )
        with urllib.request.urlopen(req, timeout=15) as resp:
            return json.loads(resp.read())
    except Exception as e:
        log(f"  ⚠️  {table}: {e}", "")
        return []

def export_db(zf: zipfile.ZipFile, mode: str):
    """Export DB tables as JSON files inside the zip."""
    if not SB_KEY:
        log("DB backup skipped (no SUPABASE_SERVICE_ROLE_KEY)", "⚠️")
        return

    log("Exportez baza de date Supabase...")
    db_data = {}
    tables_to_export = DB_TABLES if mode == "total" else ["profiles", "campaigns", "assets",
        "agency_clients", "agency_contracts", "agency_onboarding",
        "affiliate_links", "research_leads", "client_portal_links",
        "bio_links", "hashtag_sets"]

    for table in tables_to_export:
        rows = fetch_table(table)
        db_data[table] = rows
        log(f"  {table}: {len(rows)} rows")

    # Write as single JSON file
    db_json = json.dumps(db_data, indent=2, default=str, ensure_ascii=False)
    zf.writestr(f"db_export_{TIMESTAMP}.json", db_json)

    # Also write summary
    summary = {t: len(db_data.get(t, [])) for t in tables_to_export}
    zf.writestr("db_summary.json", json.dumps(summary, indent=2))

def export_env(zf: zipfile.ZipFile):
    """Export env vars with secrets partially masked for reference."""
    if not ENV_FILE.exists():
        return
    lines = []
    for line in ENV_FILE.read_text().splitlines():
        if "=" in line and not line.startswith("#"):
            key, val = line.split("=", 1)
            val = val.strip().strip('"')
            # Mask sensitive values partially
            sensitive = any(k in key.upper() for k in ["SECRET", "PASSWORD", "KEY", "TOKEN"])
            if sensitive and len(val) > 8:
                masked = val[:6] + "..." + val[-4:]
                lines.append(f"{key}={masked}")
            else:
                lines.append(f"{key}={val}")
        else:
            lines.append(line)
    zf.writestr("env_reference.txt", "\n".join(lines))
    log("Env vars exportate (parțial mascate)")

def export_git_info(zf: zipfile.ZipFile):
    """Export git log and current state info."""
    try:
        git_log = subprocess.check_output(
            ["git", "log", "--oneline", "-20"], cwd=PROJECT_ROOT, text=True
        )
        git_status = subprocess.check_output(
            ["git", "status", "--short"], cwd=PROJECT_ROOT, text=True
        )
        git_remote = subprocess.check_output(
            ["git", "remote", "-v"], cwd=PROJECT_ROOT, text=True
        )
        info = f"=== GIT LOG (last 20) ===\n{git_log}\n=== STATUS ===\n{git_status}\n=== REMOTE ===\n{git_remote}"
        zf.writestr("git_info.txt", info)
        log("Git info exportat")
    except Exception as e:
        log(f"Git info: {e}", "⚠️")

# ── Backup modes ───────────────────────────────────────────────────────────────

def backup_incremental():
    """Only files modified since last backup."""
    last = get_last_backup_time()
    if not last:
        print("  ⚠️  Nu există backup anterior. Rulează 'standard' prima dată.")
        print("  Continuând cu incremental de la 24h în urmă...")
        last = datetime.datetime.now() - datetime.timedelta(hours=24)

    zip_path = BACKUP_DIR / f"backup_incremental_{TIMESTAMP}.zip"
    print(f"\n📦 INCREMENTAL — fișiere modificate după {last.strftime('%Y-%m-%d %H:%M')}")

    with zipfile.ZipFile(zip_path, "w", zipfile.ZIP_DEFLATED) as zf:
        # Source code changes
        n = add_directory(zf, PROJECT_ROOT / "src", "src", modified_after=last)
        log(f"src/: {n} fișiere modificate")

        # Memory changes
        n = add_directory(zf, MEMORY_DIR, "memory", modified_after=last)
        log(f"memory/: {n} fișiere modificate")

        # Master Template changes
        if MASTER_TPL.exists():
            n = add_directory(zf, MASTER_TPL, "master_template", modified_after=last)
            log(f"master_template/: {n} fișiere modificate")

        # vercel.json, package.json, vercel.json changes
        for f in ["vercel.json", "package.json", "tsconfig.json", "tailwind.config.ts", "next.config.ts"]:
            fp = PROJECT_ROOT / f
            if fp.exists():
                mtime = datetime.datetime.fromtimestamp(fp.stat().st_mtime)
                if mtime > last:
                    zf.write(fp, f)
                    log(f"{f} modificat — inclus")

        export_git_info(zf)
        zf.writestr("backup_meta.json", json.dumps({
            "mode": "incremental", "timestamp": TIMESTAMP,
            "since": last.isoformat(), "files": zf.namelist()[:50]
        }, indent=2))

    size = zip_path.stat().st_size / 1024
    set_last_backup_time()
    print(f"\n  ✅ Salvat: {zip_path.name} ({size:.1f} KB)")
    return zip_path

def backup_standard():
    """Code + config + DB essential tables + env reference."""
    zip_path = BACKUP_DIR / f"backup_standard_{TIMESTAMP}.zip"
    print(f"\n📦 STANDARD — cod + config + DB esențial")

    with zipfile.ZipFile(zip_path, "w", zipfile.ZIP_DEFLATED) as zf:
        # Source code
        n = add_directory(zf, PROJECT_ROOT / "src", "src")
        log(f"src/: {n} fișiere")

        # Config files
        for f in ["vercel.json", "package.json", "tsconfig.json",
                   "tailwind.config.ts", "next.config.ts", ".gitignore", "AGENTS.md", "CLAUDE.md"]:
            fp = PROJECT_ROOT / f
            if fp.exists():
                zf.write(fp, f)
        log("Config files incluse")

        # Memory (Claude project context)
        n = add_directory(zf, MEMORY_DIR, "memory")
        log(f"memory/: {n} fișiere")

        # Master Template (text files only)
        if MASTER_TPL.exists():
            n = add_directory(zf, MASTER_TPL, "master_template")
            log(f"master_template/: {n} fișiere")

        # DB — essential tables only
        export_db(zf, "standard")

        # Env vars (masked)
        export_env(zf)
        export_git_info(zf)

        zf.writestr("backup_meta.json", json.dumps({
            "mode": "standard", "timestamp": TIMESTAMP,
            "project": "viralstat-dashboard (MarketHub Pro)",
            "git_head": subprocess.check_output(["git", "rev-parse", "--short", "HEAD"], cwd=PROJECT_ROOT, text=True).strip(),
        }, indent=2))

    size = zip_path.stat().st_size / 1024 / 1024
    set_last_backup_time()
    print(f"\n  ✅ Salvat: {zip_path.name} ({size:.1f} MB)")
    return zip_path

def backup_total():
    """Everything: all code + full DB + all configs + memory."""
    zip_path = BACKUP_DIR / f"backup_total_{TIMESTAMP}.zip"
    print(f"\n📦 TOTAL — backup complet al tuturor componentelor")

    with zipfile.ZipFile(zip_path, "w", zipfile.ZIP_DEFLATED, compresslevel=9) as zf:
        # Full source code
        n = add_directory(zf, PROJECT_ROOT / "src", "src")
        log(f"src/: {n} fișiere")

        # Public folder
        pub = PROJECT_ROOT / "public"
        if pub.exists():
            n = add_directory(zf, pub, "public")
            log(f"public/: {n} fișiere")

        # All config files
        for f in ["vercel.json", "package.json", "package-lock.json", "tsconfig.json",
                   "tailwind.config.ts", "next.config.ts", ".gitignore", "AGENTS.md",
                   "CLAUDE.md", "postcss.config.mjs"]:
            fp = PROJECT_ROOT / f
            if fp.exists():
                zf.write(fp, f)
        log("Toate config files incluse")

        # Supabase migrations
        migrations = PROJECT_ROOT / "supabase-migrations"
        if migrations.exists():
            n = add_directory(zf, migrations, "supabase-migrations")
            log(f"supabase-migrations/: {n} fișiere")

        # Memory
        n = add_directory(zf, MEMORY_DIR, "memory")
        log(f"memory/: {n} fișiere")

        # Master Template
        if MASTER_TPL.exists():
            n = add_directory(zf, MASTER_TPL, "master_template")
            log(f"master_template/: {n} fișiere")

        # DB — TOATE tabelele
        export_db(zf, "total")

        # Env vars (masked)
        export_env(zf)
        export_git_info(zf)

        # README pentru restaurare
        restore_guide = """# Ghid Restaurare — MarketHub Pro

## Conținut backup
- src/ — tot codul sursă Next.js
- public/ — fișiere publice
- supabase-migrations/ — migrări DB
- memory/ — context Claude (pentru sesiuni viitoare)
- master_template/ — template-uri locale agenție
- db_export_*.json — toate datele din Supabase
- env_reference.txt — referință env vars (secrete mascate)
- git_info.txt — ultimele 20 commits

## Restaurare completă

### 1. Cod
```bash
git clone https://github.com/markethub973-maker/markethub.git
cd markethub
npm install
```

### 2. Env vars
Copiază din env_reference.txt și completează valorile mascate
din Vercel Dashboard → Settings → Environment Variables

### 3. DB
Importă db_export_*.json manual în Supabase SQL Editor
sau folosește script-ul de import inclus.

### 4. Deploy
```bash
git push origin main  # Vercel deploy automat
```

## Credențiale importante (din Vercel)
- Supabase ref: kashohhwsxyhyhhppvik
- Vercel project: prj_HHkmEIEiIRuoyCFT22KAobqzUwaH
- Domain: markethubpromo.com
"""
        zf.writestr("RESTORE_GUIDE.md", restore_guide)

        zf.writestr("backup_meta.json", json.dumps({
            "mode": "total", "timestamp": TIMESTAMP,
            "project": "viralstat-dashboard (MarketHub Pro)",
            "git_head": subprocess.check_output(["git", "rev-parse", "--short", "HEAD"], cwd=PROJECT_ROOT, text=True).strip(),
            "db_tables": DB_TABLES,
            "files_count": len(zf.namelist()),
        }, indent=2))

    size = zip_path.stat().st_size / 1024 / 1024
    set_last_backup_time()
    print(f"\n  ✅ Salvat: {zip_path.name} ({size:.1f} MB)")
    return zip_path

# ── Cleanup old backups ────────────────────────────────────────────────────────

def cleanup_old_backups(keep: int = 5):
    """Keep only the last N backups of each type."""
    for mode in ["incremental", "standard", "total"]:
        files = sorted(BACKUP_DIR.glob(f"backup_{mode}_*.zip"), reverse=True)
        for old in files[keep:]:
            old.unlink()
            log(f"Șters backup vechi: {old.name}", "🗑️")

# ── Main ──────────────────────────────────────────────────────────────────────

def main():
    mode = sys.argv[1].lower() if len(sys.argv) > 1 else "standard"
    if mode not in ("incremental", "standard", "total"):
        print(f"Usage: python3 backup_manager.py [incremental|standard|total]")
        sys.exit(1)

    print(f"🔐 MarketHub Pro — Backup Manager")
    print(f"   Mod: {mode.upper()}")
    print(f"   Timestamp: {TIMESTAMP}")
    print(f"   Destinație: {BACKUP_DIR}")
    print()

    BACKUP_DIR.mkdir(parents=True, exist_ok=True)
    load_env()

    if mode == "incremental":
        backup_incremental()
    elif mode == "standard":
        backup_standard()
    elif mode == "total":
        backup_total()

    cleanup_old_backups(keep=5)

    print(f"\n✅ Backup {mode} complet!")
    print(f"   Locație: {BACKUP_DIR}")

if __name__ == "__main__":
    main()
