/**
 * Content Recycling — duplicate a post into a new schedule slot.
 *
 * POST /api/scheduling/recycle  { source_post_id, target_date?, target_time? }
 *
 * Creates a NEW row in scheduled_posts that is a copy of the source, with:
 *   - recycled_from_post_id = source_post_id
 *   - recycle_count = source.recycle_count + 1 (carries forward)
 *   - approval_status = 'draft' (so user can review before publishing)
 *   - date/time = target slot (or computed from Smart Scheduling)
 *
 * Also updates the SOURCE row's last_recycled_at + recycle_count.
 *
 * Auth: requireAuth.
 */
import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/route-helpers";
import { createServiceClient } from "@/lib/supabase/service";

export const dynamic = "force-dynamic";

interface SourcePost {
  id: string;
  user_id: string;
  caption: string | null;
  platform: string | null;
  image_url: string | null;
  hashtags: string | null;
  first_comment: string | null;
  client: string | null;
  client_email: string | null;
  recycle_count: number;
}

export async function POST(req: NextRequest) {
  const auth = await requireAuth();
  if (!auth.ok) return auth.response;

  const body = (await req.json().catch(() => null)) as {
    source_post_id?: string;
    target_date?: string;  // ISO date YYYY-MM-DD
    target_time?: string;  // HH:MM:SS
  } | null;

  if (!body?.source_post_id) {
    return NextResponse.json({ error: "source_post_id required" }, { status: 400 });
  }

  const supa = createServiceClient();

  // 1. Load + validate source post ownership
  const { data: sourceRaw, error: lookupErr } = await supa
    .from("scheduled_posts")
    .select(
      "id, user_id, caption, platform, image_url, hashtags, first_comment, client, client_email, recycle_count",
    )
    .eq("id", body.source_post_id)
    .eq("user_id", auth.userId)
    .maybeSingle();

  if (lookupErr || !sourceRaw) {
    return NextResponse.json({ error: "Source post not found" }, { status: 404 });
  }
  const source = sourceRaw as SourcePost;

  // 2. Determine target slot — default: tomorrow at 11:00
  const targetDate =
    body.target_date ??
    new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
  const targetTime = body.target_time ?? "11:00:00";

  // 3. Insert duplicate row
  const { data: newPost, error: insErr } = await supa
    .from("scheduled_posts")
    .insert({
      user_id: auth.userId,
      caption: source.caption,
      platform: source.platform,
      image_url: source.image_url,
      hashtags: source.hashtags,
      first_comment: source.first_comment,
      client: source.client,
      client_email: source.client_email,
      date: targetDate,
      time: targetTime,
      status: "scheduled",
      approval_status: "draft", // require fresh approval
      recycled_from_post_id: source.id,
      recycle_count: (source.recycle_count ?? 0) + 1,
    })
    .select("id, date, time")
    .single();

  if (insErr || !newPost) {
    return NextResponse.json({ error: insErr?.message ?? "Insert failed" }, { status: 500 });
  }

  // 4. Update source last_recycled_at + bump count
  await supa
    .from("scheduled_posts")
    .update({
      last_recycled_at: new Date().toISOString(),
      recycle_count: (source.recycle_count ?? 0) + 1,
    })
    .eq("id", source.id);

  return NextResponse.json({
    ok: true,
    new_post: newPost,
    note: `Recycled into ${targetDate} ${targetTime} as draft. Review + approve before publish.`,
  });
}
