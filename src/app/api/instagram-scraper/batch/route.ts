import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { requireAuth } from "@/lib/route-helpers";

const RAPIDAPI_HOST = "instagram-public-bulk-scraper.p.rapidapi.com";

/**
 * Batch Instagram scraper — up to 20 profiles in one request.
 * POST body: { usernames: string[] }
 * Returns profile data for each username (partial results on individual failures).
 */
export async function POST(req: NextRequest) {
  const auth = await requireAuth();
  if (!auth.ok) return auth.response;
  const user = { id: auth.userId };

  const apiKey = process.env.RAPIDAPI_KEY;
  if (!apiKey) return NextResponse.json({ error: "RapidAPI key not configured" }, { status: 500 });

  const { usernames } = await req.json();
  if (!Array.isArray(usernames) || usernames.length === 0) {
    return NextResponse.json({ error: "usernames array required" }, { status: 400 });
  }

  const limited = usernames.slice(0, 20).map((u: string) => u.trim().replace(/^@/, ""));

  const results = await Promise.allSettled(
    limited.map(async (username) => {
      const res = await fetch(
        `https://${RAPIDAPI_HOST}/v1/user_info_web?username=${encodeURIComponent(username)}`,
        {
          headers: {
            "x-rapidapi-host": RAPIDAPI_HOST,
            "x-rapidapi-key": apiKey,
          },
        }
      );
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      const u = data?.data?.user || data?.user || data;
      return {
        username,
        full_name: u?.full_name || u?.name || "",
        followers: u?.edge_followed_by?.count ?? u?.followers ?? 0,
        following: u?.edge_follow?.count ?? u?.following ?? 0,
        posts: u?.edge_owner_to_timeline_media?.count ?? u?.media_count ?? 0,
        bio: u?.biography || "",
        profile_pic: u?.profile_pic_url_hd || u?.profile_pic_url || null,
        is_verified: u?.is_verified || false,
        is_business: u?.is_business_account || false,
        engagement_rate: u?.engagement_rate || null,
        avg_likes: u?.avg_likes || null,
        avg_comments: u?.avg_comments || null,
        external_url: u?.external_url || null,
        category: u?.category_name || null,
      };
    })
  );

  const profiles = results.map((r, i) =>
    r.status === "fulfilled"
      ? { ...r.value, error: null }
      : { username: limited[i], error: (r.reason as Error)?.message || "Failed" }
  );

  return NextResponse.json({
    profiles,
    total: limited.length,
    success: profiles.filter(p => !p.error).length,
    failed: profiles.filter(p => p.error).length,
  });
}
