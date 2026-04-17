import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { requirePlan } from "@/lib/requirePlan";
import { requireAuth } from "@/lib/route-helpers";

// GET — list posts for the authenticated user, optionally filtered by month
export async function GET(req: NextRequest) {
  const check = await requirePlan(req, "/calendar");
  if (check instanceof NextResponse) return check;

  const auth = await requireAuth();
  if (!auth.ok) return auth.response;
  const user = { id: auth.userId };
  const supabase = await createClient();

  const { searchParams } = req.nextUrl;
  const month = searchParams.get("month"); // YYYY-MM

  let query = supabase
    .from("scheduled_posts")
    .select("id, title, caption, platform, status, date, time, client, hashtags, image_url, first_comment, timezone, created_at, updated_at")
    .eq("user_id", auth.userId)
    .order("date", { ascending: true })
    .order("time", { ascending: true });

  if (month) {
    query = query.gte("date", `${month}-01`).lte("date", `${month}-31`);
  }

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ posts: data || [] });
}

// POST — create a new scheduled post
export async function POST(req: NextRequest) {
  const check = await requirePlan(req, "/calendar");
  if (check instanceof NextResponse) return check;

  const auth = await requireAuth(); if (!auth.ok) return auth.response;
  const user = { id: auth.userId }; const supabase = await createClient();

  const body = await req.json().catch(() => ({}));
  const { title, caption, platform, status, date, time, client, hashtags, image_url, first_comment, timezone } = body as {
    title: string; caption?: string; platform: string; status: string;
    date: string; time?: string; client?: string; hashtags?: string; image_url?: string; first_comment?: string; timezone?: string;
  };

  if (!title?.trim()) return NextResponse.json({ error: "Title is required" }, { status: 400 });
  if (!date) return NextResponse.json({ error: "Date is required" }, { status: 400 });

  const { data, error } = await supabase
    .from("scheduled_posts")
    .insert({
      user_id: auth.userId,
      title: title.trim(),
      caption: caption?.trim() || "",
      platform: platform || "instagram",
      status: status || "draft",
      date,
      time: time || "12:00",
      client: client?.trim() || "",
      hashtags: hashtags?.trim() || "",
      image_url: image_url?.trim() || null,
      first_comment: first_comment?.trim() || null,
      timezone: timezone || null,
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ post: data });
}
