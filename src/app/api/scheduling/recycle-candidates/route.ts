/**
 * Content Recycling — list eligible posts to re-publish.
 *
 * GET /api/scheduling/recycle-candidates?platform=instagram
 *
 * Returns scheduled_posts that:
 *   - Have been published more than 90 days ago
 *   - Have NOT been recycled in the last 90 days
 *   - Have a performance_snapshot.engagement_rate >= 3% (high performers)
 *   - Are NOT already recycled copies (recycled_from_post_id IS NULL)
 *
 * The UI shows these as "Recycle this post?" suggestions in the Calendar
 * page, with a one-click button that duplicates the post into the next
 * Smart Scheduling slot.
 *
 * Auth: requireAuth.
 */
import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/route-helpers";
import { createServiceClient } from "@/lib/supabase/service";

export const dynamic = "force-dynamic";

const NINETY_DAYS_MS = 90 * 24 * 60 * 60 * 1000;
const MIN_ENGAGEMENT_RATE = 3.0;
const VALID_PLATFORMS = new Set(["instagram", "facebook", "linkedin", "tiktok", "youtube", "twitter"]);

interface PostRow {
  id: string;
  caption: string | null;
  platform: string | null;
  date: string | null;
  time: string | null;
  image_url: string | null;
  published_at: string | null;
  recycle_count: number;
  last_recycled_at: string | null;
  performance_snapshot: { engagement_rate?: number; likes?: number; reach?: number } | null;
}

export async function GET(req: NextRequest) {
  const auth = await requireAuth();
  if (!auth.ok) return auth.response;

  const platform = req.nextUrl.searchParams.get("platform");
  const supa = createServiceClient();

  const ninetyDaysAgo = new Date(Date.now() - NINETY_DAYS_MS).toISOString();

  let q = supa
    .from("scheduled_posts")
    .select(
      "id, caption, platform, date, time, image_url, published_at, recycle_count, last_recycled_at, performance_snapshot",
    )
    .eq("user_id", auth.userId)
    .is("recycled_from_post_id", null)
    .lt("published_at", ninetyDaysAgo)
    .not("published_at", "is", null)
    .order("published_at", { ascending: false })
    .limit(100);

  if (platform && VALID_PLATFORMS.has(platform)) {
    q = q.eq("platform", platform);
  }

  const { data, error } = await q;
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Filter in memory for engagement_rate + last_recycled_at (jsonb filtering
  // is awkward in PostgREST)
  const candidates = ((data ?? []) as PostRow[]).filter((p) => {
    const er = p.performance_snapshot?.engagement_rate ?? 0;
    if (er < MIN_ENGAGEMENT_RATE) return false;
    if (p.last_recycled_at && new Date(p.last_recycled_at).getTime() > Date.now() - NINETY_DAYS_MS) {
      return false;
    }
    return true;
  });

  return NextResponse.json({
    candidates,
    total: candidates.length,
    criteria: {
      min_age_days: 90,
      min_engagement_rate: MIN_ENGAGEMENT_RATE,
      max_recent_recycles: 0,
    },
  });
}
