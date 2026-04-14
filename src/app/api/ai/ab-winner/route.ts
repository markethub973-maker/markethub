/**
 * POST /api/ai/ab-winner — given 2 draft captions for the same post,
 * predict which will perform better and return the winner + rationale
 * + a confidence score + a merged "best of both" option.
 *
 * Uses the same Haiku model as /api/ai/predict-engagement, but with a
 * comparative prompt so ranking is relative (avoids ties on absolute
 * scores).
 */

import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { createClient } from "@/lib/supabase/server";
import { buildBrandVoicePrompt } from "@/lib/brandVoice";

export const dynamic = "force-dynamic";
export const maxDuration = 15;

const HAIKU = "claude-haiku-4-5-20251001";

export async function POST(req: NextRequest) {
  const supa = await createClient();
  const { data: { user } } = await supa.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = (await req.json().catch(() => null)) as {
    variant_a?: string;
    variant_b?: string;
    platform?: string;
    hashtags?: string;
    has_image?: boolean;
    goal?: string;
  } | null;

  if (!body?.variant_a || !body?.variant_b) {
    return NextResponse.json({ error: "variant_a and variant_b required" }, { status: 400 });
  }
  if (body.variant_a.trim().length < 10 || body.variant_b.trim().length < 10) {
    return NextResponse.json({ error: "each variant must be >=10 chars" }, { status: 400 });
  }
  if (body.variant_a.length > 3000 || body.variant_b.length > 3000) {
    return NextResponse.json({ error: "variants too long (max 3000)" }, { status: 400 });
  }
  if (body.variant_a.trim() === body.variant_b.trim()) {
    return NextResponse.json({ error: "variants are identical" }, { status: 400 });
  }

  const apiKey = process.env.ANTHROPIC_API_KEY ?? process.env.ANTHROPIC_API_KEY_APP;
  if (!apiKey) return NextResponse.json({ error: "AI not configured" }, { status: 500 });

  const platform = (body.platform ?? "instagram").toLowerCase();
  const voicePrompt = await buildBrandVoicePrompt(user.id);

  const system = `You are a senior social media strategist picking the better of two draft captions for the same post.

Scoring criteria (weighted):
1. Hook strength in the first line (30%) — does it stop the scroll?
2. Emotional or curiosity trigger (20%)
3. Fit to platform conventions (20%) — length, tone, hashtag style
4. Clarity of value / CTA (15%)
5. Brand voice match (15%)

Return STRICT JSON:
{
  "winner": "A" | "B",
  "confidence": 0..100,
  "scores": { "a": 0..100, "b": 0..100 },
  "reasons": ["short bullet", "short bullet", "short bullet"],
  "best_of_both": "a merged caption that takes the strongest parts of each, under the same platform rules"
}

Rules:
- "confidence" = how sure you are the winner outperforms (50 = coin flip, 90+ = clear).
- "reasons" = WHY the winner wins — 3 concise bullets, not a lecture.
- "best_of_both" must be a drop-in replacement caption (not a structural plan).
- Match language of the drafts.${voicePrompt}

Platform: ${platform}. Has image: ${body.has_image ? "yes" : "no"}.${
    body.hashtags ? ` Hashtags draft: ${body.hashtags.slice(0, 300)}.` : ""
  }${body.goal ? ` Stated goal: ${body.goal.slice(0, 200)}.` : ""}`;

  try {
    const anthropic = new Anthropic({ apiKey });
    const r = await anthropic.messages.create({
      model: HAIKU,
      max_tokens: 1200,
      system,
      messages: [
        {
          role: "user",
          content: `DRAFT A:\n${body.variant_a.trim()}\n\n---\n\nDRAFT B:\n${body.variant_b.trim()}`,
        },
      ],
    });
    const text = r.content
      .filter((b) => b.type === "text")
      .map((b) => (b as { text: string }).text)
      .join("");
    const m = text.match(/\{[\s\S]*\}/);
    if (!m) throw new Error("No JSON in response");
    const parsed = JSON.parse(m[0]) as {
      winner?: "A" | "B";
      confidence?: number;
      scores?: { a?: number; b?: number };
      reasons?: string[];
      best_of_both?: string;
    };
    return NextResponse.json({
      ok: true,
      winner: parsed.winner === "B" ? "B" : "A",
      confidence: Math.max(0, Math.min(100, parsed.confidence ?? 50)),
      scores: {
        a: Math.max(0, Math.min(100, parsed.scores?.a ?? 50)),
        b: Math.max(0, Math.min(100, parsed.scores?.b ?? 50)),
      },
      reasons: (parsed.reasons ?? []).slice(0, 5),
      best_of_both: parsed.best_of_both ?? null,
    });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Failed" },
      { status: 500 },
    );
  }
}
