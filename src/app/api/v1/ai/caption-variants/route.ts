/**
 * POST /api/v1/ai/caption-variants — Bearer-token version of the A/B
 * caption variants helper. Returns 3 angles (punchy / story / question)
 * for a draft caption. Pro+.
 */

import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { authorizeV1 } from "@/lib/apiV1Auth";
import { buildBrandVoicePrompt } from "@/lib/brandVoice";

export const dynamic = "force-dynamic";
export const maxDuration = 15;

const HAIKU = "claude-haiku-4-5-20251001";

export async function POST(req: NextRequest) {
  const auth = await authorizeV1(req);
  if (!auth.ok) return auth.response;

  const body = (await req.json().catch(() => null)) as {
    caption?: string;
    platform?: string;
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

  const platform = (body.platform ?? "instagram").toLowerCase();
  const voicePrompt = await buildBrandVoicePrompt(auth.userId, body?.client_id);

  const system = `You generate A/B caption variants for social media. Given an original caption, produce THREE alternative angles to test:
  1. "punchy" — half the length, hook-first, emoji-leading
  2. "story" — slightly longer, narrative arc, personal voice
  3. "question" — opens with a question to invite engagement

Output STRICT JSON:
{
  "variants": [
    { "angle": "punchy", "caption": "..." },
    { "angle": "story", "caption": "..." },
    { "angle": "question", "caption": "..." }
  ]
}

Rules:
- Match the language of the original caption.
- Same intent — don't change the meaning, change the framing.
- Include hashtags only if the original had them.
- Platform-aware: shorter for Twitter, longer-tolerant for LinkedIn.
- Target platform: ${platform}.${voicePrompt}`;

  try {
    const anthropic = new Anthropic({ apiKey });
    const r = await anthropic.messages.create({
      model: HAIKU,
      max_tokens: 1500,
      system,
      messages: [{ role: "user", content: `Original:\n${body.caption.trim()}` }],
    });
    const text = r.content.filter((b) => b.type === "text").map((b) => (b as { text: string }).text).join("");
    const m = text.match(/\{[\s\S]*\}/);
    if (!m) throw new Error("No JSON in response");
    const parsed = JSON.parse(m[0]) as { variants?: Array<{ angle: string; caption: string }> };
    const variants = (parsed.variants ?? []).filter((v) => v.angle && v.caption).slice(0, 3);
    return NextResponse.json({ ok: true, variants, original: body.caption.trim() });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Failed" }, { status: 500 });
  }
}
