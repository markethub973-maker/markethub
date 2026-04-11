/**
 * YouTube — SEO suggestions via Claude Haiku.
 *
 * POST /api/youtube/seo-suggestions { topic, description?, niche?, target_audience? }
 *
 * Asks Haiku 4.5 to generate, for a given video:
 *   - 5 alternate title variants (tested hook styles: curiosity, benefit,
 *     question, listicle, controversy-lite)
 *   - 15 YouTube tags (mix of broad + long-tail, Romanian + English)
 *   - A 200-word description optimized for YouTube search
 *   - Suggested category_id from YouTube's standard list
 *
 * Returns strict JSON so the UI can populate the upload form directly.
 *
 * Cost: ~$0.002 per call (slightly larger output than review drafts).
 * Counts against the "apex" daily bucket.
 *
 * Auth: requireAuth.
 */
import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/route-helpers";
import { getAppAnthropicClient } from "@/lib/anthropic-client";
import { checkAndIncrDailyLimit, limitExceededResponse } from "@/lib/dailyLimits";

export const maxDuration = 30;
export const dynamic = "force-dynamic";

const MODEL = "claude-haiku-4-5-20251001";

const SYSTEM_PROMPT = `You are a YouTube SEO specialist. For a given video topic + optional description, generate:

1. FIVE alternate TITLE variants, each using a different hook style:
   - Curiosity ("De ce X NU funcționează...")
   - Benefit ("Cum să obții X în 5 minute")
   - Question ("Știai că X?")
   - Listicle ("7 greșeli de evitat în X")
   - Controversy-lite ("X este suprasolicitat. Iată de ce")

   Each title: max 70 chars, in Romanian (unless niche is English-speaking).

2. FIFTEEN TAGS — mix of:
   - 5 broad tags (short, high-volume)
   - 7 long-tail tags (3-5 words, more specific)
   - 3 niche tags (very specific, low competition)
   Use Romanian primarily, mix in English for international discoverability.

3. A DESCRIPTION — 180-220 words, structured as:
   - Hook (first 2 lines — these show above "Show more" in search)
   - 3-5 bullet points about what the viewer will learn
   - 2-3 relevant hashtags at the end

4. A suggested CATEGORY_ID from YouTube's standard list:
   - 10 Music
   - 22 People & Blogs
   - 23 Comedy
   - 24 Entertainment
   - 25 News & Politics
   - 26 Howto & Style
   - 27 Education
   - 28 Science & Technology
   - 20 Gaming
   - 17 Sports
   - 2  Autos & Vehicles
   - 19 Travel & Events

Return STRICT JSON exactly in this shape:
{
  "alt_titles": ["...", "...", "...", "...", "..."],
  "tags": ["...", "..."],
  "description": "...",
  "category_id": 27,
  "rationale": "one line why these choices"
}

No preamble. No explanation outside the JSON.`;

interface SuggestionPayload {
  alt_titles: string[];
  tags: string[];
  description: string;
  category_id: number;
  rationale: string;
}

export async function POST(req: NextRequest) {
  const auth = await requireAuth();
  if (!auth.ok) return auth.response;

  const limitCheck = await checkAndIncrDailyLimit(auth.userId, auth.userPlan, "apex");
  if (!limitCheck.allowed) {
    return NextResponse.json(limitExceededResponse(limitCheck, "apex"), { status: 429 });
  }

  const body = (await req.json().catch(() => null)) as {
    topic?: string;
    description?: string;
    niche?: string;
    target_audience?: string;
  } | null;

  if (!body?.topic?.trim()) {
    return NextResponse.json({ error: "topic required" }, { status: 400 });
  }

  const ctx = [
    `topic: ${body.topic.trim()}`,
    body.description ? `draft_description: ${body.description.trim().slice(0, 500)}` : "",
    body.niche ? `niche: ${body.niche.trim()}` : "",
    body.target_audience ? `target_audience: ${body.target_audience.trim()}` : "",
  ]
    .filter(Boolean)
    .join("\n");

  const anthropic = getAppAnthropicClient();
  let raw = "";
  try {
    const resp = await anthropic.messages.create({
      model: MODEL,
      max_tokens: 1500,
      system: SYSTEM_PROMPT,
      messages: [{ role: "user", content: ctx }],
    });
    for (const block of resp.content) {
      if (block.type === "text") raw += block.text;
    }
  } catch (e) {
    return NextResponse.json(
      { error: `Haiku call failed: ${e instanceof Error ? e.message : String(e)}` },
      { status: 502 },
    );
  }

  // Parse JSON
  let parsed: SuggestionPayload | null = null;
  try {
    const start = raw.indexOf("{");
    const end = raw.lastIndexOf("}");
    if (start >= 0 && end > start) {
      parsed = JSON.parse(raw.slice(start, end + 1)) as SuggestionPayload;
    }
  } catch {
    /* ignore */
  }

  if (!parsed) {
    return NextResponse.json(
      { error: "Haiku returned non-JSON output", raw: raw.slice(0, 500) },
      { status: 502 },
    );
  }

  // Sanity check
  if (
    !Array.isArray(parsed.alt_titles) ||
    !Array.isArray(parsed.tags) ||
    typeof parsed.description !== "string"
  ) {
    return NextResponse.json({ error: "Malformed suggestions shape", parsed }, { status: 502 });
  }

  return NextResponse.json({
    ok: true,
    model: MODEL,
    suggestions: parsed,
  });
}
