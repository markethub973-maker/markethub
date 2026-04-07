import { NextResponse } from "next/server";
import { renderToBuffer } from "@react-pdf/renderer";
import { createElement } from "react";
import { MarketingReportPDF, MarketingReportData } from "@/lib/marketingReportPDF";
import { createClient } from "@/lib/supabase/server";

function fmtNum(n: number) {
  if (n >= 1000000) return (n / 1000000).toFixed(1) + "M";
  if (n >= 1000) return (n / 1000).toFixed(1) + "K";
  return String(n);
}

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: profile } = await supabase
    .from("profiles")
    .select("instagram_access_token, instagram_user_id, instagram_username, name")
    .eq("id", user.id)
    .single();

  if (!profile?.instagram_access_token || !profile?.instagram_user_id) {
    return NextResponse.json({ error: "Instagram not connected" }, { status: 400 });
  }

  const token = profile.instagram_access_token;
  const igId = profile.instagram_user_id;
  const clientName = profile.name || profile.instagram_username || "Client";

  try {
    // Fetch IG profile + insights + media in parallel
    const [profileRes, insightsRes, mediaRes, fbRes] = await Promise.all([
      fetch(`https://graph.facebook.com/v22.0/${igId}?fields=followers_count,media_count,profile_picture_url,name,biography,website,username&access_token=${token}`),
      fetch(`https://graph.facebook.com/v22.0/${igId}/insights?metric=reach,impressions&period=day&since=${Math.floor(Date.now() / 1000) - 30 * 86400}&until=${Math.floor(Date.now() / 1000)}&access_token=${token}`),
      fetch(`https://graph.facebook.com/v22.0/${igId}/media?fields=id,caption,media_type,thumbnail_url,media_url,timestamp,like_count,comments_count,permalink&limit=20&access_token=${token}`),
      fetch(`https://graph.facebook.com/v22.0/me/accounts?fields=id,name,fan_count,followers_count&access_token=${token}`),
    ]);

    const [igProfile, igInsights, igMedia, fbAccounts] = await Promise.all([
      profileRes.json(), insightsRes.json(), mediaRes.json(), fbRes.json(),
    ]);

    const followers = igProfile.followers_count || 0;
    const posts: any[] = igMedia.data || [];

    // Compute metrics
    const postsWithEng = posts.map(p => ({
      ...p,
      engagement: (p.like_count || 0) + (p.comments_count || 0),
      engRate: followers > 0 ? (((p.like_count || 0) + (p.comments_count || 0)) / followers) * 100 : 0,
      dayOfWeek: new Date(p.timestamp).toLocaleDateString("en-US", { weekday: "short" }),
    }));

    const topPosts = [...postsWithEng].sort((a, b) => b.engagement - a.engagement).slice(0, 8);
    const avgEngRate = postsWithEng.length > 0
      ? postsWithEng.reduce((s, p) => s + p.engRate, 0) / postsWithEng.length : 0;

    const reachSeries = (igInsights.data || []).find((m: any) => m.name === "reach")?.values || [];
    const impSeries = (igInsights.data || []).find((m: any) => m.name === "impressions")?.values || [];
    const totalReach = reachSeries.reduce((s: number, pt: any) => s + (pt.value || 0), 0);
    const totalImpressions = impSeries.reduce((s: number, pt: any) => s + (pt.value || 0), 0);

    const dayEng: Record<string, { total: number; count: number }> = {};
    postsWithEng.forEach(p => {
      dayEng[p.dayOfWeek] = dayEng[p.dayOfWeek] || { total: 0, count: 0 };
      dayEng[p.dayOfWeek].total += p.engRate;
      dayEng[p.dayOfWeek].count += 1;
    });
    const bestDays = Object.entries(dayEng)
      .map(([day, d]) => ({ day, avg: d.total / d.count }))
      .sort((a, b) => b.avg - a.avg);

    const typeCount: Record<string, number> = {};
    postsWithEng.forEach(p => { typeCount[p.media_type] = (typeCount[p.media_type] || 0) + 1; });
    const contentMix = Object.entries(typeCount).map(([name, value]) => ({
      name: name === "VIDEO" ? "Video" : name === "CAROUSEL_ALBUM" ? "Carousel" : "Photo",
      value,
    }));

    const fbPage = fbAccounts.data?.[0];
    const period = `${new Date(Date.now() - 30 * 86400 * 1000).toLocaleDateString("en-US", { day: "2-digit", month: "long" })} — ${new Date().toLocaleDateString("en-US", { day: "2-digit", month: "long", year: "numeric" })}`;

    const recommendations = [
      {
        title: "Posting frequency",
        text: igProfile.media_count < 30
          ? `${igProfile.media_count} total posts. We recommend at least 4-5 posts/week to grow organic reach and keep your audience engaged.`
          : `Current posting frequency is solid. Keep the consistency and experiment with different publishing times for optimization.`,
      },
      {
        title: "Engagement Rate",
        text: avgEngRate >= 3
          ? `Engagement rate of ${avgEngRate.toFixed(1)}% is excellent (industry average: 1-3%). Your account is active and the audience responds well to content. Ideal for influencer campaigns — you can command higher rates.`
          : `Engagement rate of ${avgEngRate.toFixed(1)}% is below the 3% benchmark. Recommendations: more interactive posts (polls in stories, questions in captions), behind-the-scenes content, and micro-influencer collaborations.`,
      },
      {
        title: "Recommended content type",
        text: contentMix.find(c => c.name === "Video")
          ? `You already have ${contentMix.find(c => c.name === "Video")?.value} videos — keep going! Reels generate 30-50% higher reach than photos. We recommend increasing video to 60% of total posts.`
          : `Your account uses mainly photos. Add Reels (15-30 sec) to benefit from Instagram's video algorithm boost. Recommended mix: 60% video, 30% carousel, 10% photo.`,
      },
      {
        title: "Organic reach strategy",
        text: totalReach > 0
          ? `Reach of ${fmtNum(totalReach)} in 30 days = ${((totalReach / followers) * 100).toFixed(0)}% of followers. ${totalReach / followers > 2 ? "The algorithm is actively promoting you — maintain content quality." : "Use 5-10 relevant hashtags per post, publish during peak hours (6PM-9PM), and respond to comments within the first hour."}`
          : `Enable Instagram Business Insights from the app to monitor reach and optimize your content strategy.`,
      },
    ];

    const reportData: MarketingReportData = {
      clientName,
      period,
      generatedAt: new Date().toLocaleDateString("en-US", { day: "2-digit", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit" }),
      instagram: {
        username: igProfile.username || profile.instagram_username || "",
        followers,
        mediaCount: igProfile.media_count || 0,
        biography: igProfile.biography,
        profilePicture: igProfile.profile_picture_url,
      },
      facebook: fbPage ? { name: fbPage.name, followers: fbPage.followers_count || fbPage.fan_count || 0 } : undefined,
      reach30: totalReach,
      impressions30: totalImpressions,
      avgEngRate,
      topPosts: topPosts.map(p => ({
        caption: p.caption,
        thumbnail: p.thumbnail_url || p.media_url,
        likes: p.like_count || 0,
        comments: p.comments_count || 0,
        engRate: p.engRate,
        mediaType: p.media_type,
        date: new Date(p.timestamp).toLocaleDateString("en-US", { day: "2-digit", month: "2-digit", year: "2-digit" }),
        permalink: p.permalink,
      })),
      bestDays,
      contentMix,
      recommendations,
    };

    const element = createElement(MarketingReportPDF, { data: reportData });
    const buffer = await renderToBuffer(element as any);
    const filename = `MarketHub-Report-${clientName.replace(/\s+/g, "-")}-${new Date().toLocaleDateString("en-US", { month: "2-digit", year: "numeric" }).replace("/", "-")}.pdf`;

    return new NextResponse(buffer as unknown as BodyInit, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Content-Length": buffer.length.toString(),
      },
    });
  } catch (err: any) {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
