import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: profile } = await supabase
    .from("profiles")
    .select("instagram_access_token")
    .eq("id", user.id)
    .single();

  if (!profile?.instagram_access_token) {
    return NextResponse.json({ error: "Instagram not connected" }, { status: 400 });
  }

  const token = profile.instagram_access_token;
  const params = req.nextUrl.searchParams;
  const searchTerms = params.get("q")?.trim() || "";
  const country = params.get("country") || "RO";
  const adType = params.get("adType") || "ALL";
  const limit = Math.min(parseInt(params.get("limit") || "20"), 50);

  if (!searchTerms) return NextResponse.json({ error: "Search terms required" }, { status: 400 });

  try {
    const fields = [
      "id",
      "ad_creation_time",
      "ad_delivery_start_time",
      "ad_delivery_stop_time",
      "ad_creative_bodies",
      "ad_creative_link_captions",
      "ad_creative_link_descriptions",
      "ad_creative_link_titles",
      "ad_snapshot_url",
      "currency",
      "delivery_by_region",
      "demographic_distribution",
      "estimated_audience_size",
      "impressions",
      "page_id",
      "page_name",
      "publisher_platforms",
      "spend",
      "languages",
    ].join(",");

    const url = new URL("https://graph.facebook.com/v21.0/ads_archive");
    url.searchParams.set("access_token", token);
    url.searchParams.set("search_terms", searchTerms);
    url.searchParams.set("ad_reached_countries", `["${country}"]`);
    url.searchParams.set("ad_type", adType);
    url.searchParams.set("ad_active_status", "ACTIVE");
    url.searchParams.set("limit", String(limit));
    url.searchParams.set("fields", fields);

    const res = await fetch(url.toString());
    const data = await res.json();

    if (data.error) {
      // If no ads_archive permission, return helpful message
      if (data.error.code === 200 || data.error.message?.includes("permission")) {
        return NextResponse.json({
          error: "Tokenul tău Instagram nu are permisiunea 'ads_read' necesară pentru Meta Ads Library. Reconectează contul cu permisiunile extinse.",
          errorCode: "NO_PERMISSION",
        }, { status: 403 });
      }
      return NextResponse.json({ error: data.error.message }, { status: 400 });
    }

    const ads = (data.data || []).map((ad: any) => ({
      id: ad.id,
      pageName: ad.page_name || "Necunoscut",
      pageId: ad.page_id,
      createdAt: ad.ad_creation_time,
      startDate: ad.ad_delivery_start_time,
      endDate: ad.ad_delivery_stop_time || null,
      body: ad.ad_creative_bodies?.[0] || "",
      linkTitle: ad.ad_creative_link_titles?.[0] || "",
      linkCaption: ad.ad_creative_link_captions?.[0] || "",
      linkDescription: ad.ad_creative_link_descriptions?.[0] || "",
      snapshotUrl: ad.ad_snapshot_url || "",
      platforms: ad.publisher_platforms || [],
      impressions: ad.impressions || null,
      spend: ad.spend || null,
      currency: ad.currency || "EUR",
      audienceSize: ad.estimated_audience_size || null,
      languages: ad.languages || [],
      demographicDistribution: ad.demographic_distribution || [],
      deliveryByRegion: ad.delivery_by_region || [],
    }));

    return NextResponse.json({
      ads,
      total: ads.length,
      searchTerms,
      country,
      hasMore: !!data.paging?.next,
      nextCursor: data.paging?.cursors?.after || null,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
