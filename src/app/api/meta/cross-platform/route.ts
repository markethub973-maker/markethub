import { NextRequest, NextResponse } from "next/server";
import { resolveIGAuth } from "@/lib/adminPlatformToken";
import { createClient } from "@/lib/supabase/server";

interface PostMetric {
  platform: "instagram" | "facebook";
  id: string;
  date: string;
  caption: string;
  type: string;
  likes: number;
  comments: number;
  reach: number;
  impressions: number;
  engagement_rate: number;
  permalink?: string;
}

export async function GET(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const days = parseInt(req.nextUrl.searchParams.get("days") || "30");

  const auth = await resolveIGAuth();
  const { data: profile } = await supabase
    .from("profiles")
    .select("instagram_access_token")
    .eq("id", user.id)
    .single();

  const token = auth?.token || profile?.instagram_access_token || process.env.META_ACCESS_TOKEN;
  const igId = auth?.igId || process.env.INSTAGRAM_ACCOUNT_ID;

  if (!token) return NextResponse.json({ error: "Meta not connected" }, { status: 401 });

  const since = Math.floor((Date.now() - days * 86400 * 1000) / 1000);

  try {
    const [igRes, fbRes] = await Promise.allSettled([
      // Instagram posts
      igId ? fetch(
        `https://graph.facebook.com/v21.0/${igId}/media?fields=id,caption,media_type,timestamp,like_count,comments_count,permalink&limit=50&access_token=${token}`
      ).then(r => r.json()) : Promise.resolve({ data: [] }),

      // Facebook page posts
      fetch(
        `https://graph.facebook.com/v21.0/me/posts?fields=id,message,story,created_time,likes.summary(true),comments.summary(true),permalink_url&since=${since}&limit=50&access_token=${token}`
      ).then(r => r.json()),
    ]);

    const igPosts: PostMetric[] = [];
    const fbPosts: PostMetric[] = [];

    if (igRes.status === "fulfilled" && igRes.value?.data) {
      const cutoff = Date.now() - days * 86400 * 1000;
      for (const p of igRes.value.data) {
        if (new Date(p.timestamp).getTime() < cutoff) continue;
        // Fetch reach for each IG post
        let reach = 0;
        let impressions = 0;
        try {
          const insRes = await fetch(
            `https://graph.facebook.com/v21.0/${p.id}/insights?metric=reach,impressions&access_token=${token}`
          );
          const insData = await insRes.json();
          for (const item of insData.data || []) {
            if (item.name === "reach") reach = item.values?.[0]?.value || 0;
            if (item.name === "impressions") impressions = item.values?.[0]?.value || 0;
          }
        } catch { /* ignore */ }
        const likes = p.like_count || 0;
        const comments = p.comments_count || 0;
        const engBase = reach > 0 ? reach : 1;
        igPosts.push({
          platform: "instagram",
          id: p.id,
          date: p.timestamp,
          caption: (p.caption || "").substring(0, 120),
          type: p.media_type || "POST",
          likes,
          comments,
          reach,
          impressions,
          engagement_rate: parseFloat((((likes + comments) / engBase) * 100).toFixed(2)),
          permalink: p.permalink,
        });
      }
    }

    if (fbRes.status === "fulfilled" && fbRes.value?.data) {
      for (const p of fbRes.value.data) {
        const likes = p.likes?.summary?.total_count || 0;
        const comments = p.comments?.summary?.total_count || 0;
        fbPosts.push({
          platform: "facebook",
          id: p.id,
          date: p.created_time,
          caption: (p.message || p.story || "").substring(0, 120),
          type: "POST",
          likes,
          comments,
          reach: 0,
          impressions: 0,
          engagement_rate: 0,
          permalink: p.permalink_url,
        });
      }
    }

    // Summary stats
    const igAvgEng = igPosts.length
      ? parseFloat((igPosts.reduce((s, p) => s + p.engagement_rate, 0) / igPosts.length).toFixed(2))
      : 0;
    const igAvgLikes = igPosts.length
      ? Math.round(igPosts.reduce((s, p) => s + p.likes, 0) / igPosts.length)
      : 0;
    const igAvgComments = igPosts.length
      ? Math.round(igPosts.reduce((s, p) => s + p.comments, 0) / igPosts.length)
      : 0;
    const fbAvgLikes = fbPosts.length
      ? Math.round(fbPosts.reduce((s, p) => s + p.likes, 0) / fbPosts.length)
      : 0;
    const fbAvgComments = fbPosts.length
      ? Math.round(fbPosts.reduce((s, p) => s + p.comments, 0) / fbPosts.length)
      : 0;

    const winner = igAvgEng > 0 ? "instagram" : fbPosts.length > 0 ? "facebook" : null;

    return NextResponse.json({
      instagram: igPosts.slice(0, 20),
      facebook: fbPosts.slice(0, 20),
      summary: {
        days,
        ig_posts: igPosts.length,
        fb_posts: fbPosts.length,
        ig_avg_engagement: igAvgEng,
        ig_avg_likes: igAvgLikes,
        ig_avg_comments: igAvgComments,
        fb_avg_likes: fbAvgLikes,
        fb_avg_comments: fbAvgComments,
        winner,
      },
    });
  } catch (err) {
    console.error("[Cross-platform] Error:", err);
    return NextResponse.json({ error: "Failed to fetch cross-platform data" }, { status: 500 });
  }
}
