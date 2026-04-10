import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/route-helpers";
import { createServiceClient } from "@/lib/supabase/service";

// POST /api/calendar/publish — publish a scheduled post to its platform
export async function POST(req: NextRequest) {
  const auth = await requireAuth();
  if (!auth.ok) return auth.response;

  const { post_id } = await req.json();
  if (!post_id) return NextResponse.json({ error: "post_id required" }, { status: 400 });

  const supa = createServiceClient();
  const { data: post } = await supa
    .from("scheduled_posts")
    .select("*")
    .eq("id", post_id)
    .eq("user_id", auth.userId)
    .single();

  if (!post) return NextResponse.json({ error: "Post not found" }, { status: 404 });

  const platform = post.platform?.toLowerCase() ?? "";
  let result: { ok: boolean; external_id?: string; error?: string } = { ok: false, error: "Platform not supported for auto-publish" };

  // ── Facebook Page ────────────────────────────────────────────────────────
  if (platform === "facebook") {
    const { data: profile } = await supa.from("profiles").select("fb_page_id, fb_page_access_token").eq("id", auth.userId).single();

    if (!profile?.fb_page_id || !profile?.fb_page_access_token) {
      result = { ok: false, error: "Facebook Page not connected. Go to Settings → Integrations." };
    } else {
      const body: Record<string, string> = {
        message: post.content ?? "",
        access_token: profile.fb_page_access_token,
      };
      if (post.image_url) body.link = post.image_url;

      const fbRes = await fetch(`https://graph.facebook.com/v19.0/${profile.fb_page_id}/feed`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const fbData = await fbRes.json();
      if (fbData.id) result = { ok: true, external_id: fbData.id };
      else result = { ok: false, error: fbData.error?.message ?? "Facebook publish failed" };
    }
  }

  // ── LinkedIn ─────────────────────────────────────────────────────────────
  if (platform === "linkedin") {
    const { data: profile } = await supa.from("profiles").select("linkedin_access_token").eq("id", auth.userId).single();

    if (!profile?.linkedin_access_token) {
      result = { ok: false, error: "LinkedIn not connected. Go to Settings → Integrations." };
    } else {
      // Get LinkedIn user URN
      const meRes = await fetch("https://api.linkedin.com/v2/userinfo", {
        headers: { Authorization: `Bearer ${profile.linkedin_access_token}` },
      });
      const me = await meRes.json();
      const authorUrn = `urn:li:person:${me.sub}`;

      const ugcPost: any = {
        author: authorUrn,
        lifecycleState: "PUBLISHED",
        specificContent: {
          "com.linkedin.ugc.ShareContent": {
            shareCommentary: { text: post.content ?? "" },
            shareMediaCategory: "NONE",
          },
        },
        visibility: { "com.linkedin.ugc.MemberNetworkVisibility": "PUBLIC" },
      };

      if (post.image_url) {
        ugcPost.specificContent["com.linkedin.ugc.ShareContent"].shareMediaCategory = "IMAGE";
        ugcPost.specificContent["com.linkedin.ugc.ShareContent"].media = [{
          status: "READY",
          description: { text: post.content?.slice(0, 200) ?? "" },
          originalUrl: post.image_url,
          title: { text: "" },
        }];
      }

      const liRes = await fetch("https://api.linkedin.com/v2/ugcPosts", {
        method: "POST",
        headers: { Authorization: `Bearer ${profile.linkedin_access_token}`, "Content-Type": "application/json", "X-Restli-Protocol-Version": "2.0.0" },
        body: JSON.stringify(ugcPost),
      });
      const liData = await liRes.json();
      if (liRes.ok) result = { ok: true, external_id: liData.id };
      else result = { ok: false, error: liData.message ?? "LinkedIn publish failed" };
    }
  }

  // ── Instagram (existing) ─────────────────────────────────────────────────
  if (platform === "instagram") {
    result = { ok: false, error: "Instagram auto-publish handled separately via auto-post cron." };
  }

  // Log result
  await supa.from("publish_log").insert({
    post_id,
    platform,
    status: result.ok ? "success" : "failed",
    external_id: result.external_id ?? null,
    error_msg: result.error ?? null,
  });

  // Update post status
  if (result.ok) {
    await supa.from("scheduled_posts").update({ published_at: new Date().toISOString(), post_result: result }).eq("id", post_id);
  }

  return NextResponse.json(result);
}

// GET /api/calendar/publish — get publish log for a post
export async function GET(req: NextRequest) {
  const auth = await requireAuth();
  if (!auth.ok) return auth.response;
  const post_id = req.nextUrl.searchParams.get("post_id");
  const supa = createServiceClient();
  const { data } = await supa.from("publish_log").select("*").eq("post_id", post_id ?? "").order("published_at", { ascending: false });
  return NextResponse.json({ logs: data ?? [] });
}
