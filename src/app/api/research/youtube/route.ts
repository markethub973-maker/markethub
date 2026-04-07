import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { safeApify } from "@/lib/serviceGuard";

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  
  if (!process.env.APIFY_TOKEN) return NextResponse.json({ error: "Apify not configured", degraded: true }, { status: 503 });

  const { channel, keyword, limit = 15 } = await req.json();
  if (!channel && !keyword) return NextResponse.json({ error: "channel or keyword required" }, { status: 400 });

  const input: Record<string, unknown> = {
    maxResults: Math.min(limit, 30),
  };

  if (channel) {
    // Channel URL or handle
    const channelUrl = channel.startsWith("http")
      ? channel
      : channel.startsWith("@")
      ? `https://www.youtube.com/${channel}`
      : `https://www.youtube.com/@${channel}`;
    input.startUrls = [{ url: channelUrl }];
    input.searchKeywords = null;
  } else {
    input.searchKeywords = keyword;
    input.startUrls = [];
  }

  const result = await safeApify<any[]>("streamers~youtube-scraper", input, { timeoutSec: 90, retries: 1 });

  if (!result.ok) {
    return NextResponse.json({ error: result.error, service: "apify", degraded: true }, { status: 503 });
  }

  try {
    const data = result.data || [];
    const videos = (data || []).map((v: any) => ({
      id: v.id,
      title: v.title,
      url: v.url,
      thumbnail: v.thumbnailUrl,
      channel: v.channelName,
      channelUrl: v.channelUrl,
      channelSubscribers: v.numberOfSubscribers,
      views: v.viewCount || 0,
      likes: v.likes || 0,
      comments: v.commentsCount || 0,
      duration: v.duration,
      publishedAt: v.date,
      description: v.text?.slice(0, 200),
    }));

    const channelInfo = videos[0] ? {
      name: videos[0].channel,
      url: videos[0].channelUrl,
      subscribers: videos[0].channelSubscribers,
    } : null;

    return NextResponse.json({ videos, channelInfo, total: videos.length, mode: channel ? "channel" : "search" });
  } catch (err: any) {
    return NextResponse.json({ error: "Service temporarily unavailable" }, { status: 500 });
  }
}
