/**
 * Field-level AES-256-GCM encryption for sensitive DB columns.
 *
 * Encrypted values are stored as:  "enc:v1:<iv_b64>:<tag_b64>:<ct_b64>"
 *
 * - Key:  ENCRYPTION_KEY env var — 64 hex chars (32 bytes / 256 bits)
 *         Generate with: openssl rand -hex 32
 * - IV:   12 random bytes per encryption (GCM recommendation)
 * - Tag:  16-byte auth tag (prevents tampering)
 *
 * Backward-compatible: if a value does NOT start with "enc:v1:", it is
 * returned as-is so old plaintext rows continue to work during migration.
 */

import crypto from "crypto";

const PREFIX = "enc:v1:";
const ALG    = "aes-256-gcm";

function getKey(): Buffer {
  const hex = process.env.ENCRYPTION_KEY;
  if (!hex || hex.length !== 64) {
    throw new Error("ENCRYPTION_KEY must be a 64-character hex string (32 bytes). Generate with: openssl rand -hex 32");
  }
  return Buffer.from(hex, "hex");
}

/** Encrypt a plaintext string. Returns "enc:v1:<iv>:<tag>:<ct>" */
export function encryptField(plaintext: string): string {
  const key = getKey();
  const iv  = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv(ALG, key, iv) as crypto.CipherGCM;
  const ct  = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `${PREFIX}${iv.toString("base64")}:${tag.toString("base64")}:${ct.toString("base64")}`;
}

/** Decrypt a value. If not encrypted (old plaintext), returns it unchanged. */
export function decryptField(value: string | null | undefined): string | null {
  if (!value) return value ?? null;
  if (!value.startsWith(PREFIX)) return value; // backward-compat

  const parts = value.slice(PREFIX.length).split(":");
  if (parts.length !== 3) return null; // corrupted

  const [ivB64, tagB64, ctB64] = parts;
  try {
    const key     = getKey();
    const iv      = Buffer.from(ivB64,  "base64");
    const tag     = Buffer.from(tagB64, "base64");
    const ct      = Buffer.from(ctB64,  "base64");
    const decipher = crypto.createDecipheriv(ALG, key, iv) as crypto.DecipherGCM;
    decipher.setAuthTag(tag);
    return decipher.update(ct).toString("utf8") + decipher.final("utf8");
  } catch {
    // Auth tag mismatch → tampered value
    return null;
  }
}

/** Returns true if the value is already encrypted. */
export function isEncrypted(value: string | null | undefined): boolean {
  return typeof value === "string" && value.startsWith(PREFIX);
}
