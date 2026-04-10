/**
 * Stateless admin session verification.
 *
 * The admin session token is an HMAC-SHA256 derived from ADMIN_PASSWORD.
 * It requires no database and no in-memory state — the token is verified
 * by recomputing the HMAC on every request.
 *
 * Token changes automatically if ADMIN_PASSWORD is rotated.
 */
import crypto from "crypto";
import type { NextRequest } from "next/server";

const SESSION_SALT = "markethub-admin-session-v1";

/** Generate the canonical admin session token (deterministic from ADMIN_PASSWORD). */
export function generateAdminToken(): string {
  const password = process.env.ADMIN_PASSWORD;
  if (!password) throw new Error("ADMIN_PASSWORD not configured");
  return crypto
    .createHmac("sha256", password)
    .update(SESSION_SALT)
    .digest("hex");
}

/** Constant-time comparison — prevents timing attacks. */
function safeCompare(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  try {
    return crypto.timingSafeEqual(Buffer.from(a, "hex"), Buffer.from(b, "hex"));
  } catch {
    return false;
  }
}

/** Returns true if the request carries a valid admin session cookie. */
export function verifyAdminSession(req: NextRequest): boolean {
  let expected: string;
  try {
    expected = generateAdminToken();
  } catch {
    return false;
  }
  const token = req.cookies.get("admin_session_token")?.value ?? "";
  return safeCompare(expected, token);
}

/**
 * Unified admin auth check — cookie only.
 * Bearer token support removed (VULN-003: arbitrary Bearer bypass).
 * The admin tunnel (proxy.ts) already blocks non-cookie access before routes are reached.
 */
export function isAdminAuthorized(req: NextRequest): boolean {
  return verifyAdminSession(req);
}
