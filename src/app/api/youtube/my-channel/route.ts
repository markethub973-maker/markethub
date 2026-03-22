import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

const BASE = "https://www.googleapis.com/youtube/v3";

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("youtube_channel_id")
    .eq("id", user.id)
    .single();

  if (!profile?.youtube_channel_id) {
    return NextResponse.json({ error: "No channel connected" }, { status: 400 });
  }

  const key = process.env.YOUTUBE_API_KEY;
  if (!key) {
    return NextResponse.json({ error: "YOUTUBE_API_KEY not set" }, { status: 500 });
  }

  const channelId = profile.youtube_channel_id;

  try {
    // Channel stats
    const channelRes = await fetch(
      `${BASE}/channels?part=snippet,statistics,brandingSettings&id=${channelId}&key=${key}`
    );
    const channelData = await channelRes.json();

    if (!channelData.items?.length) {
      return NextResponse.json({ error: "Channel not found" }, { status: 404 });
    }

    const ch = channelData.items[0];
    const stats = ch.statistics;
    const snippet = ch.snippet;

    // Recent videos
    const searchRes = await fetch(
      `${BASE}/search?part=snippet&channelId=${channelId}&type=video&order=date&maxResults=12&key=${key}`
    );
    const searchData = await searchRes.json();

    let videos: any[] = [];

    if (searchData.items?.length) {
      const videoIds = searchData.items.map((i: any) => i.id.videoId).join(",");
      const videosRes = await fetch(
        `${BASE}/videos?part=snippet,statistics&id=${videoIds}&key=${key}`
      );
      const videosData = await videosRes.json();

      videos = (videosData.items || []).map((v: any) => ({
        id: v.id,
        title: v.snippet.title,
        thumbnail: v.snippet.thumbnails?.high?.url || v.snippet.thumbnails?.medium?.url || "",
        publishedAt: v.snippet.publishedAt,
        views: parseInt(v.statistics?.viewCount || "0"),
        likes: parseInt(v.statistics?.likeCount || "0"),
        comments: parseInt(v.statistics?.commentCount || "0"),
        permalink: `https://www.youtube.com/watch?v=${v.id}`,
      }));
    }

    return NextResponse.json({
      id: channelId,
      name: snippet.title,
      description: snippet.description,
      thumbnail: snippet.thumbnails?.high?.url || snippet.thumbnails?.medium?.url || "",
      country: snippet.country || null,
      publishedAt: snippet.publishedAt,
      subscribers: parseInt(stats.subscriberCount || "0"),
      totalViews: parseInt(stats.viewCount || "0"),
      videoCount: parseInt(stats.videoCount || "0"),
      videos,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
