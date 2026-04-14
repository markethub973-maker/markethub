/**
 * POST /api/v1/ai/thumbnail — Bearer-token YouTube thumbnail generator.
 * Returns { id, image_url, cost_usd } (16:9, 1280x720). Pro+.
 */

import { NextRequest, NextResponse } from "next/server";
import { authorizeV1 } from "@/lib/apiV1Auth";
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
  const auth = await authorizeV1(req);
  if (!auth.ok) return auth.response;

  const body = (await req.json().catch(() => null)) as {
    title?: string;
    topic?: string;
    style?: keyof typeof STYLE_PRESETS;
    accent?: string;
  } | null;

  if (!body?.title || body.title.trim().length < 3) {
    return NextResponse.json({ error: "title required (min 3 chars)" }, { status: 400 });
  }
  if (body.title.length > 120) {
    return NextResponse.json({ error: "title too long (max 120)" }, { status: 400 });
  }

  const style = body.style && STYLE_PRESETS[body.style] ? body.style : "bold";
  const topic = body.topic?.trim().slice(0, 200) ?? "";
  const accent = body.accent?.trim().slice(0, 200) ?? "";

  const prompt = [
    `YouTube thumbnail, 16:9, 1280x720, eye-catching.`,
    `Large bold text overlay that reads exactly: "${body.title.trim()}" — impact sans-serif, thick white stroke, drop shadow, placed to leave the subject visible.`,
    topic ? `Topic: ${topic}.` : "",
    accent ? `Include: ${accent}.` : "",
    `Style: ${STYLE_PRESETS[style]}.`,
    `Rule-of-thirds composition, strong focal subject, clean background, no extra small text.`,
  ].filter(Boolean).join(" ");

  const result = await generateImage({
    userId: auth.userId,
    prompt,
    aspect_ratio: "16:9",
    source_context: "thumbnail",
    source_ref: body.title.trim().slice(0, 80),
    negative_prompt: "low quality, blurry, watermark, extra tiny text, crowded composition, misspelled letters",
  });
  return NextResponse.json(result, { status: result.ok ? 202 : 500 });
}
