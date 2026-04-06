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
    let pageId: string | null = null;
    let pageToken: string = token;

    // Strategy 1: Token might be a Page Token — /me returns the page directly
    const meRes = await fetch(
      `https://graph.facebook.com/v22.0/me?fields=id,name,fan_count,followers_count,about,website,picture&access_token=${token}`
    );
    const meData = await meRes.json();

    // If /me returns fan_count, the token IS a page token — we already have page data
    if (!meData.error && meData.fan_count !== undefined) {
      return NextResponse.json({
        id: meData.id,
        name: meData.name,
        fan_count: meData.fan_count || 0,
        followers_count: meData.followers_count || 0,
        about: meData.about || null,
        website: meData.website || null,
        picture: meData.picture?.data?.url || null,
        insights: await getInsights(meData.id, token),
      });
    }

    // Strategy 2: Token is a User Token — get pages via /me/accounts
    const accountsRes = await fetch(
      `https://graph.facebook.com/v22.0/me/accounts?fields=id,name,fan_count,followers_count,access_token&access_token=${token}`
    );
    const accountsData = await accountsRes.json();

    if (accountsData.data?.length > 0) {
      pageId = accountsData.data[0].id;
      pageToken = accountsData.data[0].access_token || token;
    }

    // Strategy 3: Fallback to env page IDs
    if (!pageId) {
      const knownIds = (process.env.FACEBOOK_PAGE_IDS || "").split(",").filter(Boolean);
      if (knownIds.length > 0) pageId = knownIds[0];
    }

    if (!pageId) {
      return NextResponse.json({ error: "No Facebook page found" }, { status: 400 });
    }

    // Get page details
    const pageRes = await fetch(
      `https://graph.facebook.com/v22.0/${pageId}?fields=id,name,fan_count,followers_count,about,website,picture&access_token=${pageToken}`
    );
    const pageData = await pageRes.json();

    if (pageData.error) {
      return NextResponse.json({ error: pageData.error.message }, { status: 400 });
    }

    return NextResponse.json({
      id: pageData.id,
      name: pageData.name,
      fan_count: pageData.fan_count || 0,
      followers_count: pageData.followers_count || 0,
      about: pageData.about || null,
      website: pageData.website || null,
      picture: pageData.picture?.data?.url || null,
      insights: await getInsights(pageId, pageToken),
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

async function getInsights(pageId: string, token: string): Promise<any[]> {
  try {
    const since = Math.floor(Date.now() / 1000) - 30 * 86400;
    const until = Math.floor(Date.now() / 1000);
    const res = await fetch(
      `https://graph.facebook.com/v22.0/${pageId}/insights?metric=page_impressions_unique,page_views_total&period=day&since=${since}&until=${until}&access_token=${token}`
    );
    const data = await res.json();
    return data.error ? [] : (data.data || []);
  } catch {
    return [];
  }
}
