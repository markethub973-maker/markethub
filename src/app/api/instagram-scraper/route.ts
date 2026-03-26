import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

const RAPIDAPI_HOST = "instagram-public-bulk-scraper.p.rapidapi.com";

export async function GET(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const apiKey = process.env.RAPIDAPI_KEY;
  if (!apiKey) return NextResponse.json({ error: "RapidAPI key not configured" }, { status: 500 });

  const username = req.nextUrl.searchParams.get("username")?.trim().replace(/^@/, "");
  if (!username) return NextResponse.json({ error: "Username is required" }, { status: 400 });

  try {
    console.log(`[Instagram Scraper] Fetching @${username} from RapidAPI...`);
    console.log(`[Instagram Scraper] API Key exists: ${!!apiKey}`);
    console.log(`[Instagram Scraper] API Key length: ${apiKey?.length}`);

    const res = await fetch(
      `https://${RAPIDAPI_HOST}/v1/user_info_web?username=${encodeURIComponent(username)}`,
      {
        headers: {
          "x-rapidapi-host": RAPIDAPI_HOST,
          "x-rapidapi-key": apiKey,
        },
      }
    );

    console.log(`[Instagram Scraper] RapidAPI Response Status: ${res.status}`);

    if (!res.ok) {
      const errorText = await res.text();
      console.error(`[Instagram Scraper] RapidAPI Error: ${errorText}`);
      return NextResponse.json({ error: `Instagram API returned ${res.status}`, details: errorText }, { status: res.status });
    }

    const raw = await res.json();
    console.log(`[Instagram Scraper] RapidAPI Response Keys: ${Object.keys(raw).join(', ')}`);
    if (raw.error || raw.errors) {
      console.error(`[Instagram Scraper] RapidAPI Error Response:`, raw);
    }

    if (!raw?.data) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const u = raw.data;

    // Calculate engagement rate from recent posts
    const recentPosts = u.edge_owner_to_timeline_media?.edges || [];
    let totalEngagement = 0;
    let postCount = 0;

    const posts = recentPosts.slice(0, 12).map((edge: any) => {
      const node = edge.node;
      const likes = node.edge_liked_by?.count || 0;
      const comments = node.edge_media_to_comment?.count || 0;
      totalEngagement += likes + comments;
      postCount++;

      return {
        id: node.id,
        shortcode: node.shortcode,
        thumbnail: node.thumbnail_src || node.display_url,
        isVideo: node.is_video,
        videoViews: node.video_view_count || 0,
        likes,
        comments,
        caption: node.edge_media_to_caption?.edges?.[0]?.node?.text || "",
        timestamp: node.taken_at_timestamp,
      };
    });

    const followers = u.edge_followed_by?.count || 0;
    const engagementRate = followers > 0 && postCount > 0
      ? ((totalEngagement / postCount) / followers * 100).toFixed(2)
      : "0";

    return NextResponse.json({
      profile: {
        username: u.username,
        fullName: u.full_name,
        biography: u.biography,
        avatar: u.profile_pic_url_hd || u.profile_pic_url,
        followers,
        following: u.edge_follow?.count || 0,
        postsCount: u.edge_owner_to_timeline_media?.count || 0,
        isVerified: u.is_verified,
        isPrivate: u.is_private,
        externalUrl: u.external_url,
        category: u.category_name || null,
      },
      engagementRate: parseFloat(engagementRate),
      posts,
    });
  } catch (err: any) {
    console.error("[Instagram Scraper] Error:", err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
