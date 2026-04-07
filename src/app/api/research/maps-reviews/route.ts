import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { safeApify } from "@/lib/serviceGuard";

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  
  if (!process.env.APIFY_TOKEN) return NextResponse.json({ error: "Apify not configured", degraded: true }, { status: 503 });

  const { placeUrl, placeName, maxReviews = 50, language = "ro" } = await req.json();
  if (!placeUrl && !placeName) return NextResponse.json({ error: "placeUrl or placeName required" }, { status: 400 });

  const startUrls = placeUrl
    ? [{ url: placeUrl }]
    : [{ url: `https://www.google.com/maps/search/${encodeURIComponent(placeName)}` }];

  const result = await safeApify<any[]>("apify~google-maps-reviews-scraper", {
    startUrls,
    maxReviews: Math.min(maxReviews, 100),
    reviewsSort: "newest",
    language,
    personalData: false,
  }, { timeoutSec: 120, retries: 1 });

  if (!result.ok) {
    return NextResponse.json({ error: result.error, service: "apify", degraded: true }, { status: 503 });
  }

  try {
    const data = result.data || [];
    const reviews = (data || []).map((r: any) => ({
      reviewId: r.reviewId,
      reviewer: r.name || "Anonymous",
      rating: r.stars || r.rating,
      text: (r.text || "").slice(0, 500),
      publishedAt: r.publishAt || r.publishedAtDate,
      likesCount: r.likesCount || 0,
      reviewerReviewsCount: r.reviewerNumberOfReviews,
      ownerResponse: r.responseFromOwnerText?.slice(0, 300),
    }));

    // Sentiment analysis
    const withText = reviews.filter((r: any) => r.text?.length > 10);
    const avgRating = reviews.length > 0
      ? reviews.reduce((s: number, r: any) => s + (r.rating || 0), 0) / reviews.length
      : 0;
    const positive = reviews.filter((r: any) => (r.rating || 0) >= 4).length;
    const negative = reviews.filter((r: any) => (r.rating || 0) <= 2).length;
    const neutral = reviews.length - positive - negative;

    return NextResponse.json({
      reviews,
      total: reviews.length,
      with_text: withText.length,
      avg_rating: +avgRating.toFixed(2),
      sentiment: { positive, negative, neutral },
      place_name: placeName,
    });
  } catch (err: any) {
    return NextResponse.json({ error: "Service temporarily unavailable" }, { status: 500 });
  }
}
