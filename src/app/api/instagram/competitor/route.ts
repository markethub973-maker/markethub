import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: profile } = await supabase
    .from("profiles")
    .select("instagram_access_token, instagram_user_id")
    .eq("id", user.id)
    .single();

  if (!profile?.instagram_access_token || !profile?.instagram_user_id) {
    return NextResponse.json({ error: "Instagram not connected" }, { status: 400 });
  }

  const username = req.nextUrl.searchParams.get("username")?.trim().replace("@", "");
  if (!username) return NextResponse.json({ error: "Username required" }, { status: 400 });

  const token = profile.instagram_access_token;
  const igId = profile.instagram_user_id;

  try {
    // Instagram Business Discovery API — allows looking up other business accounts
    const res = await fetch(
      `https://graph.facebook.com/v21.0/${igId}?fields=business_discovery.fields(id,username,name,biography,followers_count,media_count,profile_picture_url,website,media{id,caption,media_type,thumbnail_url,media_url,timestamp,like_count,comments_count,permalink})&username=${encodeURIComponent(username)}&access_token=${token}`
    );
    const data = await res.json();

    if (data.error) {
      if (data.error.code === 100) {
        return NextResponse.json({ error: `Contul @${username} nu a fost găsit sau nu este un cont Business/Creator.` }, { status: 404 });
      }
      return NextResponse.json({ error: data.error.message }, { status: 400 });
    }

    const bd = data.business_discovery;
    if (!bd) return NextResponse.json({ error: `@${username} nu este un cont Business Instagram.` }, { status: 404 });

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
        type: type === "VIDEO" ? "Video" : type === "CAROUSEL_ALBUM" ? "Carusel" : "Foto",
        count,
      })),
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
