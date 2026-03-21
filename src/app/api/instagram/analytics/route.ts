import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("instagram_access_token, instagram_user_id, instagram_username")
    .eq("id", user.id)
    .single();

  if (!profile?.instagram_access_token || !profile?.instagram_user_id) {
    return NextResponse.json({ error: "Instagram not connected" }, { status: 400 });
  }

  const { instagram_access_token: token, instagram_user_id: igId, instagram_username: username } = profile;

  try {
    // Get profile stats
    const profileRes = await fetch(
      `https://graph.facebook.com/v21.0/${igId}?fields=followers_count,media_count,profile_picture_url,name,biography,website&access_token=${token}`
    );
    const profileData = await profileRes.json();

    if (profileData.error) {
      return NextResponse.json({ error: profileData.error.message }, { status: 400 });
    }

    // Get insights (reach, impressions - last 30 days)
    const insightsRes = await fetch(
      `https://graph.facebook.com/v21.0/${igId}/insights?metric=reach,impressions,profile_views&period=day&since=${Math.floor(Date.now() / 1000) - 30 * 86400}&until=${Math.floor(Date.now() / 1000)}&access_token=${token}`
    );
    const insightsData = await insightsRes.json();

    // Get recent media
    const mediaRes = await fetch(
      `https://graph.facebook.com/v21.0/${igId}/media?fields=id,caption,media_type,thumbnail_url,media_url,timestamp,like_count,comments_count,permalink&limit=12&access_token=${token}`
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
      insights: insightsData.data || [],
      media: mediaData.data || [],
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
