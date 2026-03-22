import { NextRequest, NextResponse } from "next/server";

const BASE = "https://www.googleapis.com/youtube/v3";

export async function GET(req: NextRequest) {
  const region = req.nextUrl.searchParams.get("region") || "US";
  const max = parseInt(req.nextUrl.searchParams.get("max") || "10");
  const key = process.env.YOUTUBE_API_KEY;

  if (!key) return NextResponse.json({ error: "YOUTUBE_API_KEY not set" }, { status: 500 });

  try {
    const res = await fetch(
      `${BASE}/videos?part=snippet,statistics&chart=mostPopular&regionCode=${region}&maxResults=${max}&key=${key}`,
      { next: { revalidate: 1800 } }
    );
    const data = await res.json();

    if (data.error) return NextResponse.json({ error: data.error.message }, { status: 400 });

    const videos = (data.items || []).map((v: any) => ({
      id: v.id,
      title: v.snippet.title,
      channel: v.snippet.channelTitle,
      thumbnail: v.snippet.thumbnails?.medium?.url || v.snippet.thumbnails?.default?.url || "",
      publishedAt: v.snippet.publishedAt,
      views: parseInt(v.statistics?.viewCount || "0"),
      likes: parseInt(v.statistics?.likeCount || "0"),
      comments: parseInt(v.statistics?.commentCount || "0"),
      categoryId: v.snippet.categoryId,
    }));

    return NextResponse.json({ region, videos });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
