import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/route-helpers";
import { createServiceClient } from "@/lib/supabase/service";

export async function GET(_req: NextRequest) {
  const auth = await requireAuth();
  if (!auth.ok) return auth.response;
  const supa = createServiceClient();
  const { data, error } = await supa.from("affiliate_links").select("*").eq("user_id", auth.userId).order("created_at", { ascending: false });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ links: data });
}

export async function POST(req: NextRequest) {
  const auth = await requireAuth();
  if (!auth.ok) return auth.response;
  const body = await req.json();
  if (!body.name?.trim() || !body.url?.trim()) return NextResponse.json({ error: "name and url required" }, { status: 400 });
  const supa = createServiceClient();
  const { data, error } = await supa.from("affiliate_links").insert({ user_id: auth.userId, name: body.name, platform: body.platform ?? "other", product: body.product ?? "", url: body.url, commission: body.commission ?? 0, category: body.category ?? "", notes: body.notes ?? "" }).select().single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ link: data }, { status: 201 });
}

export async function PATCH(req: NextRequest) {
  const auth = await requireAuth();
  if (!auth.ok) return auth.response;
  const { id, ...rest } = await req.json();
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });
  const supa = createServiceClient();
  const { data, error } = await supa.from("affiliate_links").update({ ...rest, updated_at: new Date().toISOString() }).eq("id", id).eq("user_id", auth.userId).select().single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ link: data });
}

export async function DELETE(req: NextRequest) {
  const auth = await requireAuth();
  if (!auth.ok) return auth.response;
  const { id } = await req.json();
  const supa = createServiceClient();
  const { error } = await supa.from("affiliate_links").delete().eq("id", id).eq("user_id", auth.userId);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
