import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

const ANALYTICS_BASE = "https://youtubeanalytics.googleapis.com/v2/reports";
const TOKEN_URL = "https://oauth2.googleapis.com/token";

async function refreshAccessToken(refreshToken: string): Promise<string | null> {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  if (!clientId || !clientSecret) return null;

  const res = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: refreshToken,
      grant_type: "refresh_token",
    }),
  });

  if (!res.ok) return null;
  const data = await res.json();
  return data.access_token ?? null;
}

async function analyticsGet(
  accessToken: string,
  params: Record<string, string>
): Promise<any> {
  const url = new URL(ANALYTICS_BASE);
  Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));
  const res = await fetch(url.toString(), {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) return null;
  return res.json();
}

export async function GET(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Fetch stored tokens
  const { data: profile } = await supabase
    .from("profiles")
    .select("youtube_access_token, youtube_refresh_token, youtube_token_expires_at, youtube_channel_id")
    .eq("id", user.id)
    .single();

  if (!profile?.youtube_refresh_token) {
    return NextResponse.json({ error: "not_connected" }, { status: 200 });
  }

  // Check if token is expired — refresh if needed
  let accessToken = profile.youtube_access_token as string;
  const expiresAt = profile.youtube_token_expires_at
    ? new Date(profile.youtube_token_expires_at).getTime()
    : 0;

  if (!accessToken || Date.now() > expiresAt - 60_000) {
    const newToken = await refreshAccessToken(profile.youtube_refresh_token as string);
    if (!newToken) {
      return NextResponse.json({ error: "token_refresh_failed" }, { status: 200 });
    }
    accessToken = newToken;
    const newExpiry = new Date(Date.now() + 3600 * 1000).toISOString();
    await supabase
      .from("profiles")
      .update({ youtube_access_token: newToken, youtube_token_expires_at: newExpiry })
      .eq("id", user.id);
  }

  const channelId = profile.youtube_channel_id as string | null;
  const ids = channelId ? `channel==${channelId}` : "channel==MINE";

  // Date range: last 28 days
  const endDate = new Date().toISOString().slice(0, 10);
  const startDate = new Date(Date.now() - 28 * 86400_000).toISOString().slice(0, 10);

  const base = { ids, startDate, endDate };

  // Fetch all metrics in parallel
  const [overview, traffic, demographics, topVideos] = await Promise.all([
    // Overview: views, watchTime, averageViewDuration, likes, shares, subscribers
    analyticsGet(accessToken, {
      ...base,
      metrics: "views,estimatedMinutesWatched,averageViewDuration,likes,shares,subscribersGained,subscribersLost",
      dimensions: "day",
    }),
    // Traffic sources
    analyticsGet(accessToken, {
      ...base,
      metrics: "views,estimatedMinutesWatched",
      dimensions: "insightTrafficSourceType",
      sort: "-views",
    }),
    // Demographics (age + gender)
    analyticsGet(accessToken, {
      ...base,
      metrics: "viewerPercentage",
      dimensions: "ageGroup,gender",
      sort: "-viewerPercentage",
    }),
    // Top videos
    analyticsGet(accessToken, {
      ...base,
      metrics: "views,estimatedMinutesWatched,averageViewPercentage,likes",
      dimensions: "video",
      sort: "-views",
      maxResults: "10",
    }),
  ]);

  // Parse overview into daily series
  const dailyRows = overview?.rows ?? [];
  const headers: string[] = overview?.columnHeaders?.map((h: any) => h.name) ?? [];

  const daily = dailyRows.map((row: any[]) => {
    const obj: Record<string, any> = {};
    headers.forEach((h, i) => (obj[h] = row[i]));
    return obj;
  });

  // Aggregate totals from daily
  const totals = daily.reduce(
    (acc: any, d: any) => ({
      views: acc.views + (d.views ?? 0),
      watchMinutes: acc.watchMinutes + (d.estimatedMinutesWatched ?? 0),
      likes: acc.likes + (d.likes ?? 0),
      shares: acc.shares + (d.shares ?? 0),
      subscribersGained: acc.subscribersGained + (d.subscribersGained ?? 0),
      subscribersLost: acc.subscribersLost + (d.subscribersLost ?? 0),
    }),
    { views: 0, watchMinutes: 0, likes: 0, shares: 0, subscribersGained: 0, subscribersLost: 0 }
  );
  totals.avgViewDuration = daily.length
    ? Math.round(daily.reduce((s: number, d: any) => s + (d.averageViewDuration ?? 0), 0) / daily.length)
    : 0;

  // Traffic sources
  const trafficHeaders: string[] = traffic?.columnHeaders?.map((h: any) => h.name) ?? [];
  const trafficRows = (traffic?.rows ?? []).map((row: any[]) => {
    const obj: Record<string, any> = {};
    trafficHeaders.forEach((h, i) => (obj[h] = row[i]));
    return obj;
  });

  // Demographics
  const demoHeaders: string[] = demographics?.columnHeaders?.map((h: any) => h.name) ?? [];
  const demoRows = (demographics?.rows ?? []).map((row: any[]) => {
    const obj: Record<string, any> = {};
    demoHeaders.forEach((h, i) => (obj[h] = row[i]));
    return obj;
  });

  // Top videos
  const videoHeaders: string[] = topVideos?.columnHeaders?.map((h: any) => h.name) ?? [];
  const videoRows = (topVideos?.rows ?? []).map((row: any[]) => {
    const obj: Record<string, any> = {};
    videoHeaders.forEach((h, i) => (obj[h] = row[i]));
    return obj;
  });

  return NextResponse.json({
    connected: true,
    period: { startDate, endDate },
    totals,
    daily,
    traffic: trafficRows,
    demographics: demoRows,
    topVideos: videoRows,
  });
}
