import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

const BASE = "https://www.googleapis.com/youtube/v3";

/**
 * Fetch a channel's playlists with video counts.
 * GET /api/youtube/playlists?channelId=xxx
 *
 * Returns: { playlists: Array<{ id, title, videoCount, description, thumbnail }> }
 */
export async function GET(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const key = process.env.YOUTUBE_API_KEY;
  if (!key) return NextResponse.json({ error: "YOUTUBE_API_KEY not set" }, { status: 500 });

  const channelId = req.nextUrl.searchParams.get("channelId");
  if (!channelId) return NextResponse.json({ error: "channelId required" }, { status: 400 });

  try {
    const res = await fetch(
      `${BASE}/playlists?part=snippet,contentDetails&channelId=${channelId}&maxResults=50&key=${key}`,
      { next: { revalidate: 1800 } } // 30-min cache
    );
    const data = await res.json();

    if (data.error) {
      return NextResponse.json({ error: data.error.message, playlists: [] }, { status: 200 });
    }

    const playlists = (data.items || []).map((item: PlaylistItem) => ({
      id: item.id,
      title: item.snippet?.title || "Untitled",
      description: item.snippet?.description || "",
      videoCount: item.contentDetails?.itemCount ?? 0,
      thumbnail: item.snippet?.thumbnails?.medium?.url || item.snippet?.thumbnails?.default?.url || null,
      publishedAt: item.snippet?.publishedAt || null,
    }));

    return NextResponse.json({
      channelId,
      playlists,
      total: playlists.length,
    });
  } catch (err) {
    console.error("[YouTube Playlists] Error:", err);
    return NextResponse.json({ error: "Failed to fetch playlists", playlists: [] }, { status: 200 });
  }
}

interface PlaylistItem {
  id: string;
  snippet?: {
    title?: string;
    description?: string;
    publishedAt?: string;
    thumbnails?: {
      default?: { url?: string };
      medium?: { url?: string };
    };
  };
  contentDetails?: { itemCount?: number };
}
