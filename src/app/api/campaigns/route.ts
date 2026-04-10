import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/route-helpers";
import { createServiceClient } from "@/lib/supabase/service";

export async function GET(_req: NextRequest) {
  const auth = await requireAuth();
  if (!auth.ok) return auth.response;

  const supa = createServiceClient();
  const { data, error } = await supa
    .from("campaigns")
    .select("*")
    .eq("user_id", auth.userId)
    .order("created_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ campaigns: data });
}

export async function POST(req: NextRequest) {
  const auth = await requireAuth();
  if (!auth.ok) return auth.response;

  const body = await req.json();
  const supa = createServiceClient();

  const { data, error } = await supa
    .from("campaigns")
    .insert({
      user_id: auth.userId,
      name: body.name,
      client: body.client ?? "",
      platform: body.platform ?? "Instagram",
      status: body.status ?? "draft",
      budget: body.budget ?? 0,
      spent: body.spent ?? 0,
      start_date: body.startDate || null,
      end_date: body.endDate || null,
      impressions: body.impressions ?? 0,
      clicks: body.clicks ?? 0,
      conversions: body.conversions ?? 0,
      revenue: body.revenue ?? 0,
      notes: body.notes ?? "",
      ig_username: body.igUsername ?? "",
      tiktok_username: body.tiktokUsername ?? "",
      social_data: body.socialData ?? {},
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ campaign: data }, { status: 201 });
}

export async function PATCH(req: NextRequest) {
  const auth = await requireAuth();
  if (!auth.ok) return auth.response;

  const body = await req.json();
  const { id, ...rest } = body;
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

  const supa = createServiceClient();
  const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (rest.name !== undefined) updates.name = rest.name;
  if (rest.client !== undefined) updates.client = rest.client;
  if (rest.platform !== undefined) updates.platform = rest.platform;
  if (rest.status !== undefined) updates.status = rest.status;
  if (rest.budget !== undefined) updates.budget = rest.budget;
  if (rest.spent !== undefined) updates.spent = rest.spent;
  if (rest.startDate !== undefined) updates.start_date = rest.startDate || null;
  if (rest.endDate !== undefined) updates.end_date = rest.endDate || null;
  if (rest.impressions !== undefined) updates.impressions = rest.impressions;
  if (rest.clicks !== undefined) updates.clicks = rest.clicks;
  if (rest.conversions !== undefined) updates.conversions = rest.conversions;
  if (rest.revenue !== undefined) updates.revenue = rest.revenue;
  if (rest.notes !== undefined) updates.notes = rest.notes;
  if (rest.igUsername !== undefined) updates.ig_username = rest.igUsername;
  if (rest.tiktokUsername !== undefined) updates.tiktok_username = rest.tiktokUsername;
  if (rest.socialData !== undefined) updates.social_data = rest.socialData;

  const { data, error } = await supa
    .from("campaigns")
    .update(updates)
    .eq("id", id)
    .eq("user_id", auth.userId)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ campaign: data });
}

export async function DELETE(req: NextRequest) {
  const auth = await requireAuth();
  if (!auth.ok) return auth.response;

  const { id } = await req.json();
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

  const supa = createServiceClient();
  const { error } = await supa
    .from("campaigns")
    .delete()
    .eq("id", id)
    .eq("user_id", auth.userId);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
