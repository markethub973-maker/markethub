import { NextRequest, NextResponse } from "next/server";
import { requirePlan } from "@/lib/requirePlan";

export async function GET(req: NextRequest) {
  const check = await requirePlan(req, "/ads-library");
  if (check instanceof NextResponse) return check;

  const q = req.nextUrl.searchParams.get("q");
  const country = req.nextUrl.searchParams.get("country") || "ALL";
  const cursor = req.nextUrl.searchParams.get("cursor") || null;

  if (!q?.trim()) {
    return NextResponse.json({ error: "Missing search query" }, { status: 400 });
  }

  const appId = process.env.META_APP_ID;
  const appSecret = process.env.META_APP_SECRET;

  if (!appId || !appSecret) {
    // Fallback to Serper if no Meta credentials
    return fallbackSerper(q.trim(), country);
  }

  const accessToken = `${appId}|${appSecret}`;

  const params = new URLSearchParams({
    access_token: accessToken,
    search_terms: q.trim(),
    ad_type: "ALL",
    ad_active_status: "ALL",
    fields: [
      "id", "ad_creation_time", "ad_creative_bodies", "ad_creative_link_captions",
      "ad_creative_link_descriptions", "ad_creative_link_titles",
      "ad_delivery_start_time", "ad_delivery_stop_time",
      "ad_snapshot_url", "page_name", "page_id",
      "impressions", "spend", "currency", "publisher_platforms",
    ].join(","),
    limit: "12",
  });

  if (country !== "ALL") {
    params.set("ad_reached_countries", JSON.stringify([country]));
  }

  if (cursor) {
    params.set("after", cursor);
  }

  try {
    const res = await fetch(
      `https://graph.facebook.com/v22.0/ads_archive?${params.toString()}`,
      { headers: { "User-Agent": "Mozilla/5.0" }, next: { revalidate: 300 } }
    );

    const data = await res.json();

    if (data.error) {
      // If Facebook API fails, try Serper fallback
      console.warn("[ads-library] Meta API error, falling back to Serper:", data.error.message);
      return fallbackSerper(q.trim(), country);
    }

    return NextResponse.json({
      ads: data.data || [],
      nextCursor: data.paging?.cursors?.after || null,
      hasMore: !!data.paging?.next,
      total: data.data?.length || 0,
      query: q.trim(),
      country,
      source: "meta",
    });
  } catch (err: any) {
    console.error("[ads-library] fetch error:", err);
    return fallbackSerper(q.trim(), country);
  }
}

async function fallbackSerper(query: string, country: string): Promise<NextResponse> {
  const serperKey = process.env.SERPER_API_KEY;
  if (!serperKey) {
    return NextResponse.json(
      { error: "Ad search is temporarily unavailable. Please try again later.", ads: [], source: "none" },
      { status: 503 }
    );
  }

  try {
    const searchQuery = `site:facebook.com/ads/library "${query}"`;
    const res = await fetch("https://google.serper.dev/search", {
      method: "POST",
      headers: {
        "X-API-KEY": serperKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        q: searchQuery,
        gl: country !== "ALL" ? country.toLowerCase() : "us",
        num: 12,
      }),
    });

    const data = await res.json();
    const organic = data.organic || [];

    // Transform Serper results to ad-like objects
    const ads = organic.map((result: any, idx: number) => ({
      id: `serper_${idx}`,
      page_name: extractPageName(result.title, query),
      ad_creative_bodies: [result.snippet || ""],
      ad_creative_link_titles: [result.title || ""],
      ad_delivery_start_time: null,
      ad_delivery_stop_time: null,
      publisher_platforms: ["facebook"],
      ad_snapshot_url: result.link,
      impressions: null,
      spend: null,
      _serper_link: result.link,
    }));

    return NextResponse.json({
      ads,
      nextCursor: null,
      hasMore: false,
      total: ads.length,
      query,
      country,
      source: "serper",
    });
  } catch (err) {
    console.error("[ads-library] Serper fallback error:", err);
    return NextResponse.json(
      { error: "Ad search is temporarily unavailable. Please try again later.", ads: [], source: "none" },
      { status: 503 }
    );
  }
}

function extractPageName(title: string, query: string): string {
  // Try to extract page name from the search result title
  if (title.includes(" - ")) {
    return title.split(" - ")[0].trim();
  }
  return query;
}
