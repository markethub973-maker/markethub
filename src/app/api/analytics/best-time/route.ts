import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// Industry-standard defaults when not enough data yet (by platform)
const DEFAULTS: Record<string, { day: number; hours: number[] }[]> = {
  instagram: [
    { day: 1, hours: [9, 11, 18] },  // Monday
    { day: 2, hours: [9, 11, 18] },
    { day: 3, hours: [9, 11, 18] },
    { day: 4, hours: [9, 11, 18] },
    { day: 5, hours: [9, 11, 18] },
    { day: 6, hours: [10, 11, 14] }, // Saturday
    { day: 0, hours: [10, 11] },     // Sunday
  ],
  facebook: [
    { day: 1, hours: [9, 13, 15] },
    { day: 2, hours: [9, 13, 15] },
    { day: 3, hours: [9, 13, 15] },
    { day: 4, hours: [9, 13, 15] },
    { day: 5, hours: [9, 13] },
    { day: 6, hours: [12, 13] },
  ],
  tiktok: [
    { day: 1, hours: [7, 12, 19] },
    { day: 2, hours: [7, 12, 19] },
    { day: 3, hours: [7, 12, 19] },
    { day: 4, hours: [7, 12, 19] },
    { day: 5, hours: [7, 12, 19] },
    { day: 6, hours: [8, 13, 19] },
    { day: 0, hours: [8, 13, 19] },
  ],
  linkedin: [
    { day: 1, hours: [8, 9, 17] },
    { day: 2, hours: [8, 9, 17] },
    { day: 3, hours: [8, 9, 17] },
    { day: 4, hours: [8, 9, 17] },
    { day: 5, hours: [8, 9] },
  ],
  youtube: [
    { day: 4, hours: [15, 18] },
    { day: 5, hours: [15, 18] },
    { day: 6, hours: [11, 14, 17] },
    { day: 0, hours: [11, 14, 17] },
  ],
  twitter: [
    { day: 1, hours: [8, 12, 17] },
    { day: 2, hours: [8, 12, 17] },
    { day: 3, hours: [8, 12, 17] },
    { day: 4, hours: [8, 12, 17] },
    { day: 5, hours: [8, 12] },
  ],
  pinterest: [
    { day: 5, hours: [21, 22] },
    { day: 6, hours: [13, 14, 21] },
    { day: 0, hours: [13, 14, 20] },
    { day: 1, hours: [20, 21] },
  ],
};

const DAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

export async function GET(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const platform = req.nextUrl.searchParams.get("platform") || "instagram";

  // Try to analyze actual published posts
  const { data: posts } = await supabase
    .from("scheduled_posts")
    .select("date, time, platform")
    .eq("user_id", user.id)
    .eq("status", "published")
    .eq("platform", platform)
    .limit(200);

  const hasEnoughData = (posts?.length ?? 0) >= 5;

  // Build heatmap: day 0-6, hour 0-23, count of published posts
  const heatmap: number[][] = Array.from({ length: 7 }, () => Array(24).fill(0));

  if (hasEnoughData && posts) {
    for (const p of posts) {
      const dt = new Date(`${p.date}T${p.time || "12:00"}`);
      const day = dt.getDay();   // 0 = Sunday
      const hour = dt.getHours();
      heatmap[day][hour]++;
    }
  } else {
    // Fill heatmap from industry defaults
    const defaults = DEFAULTS[platform] || DEFAULTS.instagram;
    for (const { day, hours } of defaults) {
      for (const h of hours) {
        heatmap[day][h] = 3; // synthetic "good" score
      }
    }
  }

  // Extract top 5 slots
  const slots: { day: number; dayName: string; hour: number; label: string; score: number }[] = [];
  for (let d = 0; d < 7; d++) {
    for (let h = 0; h < 24; h++) {
      if (heatmap[d][h] > 0) {
        const ampm = h < 12 ? `${h === 0 ? 12 : h}am` : `${h === 12 ? 12 : h - 12}pm`;
        slots.push({ day: d, dayName: DAY_NAMES[d], hour: h, label: ampm, score: heatmap[d][h] });
      }
    }
  }
  slots.sort((a, b) => b.score - a.score);
  const topSlots = slots.slice(0, 5);

  return NextResponse.json({
    platform,
    hasRealData: hasEnoughData,
    publishedCount: posts?.length ?? 0,
    heatmap,
    topSlots,
  });
}
