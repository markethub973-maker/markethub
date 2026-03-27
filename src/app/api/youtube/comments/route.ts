import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

const BASE = "https://www.googleapis.com/youtube/v3";

/**
 * Fetch YouTube video comments for sentiment analysis
 * GET /api/youtube/comments?videoId=xxx&max=100
 */
export async function GET(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const key = process.env.YOUTUBE_API_KEY;
  if (!key) return NextResponse.json({ error: "YOUTUBE_API_KEY not set" }, { status: 500 });

  const videoId = req.nextUrl.searchParams.get("videoId");
  if (!videoId) return NextResponse.json({ error: "videoId required" }, { status: 400 });

  const max = Math.min(parseInt(req.nextUrl.searchParams.get("max") || "100"), 100);

  try {
    const res = await fetch(
      `${BASE}/commentThreads?part=snippet&videoId=${videoId}&maxResults=${max}&order=relevance&key=${key}`,
      { next: { revalidate: 900 } } // 15-min cache
    );
    const data = await res.json();

    if (data.error) {
      return NextResponse.json({
        error: data.error.message,
        comments: [],
      }, { status: 200 }); // Return 200 with error msg so UI handles gracefully
    }

    const comments: string[] = (data.items || []).map(
      (item: { snippet: { topLevelComment: { snippet: { textDisplay: string } } } }) =>
        item.snippet?.topLevelComment?.snippet?.textDisplay || ""
    ).filter(Boolean);

    return NextResponse.json({
      videoId,
      comments,
      total: comments.length,
      page_token: data.nextPageToken || null,
    });
  } catch (err) {
    console.error("[YouTube Comments] Error:", err);
    return NextResponse.json({ error: "Failed to fetch comments", comments: [] }, { status: 200 });
  }
}
