/**
 * POST /api/cockpit/backup-incremental — hourly delta backup (tier 1/3).
 *
 * Dumps only rows from INCREMENTAL_TABLES created after the prior
 * incremental run. Small, fast, cheap. Restore semantics: replay all
 * incremental blobs in chronological order on top of the last tier-2
 * full backup.
 *
 * Retention policy (configured in cleanup cron, not here):
 *   - tier 1 (incremental, this route): keep 48 hours of hourly blobs
 *   - tier 2 (daily full): keep 30 days
 *   - tier 3 (weekly complete): keep forever
 *
 * Auth: Bearer CRON_SECRET.
 */
import { NextRequest, NextResponse } from "next/server";
import { verifyCronSecret } from "@/lib/cronAuth";
import { createServiceClient } from "@/lib/supabase/service";
import { INCREMENTAL_TABLES, encryptPayload } from "@/lib/backup";

export const maxDuration = 60;
export const dynamic = "force-dynamic";

const BUCKET_NAME = "cockpit-backups";

async function getLastIncrementalTime(
  svc: ReturnType<typeof createServiceClient>,
): Promise<string> {
  // Look up the most recent incremental run from cron_logs
  const { data } = await svc
    .from("cron_logs")
    .select("ran_at")
    .eq("job", "cockpit-backup-incremental")
    .order("ran_at", { ascending: false })
    .limit(1);
  const last = data?.[0]?.ran_at as string | undefined;
  // If never run before, default to 2h ago (first run captures last 2h)
  return last ?? new Date(Date.now() - 2 * 3600_000).toISOString();
}

async function dumpIncremental(
  svc: ReturnType<typeof createServiceClient>,
  table: string,
  since: string,
): Promise<{ rows: unknown[]; error?: string }> {
  try {
    const { data, error } = await svc
      .from(table)
      .select("*")
      .gte("created_at", since)
      .limit(5000);
    if (error) return { rows: [], error: error.message };
    return { rows: data ?? [] };
  } catch (e) {
    return { rows: [], error: e instanceof Error ? e.message : String(e) };
  }
}

export async function POST(req: NextRequest) {
  if (!verifyCronSecret(req, "/api/cockpit/backup-incremental")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const svc = createServiceClient();
  const now = new Date();
  const since = await getLastIncrementalTime(svc);

  const tables: Record<string, unknown[]> = {};
  const stats: Record<string, number> = {};
  const errors: Record<string, string> = {};
  let totalRows = 0;

  for (const t of INCREMENTAL_TABLES) {
    const r = await dumpIncremental(svc, t, since);
    if (r.error) errors[t] = r.error;
    tables[t] = r.rows;
    stats[t] = r.rows.length;
    totalRows += r.rows.length;
  }

  // Skip storage if delta is empty — no point writing a zero-byte blob
  if (totalRows === 0) {
    await svc.from("cron_logs").insert({
      job: "cockpit-backup-incremental",
      result: { ok: true, empty: true, since, stats, errors },
    });
    return NextResponse.json({
      ok: true,
      empty: true,
      since,
      tables_checked: INCREMENTAL_TABLES.length,
      total_new_rows: 0,
    });
  }

  const payload = {
    format: "cockpit-backup-incremental-v1",
    tier: 1,
    created_at: now.toISOString(),
    since,
    commit: process.env.VERCEL_GIT_COMMIT_SHA ?? "unknown",
    tables,
    stats,
    errors,
  };

  const plaintext = JSON.stringify(payload);
  const blob = encryptPayload(plaintext);

  const fileName = `incremental/${now.toISOString().replace(/[:.]/g, "-")}.enc`;
  const { error: uploadError } = await svc.storage
    .from(BUCKET_NAME)
    .upload(fileName, blob.ciphertext, {
      contentType: "application/octet-stream",
      upsert: false,
    });

  if (uploadError) {
    await svc.from("cron_logs").insert({
      job: "cockpit-backup-incremental",
      result: { ok: false, error: uploadError.message, stats },
    });
    return NextResponse.json({ ok: false, error: uploadError.message }, { status: 500 });
  }

  await svc.from("cron_logs").insert({
    job: "cockpit-backup-incremental",
    result: {
      ok: true,
      file: fileName,
      since,
      total_rows: totalRows,
      stats,
      plaintext_bytes: blob.plaintext_bytes,
      ciphertext_bytes: blob.ciphertext_bytes,
      errors: Object.keys(errors).length > 0 ? errors : undefined,
    },
  });

  return NextResponse.json({
    ok: true,
    file: fileName,
    since,
    total_new_rows: totalRows,
    stats,
  });
}
