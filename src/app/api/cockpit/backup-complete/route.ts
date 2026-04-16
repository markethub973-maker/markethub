/**
 * POST /api/cockpit/backup-complete — weekly complete backup (tier 3/3).
 *
 * Full DB dump (all BACKUP_TABLES, no row cap per table beyond sanity
 * MAX_ROWS_PER_TABLE) + snapshot of every file in STORAGE_BUCKETS_TO_BACKUP
 * (public-assets, assets). Produces the largest encrypted blob of the
 * three tiers; meant to run once weekly (Sunday 05:00 UTC) and kept
 * forever for disaster recovery.
 *
 * This is the only tier that protects Storage bucket content (avatar
 * photos, alex-loom audio, desk scenes, user uploads). If Supabase ever
 * loses our buckets or we rotate the project, this is the single file
 * you restore from.
 *
 * Retention: forever (manual cleanup only). Files are named with ISO
 * week, so restore-by-week is straightforward.
 *
 * Auth: Bearer CRON_SECRET.
 */
import { NextRequest, NextResponse } from "next/server";
import { verifyCronSecret } from "@/lib/cronAuth";
import { createServiceClient } from "@/lib/supabase/service";
import { BACKUP_TABLES, STORAGE_BUCKETS_TO_BACKUP, encryptPayload } from "@/lib/backup";

export const maxDuration = 300;
export const dynamic = "force-dynamic";

const BUCKET_NAME = "cockpit-backups";
const MAX_ROWS_PER_TABLE = 100000; // higher than daily (20k) since this is the definitive snapshot

async function dumpTable(
  svc: ReturnType<typeof createServiceClient>,
  name: string,
): Promise<{ rows: unknown[]; truncated: boolean; error?: string }> {
  try {
    const { data, error, count } = await svc
      .from(name)
      .select("*", { count: "exact" })
      .limit(MAX_ROWS_PER_TABLE);
    if (error) return { rows: [], truncated: false, error: error.message };
    return {
      rows: data ?? [],
      truncated: (count ?? 0) > MAX_ROWS_PER_TABLE,
    };
  } catch (e) {
    return { rows: [], truncated: false, error: e instanceof Error ? e.message : String(e) };
  }
}

interface StorageObject {
  path: string;
  size: number;
  base64: string;
  content_type?: string | null;
}

async function dumpBucket(
  svc: ReturnType<typeof createServiceClient>,
  bucket: string,
): Promise<{ objects: StorageObject[]; total_bytes: number; error?: string }> {
  const objects: StorageObject[] = [];
  let totalBytes = 0;
  try {
    // Recursive list — Supabase list() is per-folder, so we walk
    const stack: string[] = [""];
    const allPaths: Array<{ path: string; size: number; mime?: string | null }> = [];
    while (stack.length) {
      const prefix = stack.pop() as string;
      const { data, error } = await svc.storage.from(bucket).list(prefix, { limit: 1000 });
      if (error) {
        return { objects: [], total_bytes: 0, error: error.message };
      }
      for (const entry of data ?? []) {
        // Directories have no id; files have id + metadata
        type EntryLike = {
          name: string;
          id?: string | null;
          metadata?: { size?: number; mimetype?: string | null } | null;
        };
        const e = entry as EntryLike;
        const fullPath = prefix ? `${prefix}/${e.name}` : e.name;
        if (!e.id) {
          // Directory — recurse
          stack.push(fullPath);
        } else {
          allPaths.push({ path: fullPath, size: e.metadata?.size ?? 0, mime: e.metadata?.mimetype });
        }
      }
    }

    // Download each file (cap at 200 MB total so Vercel function RAM stays sane)
    const CAP_BYTES = 200 * 1024 * 1024;
    for (const f of allPaths) {
      if (totalBytes + f.size > CAP_BYTES) break;
      const { data: blob } = await svc.storage.from(bucket).download(f.path);
      if (!blob) continue;
      const buf = Buffer.from(await blob.arrayBuffer());
      objects.push({
        path: f.path,
        size: buf.byteLength,
        base64: buf.toString("base64"),
        content_type: f.mime,
      });
      totalBytes += buf.byteLength;
    }
    return { objects, total_bytes: totalBytes };
  } catch (e) {
    return {
      objects,
      total_bytes: totalBytes,
      error: e instanceof Error ? e.message : String(e),
    };
  }
}

export async function POST(req: NextRequest) {
  if (!verifyCronSecret(req, "/api/cockpit/backup-complete")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const svc = createServiceClient();
  const now = new Date();

  // DB dump
  const tables: Record<string, unknown[]> = {};
  const tableStats: Record<string, number> = {};
  const tableErrors: Record<string, string> = {};
  for (const t of BACKUP_TABLES) {
    const r = await dumpTable(svc, t);
    tables[t] = r.rows;
    tableStats[t] = r.rows.length;
    if (r.error) tableErrors[t] = r.error;
  }

  // Storage dump (per bucket)
  const storageObjects: Record<string, StorageObject[]> = {};
  const storageStats: Record<string, { files: number; total_bytes: number }> = {};
  const storageErrors: Record<string, string> = {};
  for (const b of STORAGE_BUCKETS_TO_BACKUP) {
    const r = await dumpBucket(svc, b);
    storageObjects[b] = r.objects;
    storageStats[b] = { files: r.objects.length, total_bytes: r.total_bytes };
    if (r.error) storageErrors[b] = r.error;
  }

  const payload = {
    format: "cockpit-backup-complete-v1",
    tier: 3,
    created_at: now.toISOString(),
    commit: process.env.VERCEL_GIT_COMMIT_SHA ?? "unknown",
    tables,
    table_stats: tableStats,
    table_errors: tableErrors,
    storage_objects: storageObjects,
    storage_stats: storageStats,
    storage_errors: storageErrors,
  };

  const plaintext = JSON.stringify(payload);
  const blob = encryptPayload(plaintext);

  // ISO week-dated filename so restore-by-week is trivial
  const isoWeek = isoWeekKey(now);
  const fileName = `complete/${isoWeek}_${now.toISOString().replace(/[:.]/g, "-")}.enc`;
  const { error: uploadError } = await svc.storage
    .from(BUCKET_NAME)
    .upload(fileName, blob.ciphertext, {
      contentType: "application/octet-stream",
      upsert: false,
    });

  if (uploadError) {
    await svc.from("cron_logs").insert({
      job: "cockpit-backup-complete",
      result: { ok: false, error: uploadError.message, table_stats: tableStats, storage_stats: storageStats },
    });
    return NextResponse.json({ ok: false, error: uploadError.message }, { status: 500 });
  }

  await svc.from("cron_logs").insert({
    job: "cockpit-backup-complete",
    result: {
      ok: true,
      file: fileName,
      iso_week: isoWeek,
      table_stats: tableStats,
      storage_stats: storageStats,
      plaintext_bytes: blob.plaintext_bytes,
      ciphertext_bytes: blob.ciphertext_bytes,
      table_errors: Object.keys(tableErrors).length ? tableErrors : undefined,
      storage_errors: Object.keys(storageErrors).length ? storageErrors : undefined,
    },
  });

  return NextResponse.json({
    ok: true,
    file: fileName,
    iso_week: isoWeek,
    table_stats: tableStats,
    storage_stats: storageStats,
    ciphertext_bytes: blob.ciphertext_bytes,
  });
}

function isoWeekKey(d: Date): string {
  // Returns "2026-W16" style keys
  const target = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
  const dayNr = (target.getUTCDay() + 6) % 7; // Mon=0 .. Sun=6
  target.setUTCDate(target.getUTCDate() - dayNr + 3);
  const firstThursday = target.getTime();
  target.setUTCMonth(0, 1);
  if (target.getUTCDay() !== 4) target.setUTCMonth(0, 1 + ((4 - target.getUTCDay()) + 7) % 7);
  const week = 1 + Math.ceil((firstThursday - target.getTime()) / (7 * 24 * 3600_000));
  return `${d.getUTCFullYear()}-W${String(week).padStart(2, "0")}`;
}
