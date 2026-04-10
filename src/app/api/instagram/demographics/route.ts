import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { requireAuth } from "@/lib/route-helpers";

export async function GET() {
  const auth = await requireAuth();
  if (!auth.ok) return auth.response;
  const user = { id: auth.userId };
  const supabase = await createClient();

  const { data: profile } = await supabase
    .from("profiles")
    .select("instagram_access_token, instagram_user_id")
    .eq("id", auth.userId)
    .single();

  if (!profile?.instagram_access_token || !profile?.instagram_user_id) {
    return NextResponse.json({ error: "Instagram not connected" }, { status: 400 });
  }

  const token = profile.instagram_access_token;
  const igId = profile.instagram_user_id;

  try {
    const [demoRes, profileRes] = await Promise.all([
      fetch(
        `https://graph.facebook.com/v22.0/${igId}/insights?metric=audience_gender_age,audience_city,audience_country,audience_locale&period=lifetime&access_token=${token}`
      ),
      fetch(
        `https://graph.facebook.com/v22.0/${igId}?fields=followers_count&access_token=${token}`
      ),
    ]);

    const [demoData, profileData] = await Promise.all([demoRes.json(), profileRes.json()]);

    if (demoData.error) {
      return NextResponse.json({ error: demoData.error.message }, { status: 400 });
    }

    const metrics: Record<string, any> = {};
    for (const m of (demoData.data || [])) {
      metrics[m.name] = m.values?.[0]?.value || {};
    }

    // Process gender/age
    const genderAge: Record<string, Record<string, number>> = { M: {}, F: {}, U: {} };
    for (const [key, val] of Object.entries(metrics.audience_gender_age || {})) {
      const [gender, age] = key.split(".");
      if (!genderAge[gender]) genderAge[gender] = {};
      genderAge[gender][age] = (genderAge[gender][age] || 0) + (val as number);
    }

    // Top cities
    const cities = Object.entries(metrics.audience_city || {})
      .sort((a, b) => (b[1] as number) - (a[1] as number))
      .slice(0, 10)
      .map(([city, count]) => ({ city, count: count as number }));

    // Top countries
    const countries = Object.entries(metrics.audience_country || {})
      .sort((a, b) => (b[1] as number) - (a[1] as number))
      .slice(0, 10)
      .map(([country, count]) => ({ country, count: count as number }));

    // Gender split
    const mTotal = Object.values(genderAge.M || {}).reduce((s, v) => s + v, 0);
    const fTotal = Object.values(genderAge.F || {}).reduce((s, v) => s + v, 0);
    const uTotal = Object.values(genderAge.U || {}).reduce((s, v) => s + v, 0);
    const totalAudience = mTotal + fTotal + uTotal || 1;

    // Age brackets (sum M+F+U)
    const ageMap: Record<string, number> = {};
    for (const genderData of Object.values(genderAge)) {
      for (const [age, count] of Object.entries(genderData)) {
        ageMap[age] = (ageMap[age] || 0) + count;
      }
    }
    const ageBrackets = Object.entries(ageMap)
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([age, count]) => ({ age, count, pct: Math.round((count / totalAudience) * 100) }));

    return NextResponse.json({
      followers: profileData.followers_count || 0,
      genderSplit: {
        male: Math.round((mTotal / totalAudience) * 100),
        female: Math.round((fTotal / totalAudience) * 100),
        unknown: Math.round((uTotal / totalAudience) * 100),
      },
      ageBrackets,
      topCities: cities,
      topCountries: countries,
      genderAge,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
