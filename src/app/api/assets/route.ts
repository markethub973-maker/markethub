import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/route-helpers";
import { createServiceClient } from "@/lib/supabase/service";

export async function GET(_req: NextRequest) {
  const auth = await requireAuth();
  if (!auth.ok) return auth.response;

  const supa = createServiceClient();
  const { data, error } = await supa
    .from("assets")
    .select("*")
    .eq("user_id", auth.userId)
    .order("created_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ assets: data });
}

export async function POST(req: NextRequest) {
  const auth = await requireAuth();
  if (!auth.ok) return auth.response;

  const body = await req.json();
  if (!body.name?.trim()) return NextResponse.json({ error: "name required" }, { status: 400 });

  const supa = createServiceClient();
  const { data, error } = await supa
    .from("assets")
    .insert({
      user_id: auth.userId,
      name: body.name.trim(),
      category: body.category ?? "production",
      file_path: body.file_path ?? null,
      file_url: body.file_url ?? null,
      external_url: body.external_url ?? null,
      file_size: body.file_size ?? 0,
      mime_type: body.mime_type ?? null,
      client: body.client ?? "",
      tags: body.tags ?? [],
      notes: body.notes ?? "",
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ asset: data }, { status: 201 });
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
  if (rest.category !== undefined) updates.category = rest.category;
  if (rest.client !== undefined) updates.client = rest.client;
  if (rest.tags !== undefined) updates.tags = rest.tags;
  if (rest.notes !== undefined) updates.notes = rest.notes;
  if (rest.external_url !== undefined) updates.external_url = rest.external_url;

  const { data, error } = await supa
    .from("assets")
    .update(updates)
    .eq("id", id)
    .eq("user_id", auth.userId)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ asset: data });
}

export async function DELETE(req: NextRequest) {
  const auth = await requireAuth();
  if (!auth.ok) return auth.response;

  const { id } = await req.json();
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

  const supa = createServiceClient();

  // Get asset to check file_path for storage cleanup
  const { data: asset } = await supa
    .from("assets")
    .select("file_path")
    .eq("id", id)
    .eq("user_id", auth.userId)
    .single();

  // Delete from storage if it was uploaded
  if (asset?.file_path) {
    await supa.storage.from("assets").remove([asset.file_path]);
  }

  const { error } = await supa
    .from("assets")
    .delete()
    .eq("id", id)
    .eq("user_id", auth.userId);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
