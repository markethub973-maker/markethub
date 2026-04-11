/**
 * Reviews — sync endpoint (Google Business via Apify).
 *
 * POST /api/reviews/sync { placeUrl | placeName, maxReviews?, language?, business_id? }
 *
 * Reuses the same Apify actor as the existing /api/research/maps-reviews
 * endpoint (`compass~crawler-google-places`) to fetch reviews for a Google
 * Business location, then upserts them into the `reviews` table with
 * platform='google_business'. Dedup is idempotent via UNIQUE
 * (user_id, platform, external_id).
 *
 * Bonus over the legacy endpoint: the response is now a persisted list
 * + the new rows count, and the client doesn't have to re-query — they
 * just refetch /api/reviews after.
 *
 * Cost: counts against the "research" daily limit bucket (same as the
 * read-only endpoint) because it's the same Apify actor with the same
 * cost profile.
 */
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { safeApify } from "@/lib/serviceGuard";
import { checkAndIncrDailyLimit, limitExceededResponse } from "@/lib/dailyLimits";

export const maxDuration = 150;
export const dynamic = "force-dynamic";

interface ApifyReview {
  reviewId?: string;
  reviewerId?: string;
  reviewerNumberOfReviews?: number;
  name?: string;
  stars?: number;
  rating?: number;
  text?: string;
  textTranslated?: string;
  publishAt?: string;
  publishedAtDate?: string;
  likesCount?: number;
  responseFromOwnerText?: string;
  reviewerUrl?: string;
  reviewerPhotoUrl?: string;
}

interface ApifyPlace {
  title?: string;
  totalScore?: number;
  reviewsCount?: number;
  placeId?: string;
  url?: string;
  reviews?: ApifyReview[];
}

function classifySentiment(rating: number): "positive" | "negative" | "neutral" {
  if (rating >= 4) return "positive";
  if (rating <= 2) return "negative";
  return "neutral";
}

function priorityFor(rating: number): "low" | "normal" | "high" | "urgent" {
  if (rating <= 1) return "urgent";
  if (rating <= 2) return "high";
  if (rating <= 3) return "normal";
  return "low";
}

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("plan")
    .eq("id", user.id)
    .single();
  const userPlan = (profile as { plan?: string } | null)?.plan ?? "free_test";
  const limitCheck = await checkAndIncrDailyLimit(user.id, userPlan, "research");
  if (!limitCheck.allowed) {
    return NextResponse.json(limitExceededResponse(limitCheck, "research"), { status: 429 });
  }

  if (!process.env.APIFY_TOKEN) {
    return NextResponse.json(
      { error: "Apify not configured", degraded: true },
      { status: 503 },
    );
  }

  const body = (await req.json().catch(() => null)) as {
    placeUrl?: string;
    placeName?: string;
    maxReviews?: number;
    language?: string;
    business_id?: string;
  } | null;

  if (!body?.placeUrl && !body?.placeName) {
    return NextResponse.json(
      { error: "placeUrl or placeName required" },
      { status: 400 },
    );
  }

  const searchString = body.placeUrl || body.placeName!;
  const maxReviews = Math.min(body.maxReviews ?? 50, 100);
  const language = body.language ?? "ro";

  const result = await safeApify<ApifyPlace[]>(
    "compass~crawler-google-places",
    {
      searchStringsArray: [searchString],
      maxCrawledPlacesPerSearch: 1,
      language,
      includeReviews: true,
      maxReviews,
      reviewsSort: "newest",
      exportPlaceUrls: false,
      includeHistogram: false,
      includeOpeningHours: false,
      includePeopleAlsoSearch: false,
      additionalInfo: false,
    },
    { timeoutSec: 120, memorySec: 512, retries: 1 },
  );

  if (!result.ok) {
    return NextResponse.json(
      { error: result.error, service: "apify", degraded: true },
      { status: 503 },
    );
  }

  const places = result.data ?? [];
  const place = places[0];
  if (!place) {
    return NextResponse.json({
      ok: true,
      new: 0,
      total_scanned: 0,
      message: "No Google Business place found for query",
    });
  }

  const apifyReviews = place.reviews ?? [];
  if (apifyReviews.length === 0) {
    return NextResponse.json({
      ok: true,
      new: 0,
      total_scanned: 0,
      place_name: place.title,
      avg_rating: place.totalScore,
    });
  }

  // Shape rows for upsert
  const supa = createServiceClient();
  interface ReviewRow {
    user_id: string;
    business_id: string | null;
    platform: "google_business";
    place_id: string | null;
    place_name: string | null;
    place_url: string | null;
    external_id: string;
    reviewer_name: string;
    reviewer_handle: string | null;
    reviewer_avatar_url: string | null;
    reviewer_reviews_count: number | null;
    rating: number;
    title: string | null;
    content: string;
    language: string;
    sentiment: "positive" | "negative" | "neutral";
    sentiment_score: number;
    owner_reply: string | null;
    priority: "low" | "normal" | "high" | "urgent";
    likes_count: number;
    published_at: string | null;
  }

  const rows: ReviewRow[] = [];
  for (const r of apifyReviews) {
    const rating = Number(r.stars ?? r.rating ?? 0);
    const externalId = r.reviewId ?? r.reviewerId;
    if (!externalId || rating === 0) continue;
    const text = (r.text ?? r.textTranslated ?? "").slice(0, 2000);
    rows.push({
      user_id: user.id,
      business_id: body.business_id ?? null,
      platform: "google_business",
      place_id: place.placeId ?? null,
      place_name: place.title ?? null,
      place_url: place.url ?? body.placeUrl ?? null,
      external_id: externalId,
      reviewer_name: r.name ?? "Anonymous",
      reviewer_handle: null,
      reviewer_avatar_url: r.reviewerPhotoUrl ?? null,
      reviewer_reviews_count: r.reviewerNumberOfReviews ?? null,
      rating,
      title: null,
      content: text,
      language,
      sentiment: classifySentiment(rating),
      sentiment_score: (rating - 3) / 2,
      owner_reply: r.responseFromOwnerText ?? null,
      priority: priorityFor(rating),
      likes_count: r.likesCount ?? 0,
      published_at: r.publishedAtDate ?? r.publishAt ?? null,
    });
  }

  if (rows.length === 0) {
    return NextResponse.json({
      ok: true,
      new: 0,
      total_scanned: apifyReviews.length,
      place_name: place.title,
    });
  }

  // Upsert idempotent — dedup on (user_id, platform, external_id)
  const { count, error: upErr } = await supa
    .from("reviews")
    .upsert(rows, {
      onConflict: "user_id,platform,external_id",
      ignoreDuplicates: true,
      count: "exact",
    });

  if (upErr) {
    return NextResponse.json({ error: upErr.message }, { status: 500 });
  }

  return NextResponse.json({
    ok: true,
    new: count ?? 0,
    total_scanned: rows.length,
    place_name: place.title,
    avg_rating: place.totalScore,
    total_reviews_on_maps: place.reviewsCount,
  });
}
