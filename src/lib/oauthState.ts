/**
 * HMAC-signed OAuth state parameter for CSRF protection.
 *
 * Why: previously we passed `state = user.id` as plaintext. A callback that
 * trusts `state` as authoritative user_id allows an attacker to complete their
 * own provider OAuth and then replay the callback URL with the victim's user_id
 * in `state` — saving the attacker's access_token under the victim's account
 * (account takeover / impersonation).
 *
 * Fix:
 *   1. Sign (userId, nonce, timestamp) with HMAC-SHA256 using a server secret.
 *   2. Callback verifies the signature + freshness.
 *   3. Callback ALSO re-verifies against the current Supabase session and
 *      uses that authenticated user.id for all DB writes — `state` is only
 *      used as a CSRF token, never as an identity claim.
 *
 * Secret source: OAUTH_STATE_SECRET env var. Falls back to ENCRYPTION_KEY if
 * OAUTH_STATE_SECRET is missing, so existing deployments work without a new
 * env var — the key is HKDF-ish derived via a fixed label so the two purposes
 * don't share literal key material.
 */

import crypto from "crypto";

const STATE_TTL_MS = 10 * 60 * 1000; // 10 minutes — provider OAuth round-trip
const VERSION = "v1";

function getStateKey(): Buffer {
  const explicit = process.env.OAUTH_STATE_SECRET;
  if (explicit && explicit.length >= 32) {
    return crypto.createHash("sha256").update(explicit).digest();
  }
  // Fallback: derive from ENCRYPTION_KEY with a domain-separation label.
  const fallback = process.env.ENCRYPTION_KEY;
  if (fallback && fallback.length === 64) {
    return crypto
      .createHmac("sha256", Buffer.from(fallback, "hex"))
      .update("oauth-state-v1")
      .digest();
  }
  throw new Error(
    "OAUTH_STATE_SECRET (or ENCRYPTION_KEY) must be set for OAuth state signing",
  );
}

function b64url(buf: Buffer): string {
  return buf.toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function b64urlDecode(s: string): Buffer {
  const pad = s.length % 4 === 0 ? "" : "=".repeat(4 - (s.length % 4));
  return Buffer.from(s.replace(/-/g, "+").replace(/_/g, "/") + pad, "base64");
}

/**
 * Sign an OAuth state payload. Returns a URL-safe string of the form:
 *   v1.<userId>.<nonce>.<ts>.<sig>
 */
export function signState(userId: string): string {
  const nonce = b64url(crypto.randomBytes(16));
  const ts = Date.now().toString();
  const body = `${VERSION}.${userId}.${nonce}.${ts}`;
  const sig = b64url(crypto.createHmac("sha256", getStateKey()).update(body).digest());
  return `${body}.${sig}`;
}

/**
 * Verify a signed OAuth state. Returns the userId claimed in state ONLY if
 * the signature is valid and the timestamp is fresh. Callers MUST still
 * re-check against the authenticated Supabase session — this function only
 * proves the state was minted by us recently, not that the current browser
 * belongs to that user.
 */
export function verifyState(state: string | null | undefined): { userId: string } | null {
  if (!state || typeof state !== "string") return null;

  const parts = state.split(".");
  if (parts.length !== 5) return null;
  const [version, userId, nonce, tsStr, sig] = parts;
  if (version !== VERSION || !userId || !nonce || !tsStr || !sig) return null;

  const ts = parseInt(tsStr, 10);
  if (!Number.isFinite(ts)) return null;
  if (Date.now() - ts > STATE_TTL_MS) return null; // expired
  if (ts - Date.now() > 60_000) return null; // clock skew > 60s from the future — reject

  const body = `${version}.${userId}.${nonce}.${tsStr}`;
  const expected = crypto.createHmac("sha256", getStateKey()).update(body).digest();
  let provided: Buffer;
  try {
    provided = b64urlDecode(sig);
  } catch {
    return null;
  }
  if (provided.length !== expected.length) return null;
  if (!crypto.timingSafeEqual(provided, expected)) return null;

  return { userId };
}
