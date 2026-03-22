import { NextRequest, NextResponse } from "next/server";

const BASE = "https://www.googleapis.com/youtube/v3";

export async function GET(req: NextRequest) {
  const region = req.nextUrl.searchParams.get("region") || "RO";
  const key = process.env.YOUTUBE_API_KEY;
  if (!key) return NextResponse.json({ error: "YOUTUBE_API_KEY not set" }, { status: 500 });

  try {
    // Step 1: Trending videos for region
    const trendingRes = await fetch(
      `${BASE}/videos?part=snippet,statistics&chart=mostPopular&maxResults=20&regionCode=${region}&key=${key}`,
      { next: { revalidate: 3600 } }
    );
    const trendingData = await trendingRes.json();
    if (!trendingData.items) return NextResponse.json([]);

    // Step 2: Group by channelId
    const channelMap = new Map<string, { name: string; videos: number; trendViews: number; trendLikes: number; trendComments: number }>();
    for (const item of trendingData.items) {
      const cId: string = item.snippet.channelId;
      const views = parseInt(item.statistics?.viewCount || "0");
      const likes = parseInt(item.statistics?.likeCount || "0");
      const comments = parseInt(item.statistics?.commentCount || "0");
      const existing = channelMap.get(cId);
      if (existing) {
        existing.videos++;
        existing.trendViews += views;
        existing.trendLikes += likes;
        existing.trendComments += comments;
      } else {
        channelMap.set(cId, { name: item.snippet.channelTitle, videos: 1, trendViews: views, trendLikes: likes, trendComments: comments });
      }
    }

    // Step 3: Top 6 channels by trending views
    const topIds = [...channelMap.entries()]
      .sort((a, b) => b[1].trendViews - a[1].trendViews)
      .slice(0, 6)
      .map(([id]) => id);

    // Step 4: Fetch channel statistics + avatars
    const detailsRes = await fetch(
      `${BASE}/channels?part=snippet,statistics&id=${topIds.join(",")}&key=${key}`,
      { next: { revalidate: 3600 } }
    );
    const detailsData = await detailsRes.json();

    const channels = (detailsData.items || []).map((ch: any) => {
      const agg = channelMap.get(ch.id)!;
      const subscribers = parseInt(ch.statistics?.subscriberCount || "0");
      const totalViews = parseInt(ch.statistics?.viewCount || "0");
      const videoCount = parseInt(ch.statistics?.videoCount || "0");
      const er = agg.trendViews > 0
        ? Math.round(((agg.trendLikes + agg.trendComments) / agg.trendViews) * 1000) / 10
        : 0;

      return {
        id: ch.id,
        name: ch.snippet.title,
        platform: "youtube",
        avatar: ch.snippet.thumbnails?.high?.url || ch.snippet.thumbnails?.default?.url || "",
        subscribers,
        totalViews,
        videoCount,
        avgViews: videoCount > 0 ? Math.round(totalViews / videoCount) : 0,
        engagementRate: er,
        growthPercent: 0,
        category: "YouTube",
      };
    });

    return NextResponse.json(channels);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
