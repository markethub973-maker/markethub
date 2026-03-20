import { NextResponse } from "next/server";

const API_KEY = process.env.YOUTUBE_API_KEY;
const BASE = "https://www.googleapis.com/youtube/v3";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const channelId = searchParams.get("id");
  if (!channelId || !API_KEY) {
    return NextResponse.json([], { status: 400 });
  }

  try {
    // Get recent videos from channel
    const searchRes = await fetch(
      `${BASE}/search?part=snippet&channelId=${channelId}&type=video&order=date&maxResults=8&key=${API_KEY}`,
      { next: { revalidate: 3600 } }
    );
    const searchData = await searchRes.json();
    if (!searchData.items?.length) return NextResponse.json([]);

    const ids = searchData.items.map((i: any) => i.id.videoId).filter(Boolean).join(",");
    const statsRes = await fetch(
      `${BASE}/videos?part=statistics,snippet&id=${ids}&key=${API_KEY}`,
      { next: { revalidate: 3600 } }
    );
    const statsData = await statsRes.json();
    if (!statsData.items) return NextResponse.json([]);

    const videos = statsData.items.map((item: any) => ({
      id: item.id,
      title: item.snippet.title,
      thumbnail: item.snippet.thumbnails?.medium?.url || "",
      views: parseInt(item.statistics?.viewCount || "0"),
      likes: parseInt(item.statistics?.likeCount || "0"),
      comments: parseInt(item.statistics?.commentCount || "0"),
      publishedAt: item.snippet.publishedAt,
    }));

    return NextResponse.json(videos);
  } catch {
    return NextResponse.json([]);
  }
}
