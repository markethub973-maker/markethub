import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { requireAuth } from "@/lib/route-helpers";

const RAPIDAPI_HOST = "instagram-public-bulk-scraper.p.rapidapi.com";

/**
 * Instagram Profile Search via RapidAPI
 * Uses Instagram Public Bulk Scraper API (BASIC plan)
 */
export async function GET(req: NextRequest) {
  const auth = await requireAuth();
  if (!auth.ok) return auth.response;
  const user = { id: auth.userId };

  const username = req.nextUrl.searchParams.get("username")?.trim().replace(/^@/, "");
  if (!username) return NextResponse.json({ error: "Username is required" }, { status: 400 });

  const apiKey = process.env.RAPIDAPI_KEY;
  if (!apiKey) {
    console.error("[Instagram Search] RAPIDAPI_KEY not set");
    return NextResponse.json({ error: "API configuration error" }, { status: 500 });
  }

  try {
    const res = await fetch(
      `https://${RAPIDAPI_HOST}/v1/user_info_web?username=${encodeURIComponent(username)}`,
      {
        method: "GET",
        headers: {
          "x-rapidapi-host": RAPIDAPI_HOST,
          "x-rapidapi-key": apiKey,
          "Accept": "application/json",
        },
      }
    );

    if (!res.ok) {
      const errorText = await res.text();
      console.error(`[Instagram Search] RapidAPI error: ${res.status} - ${errorText}`);

      if (res.status === 403 || res.status === 401) {
        return NextResponse.json({
          error: "Instagram search unavailable",
          message: "RapidAPI subscription issue. Please check your subscription status.",
          status: "subscription_error",
        }, { status: 402 });
      }

      if (res.status === 429) {
        return NextResponse.json({
          error: "Rate limit exceeded",
          message: "Too many requests. Please try again in a moment.",
        }, { status: 429 });
      }

      return NextResponse.json({
        error: "Failed to fetch Instagram data",
        message: `API returned status ${res.status}`,
      }, { status: 502 });
    }

    const data = await res.json();

    // Extract user data from RapidAPI response
    const userData = data?.data?.user || data?.data || data?.user || data;

    if (!userData || (!userData.username && !userData.full_name)) {
      return NextResponse.json({
        error: "User not found",
        message: `Instagram profile @${username} was not found or is not available.`,
      }, { status: 404 });
    }

    // Map RapidAPI response to our format
    const profile = {
      username: userData.username || username,
      fullName: userData.full_name || "",
      biography: userData.biography || "",
      avatar: userData.profile_pic_url || userData.profile_pic_url_hd || "",
      followers: userData.follower_count || userData.edge_followed_by?.count || 0,
      following: userData.following_count || userData.edge_follow?.count || 0,
      postsCount: userData.media_count || userData.edge_owner_to_timeline_media?.count || 0,
      isVerified: userData.is_verified || false,
      isPrivate: userData.is_private || false,
      externalUrl: userData.external_url || null,
      category: userData.category_name || userData.category || null,
    };

    // Calculate engagement rate if we have posts data
    let engagementRate = 0;
    const recentPosts = userData.edge_owner_to_timeline_media?.edges || [];
    if (recentPosts.length > 0 && profile.followers > 0) {
      const totalEngagement = recentPosts.reduce((sum: number, edge: any) => {
        const node = edge.node || edge;
        const likes = node.edge_liked_by?.count || node.like_count || 0;
        const comments = node.edge_media_to_comment?.count || node.comment_count || 0;
        return sum + likes + comments;
      }, 0);
      engagementRate = Number(((totalEngagement / recentPosts.length / profile.followers) * 100).toFixed(2));
    }

    // Extract recent posts
    const posts = recentPosts.slice(0, 12).map((edge: any) => {
      const node = edge.node || edge;
      return {
        id: node.id || node.pk,
        shortcode: node.shortcode,
        thumbnail: node.thumbnail_src || node.display_url || node.thumbnail_url,
        caption: node.edge_media_to_caption?.edges?.[0]?.node?.text || node.caption?.text || "",
        likes: node.edge_liked_by?.count || node.like_count || 0,
        comments: node.edge_media_to_comment?.count || node.comment_count || 0,
        timestamp: node.taken_at_timestamp || node.taken_at,
        isVideo: node.is_video || false,
        videoViews: node.video_view_count || 0,
      };
    });

    return NextResponse.json({
      profile,
      engagementRate,
      posts,
      source: "rapidapi",
    });

  } catch (err: any) {
    console.error("[Instagram Search] Error:", err.message);
    return NextResponse.json(
      { error: err.message, type: "system_error" },
      { status: 500 }
    );
  }
}
