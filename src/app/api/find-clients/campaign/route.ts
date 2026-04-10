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
import { SYSTEM_CAMPAIGN as SYSTEM_BASE, buildFindClientsSystem } from "@/lib/ai-prompts";


const anthropic = getAppAnthropicClient();

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

  const SYSTEM = buildFindClientsSystem(SYSTEM_BASE, content_language);
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

  const MODEL_C = getPlanConfig(userPlan).premium_action_model;
  const result = await safeAnthropic(() =>
    anthropic.messages.create({
      model: MODEL_C,
      max_tokens: 3000,
      system: SYSTEM,
      messages: [{ role: "user", content: prompt }],
    })
  );

  if (!result.ok) {
    return NextResponse.json({ error: result.error, service: "anthropic", degraded: true }, { status: 503 });
  }


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
