/**
 * POST /api/ai/repurpose — given a source caption, return platform-optimized
 * variants for Instagram, LinkedIn, Twitter/X, TikTok and YouTube Shorts.
 *
 * Each variant obeys that platform's proven rules:
 *  - Instagram: hook + emojis, 3-5 hashtags max, soft CTA
 *  - LinkedIn: professional tone, insight + question, minimal emoji, no hashtags in body
 *  - Twitter/X: <=270 chars, hook-first, no hashtag spam
 *  - TikTok: Gen-Z casual, punchy hook, 2-3 trending-style hashtags
 *  - YouTube Shorts: retention hook (first 3s), CTA to subscribe, description format
 *
 * Uses Brand Voice so the OUTPUT matches the user's tone across all platforms.
 */

import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { createClient } from "@/lib/supabase/server";
import { buildBrandVoicePrompt } from "@/lib/brandVoice";

export const dynamic = "force-dynamic";
export const maxDuration = 20;

const HAIKU = "claude-haiku-4-5-20251001";

const TARGETS = ["instagram", "linkedin", "twitter", "tiktok", "youtube"] as const;
type Target = typeof TARGETS[number];

export async function POST(req: NextRequest) {
  const supa = await createClient();
  const { data: { user } } = await supa.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = (await req.json().catch(() => null)) as {
    caption?: string;
    source_platform?: string;
    targets?: string[];
    client_id?: string;
  } | null;

  if (!body?.caption || body.caption.trim().length < 10) {
    return NextResponse.json({ error: "caption too short (min 10 chars)" }, { status: 400 });
  }
  if (body.caption.length > 3000) {
    return NextResponse.json({ error: "caption too long (max 3000)" }, { status: 400 });
  }

  const apiKey = process.env.ANTHROPIC_API_KEY ?? process.env.ANTHROPIC_API_KEY_APP;
  if (!apiKey) return NextResponse.json({ error: "AI not configured" }, { status: 500 });

  const wantedTargets: Target[] = Array.isArray(body.targets) && body.targets.length > 0
    ? (body.targets.filter((t): t is Target => TARGETS.includes(t as Target)))
    : [...TARGETS];
  if (wantedTargets.length === 0) {
    return NextResponse.json({ error: "no valid targets" }, { status: 400 });
  }

  const voicePrompt = await buildBrandVoicePrompt(user.id, body?.client_id);
  const sourcePlatform = (body.source_platform ?? "generic").toLowerCase();

  const system = `You repurpose a social media caption into platform-optimized variants.

For each target platform, apply its proven rules:

- instagram: hook on line 1, friendly + emoji-led, 3-5 hashtags at the end, soft CTA, max 2200 chars (aim 500-900).
- linkedin: professional tone, insight or lesson, open question near the end to drive comments, minimal emoji, NO hashtags in body (append max 3 relevant hashtags separately), max 3000 chars (aim 800-1500).
- twitter: <=270 chars TOTAL, strongest hook first, one clear idea, no hashtag spam (0-1 hashtags), no link shorteners in output.
- tiktok: casual Gen-Z voice, punchy hook (first 5 words), 2-3 trending-style hashtags (#fyp allowed), max 2200 chars (aim 80-200).
- youtube: Shorts description format — first line is a retention hook referencing the video, then 2-3 short lines of context, end with "Subscribe for more" CTA. Up to 5 relevant tags as hashtags at bottom.

Output STRICT JSON — ONLY the keys the caller requested:
{
  "variants": {
    "instagram": "...",
    "linkedin": "...",
    ...
  }
}

Rules:
- Preserve the original MEANING and KEY FACTS. Only change framing and format.
- Match the language of the original caption.
- Do NOT hallucinate stats, quotes, or URLs.
- If the original has a specific brand/product name, keep it verbatim.
${voicePrompt}

Source platform (for tone reference only): ${sourcePlatform}.
Requested target platforms: ${wantedTargets.join(", ")}.`;

  try {
    const anthropic = new Anthropic({ apiKey });
    const r = await anthropic.messages.create({
      model: HAIKU,
      max_tokens: 2500,
      system,
      messages: [{ role: "user", content: `Original caption:\n${body.caption.trim()}` }],
    });
    const text = r.content
      .filter((b) => b.type === "text")
      .map((b) => (b as { text: string }).text)
      .join("");
    const m = text.match(/\{[\s\S]*\}/);
    if (!m) throw new Error("No JSON in response");
    const parsed = JSON.parse(m[0]) as { variants?: Record<string, string> };
    const variants: Record<string, string> = {};
    for (const t of wantedTargets) {
      const v = parsed.variants?.[t];
      if (v && typeof v === "string") variants[t] = v.trim();
    }
    return NextResponse.json({ ok: true, variants, original: body.caption.trim() });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Failed" },
      { status: 500 },
    );
  }
}
