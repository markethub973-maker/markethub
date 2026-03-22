import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("instagram_access_token")
    .eq("id", user.id)
    .single();

  if (!profile?.instagram_access_token) {
    return NextResponse.json({ error: "Meta not connected" }, { status: 400 });
  }

  const token = profile.instagram_access_token;

  try {
    // Try me/accounts first
    const accountsRes = await fetch(
      `https://graph.facebook.com/v21.0/me/accounts?fields=id,name,fan_count,followers_count,access_token&access_token=${token}`
    );
    const accountsData = await accountsRes.json();

    let pageId: string | null = null;
    let pageToken: string = token;

    if (accountsData.data?.length > 0) {
      pageId = accountsData.data[0].id;
      pageToken = accountsData.data[0].access_token || token;
    } else {
      // Fallback to env page IDs
      const knownIds = (process.env.FACEBOOK_PAGE_IDS || "").split(",").filter(Boolean);
      if (knownIds.length > 0) pageId = knownIds[0];
    }

    if (!pageId) {
      return NextResponse.json({ error: "No Facebook page found" }, { status: 400 });
    }

    // Get page details
    const pageRes = await fetch(
      `https://graph.facebook.com/v21.0/${pageId}?fields=id,name,fan_count,followers_count,about,website,picture&access_token=${pageToken}`
    );
    const pageData = await pageRes.json();

    if (pageData.error) {
      return NextResponse.json({ error: pageData.error.message }, { status: 400 });
    }

    // Get page insights
    const since = Math.floor(Date.now() / 1000) - 30 * 86400;
    const until = Math.floor(Date.now() / 1000);
    const insightsRes = await fetch(
      `https://graph.facebook.com/v21.0/${pageId}/insights?metric=page_impressions_unique,page_reach,page_views_total&period=day&since=${since}&until=${until}&access_token=${pageToken}`
    );
    const insightsData = await insightsRes.json();

    return NextResponse.json({
      id: pageData.id,
      name: pageData.name,
      fan_count: pageData.fan_count || 0,
      followers_count: pageData.followers_count || 0,
      about: pageData.about || null,
      website: pageData.website || null,
      picture: pageData.picture?.data?.url || null,
      insights: insightsData.data || [],
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
