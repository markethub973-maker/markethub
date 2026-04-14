/**
 * Backup verification — runs weekly to prove backups are actually restorable.
 *
 * Every DR system is "broken until tested." This endpoint:
 *   1. Lists the latest 3 backup files in cockpit-backups storage bucket
 *   2. Downloads the most recent one
 *   3. Decrypts with BACKUP_ENCRYPTION_KEY (fails if key rotated without
 *      updating, or if ciphertext is corrupted)
 *   4. JSON.parse the plaintext — fails if tamper or serialization issue
 *   5. Validates the schema: required keys present, table counts > 0 for
 *      critical tables (profiles, automation_templates)
 *   6. Writes cron_logs heartbeat + maintenance_findings on failure so M6
 *      Security Agents panel surfaces it within 30 min
 *
 * Auth: Bearer CRON_SECRET. Scheduled via GH Actions (workflow
 * verify-backups.yml — Eduard must add via GitHub UI because PAT
 * lacks workflow scope).
 *
 * Runs weekly (Sundays 05:00 UTC) — daily would be overkill + eat
 * Vercel function time. Weekly matches industry norm for DR drills.
 */

import { NextRequest, NextResponse } from "next/server";
import { verifyCronSecret } from "@/lib/cronAuth";
import { reportFinding } from "@/lib/maintenanceAgent";
import { createServiceClient } from "@/lib/supabase/service";
import { decryptPayload, BACKUP_TABLES } from "@/lib/backup";

export const maxDuration = 60;
export const dynamic = "force-dynamic";

const BUCKET_NAME = "cockpit-backups";
const AGENT_NAME = "backup";

interface VerificationResult {
  ok: boolean;
  latest_backup: string | null;
  age_hours: number | null;
  decrypted_bytes: number | null;
  table_counts: Record<string, number>;
  missing_tables: string[];
  empty_critical_tables: string[];
  error?: string;
}

// Tables that MUST have rows. If they're empty in the latest backup,
// something went wrong with the dump (or the real DB is also empty,
// which would be a separate emergency).
const REQUIRED_NONEMPTY = new Set<string>([
  "profiles",
  "automation_templates",
]);

export async function GET(req: NextRequest) {
  if (!verifyCronSecret(req, "/api/cockpit/backup-verify")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supa = createServiceClient();
  const result: VerificationResult = {
    ok: false,
    latest_backup: null,
    age_hours: null,
    decrypted_bytes: null,
    table_counts: {},
    missing_tables: [],
    empty_critical_tables: [],
  };

  try {
    // 1. List the bucket sorted by timestamp
    const { data: files, error: listErr } = await supa.storage
      .from(BUCKET_NAME)
      .list("", { limit: 10, sortBy: { column: "created_at", order: "desc" } });
    if (listErr) throw new Error(`List failed: ${listErr.message}`);
    if (!files || files.length === 0) {
      throw new Error("No backup files found in bucket");
    }
    const latest = files[0];
    result.latest_backup = latest.name;
    if (latest.created_at) {
      result.age_hours = Math.floor(
        (Date.now() - new Date(latest.created_at).getTime()) / 3600_000,
      );
      // Daily backup should never be >30h old (allow 6h slack for cron drift)
      if (result.age_hours > 30) {
        throw new Error(`Latest backup is ${result.age_hours}h old (>30h)`);
      }
    }

    // 2. Download
    const { data: blob, error: dlErr } = await supa.storage
      .from(BUCKET_NAME)
      .download(latest.name);
    if (dlErr || !blob) throw new Error(`Download failed: ${dlErr?.message}`);
    const buf = Buffer.from(await blob.arrayBuffer());

    // 3. Decrypt
    const plaintext = decryptPayload(buf);
    result.decrypted_bytes = plaintext.length;

    // 4. Parse JSON
    const parsed = JSON.parse(plaintext) as {
      generated_at?: string;
      tables?: Array<{ name: string; rows?: unknown[]; error?: string }>;
    };

    if (!parsed.tables || !Array.isArray(parsed.tables)) {
      throw new Error("Backup has no tables array");
    }

    // 5. Validate schema
    const seenTables = new Set<string>();
    for (const t of parsed.tables) {
      seenTables.add(t.name);
      const count = Array.isArray(t.rows) ? t.rows.length : 0;
      result.table_counts[t.name] = count;
      if (REQUIRED_NONEMPTY.has(t.name) && count === 0 && !t.error) {
        result.empty_critical_tables.push(t.name);
      }
    }

    for (const expected of BACKUP_TABLES) {
      if (!seenTables.has(expected)) {
        result.missing_tables.push(expected);
      }
    }

    if (result.missing_tables.length > 0 || result.empty_critical_tables.length > 0) {
      throw new Error(
        `Schema validation failed — missing: ${result.missing_tables.join(",")}; ` +
          `empty critical: ${result.empty_critical_tables.join(",")}`,
      );
    }

    result.ok = true;
  } catch (e) {
    result.error = e instanceof Error ? e.message : "unknown";
  }

  // 6. Record heartbeat + finding if failed
  await supa.from("cron_logs").insert({
    job: "backup-verify",
    result: {
      ok: result.ok,
      latest: result.latest_backup,
      age_hours: result.age_hours,
      decrypted_bytes: result.decrypted_bytes,
      table_count: Object.keys(result.table_counts).length,
      error: result.error ?? null,
    },
  });

  if (!result.ok) {
    await reportFinding({
      agent: AGENT_NAME,
      severity: "critical",
      fingerprint: "backup-verify:failed",
      title: `Backup verification FAILED — ${result.error}`,
      details: {
        latest_backup: result.latest_backup,
        age_hours: result.age_hours,
        missing_tables: result.missing_tables,
        empty_critical_tables: result.empty_critical_tables,
      },
      fix_suggestion:
        `1. Check cockpit-backup job is still running (GH Actions). ` +
        `2. Verify BACKUP_ENCRYPTION_KEY is unchanged (rotating it breaks existing backups). ` +
        `3. If decryption works but tables are empty, run a fresh backup via cockpit UI and re-verify.`,
    });
  }

  return NextResponse.json(result, { status: result.ok ? 200 : 500 });
}
