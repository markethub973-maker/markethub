/**
 * CRM — pipeline stages CRUD.
 *
 *   GET    — list user's stages in order. Auto-seeds 6 default stages
 *            (New → Qualified → Proposal → Negotiation → Won | Lost) on
 *            first call via the seed_default_pipeline_stages RPC.
 *   POST   — create a new stage { name, color?, position? }
 *   PATCH  — update a stage { id, name?, color?, position? }
 *   DELETE — remove a stage { id }. Leads in that stage fall back to
 *            NULL pipeline_stage_id (FK ON DELETE SET NULL).
 *
 * Auth: requireAuth (Supabase user session).
 */
import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/route-helpers";
import { createServiceClient } from "@/lib/supabase/service";

export const dynamic = "force-dynamic";

export async function GET(_req: NextRequest) {
  const auth = await requireAuth();
  if (!auth.ok) return auth.response;

  const supa = createServiceClient();

  // Auto-seed defaults if user has no stages yet (first Kanban open)
  await supa.rpc("seed_default_pipeline_stages", { p_user: auth.userId });

  const { data, error } = await supa
    .from("pipeline_stages")
    .select("id, name, color, position, is_default, is_terminal, created_at")
    .eq("user_id", auth.userId)
    .order("position", { ascending: true });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ stages: data ?? [] });
}

export async function POST(req: NextRequest) {
  const auth = await requireAuth();
  if (!auth.ok) return auth.response;

  const body = (await req.json().catch(() => null)) as {
    name?: string;
    color?: string;
    position?: number;
    is_terminal?: boolean;
  } | null;

  if (!body?.name?.trim()) {
    return NextResponse.json({ error: "name required" }, { status: 400 });
  }

  const supa = createServiceClient();

  // Determine position — if not provided, append to the end
  let position = body.position;
  if (position == null) {
    const { data: last } = await supa
      .from("pipeline_stages")
      .select("position")
      .eq("user_id", auth.userId)
      .order("position", { ascending: false })
      .limit(1)
      .maybeSingle();
    position = ((last as { position: number } | null)?.position ?? -1) + 1;
  }

  const { data, error } = await supa
    .from("pipeline_stages")
    .insert({
      user_id: auth.userId,
      name: body.name.trim().slice(0, 60),
      color: body.color?.slice(0, 20) ?? "#F59E0B",
      position,
      is_terminal: body.is_terminal ?? false,
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ stage: data });
}

export async function PATCH(req: NextRequest) {
  const auth = await requireAuth();
  if (!auth.ok) return auth.response;

  const body = (await req.json().catch(() => null)) as {
    id?: string;
    name?: string;
    color?: string;
    position?: number;
    is_terminal?: boolean;
  } | null;

  if (!body?.id) {
    return NextResponse.json({ error: "id required" }, { status: 400 });
  }

  const update: Record<string, unknown> = {};
  if (body.name !== undefined) update.name = body.name.trim().slice(0, 60);
  if (body.color !== undefined) update.color = body.color.slice(0, 20);
  if (body.position !== undefined) update.position = body.position;
  if (body.is_terminal !== undefined) update.is_terminal = body.is_terminal;

  if (Object.keys(update).length === 0) {
    return NextResponse.json({ error: "no updates" }, { status: 400 });
  }

  const supa = createServiceClient();
  const { error } = await supa
    .from("pipeline_stages")
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
    .from("pipeline_stages")
    .delete()
    .eq("id", body.id)
    .eq("user_id", auth.userId);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
