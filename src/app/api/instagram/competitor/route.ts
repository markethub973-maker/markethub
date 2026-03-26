import { NextRequest, NextResponse } from "next/server";
import { resolveIGAuth } from "@/lib/adminPlatformToken";

export async function GET(req: NextRequest) {
  const auth = await resolveIGAuth();
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!auth.token || !auth.igId) return NextResponse.json({ error: "Instagram not connected" }, { status: 400 });

  const username = req.nextUrl.searchParams.get("username")?.trim().replace("@", "");
  if (!username) return NextResponse.json({ error: "Username required" }, { status: 400 });

  const { token, igId } = auth;

  try {
    const res = await fetch(
      `https://graph.facebook.com/v21.0/${igId}?fields=business_discovery.fields(id,username,name,biography,followers_count,media_count,profile_picture_url,website,media{id,caption,media_type,thumbnail_url,media_url,timestamp,like_count,comments_count,permalink})&username=${encodeURIComponent(username)}&access_token=${token}`
    );
    const data = await res.json();

    if (data.error) {
      if (data.error.code === 100) {
        return NextResponse.json({ error: `Account @${username} not found or not a Business/Creator account.` }, { status: 404 });
      }
      return NextResponse.json({ error: data.error.message }, { status: 400 });
    }

    const bd = data.business_discovery;
    if (!bd) return NextResponse.json({ error: `@${username} is not an Instagram Business account.` }, { status: 404 });

    const followers = bd.followers_count || 0;
    const posts: any[] = bd.media?.data || [];

    const postsWithEng = posts.map((p: any) => ({
      id: p.id,
      caption: p.caption || "",
      mediaType: p.media_type,
      thumbnail: p.thumbnail_url || p.media_url || "",
      timestamp: p.timestamp,
      likes: p.like_count || 0,
      comments: p.comments_count || 0,
      engagement: (p.like_count || 0) + (p.comments_count || 0),
      engRate: followers > 0 ? (((p.like_count || 0) + (p.comments_count || 0)) / followers) * 100 : 0,
      permalink: p.permalink,
    }));

    const avgEngRate = postsWithEng.length > 0
      ? postsWithEng.reduce((s, p) => s + p.engRate, 0) / postsWithEng.length : 0;

    const typeCount: Record<string, number> = {};
    postsWithEng.forEach(p => { typeCount[p.mediaType] = (typeCount[p.mediaType] || 0) + 1; });

    const topPosts = [...postsWithEng].sort((a, b) => b.engagement - a.engagement).slice(0, 6);

    return NextResponse.json({
      username: bd.username,
      name: bd.name,
      biography: bd.biography,
      followers,
      mediaCount: bd.media_count || 0,
      profilePicture: bd.profile_picture_url,
      website: bd.website,
      avgEngRate,
      topPosts,
      allPosts: postsWithEng,
      contentMix: Object.entries(typeCount).map(([type, count]) => ({
        type: type === "VIDEO" ? "Video" : type === "CAROUSEL_ALBUM" ? "Carousel" : "Photo",
        count,
      })),
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
