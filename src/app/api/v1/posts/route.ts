/**
 * GET /api/v1/posts — list the authenticated user's scheduled posts.
 *
 * Query params:
 *   ?status=scheduled|published|draft|failed (optional)
 *   ?limit=20 (1-100)
 *   ?from=YYYY-MM-DD (optional lower bound on scheduled_for)
 *   ?to=YYYY-MM-DD   (optional upper bound)
 *
 * Returns latest first. Safe fields only — no internal token / OAuth refs.
 */

import { NextRequest, NextResponse } from "next/server";
import { verifyToken } from "@/lib/apiTokens";
import { createServiceClient } from "@/lib/supabase/service";

export const dynamic = "force-dynamic";

const VALID_PLATFORMS = ["instagram", "facebook", "linkedin", "tiktok", "youtube", "twitter"];
const VALID_STATUSES = ["draft", "scheduled", "published", "failed"];

export async function GET(req: NextRequest) {
  const auth = await verifyToken(
    req.headers.get("authorization"),
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null,
  );
  if (!auth) {
    return NextResponse.json({ error: "Invalid or missing API token" }, { status: 401 });
  }

  const p = req.nextUrl.searchParams;
  const limit = Math.min(Math.max(parseInt(p.get("limit") ?? "20"), 1), 100);
  const status = p.get("status");
  const from = p.get("from");
  const to = p.get("to");

  const service = createServiceClient();
  let q = service
    .from("scheduled_posts")
    .select(
      "id,title,caption,platforms,media_urls,status,scheduled_for,published_at,created_at,updated_at",
    )
    .eq("user_id", auth.user_id)
    .order("scheduled_for", { ascending: false })
    .limit(limit);

  if (status) q = q.eq("status", status);
  if (from) q = q.gte("scheduled_for", `${from}T00:00:00Z`);
  if (to)   q = q.lte("scheduled_for", `${to}T23:59:59Z`);

  const { data, error } = await q;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, posts: data ?? [] });
}

/**
 * POST /api/v1/posts — create a scheduled post.
 *
 * Body:
 *   {
 *     "caption": "...",
 *     "platforms": ["instagram","linkedin"],
 *     "scheduled_for": "2026-04-20T09:00:00Z",
 *     "title": "optional",
 *     "media_urls": ["https://..."],
 *     "hashtags": "optional"
 *   }
 */
export async function POST(req: NextRequest) {
  const auth = await verifyToken(
    req.headers.get("authorization"),
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null,
  );
  if (!auth) {
    return NextResponse.json({ error: "Invalid or missing API token" }, { status: 401 });
  }

  const body = (await req.json().catch(() => null)) as {
    caption?: string;
    title?: string;
    platforms?: string[];
    scheduled_for?: string;
    media_urls?: string[];
    hashtags?: string;
  } | null;

  if (!body?.caption || body.caption.trim().length < 1) {
    return NextResponse.json({ error: "caption required" }, { status: 400 });
  }
  if (body.caption.length > 5000) {
    return NextResponse.json({ error: "caption too long (max 5000)" }, { status: 400 });
  }

  const platforms = (body.platforms ?? []).filter((p) => VALID_PLATFORMS.includes(p));
  if (platforms.length === 0) {
    return NextResponse.json(
      { error: `platforms required (one of ${VALID_PLATFORMS.join(", ")})` },
      { status: 400 },
    );
  }

  if (!body.scheduled_for) {
    return NextResponse.json({ error: "scheduled_for ISO datetime required" }, { status: 400 });
  }
  const scheduledDate = new Date(body.scheduled_for);
  if (isNaN(scheduledDate.getTime())) {
    return NextResponse.json({ error: "scheduled_for must be valid ISO datetime" }, { status: 400 });
  }
  if (scheduledDate.getTime() < Date.now() - 60_000) {
    return NextResponse.json({ error: "scheduled_for must be in the future" }, { status: 400 });
  }

  const mediaUrls = (body.media_urls ?? []).filter((u) => /^https?:\/\//.test(u)).slice(0, 10);

  const service = createServiceClient();
  const { data, error } = await service
    .from("scheduled_posts")
    .insert({
      user_id: auth.user_id,
      title: body.title?.slice(0, 200) ?? null,
      caption: body.caption.trim(),
      platforms,
      media_urls: mediaUrls,
      hashtags: body.hashtags?.slice(0, 1000) ?? null,
      scheduled_for: scheduledDate.toISOString(),
      status: "scheduled",
    })
    .select("id,title,caption,platforms,media_urls,status,scheduled_for,created_at")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, post: data }, { status: 201 });
}

/**
 * DELETE /api/v1/posts?id=... — cancel/remove a post.
 * Only allowed if the post belongs to the authenticated user AND
 * status is not 'published' (can't unpublish via API).
 */
export async function DELETE(req: NextRequest) {
  const auth = await verifyToken(
    req.headers.get("authorization"),
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null,
  );
  if (!auth) {
    return NextResponse.json({ error: "Invalid or missing API token" }, { status: 401 });
  }
  const id = req.nextUrl.searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

  const service = createServiceClient();
  // Check ownership + status before deleting
  const { data: post } = await service
    .from("scheduled_posts")
    .select("status,user_id")
    .eq("id", id)
    .maybeSingle();
  if (!post) return NextResponse.json({ error: "Post not found" }, { status: 404 });
  if (post.user_id !== auth.user_id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  if (post.status === "published") {
    return NextResponse.json(
      { error: "Cannot delete published posts via API. Delete from the social platform directly." },
      { status: 400 },
    );
  }

  const { error } = await service.from("scheduled_posts").delete().eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}

// Suppress unused warning — VALID_STATUSES is exported for future PATCH route
export { VALID_STATUSES };
