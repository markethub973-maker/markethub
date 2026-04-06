import { NextResponse } from "next/server";
import { resolveIGAuth } from "@/lib/adminPlatformToken";
import { resolveIGToken } from "@/lib/igToken";

export async function GET() {
  const auth = await resolveIGAuth();

  if (!auth) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!auth.token || !auth.igId) {
    return NextResponse.json({ error: "Instagram not connected" }, { status: 400 });
  }

  const { token: rawToken, igId, username } = auth;

  try {
    const token = await resolveIGToken(rawToken, igId);

    const profileRes = await fetch(
      `https://graph.facebook.com/v22.0/${igId}?fields=followers_count,media_count,profile_picture_url,name,biography,website&access_token=${token}`
    );
    const profileData = await profileRes.json();

    if (profileData.error) {
      return NextResponse.json({ error: profileData.error.message, code: profileData.error.code }, { status: 400 });
    }

    const insightsRes = await fetch(
      `https://graph.facebook.com/v22.0/${igId}/insights?metric=reach,impressions&period=day&since=${Math.floor(Date.now() / 1000) - 30 * 86400}&until=${Math.floor(Date.now() / 1000)}&access_token=${token}`
    );
    const insightsData = await insightsRes.json();

    const mediaRes = await fetch(
      `https://graph.facebook.com/v22.0/${igId}/media?fields=id,caption,media_type,thumbnail_url,media_url,timestamp,like_count,comments_count,permalink&limit=12&access_token=${token}`
    );
    const mediaData = await mediaRes.json();

    return NextResponse.json({
      username,
      followers_count: profileData.followers_count,
      media_count: profileData.media_count,
      name: profileData.name,
      biography: profileData.biography,
      website: profileData.website,
      profile_picture_url: profileData.profile_picture_url,
      insights: insightsData.error ? [] : (insightsData.data || []),
      media: mediaData.error ? [] : (mediaData.data || []),
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
