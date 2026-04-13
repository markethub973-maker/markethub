/**
 * Cost Monitor — live status endpoint for Admin Dashboard (M7 consumer).
 *
 * GET /api/cost-monitor/status
 * Returns latest snapshot per resource with derived fields (pct, status color).
 *
 * Admin-only (session cookie).
 */

import { NextRequest, NextResponse } from "next/server";
import { isAdminAuthorized } from "@/lib/adminAuth";
import { createServiceClient } from "@/lib/supabase/service";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  if (!isAdminAuthorized(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supa = createServiceClient();

  // Latest row per resource
  const { data, error } = await supa
    .from("resource_usage")
    .select("*")
    .order("checked_at", { ascending: false });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const latestByResource = new Map<string, typeof data[number]>();
  for (const row of data ?? []) {
    if (!latestByResource.has(row.resource)) {
      latestByResource.set(row.resource, row);
    }
  }

  // Recent alerts (last 7 days, unresolved)
  const weekAgo = new Date(Date.now() - 7 * 86400000).toISOString();
  const { data: alerts } = await supa
    .from("resource_alerts")
    .select("*")
    .gte("created_at", weekAgo)
    .is("resolved_at", null)
    .order("created_at", { ascending: false })
    .limit(20);

  const snapshot = Array.from(latestByResource.values()).map((r) => {
    const pct = r.pct_used ?? 0;
    const status = pct >= 95 ? "critical" : pct >= 80 ? "warning" : pct >= 50 ? "moderate" : "ok";
    return {
      resource: r.resource,
      category: r.category,
      current: Number(r.current_value),
      limit: Number(r.limit_value),
      unit: r.unit,
      pct: Math.round(pct * 10) / 10,
      status,
      projection_days: r.projection_days,
      checked_at: r.checked_at,
      error: (r.detail as Record<string, unknown>)?.error ?? null,
    };
  });

  // Overall platform health
  const criticalCount = snapshot.filter((s) => s.status === "critical").length;
  const warningCount = snapshot.filter((s) => s.status === "warning").length;
  const overallStatus =
    criticalCount > 0 ? "critical" : warningCount > 0 ? "warning" : "ok";

  return NextResponse.json({
    ok: true,
    overall_status: overallStatus,
    critical_count: criticalCount,
    warning_count: warningCount,
    resources: snapshot,
    recent_alerts: alerts ?? [],
  });
}
