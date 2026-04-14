/**
 * AI Image generation — provider-agnostic interface.
 *
 * Supports Fal.ai (recommended — fast, cheap, good quality), Replicate,
 * and OpenAI DALL·E. Pick provider via AI_IMAGE_PROVIDER env var.
 *
 * To activate on Vercel:
 *   AI_IMAGE_PROVIDER=fal
 *   FAL_API_KEY=<key from fal.ai>
 * OR
 *   AI_IMAGE_PROVIDER=replicate
 *   REPLICATE_API_TOKEN=r8_...
 * OR
 *   AI_IMAGE_PROVIDER=openai  (uses existing ANTHROPIC env? No — OpenAI is separate)
 *   OPENAI_API_KEY=sk-...
 *
 * The lib always inserts an `ai_image_generations` row so cost + usage
 * are visible in M3 cost monitor + admin gallery.
 */

import { createServiceClient } from "@/lib/supabase/service";

type Provider = "fal" | "replicate" | "openai" | "stability";

const DEFAULTS: Record<Provider, { model: string; cost_per_image: number }> = {
  fal:       { model: "fal-ai/flux/schnell", cost_per_image: 0.003 },
  replicate: { model: "black-forest-labs/flux-schnell", cost_per_image: 0.003 },
  openai:    { model: "gpt-image-1", cost_per_image: 0.04 },
  stability: { model: "stable-diffusion-xl-1024-v1-0", cost_per_image: 0.01 },
};

export interface GenerateInput {
  userId: string;
  prompt: string;
  negative_prompt?: string;
  aspect_ratio?: "1:1" | "16:9" | "9:16" | "4:5";
  seed?: number;
  source_context?: string;
  source_ref?: string;
}

export interface GenerateResult {
  ok: boolean;
  id: string | null;
  image_url?: string | null;
  cost_usd?: number;
  duration_ms?: number;
  error?: string;
  provider?: string;
}

function pickProvider(): Provider {
  const raw = (process.env.AI_IMAGE_PROVIDER ?? "").toLowerCase();
  if (raw === "fal" || raw === "replicate" || raw === "openai" || raw === "stability") return raw;
  // Default: fal if key present, else openai, else none
  if (process.env.FAL_API_KEY) return "fal";
  if (process.env.OPENAI_API_KEY) return "openai";
  if (process.env.REPLICATE_API_TOKEN) return "replicate";
  return "fal"; // will fail with clear error if no key
}

function aspectToDimensions(ar: string | undefined): { width: number; height: number } {
  switch (ar) {
    case "16:9": return { width: 1344, height: 768 };
    case "9:16": return { width: 768, height: 1344 };
    case "4:5":  return { width: 896, height: 1152 };
    case "1:1":
    default:      return { width: 1024, height: 1024 };
  }
}

/**
 * Public entrypoint. Creates a DB row FIRST (status=queued), then calls
 * the provider, then updates the row with the result. That way we have
 * an audit trail + visible gallery even if the provider call hangs.
 */
export async function generateImage(input: GenerateInput): Promise<GenerateResult> {
  const provider = pickProvider();
  const { model, cost_per_image } = DEFAULTS[provider];
  const { width, height } = aspectToDimensions(input.aspect_ratio);
  const service = createServiceClient();

  // 1. Insert row up-front
  const { data: row } = await service
    .from("ai_image_generations")
    .insert({
      user_id: input.userId,
      provider,
      model,
      prompt: input.prompt,
      negative_prompt: input.negative_prompt ?? null,
      width,
      height,
      aspect_ratio: input.aspect_ratio ?? "1:1",
      seed: input.seed ?? null,
      status: "queued",
      source_context: input.source_context ?? null,
      source_ref: input.source_ref ?? null,
    })
    .select("id")
    .single();
  const id = (row?.id as string) ?? null;
  if (!id) return { ok: false, id: null, error: "Failed to record generation" };

  // 2. Call provider
  const started = Date.now();
  try {
    const result = await callProvider(provider, input, width, height);
    const duration = Date.now() - started;

    await service
      .from("ai_image_generations")
      .update({
        status: result.ok ? "succeeded" : "failed",
        image_url: result.image_url ?? null,
        provider_request_id: result.request_id ?? null,
        error: result.error ?? null,
        cost_usd: result.ok ? cost_per_image : 0,
        duration_ms: duration,
        finished_at: new Date().toISOString(),
      })
      .eq("id", id);

    return {
      ok: result.ok,
      id,
      image_url: result.image_url,
      cost_usd: result.ok ? cost_per_image : 0,
      duration_ms: duration,
      error: result.error,
      provider,
    };
  } catch (e) {
    const duration = Date.now() - started;
    const errMsg = e instanceof Error ? e.message : "unknown";
    await service
      .from("ai_image_generations")
      .update({
        status: "failed",
        error: errMsg,
        duration_ms: duration,
        finished_at: new Date().toISOString(),
      })
      .eq("id", id);
    return { ok: false, id, error: errMsg, duration_ms: duration, provider };
  }
}

// ── Provider implementations ────────────────────────────────────────────

interface ProviderResult {
  ok: boolean;
  image_url?: string;
  request_id?: string;
  error?: string;
}

async function callProvider(
  provider: Provider,
  input: GenerateInput,
  width: number,
  height: number,
): Promise<ProviderResult> {
  switch (provider) {
    case "fal":       return callFal(input, width, height);
    case "replicate": return callReplicate(input, width, height);
    case "openai":    return callOpenAI(input, width, height);
    case "stability": return callStability(input, width, height);
  }
}

async function callFal(
  input: GenerateInput,
  width: number,
  height: number,
): Promise<ProviderResult> {
  const key = process.env.FAL_API_KEY;
  if (!key) return { ok: false, error: "FAL_API_KEY not configured" };

  // Fal.ai queue API — submit + poll. Short jobs (~3s) usually return
  // inline. Longer ones return a status URL we poll.
  const res = await fetch("https://queue.fal.run/fal-ai/flux/schnell", {
    method: "POST",
    headers: {
      Authorization: `Key ${key}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      prompt: input.prompt,
      image_size: { width, height },
      num_inference_steps: 4,
      num_images: 1,
      enable_safety_checker: true,
      seed: input.seed,
    }),
    signal: AbortSignal.timeout(30_000),
  });
  if (!res.ok) {
    return { ok: false, error: `Fal returned ${res.status}: ${(await res.text()).slice(0, 200)}` };
  }
  const data = (await res.json()) as {
    request_id?: string;
    status_url?: string;
    response_url?: string;
    images?: Array<{ url: string }>;
  };
  // If response contains images directly (sync)
  if (data.images && data.images[0]?.url) {
    return { ok: true, image_url: data.images[0].url, request_id: data.request_id };
  }
  // Otherwise poll status (simple — max 30s)
  if (data.status_url && data.response_url) {
    for (let i = 0; i < 30; i++) {
      await new Promise((r) => setTimeout(r, 1000));
      const statusRes = await fetch(data.status_url, {
        headers: { Authorization: `Key ${key}` },
      });
      const status = await statusRes.json();
      if (status.status === "COMPLETED") {
        const finalRes = await fetch(data.response_url, {
          headers: { Authorization: `Key ${key}` },
        });
        const final = await finalRes.json();
        if (final.images?.[0]?.url) {
          return { ok: true, image_url: final.images[0].url, request_id: data.request_id };
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

async function callReplicate(
  input: GenerateInput,
  width: number,
  height: number,
): Promise<ProviderResult> {
  const key = process.env.REPLICATE_API_TOKEN;
  if (!key) return { ok: false, error: "REPLICATE_API_TOKEN not configured" };

  const res = await fetch("https://api.replicate.com/v1/predictions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
      Prefer: "wait=30",
    },
    body: JSON.stringify({
      version: "black-forest-labs/flux-schnell",
      input: {
        prompt: input.prompt,
        aspect_ratio: input.aspect_ratio ?? "1:1",
        num_outputs: 1,
        seed: input.seed,
      },
    }),
    signal: AbortSignal.timeout(45_000),
  });
  if (!res.ok) {
    return { ok: false, error: `Replicate returned ${res.status}: ${(await res.text()).slice(0, 200)}` };
  }
  const data = (await res.json()) as { id?: string; output?: string[]; status?: string; error?: string };
  if (data.status === "succeeded" && data.output?.[0]) {
    return { ok: true, image_url: data.output[0], request_id: data.id };
  }
  if (data.error) return { ok: false, error: data.error, request_id: data.id };
  return { ok: false, error: "Replicate not ready within 30s", request_id: data.id };
}

async function callOpenAI(
  input: GenerateInput,
  _width: number,
  _height: number,
): Promise<ProviderResult> {
  const key = process.env.OPENAI_API_KEY;
  if (!key) return { ok: false, error: "OPENAI_API_KEY not configured" };

  const sizeMap: Record<string, string> = {
    "1:1": "1024x1024",
    "16:9": "1792x1024",
    "9:16": "1024x1792",
    "4:5": "1024x1024",
  };
  const res = await fetch("https://api.openai.com/v1/images/generations", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "gpt-image-1",
      prompt: input.prompt,
      size: sizeMap[input.aspect_ratio ?? "1:1"] ?? "1024x1024",
      n: 1,
    }),
    signal: AbortSignal.timeout(60_000),
  });
  if (!res.ok) {
    return { ok: false, error: `OpenAI returned ${res.status}: ${(await res.text()).slice(0, 200)}` };
  }
  const data = (await res.json()) as { data?: Array<{ url?: string; b64_json?: string }> };
  const url = data.data?.[0]?.url;
  if (url) return { ok: true, image_url: url };
  return { ok: false, error: "OpenAI returned no image URL" };
}

async function callStability(
  _input: GenerateInput,
  _width: number,
  _height: number,
): Promise<ProviderResult> {
  // Stub — can be implemented if user chooses Stability. Fal covers same
  // use case at lower cost so this is low priority.
  return { ok: false, error: "Stability provider not yet implemented — use fal or replicate" };
}
