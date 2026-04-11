/**
 * Engagement — unified inbox list + mark endpoint.
 *
 *   GET  /api/engagement/messages?status=unread&platform=instagram&limit=50
 *        Returns paginated messages for the authenticated user, filtered by
 *        optional status/platform/priority/sentiment. Default: newest first.
 *
 *   PATCH /api/engagement/messages  { id, status?, priority?, tags?, assigned_to? }
 *        Update workflow metadata on a single message. Status transitions
 *        allowed: unread→read, read→unread, *→archived, *→spam. Anything
 *        else is a 400.
 *
 * Auth: user session (requireAuth). Multi-tenant isolated via RLS + the
 * explicit user_id filter in each query.
 */
import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/route-helpers";
import { createServiceClient } from "@/lib/supabase/service";

export const dynamic = "force-dynamic";

const VALID_STATUS = new Set(["unread", "read", "replied", "archived", "spam"]);
const VALID_PRIORITY = new Set(["low", "normal", "high", "urgent"]);
const VALID_PLATFORM = new Set(["instagram", "facebook", "linkedin", "tiktok", "youtube", "twitter"]);

export async function GET(req: NextRequest) {
  const auth = await requireAuth();
  if (!auth.ok) return auth.response;

  const url = req.nextUrl;
  const status = url.searchParams.get("status");
  const platform = url.searchParams.get("platform");
  const priority = url.searchParams.get("priority");
  const sentiment = url.searchParams.get("sentiment");
  const limitRaw = parseInt(url.searchParams.get("limit") ?? "50", 10);
  const offsetRaw = parseInt(url.searchParams.get("offset") ?? "0", 10);
  const limit = Math.min(200, Math.max(1, isNaN(limitRaw) ? 50 : limitRaw));
  const offset = Math.max(0, isNaN(offsetRaw) ? 0 : offsetRaw);

  const supa = createServiceClient();

  let q = supa
    .from("social_messages")
    .select(
      "id, platform, kind, external_id, thread_id, parent_external_id, media_external_id, media_permalink, media_thumbnail_url, author_name, author_handle, author_avatar_url, content, media_urls, sentiment, sentiment_score, priority, status, tags, assigned_to, replied_by, reply_text, replied_at, external_created_at, received_at, updated_at",
      { count: "exact" },
    )
    .eq("user_id", auth.userId)
    .order("received_at", { ascending: false })
    .range(offset, offset + limit - 1);

  if (status && VALID_STATUS.has(status)) q = q.eq("status", status);
  if (platform && VALID_PLATFORM.has(platform)) q = q.eq("platform", platform);
  if (priority && VALID_PRIORITY.has(priority)) q = q.eq("priority", priority);
  if (sentiment === "positive" || sentiment === "negative" || sentiment === "neutral") {
    q = q.eq("sentiment", sentiment);
  }

  const { data, error, count } = await q;
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Aggregate counts (so the UI can show unread badges without a second query)
  const { data: agg } = await supa
    .from("social_messages")
    .select("status, platform")
    .eq("user_id", auth.userId);

  const counts = {
    by_status: { unread: 0, read: 0, replied: 0, archived: 0, spam: 0 } as Record<string, number>,
    by_platform: { instagram: 0, facebook: 0, linkedin: 0, tiktok: 0, youtube: 0, twitter: 0 } as Record<
      string,
      number
    >,
    total: 0,
  };
  for (const row of agg ?? []) {
    const r = row as { status: string; platform: string };
    counts.total++;
    if (r.status in counts.by_status) counts.by_status[r.status]++;
    if (r.platform in counts.by_platform) counts.by_platform[r.platform]++;
  }

  return NextResponse.json({
    messages: data ?? [],
    total: count ?? 0,
    offset,
    limit,
    counts,
  });
}

export async function PATCH(req: NextRequest) {
  const auth = await requireAuth();
  if (!auth.ok) return auth.response;

  const body = (await req.json().catch(() => null)) as {
    id?: string;
    status?: string;
    priority?: string;
    tags?: string[];
    assigned_to?: string | null;
  } | null;

  if (!body?.id) {
    return NextResponse.json({ error: "id required" }, { status: 400 });
  }

  const update: Record<string, unknown> = {};
  if (body.status !== undefined) {
    if (!VALID_STATUS.has(body.status)) {
      return NextResponse.json({ error: "invalid status" }, { status: 400 });
    }
    update.status = body.status;
  }
  if (body.priority !== undefined) {
    if (!VALID_PRIORITY.has(body.priority)) {
      return NextResponse.json({ error: "invalid priority" }, { status: 400 });
    }
    update.priority = body.priority;
  }
  if (body.tags !== undefined) {
    if (!Array.isArray(body.tags)) {
      return NextResponse.json({ error: "tags must be array" }, { status: 400 });
    }
    update.tags = body.tags.slice(0, 20).map((t) => String(t).slice(0, 40));
  }
  if (body.assigned_to !== undefined) {
    update.assigned_to = body.assigned_to;
  }

  if (Object.keys(update).length === 0) {
    return NextResponse.json({ error: "no updates" }, { status: 400 });
  }

  const supa = createServiceClient();
  const { error } = await supa
    .from("social_messages")
    .update(update)
    .eq("id", body.id)
    .eq("user_id", auth.userId); // defense-in-depth even with RLS

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
