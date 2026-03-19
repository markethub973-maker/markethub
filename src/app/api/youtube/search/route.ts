import { NextRequest, NextResponse } from "next/server";

const BASE = "https://www.googleapis.com/youtube/v3";

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get("q") || "trending";
  const max = parseInt(req.nextUrl.searchParams.get("max") || "12");
  const key = process.env.YOUTUBE_API_KEY;

  if (!key) {
    return NextResponse.json({ error: "YOUTUBE_API_KEY not set" }, { status: 500 });
  }

  try {
    const searchRes = await fetch(
      `${BASE}/search?part=snippet&q=${encodeURIComponent(q)}&type=video&maxResults=${max}&order=viewCount&key=${key}`,
      { next: { revalidate: 1800 } }
    );
    const searchData = await searchRes.json();

    if (searchData.error) {
      return NextResponse.json({ error: searchData.error.message }, { status: 400 });
    }

    if (!searchData.items?.length) return NextResponse.json([]);

    const ids = searchData.items.map((i: any) => i.id.videoId).join(",");
    const statsRes = await fetch(
      `${BASE}/videos?part=statistics,snippet&id=${ids}&key=${key}`,
      { next: { revalidate: 1800 } }
    );
    const statsData = await statsRes.json();

    if (!statsData.items) return NextResponse.json([]);

    const videos = statsData.items.map((item: any) => ({
      id: item.id,
      title: item.snippet.title,
      channel: item.snippet.channelTitle,
      channelId: item.snippet.channelId,
      thumbnail: item.snippet.thumbnails?.high?.url || "",
      views: parseInt(item.statistics?.viewCount || "0"),
      likes: parseInt(item.statistics?.likeCount || "0"),
      comments: parseInt(item.statistics?.commentCount || "0"),
      publishedAt: item.snippet.publishedAt,
    }));

    return NextResponse.json(videos);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
