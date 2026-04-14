/**
 * GET /api/studio/queue — upcoming + recent published posts in a
 * compact form for the publish queue dashboard.
 *
 * Returns 7-day window (3 days back, 4 days forward) of all the user's
 * scheduled_posts — what's about to publish + what just did. Lets the
 * user spot gaps, double-bookings, or platform overload at a glance.
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const supa = await createClient();
  const { data: { user } } = await supa.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const days = Math.min(Math.max(parseInt(req.nextUrl.searchParams.get("days") ?? "7"), 3), 30);
  const past = parseInt(req.nextUrl.searchParams.get("past") ?? "3");
  const now = Date.now();
  const from = new Date(now - past * 24 * 3600 * 1000).toISOString();
  const to = new Date(now + (days - past) * 24 * 3600 * 1000).toISOString();

  const { data, error } = await supa
    .from("scheduled_posts")
    .select("id,title,caption,platforms,media_urls,status,scheduled_for,published_at")
    .eq("user_id", user.id)
    .gte("scheduled_for", from)
    .lte("scheduled_for", to)
    .order("scheduled_for", { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Bucket per day for easy grid render
  const byDay: Record<string, typeof data> = {};
  for (const p of data ?? []) {
    const day = (p.scheduled_for as string).slice(0, 10);
    (byDay[day] = byDay[day] ?? []).push(p);
  }

  // Stats
  const platformCounts: Record<string, number> = {};
  for (const p of data ?? []) {
    for (const pl of (p.platforms as string[]) ?? []) {
      platformCounts[pl] = (platformCounts[pl] ?? 0) + 1;
    }
  }

  const upcoming = (data ?? []).filter(
    (p) => p.status === "scheduled" && new Date(p.scheduled_for as string).getTime() > now,
  ).length;
  const published = (data ?? []).filter((p) => p.status === "published").length;
  const failed = (data ?? []).filter((p) => p.status === "failed").length;

  return NextResponse.json({
    ok: true,
    posts: data ?? [],
    by_day: byDay,
    stats: { upcoming, published, failed, by_platform: platformCounts },
    window: { from, to, days },
  });
}
