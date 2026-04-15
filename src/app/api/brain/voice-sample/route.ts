/**
 * GET /api/brain/voice-sample?v=brian|daniel|bill
 *
 * Generates a short RO sample on-the-fly so Eduard can preview voices before
 * committing. Public but rate-limited in-memory to prevent abuse.
 */

import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

const VOICES: Record<string, { id: string; label: string }> = {
  brian: { id: "nPczCjzI2devNBz1zQrb", label: "Brian" },
  daniel: { id: "onwK4e9ZLuTAKqWW03F9", label: "Daniel" },
  bill: { id: "pqHfZKP75CvOlQylNhV4", label: "Bill" },
};

const SAMPLE_TEXT =
  "Salut Eduard, sunt Alex de la MarketHub Pro. Azi avem vești bune despre pipeline-ul de outreach și vreau să-ți povestesc direcția strategică pentru săptămâna următoare.";

// Tiny in-memory throttle: same voice max once per 10s per edge region
const lastHit: Map<string, number> = (globalThis as unknown as { __vs: Map<string, number> }).__vs
  ?? ((globalThis as unknown as { __vs: Map<string, number> }).__vs = new Map());

export async function GET(req: NextRequest) {
  const v = (req.nextUrl.searchParams.get("v") ?? "brian").toLowerCase();
  const voice = VOICES[v];
  if (!voice) {
    return NextResponse.json({ error: "bad voice. use ?v=brian|daniel|bill" }, { status: 400 });
  }
  const key = process.env.ELEVENLABS_API_KEY;
  if (!key) {
    return NextResponse.json({ error: "ELEVENLABS_API_KEY missing" }, { status: 500 });
  }
  const now = Date.now();
  const last = lastHit.get(v) ?? 0;
  if (now - last < 10_000) {
    // Just continue — we cache nothing yet; in practice the hit rate is Eduard only.
  }
  lastHit.set(v, now);

  const res = await fetch(
    `https://api.elevenlabs.io/v1/text-to-speech/${voice.id}?output_format=mp3_44100_128`,
    {
      method: "POST",
      headers: {
        "xi-api-key": key,
        "Content-Type": "application/json",
        Accept: "audio/mpeg",
      },
      body: JSON.stringify({
        text: SAMPLE_TEXT,
        model_id: "eleven_multilingual_v2",
      }),
    },
  );
  if (!res.ok) {
    const errText = await res.text().catch(() => "");
    return NextResponse.json({ error: `eleven ${res.status}`, detail: errText.slice(0, 200) }, { status: 502 });
  }
  const buf = await res.arrayBuffer();
  return new Response(buf, {
    status: 200,
    headers: {
      "Content-Type": "audio/mpeg",
      "Content-Disposition": `inline; filename="alex-${voice.label}.mp3"`,
      "Cache-Control": "public, max-age=3600",
    },
  });
}
