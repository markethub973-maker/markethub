import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { requireAuth } from "@/lib/route-helpers";

const BASE = "https://www.googleapis.com/youtube/v3";

/**
 * Fetch YouTube video categories for a region, then sample top videos per category.
 * GET /api/youtube/categories?channelId=xxx&regionCode=US
 *
 * Returns: { categories: Array<{ id, name, avgViews, avgLikes, avgComments, videoCount }> }
 */
export async function GET(req: NextRequest) {
  const auth = await requireAuth();
  if (!auth.ok) return auth.response;
  const user = { id: auth.userId };

  const key = process.env.YOUTUBE_API_KEY;
  if (!key) return NextResponse.json({ error: "YOUTUBE_API_KEY not set" }, { status: 500 });

  const channelId = req.nextUrl.searchParams.get("channelId");
  const regionCode = req.nextUrl.searchParams.get("regionCode") || "US";

  try {
    let videoItems: VideoItem[] = [];

    if (channelId) {
      // Fetch channel's own videos to categorize them
      const videosRes = await fetch(
        `${BASE}/search?part=snippet&channelId=${channelId}&type=video&maxResults=50&order=viewCount&key=${key}`,
        { next: { revalidate: 3600 } }
      );
      const videosData = await videosRes.json();
      const videoIds: string[] = (videosData.items || []).map((v: { id: { videoId: string } }) => v.id.videoId).filter(Boolean);

      if (videoIds.length > 0) {
        const statsRes = await fetch(
          `${BASE}/videos?part=snippet,statistics&id=${videoIds.join(",")}&key=${key}`,
          { next: { revalidate: 3600 } }
        );
        const statsData = await statsRes.json();
        videoItems = statsData.items || [];
      }
    } else {
      // Fallback: fetch trending videos for region
      const trendRes = await fetch(
        `${BASE}/videos?part=snippet,statistics&chart=mostPopular&regionCode=${regionCode}&maxResults=50&key=${key}`,
        { next: { revalidate: 3600 } }
      );
      const trendData = await trendRes.json();
      videoItems = trendData.items || [];
    }

    // Group by categoryId
    const catMap = new Map<string, { views: number[]; likes: number[]; comments: number[] }>();
    const catNames = new Map<string, string>();

    for (const item of videoItems) {
      const catId = item.snippet?.categoryId;
      if (!catId) continue;
      if (!catMap.has(catId)) catMap.set(catId, { views: [], likes: [], comments: [] });
      const g = catMap.get(catId)!;
      g.views.push(parseInt(item.statistics?.viewCount || "0"));
      g.likes.push(parseInt(item.statistics?.likeCount || "0"));
      g.comments.push(parseInt(item.statistics?.commentCount || "0"));
    }

    // Fetch category names
    if (catMap.size > 0) {
      const catRes = await fetch(
        `${BASE}/videoCategories?part=snippet&regionCode=${regionCode}&key=${key}`,
        { next: { revalidate: 86400 } }
      );
      const catData = await catRes.json();
      for (const c of (catData.items || [])) {
        catNames.set(c.id, c.snippet?.title || c.id);
      }
    }

    const avg = (arr: number[]) => arr.length ? Math.round(arr.reduce((a, b) => a + b, 0) / arr.length) : 0;

    const categories = Array.from(catMap.entries())
      .filter(([, g]) => g.views.length >= 2) // at least 2 videos
      .map(([id, g]) => ({
        id,
        name: catNames.get(id) || `Category ${id}`,
        videoCount: g.views.length,
        avgViews: avg(g.views),
        avgLikes: avg(g.likes),
        avgComments: avg(g.comments),
      }))
      .sort((a, b) => b.avgViews - a.avgViews);

    return NextResponse.json({ categories, regionCode, channelId: channelId || null });
  } catch (err) {
    console.error("[YouTube Categories] Error:", err);
    return NextResponse.json({ error: "Failed to fetch categories", categories: [] }, { status: 200 });
  }
}

interface VideoItem {
  snippet?: { categoryId?: string };
  statistics?: { viewCount?: string; likeCount?: string; commentCount?: string };
}
