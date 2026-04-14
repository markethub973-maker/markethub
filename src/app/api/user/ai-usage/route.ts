/**
 * GET /api/user/ai-usage — current user's spend across AI features.
 *
 * Returns same shape as admin /api/admin/ai-usage but scoped to the
 * authenticated user. Lets customers see exactly what they're spending
 * before it shows up on a Stripe invoice.
 */

import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

interface FeatureRow {
  feature: string;
  runs_30d: number;
  runs_7d: number;
  runs_24h: number;
  cost_usd_30d: number;
  cost_usd_7d: number;
  cost_usd_24h: number;
}

export async function GET() {
  const supa = await createClient();
  const { data: { user } } = await supa.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const now = Date.now();
  const day = 24 * 3600 * 1000;
  const day1 = new Date(now - day).toISOString();
  const day7 = new Date(now - 7 * day).toISOString();
  const day30 = new Date(now - 30 * day).toISOString();

  const [imgs, vids, audios] = await Promise.all([
    supa
      .from("ai_image_generations")
      .select("cost_usd,created_at,status")
      .eq("user_id", user.id)
      .gte("created_at", day30),
    supa
      .from("ai_video_generations")
      .select("cost_usd,created_at,status")
      .eq("user_id", user.id)
      .gte("created_at", day30),
    supa
      .from("ai_audio_generations")
      .select("cost_usd,created_at,status")
      .eq("user_id", user.id)
      .gte("created_at", day30),
  ]);

  type Row = { cost_usd: number | null; created_at: string; status: string };

  const summarize = (rows: Row[], feature: string): FeatureRow => {
    const all = rows ?? [];
    const last1 = all.filter((r) => r.created_at >= day1);
    const last7 = all.filter((r) => r.created_at >= day7);
    const sum = (xs: Row[]) =>
      Math.round(xs.reduce((s, r) => s + (Number(r.cost_usd) || 0), 0) * 10000) / 10000;
    return {
      feature,
      runs_30d: all.length,
      runs_7d: last7.length,
      runs_24h: last1.length,
      cost_usd_30d: sum(all),
      cost_usd_7d: sum(last7),
      cost_usd_24h: sum(last1),
    };
  };

  const features = [
    summarize((imgs.data ?? []) as Row[], "image"),
    summarize((vids.data ?? []) as Row[], "video"),
    summarize((audios.data ?? []) as Row[], "audio"),
  ];

  const total_cost_30d = features.reduce((s, f) => s + f.cost_usd_30d, 0);
  const total_cost_7d = features.reduce((s, f) => s + f.cost_usd_7d, 0);
  const total_cost_24h = features.reduce((s, f) => s + f.cost_usd_24h, 0);
  const total_runs_30d = features.reduce((s, f) => s + f.runs_30d, 0);

  return NextResponse.json({
    ok: true,
    summary: {
      total_cost_usd_30d: Math.round(total_cost_30d * 100) / 100,
      total_cost_usd_7d: Math.round(total_cost_7d * 100) / 100,
      total_cost_usd_24h: Math.round(total_cost_24h * 100) / 100,
      total_runs_30d,
    },
    features,
  });
}
