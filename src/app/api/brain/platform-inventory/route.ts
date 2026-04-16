/**
 * GET  /api/brain/platform-inventory — list all platform capabilities
 * PATCH /api/brain/platform-inventory — agent flags a gap for Alex to plan
 *
 * Every agent MUST query this before proposing external tools or budget.
 * Rule: use what we have first. Escalate gaps via PATCH with gap_notes.
 *
 * Auth: x-brain-cron-secret OR brain_admin cookie.
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

  const category = req.nextUrl.searchParams.get("category");
  const status = req.nextUrl.searchParams.get("status");
  const search = req.nextUrl.searchParams.get("q");

  const svc = createServiceClient();
  let q = svc.from("brain_platform_capabilities").select("*").order("category").order("capability");
  if (category) q = q.eq("category", category);
  if (status) q = q.eq("status", status);
  if (search) q = q.ilike("capability", `%${search}%`);

  const { data } = await q;

  // Group by category for agent consumption
  const byCategory: Record<string, Array<Record<string, unknown>>> = {};
  (data ?? []).forEach((d) => {
    const key = d.category as string;
    if (!byCategory[key]) byCategory[key] = [];
    byCategory[key].push(d);
  });

  return NextResponse.json({
    ok: true,
    capabilities: data ?? [],
    by_category: byCategory,
    summary: {
      total: data?.length ?? 0,
      active: (data ?? []).filter((d) => d.status === "active").length,
      needs_upgrade: (data ?? []).filter((d) => d.status === "needs_upgrade").length,
      not_yet_built: (data ?? []).filter((d) => d.status === "not_yet_built").length,
    },
  });
}

/**
 * Agents call PATCH to flag a gap — something they need that isn't built yet.
 * Alex reviews flagged gaps periodically and adds to roadmap.
 */
export async function PATCH(req: NextRequest) {
  if (!authOk(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = (await req.json().catch(() => ({}))) as {
    capability?: string;
    gap_notes?: string;
    raised_by_agent?: string; // which agent noticed the gap
    status?: "active" | "degraded" | "not_yet_built" | "needs_upgrade";
  };

  if (!body.capability) return NextResponse.json({ error: "capability required" }, { status: 400 });

  const svc = createServiceClient();

  // Check if exists
  const { data: existing } = await svc
    .from("brain_platform_capabilities")
    .select("id")
    .ilike("capability", body.capability)
    .maybeSingle();

  if (existing) {
    const { data } = await svc
      .from("brain_platform_capabilities")
      .update({
        gap_notes: body.gap_notes,
        status: body.status,
        last_verified_at: new Date().toISOString(),
      })
      .eq("id", existing.id)
      .select()
      .single();
    return NextResponse.json({ ok: true, updated: true, capability: data });
  }

  // Create as new gap
  const { data } = await svc
    .from("brain_platform_capabilities")
    .insert({
      capability: body.capability,
      category: "agents",
      status: body.status ?? "not_yet_built",
      gap_notes: `${body.gap_notes ?? ""} (flagged by ${body.raised_by_agent ?? "unknown"})`,
      how_to_use: "GAP — needs Alex to add to roadmap",
    })
    .select()
    .single();

  return NextResponse.json({ ok: true, created: true, capability: data });
}
