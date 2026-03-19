import { NextRequest, NextResponse } from "next/server";

const BASE = "https://www.googleapis.com/youtube/v3";

export async function GET(req: NextRequest) {
  const region = req.nextUrl.searchParams.get("region") || "US";
  const max = parseInt(req.nextUrl.searchParams.get("max") || "12");
  const key = process.env.YOUTUBE_API_KEY;

  if (!key) {
    return NextResponse.json({ error: "YOUTUBE_API_KEY not set" }, { status: 500 });
  }

  try {
    const res = await fetch(
      `${BASE}/videos?part=snippet,statistics&chart=mostPopular&maxResults=${max}&regionCode=${region}&key=${key}`,
      { next: { revalidate: 3600 } }
    );
    const data = await res.json();

    if (data.error) {
      return NextResponse.json({ error: data.error.message }, { status: 400 });
    }

    if (!data.items) return NextResponse.json([]);

    const videos = data.items.map((item: any) => ({
      id: item.id,
      title: item.snippet.title,
      channel: item.snippet.channelTitle,
      channelId: item.snippet.channelId,
      thumbnail: item.snippet.thumbnails?.high?.url || item.snippet.thumbnails?.medium?.url || "",
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
