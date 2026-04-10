import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { requireAuth } from "@/lib/route-helpers";

// GET — list all hashtag sets for user
export async function GET() {
  const auth = await requireAuth();
  if (!auth.ok) return auth.response;
  const user = { id: auth.userId };
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("hashtag_sets")
    .select("*")
    .eq("user_id", auth.userId)
    .order("created_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ sets: data || [] });
}

// POST — create a new hashtag set
export async function POST(req: NextRequest) {
  const auth = await requireAuth(); if (!auth.ok) return auth.response;
  const user = { id: auth.userId }; const supabase = await createClient();

  const body = await req.json().catch(() => ({}));
  const { name, hashtags, platform, category } = body as {
    name: string; hashtags: string; platform?: string; category?: string;
  };

  if (!name?.trim()) return NextResponse.json({ error: "Name is required" }, { status: 400 });
  if (!hashtags?.trim()) return NextResponse.json({ error: "Hashtags are required" }, { status: 400 });

  // Count tags
  const count = hashtags.trim().split(/\s+/).filter(h => h.startsWith("#")).length;

  const { data, error } = await supabase
    .from("hashtag_sets")
    .insert({
      user_id: auth.userId,
      name: name.trim(),
      hashtags: hashtags.trim(),
      platform: platform || "instagram",
      category: category?.trim() || "",
      tags_count: count,
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ set: data });
}

// PATCH — update a hashtag set
export async function PATCH(req: NextRequest) {
  const auth = await requireAuth(); if (!auth.ok) return auth.response;
  const user = { id: auth.userId }; const supabase = await createClient();

  const body = await req.json().catch(() => ({}));
  const { id, name, hashtags, platform, category } = body as {
    id: string; name?: string; hashtags?: string; platform?: string; category?: string;
  };
  if (!id) return NextResponse.json({ error: "ID required" }, { status: 400 });

  const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (name !== undefined) updates.name = name.trim();
  if (hashtags !== undefined) {
    updates.hashtags = hashtags.trim();
    updates.tags_count = hashtags.trim().split(/\s+/).filter(h => h.startsWith("#")).length;
  }
  if (platform !== undefined) updates.platform = platform;
  if (category !== undefined) updates.category = category.trim();

  const { data, error } = await supabase
    .from("hashtag_sets")
    .update(updates)
    .eq("id", id)
    .eq("user_id", auth.userId)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ set: data });
}

// DELETE — delete a hashtag set
export async function DELETE(req: NextRequest) {
  const auth = await requireAuth(); if (!auth.ok) return auth.response;
  const user = { id: auth.userId }; const supabase = await createClient();

  const { id } = await req.json().catch(() => ({}));
  if (!id) return NextResponse.json({ error: "ID required" }, { status: 400 });

  const { error } = await supabase
    .from("hashtag_sets")
    .delete()
    .eq("id", id)
    .eq("user_id", auth.userId);

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ success: true });
}
