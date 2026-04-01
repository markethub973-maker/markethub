import { NextResponse } from "next/server";
import { resolveIGAuth } from "@/lib/adminPlatformToken";

export async function GET() {
  const auth = await resolveIGAuth();
  if (!auth) return NextResponse.json({ error: "Instagram not connected" }, { status: 401 });

  const { token, igId } = auth;

  try {
    // Fetch active stories
    const storiesRes = await fetch(
      `https://graph.facebook.com/v21.0/${igId}/stories?fields=id,media_type,timestamp,media_url&access_token=${token}`
    );
    const storiesData = await storiesRes.json();

    if (storiesData.error) {
      return NextResponse.json({ error: storiesData.error.message, stories: [], summary: null }, { status: 200 });
    }

    const stories = storiesData.data || [];

    if (stories.length === 0) {
      return NextResponse.json({ stories: [], summary: null, message: "No active stories" });
    }

    // Fetch insights per story
    const withInsights = await Promise.allSettled(
      stories.map(async (s: { id: string; timestamp: string; media_type: string; media_url?: string }) => {
        const insRes = await fetch(
          `https://graph.facebook.com/v21.0/${s.id}/insights?metric=exits,impressions,reach,replies,taps_forward,taps_back&access_token=${token}`
        );
        const insData = await insRes.json();
        const m: Record<string, number> = {};
        for (const item of insData.data || []) {
          m[item.name] = item.values?.[0]?.value ?? item.value ?? 0;
        }
        const reach = m.reach || 0;
        const exits = m.exits || 0;
        const exit_rate = reach > 0 ? parseFloat(((exits / reach) * 100).toFixed(1)) : 0;
        const replies = m.replies || 0;
        const reply_rate = reach > 0 ? parseFloat(((replies / reach) * 100).toFixed(1)) : 0;
        return {
          id: s.id,
          timestamp: s.timestamp,
          media_type: s.media_type,
          media_url: s.media_url || null,
          impressions: m.impressions || 0,
          reach,
          exits,
          exit_rate,
          replies,
          reply_rate,
          taps_forward: m.taps_forward || 0,
          taps_back: m.taps_back || 0,
        };
      })
    );

    const result = withInsights
      .filter(r => r.status === "fulfilled")
      .map(r => (r as PromiseFulfilledResult<unknown>).value as Record<string, unknown>);

    const totalReach = result.reduce((s, r) => s + (r.reach as number), 0);
    const avgExitRate = result.length
      ? parseFloat((result.reduce((s, r) => s + (r.exit_rate as number), 0) / result.length).toFixed(1))
      : 0;
    const avgReplyRate = result.length
      ? parseFloat((result.reduce((s, r) => s + (r.reply_rate as number), 0) / result.length).toFixed(2))
      : 0;
    const totalReplies = result.reduce((s, r) => s + (r.replies as number), 0);

    return NextResponse.json({
      stories: result,
      summary: {
        total: result.length,
        total_reach: totalReach,
        avg_exit_rate: avgExitRate,
        avg_reply_rate: avgReplyRate,
        total_replies: totalReplies,
      },
    });
  } catch (err) {
    console.error("[Stories] Error:", err);
    return NextResponse.json({ error: "Failed to fetch stories" }, { status: 500 });
  }
}
