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
import { startActivity, completeActivity, failActivity } from "@/lib/agent-activity";

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
  const scriptSys = `${ALEX_KNOWLEDGE_BRIEF}

---

You are Alex, founder of MarketHub Pro. Write a personalized 30-SECOND spoken pitch for a prospect.

Rules:
- Exactly 60-75 words (≈30 seconds at normal pace).
- Start with ONE specific observation about their business (use the site snippet).
- ONE clear value proposition — our AI platform = 10x their content output for SMB clients.
- ONE ask: would they want a free 5-caption + 3-image demo?
- Warm human founder tone. No corporate buzzwords.
- Sign off: "— Alex"
- Language: ${lang === "ro" ? "Romanian" : "English"}.
- CRITICAL for ${lang}: use ONLY natural, clean ${lang === "ro" ? "Romanian" : "English"} words. NO mixed-language terms (avoid "content", "dashboard", "AI", "SMB" in Romanian text — use "conținut", "platformă", "inteligență artificială", "firme mici"). Azure TTS struggles on unfamiliar foreign words.
- Spell numbers out (e.g., "zece ori" not "10x", "douăzeci" not "20").
- PUNCTUATION for TTS: only ONE question mark at the END of the actual question. Do NOT end sentences with "?" when the final clause is a subordinate/consequence (e.g., "ca să vezi..."). Put a period there and finish the question earlier. Example WRONG: "Vrei demo, ca să vezi cum arată?" → TTS reads rising intonation on "arată?". Example RIGHT: "Vrei un demo? Ca să vezi cum arată în practică." Split into question + declarative follow-up.
- Each sentence should be 8-15 words max so TTS intonation stays natural.
- AZURE TTS RO QUIRKS — AVOID these word endings (Emil doubles the final 'i'):
  · 2nd person singular verbs ending in "-ezi" (gestionezi, lucrezi, folosești) — replace with noun constructs or "ai" form. Ex: "firmele pe care le ai" NOT "firmele pe care le gestionezi".
  · verbs ending in "-izi" (analizi, organizezi) — replace with periphrase
  · adjectives ending in "-ii" (mulții, clienții — use "mulți clienți")
  · Always prefer: "ai", "vezi", "primești", "ajutăm" (2p sg forms ending in other letters)
- AZURE TTS RO CONTRACTIONS — AVOID hyphenated contractions (Emil pronounces them oddly):
  · "v-ar" → use "ați" form: "V-ar interesa?" → "Ați vrea?"
  · "m-ar" → "Mi-ar plăcea" → "Aș vrea"
  · "ne-ar" → "Ne-ar ajuta" → "Ne ajută"
  · "ți-ar" → "Ți-ar conveni?" → "Vă convine?"
  · General rule: prefer auxiliary forms over contractions. "Ai" "ați" "aș" "ar" with full verb is safer.

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

  // Step 4: Contabo render worker (ffmpeg Ken Burns + text overlay + audio).
  // Text stays legible (pixels only pan/zoom, not AI regenerated like Fal Seedance).
  // €0 marginal cost (Contabo VPS paid 6 months upfront).
  let videoUrl: string | null = null;
  const renderBase = process.env.RENDER_BASE_URL;
  const renderSecret = process.env.RENDER_SECRET;
  // Upload voice audio to Supabase Storage so render worker can fetch it
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
  } catch { /* audio hosting failed, skip video */ }

  if (renderBase && renderSecret && screenshotUrl && audioPublicUrl) {
    try {
      // For tech-savvy prospects: single screenshot only + amber watermark text
      // (MarketHub brand visible but platform NOT shown to prevent cloning).
      // For non-tech: dual screenshot sequential — full educational reveal.
      const renderPayload: Record<string, unknown> = {
        screenshot_url: screenshotUrl,
        audio_url: audioPublicUrl,
        text_overlay: showPlatform ? `Pentru ${businessName}` : `Pentru ${businessName} · MarketHub Pro`,
      };
      if (showPlatform && screenshotMhpUrl) {
        renderPayload.screenshot_url_2 = screenshotMhpUrl;
        renderPayload.text_overlay_2 = "MarketHub Pro · platforma ta AI";
      }
      const renderRes = await fetch(`${renderBase}/render`, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${renderSecret}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(renderPayload),
        signal: AbortSignal.timeout(180_000),
      });
      if (renderRes.ok) {
        const j = (await renderRes.json()) as { ok: boolean; video_url?: string };
        if (j.ok && j.video_url) videoUrl = j.video_url;
      }
    } catch { /* render fail — fallback to static */ }
  }

  // Step 5: Upload voice audio to R2 (Supabase Storage fallback if R2 fails)
  // For MVP: save as base64 in DB result, frontend/email can inline it or host.
  // Proper solution: R2 upload — deferred to production hardening
  const voiceSize = voice.audio.byteLength;

  // Step 6: Persist manifest in new brain_alex_loom_outputs table (if exists) or log
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
    screenshot_url: screenshotUrl,
    video_url: videoUrl,
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
    `Marcus: AlexLoom gata · ${businessName} · video ${videoUrl ? "OK" : "SKIP (no screenshot)"} · voice ${(voiceSize / 1024).toFixed(0)}KB`,
    { domain, video_ok: Boolean(videoUrl), voice_bytes: voiceSize },
  );

  return NextResponse.json({
    ok: true,
    manifest,
    preview: {
      script,
      screenshot_url: screenshotUrl, // STATIC — clean, text legible
      voice_ready: true,
      voice_bytes: voiceSize,
      voice_provider: voice.provider ?? "unknown",
      delivery_format: "screenshot + voice + script (no animated video — prevents fake glyph corruption)",
    },
    next_action: "Eduard reviews via Telegram → approves → Alex emails prospect with screenshot embedded + voice audio attached + personalized script",
  });
}
