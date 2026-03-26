import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

const RAPIDAPI_HOST = "tiktok-trend-analysis-api.p.rapidapi.com";

export async function GET(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const apiKey = process.env.RAPIDAPI_KEY;
  if (!apiKey) return NextResponse.json({ error: "RapidAPI key not configured" }, { status: 500 });

  const query = req.nextUrl.searchParams.get("q")?.trim() || "";
  const count = req.nextUrl.searchParams.get("count") || "20";

  if (!query) return NextResponse.json({ error: "Search query required" }, { status: 400 });

  try {
    const res = await fetch(
      `https://${RAPIDAPI_HOST}/api/search?query=${encodeURIComponent(query)}&count=${count}`,
      {
        headers: {
          "x-rapidapi-host": RAPIDAPI_HOST,
          "x-rapidapi-key": apiKey,
        },
      }
    );

    const data = await res.json();

    if (!data.success) {
      return NextResponse.json({ error: data.error || "TikTok API error" }, { status: 400 });
    }

    const result = data.data || {};

    return NextResponse.json({
      query: result.query || query,
      videos: (result.videos || []).map((v: any) => ({
        id: v.id,
        url: v.url,
        cover: v.cover || null,
        author: v.author || "unknown",
        desc: v.desc || v.description || null,
        plays: v.plays || v.playCount || 0,
        likes: v.likes || v.diggCount || 0,
        comments: v.comments || v.commentCount || 0,
        shares: v.shares || v.shareCount || 0,
        duration: v.duration || 0,
        createTime: v.createTime || null,
      })),
      users: (result.users || []).map((u: any) => ({
        uniqueId: u.uniqueId || u.username,
        nickname: u.nickname,
        avatar: u.avatarThumb || u.avatar || null,
        followers: u.followerCount || u.fans || 0,
        following: u.followingCount || 0,
        likes: u.heartCount || u.heart || 0,
        videos: u.videoCount || 0,
        verified: u.verified || false,
        bio: u.signature || u.bio || null,
      })),
      hashtags: (result.hashtags || []).map((h: any) => ({
        name: h.name || h.title,
        views: h.views || h.viewCount || 0,
        videos: h.videoCount || 0,
      })),
      totalVideos: result.totalVideos || 0,
      totalUsers: result.totalUsers || 0,
    });
  } catch (err: any) {
    console.error("[TikTok API] Error:", err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
