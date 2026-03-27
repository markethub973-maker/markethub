import { NextRequest, NextResponse } from "next/server";

const BASE = "https://www.googleapis.com/youtube/v3";
const DEFAULT_REGIONS = ["RO", "US", "GB", "DE"];

/**
 * YouTube Multi-Regional Trending
 * Fetches top trending videos for multiple countries simultaneously
 * GET ?regions=RO,US,GB,DE&max=10
 */
export async function GET(req: NextRequest) {
  const key = process.env.YOUTUBE_API_KEY;
  if (!key) return NextResponse.json({ error: "YOUTUBE_API_KEY not set" }, { status: 500 });

  const regionsParam = req.nextUrl.searchParams.get("regions") || DEFAULT_REGIONS.join(",");
  const regions = regionsParam.split(",").map(r => r.trim().toUpperCase()).slice(0, 6);
  const max = Math.min(parseInt(req.nextUrl.searchParams.get("max") || "10"), 20);

  const results = await Promise.allSettled(
    regions.map(async (region) => {
      const res = await fetch(
        `${BASE}/videos?part=snippet,statistics&chart=mostPopular&maxResults=${max}&regionCode=${region}&key=${key}`,
        { next: { revalidate: 3600 } }
      );
      const data = await res.json();
      if (data.error) throw new Error(data.error.message);
      const videos = (data.items || []).map((item: { id: string; snippet: { title: string; channelTitle: string; thumbnails: { medium: { url: string } }; publishedAt: string; categoryId: string }; statistics: { viewCount: string; likeCount: string; commentCount: string } }) => ({
        id: item.id,
        title: item.snippet?.title || "",
        channel: item.snippet?.channelTitle || "",
        thumbnail: item.snippet?.thumbnails?.medium?.url || "",
        views: parseInt(item.statistics?.viewCount || "0"),
        likes: parseInt(item.statistics?.likeCount || "0"),
        comments: parseInt(item.statistics?.commentCount || "0"),
        published_at: item.snippet?.publishedAt || "",
        category_id: item.snippet?.categoryId || "",
        url: `https://www.youtube.com/watch?v=${item.id}`,
      }));
      return { region, videos, fetched_at: new Date().toISOString() };
    })
  );

  const regionData: Record<string, unknown> = {};
  for (let i = 0; i < regions.length; i++) {
    const r = results[i];
    regionData[regions[i]] = r.status === "fulfilled"
      ? r.value
      : { region: regions[i], videos: [], error: (r.reason as Error)?.message };
  }

  return NextResponse.json({
    regions: regionData,
    requested_regions: regions,
    max_per_region: max,
  });
}
