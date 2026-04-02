import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const token = process.env.APIFY_TOKEN;
  if (!token) return NextResponse.json({ error: "Apify not configured" }, { status: 500 });

  const { placeUrl, placeName, maxReviews = 50, language = "ro" } = await req.json();
  if (!placeUrl && !placeName) return NextResponse.json({ error: "placeUrl or placeName required" }, { status: 400 });

  const startUrls = placeUrl
    ? [{ url: placeUrl }]
    : [{ url: `https://www.google.com/maps/search/${encodeURIComponent(placeName)}` }];

  try {
    const res = await fetch(
      `https://api.apify.com/v2/acts/apify~google-maps-reviews-scraper/run-sync-get-dataset-items?token=${token}&timeout=120&memory=256`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          startUrls,
          maxReviews: Math.min(maxReviews, 100),
          reviewsSort: "newest",
          language,
          personalData: false,
        }),
      }
    );

    if (!res.ok) {
      const err = await res.text();
      return NextResponse.json({ error: `Apify error: ${res.status}`, detail: err }, { status: 502 });
    }

    const data = await res.json();
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
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
