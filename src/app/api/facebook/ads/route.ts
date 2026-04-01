import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * Facebook Ad Account Insights via Meta Graph API
 * Requires ads_read permission on the access token
 */
export async function GET(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: profile } = await supabase
    .from("profiles")
    .select("instagram_access_token")
    .eq("id", user.id)
    .single();

  const token = profile?.instagram_access_token || process.env.META_ACCESS_TOKEN;
  if (!token) return NextResponse.json({ error: "Meta not connected" }, { status: 401 });

  const preset = req.nextUrl.searchParams.get("preset") || "last_30d";

  try {
    // Step 1: Find ad accounts linked to this user/token
    const accountsRes = await fetch(
      `https://graph.facebook.com/v21.0/me/adaccounts?fields=id,name,account_status,currency,spend_cap&access_token=${token}`
    );
    const accountsData = await accountsRes.json();

    if (accountsData.error) {
      return NextResponse.json({
        error: accountsData.error.message,
        needs_permission: accountsData.error.code === 200 || accountsData.error.type === "OAuthException",
        accounts: [],
        insights: null,
      }, { status: 200 });
    }

    const accounts = accountsData.data || [];
    if (accounts.length === 0) {
      return NextResponse.json({ accounts: [], insights: null, message: "No ad accounts found" });
    }

    // Step 2: Fetch insights for each active ad account
    const insightsResults = await Promise.allSettled(
      accounts.slice(0, 5).map(async (acc: { id: string; name: string; account_status: number; currency: string }) => {
        const insRes = await fetch(
          `https://graph.facebook.com/v21.0/${acc.id}/insights?fields=impressions,clicks,spend,cpm,cpc,ctr,reach,frequency,actions&date_preset=${preset}&access_token=${token}`
        );
        const insData = await insRes.json();
        const ins = insData.data?.[0] || {};

        // Extract conversions from actions
        const actions: Array<{ action_type: string; value: string }> = ins.actions || [];
        const conversions = actions
          .filter(a => a.action_type.includes("purchase") || a.action_type.includes("lead") || a.action_type.includes("complete_registration"))
          .reduce((s, a) => s + parseFloat(a.value || "0"), 0);

        const spend = parseFloat(ins.spend || "0");
        const roas = conversions > 0 && spend > 0 ? parseFloat((conversions / spend).toFixed(2)) : 0;

        return {
          account_id: acc.id,
          account_name: acc.name,
          currency: acc.currency,
          status: acc.account_status,
          impressions: parseInt(ins.impressions || "0"),
          clicks: parseInt(ins.clicks || "0"),
          spend: parseFloat((spend).toFixed(2)),
          cpm: parseFloat(parseFloat(ins.cpm || "0").toFixed(2)),
          cpc: parseFloat(parseFloat(ins.cpc || "0").toFixed(2)),
          ctr: parseFloat(parseFloat(ins.ctr || "0").toFixed(2)),
          reach: parseInt(ins.reach || "0"),
          frequency: parseFloat(parseFloat(ins.frequency || "0").toFixed(2)),
          conversions: Math.round(conversions),
          roas,
        };
      })
    );

    type AdInsight = {
      account_id: string; account_name: string; currency: string; status: number;
      impressions: number; clicks: number; spend: number;
      cpm: number; cpc: number; ctr: number; reach: number; frequency: number;
      conversions: number; roas: number;
    };

    const insights = insightsResults
      .filter(r => r.status === "fulfilled")
      .map(r => (r as PromiseFulfilledResult<AdInsight>).value);

    const totals = {
      total_spend: parseFloat(insights.reduce((s, i) => s + i.spend, 0).toFixed(2)),
      total_impressions: insights.reduce((s, i) => s + i.impressions, 0),
      total_clicks: insights.reduce((s, i) => s + i.clicks, 0),
      avg_cpm: insights.length ? parseFloat((insights.reduce((s, i) => s + i.cpm, 0) / insights.length).toFixed(2)) : 0,
      avg_cpc: insights.length ? parseFloat((insights.reduce((s, i) => s + i.cpc, 0) / insights.length).toFixed(2)) : 0,
      avg_ctr: insights.length ? parseFloat((insights.reduce((s, i) => s + i.ctr, 0) / insights.length).toFixed(2)) : 0,
      total_conversions: insights.reduce((s, i) => s + i.conversions, 0),
      avg_roas: insights.length ? parseFloat((insights.reduce((s, i) => s + i.roas, 0) / insights.length).toFixed(2)) : 0,
    };

    return NextResponse.json({ accounts: insights, totals, preset });
  } catch (err) {
    console.error("[FB Ads] Error:", err);
    return NextResponse.json({ error: "Failed to fetch ad insights" }, { status: 500 });
  }
}
