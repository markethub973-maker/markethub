/**
 * GET  /api/brain/strategy-stack         — list all strategies with current state
 * PATCH /api/brain/strategy-stack        — update strategy status/notes/KPIs
 *
 * The 12-strategy stack for super-profitability without losing control.
 * Ordered from most control-retentive (rank 1, bootstrap) to most expensive
 * (rank 12, classic VC — avoided).
 *
 * Auth: brain_admin cookie OR x-brain-cron-secret.
 */

import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";

export const dynamic = "force-dynamic";

function authOk(req: NextRequest): boolean {
  const cookieOk = req.cookies.get("brain_admin")?.value === "1";
  const cronOk =
    req.headers.get("x-brain-cron-secret") &&
    req.headers.get("x-brain-cron-secret") === process.env.BRAIN_CRON_SECRET;
  return Boolean(cookieOk || cronOk);
}

export async function GET(req: NextRequest) {
  if (!authOk(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const tier = req.nextUrl.searchParams.get("tier");
  const status = req.nextUrl.searchParams.get("status");

  const svc = createServiceClient();
  let q = svc.from("brain_strategy_stack").select("*").order("rank", { ascending: true });
  if (tier) q = q.eq("tier", tier);
  if (status) q = q.eq("current_status", status);

  const { data } = await q;

  // Summary stats
  const active = (data ?? []).filter((s) => s.current_status === "active").length;
  const planned = (data ?? []).filter((s) => s.current_status === "planned").length;
  const monitoring = (data ?? []).filter((s) => s.current_status === "monitoring").length;

  return NextResponse.json({
    ok: true,
    strategies: data ?? [],
    summary: {
      total: data?.length ?? 0,
      active,
      planned,
      monitoring,
      avg_control_retained: Math.round(
        ((data ?? [])
          .filter((s) => s.current_status !== "abandoned")
          .reduce((acc, s) => acc + (s.control_retained_pct ?? 0), 0) /
          Math.max(1, (data ?? []).filter((s) => s.current_status !== "abandoned").length))),
    },
  });
}

export async function PATCH(req: NextRequest) {
  if (!authOk(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = (await req.json().catch(() => ({}))) as {
    id?: string;
    rank?: number;
    current_status?: string;
    progress_notes?: string;
    kpi_current?: string;
    next_milestone?: string;
  };

  if (!body.id && !body.rank) {
    return NextResponse.json({ error: "id or rank required" }, { status: 400 });
  }

  const svc = createServiceClient();
  const updates: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  };
  if (body.current_status) updates.current_status = body.current_status;
  if (body.progress_notes) updates.progress_notes = body.progress_notes;
  if (body.kpi_current) updates.kpi_current = body.kpi_current;
  if (body.next_milestone) updates.next_milestone = body.next_milestone;
  if (body.current_status === "active" && !updates.started_at) {
    updates.started_at = new Date().toISOString();
  }

  const query = body.id
    ? svc.from("brain_strategy_stack").update(updates).eq("id", body.id)
    : svc.from("brain_strategy_stack").update(updates).eq("rank", body.rank!);

  const { data, error } = await query.select().single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, strategy: data });
}
