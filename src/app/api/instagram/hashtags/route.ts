import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { requireAuth } from "@/lib/route-helpers";

export async function GET(req: NextRequest) {
  const auth = await requireAuth();
  if (!auth.ok) return auth.response;
  const user = { id: auth.userId };
  const supabase = await createClient();

  const { data: profile } = await supabase
    .from("profiles")
    .select("instagram_access_token, instagram_user_id")
    .eq("id", auth.userId)
    .single();

  if (!profile?.instagram_access_token || !profile?.instagram_user_id) {
    return NextResponse.json({ error: "Instagram not connected" }, { status: 400 });
  }

  const token = profile.instagram_access_token;
  const igId = profile.instagram_user_id;
  const hashtag = req.nextUrl.searchParams.get("q")?.trim().replace(/#/g, "").toLowerCase();

  if (!hashtag) return NextResponse.json({ error: "Hashtag required" }, { status: 400 });

  try {
    // Step 1: Get hashtag ID
    const searchRes = await fetch(
      `https://graph.facebook.com/v22.0/ig_hashtag_search?user_id=${igId}&q=${encodeURIComponent(hashtag)}&access_token=${token}`
    );
    const searchData = await searchRes.json();

    if (searchData.error) {
      return NextResponse.json({ error: searchData.error.message }, { status: 400 });
    }

    const hashtagId = searchData.data?.[0]?.id;
    if (!hashtagId) {
      return NextResponse.json({ error: `Hashtag #${hashtag} not found.` }, { status: 404 });
    }

    // Step 2: Fetch top + recent media for hashtag in parallel
    const [topRes, recentRes, infoRes] = await Promise.all([
      fetch(
        `https://graph.facebook.com/v22.0/${hashtagId}/top_media?user_id=${igId}&fields=id,caption,media_type,media_url,thumbnail_url,timestamp,like_count,comments_count,permalink&limit=12&access_token=${token}`
      ),
      fetch(
        `https://graph.facebook.com/v22.0/${hashtagId}/recent_media?user_id=${igId}&fields=id,caption,media_type,media_url,thumbnail_url,timestamp,like_count,comments_count,permalink&limit=12&access_token=${token}`
      ),
      fetch(
        `https://graph.facebook.com/v22.0/${hashtagId}?fields=id,name&access_token=${token}`
      ),
    ]);

    const [topData, recentData, infoData] = await Promise.all([
      topRes.json(), recentRes.json(), infoRes.json(),
    ]);

    const mapPost = (p: any) => ({
      id: p.id,
      caption: p.caption || "",
      mediaType: p.media_type,
      thumbnail: p.thumbnail_url || p.media_url || "",
      timestamp: p.timestamp,
      likes: p.like_count || 0,
      comments: p.comments_count || 0,
      engagement: (p.like_count || 0) + (p.comments_count || 0),
      permalink: p.permalink,
    });

    const topPosts = (topData.data || []).map(mapPost);
    const recentPosts = (recentData.data || []).map(mapPost);

    // Avg engagement from top posts
    const avgLikes = topPosts.length > 0
      ? Math.round(topPosts.reduce((s: number, p: any) => s + p.likes, 0) / topPosts.length) : 0;
    const avgComments = topPosts.length > 0
      ? Math.round(topPosts.reduce((s: number, p: any) => s + p.comments, 0) / topPosts.length) : 0;

    return NextResponse.json({
      hashtag,
      hashtagId,
      topPosts,
      recentPosts,
      avgLikes,
      avgComments,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
