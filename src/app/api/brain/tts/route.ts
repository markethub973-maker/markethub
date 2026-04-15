/**
 * POST /api/brain/tts — generates Alex's voice from text.
 * Body: { text: string, voice?: "onyx" | "alloy" | "nova" | "echo" | "fable" | "shimmer" }
 * Returns audio/opus bytes.
 *
 * Auth: brain_admin cookie.
 */

import { NextRequest } from "next/server";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function POST(req: NextRequest) {
  if (req.cookies.get("brain_admin")?.value !== "1") {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }
  const key = process.env.OPENAI_API_KEY;
  if (!key) {
    return new Response(JSON.stringify({ error: "OPENAI_API_KEY missing" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
  const body = (await req.json().catch(() => ({}))) as { text?: string; voice?: string };
  if (!body.text) {
    return new Response(JSON.stringify({ error: "text required" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }
  const voice = body.voice ?? "onyx";
  const res = await fetch("https://api.openai.com/v1/audio/speech", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "tts-1",
      voice,
      input: body.text.slice(0, 4000),
      response_format: "opus",
      speed: 1.05,
    }),
  });
  if (!res.ok) {
    return new Response(JSON.stringify({ error: `OpenAI ${res.status}` }), {
      status: 502,
      headers: { "Content-Type": "application/json" },
    });
  }
  const buf = await res.arrayBuffer();
  return new Response(buf, {
    status: 200,
    headers: {
      "Content-Type": "audio/ogg; codecs=opus",
      "Cache-Control": "no-store",
    },
  });
}
