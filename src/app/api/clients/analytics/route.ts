import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const clientId = req.nextUrl.searchParams.get("id");
  if (!clientId) return NextResponse.json({ error: "Client ID required" }, { status: 400 });

  // Get client data (with token)
  const { data: client, error } = await supabase
    .from("client_accounts")
    .select("*")
    .eq("id", clientId)
    .eq("user_id", user.id)
    .single();

  if (error || !client) {
    return NextResponse.json({ error: "Client not found" }, { status: 404 });
  }

  const { instagram_user_id: igId, instagram_access_token: token } = client;

  try {
    // Fetch profile, insights, and media in parallel
    const [profileRes, insightsRes, mediaRes] = await Promise.all([
      fetch(
        `https://graph.facebook.com/v22.0/${igId}?fields=followers_count,follows_count,media_count,profile_picture_url,name,biography,website,username&access_token=${token}`
      ),
      fetch(
        `https://graph.facebook.com/v22.0/${igId}/insights?metric=reach,impressions,follower_count&period=day&since=${Math.floor(Date.now() / 1000) - 30 * 86400}&until=${Math.floor(Date.now() / 1000)}&access_token=${token}`
      ),
      fetch(
        `https://graph.facebook.com/v22.0/${igId}/media?fields=id,caption,media_type,thumbnail_url,media_url,timestamp,like_count,comments_count,permalink&limit=12&access_token=${token}`
      ),
    ]);

    if (!profileRes.ok) {
      return NextResponse.json({ error: `Instagram API error for ${client.client_name}` }, { status: 502 });
    }

    const [profileData, insightsData, mediaData] = await Promise.all([
      profileRes.json(),
      insightsRes.json(),
      mediaRes.json(),
    ]);

    if (profileData.error) {
      return NextResponse.json({
        error: `Invalid token for ${client.client_name}: ${profileData.error.message}`,
      }, { status: 400 });
    }

    // Calculate engagement from recent posts
    const posts = mediaData.error ? [] : (mediaData.data || []);
    const totalEngagement = posts.reduce(
      (sum: number, p: any) => sum + (p.like_count || 0) + (p.comments_count || 0), 0
    );
    const engagementRate = posts.length > 0 && profileData.followers_count > 0
      ? ((totalEngagement / posts.length) / profileData.followers_count) * 100
      : 0;

    // Parse insights
    const insights = insightsData.error ? [] : (insightsData.data || []);
    const reachData = insights.find((i: any) => i.name === "reach");
    const impressionsData = insights.find((i: any) => i.name === "impressions");
    const followerData = insights.find((i: any) => i.name === "follower_count");

    const totalReach = (reachData?.values || []).reduce((s: number, v: any) => s + (v.value || 0), 0);
    const totalImpressions = (impressionsData?.values || []).reduce((s: number, v: any) => s + (v.value || 0), 0);

    // Follower growth (first vs last day)
    const followerValues = (followerData?.values || []).map((v: any) => v.value || 0);
    const followerGrowth = followerValues.length >= 2
      ? followerValues[followerValues.length - 1] - followerValues[0]
      : 0;

    // Best performing post
    const bestPost = posts.length > 0
      ? posts.reduce((best: any, p: any) => {
          const eng = (p.like_count || 0) + (p.comments_count || 0);
          const bestEng = (best.like_count || 0) + (best.comments_count || 0);
          return eng > bestEng ? p : best;
        })
      : null;

    return NextResponse.json({
      clientId: client.id,
      clientName: client.client_name,
      profile: {
        username: profileData.username || client.instagram_username,
        name: profileData.name,
        followers: profileData.followers_count,
        following: profileData.follows_count,
        posts: profileData.media_count,
        picture: profileData.profile_picture_url,
        bio: profileData.biography,
        website: profileData.website,
      },
      metrics: {
        engagementRate: Math.round(engagementRate * 100) / 100,
        reach30d: totalReach,
        impressions30d: totalImpressions,
        followerGrowth,
      },
      recentPosts: posts.slice(0, 6).map((p: any) => ({
        id: p.id,
        caption: p.caption?.substring(0, 120) || "",
        type: p.media_type,
        thumbnail: p.thumbnail_url || p.media_url,
        likes: p.like_count || 0,
        comments: p.comments_count || 0,
        date: p.timestamp,
        permalink: p.permalink,
      })),
      bestPost: bestPost ? {
        caption: bestPost.caption?.substring(0, 120) || "",
        likes: bestPost.like_count || 0,
        comments: bestPost.comments_count || 0,
        permalink: bestPost.permalink,
        date: bestPost.timestamp,
      } : null,
      dailyReach: (reachData?.values || []).slice(-14).map((v: any) => ({
        date: v.end_time,
        value: v.value || 0,
      })),
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
