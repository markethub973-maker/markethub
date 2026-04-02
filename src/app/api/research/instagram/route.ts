import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const token = process.env.APIFY_TOKEN;
  if (!token) return NextResponse.json({ error: "Apify not configured" }, { status: 500 });

  const { username, hashtag, limit = 12 } = await req.json();
  if (!username && !hashtag) return NextResponse.json({ error: "username or hashtag required" }, { status: 400 });

  const input: Record<string, unknown> = {
    resultsLimit: Math.min(limit, 30),
  };

  if (username) {
    const clean = username.replace(/^@/, "");
    input.directUrls = [`https://www.instagram.com/${clean}/`];
    input.resultsType = "posts";
  } else {
    input.hashtags = [hashtag.replace(/^#/, "")];
    input.resultsType = "hashtags";
  }

  try {
    const res = await fetch(
      `https://api.apify.com/v2/acts/apify~instagram-scraper/run-sync-get-dataset-items?token=${token}&timeout=90&memory=256`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      }
    );

    if (!res.ok) {
      const err = await res.text();
      return NextResponse.json({ error: `Apify error: ${res.status}`, detail: err }, { status: 502 });
    }

    const data = await res.json();

    if (username) {
      // Profile + posts mode
      const posts = (data || []).map((p: any) => ({
        id: p.id || p.shortCode,
        shortCode: p.shortCode,
        url: p.url,
        type: p.type,
        caption: p.caption?.slice(0, 200),
        thumbnail: p.displayUrl || p.thumbnailUrl,
        likes: p.likesCount || 0,
        comments: p.commentsCount || 0,
        timestamp: p.timestamp,
        hashtags: p.hashtags?.slice(0, 8),
        ownerUsername: p.ownerUsername,
        ownerFullName: p.ownerFullName,
        videoViewCount: p.videoViewCount,
        engRate: p.likesCount && p.ownerFollowersCount
          ? +((p.likesCount + (p.commentsCount || 0)) / p.ownerFollowersCount * 100).toFixed(2)
          : null,
      }));

      const profile = data?.[0] ? {
        username: data[0].ownerUsername,
        fullName: data[0].ownerFullName,
        followers: data[0].ownerFollowersCount,
        profilePic: data[0].ownerProfilePicUrl,
      } : null;

      return NextResponse.json({ type: "profile", profile, posts, total: posts.length });
    } else {
      // Hashtag mode
      const posts = (data || []).map((p: any) => ({
        id: p.id,
        shortCode: p.shortCode,
        url: p.url,
        type: p.type,
        caption: p.caption?.slice(0, 200),
        thumbnail: p.displayUrl,
        likes: p.likesCount || 0,
        comments: p.commentsCount || 0,
        timestamp: p.timestamp,
        ownerUsername: p.ownerUsername,
        videoViewCount: p.videoViewCount,
      }));
      return NextResponse.json({ type: "hashtag", hashtag, posts, total: posts.length });
    }
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
