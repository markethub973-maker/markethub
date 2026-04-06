import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { safeApify } from "@/lib/serviceGuard";

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  if (!process.env.APIFY_TOKEN) return NextResponse.json({ error: "Apify not configured", degraded: true }, { status: 503 });

  const { query, location = "", limit = 20 } = await req.json();
  if (!query?.trim()) return NextResponse.json({ error: "Query required" }, { status: 400 });

  const searchQuery = location ? `${query} ${location}` : query;

  try {
    const result = await safeApify<any[]>("compass~crawler-google-places", {
      searchStringsArray: [searchQuery],
      maxCrawledPlacesPerSearch: Math.min(limit, 40),
      language: "ro",
      exportPlaceUrls: false,
      includeHistogram: false,
      includeOpeningHours: true,
      includePeopleAlsoSearch: false,
      additionalInfo: false,
    }, { timeoutSec: 90, retries: 1 });

    if (!result.ok) {
      return NextResponse.json({ error: result.error, service: "apify", degraded: true }, { status: 503 });
    }

    const data = result.data || [];
    const places = (data || []).map((p: any) => ({
      name: p.title || p.name,
      category: p.categoryName || p.categories?.[0],
      address: p.address || p.street,
      city: p.city,
      phone: p.phone,
      website: p.website,
      rating: p.totalScore || p.rating,
      reviewsCount: p.reviewsCount || p.totalReviews,
      url: p.url,
      email: p.email || null,
      openingHours: p.openingHours?.map((h: any) => `${h.day}: ${h.hours}`).join(", "),
      plusCode: p.plusCode,
      lat: p.location?.lat,
      lng: p.location?.lng,
    }));

    return NextResponse.json({ places, total: places.length, query: searchQuery });
  } catch (err: any) {
    return NextResponse.json({ error: err.message, degraded: true }, { status: 503 });
  }
}
