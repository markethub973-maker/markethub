/**
 * GET /api/_sentry-probe?secret=<BRAIN_CRON_SECRET> — intentionally throws
 * to verify Sentry is capturing server-side errors end-to-end.
 * Safe: only hits Sentry, returns 500 but doesn't affect users.
 */

import { NextRequest, NextResponse } from "next/server";
import * as Sentry from "@sentry/nextjs";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const secret = req.nextUrl.searchParams.get("secret");
  if (!secret || secret !== process.env.BRAIN_CRON_SECRET) {
    return NextResponse.json({ error: "secret required" }, { status: 401 });
  }

  Sentry.captureMessage("Sentry probe — intentional test from /api/_sentry-probe", {
    level: "warning",
    tags: { probe: "manual", trigger: "api" },
  });

  try {
    throw new Error(`Sentry probe error — intentional at ${new Date().toISOString()}`);
  } catch (e) {
    Sentry.captureException(e);
    await Sentry.flush(2000);
    return NextResponse.json({
      ok: true,
      note: "Intentional error sent to Sentry. Check de.sentry.io in ~30s.",
    });
  }
}
