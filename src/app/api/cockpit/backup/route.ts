/**
 * Cockpit — Encrypted Backup endpoint.
 *
 * Dumps the critical tables to JSON, encrypts with AES-256-GCM using
 * BACKUP_ENCRYPTION_KEY, and uploads the ciphertext to the isolated
 * "cockpit-backups" Supabase Storage bucket. Optionally also uploads to
 * Cloudflare R2 if R2_ACCOUNT_ID + R2_ACCESS_KEY_ID + R2_SECRET_ACCESS_KEY
 * + R2_BUCKET are configured (cross-provider isolation for real DR).
 *
 * Logs the result to:
 *   - cron_logs (job = "cockpit-backup") — for timeline
 *   - maintenance_findings (agent = "backup") — on failure
 *
 * Supported methods:
 *   GET  — run a full backup (used by GH Actions cron at 04:00 UTC daily)
 *   POST — same, but accepts { note?: string } for on-demand labeled backups
 *
 * Auth: Bearer CRON_SECRET.
 */
import { NextRequest, NextResponse } from "next/server";
import { verifyCronSecret } from "@/lib/cronAuth";
import { reportFinding } from "@/lib/maintenanceAgent";
import { createServiceClient } from "@/lib/supabase/service";
import { BACKUP_TABLES, encryptPayload } from "@/lib/backup";

export const maxDuration = 60;
export const dynamic = "force-dynamic";

const AGENT_NAME = "backup";
const BUCKET_NAME = "cockpit-backups";
// Cap on rows per table to keep the dump within Vercel Function limits.
// For a small SaaS this is generous; if we ever exceed this we'll paginate.
const MAX_ROWS_PER_TABLE = 20000;

interface TableDump {
  name: string;
  rows: unknown[];
  truncated: boolean;
  error?: string;
}

async function dumpTable(
  supa: ReturnType<typeof createServiceClient>,
  name: string,
): Promise<TableDump> {
  try {
    const { data, error, count } = await supa
      .from(name)
      .select("*", { count: "exact" })
      .limit(MAX_ROWS_PER_TABLE);
    if (error) return { name, rows: [], truncated: false, error: error.message };
    const truncated = (count ?? 0) > MAX_ROWS_PER_TABLE;
    return { name, rows: data ?? [], truncated };
  } catch (e) {
    return { name, rows: [], truncated: false, error: e instanceof Error ? e.message : String(e) };
  }
}

async function ensureBucket(supa: ReturnType<typeof createServiceClient>): Promise<void> {
  // Idempotent: createBucket returns an error if it already exists — swallow that.
  const { error } = await supa.storage.createBucket(BUCKET_NAME, {
    public: false,
    fileSizeLimit: 50 * 1024 * 1024, // 50 MB max per backup
  });
  if (error && !String(error.message).toLowerCase().includes("already exists")) {
    throw new Error(`Cannot create bucket: ${error.message}`);
  }
}

interface R2Config {
  accountId: string;
  accessKeyId: string;
  secretAccessKey: string;
  bucket: string;
}

function getR2Config(): R2Config | null {
  const accountId = process.env.R2_ACCOUNT_ID;
  const accessKeyId = process.env.R2_ACCESS_KEY_ID;
  const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;
  const bucket = process.env.R2_BUCKET;
  if (!accountId || !accessKeyId || !secretAccessKey || !bucket) return null;
  return { accountId, accessKeyId, secretAccessKey, bucket };
}

async function uploadToR2(
  cfg: R2Config,
  key: string,
  body: Buffer,
): Promise<{ ok: boolean; detail: string }> {
  // Sign a minimal PUT request for R2 (S3-compatible). We inline a tiny SigV4
  // signer here to avoid pulling in the full AWS SDK (~2 MB) for one call.
  // Docs: https://developers.cloudflare.com/r2/api/s3/api/
  const crypto = await import("crypto");
  const service = "s3";
  const region = "auto";
  const host = `${cfg.accountId}.r2.cloudflarestorage.com`;
  const url = `https://${host}/${cfg.bucket}/${key}`;
  const now = new Date();
  const amzDate = now.toISOString().replace(/[:-]|\.\d{3}/g, "");
  const dateStamp = amzDate.slice(0, 8);

  const hashHex = (data: Buffer | string) =>
    crypto.createHash("sha256").update(data).digest("hex");
  const hmac = (key: Buffer | string, data: string) =>
    crypto.createHmac("sha256", key).update(data).digest();

  const payloadHash = hashHex(body);
  const canonicalHeaders =
    `host:${host}\nx-amz-content-sha256:${payloadHash}\nx-amz-date:${amzDate}\n`;
  const signedHeaders = "host;x-amz-content-sha256;x-amz-date";
  const canonicalRequest = [
    "PUT",
    `/${cfg.bucket}/${key}`,
    "",
    canonicalHeaders,
    signedHeaders,
    payloadHash,
  ].join("\n");

  const credentialScope = `${dateStamp}/${region}/${service}/aws4_request`;
  const stringToSign = [
    "AWS4-HMAC-SHA256",
    amzDate,
    credentialScope,
    hashHex(canonicalRequest),
  ].join("\n");

  const kDate = hmac(`AWS4${cfg.secretAccessKey}`, dateStamp);
  const kRegion = hmac(kDate, region);
  const kService = hmac(kRegion, service);
  const kSigning = hmac(kService, "aws4_request");
  const signature = crypto.createHmac("sha256", kSigning).update(stringToSign).digest("hex");

  const authHeader = `AWS4-HMAC-SHA256 Credential=${cfg.accessKeyId}/${credentialScope}, SignedHeaders=${signedHeaders}, Signature=${signature}`;

  try {
    const res = await fetch(url, {
      method: "PUT",
      headers: {
        Host: host,
        "x-amz-content-sha256": payloadHash,
        "x-amz-date": amzDate,
        Authorization: authHeader,
        "Content-Length": String(body.length),
      },
      body: new Uint8Array(body),
    });
    if (!res.ok) {
      const txt = await res.text();
      return { ok: false, detail: `R2 HTTP ${res.status}: ${txt.slice(0, 200)}` };
    }
    return { ok: true, detail: `uploaded to r2://${cfg.bucket}/${key}` };
  } catch (e) {
    return { ok: false, detail: e instanceof Error ? e.message : String(e) };
  }
}

async function runBackup(note?: string) {
  const supa = createServiceClient();
  const now = new Date();
  const timestamp = now.toISOString();
  const filename = `${timestamp.replace(/[:.]/g, "-")}.enc`;

  // 1. Dump all tables in parallel
  const dumps = await Promise.all(BACKUP_TABLES.map((t) => dumpTable(supa, t)));

  // 2. Build payload
  const stats: Record<string, number> = {};
  const tables: Record<string, unknown[]> = {};
  const errors: Record<string, string> = {};
  for (const d of dumps) {
    tables[d.name] = d.rows;
    stats[d.name] = d.rows.length;
    if (d.error) errors[d.name] = d.error;
  }

  const payload = {
    format: "cockpit-backup-v1",
    created_at: timestamp,
    commit: process.env.VERCEL_GIT_COMMIT_SHA ?? null,
    note: note ?? null,
    stats,
    errors,
    tables,
  };
  const plaintext = JSON.stringify(payload);

  // 3. Encrypt
  let encrypted;
  try {
    encrypted = encryptPayload(plaintext);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    await reportFinding({
      agent: AGENT_NAME,
      severity: "critical",
      fingerprint: "backup:encryption-failed",
      title: `Backup encryption failed: ${msg}`,
      details: { error: msg, at: timestamp },
      fix_suggestion: `Ensure BACKUP_ENCRYPTION_KEY is set in Vercel env as a base64 32-byte key. Generate one with: node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"`,
    });
    return { ok: false, error: msg };
  }

  // 4. Upload to isolated Supabase bucket (primary store)
  await ensureBucket(supa);
  const { error: uploadErr } = await supa.storage
    .from(BUCKET_NAME)
    .upload(filename, new Uint8Array(encrypted.ciphertext), {
      contentType: "application/octet-stream",
      cacheControl: "0",
      upsert: false,
    });

  const supabaseUploadOk = !uploadErr;
  const supabaseDetail = uploadErr ? uploadErr.message : `uploaded to supabase://${BUCKET_NAME}/${filename}`;

  // 5. Optional: upload to Cloudflare R2 for cross-provider isolation
  const r2Cfg = getR2Config();
  let r2Result: { ok: boolean; detail: string } | null = null;
  if (r2Cfg) {
    r2Result = await uploadToR2(r2Cfg, filename, encrypted.ciphertext);
  }

  // 6. Determine overall success
  const primaryOk = supabaseUploadOk;
  const overallOk = primaryOk && (r2Result === null || r2Result.ok);

  // 7. If primary failed, emit critical finding
  if (!primaryOk) {
    await reportFinding({
      agent: AGENT_NAME,
      severity: "critical",
      fingerprint: "backup:primary-upload-failed",
      title: `Backup primary upload failed: ${supabaseDetail}`,
      details: { error: supabaseDetail, at: timestamp, stats },
      fix_suggestion: `Check Supabase Storage → cockpit-backups bucket. Ensure service_role has write permission and bucket isn't over quota.`,
    });
  } else if (r2Result && !r2Result.ok) {
    // Non-fatal: primary OK but secondary failed — medium severity
    await reportFinding({
      agent: AGENT_NAME,
      severity: "medium",
      fingerprint: "backup:secondary-upload-failed",
      title: `Backup secondary (R2) upload failed: ${r2Result.detail}`,
      details: { error: r2Result.detail, at: timestamp },
      fix_suggestion: `R2 provides cross-provider isolation — primary Supabase backup succeeded, but DR posture is weaker until R2 is fixed.`,
    });
  }

  // 8. Write to cron_logs for cockpit telemetry
  try {
    await supa.from("cron_logs").insert({
      job: "cockpit-backup",
      ran_at: timestamp,
      result: {
        ok: overallOk,
        filename,
        plaintext_bytes: encrypted.plaintext_bytes,
        ciphertext_bytes: encrypted.ciphertext_bytes,
        sha256: encrypted.sha256,
        supabase: { ok: supabaseUploadOk, detail: supabaseDetail },
        r2: r2Result,
        stats,
        errors: Object.keys(errors).length > 0 ? errors : undefined,
      },
    });
  } catch { /* ignore */ }

  return {
    ok: overallOk,
    filename,
    plaintext_bytes: encrypted.plaintext_bytes,
    ciphertext_bytes: encrypted.ciphertext_bytes,
    sha256: encrypted.sha256,
    stats,
    supabase: { ok: supabaseUploadOk, detail: supabaseDetail },
    r2: r2Result,
  };
}

export async function GET(req: NextRequest) {
  if (!verifyCronSecret(req, "/api/cockpit/backup")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const result = await runBackup();
  return NextResponse.json(result);
}

export async function POST(req: NextRequest) {
  if (!verifyCronSecret(req, "/api/cockpit/backup")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const body = (await req.json().catch(() => ({}))) as { note?: string };
  const result = await runBackup(body.note);
  return NextResponse.json(result);
}
