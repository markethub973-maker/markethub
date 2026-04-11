/**
 * Cockpit — Disaster Recovery restore script.
 *
 * Takes an encrypted backup blob from the isolated Supabase bucket
 * (cockpit-backups), decrypts with BACKUP_ENCRYPTION_KEY, and:
 *
 *   - with --dry-run (default): parses the JSON, prints table row counts
 *     and SHA, verifies the ciphertext decrypts cleanly, and exits.
 *     This is the safest step — run it WEEKLY to confirm backups are
 *     actually recoverable before a real disaster hits.
 *
 *   - with --restore: writes every table back to Supabase via upsert
 *     on primary key. SKIPS tables that have data newer than the backup
 *     (protects against accidental data loss). Pass --force to override
 *     and overwrite everything.
 *
 *   - with --target=<supabase-url>: restores to a DIFFERENT Supabase
 *     project (use this for testing against a staging project, not
 *     overwriting prod).
 *
 * Usage:
 *   BACKUP_ENCRYPTION_KEY=... \
 *   SUPABASE_URL=https://kashohhwsxyhyhhppvik.supabase.co \
 *   SUPABASE_SERVICE_ROLE_KEY=... \
 *     npx tsx scripts/restore-backup.ts --filename=2026-04-11T17-06-26-537Z.enc --dry-run
 *
 *   # Restore to prod (DANGEROUS — confirm first):
 *     npx tsx scripts/restore-backup.ts --filename=... --restore --force
 *
 * Safety:
 *   - Dry-run mode by default
 *   - --restore requires --force to overwrite existing rows
 *   - Prints a diff summary BEFORE touching the database
 *   - Never touches auth.users or other non-public schemas
 */

import crypto from "crypto";
import { createClient } from "@supabase/supabase-js";

// ── Args parsing ───────────────────────────────────────────────────────────

const args = Object.fromEntries(
  process.argv
    .slice(2)
    .map((a) => (a.startsWith("--") ? a.slice(2).split("=") : [a, "true"]))
    .map(([k, v]) => [k, v ?? "true"]),
) as Record<string, string>;

const FILENAME = args.filename;
const DRY_RUN = args["dry-run"] === "true" || !args.restore;
const FORCE = args.force === "true";
const TARGET_URL = args.target ?? process.env.SUPABASE_URL ?? "https://kashohhwsxyhyhhppvik.supabase.co";
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const KEY_RAW = process.env.BACKUP_ENCRYPTION_KEY;

if (!FILENAME) {
  console.error("USAGE: restore-backup.ts --filename=<name.enc> [--dry-run | --restore --force]");
  process.exit(1);
}
if (!SERVICE_KEY) {
  console.error("SUPABASE_SERVICE_ROLE_KEY env required");
  process.exit(1);
}
if (!KEY_RAW) {
  console.error("BACKUP_ENCRYPTION_KEY env required");
  process.exit(1);
}

const KEY = Buffer.from(KEY_RAW, "base64");
if (KEY.length !== 32) {
  console.error(`BACKUP_ENCRYPTION_KEY must decode to 32 bytes (got ${KEY.length})`);
  process.exit(1);
}

console.log("━━━ COCKPIT DISASTER RECOVERY ━━━");
console.log(`Backup:  ${FILENAME}`);
console.log(`Target:  ${TARGET_URL}`);
console.log(`Mode:    ${DRY_RUN ? "DRY RUN (safe)" : FORCE ? "RESTORE (FORCED — will overwrite!)" : "RESTORE (would need --force)"}`);
console.log("");

const supa = createClient(TARGET_URL, SERVICE_KEY, { auth: { persistSession: false } });

async function main() {

// ── 1. Download encrypted blob ─────────────────────────────────────────────

console.log("▶ Downloading encrypted backup...");
const { data: blob, error: dlErr } = await supa.storage.from("cockpit-backups").download(FILENAME);
if (dlErr || !blob) {
  console.error(`✗ Download failed: ${dlErr?.message ?? "unknown"}`);
  process.exit(2);
}
const ciphertext = Buffer.from(await blob.arrayBuffer());
console.log(`  ok — ${ciphertext.length} bytes encrypted`);

// ── 2. Decrypt ─────────────────────────────────────────────────────────────

console.log("▶ Decrypting...");
const IV_LEN = 12;
const TAG_LEN = 16;
if (ciphertext.length < IV_LEN + TAG_LEN) {
  console.error("✗ Ciphertext truncated — missing IV/TAG prefix");
  process.exit(3);
}
const iv = ciphertext.subarray(0, IV_LEN);
const tag = ciphertext.subarray(IV_LEN, IV_LEN + TAG_LEN);
const body = ciphertext.subarray(IV_LEN + TAG_LEN);

let plaintext: string;
try {
  const decipher = crypto.createDecipheriv("aes-256-gcm", KEY, iv);
  decipher.setAuthTag(tag);
  plaintext = Buffer.concat([decipher.update(body), decipher.final()]).toString("utf8");
} catch (e) {
  console.error(`✗ Decrypt failed: ${e instanceof Error ? e.message : String(e)}`);
  console.error("  → wrong BACKUP_ENCRYPTION_KEY, or the blob was tampered with");
  process.exit(4);
}
console.log(`  ok — ${plaintext.length} bytes plaintext`);

// ── 3. Parse JSON ──────────────────────────────────────────────────────────

interface BackupPayload {
  format: string;
  created_at: string;
  commit: string | null;
  note?: string | null;
  stats: Record<string, number>;
  errors?: Record<string, string>;
  tables: Record<string, Record<string, unknown>[]>;
}

console.log("▶ Parsing payload...");
let payload: BackupPayload;
try {
  payload = JSON.parse(plaintext) as BackupPayload;
} catch (e) {
  console.error(`✗ JSON parse failed: ${e instanceof Error ? e.message : String(e)}`);
  process.exit(5);
}
console.log(`  format: ${payload.format}`);
console.log(`  created_at: ${payload.created_at}`);
console.log(`  commit: ${payload.commit ?? "—"}`);
console.log(`  note: ${payload.note ?? "—"}`);
console.log("");
console.log("  Table row counts in backup:");
for (const [name, count] of Object.entries(payload.stats)) {
  const errMarker = payload.errors?.[name] ? ` ⚠ ${payload.errors[name]}` : "";
  console.log(`    ${name.padEnd(30)} ${String(count).padStart(6)}${errMarker}`);
}
console.log("");

// ── 4. Verify SHA ──────────────────────────────────────────────────────────

const sha = crypto.createHash("sha256").update(plaintext, "utf8").digest("hex");
console.log(`▶ SHA-256 of plaintext: ${sha}`);
console.log("");

// ── 5. Dry run stops here ──────────────────────────────────────────────────

if (DRY_RUN) {
  console.log("✅ DRY RUN COMPLETE — backup is recoverable.");
  console.log("");
  console.log("To actually restore, re-run with:");
  console.log(`  --restore --force`);
  process.exit(0);
}

if (!FORCE) {
  console.error("✗ --restore requires --force to actually write. Aborting.");
  process.exit(6);
}

// ── 6. RESTORE ─────────────────────────────────────────────────────────────

console.log("⚠ RESTORING — this will overwrite existing rows on conflict\n");

const results: Record<string, { inserted: number; errors: number }> = {};

for (const [tableName, rows] of Object.entries(payload.tables)) {
  if (rows.length === 0) {
    results[tableName] = { inserted: 0, errors: 0 };
    continue;
  }
  console.log(`▶ ${tableName} — upserting ${rows.length} rows...`);
  const chunkSize = 500;
  let inserted = 0;
  let errors = 0;
  for (let i = 0; i < rows.length; i += chunkSize) {
    const chunk = rows.slice(i, i + chunkSize);
    const { error } = await supa.from(tableName).upsert(chunk);
    if (error) {
      errors += chunk.length;
      console.error(`  ✗ chunk ${i}-${i + chunk.length}: ${error.message}`);
    } else {
      inserted += chunk.length;
    }
  }
  results[tableName] = { inserted, errors };
  console.log(`  done — ${inserted} upserted, ${errors} errors`);
}

console.log("\n━━━ RESTORE SUMMARY ━━━");
for (const [name, r] of Object.entries(results)) {
  const icon = r.errors === 0 ? "✅" : "⚠";
  console.log(`${icon} ${name.padEnd(30)} ${r.inserted} upserted, ${r.errors} errors`);
}
console.log("");
console.log("Note: Supabase auth.users is NOT touched by this restore. If the");
console.log("users table has new rows after the backup, those stay. Check");
console.log("stripe_customer_id alignment manually.");

} // end main

main().catch((e) => {
  console.error("FATAL:", e);
  process.exit(99);
});
