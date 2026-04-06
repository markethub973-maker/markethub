import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { safeApify } from "@/lib/serviceGuard";

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  
  if (!process.env.APIFY_TOKEN) return NextResponse.json({ error: "Apify not configured", degraded: true }, { status: 503 });

  const { username, hashtag, limit = 15 } = await req.json();
  if (!username && !hashtag) return NextResponse.json({ error: "username or hashtag required" }, { status: 400 });

  const input: Record<string, unknown> = {
    resultsPerPage: Math.min(limit, 30),
    shouldDownloadVideos: false,
    shouldDownloadCovers: false,
  };

  if (username) {
    input.profiles = [username.replace(/^@/, "")];
  } else {
    input.hashtags = [hashtag.replace(/^#/, "")];
  }

  const result = await safeApify<any[]>("clockworks~tiktok-scraper", input, { timeoutSec: 90, retries: 1 });

  if (!result.ok) {
    return NextResponse.json({ error: result.error, service: "apify", degraded: true }, { status: 503 });
  }

  try {
    const data = result.data || [];
    const videos = (data || []).map((v: any) => ({
      id: v.id,
      url: `https://www.tiktok.com/@${v.authorMeta?.name || ""}/ video/${v.id}`,
      description: v.text?.slice(0, 200),
      cover: v.covers?.default || v.covers?.origin,
      author: v.authorMeta?.name,
      authorNickname: v.authorMeta?.nickName,
      authorFollowers: v.authorMeta?.fans,
      authorVerified: v.authorMeta?.verified,
      plays: v.playCount || 0,
      likes: v.diggCount || 0,
      comments: v.commentCount || 0,
      shares: v.shareCount || 0,
      duration: v.videoMeta?.duration,
      createTime: v.createTime,
      hashtags: v.hashtags?.map((h: any) => h.name)?.slice(0, 8),
      music: v.musicMeta ? {
        name: v.musicMeta.musicName,
        author: v.musicMeta.musicAuthor,
      } : null,
    }));

    return NextResponse.json({ videos, total: videos.length, mode: username ? "profile" : "hashtag" });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
