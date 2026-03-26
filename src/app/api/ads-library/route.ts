import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get("q");
  const country = req.nextUrl.searchParams.get("country") || "ALL";
  const cursor = req.nextUrl.searchParams.get("cursor") || null;

  if (!q?.trim()) {
    return NextResponse.json({ error: "Missing search query" }, { status: 400 });
  }

  const appId = process.env.META_APP_ID;
  const appSecret = process.env.META_APP_SECRET;

  if (!appId || !appSecret) {
    return NextResponse.json({ error: "Meta credentials not configured" }, { status: 500 });
  }

  const accessToken = `${appId}|${appSecret}`;

  const params = new URLSearchParams({
    access_token: accessToken,
    search_terms: q.trim(),
    ad_type: "ALL",
    ad_active_status: "ALL",
    fields: [
      "id","ad_creation_time","ad_creative_bodies","ad_creative_link_captions",
      "ad_creative_link_descriptions","ad_creative_link_titles",
      "ad_delivery_start_time","ad_delivery_stop_time",
      "ad_snapshot_url","page_name","page_id",
      "impressions","spend","currency","publisher_platforms",
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
      `https://graph.facebook.com/v25.0/ads_archive?${params.toString()}`,
      { headers: { "User-Agent": "Mozilla/5.0" }, next: { revalidate: 300 } }
    );

    const data = await res.json();

    if (data.error) {
      return NextResponse.json(
        { error: data.error.message, code: data.error.code, type: data.error.type },
        { status: 400 }
      );
    }

    return NextResponse.json({
      ads: data.data || [],
      nextCursor: data.paging?.cursors?.after || null,
      hasMore: !!data.paging?.next,
      total: data.data?.length || 0,
      query: q.trim(),
      country,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
