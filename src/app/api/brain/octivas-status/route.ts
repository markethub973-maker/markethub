/**
 * GET /api/brain/octivas-status — quick check of Octivas account status.
 *
 * Returns credits remaining + plan info so we don't accidentally exhaust
 * the free tier by running bulk-import too aggressively. Also reports if
 * the key isn't set at all.
 *
 * Auth: x-brain-cron-secret.
 */

import { NextRequest, NextResponse } from "next/server";
import { octivasAccountStatus } from "@/lib/octivas";

export const dynamic = "force-dynamic";
export const maxDuration = 15;

function authOk(req: NextRequest): boolean {
  const secret = req.headers.get("x-brain-cron-secret");
  return Boolean(secret && secret === process.env.BRAIN_CRON_SECRET);
}

export async function GET(req: NextRequest) {
  if (!authOk(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const hasKey = Boolean(process.env.OCTIVAS_API_KEY);
  if (!hasKey) {
    return NextResponse.json({
      ok: true,
      configured: false,
      note: "OCTIVAS_API_KEY not set. Sign up at https://octivas.com (free tier = 1000 credits/month) and add OCTIVAS_API_KEY to Vercel env.",
    });
  }
  const status = await octivasAccountStatus();
  return NextResponse.json({
    ok: true,
    configured: true,
    status: status ?? { note: "account endpoint unreachable or not available on free tier" },
  });
}
