import { NextResponse } from "next/server";
import { resolveIGAuth } from "@/lib/adminPlatformToken";
import { createClient } from "@/lib/supabase/server";

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const auth = await resolveIGAuth();
  const { data: profile } = await supabase
    .from("profiles")
    .select("instagram_access_token, instagram_user_id")
    .eq("id", user.id)
    .single();

  const token = auth?.token || profile?.instagram_access_token || process.env.META_ACCESS_TOKEN;
  const igId = auth?.igId || profile?.instagram_user_id || process.env.INSTAGRAM_ACCOUNT_ID;

  if (!token || !igId) return NextResponse.json({ error: "Meta not connected" }, { status: 401 });

  try {
    const [igDemoRes, fbFansRes, fbPageRes] = await Promise.allSettled([
      // IG audience gender/age + country
      fetch(
        `https://graph.facebook.com/v21.0/${igId}/insights?metric=audience_gender_age,audience_country&period=lifetime&access_token=${token}`
      ).then(r => r.json()),

      // FB page fan demographics
      fetch(
        `https://graph.facebook.com/v21.0/me/insights?metric=page_fans_gender_age,page_fans_country&period=lifetime&access_token=${token}`
      ).then(r => r.json()),

      // FB page follower count
      fetch(
        `https://graph.facebook.com/v21.0/me?fields=fan_count,followers_count&access_token=${token}`
      ).then(r => r.json()),
    ]);

    let igGenderAge: Record<string, number> = {};
    let igCountry: Record<string, number> = {};
    let fbGenderAge: Record<string, number> = {};
    let fbCountry: Record<string, number> = {};
    let fbFanCount = 0;
    let fbFollowerCount = 0;

    if (igDemoRes.status === "fulfilled" && igDemoRes.value?.data) {
      for (const item of igDemoRes.value.data) {
        if (item.name === "audience_gender_age") igGenderAge = item.values?.[0]?.value || {};
        if (item.name === "audience_country") igCountry = item.values?.[0]?.value || {};
      }
    }

    if (fbFansRes.status === "fulfilled" && fbFansRes.value?.data) {
      for (const item of fbFansRes.value.data) {
        if (item.name === "page_fans_gender_age") fbGenderAge = item.values?.[0]?.value || {};
        if (item.name === "page_fans_country") fbCountry = item.values?.[0]?.value || {};
      }
    }

    if (fbPageRes.status === "fulfilled" && !fbPageRes.value?.error) {
      fbFanCount = fbPageRes.value.fan_count || 0;
      fbFollowerCount = fbPageRes.value.followers_count || 0;
    }

    // Calculate gender overlap
    const genderGroups = ["M", "F", "U"];
    const igGenderTotals: Record<string, number> = { M: 0, F: 0, U: 0 };
    const fbGenderTotals: Record<string, number> = { M: 0, F: 0, U: 0 };

    for (const [key, val] of Object.entries(igGenderAge)) {
      const gender = key.split(".")[0];
      if (genderGroups.includes(gender)) igGenderTotals[gender] = (igGenderTotals[gender] || 0) + val;
    }
    for (const [key, val] of Object.entries(fbGenderAge)) {
      const gender = key.split(".")[0];
      if (genderGroups.includes(gender)) fbGenderTotals[gender] = (fbGenderTotals[gender] || 0) + val;
    }

    const igTotal = Object.values(igGenderTotals).reduce((s, v) => s + v, 0) || 1;
    const fbTotal = Object.values(fbGenderTotals).reduce((s, v) => s + v, 0) || 1;

    const genderOverlap = genderGroups.map(g => ({
      gender: g === "M" ? "Male" : g === "F" ? "Female" : "Unknown",
      ig_pct: parseFloat(((igGenderTotals[g] / igTotal) * 100).toFixed(1)),
      fb_pct: parseFloat(((fbGenderTotals[g] / fbTotal) * 100).toFixed(1)),
      overlap_pct: parseFloat(
        (Math.min(igGenderTotals[g] / igTotal, fbGenderTotals[g] / fbTotal) * 100).toFixed(1)
      ),
    }));

    // Top countries overlap
    const allCountries = new Set([...Object.keys(igCountry), ...Object.keys(fbCountry)]);
    const igCountryTotal = Object.values(igCountry).reduce((s, v) => s + v, 0) || 1;
    const fbCountryTotal = Object.values(fbCountry).reduce((s, v) => s + v, 0) || 1;

    const countryOverlap = Array.from(allCountries)
      .map(cc => {
        const ig_pct = parseFloat((((igCountry[cc] || 0) / igCountryTotal) * 100).toFixed(1));
        const fb_pct = parseFloat((((fbCountry[cc] || 0) / fbCountryTotal) * 100).toFixed(1));
        return {
          country: cc,
          ig_pct,
          fb_pct,
          overlap_pct: parseFloat((Math.min(ig_pct, fb_pct)).toFixed(1)),
        };
      })
      .sort((a, b) => b.overlap_pct - a.overlap_pct)
      .slice(0, 10);

    // Overall overlap score (Jaccard-like on gender)
    const totalOverlapPct = parseFloat(
      genderOverlap.reduce((s, g) => s + g.overlap_pct, 0).toFixed(1)
    );

    return NextResponse.json({
      gender_overlap: genderOverlap,
      country_overlap: countryOverlap,
      fb_fan_count: fbFanCount,
      fb_follower_count: fbFollowerCount,
      overall_overlap_pct: totalOverlapPct,
      has_ig_data: Object.keys(igGenderAge).length > 0,
      has_fb_data: Object.keys(fbGenderAge).length > 0,
    });
  } catch (err) {
    console.error("[Audience Overlap] Error:", err);
    return NextResponse.json({ error: "Failed to fetch audience overlap" }, { status: 500 });
  }
}
