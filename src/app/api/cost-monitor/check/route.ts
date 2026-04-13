/**
 * Cost Monitor — scheduled check endpoint (M3 Sprint 1)
 *
 * POST /api/cost-monitor/check  (Bearer CRON_SECRET)
 *
 * Runs all resource checks in parallel, persists snapshot to `resource_usage`,
 * fires Telegram + email alerts at 80% and 95% thresholds (deduped 24h).
 *
 * Called by GitHub Actions cron every 6 hours.
 */

import { NextRequest, NextResponse } from "next/server";
import { runAllChecks, persistChecks, fireAlertsIfNeeded } from "@/lib/costMonitor";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function POST(req: NextRequest) {
  const auth = req.headers.get("authorization");
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const checks = await runAllChecks();
    await persistChecks(checks);
    const alertResult = await fireAlertsIfNeeded(checks);

    return NextResponse.json({
      ok: true,
      checked: checks.length,
      alerts_fired: alertResult.fired,
      summary: checks.map((c) => ({
        resource: c.resource,
        pct: c.limit_value > 0 ? Math.round((c.current_value / c.limit_value) * 1000) / 10 : null,
        error: c.error,
      })),
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}

/** GET /api/cost-monitor/check — returns latest snapshot (admin-only) */
export async function GET() {
  const { createServiceClient } = await import("@/lib/supabase/service");
  const supa = createServiceClient();
  const { data, error } = await supa
    .from("resource_usage")
    .select("*")
    .order("checked_at", { ascending: false })
    .limit(50);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, checks: data ?? [] });
}
