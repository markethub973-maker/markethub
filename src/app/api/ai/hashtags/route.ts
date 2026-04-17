/**
 * POST /api/ai/hashtags — generate relevant hashtags from a caption.
 *
 * Input:  { caption, platform?, count? }
 * Output: { hashtags: ["#tag1", ...] } (max 30)
 *
 * Platform-aware: IG likes 10-20 mixed popularity, LinkedIn 3-5, TikTok
 * 5-10 trending. Haiku 4.5 under the hood.
 */

import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { createClient } from "@/lib/supabase/server";
import { buildBrandVoicePrompt } from "@/lib/brandVoice";

export const dynamic = "force-dynamic";
export const maxDuration = 15;

const HAIKU = "claude-haiku-4-5-20251001";

const PLATFORM_GUIDANCE: Record<string, string> = {
  instagram:
    "Instagram: 10-20 hashtags optimal. Mix popular (>1M) with niche (<100K) to avoid being buried. No banned hashtags.",
  linkedin:
    "LinkedIn: 3-5 hashtags ONLY. Professional, industry-specific. No emojis, no trend-chasing.",
  tiktok:
    "TikTok: 5-10 hashtags. Mix 2-3 trending + niche-specific. #fyp and #foryou acceptable.",
  facebook: "Facebook: 3-5 hashtags. Focus on relevance, not trending.",
  twitter:
    "Twitter/X: 1-3 hashtags max. Use sparingly — too many tank reach.",
  youtube:
    "YouTube: 3-5 tags in description. Specific + searchable over trending.",
};

export async function POST(req: NextRequest) {
  const supa = await createClient();
  const { data: { user } } = await supa.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = (await req.json().catch(() => null)) as {
    caption?: string;
    platform?: string;
    count?: number;
    client_id?: string;
  } | null;

  if (!body?.caption || body.caption.trim().length < 5) {
    return NextResponse.json({ error: "caption too short" }, { status: 400 });
  }
  if (body.caption.length > 3000) {
    return NextResponse.json({ error: "caption too long (max 3000)" }, { status: 400 });
  }

  const platform = (body.platform ?? "instagram").toLowerCase();
  const guidance = PLATFORM_GUIDANCE[platform] ?? PLATFORM_GUIDANCE.instagram;
  const count = Math.min(Math.max(body.count ?? 15, 3), 30);

  const apiKey = process.env.ANTHROPIC_API_KEY ?? process.env.ANTHROPIC_API_KEY_APP;
  if (!apiKey) {
    return NextResponse.json({ error: "AI not configured" }, { status: 500 });
  }

  const voicePrompt = await buildBrandVoicePrompt(user.id, body?.client_id);

  const system = `You suggest hashtags for social media posts.

${guidance}

Output STRICT JSON:
{ "hashtags": ["#example1", "#example2", ...] }

Rules:
- All lowercase (except proper nouns).
- No "#" in response? NO — include the # prefix.
- No spam hashtags (#follow4follow, #likeforlike).
- Mix specific-to-caption + broader category + 1-2 location/community if relevant.
- Return exactly ${count} hashtags.
- Language: match the caption's language.${voicePrompt}`;

  try {
    const anthropic = new Anthropic({ apiKey });
    const r = await anthropic.messages.create({
      model: HAIKU,
      max_tokens: 600,
      system,
      messages: [
        {
          role: "user",
          content: `Platform: ${platform}\n\nCaption:\n${body.caption.trim()}`,
        },
      ],
    });
    const text = r.content
      .filter((b) => b.type === "text")
      .map((b) => (b as { text: string }).text)
      .join("");
    const m = text.match(/\{[\s\S]*\}/);
    if (!m) throw new Error("No JSON in response");
    const parsed = JSON.parse(m[0]) as { hashtags?: string[] };
    const hashtags = (parsed.hashtags ?? [])
      .map((h) => (h.startsWith("#") ? h : `#${h}`))
      .filter((h) => /^#[\w\u00C0-\uFFFF]+$/.test(h))
      .slice(0, 30);

    return NextResponse.json({ ok: true, hashtags, platform, count: hashtags.length });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Failed" },
      { status: 500 },
    );
  }
}
