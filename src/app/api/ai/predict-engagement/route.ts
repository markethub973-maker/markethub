/**
 * POST /api/ai/predict-engagement — predicts engagement for a draft post
 * before it's scheduled.
 *
 * Input:  { caption, platform, hashtags?, has_image?, scheduled_for? }
 * Output: { score (0-100), label, reasoning, suggestions[] }
 *
 * Not a crystal ball — a heuristic + AI critique that flags obvious
 * issues (no hook, wrong platform tone, weak CTA, too salesy). Saves
 * users from publishing duds.
 *
 * Haiku 4.5. Brand-voice aware.
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
    caption?: string;
    platform?: string;
    hashtags?: string;
    has_image?: boolean;
    scheduled_for?: string; // ISO
  } | null;

  if (!body?.caption || body.caption.trim().length < 5) {
    return NextResponse.json({ error: "caption required" }, { status: 400 });
  }
  if (body.caption.length > 3000) {
    return NextResponse.json({ error: "caption too long" }, { status: 400 });
  }

  const apiKey = process.env.ANTHROPIC_API_KEY ?? process.env.ANTHROPIC_API_KEY_APP;
  if (!apiKey) return NextResponse.json({ error: "AI not configured" }, { status: 500 });

  const voicePrompt = await buildBrandVoicePrompt(user.id);

  const system = `You predict engagement for a draft social media post BEFORE it goes live. You are pragmatic and specific — not generic advice.

Consider:
- Does it have a hook in the first line?
- Is the tone right for the platform (IG casual, LinkedIn professional, etc.)?
- Is there a clear CTA (save, comment, share, click bio)?
- Is it too salesy / too jargon-heavy?
- Image/no image impact on reach
- Hashtag relevance + count for the platform
- Time slot relevance (posted at 3 AM = poor; peak hours = boost)
- Length: IG captions 125 chars performs best for reach; LinkedIn 1300-2000

Output STRICT JSON:
{
  "score": 0-100,
  "label": "Likely low | Likely moderate | Likely high | Likely viral",
  "reasoning": "2-3 sentences on WHY the score — specific issues or strengths",
  "suggestions": [
    "One specific concrete improvement",
    "Another",
    "Up to 4 total"
  ]
}

Scoring guide:
0-30 = structural issues (no hook, wrong platform, banned words)
31-50 = basic but nothing special
51-70 = solid, will get average reach
71-85 = strong, likely above average
86-100 = all the boxes — would predict high engagement

Be honest; don't give 70+ unless the post genuinely has it. Most drafts are 40-60.
Language: match the caption.${voicePrompt}`;

  const platform = (body.platform ?? "instagram").toLowerCase();
  const time = body.scheduled_for ? new Date(body.scheduled_for).toISOString() : "not scheduled";
  const inputContext = `Platform: ${platform}
Has image: ${body.has_image ? "yes" : "no"}
Hashtags: ${body.hashtags || "(none)"}
Scheduled for: ${time}

CAPTION:
${body.caption.trim()}`;

  try {
    const anthropic = new Anthropic({ apiKey });
    const r = await anthropic.messages.create({
      model: HAIKU,
      max_tokens: 800,
      system,
      messages: [{ role: "user", content: inputContext }],
    });
    const text = r.content
      .filter((b) => b.type === "text")
      .map((b) => (b as { text: string }).text)
      .join("");
    const m = text.match(/\{[\s\S]*\}/);
    if (!m) throw new Error("No JSON in response");
    const parsed = JSON.parse(m[0]) as {
      score?: number;
      label?: string;
      reasoning?: string;
      suggestions?: string[];
    };

    return NextResponse.json({
      ok: true,
      score: Math.min(Math.max(parsed.score ?? 50, 0), 100),
      label: parsed.label ?? "Likely moderate",
      reasoning: parsed.reasoning ?? "",
      suggestions: (parsed.suggestions ?? []).slice(0, 4),
    });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Failed" },
      { status: 500 },
    );
  }
}
