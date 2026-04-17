/**
 * POST /api/studio/schedule-campaign — Schedule all posts from a campaign plan
 *
 * Takes the campaign plan output (5 posts with captions, platforms, times)
 * and bulk-inserts them into scheduled_posts. One click → 5 calendar entries.
 *
 * Body: {
 *   posts: Array<{ caption, platform, day (1-5), time, title, image_url?, hashtags? }>,
 *   start_date: "YYYY-MM-DD" (day 1 of the campaign),
 *   client?: string,
 *   timezone?: string,
 *   status?: "scheduled" | "draft"
 * }
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { requireAuth } from "@/lib/route-helpers";

export const dynamic = "force-dynamic";

interface CampaignPost {
  caption: string;
  platform: string;
  day: number; // 1-5
  time: string; // HH:MM
  title: string;
  image_url?: string;
  hashtags?: string;
  image_prompt?: string;
}

export async function POST(req: NextRequest) {
  const auth = await requireAuth();
  if (!auth.ok) return auth.response;

  const body = (await req.json().catch(() => null)) as {
    posts?: CampaignPost[];
    start_date?: string;
    client?: string;
    timezone?: string;
    status?: string;
  } | null;

  if (!body?.posts?.length || !body.start_date) {
    return NextResponse.json(
      { error: "posts array and start_date required" },
      { status: 400 }
    );
  }

  // Validate start_date format
  if (!/^\d{4}-\d{2}-\d{2}$/.test(body.start_date)) {
    return NextResponse.json(
      { error: "start_date must be YYYY-MM-DD" },
      { status: 400 }
    );
  }

  const supabase = await createClient();
  const startDate = new Date(body.start_date + "T00:00:00Z");
  const status = body.status === "draft" ? "draft" : "scheduled";

  // Build rows for bulk insert
  const rows = body.posts.map((post) => {
    const postDate = new Date(startDate);
    postDate.setUTCDate(postDate.getUTCDate() + (post.day - 1));
    const dateStr = postDate.toISOString().slice(0, 10);

    return {
      user_id: auth.userId,
      title: (post.title || `Campaign Day ${post.day}`).slice(0, 200),
      caption: (post.caption || "").slice(0, 5000),
      platform: post.platform || "instagram",
      status,
      date: dateStr,
      time: post.time || "12:00",
      client: body.client?.trim() || "",
      hashtags: post.hashtags?.trim() || "",
      image_url: post.image_url?.trim() || null,
      first_comment: null,
      timezone: body.timezone || null,
    };
  });

  const { data, error } = await supabase
    .from("scheduled_posts")
    .insert(rows)
    .select("id, title, date, time, platform, status");

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({
    ok: true,
    scheduled: data?.length ?? 0,
    posts: data,
    message: `${data?.length ?? 0} posts added to calendar starting ${body.start_date}`,
  });
}
