/**
 * Shared cron auth + SIEM hook. Replaces the ad-hoc "check CRON_SECRET and
 * return 401" blocks scattered across /api/cron/* routes. Logs a SIEM event
 * whenever someone hits a cron endpoint without a valid secret (meaning
 * either a bug, a misconfigured external trigger, or someone probing).
 */
import { NextRequest } from "next/server";
import { timingSafeEqual } from "crypto";
import { logSecurityEvent } from "@/lib/siem";

export function verifyCronSecret(req: NextRequest, path: string): boolean {
  const expected = process.env.CRON_SECRET ?? "";
  const authHeader = req.headers.get("authorization") ?? "";
  const bearer = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : "";
  const legacy = req.headers.get("x-cron-secret") ?? "";
  const provided = bearer || legacy;

  let ok = false;
  if (expected && provided && provided.length === expected.length) {
    try {
      ok = timingSafeEqual(Buffer.from(provided), Buffer.from(expected));
    } catch { /* length mismatch — already caught by the length check */ }
  }

  if (!ok) {
    void logSecurityEvent({
      event_type: "cron_unauthorized",
      ip: req.headers.get("x-forwarded-for")?.split(",")[0].trim() ?? undefined,
      user_agent: req.headers.get("user-agent") ?? undefined,
      path,
      details: {
        had_bearer: Boolean(bearer),
        had_legacy_header: Boolean(legacy),
      },
    });
  }

  return ok;
}
