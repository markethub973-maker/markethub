import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const token = process.env.APIFY_TOKEN;
  if (!token) return NextResponse.json({ error: "Apify not configured" }, { status: 500 });

  const { query, location = "Romania", limit = 20 } = await req.json();
  if (!query?.trim()) return NextResponse.json({ error: "Query required" }, { status: 400 });

  const searchQuery = location ? `${query} ${location}` : query;

  try {
    const res = await fetch(
      `https://api.apify.com/v2/acts/apify~google-maps-scraper/run-sync-get-dataset-items?token=${token}&timeout=90&memory=256`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          searchStringsArray: [searchQuery],
          maxCrawledPlacesPerSearch: Math.min(limit, 40),
          language: "ro",
          exportPlaceUrls: false,
          includeHistogram: false,
          includeOpeningHours: true,
          includePeopleAlsoSearch: false,
          additionalInfo: false,
        }),
      }
    );

    if (!res.ok) {
      const err = await res.text();
      return NextResponse.json({ error: `Apify error: ${res.status}`, detail: err }, { status: 502 });
    }

    const data = await res.json();
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
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
