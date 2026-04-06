import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// PATCH — update a post
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const body = await req.json().catch(() => ({}));
  const { title, caption, platform, status, date, time, client, hashtags, image_url } = body as {
    title?: string; caption?: string; platform?: string; status?: string;
    date?: string; time?: string; client?: string; hashtags?: string; image_url?: string;
  };

  const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (title !== undefined) updates.title = title.trim();
  if (caption !== undefined) updates.caption = caption.trim();
  if (platform !== undefined) updates.platform = platform;
  if (status !== undefined) updates.status = status;
  if (date !== undefined) updates.date = date;
  if (time !== undefined) updates.time = time;
  if (client !== undefined) updates.client = client.trim();
  if (hashtags !== undefined) updates.hashtags = hashtags.trim();
  if (image_url !== undefined) updates.image_url = image_url?.trim() || null;

  const { data, error } = await supabase
    .from("scheduled_posts")
    .update(updates)
    .eq("id", id)
    .eq("user_id", user.id) // ensure ownership
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ post: data });
}

// DELETE — delete a post
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;

  const { error } = await supabase
    .from("scheduled_posts")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ success: true });
}
