/**
 * GET  /api/brain/delegation-map — list all delegation decisions
 * PATCH /api/brain/delegation-map — update status/partner/budget
 *
 * The Musk-simplified delegation framework for Eduard:
 *   - FOUNDER CORE: never delegate (vision, investor, money, brand)
 *   - AI TEAM: in-platform agents (Alex + 9 directors)
 *   - SPECIALIST: solo contractors (lawyer, accountant, dev, designer)
 *   - FIRM: agencies with end-to-end packages (PR, media, video)
 *   - COMMUNITY: affiliates, white-label partners, referral network
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

  const layer = req.nextUrl.searchParams.get("layer");
  const svc = createServiceClient();
  let q = svc.from("brain_delegation_map").select("*").order("layer").order("created_at");
  if (layer) q = q.eq("layer", layer);
  const { data } = await q;

  // Group by layer
  const byLayer: Record<string, Array<Record<string, unknown>>> = {};
  (data ?? []).forEach((d) => {
    const key = d.layer as string;
    if (!byLayer[key]) byLayer[key] = [];
    byLayer[key].push(d);
  });

  return NextResponse.json({
    ok: true,
    delegations: data ?? [],
    by_layer: byLayer,
    summary: {
      total: data?.length ?? 0,
      founder_keeps: (data ?? []).filter((d) => d.keep_or_delegate === "KEEP").length,
      delegated: (data ?? []).filter((d) => d.keep_or_delegate === "DELEGATE").length,
      active_partnerships: (data ?? []).filter((d) => d.current_status === "active" || d.current_status === "contracted").length,
      pending_search: (data ?? []).filter((d) => d.current_status === "searching").length,
    },
  });
}

export async function PATCH(req: NextRequest) {
  if (!authOk(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = (await req.json().catch(() => ({}))) as {
    id?: string;
    domain?: string;
    current_status?: string;
    partner_name_candidates?: string[];
    notes?: string;
    budget_monthly?: string;
  };

  if (!body.id && !body.domain) {
    return NextResponse.json({ error: "id or domain required" }, { status: 400 });
  }

  const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (body.current_status) updates.current_status = body.current_status;
  if (body.partner_name_candidates) updates.partner_name_candidates = body.partner_name_candidates;
  if (body.notes) updates.notes = body.notes;
  if (body.budget_monthly) updates.budget_monthly = body.budget_monthly;

  const svc = createServiceClient();
  const q = body.id
    ? svc.from("brain_delegation_map").update(updates).eq("id", body.id)
    : svc.from("brain_delegation_map").update(updates).eq("domain", body.domain!);
  const { data, error } = await q.select().single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, delegation: data });
}
