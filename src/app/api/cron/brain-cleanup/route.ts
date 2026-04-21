import { NextRequest, NextResponse } from "next/server";
import { timingSafeEqual } from "crypto";
import { isAlexPaused, pausedResponse } from "@/lib/killSwitch";
import { cleanExpiredHashes } from "@/lib/uniqueness-engine";
import { recalculatePlatformConfidence } from "@/lib/auto-learning-brain";

const CRON_SECRET = process.env.CRON_SECRET ?? "";

export async function GET(req: NextRequest) {
  // Kill switch check
  if (isAlexPaused()) {
    return pausedResponse("Brain cleanup paused");
  }

  // Auth: CRON_SECRET via Bearer token
  const authHeader = req.headers.get("authorization") ?? "";
  const provided = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : "";
  let authorized = false;

  if (CRON_SECRET && provided && provided.length === CRON_SECRET.length) {
    try {
      authorized = timingSafeEqual(
        Buffer.from(provided),
        Buffer.from(CRON_SECRET)
      );
    } catch {
      /* length mismatch */
    }
  }

  if (!authorized) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // 1. Clean expired content hashes
    const cleaned = await cleanExpiredHashes();
    console.log(`[brain-cleanup] Cleaned ${cleaned} expired content hashes`);

    // 2. Recalculate platform brain confidence scores
    const recalculated = await recalculatePlatformConfidence();
    console.log(
      `[brain-cleanup] Recalculated confidence for ${recalculated} platform brain rows`
    );

    return NextResponse.json({
      success: true,
      cleaned,
      recalculated,
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[brain-cleanup] Error:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
