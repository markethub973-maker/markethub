/**
 * Campaign Auto-Pilot — single-shot plan generator.
 *
 * Input:  one brief ("Launch our new yoga class, Tuesday evenings, beginner-friendly")
 * Output: 5 posts with caption + image prompt + suggested publish time
 *         (spread over 5 consecutive days, platform-aware).
 *
 * Haiku 4.5 under the hood — low cost ($0.02 per plan), high quality.
 * Images are NOT generated here — the UI generates each individually
 * via /api/studio/image when user clicks "Generate image" per post.
 * This keeps planning cheap and lets the user reject/regenerate ideas
 * before spending $0.003 × 5 = $0.015 on visuals.
 */

import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

const HAIKU = "claude-haiku-4-5-20251001";

const SYSTEM = `You are a senior social media strategist. Given a short campaign brief, produce a 5-post content plan that tells a cohesive story over 5 consecutive days.

Output STRICT JSON in this shape:
{
  "strategy": "one paragraph — the angle you're taking and why",
  "posts": [
    {
      "day": 1,
      "caption": "ready-to-post caption with emojis and line breaks where natural",
      "hook": "short single-sentence summary",
      "platforms": ["instagram", "linkedin"],
      "suggested_time": "HH:MM",
      "image_prompt": "detailed prompt for AI image generator — include style, composition, mood, colors",
      "aspect_ratio": "1:1" | "4:5" | "9:16" | "16:9"
    }
    // ... 5 posts total
  ]
}

Rules:
- Each caption ends with 3-5 relevant hashtags.
- Vary tone across the 5 posts: hook → educate → social-proof → offer → urgency (adapt to the brief).
- Times reflect platform best practices: IG 11:00/18:00, LinkedIn 08:00/12:00, TikTok 19:00/21:00.
- Image prompts are concrete — no generic "nice photo" — specify the scene in one sentence.
- Captions are in the SAME LANGUAGE as the brief.
- NO markdown, NO preamble, JSON ONLY.`;

export async function POST(req: NextRequest) {
  const supa = await createClient();
  const { data: { user } } = await supa.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = (await req.json().catch(() => null)) as {
    brief?: string;
    platforms?: string[];
  } | null;

  if (!body?.brief || body.brief.trim().length < 10) {
    return NextResponse.json(
      { error: "Brief too short (min 10 chars)" },
      { status: 400 },
    );
  }
  if (body.brief.length > 3000) {
    return NextResponse.json({ error: "Brief too long (max 3000)" }, { status: 400 });
  }

  const apiKey = process.env.ANTHROPIC_API_KEY ?? process.env.ANTHROPIC_API_KEY_APP;
  if (!apiKey) {
    return NextResponse.json({ error: "AI not configured" }, { status: 500 });
  }

  const context = body.platforms?.length
    ? `Target platforms: ${body.platforms.join(", ")}.\n\n`
    : "";

  try {
    const anthropic = new Anthropic({ apiKey });
    const r = await anthropic.messages.create({
      model: HAIKU,
      max_tokens: 3000,
      system: SYSTEM,
      messages: [{ role: "user", content: `${context}Brief: ${body.brief.trim()}` }],
    });
    const text = r.content
      .filter((b) => b.type === "text")
      .map((b) => (b as { text: string }).text)
      .join("");
    const m = text.match(/\{[\s\S]*\}/);
    if (!m) throw new Error("No JSON in response");
    const plan = JSON.parse(m[0]);
    return NextResponse.json({ ok: true, ...plan });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Planning failed" },
      { status: 500 },
    );
  }
}
