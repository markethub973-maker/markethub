/**
 * Encrypted backup helper for the Cockpit recovery layer.
 *
 * Security model:
 *   - AES-256-GCM symmetric encryption using BACKUP_ENCRYPTION_KEY (32 bytes,
 *     base64 in env). Rotating this key invalidates all prior backups — so
 *     either never rotate or re-encrypt the archive on rotation.
 *   - Each backup has a fresh random 12-byte IV prepended to the ciphertext.
 *   - 16-byte GCM auth tag appended; tamper-evident on decrypt.
 *   - The blob stored in the isolated bucket is: [IV(12) | TAG(16) | CIPHERTEXT].
 *
 * Isolation model:
 *   - Primary store: Supabase Storage bucket "cockpit-backups" (RLS:
 *     service_role only). Not true cross-provider isolation, but
 *     operationally isolated from the application's main data path.
 *   - Secondary store (optional): Cloudflare R2 if R2_* env vars are set.
 *     This gives true cross-provider isolation for DR.
 *
 * The backup payload is a single JSON document containing:
 *   {
 *     format: "cockpit-backup-v1",
 *     created_at: ISO timestamp,
 *     commit: git SHA (from VERCEL_GIT_COMMIT_SHA),
 *     tables: { [name]: row[] },
 *     stats: { [name]: row_count }
 *   }
 *
 * Recovery flow: download blob → slice IV + tag + ciphertext → decrypt with
 * same key → parse JSON → upsert tables in the right order (respect FKs).
 * Runbook lives in /scripts/restore-backup.ts.
 */
import crypto from "crypto";

const ALGO = "aes-256-gcm";
const IV_LEN = 12;
const TAG_LEN = 16;
const KEY_LEN = 32;

function getKey(): Buffer {
  const raw = process.env.BACKUP_ENCRYPTION_KEY;
  if (!raw) {
    throw new Error("BACKUP_ENCRYPTION_KEY not configured — cannot encrypt backup");
  }
  const key = Buffer.from(raw, "base64");
  if (key.length !== KEY_LEN) {
    throw new Error(`BACKUP_ENCRYPTION_KEY must decode to ${KEY_LEN} bytes (got ${key.length})`);
  }
  return key;
}

export interface EncryptedBlob {
  ciphertext: Buffer; // [IV | TAG | encrypted-body]
  iv: string; // hex (for telemetry/logging)
  sha256: string; // hex of plaintext JSON (verification)
  plaintext_bytes: number;
  ciphertext_bytes: number;
}

export function encryptPayload(plaintextJson: string): EncryptedBlob {
  const key = getKey();
  const iv = crypto.randomBytes(IV_LEN);
  const cipher = crypto.createCipheriv(ALGO, key, iv);
  const body = Buffer.concat([cipher.update(plaintextJson, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  const combined = Buffer.concat([iv, tag, body]);

  return {
    ciphertext: combined,
    iv: iv.toString("hex"),
    sha256: crypto.createHash("sha256").update(plaintextJson, "utf8").digest("hex"),
    plaintext_bytes: Buffer.byteLength(plaintextJson, "utf8"),
    ciphertext_bytes: combined.length,
  };
}

export function decryptPayload(ciphertext: Buffer): string {
  const key = getKey();
  if (ciphertext.length < IV_LEN + TAG_LEN) {
    throw new Error("Ciphertext too short — missing IV/TAG prefix");
  }
  const iv = ciphertext.subarray(0, IV_LEN);
  const tag = ciphertext.subarray(IV_LEN, IV_LEN + TAG_LEN);
  const body = ciphertext.subarray(IV_LEN + TAG_LEN);
  const decipher = crypto.createDecipheriv(ALGO, key, iv);
  decipher.setAuthTag(tag);
  const plaintext = Buffer.concat([decipher.update(body), decipher.final()]);
  return plaintext.toString("utf8");
}

/** Tables to snapshot. Order matters for restore (lookups before references). */
export const BACKUP_TABLES = [
  // Core identity
  "profiles",
  "plan_limits",
  "admin_platform_config",
  // Subscriptions + billing
  "stripe_webhook_events",
  "ai_credits",
  "usage_tracking",
  // Operational state
  "scheduled_posts",
  "instagram_connections",
  "team_members",
  "api_keys",
  // Audit + maintenance
  "security_events",
  "maintenance_findings",
  "cron_logs",
  "health_checks",
  // Brain / AI team (added 2026-04-16 — were missing; major data loss risk)
  "brain_knowledge_base",
  "brain_agent_activity",
  "brain_global_prospects",
  "brain_demand_signals",
  "brain_supply_producers",
  "brain_arbitrage_matches",
  "brain_intermediary_patterns",
  "brain_platform_capabilities",
  "brain_strategy_stack",
  "brain_delegation_map",
  "brain_venture_pipeline",
  "brain_target_countries",
  "brain_client_needs",
  // Outreach + leads (revenue-adjacent — losing this = losing months of work)
  "outreach_log",
  "research_leads",
  // AI generations (expensive to regenerate)
  "ai_image_generations",
  "ai_video_generations",
  // User config
  "user_brand_voice",
  // Communication
  "telegram_messages",
  // Incidents audit trail
  "ops_incidents",
] as const;

export type BackupTableName = typeof BACKUP_TABLES[number];

/**
 * Tables in the HOURLY incremental tier. Must have a `created_at` column —
 * incremental pulls rows WHERE created_at > last_backup_at.
 */
export const INCREMENTAL_TABLES = [
  "brain_agent_activity",
  "cron_logs",
  "security_events",
  "maintenance_findings",
  "outreach_log",
  "research_leads",
  "telegram_messages",
  "ops_incidents",
  "ai_image_generations",
  "ai_video_generations",
] as const;

/**
 * Storage buckets mirrored in the WEEKLY COMPLETE backup. Each object's
 * bytes are base64-appended to the encrypted blob. Watch the 50 MB bucket
 * ceiling — split per-bucket if total exceeds.
 */
export const STORAGE_BUCKETS_TO_BACKUP = ["public-assets", "assets"] as const;
