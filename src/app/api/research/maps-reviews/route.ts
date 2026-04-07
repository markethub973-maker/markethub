import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { safeApify } from "@/lib/serviceGuard";
import { checkAndIncrDailyLimit, limitExceededResponse } from "@/lib/dailyLimits";

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: profile } = await supabase.from("profiles").select("plan").eq("id", user.id).single();
  const userPlan = (profile as any)?.plan ?? "free_test";
  const limitCheck = await checkAndIncrDailyLimit(user.id, userPlan, "research");
  if (!limitCheck.allowed) return NextResponse.json(limitExceededResponse(limitCheck, "research"), { status: 429 });

  if (!process.env.APIFY_TOKEN) return NextResponse.json({ error: "Apify not configured", degraded: true }, { status: 503 });

  const { placeUrl, placeName, maxReviews = 50, language = "ro" } = await req.json();
  if (!placeUrl && !placeName) return NextResponse.json({ error: "placeUrl or placeName required" }, { status: 400 });

  const searchString = placeUrl || placeName;

  const result = await safeApify<any[]>("compass~crawler-google-places", {
    searchStringsArray: [searchString],
    maxCrawledPlacesPerSearch: 1,
    language,
    includeReviews: true,
    maxReviews: Math.min(maxReviews, 100),
    reviewsSort: "newest",
    exportPlaceUrls: false,
    includeHistogram: false,
    includeOpeningHours: false,
    includePeopleAlsoSearch: false,
    additionalInfo: false,
  }, { timeoutSec: 120, memorySec: 512, retries: 1 });

  if (!result.ok) {
    return NextResponse.json({ error: result.error, service: "apify", degraded: true }, { status: 503 });
  }

  try {
    const data = result.data || [];
    const place = data[0];
    if (!place) return NextResponse.json({ reviews: [], total: 0, avg_rating: 0, sentiment: { positive: 0, negative: 0, neutral: 0 } });

    const reviews = (place.reviews || []).map((r: any) => ({
      reviewId: r.reviewId || r.reviewerId,
      reviewer: r.name || "Anonymous",
      rating: r.stars || r.rating,
      text: (r.text || r.textTranslated || "").slice(0, 500),
      publishedAt: r.publishAt || r.publishedAtDate,
      likesCount: r.likesCount || 0,
      reviewerReviewsCount: r.reviewerNumberOfReviews,
      ownerResponse: r.responseFromOwnerText?.slice(0, 300),
    }));

    const avgRating = place.totalScore || (reviews.length > 0
      ? reviews.reduce((s: number, r: any) => s + (r.rating || 0), 0) / reviews.length
      : 0);
    const positive = reviews.filter((r: any) => (r.rating || 0) >= 4).length;
    const negative = reviews.filter((r: any) => (r.rating || 0) <= 2).length;
    const neutral = reviews.length - positive - negative;

    return NextResponse.json({
      reviews,
      total: reviews.length,
      with_text: reviews.filter((r: any) => r.text?.length > 10).length,
      avg_rating: +Number(avgRating).toFixed(2),
      sentiment: { positive, negative, neutral },
      place_name: place.title || placeName,
      total_reviews_on_maps: place.reviewsCount,
    });
  } catch (err: any) {
    return NextResponse.json({ error: "Service temporarily unavailable" }, { status: 500 });
  }
}
