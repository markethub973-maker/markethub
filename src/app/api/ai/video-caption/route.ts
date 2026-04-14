/**
 * POST /api/ai/video-caption — given a public video URL, return:
 *  1. transcript (from Fal Whisper)
 *  2. platform-ready captions (Instagram / LinkedIn / Twitter / TikTok / YouTube)
 *  3. hashtags suggested by the transcript
 *
 * Uses FAL_API_KEY (same as image/video/audio). No new env var needed.
 *
 * Cost: Whisper ~ $0.005/min + one Haiku call (~$0.001).
 */

import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { createClient } from "@/lib/supabase/server";
import { buildBrandVoicePrompt } from "@/lib/brandVoice";

export const dynamic = "force-dynamic";
export const maxDuration = 120;

const HAIKU = "claude-haiku-4-5-20251001";
const FAL_BASE = "https://queue.fal.run";
const WHISPER_ENDPOINT = "fal-ai/whisper";

const PLATFORMS = ["instagram", "linkedin", "twitter", "tiktok", "youtube"] as const;
type Platform = typeof PLATFORMS[number];

export async function POST(req: NextRequest) {
  const supa = await createClient();
  const { data: { user } } = await supa.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = (await req.json().catch(() => null)) as {
    video_url?: string;
    targets?: Platform[];
  } | null;

  if (!body?.video_url) {
    return NextResponse.json({ error: "video_url required" }, { status: 400 });
  }
  try {
    const u = new URL(body.video_url);
    if (!["http:", "https:"].includes(u.protocol)) {
      return NextResponse.json({ error: "invalid url" }, { status: 400 });
    }
  } catch {
    return NextResponse.json({ error: "invalid url" }, { status: 400 });
  }

  const falKey = process.env.FAL_API_KEY;
  const aiKey = process.env.ANTHROPIC_API_KEY ?? process.env.ANTHROPIC_API_KEY_APP;
  if (!falKey) return NextResponse.json({ error: "Video transcription not configured" }, { status: 500 });
  if (!aiKey)  return NextResponse.json({ error: "AI not configured" }, { status: 500 });

  const targets: Platform[] = Array.isArray(body.targets) && body.targets.length > 0
    ? body.targets.filter((t): t is Platform => PLATFORMS.includes(t as Platform))
    : ["instagram", "linkedin", "tiktok"];
  if (targets.length === 0) {
    return NextResponse.json({ error: "no valid targets" }, { status: 400 });
  }

  // ── 1. Transcribe via Fal Whisper ─────────────────────────────────────────
  let transcript = "";
  try {
    const res = await fetch(`${FAL_BASE}/${WHISPER_ENDPOINT}`, {
      method: "POST",
      headers: { Authorization: `Key ${falKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        audio_url: body.video_url,
        task: "transcribe",
        chunk_level: "segment",
      }),
      signal: AbortSignal.timeout(90_000),
    });
    if (!res.ok) {
      return NextResponse.json(
        { error: `Transcription failed: ${res.status} ${(await res.text()).slice(0, 200)}` },
        { status: 502 },
      );
    }
    const data = (await res.json()) as {
      text?: string;
      chunks?: Array<{ text: string }>;
      status_url?: string;
      response_url?: string;
    };
    if (data.text) {
      transcript = data.text;
    } else if (data.status_url && data.response_url) {
      // Poll async
      for (let i = 0; i < 60; i++) {
        await new Promise((r) => setTimeout(r, 1500));
        const sRes = await fetch(data.status_url, { headers: { Authorization: `Key ${falKey}` } });
        if (!sRes.ok) continue;
        const s = await sRes.json();
        if (s.status === "COMPLETED") {
          const fRes = await fetch(data.response_url, { headers: { Authorization: `Key ${falKey}` } });
          const f = await fRes.json();
          transcript = (f.text as string) ?? "";
          break;
        }
        if (s.status === "FAILED") {
          return NextResponse.json(
            { error: `Transcription failed: ${s.error ?? "unknown"}` },
            { status: 502 },
          );
        }
      }
    }
    transcript = transcript.trim();
    if (!transcript) {
      return NextResponse.json({ error: "No speech detected in the video" }, { status: 422 });
    }
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Transcription failed" },
      { status: 500 },
    );
  }

  // ── 2. Generate captions + hashtags via Haiku ─────────────────────────────
  const voicePrompt = await buildBrandVoicePrompt(user.id);

  const system = `You turn a video transcript into platform-ready social captions.

Given the transcript below, produce:
  • A concise caption for EACH requested platform following its rules:
      - instagram: hook on line 1, 3-5 hashtags at end, 300-900 chars
      - linkedin: professional insight + soft question, no hashtags in body, 800-1500 chars
      - twitter: <=270 chars, strongest hook first, 0-1 hashtags
      - tiktok: punchy Gen-Z voice, 2-3 hashtags including #fyp
      - youtube: Shorts description — retention hook + 2-3 short lines + "Subscribe" CTA
  • 8-12 shared hashtags derived from the actual topic of the video

Output STRICT JSON:
{
  "captions": { "instagram": "...", ... },  // only the keys requested
  "hashtags": ["#x", "#y", ...]
}

Rules:
- Match the transcript's language.
- Do NOT invent facts not in the transcript.
- Hashtags: mix niche-specific + broader reach, lowercase, no duplicates.${voicePrompt}

Requested platforms: ${targets.join(", ")}.`;

  try {
    const anthropic = new Anthropic({ apiKey: aiKey });
    const r = await anthropic.messages.create({
      model: HAIKU,
      max_tokens: 2500,
      system,
      messages: [{ role: "user", content: `Transcript:\n${transcript.slice(0, 8000)}` }],
    });
    const text = r.content
      .filter((b) => b.type === "text")
      .map((b) => (b as { text: string }).text)
      .join("");
    const m = text.match(/\{[\s\S]*\}/);
    if (!m) throw new Error("No JSON in captioner response");
    const parsed = JSON.parse(m[0]) as {
      captions?: Partial<Record<Platform, string>>;
      hashtags?: string[];
    };
    const captions: Partial<Record<Platform, string>> = {};
    for (const t of targets) {
      const v = parsed.captions?.[t];
      if (v && typeof v === "string") captions[t] = v.trim();
    }
    const hashtags = (parsed.hashtags ?? [])
      .map((h) => String(h).trim())
      .filter((h) => h.length > 0)
      .slice(0, 12);
    return NextResponse.json({
      ok: true,
      transcript,
      captions,
      hashtags,
    });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Caption generation failed", transcript },
      { status: 500 },
    );
  }
}
