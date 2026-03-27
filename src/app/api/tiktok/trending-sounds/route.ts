import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// RapidAPI: tiktok-trend-analysis-api — sounds endpoint
const RAPIDAPI_HOST = "tiktok-trend-analysis-api.p.rapidapi.com";

export async function GET(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const apiKey = process.env.RAPIDAPI_KEY;
  if (!apiKey) return NextResponse.json({ error: "RapidAPI key not configured" }, { status: 500 });

  const region = req.nextUrl.searchParams.get("region") || "US";
  const count = req.nextUrl.searchParams.get("count") || "20";

  try {
    const res = await fetch(
      `https://${RAPIDAPI_HOST}/api/trending/sounds?region=${region}&count=${count}`,
      {
        headers: {
          "x-rapidapi-host": RAPIDAPI_HOST,
          "x-rapidapi-key": apiKey,
        },
        next: { revalidate: 1800 }, // 30-min cache
      }
    );

    if (!res.ok) {
      const text = await res.text();
      console.error("[TikTok Sounds] API error:", res.status, text);
      return NextResponse.json({ error: "TikTok sounds API unavailable", sounds: [] }, { status: 200 });
    }

    const data = await res.json();
    const sounds = (data?.data || data?.sounds || []).map((s: Record<string, unknown>) => ({
      id: s.id || s.sound_id || "",
      title: s.title || s.name || "Unknown",
      author: s.author || s.author_name || "",
      duration: s.duration || 0,
      uses: s.uses || s.video_count || 0,
      cover: s.cover || s.album_thumb || null,
      tiktok_url: s.tiktok_url || `https://www.tiktok.com/music/${s.id || ""}`,
      trend: s.trend || "rising",
    }));

    return NextResponse.json({ sounds, region, count: sounds.length });
  } catch (err) {
    console.error("[TikTok Sounds] Error:", err);
    return NextResponse.json({ sounds: [], error: "Failed to fetch trending sounds" }, { status: 200 });
  }
}
