/**
 * Reviews — AI draft reply endpoint.
 *
 * POST /api/reviews/draft-reply { id, tone? }
 *
 * Loads the review row, builds a context block (rating + content +
 * place_name + owner_reply if any), asks Claude Haiku 4.5 to generate a
 * professional Romanian reply tuned to the rating, and returns the draft
 * WITHOUT persisting it. The UI receives the text and pre-fills the
 * reply composer so the user can edit before saving via /api/reviews/reply.
 *
 * Why not save directly: drafts should ALWAYS be human-reviewed before
 * publishing to the platform. Review replies are reputational — we don't
 * auto-commit.
 *
 * Cost: ~$0.001 per draft (short context, 200-token output). Rate-limited
 * via the daily "ai_call" bucket so this counts against the user's plan.
 */
import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/route-helpers";
import { createServiceClient } from "@/lib/supabase/service";
import { getAppAnthropicClient } from "@/lib/anthropic-client";
import { checkAndIncrDailyLimit, limitExceededResponse } from "@/lib/dailyLimits";

export const maxDuration = 30;
export const dynamic = "force-dynamic";

const MODEL = "claude-haiku-4-5-20251001";

const SYSTEM_PROMPT = `You write professional replies to Google Business / Facebook reviews for a marketing agency's clients. The reply is published publicly, so it represents the business.

Tone rules (driven by rating):
  - 5★: warm thanks + specific highlight of what they loved, invite them back / share with others. Max 3 sentences.
  - 4★: thanks + acknowledge the positive + gently ask what would make it a 5★ next time. Max 3 sentences.
  - 3★: thank them for feedback + acknowledge they had a mixed experience + concrete invitation to discuss privately (support email or phone). Max 4 sentences.
  - 2★ / 1★: open with empathy + apology (no excuses, no "but"), take ownership, offer a concrete next step (contact the manager / refund / revisit), NEVER argue publicly. Max 4 sentences.

Hard rules:
  - Reply in Romanian only (the business is Romanian).
  - Address the reviewer by name if provided.
  - Use "dvs." form (formal Romanian).
  - No emojis.
  - No generic filler like "Mulțumim pentru feedback!". Be specific to what they wrote.
  - If the reviewer mentioned a specific issue (e.g. "raportul lunar la timp"), address THAT exact issue — don't deflect.
  - NEVER promise things you can't deliver (refunds, custom discounts). Use "vom analiza situația" or "vă rugăm să ne contactați la support@..." instead.
  - If an owner_reply already exists on the platform, write a NEW reply that follows up (don't repeat the same points).

Return ONLY the reply text — no preamble, no explanation, no quotes around it.`;

export async function POST(req: NextRequest) {
  const auth = await requireAuth();
  if (!auth.ok) return auth.response;

  // Count against the "apex" daily bucket — this is a user-facing Haiku call
  // and the apex bucket is what the rest of the UI features use.
  const limitCheck = await checkAndIncrDailyLimit(auth.userId, auth.userPlan, "apex");
  if (!limitCheck.allowed) {
    return NextResponse.json(limitExceededResponse(limitCheck, "apex"), { status: 429 });
  }

  const body = (await req.json().catch(() => null)) as { id?: string } | null;
  if (!body?.id) {
    return NextResponse.json({ error: "id required" }, { status: 400 });
  }

  const supa = createServiceClient();
  const { data: review, error: lookupErr } = await supa
    .from("reviews")
    .select(
      "id, rating, reviewer_name, content, place_name, language, sentiment, owner_reply",
    )
    .eq("id", body.id)
    .eq("user_id", auth.userId)
    .maybeSingle();

  if (lookupErr || !review) {
    return NextResponse.json({ error: "Review not found" }, { status: 404 });
  }

  const r = review as {
    id: string;
    rating: number;
    reviewer_name: string | null;
    content: string | null;
    place_name: string | null;
    language: string | null;
    sentiment: string | null;
    owner_reply: string | null;
  };

  // Build compact context for Haiku
  const context = `Review to reply to:
  rating: ${r.rating}★
  reviewer: ${r.reviewer_name ?? "Anonymous"}
  business: ${r.place_name ?? "—"}
  sentiment: ${r.sentiment ?? "unknown"}
  content: ${r.content ?? "(empty)"}
  ${r.owner_reply ? `existing_owner_reply: ${r.owner_reply}` : ""}

Write the reply now.`;

  const anthropic = getAppAnthropicClient();
  let draft = "";
  try {
    const resp = await anthropic.messages.create({
      model: MODEL,
      max_tokens: 400,
      system: SYSTEM_PROMPT,
      messages: [{ role: "user", content: context }],
    });
    for (const block of resp.content) {
      if (block.type === "text") draft += block.text;
    }
    draft = draft.trim();
  } catch (e) {
    return NextResponse.json(
      { error: `Haiku call failed: ${e instanceof Error ? e.message : String(e)}` },
      { status: 502 },
    );
  }

  if (!draft) {
    return NextResponse.json({ error: "Empty draft" }, { status: 502 });
  }

  return NextResponse.json({
    ok: true,
    draft,
    rating: r.rating,
    model: MODEL,
  });
}
