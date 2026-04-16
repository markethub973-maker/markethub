/**
 * Eduard Avatar Video — talking-head generator with Eduard's real face.
 *
 * Pipeline (validated 2026-04-16, see memory `avatar_pipeline_validated.md`):
 *   1. Reference photo: Eduard headshot stored in Supabase public-assets.
 *   2. (optional) Scene context via fal-ai/flux-pro/kontext/max — adds desk,
 *      office, lighting WITHOUT regenerating the face. Skip if no scene
 *      change needed.
 *   3. Animation + lip sync via fal-ai/bytedance/omnihuman — takes the image
 *      + audio URL and produces a talking video with REAL identity preservation
 *      and natural body micro-motion.
 *
 * Constraints:
 *   - Audio MUST be ≤30 seconds (OmniHuman hard limit). Shorten the script
 *     upstream OR chunk + concat afterwards.
 *   - Audio URL must be publicly fetchable (fal.media, Supabase public bucket,
 *     or any open https endpoint).
 *
 * Cost (per 25-second video): ~$0.40
 *   - Kontext Max scene edit: ~$0.05
 *   - OmniHuman talking head: ~$0.35
 *
 * REJECTED alternatives (do NOT swap in):
 *   - PuLID-Flux → regenerates face, produces "mask" lookalike. Eduard rejected.
 *   - Sync-Lipsync v2 on static MP4 → adds zero motion when input is image-derived.
 *   - Hedra Character-2/3 → 404 on fal as of 2026-04-16.
 */

/**
 * Default avatar reference. The "at desk" variant is a Kontext-edited version
 * of the original Eduard photo that adds desk + bookshelves + warm lighting
 * while preserving the face exactly. Pre-generated once and stored in
 * Supabase so request-path avatar generation only needs OmniHuman (~2 min)
 * and stays under the Cloudflare 524 timeout.
 *
 * Override via EDUARD_AVATAR_URL env var if a different baseline is needed,
 * or pass `reference_image_url` per call.
 */
const REF_PHOTO_DESK_URL =
  "https://kashohhwsxyhyhhppvik.supabase.co/storage/v1/object/public/public-assets/avatars/eduard_avatar_at_desk_v1.png";
const REF_PHOTO_NEUTRAL_URL =
  "https://kashohhwsxyhyhhppvik.supabase.co/storage/v1/object/public/public-assets/avatars/eduard_avatar_v1.png";
const REF_PHOTO_URL = process.env.EDUARD_AVATAR_URL ?? REF_PHOTO_DESK_URL;

export interface EduardAvatarInput {
  /** Public URL to a ≤30s audio file (mp3/wav). Required. */
  audio_url: string;
  /**
   * Optional Kontext scene prompt. If provided, the reference photo is first
   * edited to add this scene (desk, office, etc.) while preserving the face.
   * If omitted, the original headshot is animated as-is (neutral background).
   */
  scene_prompt?: string;
  /** Output aspect ratio for the scene edit. Default 16:9. */
  aspect_ratio?: "16:9" | "9:16" | "1:1";
  /** Override reference photo URL (rare — usually use the default). */
  reference_image_url?: string;
}

export interface EduardAvatarResult {
  ok: boolean;
  video_url?: string;
  scene_image_url?: string;
  cost_usd: number;
  duration_ms: number;
  error?: string;
}

const FAL_BASE = "https://queue.fal.run";

async function falSubmit(model: string, input: Record<string, unknown>): Promise<string> {
  const r = await fetch(`${FAL_BASE}/${model}`, {
    method: "POST",
    headers: {
      Authorization: `Key ${process.env.FAL_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(input),
  });
  if (!r.ok) throw new Error(`fal submit ${r.status}: ${await r.text()}`);
  const j = (await r.json()) as { request_id: string };
  return j.request_id;
}

async function falWait(model: string, requestId: string, timeoutMs = 240_000): Promise<unknown> {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    await new Promise((res) => setTimeout(res, 5000));
    const stat = await fetch(`${FAL_BASE}/${model}/requests/${requestId}/status`, {
      headers: { Authorization: `Key ${process.env.FAL_API_KEY}` },
    });
    const sj = (await stat.json()) as { status: string };
    if (sj.status === "COMPLETED") {
      const res = await fetch(`${FAL_BASE}/${model}/requests/${requestId}`, {
        headers: { Authorization: `Key ${process.env.FAL_API_KEY}` },
      });
      return await res.json();
    }
    if (sj.status === "FAILED" || sj.status === "ERROR") {
      const err = await fetch(`${FAL_BASE}/${model}/requests/${requestId}`, {
        headers: { Authorization: `Key ${process.env.FAL_API_KEY}` },
      });
      throw new Error(`fal failed: ${(await err.text()).slice(0, 300)}`);
    }
  }
  throw new Error(`fal timeout after ${timeoutMs}ms`);
}

/**
 * Async submit — returns immediately with the OmniHuman request_id.
 * The video isn't ready yet; call `getEduardAvatarVideo(requestId)` to
 * poll status / fetch the URL when COMPLETED. Use this from request
 * handlers that must finish under proxy timeouts (~100s Cloudflare).
 */
export async function submitEduardAvatarJob(input: {
  audio_url: string;
  reference_image_url?: string;
}): Promise<{
  ok: boolean;
  request_id?: string;
  image_url?: string;
  error?: string;
  balance_exhausted?: boolean;
}> {
  if (!process.env.FAL_API_KEY) return { ok: false, error: "FAL_API_KEY not set" };
  if (!input.audio_url) return { ok: false, error: "audio_url required" };
  const imageUrl = input.reference_image_url ?? REF_PHOTO_URL;
  try {
    const requestId = await falSubmit("fal-ai/bytedance/omnihuman", {
      image_url: imageUrl,
      audio_url: input.audio_url,
    });
    return { ok: true, request_id: requestId, image_url: imageUrl };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    // Detect the fal.ai "balance exhausted" lock explicitly so callers
    // (alex-loom, alex-loom-batch) can surface it to Eduard's Telegram
    // instead of silently marking avatar as "skipped". Seen 2026-04-16
    // when the free credit ran out — no new jobs accepted + old jobs
    // stuck IN_QUEUE indefinitely until top-up.
    const balanceExhausted = /exhausted balance|user is locked|top up your balance/i.test(msg);
    return {
      ok: false,
      error: msg,
      balance_exhausted: balanceExhausted,
    };
  }
}

/**
 * Poll status / fetch result of a previously submitted OmniHuman job.
 * Status one of: IN_QUEUE | IN_PROGRESS | COMPLETED | FAILED | ERROR.
 */
export async function getEduardAvatarJob(
  requestId: string,
): Promise<{ status: string; video_url?: string; error?: string }> {
  if (!process.env.FAL_API_KEY) return { status: "ERROR", error: "FAL_API_KEY not set" };
  try {
    const stat = await fetch(
      `${FAL_BASE}/fal-ai/bytedance/requests/${requestId}/status`,
      { headers: { Authorization: `Key ${process.env.FAL_API_KEY}` } },
    );
    const sj = (await stat.json()) as { status: string };
    if (sj.status !== "COMPLETED") return { status: sj.status };
    const res = await fetch(
      `${FAL_BASE}/fal-ai/bytedance/requests/${requestId}`,
      { headers: { Authorization: `Key ${process.env.FAL_API_KEY}` } },
    );
    const j = (await res.json()) as { video?: { url: string } };
    return { status: "COMPLETED", video_url: j.video?.url };
  } catch (e) {
    return { status: "ERROR", error: e instanceof Error ? e.message : String(e) };
  }
}

/**
 * Generate a talking-head video of Eduard speaking the provided audio,
 * optionally placing him in a custom scene (desk, office, etc.).
 */
export async function generateEduardAvatarVideo(
  input: EduardAvatarInput,
): Promise<EduardAvatarResult> {
  const start = Date.now();
  if (!process.env.FAL_API_KEY) {
    return { ok: false, cost_usd: 0, duration_ms: 0, error: "FAL_API_KEY not set" };
  }
  if (!input.audio_url) {
    return { ok: false, cost_usd: 0, duration_ms: 0, error: "audio_url required" };
  }

  let imageUrl = input.reference_image_url ?? REF_PHOTO_URL;
  let sceneCost = 0;
  let sceneImageUrl: string | undefined;

  // Step 1 (optional): edit scene context while preserving face
  if (input.scene_prompt) {
    try {
      const fullPrompt =
        `${input.scene_prompt} ` +
        `Keep the person's face, head shape, beard, eyes, mouth, skin tone, ` +
        `and shirt EXACTLY identical to the input photo. ` +
        `Do not modify the person at all — only the surroundings.`;
      const reqId = await falSubmit("fal-ai/flux-pro/kontext/max", {
        image_url: imageUrl,
        prompt: fullPrompt,
        aspect_ratio: input.aspect_ratio ?? "16:9",
        num_images: 1,
        safety_tolerance: "3",
        output_format: "png",
      });
      const r = (await falWait("fal-ai/flux-pro/kontext/max", reqId, 120_000)) as {
        images?: Array<{ url: string }>;
      };
      const url = r.images?.[0]?.url;
      if (url) {
        imageUrl = url;
        sceneImageUrl = url;
        sceneCost = 0.05;
      }
    } catch (e) {
      // Scene edit failed — continue with original photo (better to ship
      // the avatar without scene than to fail entirely).
      console.error("[eduardAvatar] kontext scene edit failed:", e);
    }
  }

  // Step 2: OmniHuman lip sync animation
  try {
    const reqId = await falSubmit("fal-ai/bytedance/omnihuman", {
      image_url: imageUrl,
      audio_url: input.audio_url,
    });
    const r = (await falWait("fal-ai/bytedance", reqId, 240_000)) as {
      video?: { url: string };
    };
    const videoUrl = r.video?.url;
    if (!videoUrl) {
      return {
        ok: false,
        cost_usd: sceneCost,
        duration_ms: Date.now() - start,
        scene_image_url: sceneImageUrl,
        error: "OmniHuman did not return a video URL",
      };
    }
    return {
      ok: true,
      video_url: videoUrl,
      scene_image_url: sceneImageUrl,
      cost_usd: sceneCost + 0.35,
      duration_ms: Date.now() - start,
    };
  } catch (e) {
    return {
      ok: false,
      cost_usd: sceneCost,
      duration_ms: Date.now() - start,
      scene_image_url: sceneImageUrl,
      error: e instanceof Error ? e.message : String(e),
    };
  }
}
