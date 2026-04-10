import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/route-helpers";
import { createServiceClient } from "@/lib/supabase/service";
import {
  publishToLinkedIn,
  publishToFacebook,
  publishToInstagram,
  type PublishResult,
  type ScheduledPostRow,
} from "@/lib/publishers";

// POST /api/calendar/publish — publish a scheduled post to its platform now
export async function POST(req: NextRequest) {
  const auth = await requireAuth();
  if (!auth.ok) return auth.response;

  const { post_id } = await req.json();
  if (!post_id) return NextResponse.json({ error: "post_id required" }, { status: 400 });

  const supa = createServiceClient();
  const { data: post } = await supa
    .from("scheduled_posts")
    .select("id, user_id, title, caption, platform, status, date, time, image_url, client, hashtags, first_comment")
    .eq("id", post_id)
    .eq("user_id", auth.userId)
    .single();

  if (!post) return NextResponse.json({ error: "Post not found" }, { status: 404 });

  const row = post as ScheduledPostRow;
  const platform = row.platform?.toLowerCase() ?? "";
  let result: PublishResult = { ok: false, error: "Platform not supported for auto-publish" };

  if (platform === "linkedin") {
    const { data: profile } = await supa.from("profiles").select("linkedin_access_token").eq("id", auth.userId).single();
    result = await publishToLinkedIn(row, profile?.linkedin_access_token ?? "");
  } else if (platform === "facebook") {
    const { data: profile } = await supa.from("profiles").select("fb_page_id, fb_page_access_token").eq("id", auth.userId).single();
    result = await publishToFacebook(row, profile?.fb_page_id ?? null, profile?.fb_page_access_token ?? null);
  } else if (platform === "instagram") {
    const { data: profile } = await supa.from("profiles").select("instagram_user_id, instagram_access_token").eq("id", auth.userId).single();
    result = await publishToInstagram(row, profile?.instagram_user_id ?? null, profile?.instagram_access_token ?? null);
  }

  // Log result (non-fatal if publish_log write fails)
  await supa.from("publish_log").insert({
    post_id,
    platform,
    status: result.ok ? "success" : "failed",
    external_id: result.external_id ?? null,
    error_msg: result.error ?? null,
  });

  // Update post status on success
  if (result.ok) {
    await supa
      .from("scheduled_posts")
      .update({
        status: "published",
        published_at: new Date().toISOString(),
        post_result: { ...result, manual: true },
      })
      .eq("id", post_id);
  }

  return NextResponse.json(result);
}

// GET /api/calendar/publish — get publish log for a post
export async function GET(req: NextRequest) {
  const auth = await requireAuth();
  if (!auth.ok) return auth.response;
  const post_id = req.nextUrl.searchParams.get("post_id");
  if (!post_id) return NextResponse.json({ logs: [] });

  // Verify post ownership before returning log
  const supa = createServiceClient();
  const { data: post } = await supa
    .from("scheduled_posts")
    .select("id")
    .eq("id", post_id)
    .eq("user_id", auth.userId)
    .single();
  if (!post) return NextResponse.json({ logs: [] });

  const { data } = await supa
    .from("publish_log")
    .select("*")
    .eq("post_id", post_id)
    .order("created_at", { ascending: false });
  return NextResponse.json({ logs: data ?? [] });
}
