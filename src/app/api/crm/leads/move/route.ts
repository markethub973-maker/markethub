/**
 * CRM — atomic lead stage move.
 *
 * POST /api/crm/leads/move  { lead_id, stage_id, position }
 *
 * Calls the move_lead_to_stage Postgres function which:
 *   1. Validates lead ownership
 *   2. Closes the gap in the OLD stage (positions after the lead shift up by 1)
 *   3. Opens room in the TARGET stage at p_position (positions ≥ shift down by 1)
 *   4. Updates the lead with new stage_id + position + last_activity_at
 *
 * All in one transaction so concurrent drag-drops don't corrupt the ordering.
 *
 * Auth: requireAuth.
 */
import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/route-helpers";
import { createServiceClient } from "@/lib/supabase/service";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const auth = await requireAuth();
  if (!auth.ok) return auth.response;

  const body = (await req.json().catch(() => null)) as {
    lead_id?: string;
    stage_id?: string;
    position?: number;
  } | null;

  if (!body?.lead_id || !body.stage_id || body.position == null || body.position < 0) {
    return NextResponse.json(
      { error: "lead_id, stage_id, and non-negative position required" },
      { status: 400 },
    );
  }

  const supa = createServiceClient();

  // Ownership check (RLS + explicit)
  const { data: lead } = await supa
    .from("research_leads")
    .select("id")
    .eq("id", body.lead_id)
    .eq("user_id", auth.userId)
    .maybeSingle();
  if (!lead) {
    return NextResponse.json({ error: "Lead not found" }, { status: 404 });
  }

  // Ownership check on the target stage as well
  const { data: stage } = await supa
    .from("pipeline_stages")
    .select("id")
    .eq("id", body.stage_id)
    .eq("user_id", auth.userId)
    .maybeSingle();
  if (!stage) {
    return NextResponse.json({ error: "Stage not found" }, { status: 404 });
  }

  const { error } = await supa.rpc("move_lead_to_stage", {
    p_lead: body.lead_id,
    p_stage: body.stage_id,
    p_position: body.position,
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
