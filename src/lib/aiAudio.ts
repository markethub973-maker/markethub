/**
 * AI Audio — TTS / music / SFX via Fal.ai.
 *
 * Uses the same FAL_API_KEY as Image + Video. No new env var needed.
 *
 * Models per mode:
 *  - tts:    fal-ai/kokoro/american-english (~$0.001 per second of audio)
 *  - music:  fal-ai/cassetteai/music-generator (~$0.002/sec)
 *  - sfx:    fal-ai/elevenlabs/sound-effects (~$0.05/clip)
 */

import { createServiceClient } from "@/lib/supabase/service";
import { dispatchWebhookEvent } from "@/lib/outboundWebhooks";

const FAL_BASE = "https://queue.fal.run";

// Add audio.generated to webhook event catalog dynamically? Already exists
// in SUPPORTED_EVENTS list — see src/lib/outboundWebhooks.ts. If not there,
// dispatchWebhookEvent will silently skip subscribers. That's fine — we
// add it to the catalog in the next outboundWebhooks edit.

const MODELS = {
  tts:    { endpoint: "fal-ai/kokoro/american-english", cost_per_sec: 0.001 },
  music:  { endpoint: "fal-ai/cassetteai/music-generator", cost_per_sec: 0.002 },
  sfx:    { endpoint: "fal-ai/elevenlabs/sound-effects", cost_per_sec: 0.01 },
  // Zero-shot voice cloning — user provides 5-15s of their own voice
  // as a reference clip, F5-TTS synthesizes new text in the same voice.
  clone:  { endpoint: "fal-ai/f5-tts", cost_per_sec: 0.002 },
};

export interface AudioInput {
  userId: string;
  mode: "tts" | "music" | "sfx" | "clone";
  prompt: string;
  voice?: string;          // for tts only — e.g. "af_bella"
  duration_sec?: number;   // hint for music/sfx (5-30)
  ref_audio_url?: string;  // for clone — public URL of reference voice sample
  ref_text?: string;       // for clone — exact transcript of the reference clip
  source_context?: string;
  source_ref?: string;
}

export interface AudioResult {
  ok: boolean;
  id: string | null;
  audio_url?: string | null;
  duration_sec?: number;
  cost_usd?: number;
  duration_ms?: number;
  error?: string;
  provider?: string;
}

export async function generateAudio(input: AudioInput): Promise<AudioResult> {
  const service = createServiceClient();
  const config = MODELS[input.mode];

  // 1. Insert row
  const { data: row } = await service
    .from("ai_audio_generations")
    .insert({
      user_id: input.userId,
      provider: "fal",
      model: config.endpoint,
      mode: input.mode,
      prompt: input.prompt,
      voice: input.voice ?? null,
      duration_sec: input.duration_sec ?? null,
      status: "queued",
      source_context: input.source_context ?? null,
      source_ref: input.source_ref ?? null,
    })
    .select("id")
    .single();
  const id = (row?.id as string) ?? null;
  if (!id) return { ok: false, id: null, error: "Failed to record generation" };

  // 2. Dispatch
  const started = Date.now();
  try {
    const result = await callFal(input, config.endpoint);
    const duration_ms = Date.now() - started;
    const audioDur = result.duration_sec ?? input.duration_sec ?? 5;
    const cost = result.ok ? Math.round(audioDur * config.cost_per_sec * 10000) / 10000 : 0;

    await service
      .from("ai_audio_generations")
      .update({
        status: result.ok ? "succeeded" : "failed",
        audio_url: result.audio_url ?? null,
        duration_sec: result.duration_sec ?? input.duration_sec ?? null,
        provider_request_id: result.request_id ?? null,
        error: result.error ?? null,
        cost_usd: cost,
        duration_ms,
        finished_at: new Date().toISOString(),
      })
      .eq("id", id);

    if (result.ok && result.audio_url) {
      void dispatchWebhookEvent(input.userId, "audio.generated", {
        generation_id: id,
        audio_url: result.audio_url,
        mode: input.mode,
        duration_sec: result.duration_sec ?? input.duration_sec ?? null,
        cost_usd: cost,
        provider: "fal",
      });
    }

    return {
      ok: result.ok,
      id,
      audio_url: result.audio_url,
      duration_sec: result.duration_sec ?? input.duration_sec,
      cost_usd: cost,
      duration_ms,
      error: result.error,
      provider: "fal",
    };
  } catch (e) {
    const duration_ms = Date.now() - started;
    const errMsg = e instanceof Error ? e.message : "unknown";
    await service
      .from("ai_audio_generations")
      .update({ status: "failed", error: errMsg, duration_ms, finished_at: new Date().toISOString() })
      .eq("id", id);
    return { ok: false, id, error: errMsg, duration_ms, provider: "fal" };
  }
}

interface FalResult {
  ok: boolean;
  audio_url?: string;
  duration_sec?: number;
  request_id?: string;
  error?: string;
}

async function callFal(input: AudioInput, endpoint: string): Promise<FalResult> {
  const key = process.env.FAL_API_KEY;
  if (!key) return { ok: false, error: "FAL_API_KEY not configured" };

  // Per-mode body shape — Fal endpoints differ
  let body: Record<string, unknown>;
  switch (input.mode) {
    case "tts":
      body = {
        prompt: input.prompt,
        voice: input.voice ?? "af_heart",
        speed: 1.0,
      };
      break;
    case "music":
      body = {
        prompt: input.prompt,
        duration: Math.min(Math.max(input.duration_sec ?? 10, 5), 30),
      };
      break;
    case "sfx":
      body = {
        text: input.prompt,
        duration_seconds: Math.min(Math.max(input.duration_sec ?? 5, 1), 22),
      };
      break;
    case "clone":
      if (!input.ref_audio_url || !input.ref_text) {
        return { ok: false, error: "ref_audio_url and ref_text are required for voice cloning" };
      }
      body = {
        gen_text: input.prompt,
        ref_audio_url: input.ref_audio_url,
        ref_text: input.ref_text,
        remove_silence: true,
      };
      break;
  }

  const res = await fetch(`${FAL_BASE}/${endpoint}`, {
    method: "POST",
    headers: { Authorization: `Key ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(60_000),
  });
  if (!res.ok) {
    return { ok: false, error: `Fal returned ${res.status}: ${(await res.text()).slice(0, 200)}` };
  }
  const data = (await res.json()) as {
    request_id?: string;
    status_url?: string;
    response_url?: string;
    audio?: { url?: string; duration?: number };
    audio_url?: string;
  };

  if (data.audio?.url || data.audio_url) {
    return {
      ok: true,
      audio_url: data.audio?.url ?? data.audio_url,
      duration_sec: data.audio?.duration,
      request_id: data.request_id,
    };
  }

  // Async — poll
  if (data.status_url && data.response_url) {
    for (let i = 0; i < 60; i++) {
      await new Promise((r) => setTimeout(r, 1500));
      const statusRes = await fetch(data.status_url, { headers: { Authorization: `Key ${key}` } });
      if (!statusRes.ok) continue;
      const status = await statusRes.json();
      if (status.status === "COMPLETED") {
        const finalRes = await fetch(data.response_url, { headers: { Authorization: `Key ${key}` } });
        const final = await finalRes.json();
        const url = final.audio?.url ?? final.audio_url;
        if (url) {
          return {
            ok: true,
            audio_url: url,
            duration_sec: final.audio?.duration,
            request_id: data.request_id,
          };
        }
      }
      if (status.status === "FAILED") {
        return { ok: false, error: status.error ?? "Fal generation failed", request_id: data.request_id };
      }
    }
    return { ok: false, error: "Fal generation timeout", request_id: data.request_id };
  }
  return { ok: false, error: "Unexpected Fal response shape" };
}
