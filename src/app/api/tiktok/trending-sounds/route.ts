import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { requireAuth } from "@/lib/route-helpers";

const RAPIDAPI_HOST = "tiktok-trend-analysis-api.p.rapidapi.com";

const REGION_QUERIES: Record<string, string> = {
  US: "viral music trending 2025",
  GB: "viral music UK trending",
  RO: "muzica trending Romania",
  DE: "viral musik trending Deutschland",
  FR: "musique tendance viral France",
};

export async function GET(req: NextRequest) {
  const auth = await requireAuth();
  if (!auth.ok) return auth.response;
  const user = { id: auth.userId };

  const apiKey = process.env.RAPIDAPI_KEY;
  if (!apiKey) return NextResponse.json({ error: "RapidAPI key not configured" }, { status: 500 });

  const region = req.nextUrl.searchParams.get("region") || "US";
  const count = parseInt(req.nextUrl.searchParams.get("count") || "20");

  const headers = {
    "x-rapidapi-host": RAPIDAPI_HOST,
    "x-rapidapi-key": apiKey,
  };

  try {
    // 1. Try the native music/trending endpoint first
    const musicRes = await fetch(
      `https://${RAPIDAPI_HOST}/api/music/trending?region=${region}&count=${count}`,
      { headers, next: { revalidate: 1800 } }
    );

    if (musicRes.ok) {
      const musicData = await musicRes.json();
      const nativeSounds = musicData?.data?.music || [];

      if (nativeSounds.length > 0) {
        const sounds = nativeSounds.map((s: Record<string, unknown>) => ({
          id: String(s.id || s.sound_id || ""),
          title: String(s.title || s.name || "Unknown"),
          author: String(s.author || s.author_name || ""),
          duration: Number(s.duration) || 0,
          uses: Number(s.uses || s.video_count) || 0,
          cover: String(s.cover || s.album_thumb || ""),
          tiktok_url: String(s.tiktok_url || `https://www.tiktok.com/music/${s.id || ""}`),
          trend: "rising",
        }));
        return NextResponse.json({ sounds, region, count: sounds.length, source: "native" });
      }
    }

    // 2. Fallback: use search API to find music-related trending videos
    const query = REGION_QUERIES[region] || REGION_QUERIES.US;
    const searchRes = await fetch(
      `https://${RAPIDAPI_HOST}/api/search?query=${encodeURIComponent(query)}&count=${count}`,
      { headers, next: { revalidate: 1800 } }
    );

    if (!searchRes.ok) {
      return NextResponse.json({ sounds: [], region, count: 0, error: "API unavailable" }, { status: 200 });
    }

    const searchData = await searchRes.json();
    const videos = searchData?.data?.videos || [];

    if (videos.length === 0) {
      return NextResponse.json({ sounds: [], region, count: 0, error: "No data available" }, { status: 200 });
    }

    // Map trending videos → sounds format
    const sounds = videos.map((v: Record<string, unknown>, i: number) => ({
      id: String(v.id || i),
      title: String(v.desc || v.description || `Trending Sound #${i + 1}`).substring(0, 60),
      author: String(v.author || "TikTok Creator"),
      duration: Number(v.duration) || 0,
      uses: Number(v.plays || v.playCount) || 0,
      cover: String(v.cover || ""),
      tiktok_url: String(v.url || `https://www.tiktok.com/@${v.author || ""}`),
      trend: "trending",
    }));

    return NextResponse.json({ sounds, region, count: sounds.length, source: "search_fallback" });

  } catch (err) {
    console.error("[TikTok Sounds] Error:", err);
    return NextResponse.json({ sounds: [], region, count: 0, error: "Failed to fetch trending sounds" }, { status: 200 });
  }
}
