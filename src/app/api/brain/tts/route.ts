/**
 * POST /api/brain/tts — generates Alex's voice from text.
 * Body: { text: string }
 * Returns audio bytes (opus from OpenAI, or mp3 from ElevenLabs).
 *
 * Auth: brain_admin cookie.
 */

import { NextRequest } from "next/server";
import { synthesizeSpeech } from "@/lib/tts";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function POST(req: NextRequest) {
  if (req.cookies.get("brain_admin")?.value !== "1") {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }
  const body = (await req.json().catch(() => ({}))) as { text?: string };
  if (!body.text) {
    return new Response(JSON.stringify({ error: "text required" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }
  const tts = await synthesizeSpeech(body.text);
  if (!tts) {
    return new Response(JSON.stringify({ error: "TTS unavailable" }), {
      status: 502,
      headers: { "Content-Type": "application/json" },
    });
  }
  return new Response(tts.audio, {
    status: 200,
    headers: {
      "Content-Type": tts.mime,
      "Cache-Control": "no-store",
    },
  });
}
