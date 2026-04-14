/**
 * POST /api/ai/hashtag-scan — rank a batch of candidate hashtags for a
 * niche using AI heuristics (no live platform metrics).
 *
 * Input sources (any combination):
 *   - `candidates[]`  — user-provided list
 *   - `competitor_captions[]` — extract all hashtags used ≥2x by competitors
 *   - `my_captions[]` — detect hashtags the user already uses (dedup / saturation signal)
 *
 * Output: each hashtag bucketed into
 *   • "rising"      — under-used in user's niche + good discovery potential
 *   • "safe-bet"    — broadly relevant, steady traffic
 *   • "saturated"   — oversaturated / spammy / banned
 *   • "overused-by-you" — user uses it often; recommend rotation
 * with a one-line rationale per bucket.
 */

import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";
export const maxDuration = 20;

const HAIKU = "claude-haiku-4-5-20251001";

function extractHashtags(texts: string[]): Map<string, number> {
  const counts = new Map<string, number>();
  for (const t of texts) {
    if (typeof t !== "string") continue;
    const matches = t.toLowerCase().match(/#[\w\u00C0-\uFFFF]+/g) ?? [];
    for (const h of matches) {
      counts.set(h, (counts.get(h) ?? 0) + 1);
    }
  }
  return counts;
}

export async function POST(req: NextRequest) {
  const supa = await createClient();
  const { data: { user } } = await supa.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = (await req.json().catch(() => null)) as {
    candidates?: string[];
    competitor_captions?: string[];
    my_captions?: string[];
    niche?: string;
    platform?: string;
  } | null;

  if (!body) return NextResponse.json({ error: "missing body" }, { status: 400 });

  const compCounts = extractHashtags(body.competitor_captions ?? []);
  const myCounts   = extractHashtags(body.my_captions ?? []);

  // Pool: user-provided + competitor hashtags used >=2 times
  const pool = new Set<string>();
  for (const c of body.candidates ?? []) {
    if (typeof c === "string") {
      const clean = c.trim().toLowerCase();
      if (clean.length > 0) pool.add(clean.startsWith("#") ? clean : `#${clean}`);
    }
  }
  for (const [h, count] of compCounts) {
    if (count >= 2) pool.add(h);
  }
  // Cap at 60 to keep the prompt tight
  const hashtagList = Array.from(pool).slice(0, 60);
  if (hashtagList.length < 3) {
    return NextResponse.json(
      { error: "Need at least 3 candidate hashtags (combine candidates[] + competitor_captions[])" },
      { status: 400 },
    );
  }

  const apiKey = process.env.ANTHROPIC_API_KEY ?? process.env.ANTHROPIC_API_KEY_APP;
  if (!apiKey) return NextResponse.json({ error: "AI not configured" }, { status: 500 });

  const niche = body.niche?.trim().slice(0, 300) ?? "";
  const platform = (body.platform ?? "instagram").toLowerCase();

  // Annotate candidates with usage counts so the model can reason about saturation
  const annotated = hashtagList
    .map((h) => {
      const c = compCounts.get(h) ?? 0;
      const m = myCounts.get(h) ?? 0;
      return `${h}  (competitors:${c}, mine:${m})`;
    })
    .join("\n");

  const system = `You rank hashtags for a content creator, bucketing each one into exactly ONE of:
  • "rising"         — under-used in the user's content, decent niche relevance, good discovery upside
  • "safe-bet"       — broadly relevant to the niche, steady reach, not oversaturated
  • "saturated"      — oversaturated (#love #instagood), spammy (#follow4follow), or shadowbanned-prone
  • "overused-by-you" — the user already uses it heavily (mine >= 3); recommend rotating it out

Use the (competitors:X, mine:Y) signal honestly:
  - mine >= 3 → "overused-by-you" (unless it's a brand-critical tag; flag in rationale).
  - competitors >= 3 AND mine = 0 → strong "rising" candidate.
  - classic generic tags → "saturated".

Output STRICT JSON:
{
  "buckets": {
    "rising":          [ { "tag": "#x", "reason": "one line" } ],
    "safe-bet":        [ { "tag": "#y", "reason": "one line" } ],
    "saturated":       [ { "tag": "#z", "reason": "one line" } ],
    "overused-by-you": [ { "tag": "#w", "reason": "one line" } ]
  }
}

Rules:
- Every input hashtag appears in EXACTLY ONE bucket.
- Keep all hashtag spelling exactly as provided.
- Rationale ≤ 100 chars, actionable.
- Match the niche language in reasons.

Platform: ${platform}. ${niche ? `Niche: ${niche}.` : ""}`;

  try {
    const anthropic = new Anthropic({ apiKey });
    const r = await anthropic.messages.create({
      model: HAIKU,
      max_tokens: 2500,
      system,
      messages: [{ role: "user", content: `Hashtags to rank:\n${annotated}` }],
    });
    const text = r.content.filter((b) => b.type === "text").map((b) => (b as { text: string }).text).join("");
    const m = text.match(/\{[\s\S]*\}/);
    if (!m) throw new Error("No JSON in response");
    const parsed = JSON.parse(m[0]) as {
      buckets?: {
        rising?: Array<{ tag: string; reason: string }>;
        "safe-bet"?: Array<{ tag: string; reason: string }>;
        saturated?: Array<{ tag: string; reason: string }>;
        "overused-by-you"?: Array<{ tag: string; reason: string }>;
      };
    };
    return NextResponse.json({
      ok: true,
      analyzed_count: hashtagList.length,
      platform,
      buckets: {
        rising:            parsed.buckets?.rising            ?? [],
        "safe-bet":        parsed.buckets?.["safe-bet"]      ?? [],
        saturated:         parsed.buckets?.saturated         ?? [],
        "overused-by-you": parsed.buckets?.["overused-by-you"] ?? [],
      },
    });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Failed" }, { status: 500 });
  }
}
