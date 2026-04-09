import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { safeAnthropic } from "@/lib/serviceGuard";
import { calcAnthropicCost, logApiCost } from "@/lib/costTracker";
import { getAppAnthropicClient } from "@/lib/anthropic-client";
import { checkAndIncrDailyLimit, limitExceededResponse } from "@/lib/dailyLimits";
import { consumePremiumAction } from "@/lib/premiumActions";
import { getPlanConfig } from "@/lib/plan-config";
import {
  buildLanguageInstruction, getCountryByCode, recommendedPlatforms,
  type MarketScope,
} from "@/lib/markets";

const anthropic = getAppAnthropicClient();

const SYSTEM_BASE = `You are an expert marketing copywriter and campaign strategist.

Given an offer, a target lead, the seller's contact details, and targeting filters,
generate a COMPLETE marketing campaign kit with all assets formatted for their specific channel.

CRITICAL RULES:
- Embed actual contact details directly in copy (phone, email, website, social handles) — do NOT use placeholders like [PHONE]
- If a contact field is empty/missing, omit it gracefully — never write "N/A" or placeholders
- Be specific to the location and event types
- Each asset must match its platform's native format and character limits
- Sound like a real person, not a corporate brand
- Every asset must have a clear call-to-action

Return ONLY valid JSON (no markdown, no explanation):
{
  "sms": {
    "text": "SMS message max 160 chars, casual, include phone or link"
  },
  "email": {
    "subject": "subject line max 55 chars",
    "preview": "preview text max 90 chars (shows in inbox)",
    "body": "full email body: greeting, 2-3 short paragraphs, signature with contact info"
  },
  "facebook_post": {
    "text": "Facebook post 150-300 chars, conversational, 2-3 relevant hashtags at end",
    "cta": "call-to-action button text (e.g. Trimite mesaj)"
  },
  "instagram_post": {
    "caption": "Instagram caption 100-200 chars, energetic, 5-8 hashtags",
    "story_hook": "first 3 seconds text overlay (max 8 words)",
    "story_slides": ["slide 1 text", "slide 2 text", "slide 3 text"],
    "story_cta": "swipe-up or link-in-bio CTA text"
  },
  "tiktok": {
    "hook": "opening line for video (first 3 seconds, max 10 words — must stop scroll)",
    "script": "full voiceover script for 30-60 second video",
    "caption": "TikTok caption max 150 chars + 5 hashtags",
    "cta": "end-of-video call to action"
  },
  "whatsapp": {
    "text": "WhatsApp message max 200 chars, friendly and direct, include contact info"
  },
  "landing_page": {
    "headline": "hero headline max 8 words",
    "subheadline": "supporting sentence 15-20 words",
    "bullets": ["benefit/feature 1", "benefit/feature 2", "benefit/feature 3", "benefit/feature 4", "benefit/feature 5"],
    "cta_button": "button text max 4 words",
    "cta_subtext": "trust line below button max 10 words",
    "contact_block": "full contact info block for page footer"
  },
  "video_brief": {
    "concept": "one sentence describing the video concept",
    "duration": "recommended duration",
    "scenes": ["Scene 1: what to film + what to say on camera", "Scene 2: ...", "Scene 3: ...", "Scene 4: ..."],
    "music": "music mood/style recommendation",
    "caption": "social caption to post the video with hashtags"
  },
  "photo_brief": {
    "concept": "one sentence photo concept",
    "shots": ["Shot 1: what to photograph and how", "Shot 2: ...", "Shot 3: ..."],
    "style": "visual style guidance (lighting, composition, mood)",
    "caption": "caption to use when posting photos"
  }
}`;

function sanitizeJson(raw: string): string {
  let sanitized = "";
  let inString = false;
  for (let i = 0; i < raw.length; i++) {
    const ch = raw[i];
    if (ch === '"' && (i === 0 || raw[i - 1] !== "\\")) {
      inString = !inString;
      sanitized += ch;
    } else if (inString && ch === "\n") {
      sanitized += "\\n";
    } else if (inString && ch === "\r") {
      sanitized += "\\r";
    } else if (inString && ch === "\t") {
      sanitized += "\\t";
    } else {
      sanitized += ch;
    }
  }
  return sanitized;
}

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: profile } = await supabase.from("profiles").select("plan").eq("id", user.id).single();
  const userPlan = (profile as any)?.plan ?? "free_test";
  const limitCheck = await checkAndIncrDailyLimit(user.id, userPlan, "apex");
  if (!limitCheck.allowed) return NextResponse.json(limitExceededResponse(limitCheck, "apex"), { status: 429 });

  const {
    offer_summary, outreach_hook, lead, contact, targeting,
    market_scope, country, countries, continent, content_language,
  } = await req.json();
  if (!offer_summary || !lead) return NextResponse.json({ error: "offer_summary and lead required" }, { status: 400 });

  // Premium AI Action — atomic monthly quota debit (validates BEFORE the AI call)
  const premium = await consumePremiumAction(user.id, userPlan);
  if (!premium.allowed) {
    return NextResponse.json(
      {
        error: "LIMIT_REACHED",
        current: premium.used,
        limit: getPlanConfig(userPlan).premium_actions_per_month,
        resetDate: premium.resets_at,
      },
      { status: 402 }
    );
  }

  const SYSTEM = `${buildLanguageInstruction(content_language)}\n\n${SYSTEM_BASE}`;
  const platforms = recommendedPlatforms({
    scope: (market_scope as MarketScope) || "worldwide",
    country, countries, continent,
  });
  const countryName = getCountryByCode(country)?.name;

  // Build contact block — only include fields that have values
  const contactLines = [
    contact?.phone     ? `Phone/WhatsApp: ${contact.phone}` : null,
    contact?.email     ? `Email: ${contact.email}` : null,
    contact?.website   ? `Website: ${contact.website}` : null,
    contact?.instagram ? `Instagram: ${contact.instagram}` : null,
    contact?.facebook  ? `Facebook: ${contact.facebook}` : null,
    contact?.whatsapp  ? `WhatsApp: ${contact.whatsapp}` : null,
  ].filter(Boolean).join("\n");

  const eventTypes = (targeting?.event_types || []).join(", ") || "general";

  const prompt = `Offer: ${offer_summary}
Outreach hook: ${outreach_hook || ""}

Target lead:
- Name/Handle: ${lead.contact_hint || lead.title || "prospect"}
- Platform: ${lead.platform || "unknown"}
- Context: ${(lead.description || lead.text || "").slice(0, 250)}
- Intent signals: ${(lead.signals || []).join(", ")}
- Score: ${lead.score}/10

Seller contact info:
${contactLines || "(no contact info provided — omit contact details from all copy)"}

Targeting:
- Location: ${targeting?.location || countryName || "global (no specific market provided)"}${countryName ? `\n- Country: ${countryName} (ISO ${country})` : ""}
- Event types: ${eventTypes}
- Audience: ${targeting?.audience_type || "b2c"}${platforms.length ? `\n- Channels that actually move volume in this market: ${platforms.join(", ")} (favour these when shaping each asset's tone and CTAs).` : ""}

Generate the complete campaign kit for this offer targeting this specific lead profile.`;

  const result = await safeAnthropic(() =>
    anthropic.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 3000,
      system: SYSTEM,
      messages: [{ role: "user", content: prompt }],
    })
  );

  if (!result.ok) {
    return NextResponse.json({ error: result.error, service: "anthropic", degraded: true }, { status: 503 });
  }

  const MODEL_C = "claude-haiku-4-5-20251001";
  const usageC = result.data.usage;
  void logApiCost({
    userId: user.id, sessionId: req.headers.get("x-cost-session") || "unknown",
    service: "anthropic", operation: "campaign", model: MODEL_C,
    inputTokens: usageC.input_tokens, outputTokens: usageC.output_tokens,
    costUsd: calcAnthropicCost(MODEL_C, usageC.input_tokens, usageC.output_tokens),
  });

  try {
    const text = result.data.content[0].type === "text" ? result.data.content[0].text : "";
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return NextResponse.json({ error: "AI parse error" }, { status: 500 });
    const parsed = JSON.parse(sanitizeJson(jsonMatch[0]));
    return NextResponse.json({
      ...parsed,
      meta: {
        premium_action_consumed: true,
        remaining: premium.remaining,
        resets_at: premium.resets_at,
      },
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
