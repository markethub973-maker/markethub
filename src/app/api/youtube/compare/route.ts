import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

const YT_BASE = "https://www.googleapis.com/youtube/v3";
const API_KEY = process.env.YOUTUBE_API_KEY;

interface ChannelStats {
  channel_id:       string;
  channel_name:     string;
  channel_handle:   string | null;
  thumbnail_url:    string | null;
  account_label:    string | null;
  is_primary:       boolean;
  subscribers:      number;
  total_views:      number;
  video_count:      number;
  avg_views:        number;
  recent_videos:    RecentVideo[];
  engagement_rate:  number;
}

interface RecentVideo {
  id:         string;
  title:      string;
  thumbnail:  string;
  views:      number;
  likes:      number;
  comments:   number;
  published:  string;
}

async function fetchChannelStats(channelId: string): Promise<ChannelStats | null> {
  try {
    // Channel info + stats
    const chRes = await fetch(
      `${YT_BASE}/channels?part=snippet,statistics&id=${channelId}&key=${API_KEY}`,
      { next: { revalidate: 1800 } }
    );
    const chData = await chRes.json();
    const ch = chData.items?.[0];
    if (!ch) return null;

    const subscribers  = parseInt(ch.statistics?.subscriberCount  ?? "0", 10);
    const total_views  = parseInt(ch.statistics?.viewCount         ?? "0", 10);
    const video_count  = parseInt(ch.statistics?.videoCount        ?? "0", 10);

    // Recent videos (last 8)
    const searchRes = await fetch(
      `${YT_BASE}/search?part=snippet&channelId=${channelId}&type=video&order=date&maxResults=8&key=${API_KEY}`,
      { next: { revalidate: 1800 } }
    );
    const searchData = await searchRes.json();
    const videoIds = (searchData.items ?? []).map((i: any) => i.id.videoId).join(",");

    let recentVideos: RecentVideo[] = [];
    if (videoIds) {
      const vRes = await fetch(
        `${YT_BASE}/videos?part=snippet,statistics&id=${videoIds}&key=${API_KEY}`,
        { next: { revalidate: 1800 } }
      );
      const vData = await vRes.json();
      recentVideos = (vData.items ?? []).map((v: any) => ({
        id:        v.id,
        title:     v.snippet?.title ?? "",
        thumbnail: v.snippet?.thumbnails?.medium?.url ?? "",
        views:     parseInt(v.statistics?.viewCount   ?? "0", 10),
        likes:     parseInt(v.statistics?.likeCount   ?? "0", 10),
        comments:  parseInt(v.statistics?.commentCount ?? "0", 10),
        published: v.snippet?.publishedAt ?? "",
      }));
    }

    const avg_views = recentVideos.length > 0
      ? Math.round(recentVideos.reduce((s, v) => s + v.views, 0) / recentVideos.length)
      : 0;

    // Engagement rate = (avg likes + avg comments) / subscribers * 100
    const avg_likes    = recentVideos.length > 0 ? recentVideos.reduce((s, v) => s + v.likes, 0)    / recentVideos.length : 0;
    const avg_comments = recentVideos.length > 0 ? recentVideos.reduce((s, v) => s + v.comments, 0) / recentVideos.length : 0;
    const engagement_rate = subscribers > 0 ? ((avg_likes + avg_comments) / subscribers) * 100 : 0;

    return {
      channel_id:      channelId,
      channel_name:    ch.snippet?.title ?? channelId,
      channel_handle:  ch.snippet?.customUrl ?? null,
      thumbnail_url:   ch.snippet?.thumbnails?.default?.url ?? null,
      account_label:   null,
      is_primary:      false,
      subscribers,
      total_views,
      video_count,
      avg_views,
      recent_videos:   recentVideos,
      engagement_rate: parseFloat(engagement_rate.toFixed(4)),
    };
  } catch {
    return null;
  }
}

export async function GET(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  if (!API_KEY) return NextResponse.json({ error: "YOUTUBE_API_KEY not configured" }, { status: 503 });

  // Load connected channels (max 5)
  const { data: accounts } = await supabase
    .from("youtube_connections" as any)
    .select("channel_id, channel_name, channel_handle, thumbnail_url, account_label, is_primary")
    .eq("user_id", user.id)
    .order("is_primary", { ascending: false })
    .limit(5);

  // Optional: also compare extra channel IDs from query params (for public channels)
  const extraIds = (req.nextUrl.searchParams.get("channels") ?? "")
    .split(",").map(s => s.trim()).filter(Boolean).slice(0, 3);

  const connectedIds = (accounts ?? []).map((a: any) => a.channel_id);
  const allIds = [...new Set([...connectedIds, ...extraIds])];

  if (allIds.length === 0) {
    return NextResponse.json({ channels: [], message: "No channels connected" });
  }

  // Fetch stats in parallel
  const stats = await Promise.all(allIds.map(fetchChannelStats));
  const valid = stats.filter((s): s is ChannelStats => s !== null);

  // Merge account labels and primary flag from DB
  for (const ch of valid) {
    const acc = (accounts ?? []).find((a: any) => a.channel_id === ch.channel_id);
    if (acc) {
      ch.account_label = (acc as any).account_label ?? null;
      ch.is_primary    = (acc as any).is_primary    ?? false;
    }
  }

  // Winners per category
  const winner = (key: keyof ChannelStats) => {
    const sorted = [...valid].sort((a, b) => (b[key] as number) - (a[key] as number));
    return sorted[0]?.channel_id ?? null;
  };

  const winners = {
    subscribers:     winner("subscribers"),
    avg_views:       winner("avg_views"),
    engagement_rate: winner("engagement_rate"),
    total_views:     winner("total_views"),
  };

  return NextResponse.json({ channels: valid, winners });
}
