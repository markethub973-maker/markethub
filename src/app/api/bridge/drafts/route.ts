import { NextRequest, NextResponse } from "next/server";
import { bridgeAuth } from "@/lib/bridgeAuth";
import { createServiceClient } from "@/lib/supabase/service";

/**
 * POST /api/bridge/drafts — Create a scheduled post draft
 * Zurio generates content, pushes it to MarketHub calendar as draft.
 *
 * Body: {
 *   user_id: string (required),
 *   title: string (required),
 *   caption: string,
 *   platform: "instagram"|"facebook"|"tiktok"|"linkedin"|"youtube",
 *   date: "YYYY-MM-DD",
 *   time: "HH:MM",
 *   hashtags: string,
 *   image_url: string,
 *   first_comment: string,
 *   source: string (default "zurio")
 * }
 */
export async function POST(req: NextRequest) {
  const auth = bridgeAuth(req);
  if (!auth.ok) return auth.response;

  const body = await req.json().catch(() => null);
  if (!body || !body.user_id || !body.title) {
    return NextResponse.json({ error: "user_id and title are required" }, { status: 400 });
  }

  const supa = createServiceClient();

  const post = {
    user_id: body.user_id,
    title: body.title,
    caption: body.caption || "",
    platform: body.platform || "instagram",
    status: "draft",
    date: body.date || new Date().toISOString().slice(0, 10),
    time: body.time || "12:00",
    hashtags: body.hashtags || "",
    image_url: body.image_url || null,
    first_comment: body.first_comment || null,
    client: body.source || "zurio",
  };

  const { data, error } = await supa
    .from("scheduled_posts")
    .insert(post)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ draft: data, created: true });
}
