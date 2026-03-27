import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

const RAPIDAPI_HOST = "tiktok-trend-analysis-api.p.rapidapi.com";

export async function GET(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const apiKey = process.env.RAPIDAPI_KEY;
  if (!apiKey) return NextResponse.json({ error: "RapidAPI key not configured" }, { status: 500 });

  const region = req.nextUrl.searchParams.get("region") || "US";

  try {
    const res = await fetch(
      `https://${RAPIDAPI_HOST}/api/trending/categories?region=${region}`,
      {
        headers: {
          "x-rapidapi-host": RAPIDAPI_HOST,
          "x-rapidapi-key": apiKey,
        },
        next: { revalidate: 3600 }, // 1-hour cache
      }
    );

    if (!res.ok) {
      const text = await res.text();
      console.error("[TikTok Categories] API error:", res.status, text);
      return NextResponse.json({ categories: [], error: "Categories API unavailable" }, { status: 200 });
    }

    const data = await res.json();
    const categories = (data?.data || data?.categories || []).map((c: Record<string, unknown>) => ({
      id: c.id || "",
      name: c.name || c.category || "Unknown",
      video_count: c.video_count || c.count || 0,
      growth_pct: c.growth_pct || c.growth || 0,
      top_hashtags: c.top_hashtags || c.hashtags || [],
      cover: c.cover || null,
    }));

    return NextResponse.json({ categories, region });
  } catch (err) {
    console.error("[TikTok Categories] Error:", err);
    return NextResponse.json({ categories: [], error: "Failed to fetch categories" }, { status: 200 });
  }
}
