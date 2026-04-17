/**
 * POST /api/studio/reels-script — generate a complete Reels/TikTok package.
 *
 * Input: { topic, duration_sec?, hook_style? }
 * Output:
 *   {
 *     hook: "first 2 seconds — must stop the scroll",
 *     scenes: [
 *       { time_sec, voiceover, on_screen_text, image_prompt, b_roll_idea }
 *     ],
 *     caption: "ready-to-post caption",
 *     hashtags: ["..."],
 *     music_style: "suggested vibe for AI music gen"
 *   }
 *
 * One brief → everything needed to generate a full short-form video.
 * Combines with /studio/image, /studio/audio, /studio/video downstream.
 */

import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { createClient } from "@/lib/supabase/server";
import { buildBrandVoicePrompt } from "@/lib/brandVoice";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

const HAIKU = "claude-haiku-4-5-20251001";

const SYSTEM = `You are a senior short-form video scriptwriter (Reels/TikTok/Shorts).

Given a topic and target duration, return a SHOOT-READY package: opening hook, scene-by-scene script with voiceover + on-screen text + AI image prompt + b-roll idea per scene, the post caption, hashtags, and a music style cue.

Output STRICT JSON in this shape:
{
  "hook": "the first ~2 seconds — concrete, scroll-stopping",
  "scenes": [
    {
      "time_sec": "0-3",
      "voiceover": "what you say (max 25 words)",
      "on_screen_text": "big-caption overlay (max 8 words)",
      "image_prompt": "specific AI image prompt for this scene's b-roll: composition, mood, colors, style",
      "b_roll_idea": "alternative if user wants to film instead"
    }
    // 3-6 scenes total — total length matches target duration
  ],
  "caption": "the post caption with line breaks (no hashtags here)",
  "hashtags": ["#tag1", "#tag2", "..."],
  "music_style": "vibe for music generator (e.g. 'lo-fi hip hop, calm, no vocals, 90 BPM')"
}

Rules:
- Hook MUST stop the scroll — bold claim, surprising stat, contrarian take
- Scene durations sum to (close to) the target duration
- Voiceover is conversational, not script-y
- On-screen text is short, punchy, complements voiceover (not a duplicate)
- Image prompts are concrete (composition + mood + colors + style)
- Caption is conversational and ends with a clear CTA
- 5-10 hashtags appropriate for the platform mix (IG/TikTok)
- Music style is concise (genre + mood + tempo + "no vocals" if relevant)
- Language: match the topic's language
- NO markdown, NO preamble, JSON ONLY`;

export async function POST(req: NextRequest) {
  const supa = await createClient();
  const { data: { user } } = await supa.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = (await req.json().catch(() => null)) as {
    topic?: string;
    duration_sec?: number;
    hook_style?: string;
    client_id?: string;
  } | null;

  if (!body?.topic || body.topic.trim().length < 5) {
    return NextResponse.json({ error: "topic too short (min 5 chars)" }, { status: 400 });
  }
  if (body.topic.length > 2000) {
    return NextResponse.json({ error: "topic too long (max 2000)" }, { status: 400 });
  }

  const apiKey = process.env.ANTHROPIC_API_KEY ?? process.env.ANTHROPIC_API_KEY_APP;
  if (!apiKey) return NextResponse.json({ error: "AI not configured" }, { status: 500 });

  const duration = Math.max(10, Math.min(body.duration_sec ?? 30, 90));
  const hookStyle = body.hook_style?.trim() ?? "";

  const voicePrompt = await buildBrandVoicePrompt(user.id, body?.client_id);

  const userMsg = `Topic: ${body.topic.trim()}
Target duration: ${duration} seconds
${hookStyle ? `Hook style preference: ${hookStyle}` : ""}`;

  try {
    const anthropic = new Anthropic({ apiKey });
    const r = await anthropic.messages.create({
      model: HAIKU,
      max_tokens: 2500,
      system: SYSTEM + voicePrompt,
      messages: [{ role: "user", content: userMsg }],
    });
    const text = r.content
      .filter((b) => b.type === "text")
      .map((b) => (b as { text: string }).text)
      .join("");
    const m = text.match(/\{[\s\S]*\}/);
    if (!m) throw new Error("No JSON in response");
    const parsed = JSON.parse(m[0]);
    return NextResponse.json({ ok: true, ...parsed });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Failed" },
      { status: 500 },
    );
  }
}
