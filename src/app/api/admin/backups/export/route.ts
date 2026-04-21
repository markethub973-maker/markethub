import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import { isAdminAuthorized } from "@/lib/adminAuth";
import { execSync } from "child_process";
import * as fs from "fs";
import * as path from "path";
import archiver from "archiver";
import { PassThrough } from "stream";

export const maxDuration = 120;

const EXPORT_TABLES = [
  "profiles", "scheduled_posts", "publish_log", "instagram_connections",
  "tiktok_connections", "youtube_connections", "assets", "user_themes",
  "brain_knowledge_base", "brain_agent_activity", "brain_global_prospects",
  "outreach_log", "outreach_reply_log", "alerts", "hooks", "saved_captions",
  "saved_searches", "competitor_snapshots", "automation_runs", "api_tokens",
  "audit_logs", "cron_logs", "ops_incidents",
] as const;

async function fetchAllRows(
  supa: ReturnType<typeof createServiceClient>,
  table: string,
): Promise<Record<string, unknown>[]> {
  const all: Record<string, unknown>[] = [];
  let offset = 0;
  while (true) {
    const { data, error } = await supa.from(table).select("*").range(offset, offset + 999);
    if (error || !data || data.length === 0) break;
    all.push(...(data as Record<string, unknown>[]));
    if (data.length < 1000) break;
    offset += 1000;
  }
  return all;
}

/**
 * GET /api/admin/backups/export — Full platform export as ZIP
 *
 * Contents:
 * - /database/*.json — each table as separate JSON file
 * - /database/_manifest.json — table list, row counts, export date
 * - /source/ — full source code (git archive)
 * - /config/env-vars.json — env var NAMES (not values)
 * - /config/git-info.json — commit, branch, tags
 * - /config/package.json — dependencies
 * - /RESTORE.md — instructions for restoring
 */
export async function GET(req: NextRequest) {
  if (!isAdminAuthorized(req)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const supa = createServiceClient();
  const today = new Date().toISOString().slice(0, 10);
  const timestamp = new Date().toISOString();

  // Create ZIP using archiver
  const passthrough = new PassThrough();
  const archive = archiver("zip", { zlib: { level: 9 } });
  archive.pipe(passthrough);

  // 1. Database tables
  const manifest: Record<string, { rows: number }> = {};
  let totalRows = 0;

  for (const table of EXPORT_TABLES) {
    const rows = await fetchAllRows(supa, table);
    manifest[table] = { rows: rows.length };
    totalRows += rows.length;
    archive.append(JSON.stringify(rows, null, 2), { name: `database/${table}.json` });
  }

  archive.append(JSON.stringify({
    exported_at: timestamp,
    platform: "markethubpromo.com",
    total_tables: EXPORT_TABLES.length,
    total_rows: totalRows,
    tables: manifest,
  }, null, 2), { name: "database/_manifest.json" });

  // 2. Git info
  let gitCommit = "unknown";
  let gitBranch = "unknown";
  let gitTags = "";
  let gitLog = "";
  try {
    gitCommit = execSync("git rev-parse HEAD", { encoding: "utf8" }).trim();
    gitBranch = execSync("git branch --show-current", { encoding: "utf8" }).trim();
    gitTags = execSync("git tag --list 'v*'", { encoding: "utf8" }).trim();
    gitLog = execSync("git log --oneline -20", { encoding: "utf8" }).trim();
  } catch { /* running on Vercel, no git */ }

  archive.append(JSON.stringify({
    commit: gitCommit,
    branch: gitBranch,
    tags: gitTags.split("\n").filter(Boolean),
    recent_commits: gitLog.split("\n").filter(Boolean),
    exported_at: timestamp,
  }, null, 2), { name: "config/git-info.json" });

  // 3. Env var names
  const envVarNames = Object.keys(process.env).filter(k =>
    k.startsWith("NEXT_PUBLIC_") || k.startsWith("SUPABASE_") || k.startsWith("VERCEL_") ||
    k.startsWith("STRIPE_") || k.startsWith("FAL_") || k.startsWith("OPENAI_") ||
    k.startsWith("ANTHROPIC_") || k.startsWith("META_") || k.startsWith("INSTAGRAM_") ||
    k.startsWith("TIKTOK_") || k.startsWith("GOOGLE_") || k.startsWith("LINKEDIN_") ||
    k.startsWith("RESEND_") || k.startsWith("APIFY_") || k.startsWith("SERPER_") ||
    k === "ADMIN_PASSWORD" || k === "CRON_SECRET" || k === "BRAIN_CRON_SECRET"
  );

  archive.append(JSON.stringify({
    note: "These are env var NAMES only — values are NOT included for security",
    vars: envVarNames,
    total: envVarNames.length,
  }, null, 2), { name: "config/env-vars.json" });

  // 4. Package.json
  try {
    const pkgPath = path.join(process.cwd(), "package.json");
    if (fs.existsSync(pkgPath)) {
      archive.append(fs.readFileSync(pkgPath), { name: "config/package.json" });
    }
  } catch { /* skip */ }

  // 5. Source code — try git archive
  try {
    const sourceBuffer = execSync("git archive --format=tar HEAD", { maxBuffer: 100 * 1024 * 1024 });
    archive.append(sourceBuffer, { name: "source/code.tar" });
  } catch {
    // If git archive fails (Vercel), add key source files individually
    const keyFiles = [
      "src/app/layout.tsx",
      "src/app/globals.css",
      "src/lib/killSwitch.ts",
      "src/lib/alex-knowledge.ts",
      "src/lib/alex-prompts.ts",
      "src/lib/publishers.ts",
      "vercel.json",
      "CLAUDE.md",
    ];
    for (const f of keyFiles) {
      try {
        const fullPath = path.join(process.cwd(), f);
        if (fs.existsSync(fullPath)) {
          archive.append(fs.readFileSync(fullPath), { name: `source/${f}` });
        }
      } catch { /* skip */ }
    }
  }

  // 6. Restore instructions
  archive.append(`# Platform Backup Restore Guide

## Exported: ${timestamp}
## Commit: ${gitCommit}
## Tables: ${EXPORT_TABLES.length} (${totalRows} total rows)

## How to Restore

### Option 1: From Admin Panel (Recommended)
1. Go to /dashboard/admin/backups
2. Upload this backup or select from saved backups
3. Click "Restore" on the backup you want
4. Confirm — all database tables will be restored

### Option 2: Manual Restore
1. \`git checkout ${gitCommit}\` — restore source code
2. For each JSON file in /database/:
   - Connect to Supabase
   - Truncate the table
   - Import the JSON data
3. Re-configure env vars from /config/env-vars.json

### Option 3: From CLI
\`\`\`bash
# Restore code
git checkout ${gitCommit}

# Restore DB (example for one table)
cat database/scheduled_posts.json | \\
  npx supabase db query --linked "INSERT INTO scheduled_posts SELECT * FROM json_populate_recordset(null::scheduled_posts, :'content')"
\`\`\`

## Important Notes
- Env var VALUES are NOT included — you must re-enter them
- The /source/code.tar contains the full source code at this commit
- profiles table is restored via upsert (not delete+insert) to avoid auth issues
`, { name: "RESTORE.md" });

  // Finalize
  await archive.finalize();

  // Collect chunks
  const chunks: Buffer[] = [];
  for await (const chunk of passthrough) {
    chunks.push(Buffer.from(chunk as ArrayBuffer));
  }
  const zipBuffer = Buffer.concat(chunks);

  const filename = `markethub-backup-${today}.zip`;

  return new Response(zipBuffer, {
    status: 200,
    headers: {
      "Content-Type": "application/zip",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Content-Length": String(zipBuffer.length),
      "Cache-Control": "no-store",
    },
  });
}
