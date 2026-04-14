/**
 * HaveIBeenPwned — k-anonymity password breach check.
 *
 * https://haveibeenpwned.com/API/v3#PwnedPasswords
 *
 * We send ONLY the first 5 chars of the SHA-1 hash. HIBP returns all
 * matching hashes (~500) with count. We compare locally. The user's
 * password NEVER leaves our server; not even to HIBP.
 *
 * Returns the breach count (0 = never breached).
 *
 * Rate limit: unauthenticated API allows 1 req/6s per IP — we only call
 * this on register/reset-password, not on every login, so we're fine.
 */

import { createHash } from "node:crypto";

const HIBP_URL = "https://api.pwnedpasswords.com/range/";

/**
 * Check the password against HIBP. Returns:
 *   { breached: true, count: N }  — password appears N times in leaks
 *   { breached: false, count: 0 }  — clean
 *   { breached: false, count: 0, error: "..." } — HIBP unreachable (fail-open)
 */
export async function checkPasswordBreach(password: string): Promise<{
  breached: boolean;
  count: number;
  error?: string;
}> {
  if (!password || password.length < 4) {
    return { breached: false, count: 0 };
  }

  // SHA-1 hash (required by HIBP)
  const sha1 = createHash("sha1").update(password).digest("hex").toUpperCase();
  const prefix = sha1.slice(0, 5);
  const suffix = sha1.slice(5);

  try {
    const res = await fetch(HIBP_URL + prefix, {
      headers: {
        "User-Agent": "markethub-pro-hibp/1.0",
        "Add-Padding": "true", // return randomized padding so traffic analysis can't infer which range we hit
      },
      signal: AbortSignal.timeout(4000),
    });
    if (!res.ok) {
      return { breached: false, count: 0, error: `HIBP returned ${res.status}` };
    }
    const text = await res.text();
    // Response: SUFFIX:COUNT lines
    for (const line of text.split("\n")) {
      const [lineSuffix, countStr] = line.split(":");
      if (!lineSuffix || !countStr) continue;
      if (lineSuffix.trim().toUpperCase() === suffix) {
        const count = parseInt(countStr.trim(), 10) || 0;
        // Padding rows have count 0 — only real matches matter
        if (count > 0) return { breached: true, count };
      }
    }
    return { breached: false, count: 0 };
  } catch (e) {
    // Network error / timeout — fail open. We don't want HIBP downtime
    // to block user registrations. Server-side password strength check
    // still applies.
    return {
      breached: false,
      count: 0,
      error: e instanceof Error ? e.message : "network error",
    };
  }
}
