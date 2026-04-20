/**
 * POST /api/ai/thumbnail — generate a YouTube-style thumbnail (16:9)
 * from a title + topic. Wraps the user input in a proven YouTube-thumbnail
 * prompt template (bold colors, high contrast, focal subject, title
 * overlay) and calls generateImage.
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { generateImage } from "@/lib/aiImage";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const STYLE_PRESETS: Record<string, string> = {
  bold:       "bold saturated colors, thick outlines, high contrast, dramatic lighting",
  minimal:    "clean minimal composition, soft gradients, negative space, elegant serif typography",
  cinematic:  "cinematic lighting, shallow depth of field, movie-poster composition, dramatic mood",
  meme:       "playful cartoon style, bright primary colors, exaggerated expressions",
  tech:       "sleek techno-futuristic, neon accents, dark background, holographic overlays",
  tutorial:   "clean instructional layout, arrow annotations, highlighted UI elements",
};

export async function POST(req: NextRequest) {
  const supa = await createClient();
  const { data: { user } } = await supa.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = (await req.json().catch(() => null)) as {
    title?: string;
    topic?: string;
    style?: keyof typeof STYLE_PRESETS;
    accent?: string; // optional subject phrase ("a shocked YouTuber", "a glowing laptop")
  } | null;

  if (!body?.title || body.title.trim().length < 3) {
    return NextResponse.json({ error: "title required (min 3 chars)" }, { status: 400 });
  }
  if (body.title.length > 120) {
    return NextResponse.json({ error: "title too long (max 120)" }, { status: 400 });
  }

  const style = body.style && STYLE_PRESETS[body.style] ? body.style : "bold";
  const styleDesc = STYLE_PRESETS[style];
  const topic = body.topic?.trim().slice(0, 200) ?? "";
  const accent = body.accent?.trim().slice(0, 200) ?? "";

  // Generate image WITHOUT text — AI generators cannot render text correctly,
  // especially in non-English languages. Text overlay is handled client-side.
  const prompt = [
    `YouTube thumbnail background, 16:9, 1280x720, eye-catching, NO TEXT on image.`,
    topic ? `Topic: ${topic}.` : "",
    accent ? `Include: ${accent}.` : "",
    `Style: ${styleDesc}.`,
    `Rule-of-thirds composition, strong focal subject, clean blurred background, space for text overlay.`,
    `IMPORTANT: Do NOT put any text, words, letters, or typography on the image. Clean image only.`,
  ]
    .filter(Boolean)
    .join(" ");

  const result = await generateImage({
    userId: user.id,
    prompt,
    aspect_ratio: "16:9",
    source_context: "thumbnail",
    source_ref: body.title.trim().slice(0, 80),
    negative_prompt: "low quality, blurry, watermark, extra tiny text, crowded composition, misspelled letters",
  });

  return NextResponse.json(result, { status: result.ok ? 202 : 500 });
}
