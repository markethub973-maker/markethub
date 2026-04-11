/**
 * CRM — leads listing for the Kanban board.
 *
 *   GET  — returns every lead for the user, ordered by stage then
 *          stage_position. The UI groups them into columns in one pass.
 *   POST — quick-add a new lead to a specific stage at the end
 *          { stage_id, name, phone?, email?, estimated_value?, notes? }
 *   PATCH — update lead metadata (name, phone, email, notes,
 *           estimated_value, close_date, pipeline_status text fallback)
 *   DELETE — remove a lead { id }
 *
 * Stage MOVE goes through /api/crm/leads/move instead (separate route so
 * the atomic position-reindex RPC is isolated).
 *
 * Auth: requireAuth.
 */
import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/route-helpers";
import { createServiceClient } from "@/lib/supabase/service";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const auth = await requireAuth();
  if (!auth.ok) return auth.response;

  const url = req.nextUrl;
  const search = url.searchParams.get("q")?.trim();
  const stageId = url.searchParams.get("stage");

  const supa = createServiceClient();
  let q = supa
    .from("research_leads")
    .select(
      "id, name, email, phone, website, city, category, source, rating, reviews_count, pipeline_status, pipeline_stage_id, stage_position, last_activity_at, estimated_value, close_date, notes, created_at",
    )
    .eq("user_id", auth.userId)
    .order("pipeline_stage_id", { ascending: true, nullsFirst: true })
    .order("stage_position", { ascending: true })
    .limit(500);

  if (stageId) q = q.eq("pipeline_stage_id", stageId);
  if (search) q = q.or(`name.ilike.%${search}%,email.ilike.%${search}%,phone.ilike.%${search}%`);

  const { data, error } = await q;
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ leads: data ?? [] });
}

export async function POST(req: NextRequest) {
  const auth = await requireAuth();
  if (!auth.ok) return auth.response;

  const body = (await req.json().catch(() => null)) as {
    stage_id?: string;
    name?: string;
    phone?: string;
    email?: string;
    website?: string;
    city?: string;
    estimated_value?: number;
    notes?: string;
  } | null;

  if (!body?.name?.trim()) {
    return NextResponse.json({ error: "name required" }, { status: 400 });
  }

  const supa = createServiceClient();

  // Append position = max(current stage positions) + 1
  let stage_position = 0;
  if (body.stage_id) {
    const { data: last } = await supa
      .from("research_leads")
      .select("stage_position")
      .eq("user_id", auth.userId)
      .eq("pipeline_stage_id", body.stage_id)
      .order("stage_position", { ascending: false })
      .limit(1)
      .maybeSingle();
    stage_position = ((last as { stage_position: number } | null)?.stage_position ?? -1) + 1;
  }

  const { data, error } = await supa
    .from("research_leads")
    .insert({
      user_id: auth.userId,
      name: body.name.trim().slice(0, 200),
      phone: body.phone?.trim() ?? null,
      email: body.email?.trim() ?? null,
      website: body.website?.trim() ?? null,
      city: body.city?.trim() ?? null,
      estimated_value: body.estimated_value ?? null,
      notes: body.notes?.trim() ?? null,
      pipeline_stage_id: body.stage_id ?? null,
      stage_position,
      source: "manual",
      lead_type: "business",
      category: "crm_manual",
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ lead: data });
}

export async function PATCH(req: NextRequest) {
  const auth = await requireAuth();
  if (!auth.ok) return auth.response;

  const body = (await req.json().catch(() => null)) as {
    id?: string;
    name?: string;
    phone?: string | null;
    email?: string | null;
    website?: string | null;
    city?: string | null;
    estimated_value?: number | null;
    close_date?: string | null;
    notes?: string | null;
    pipeline_status?: string | null;
  } | null;

  if (!body?.id) {
    return NextResponse.json({ error: "id required" }, { status: 400 });
  }

  const update: Record<string, unknown> = { last_activity_at: new Date().toISOString() };
  for (const k of [
    "name",
    "phone",
    "email",
    "website",
    "city",
    "estimated_value",
    "close_date",
    "notes",
    "pipeline_status",
  ] as const) {
    if (body[k] !== undefined) update[k] = body[k];
  }

  if (Object.keys(update).length === 1) {
    return NextResponse.json({ error: "no updates" }, { status: 400 });
  }

  const supa = createServiceClient();
  const { error } = await supa
    .from("research_leads")
    .update(update)
    .eq("id", body.id)
    .eq("user_id", auth.userId);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}

export async function DELETE(req: NextRequest) {
  const auth = await requireAuth();
  if (!auth.ok) return auth.response;

  const body = (await req.json().catch(() => null)) as { id?: string } | null;
  if (!body?.id) {
    return NextResponse.json({ error: "id required" }, { status: 400 });
  }

  const supa = createServiceClient();
  const { error } = await supa
    .from("research_leads")
    .delete()
    .eq("id", body.id)
    .eq("user_id", auth.userId);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
