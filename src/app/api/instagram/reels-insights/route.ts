import { NextRequest, NextResponse } from "next/server";
import { resolveIGAuth } from "@/lib/adminPlatformToken";

/**
 * Instagram Reels Insights via Meta Graph API
 * Returns plays, reach, shares, saves, comments for user's Reels
 */
export async function GET(req: NextRequest) {
  const auth = await resolveIGAuth();

  const accessToken = auth?.token || process.env.INSTAGRAM_ACCESS_TOKEN;
  const accountId = auth?.igId || process.env.INSTAGRAM_BUSINESS_ACCOUNT_ID;

  if (!accessToken || !accountId) {
    return NextResponse.json({
      error: "Instagram not connected",
      message: "Connect your Instagram Business account in Settings → Integrations",
    }, { status: 400 });
  }

  const limit = req.nextUrl.searchParams.get("limit") || "12";

  try {
    // Fetch recent media (Reels only)
    const mediaRes = await fetch(
      `https://graph.facebook.com/v21.0/${accountId}/media?fields=id,media_type,media_product_type,timestamp,caption,thumbnail_url,permalink&limit=${limit}&access_token=${accessToken}`
    );
    const mediaData = await mediaRes.json();

    if (mediaData.error) {
      return NextResponse.json({ error: mediaData.error.message }, { status: 400 });
    }

    const reels = (mediaData.data || []).filter(
      (m: { media_type?: string; media_product_type?: string }) =>
        m.media_type === "VIDEO" || m.media_product_type === "REELS"
    );

    if (reels.length === 0) {
      return NextResponse.json({ reels: [], message: "No Reels found" });
    }

    // Fetch insights for each Reel
    const insights = await Promise.allSettled(
      reels.map(async (reel: { id: string; timestamp: string; caption?: string; thumbnail_url?: string; permalink?: string }) => {
        const metricsRes = await fetch(
          `https://graph.facebook.com/v21.0/${reel.id}/insights?metric=plays,reach,shares,saved,comments,likes,total_interactions&access_token=${accessToken}`
        );
        const metricsData = await metricsRes.json();
        const m: Record<string, number> = {};
        for (const item of metricsData.data || []) {
          m[item.name] = item.values?.[0]?.value ?? item.value ?? 0;
        }
        return {
          id: reel.id,
          timestamp: reel.timestamp,
          caption: reel.caption || "",
          thumbnail: reel.thumbnail_url || null,
          permalink: reel.permalink || "",
          plays: m.plays || 0,
          reach: m.reach || 0,
          shares: m.shares || 0,
          saves: m.saved || 0,
          comments: m.comments || 0,
          likes: m.likes || 0,
          total_interactions: m.total_interactions || 0,
          engagement_rate: m.reach > 0 ? parseFloat(((m.total_interactions / m.reach) * 100).toFixed(2)) : 0,
        };
      })
    );

    const reelInsights = insights
      .filter(r => r.status === "fulfilled")
      .map(r => (r as PromiseFulfilledResult<ReturnType<typeof Object>>).value);

    return NextResponse.json({
      reels: reelInsights,
      total: reelInsights.length,
      avg_plays: reelInsights.length ? Math.round(reelInsights.reduce((s: number, r: Record<string, number>) => s + r.plays, 0) / reelInsights.length) : 0,
      avg_reach: reelInsights.length ? Math.round(reelInsights.reduce((s: number, r: Record<string, number>) => s + r.reach, 0) / reelInsights.length) : 0,
    });
  } catch (err) {
    console.error("[Reels Insights] Error:", err);
    return NextResponse.json({ error: "Failed to fetch Reels insights" }, { status: 500 });
  }
}
