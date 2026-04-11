/**
 * Reviews — list + status update + reply (local persist).
 *
 *   GET   /api/reviews?status=new&platform=google_business&min_rating=1&limit=50
 *         Returns reviews for the authenticated user filtered by optional
 *         status/platform/rating. Newest first by published_at. Also
 *         returns aggregate counts + avg_rating so the UI can render a
 *         summary in a single fetch.
 *
 *   PATCH /api/reviews  { id, status?, priority?, tags?, business_id? }
 *         Update workflow metadata. Status transitions:
 *           new → acknowledged | replied | escalated | hidden
 *         priority: low|normal|high|urgent.
 *
 *   POST  /api/reviews/reply  { id, reply_text }
 *         Stores the reply on the review row + sets status=replied +
 *         stamps replied_at/replied_by. Actually SENDING the reply back
 *         to the platform requires Google Business Profile OAuth (GBP API)
 *         which is a separate integration — for now we just persist
 *         locally. (Endpoint lives in /api/reviews/reply/route.ts)
 */
import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/route-helpers";
import { createServiceClient } from "@/lib/supabase/service";

export const dynamic = "force-dynamic";

const VALID_STATUS = new Set(["new", "acknowledged", "replied", "escalated", "hidden"]);
const VALID_PRIORITY = new Set(["low", "normal", "high", "urgent"]);
const VALID_PLATFORM = new Set(["google_business", "facebook", "trustpilot", "yelp"]);

export async function GET(req: NextRequest) {
  const auth = await requireAuth();
  if (!auth.ok) return auth.response;

  const url = req.nextUrl;
  const status = url.searchParams.get("status");
  const platform = url.searchParams.get("platform");
  const minRating = parseFloat(url.searchParams.get("min_rating") ?? "0");
  const maxRating = parseFloat(url.searchParams.get("max_rating") ?? "5");
  const businessId = url.searchParams.get("business_id");
  const limitRaw = parseInt(url.searchParams.get("limit") ?? "50", 10);
  const offsetRaw = parseInt(url.searchParams.get("offset") ?? "0", 10);
  const limit = Math.min(200, Math.max(1, isNaN(limitRaw) ? 50 : limitRaw));
  const offset = Math.max(0, isNaN(offsetRaw) ? 0 : offsetRaw);

  const supa = createServiceClient();

  let q = supa
    .from("reviews")
    .select(
      "id, business_id, platform, place_id, place_name, place_url, external_id, reviewer_name, reviewer_handle, reviewer_avatar_url, reviewer_reviews_count, rating, title, content, language, sentiment, sentiment_score, owner_reply, reply_text, replied_at, status, priority, tags, likes_count, published_at, ingested_at",
      { count: "exact" },
    )
    .eq("user_id", auth.userId)
    .gte("rating", isNaN(minRating) ? 0 : minRating)
    .lte("rating", isNaN(maxRating) ? 5 : maxRating)
    .order("published_at", { ascending: false, nullsFirst: false })
    .range(offset, offset + limit - 1);

  if (status && VALID_STATUS.has(status)) q = q.eq("status", status);
  if (platform && VALID_PLATFORM.has(platform)) q = q.eq("platform", platform);
  if (businessId) q = q.eq("business_id", businessId);

  const { data, error, count } = await q;
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Aggregate for summary pane
  const { data: agg } = await supa
    .from("reviews")
    .select("status, platform, rating")
    .eq("user_id", auth.userId);

  const counts = {
    by_status: { new: 0, acknowledged: 0, replied: 0, escalated: 0, hidden: 0 } as Record<string, number>,
    by_platform: { google_business: 0, facebook: 0, trustpilot: 0, yelp: 0 } as Record<string, number>,
    by_rating: { "5": 0, "4": 0, "3": 0, "2": 0, "1": 0 } as Record<string, number>,
    total: 0,
    avg_rating: 0,
  };
  let ratingSum = 0;
  for (const row of agg ?? []) {
    const r = row as { status: string; platform: string; rating: number };
    counts.total++;
    if (r.status in counts.by_status) counts.by_status[r.status]++;
    if (r.platform in counts.by_platform) counts.by_platform[r.platform]++;
    const bucket = Math.max(1, Math.min(5, Math.round(r.rating)));
    counts.by_rating[String(bucket)]++;
    ratingSum += Number(r.rating ?? 0);
  }
  counts.avg_rating = counts.total > 0 ? +(ratingSum / counts.total).toFixed(2) : 0;

  return NextResponse.json({
    reviews: data ?? [],
    total: count ?? 0,
    offset,
    limit,
    counts,
  });
}

export async function PATCH(req: NextRequest) {
  const auth = await requireAuth();
  if (!auth.ok) return auth.response;

  const body = (await req.json().catch(() => null)) as {
    id?: string;
    status?: string;
    priority?: string;
    tags?: string[];
    business_id?: string | null;
  } | null;

  if (!body?.id) {
    return NextResponse.json({ error: "id required" }, { status: 400 });
  }

  const update: Record<string, unknown> = {};
  if (body.status !== undefined) {
    if (!VALID_STATUS.has(body.status)) {
      return NextResponse.json({ error: "invalid status" }, { status: 400 });
    }
    update.status = body.status;
  }
  if (body.priority !== undefined) {
    if (!VALID_PRIORITY.has(body.priority)) {
      return NextResponse.json({ error: "invalid priority" }, { status: 400 });
    }
    update.priority = body.priority;
  }
  if (body.tags !== undefined) {
    if (!Array.isArray(body.tags)) {
      return NextResponse.json({ error: "tags must be array" }, { status: 400 });
    }
    update.tags = body.tags.slice(0, 20).map((t) => String(t).slice(0, 40));
  }
  if (body.business_id !== undefined) {
    update.business_id = body.business_id;
  }

  if (Object.keys(update).length === 0) {
    return NextResponse.json({ error: "no updates" }, { status: 400 });
  }

  const supa = createServiceClient();
  const { error } = await supa
    .from("reviews")
    .update(update)
    .eq("id", body.id)
    .eq("user_id", auth.userId);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
