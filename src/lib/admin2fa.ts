/**
 * Admin 2FA — TOTP utilities.
 *
 * Single-admin pattern (Eduard). Stores secret encrypted at rest using
 * the existing fieldCrypto helper. Verification uses ±1 window tolerance
 * (clock skew). Replay-protected via last_used_counter (the time-step
 * counter — a freshly-used code can't be re-submitted in the same window).
 */

import { TOTP, Secret } from "otpauth";
import * as QRCode from "qrcode";
import { createHash, randomBytes } from "node:crypto";
import { createServiceClient } from "@/lib/supabase/service";
import { encryptField, decryptField } from "@/lib/fieldCrypto";

const ISSUER = "MarketHub Pro";
const SCOPE = "global"; // single-admin

export interface EnrollResult {
  secret_b32: string;       // for manual entry into Authenticator
  otpauth_url: string;      // for QR code apps to parse directly
  qr_data_url: string;      // data:image/png;base64,... ready for <img src>
}

function makeTotp(secretB32: string, label = "admin"): TOTP {
  return new TOTP({
    issuer: ISSUER,
    label,
    algorithm: "SHA1",
    digits: 6,
    period: 30,
    secret: Secret.fromBase32(secretB32),
  });
}

/**
 * Generate a new TOTP secret + QR code data URL.
 * Does NOT persist — caller must call confirmEnroll() with a valid code
 * to atomically save + enable.
 */
export async function generateEnrollment(adminLabel = "admin@markethubpromo.com"): Promise<EnrollResult> {
  const secret = new Secret({ size: 20 });
  const secretB32 = secret.base32;
  const totp = makeTotp(secretB32, adminLabel);
  const otpauth_url = totp.toString();
  const qr_data_url = await QRCode.toDataURL(otpauth_url, {
    errorCorrectionLevel: "M",
    margin: 1,
    width: 240,
  });
  return { secret_b32: secretB32, otpauth_url, qr_data_url };
}

/**
 * Confirm enrollment: user has scanned QR + entered their first 6-digit
 * code. We verify it, then persist the (encrypted) secret + recovery codes.
 */
export async function confirmEnroll(secretB32: string, code: string): Promise<{
  ok: boolean;
  recovery_codes?: string[];
  error?: string;
}> {
  const totp = makeTotp(secretB32);
  const delta = totp.validate({ token: code, window: 1 });
  if (delta === null) {
    return { ok: false, error: "Invalid code — try again" };
  }

  // Generate 8 recovery codes (one-shot use). Show plaintext once,
  // store sha256 hashes.
  const plain: string[] = [];
  const hashes: string[] = [];
  for (let i = 0; i < 8; i++) {
    const code = randomBytes(5).toString("hex"); // 10-char hex
    plain.push(code);
    hashes.push(createHash("sha256").update(code).digest("hex"));
  }

  const service = createServiceClient();
  const counter = Math.floor(Date.now() / 1000 / 30) + delta;
  const { error } = await service
    .from("admin_2fa")
    .upsert({
      scope: SCOPE,
      secret_encrypted: encryptField(secretB32),
      last_used_at: new Date().toISOString(),
      last_used_counter: counter,
      recovery_codes_hash: hashes,
      recovery_codes_used: [],
      enabled_at: new Date().toISOString(),
    });
  if (error) return { ok: false, error: error.message };
  return { ok: true, recovery_codes: plain };
}

/**
 * Verify a TOTP code (or recovery code) at login. Replay-protected.
 */
export async function verifyCode(code: string): Promise<{
  ok: boolean;
  was_recovery?: boolean;
  error?: string;
}> {
  const service = createServiceClient();
  const { data } = await service
    .from("admin_2fa")
    .select("secret_encrypted,last_used_counter,recovery_codes_hash,recovery_codes_used")
    .eq("scope", SCOPE)
    .maybeSingle();
  if (!data) return { ok: false, error: "2FA not enrolled" };

  const cleaned = code.trim().replace(/\s+/g, "");

  // 1. Try TOTP first (most common path)
  if (/^[0-9]{6}$/.test(cleaned)) {
    const secretB32 = decryptField(data.secret_encrypted as string);
    if (!secretB32) return { ok: false, error: "Stored secret unreadable" };
    const totp = makeTotp(secretB32);
    const delta = totp.validate({ token: cleaned, window: 1 });
    if (delta !== null) {
      const counter = Math.floor(Date.now() / 1000 / 30) + delta;
      // Replay protection — refuse if same/older counter than last used.
      if (counter <= (data.last_used_counter as number)) {
        return { ok: false, error: "Code already used — wait for next one" };
      }
      await service
        .from("admin_2fa")
        .update({
          last_used_at: new Date().toISOString(),
          last_used_counter: counter,
        })
        .eq("scope", SCOPE);
      return { ok: true };
    }
  }

  // 2. Fall back to recovery code (10-char hex)
  if (/^[a-f0-9]{10}$/i.test(cleaned)) {
    const hash = createHash("sha256").update(cleaned.toLowerCase()).digest("hex");
    const stored = (data.recovery_codes_hash as string[]) ?? [];
    const used = (data.recovery_codes_used as string[]) ?? [];
    if (stored.includes(hash) && !used.includes(hash)) {
      await service
        .from("admin_2fa")
        .update({ recovery_codes_used: [...used, hash], last_used_at: new Date().toISOString() })
        .eq("scope", SCOPE);
      return { ok: true, was_recovery: true };
    }
  }

  return { ok: false, error: "Invalid code" };
}

export async function isEnabled(): Promise<boolean> {
  const service = createServiceClient();
  const { data } = await service
    .from("admin_2fa")
    .select("scope", { head: true, count: "exact" })
    .eq("scope", SCOPE);
  return (data !== null);
}

/**
 * Disable 2FA. Caller MUST verify a current code first via verifyCode().
 */
export async function disable(): Promise<{ ok: boolean }> {
  const service = createServiceClient();
  const { error } = await service.from("admin_2fa").delete().eq("scope", SCOPE);
  return { ok: !error };
}

export async function getStatus(): Promise<{
  enrolled: boolean;
  enabled_at: string | null;
  last_used_at: string | null;
  recovery_codes_remaining: number;
}> {
  const service = createServiceClient();
  const { data } = await service
    .from("admin_2fa")
    .select("enabled_at,last_used_at,recovery_codes_hash,recovery_codes_used")
    .eq("scope", SCOPE)
    .maybeSingle();
  if (!data) {
    return {
      enrolled: false,
      enabled_at: null,
      last_used_at: null,
      recovery_codes_remaining: 0,
    };
  }
  const total = (data.recovery_codes_hash as string[])?.length ?? 0;
  const used = (data.recovery_codes_used as string[])?.length ?? 0;
  return {
    enrolled: true,
    enabled_at: data.enabled_at as string | null,
    last_used_at: data.last_used_at as string | null,
    recovery_codes_remaining: Math.max(0, total - used),
  };
}
