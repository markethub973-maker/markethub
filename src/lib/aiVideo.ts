/**
 * AI Video generation — provider-agnostic, same shape as aiImage.ts.
 *
 * Default provider: Fal.ai (Seedance 2.0 — fast, reasonable cost).
 * Falls back to Replicate if FAL_API_KEY is missing.
 *
 * Text-to-video or image-to-video. 5-10 second clips per call. Returns
 * a public URL to the .mp4 file on provider CDN.
 *
 * Activation: if FAL_API_KEY is already set (AI Image Studio), AI Video
 * works instantly too — no new key needed. Seedance uses the same key.
 */

import { createServiceClient } from "@/lib/supabase/service";

type Provider = "fal" | "replicate";

const DEFAULTS: Record<Provider, { model: string; cost_per_video: number }> = {
  fal:       { model: "fal-ai/bytedance/seedance/v1/lite/text-to-video", cost_per_video: 0.30 },
  replicate: { model: "bytedance/seedance-1-lite", cost_per_video: 0.30 },
};

export interface GenerateVideoInput {
  userId: string;
  mode?: "text-to-video" | "image-to-video";
  prompt?: string;
  source_image_url?: string;
  duration_sec?: 5 | 10;
  aspect_ratio?: "16:9" | "9:16" | "1:1";
  seed?: number;
  source_context?: string;
  source_ref?: string;
}

export interface GenerateVideoResult {
  ok: boolean;
  id: string | null;
  video_url?: string | null;
  thumbnail_url?: string | null;
  cost_usd?: number;
  duration_ms?: number;
  error?: string;
  provider?: string;
}

function pickProvider(): Provider {
  const raw = (process.env.AI_VIDEO_PROVIDER ?? "").toLowerCase();
  if (raw === "fal" || raw === "replicate") return raw;
  if (process.env.FAL_API_KEY) return "fal";
  if (process.env.REPLICATE_API_TOKEN) return "replicate";
  return "fal";
}

export async function generateVideo(input: GenerateVideoInput): Promise<GenerateVideoResult> {
  const provider = pickProvider();
  const { model, cost_per_video } = DEFAULTS[provider];
  const service = createServiceClient();
  const mode = input.mode ?? "text-to-video";

  // Validation: need prompt for t2v, image_url for i2v
  if (mode === "text-to-video" && !input.prompt) {
    return { ok: false, id: null, error: "prompt required for text-to-video" };
  }
  if (mode === "image-to-video" && !input.source_image_url) {
    return { ok: false, id: null, error: "source_image_url required for image-to-video" };
  }

  // 1. Insert row up-front
  const { data: row } = await service
    .from("ai_video_generations")
    .insert({
      user_id: input.userId,
      provider,
      model,
      mode,
      prompt: input.prompt ?? null,
      source_image_url: input.source_image_url ?? null,
      duration_sec: input.duration_sec ?? 5,
      aspect_ratio: input.aspect_ratio ?? "9:16",
      seed: input.seed ?? null,
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
    const result = await callProvider(provider, input);
    const duration_ms = Date.now() - started;

    await service
      .from("ai_video_generations")
      .update({
        status: result.ok ? "succeeded" : "failed",
        video_url: result.video_url ?? null,
        thumbnail_url: result.thumbnail_url ?? null,
        provider_request_id: result.request_id ?? null,
        error: result.error ?? null,
        cost_usd: result.ok ? cost_per_video : 0,
        duration_ms,
        finished_at: new Date().toISOString(),
      })
      .eq("id", id);

    return {
      ok: result.ok,
      id,
      video_url: result.video_url,
      thumbnail_url: result.thumbnail_url,
      cost_usd: result.ok ? cost_per_video : 0,
      duration_ms,
      error: result.error,
      provider,
    };
  } catch (e) {
    const duration_ms = Date.now() - started;
    const errMsg = e instanceof Error ? e.message : "unknown";
    await service
      .from("ai_video_generations")
      .update({ status: "failed", error: errMsg, duration_ms, finished_at: new Date().toISOString() })
      .eq("id", id);
    return { ok: false, id, error: errMsg, duration_ms, provider };
  }
}

// ── Provider implementations ────────────────────────────────────────────

interface ProviderResult {
  ok: boolean;
  video_url?: string;
  thumbnail_url?: string;
  request_id?: string;
  error?: string;
}

async function callProvider(provider: Provider, input: GenerateVideoInput): Promise<ProviderResult> {
  if (provider === "fal") return callFal(input);
  return callReplicate(input);
}

async function callFal(input: GenerateVideoInput): Promise<ProviderResult> {
  const key = process.env.FAL_API_KEY;
  if (!key) return { ok: false, error: "FAL_API_KEY not configured" };

  const mode = input.mode ?? "text-to-video";
  const endpoint =
    mode === "image-to-video"
      ? "https://queue.fal.run/fal-ai/bytedance/seedance/v1/lite/image-to-video"
      : "https://queue.fal.run/fal-ai/bytedance/seedance/v1/lite/text-to-video";

  const body: Record<string, unknown> = {
    prompt: input.prompt,
    duration: String(input.duration_sec ?? 5),
    resolution: "720p",
    aspect_ratio: input.aspect_ratio ?? "9:16",
    seed: input.seed,
  };
  if (mode === "image-to-video") body.image_url = input.source_image_url;

  const res = await fetch(endpoint, {
    method: "POST",
    headers: { Authorization: `Key ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(30_000),
  });
  if (!res.ok) {
    return { ok: false, error: `Fal returned ${res.status}: ${(await res.text()).slice(0, 200)}` };
  }
  const data = (await res.json()) as {
    request_id?: string;
    status_url?: string;
    response_url?: string;
    video?: { url?: string };
  };

  // Async: poll the queue (video takes 30-90s)
  if (data.status_url && data.response_url) {
    for (let i = 0; i < 120; i++) { // up to 4 minutes
      await new Promise((r) => setTimeout(r, 2000));
      const statusRes = await fetch(data.status_url, { headers: { Authorization: `Key ${key}` } });
      if (!statusRes.ok) continue;
      const status = await statusRes.json();
      if (status.status === "COMPLETED") {
        const finalRes = await fetch(data.response_url, { headers: { Authorization: `Key ${key}` } });
        const final = await finalRes.json();
        const videoUrl = final.video?.url;
        if (videoUrl) return { ok: true, video_url: videoUrl, request_id: data.request_id };
      }
      if (status.status === "FAILED") {
        return { ok: false, error: status.error ?? "Fal generation failed", request_id: data.request_id };
      }
    }
    return { ok: false, error: "Fal generation timeout (>4min)", request_id: data.request_id };
  }
  // Sync response
  if (data.video?.url) {
    return { ok: true, video_url: data.video.url, request_id: data.request_id };
  }
  return { ok: false, error: "Unexpected Fal response shape" };
}

async function callReplicate(_input: GenerateVideoInput): Promise<ProviderResult> {
  return { ok: false, error: "Replicate video not yet implemented — use fal" };
}
