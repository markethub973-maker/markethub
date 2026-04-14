/**
 * Admin AI Usage — aggregate cost + volume across all AI features.
 *
 * Combines ai_image_generations, ai_video_generations, automation_runs,
 * consultant_conversations for a unified view of:
 *  - total cost last 30 days
 *  - cost per feature
 *  - top users by spend
 *  - hourly trend (last 7 days)
 *  - failure rate per feature
 */

import { NextRequest, NextResponse } from "next/server";
import { isAdminAuthorized } from "@/lib/adminAuth";
import { createServiceClient } from "@/lib/supabase/service";

export const dynamic = "force-dynamic";

interface FeatureStats {
  feature: string;
  runs_30d: number;
  runs_24h: number;
  cost_usd_30d: number;
  cost_usd_24h: number;
  failure_rate_30d: number;
  avg_duration_ms: number | null;
}

export async function GET(req: NextRequest) {
  if (!isAdminAuthorized(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const service = createServiceClient();
  const now = Date.now();
  const day = 24 * 3600 * 1000;
  const day1 = new Date(now - day).toISOString();
  const day30 = new Date(now - 30 * day).toISOString();

  // Pull in parallel
  const [imgs, vids, autos, consults] = await Promise.all([
    service
      .from("ai_image_generations")
      .select("user_id,status,cost_usd,duration_ms,created_at")
      .gte("created_at", day30)
      .limit(10000),
    service
      .from("ai_video_generations")
      .select("user_id,status,cost_usd,duration_ms,created_at")
      .gte("created_at", day30)
      .limit(10000),
    service
      .from("automation_runs")
      .select("user_id,status,duration_ms,started_at")
      .gte("started_at", day30)
      .limit(10000),
    service
      .from("consultant_conversations")
      .select("user_id,created_at")
      .gte("created_at", day30)
      .limit(20000),
  ]);

  const summarize = (
    rows: Array<{ user_id?: string | null; status: string; cost_usd: number | null; duration_ms: number | null; created_at: string }>,
    feature: string,
  ): FeatureStats => {
    const last24 = rows.filter((r) => r.created_at >= day1);
    const failed = rows.filter((r) => r.status === "failed").length;
    const successful = rows.filter(
      (r) => r.status === "succeeded" || r.status === "ok",
    );
    const totalCost = rows.reduce((s, r) => s + (Number(r.cost_usd) || 0), 0);
    const totalCost24 = last24.reduce((s, r) => s + (Number(r.cost_usd) || 0), 0);
    const durations = successful.map((r) => r.duration_ms).filter((d): d is number => typeof d === "number" && d > 0);
    const avgDuration = durations.length
      ? Math.round(durations.reduce((s, d) => s + d, 0) / durations.length)
      : null;
    return {
      feature,
      runs_30d: rows.length,
      runs_24h: last24.length,
      cost_usd_30d: Math.round(totalCost * 10000) / 10000,
      cost_usd_24h: Math.round(totalCost24 * 10000) / 10000,
      failure_rate_30d: rows.length > 0 ? Math.round((failed / rows.length) * 1000) / 10 : 0,
      avg_duration_ms: avgDuration,
    };
  };

  type Row = {
    user_id?: string | null;
    status: string;
    cost_usd: number | null;
    duration_ms: number | null;
    created_at: string;
  };

  // Normalize automation_runs (uses started_at instead of created_at + no cost)
  const autosNormalized: Row[] = (autos.data ?? []).map((r) => ({
    user_id: r.user_id as string | null,
    status: r.status as string,
    cost_usd: null,
    duration_ms: r.duration_ms as number | null,
    created_at: r.started_at as string,
  }));

  // Consultant — each row = 1 call at ~$0.002 fixed (Haiku estimate)
  const consultNormalized: Row[] = (consults.data ?? []).map((r) => ({
    user_id: r.user_id as string | null,
    status: "ok",
    cost_usd: 0.002,
    duration_ms: null,
    created_at: r.created_at as string,
  }));

  const features = [
    summarize((imgs.data ?? []) as Row[], "image"),
    summarize((vids.data ?? []) as Row[], "video"),
    summarize(autosNormalized, "automation"),
    summarize(consultNormalized, "consultant"),
  ];

  const totalCost30d = features.reduce((s, f) => s + f.cost_usd_30d, 0);
  const totalCost24h = features.reduce((s, f) => s + f.cost_usd_24h, 0);
  const totalRuns30d = features.reduce((s, f) => s + f.runs_30d, 0);

  // Top users by spend (images + videos — the only ones with real cost)
  const userSpend = new Map<string, { image_cost: number; video_cost: number; total_cost: number; runs: number }>();
  for (const r of imgs.data ?? []) {
    if (!r.user_id) continue;
    const s = userSpend.get(r.user_id as string) ?? { image_cost: 0, video_cost: 0, total_cost: 0, runs: 0 };
    const c = Number(r.cost_usd) || 0;
    s.image_cost += c;
    s.total_cost += c;
    s.runs += 1;
    userSpend.set(r.user_id as string, s);
  }
  for (const r of vids.data ?? []) {
    if (!r.user_id) continue;
    const s = userSpend.get(r.user_id as string) ?? { image_cost: 0, video_cost: 0, total_cost: 0, runs: 0 };
    const c = Number(r.cost_usd) || 0;
    s.video_cost += c;
    s.total_cost += c;
    s.runs += 1;
    userSpend.set(r.user_id as string, s);
  }

  const topUserEntries = Array.from(userSpend.entries())
    .sort(([, a], [, b]) => b.total_cost - a.total_cost)
    .slice(0, 15);

  // Fetch emails for top users
  const topUserIds = topUserEntries.map(([id]) => id);
  let emailMap = new Map<string, string>();
  if (topUserIds.length > 0) {
    const { data: profiles } = await service
      .from("profiles")
      .select("id,email")
      .in("id", topUserIds);
    emailMap = new Map((profiles ?? []).map((p) => [p.id as string, p.email as string]));
  }

  const top_users = topUserEntries.map(([uid, s]) => ({
    user_id: uid,
    email: emailMap.get(uid) ?? null,
    runs: s.runs,
    image_cost_usd: Math.round(s.image_cost * 10000) / 10000,
    video_cost_usd: Math.round(s.video_cost * 10000) / 10000,
    total_cost_usd: Math.round(s.total_cost * 10000) / 10000,
  }));

  // Hourly trend last 7 days — total cost per hour
  const day7 = now - 7 * day;
  const hourBuckets: Record<string, number> = {};
  for (const r of imgs.data ?? []) {
    const t = new Date(r.created_at as string).getTime();
    if (t < day7) continue;
    const hour = new Date(t).toISOString().slice(0, 13) + ":00Z";
    hourBuckets[hour] = (hourBuckets[hour] ?? 0) + (Number(r.cost_usd) || 0);
  }
  for (const r of vids.data ?? []) {
    const t = new Date(r.created_at as string).getTime();
    if (t < day7) continue;
    const hour = new Date(t).toISOString().slice(0, 13) + ":00Z";
    hourBuckets[hour] = (hourBuckets[hour] ?? 0) + (Number(r.cost_usd) || 0);
  }
  const trend = Object.entries(hourBuckets)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([hour, cost]) => ({ hour, cost_usd: Math.round(cost * 10000) / 10000 }));

  return NextResponse.json({
    ok: true,
    summary: {
      total_cost_usd_30d: Math.round(totalCost30d * 100) / 100,
      total_cost_usd_24h: Math.round(totalCost24h * 100) / 100,
      total_runs_30d: totalRuns30d,
      generated_at: new Date().toISOString(),
    },
    features,
    top_users,
    trend,
  });
}
