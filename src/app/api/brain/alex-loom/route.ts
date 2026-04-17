/**
 * POST /api/brain/alex-loom
 *
 * Fully automated personalized video pitch for a prospect.
 * Pipeline:
 *   1. Screenshot prospect's homepage (Apify website-content-crawler)
 *   2. Claude Sonnet writes personalized 30-sec script referencing their site
 *   3. ElevenLabs Daniel voice → MP3 audio
 *   4. Fal.ai image-to-video (Seedance) → 5s animated preview from screenshot
 *   5. Upload both to R2 storage → permanent URLs
 *   6. Store manifest in DB for retrieval
 *
 * Eduard visualizes 30s preview on Telegram, approves, Alex sends to prospect.
 * Zero Eduard execution. €0.32/video (€0.30 Fal + €0.02 other).
 *
 * Auth: brain_admin cookie OR x-brain-cron-secret.
 */

import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import { generateText } from "@/lib/llm";
import { synthesizeSpeech } from "@/lib/tts";
import { generateVideo } from "@/lib/aiVideo";
import { ALEX_KNOWLEDGE_BRIEF } from "@/lib/alex-knowledge";
import { ROMANIAN_TTS_PROMPT_RULES } from "@/lib/romanian-tts-rules";
import { submitEduardAvatarJob } from "@/lib/eduardAvatar";
import { startActivity, completeActivity, failActivity } from "@/lib/agent-activity";
import { screenshotViaLab } from "@/lib/browserbase";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

function authOk(req: NextRequest): boolean {
  const cookieOk = req.cookies.get("brain_admin")?.value === "1";
  const cronOk =
    req.headers.get("x-brain-cron-secret") &&
    req.headers.get("x-brain-cron-secret") === process.env.BRAIN_CRON_SECRET;
  return Boolean(cookieOk || cronOk);
}

/**
 * Screenshot a URL — viewport-only (first fold), 16:9 aspect ratio.
 * Uses Apify screenshot-v3-webhook actor. Returns public URL to PNG.
 *
 * Why viewport-only: full-page scroll screenshots have aspect ratio < 0.4
 * which Kling 2.5 rejects (image_aspect_ratio_error). Viewport = 1440×900
 * = 1.6 ratio = within Kling's 0.4-2.5 valid range.
 */
async function screenshotWebsite(url: string): Promise<string | null> {
  // Primary: Apify website-content-crawler
  const apifyResult = await apifyScreenshot(url);
  if (apifyResult) return apifyResult;

  // Fallback: Browserbase (headless cloud browser via CDP)
  const bb = await screenshotViaLab(url);
  if (bb) return bb.screenshot_url;

  return null;
}

/** Apify screenshot — original provider, may hit quota limits. */
async function apifyScreenshot(url: string): Promise<string | null> {
  const token = process.env.APIFY_TOKEN;
  if (!token) return null;
  try {
    // Use screenshot-url actor (viewport only, not full page)
    const res = await fetch(
      `https://api.apify.com/v2/acts/apify~website-content-crawler/run-sync-get-dataset-items?token=${token}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          startUrls: [{ url }],
          maxCrawlPages: 1,
          saveScreenshots: true,
          initialConcurrency: 1,
          // Viewport screenshot flags (varies by actor version)
          viewportWidth: 1440,
          viewportHeight: 900,
          fullPage: false,
        }),
        signal: AbortSignal.timeout(60_000),
      },
    );
    if (!res.ok) return null;
    const items = (await res.json()) as Array<{ screenshotUrl?: string; url?: string }>;
    return items[0]?.screenshotUrl ?? null;
  } catch {
    return null;
  }
}

export async function POST(req: NextRequest) {
  if (!authOk(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = (await req.json().catch(() => ({}))) as {
    prospect_url?: string;
    prospect_name?: string;
    prospect_email?: string;
    context?: string;
    language?: "ro" | "en";
    show_platform?: boolean; // explicit override
    prospect_type?: "tech_savvy" | "non_tech"; // determines default
  };

  if (!body.prospect_url) {
    return NextResponse.json({ error: "prospect_url required" }, { status: 400 });
  }

  const lang = body.language ?? (body.prospect_url.endsWith(".ro") ? "ro" : "en");

  // Marcus (content) + Iris (copywriter) + Daniel-voice via Alex — parallel
  const activity = await startActivity("content", `Marcus produce AlexLoom pentru ${body.prospect_url}`);

  // Step 1: Pull prospect snippet for context (fast — cached if we scanned them)
  const svc = createServiceClient();
  const domain = body.prospect_url.replace(/^https?:\/\//, "").replace(/^www\./, "").split("/")[0];
  const { data: existing } = await svc
    .from("brain_global_prospects")
    .select("snippet, business_name, country_code, vertical")
    .eq("domain", domain)
    .maybeSingle();

  const snippet = existing?.snippet ?? "(homepage snippet not cached — script will be generic)";
  const businessName = body.prospect_name || existing?.business_name || domain;

  // Step 2: Claude writes 30-sec personalized script
  // RO TTS phonetic rules live in `lib/romanian-tts-rules.ts` so every agent
  // / endpoint generates speakable Romanian — single source of truth.
  const ttsRulesBlock = lang === "ro" ? `\n\n${ROMANIAN_TTS_PROMPT_RULES}\n` : "";
  const scriptSys = `${ALEX_KNOWLEDGE_BRIEF}

---

You are Eduard Bostan, founder of MarketHub Pro. Write a personalized 30-SECOND spoken pitch for a prospect.

Rules:
- Exactly 50-58 words (≈25 seconds at normal pace — HARD limit because the
  OmniHuman avatar talker only accepts audio ≤30s).
- Start with ONE specific observation about their business (use the site snippet).
- ONE clear value proposition — our platform multiplies their content output for small-business clients.
- ONE ask: would they want a free 5-caption + 3-image demo?
- Warm human founder tone. No corporate buzzwords.
- Sign off: "— Eduard." (period included; the SSML wrapper drops tone on the final D for natural calling-out intonation).
- Language: ${lang === "ro" ? "Romanian" : "English"}.${ttsRulesBlock}

Output ONLY the script text, no markdown, no quotes.`;

  const scriptUser = `Prospect: ${businessName}
Domain: ${domain}
Vertical: ${existing?.vertical ?? "unknown"}
Site snippet:
${snippet}

Write the 30-second script now.`;

  const script = await generateText(scriptSys, scriptUser, { maxTokens: 400 });
  if (!script) {
    await failActivity(activity, "Marcus: script generation failed");
    return NextResponse.json({ error: "script generation failed" }, { status: 502 });
  }

  // STRATEGIC: classify prospect for IP-protection decision (Eduard rule).
  // Tech-savvy prospects (digital agencies, SaaS, marketing freelancers) could
  // reverse-engineer our platform if shown — risk losing moat in <1 month.
  // For them: SINGLE screenshot + brand watermark only. No platform reveal.
  // For non-tech (dental, restaurants, lawyers): full dual-utility video OK.
  const techSavvyVerticals = /agency|agentie|agenție|saas|consult|freelanc|marketing|digital|seo|developer|dezvolt|tech|software/i;
  const isTechSavvy =
    body.prospect_type === "tech_savvy" ||
    (body.prospect_type !== "non_tech" && (
      techSavvyVerticals.test(existing?.vertical ?? "") ||
      techSavvyVerticals.test(body.context ?? "") ||
      techSavvyVerticals.test(businessName)
    ));
  const showPlatform = body.show_platform ?? !isTechSavvy;

  // Step 3 (parallel): Screenshots + Voice synthesis
  // Tech-savvy → only their site. Non-tech → both sites (educational dual utility).
  const screenshotPromises: Promise<string | null>[] = [
    screenshotWebsite(body.prospect_url),
  ];
  if (showPlatform) screenshotPromises.push(screenshotWebsite("https://markethubpromo.com/promo"));
  const [screenshotUrl, ...rest] = await Promise.all([...screenshotPromises, synthesizeSpeech(script)]);
  const screenshotMhpUrl = showPlatform ? (rest[0] as string | null) : null;
  const voice = (showPlatform ? rest[1] : rest[0]) as Awaited<ReturnType<typeof synthesizeSpeech>>;

  if (!voice) {
    await failActivity(activity, "Voice synthesis failed");
    return NextResponse.json({ error: "voice synthesis failed (ElevenLabs/OpenAI)" }, { status: 502 });
  }

  // Step 4: Submit Eduard avatar job to OmniHuman queue.
  //
  // ASYNC PATTERN: we only SUBMIT here (returns in ~1s with request_id) and
  // store the request_id on the manifest. A separate cron
  // (/api/brain/alex-loom/avatar-poll) checks pending jobs every minute
  // and pushes the finished video to Telegram when ready. This keeps the
  // alex-loom HTTP response under the Cloudflare ~100s timeout — generating
  // synchronously would 524 because OmniHuman needs ~2 min queue + run.
  let avatarRequestId: string | null = null;
  let audioPublicUrl: string | null = null;
  try {
    const audioFileName = `alex-loom/${domain}-${Date.now()}.mp3`;
    const { data: upload } = await svc.storage
      .from("public-assets")
      .upload(audioFileName, voice.audio, { contentType: voice.mime, upsert: true });
    if (upload) {
      const { data: urlData } = svc.storage.from("public-assets").getPublicUrl(audioFileName);
      audioPublicUrl = urlData.publicUrl;
    }
  } catch { /* audio hosting failed, skip avatar */ }

  // Track explicit failure reasons so the manifest + response don't lie
  // about what happened (previously showed "audio upload failed" even when
  // the actual cause was fal balance exhaustion).
  let avatarFailureReason: string | null = null;
  let avatarBalanceExhausted = false;
  if (audioPublicUrl) {
    const submit = await submitEduardAvatarJob({ audio_url: audioPublicUrl });
    if (submit.ok && submit.request_id) {
      avatarRequestId = submit.request_id;
    } else {
      avatarFailureReason = submit.error ?? "unknown submit failure";
      avatarBalanceExhausted = Boolean(submit.balance_exhausted);
    }
  } else {
    avatarFailureReason = "audio upload to Supabase failed";
  }

  // Step 5: Upload voice audio to R2 (Supabase Storage fallback if R2 fails)
  // For MVP: save as base64 in DB result, frontend/email can inline it or host.
  // Proper solution: R2 upload — deferred to production hardening
  const voiceSize = voice.audio.byteLength;

  // Step 6: Persist manifest. Avatar URL is null for now; the avatar-poll
  // cron will fill it in when OmniHuman finishes and notify Telegram.
  const manifest = {
    prospect_url: body.prospect_url,
    prospect_name: businessName,
    prospect_email: body.prospect_email ?? null,
    domain,
    language: lang,
    script,
    script_word_count: script.split(/\s+/).length,
    voice_mime: voice.mime,
    voice_format: voice.format,
    voice_bytes: voiceSize,
    voice_url: audioPublicUrl,
    screenshot_url: screenshotUrl,
    video_url: null,
    avatar_request_id: avatarRequestId,
    avatar_status: avatarRequestId
      ? "queued"
      : avatarBalanceExhausted
        ? "skipped_balance_exhausted"
        : "skipped",
    avatar_failure_reason: avatarFailureReason,
    avatar_balance_exhausted: avatarBalanceExhausted,
    generated_at: new Date().toISOString(),
  };

  try {
    await svc.from("brain_knowledge_base").insert({
      category: "case_study",
      name: `AlexLoom · ${businessName}`,
      summary: `Personalized video pitch generated for ${domain}`,
      content: manifest as unknown as Record<string, unknown>,
      tags: ["alex-loom", "personalized-video", lang, domain],
      source: "alex-loom endpoint",
      confidence: 1.0,
    });
  } catch { /* non-fatal */ }

  await completeActivity(
    activity,
    `Marcus: AlexLoom gata · ${businessName} · avatar ${avatarRequestId ? "queued (Telegram push when ready)" : "skipped"} · voice ${(voiceSize / 1024).toFixed(0)}KB`,
    { domain, avatar_queued: Boolean(avatarRequestId), avatar_request_id: avatarRequestId, voice_bytes: voiceSize },
  );

  return NextResponse.json({
    ok: true,
    manifest,
    preview: {
      script,
      screenshot_url: screenshotUrl,
      voice_ready: true,
      voice_url: audioPublicUrl,
      voice_bytes: voiceSize,
      voice_provider: voice.provider ?? "unknown",
      avatar_request_id: avatarRequestId,
      avatar_status: avatarRequestId
        ? "queued — Telegram push when ready"
        : avatarBalanceExhausted
          ? "skipped — fal.ai balance exhausted; top up at fal.ai/dashboard/billing"
          : `skipped — ${avatarFailureReason ?? "unknown"}`,
      delivery_format: avatarRequestId
        ? "Eduard avatar video queued (OmniHuman); auto-pushed to Telegram on completion"
        : avatarBalanceExhausted
          ? "screenshot + voice + script (avatar blocked by fal balance — top-up required)"
          : "screenshot + voice + script (avatar skipped)",
    },
    next_action: avatarRequestId
      ? "Cron /api/brain/alex-loom/avatar-poll picks up the queued job and pushes finished video to Telegram. Eduard reviews → approves → Alex emails prospect."
      : "Eduard reviews via Telegram → approves → Alex emails prospect with screenshot + voice audio attached + personalized script",
  });
}
