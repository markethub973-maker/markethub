/**
 * Reviews — reply endpoint.
 *
 * POST /api/reviews/reply  { id, reply_text }
 *
 * Stores the reply locally + marks status=replied. Actually sending the
 * reply back to the source platform requires the platform's owner-reply
 * API:
 *
 *   - Google Business Profile API (businessprofileperformance) requires
 *     OAuth with https://www.googleapis.com/auth/business.manage scope
 *     and a verified Google Business Profile. Not wired yet — see
 *     docs/REVIEW_REPLY_SETUP.md (TODO) for the setup runbook.
 *   - Facebook page reviews are read-only in Graph API v17+ (deprecated).
 *     Replies must be composed via the Page admin UI.
 *   - Trustpilot / Yelp have no public reply APIs for free-tier accounts.
 *
 * So for now: we persist the drafted reply + a marker that it needs to be
 * pasted into the platform UI manually. The "pending_platform_send" tag
 * is auto-added so the agent can track which replies still need to be
 * cross-posted.
 */
import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/route-helpers";
import { createServiceClient } from "@/lib/supabase/service";

export const maxDuration = 20;
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const auth = await requireAuth();
  if (!auth.ok) return auth.response;

  const body = (await req.json().catch(() => null)) as {
    id?: string;
    reply_text?: string;
  } | null;

  if (!body?.id || !body.reply_text?.trim()) {
    return NextResponse.json({ error: "id and reply_text required" }, { status: 400 });
  }

  const supa = createServiceClient();

  // Ensure the review belongs to the caller
  const { data: review, error: lookupErr } = await supa
    .from("reviews")
    .select("id, platform, tags")
    .eq("id", body.id)
    .eq("user_id", auth.userId)
    .maybeSingle();

  if (lookupErr || !review) {
    return NextResponse.json({ error: "Review not found" }, { status: 404 });
  }

  const r = review as { id: string; platform: string; tags: string[] };
  const tagsNext = Array.from(new Set([...(r.tags ?? []), "pending_platform_send"]));

  const { error: upErr } = await supa
    .from("reviews")
    .update({
      reply_text: body.reply_text.trim(),
      replied_at: new Date().toISOString(),
      replied_by: auth.userId,
      status: "replied",
      tags: tagsNext,
    })
    .eq("id", body.id)
    .eq("user_id", auth.userId);

  if (upErr) {
    return NextResponse.json({ error: upErr.message }, { status: 500 });
  }

  return NextResponse.json({
    ok: true,
    note: `Reply stored locally. ${r.platform === "google_business" ? "To publish on Google, go to Google Business Profile and paste the reply — the review.tags=pending_platform_send marker will clear once API push is wired (needs GBP OAuth)." : "This platform doesn't expose a reply API — copy+paste the reply into the platform's admin UI."}`,
  });
}
