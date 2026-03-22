import { NextRequest, NextResponse } from "next/server";

const BASE = "https://www.googleapis.com/youtube/v3";

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get("q") || "";
  const max = parseInt(req.nextUrl.searchParams.get("max") || "8");
  const key = process.env.YOUTUBE_API_KEY;

  if (!key) return NextResponse.json({ error: "YOUTUBE_API_KEY not set" }, { status: 500 });
  if (!q.trim()) return NextResponse.json([]);

  try {
    const searchRes = await fetch(
      `${BASE}/search?part=snippet&q=${encodeURIComponent(q)}&type=channel&maxResults=${max}&key=${key}`,
      { next: { revalidate: 1800 } }
    );
    const searchData = await searchRes.json();

    if (searchData.error) return NextResponse.json({ error: searchData.error.message }, { status: 400 });
    if (!searchData.items?.length) return NextResponse.json([]);

    const channelIds = searchData.items.map((i: any) => i.id.channelId).join(",");

    const statsRes = await fetch(
      `${BASE}/channels?part=snippet,statistics&id=${channelIds}&key=${key}`,
      { next: { revalidate: 1800 } }
    );
    const statsData = await statsRes.json();

    const channels = (statsData.items || []).map((ch: any) => ({
      id: ch.id,
      name: ch.snippet.title,
      description: ch.snippet.description,
      thumbnail: ch.snippet.thumbnails?.high?.url || ch.snippet.thumbnails?.medium?.url || "",
      country: ch.snippet.country || null,
      subscribers: parseInt(ch.statistics?.subscriberCount || "0"),
      totalViews: parseInt(ch.statistics?.viewCount || "0"),
      videoCount: parseInt(ch.statistics?.videoCount || "0"),
      permalink: `https://www.youtube.com/channel/${ch.id}`,
    }));

    return NextResponse.json(channels);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
