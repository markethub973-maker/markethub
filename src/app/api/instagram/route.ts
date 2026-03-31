import { NextResponse } from "next/server";
import { resolveIGAuth } from "@/lib/adminPlatformToken";
import { resolveIGToken } from "@/lib/igToken";

export async function GET() {
  const auth = await resolveIGAuth();

  if (!auth) {
    return NextResponse.json({ error: "Instagram not configured" }, { status: 500 });
  }

  if (!auth.token || !auth.igId) {
    return NextResponse.json({ error: "Instagram not configured" }, { status: 500 });
  }

  const { token: rawToken, igId } = auth;

  try {
    const token = await resolveIGToken(rawToken, igId);

    const profileRes = await fetch(
      `https://graph.facebook.com/v25.0/${igId}?fields=id,name,username,biography,followers_count,follows_count,media_count,profile_picture_url,website&access_token=${token}`
    );
    if (!profileRes.ok) {
      return NextResponse.json({ error: "Failed to fetch Instagram profile" }, { status: 502 });
    }
    const profile = await profileRes.json();

    if (profile.error) {
      return NextResponse.json({ error: profile.error.message }, { status: 400 });
    }

    const mediaRes = await fetch(
      `https://graph.facebook.com/v25.0/${igId}/media?fields=id,caption,media_type,media_url,thumbnail_url,timestamp,like_count,comments_count,permalink&limit=12&access_token=${token}`
    );
    if (!mediaRes.ok) {
      return NextResponse.json({ error: "Failed to fetch Instagram media" }, { status: 502 });
    }
    const media = await mediaRes.json();

    const insightsRes = await fetch(
      `https://graph.facebook.com/v25.0/${igId}/insights?metric=impressions,reach,profile_views,follower_count&period=day&access_token=${token}`
    );
    if (!insightsRes.ok) {
      return NextResponse.json({ error: "Failed to fetch Instagram insights" }, { status: 502 });
    }
    const insights = await insightsRes.json();

    return NextResponse.json({
      profile,
      media: media.data || [],
      insights: insights.data || [],
    });
  } catch (error) {
    console.error("Instagram API error:", error);
    return NextResponse.json({ error: "Failed to fetch Instagram data" }, { status: 500 });
  }
}
