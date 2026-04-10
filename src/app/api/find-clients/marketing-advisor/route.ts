import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { safeAnthropic } from "@/lib/serviceGuard";
import { getMarketContext } from "@/lib/marketContext";
import { getMarketIntelligence } from "@/lib/marketSearch";
import { calcAnthropicCost, logApiCost } from "@/lib/costTracker";
import { getAppAnthropicClient } from "@/lib/anthropic-client";
import { checkAndIncrDailyLimit, limitExceededResponse } from "@/lib/dailyLimits";
import { consumePremiumAction } from "@/lib/premiumActions";
import { getPlanConfig } from "@/lib/plan-config";
import {
  getLanguageByCode, getCountryByCode, recommendedPlatforms, buildLanguageInstruction,
  type MarketScope,
} from "@/lib/markets";
import { SYSTEM_MARKETING_ADVISOR as SYSTEM_BASE, buildFindClientsSystem } from "@/lib/ai-prompts";


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

  // Daily limit per plan
  const { data: profile } = await supabase.from("profiles").select("plan").eq("id", user.id).single();
  const userPlan = (profile as any)?.plan ?? "free_test";
  const limitCheck = await checkAndIncrDailyLimit(user.id, userPlan, "apex");
  if (!limitCheck.allowed) return NextResponse.json(limitExceededResponse(limitCheck, "apex"), { status: 429 });

  const {
    step, offer_type, offer_description, audience_type,
    location, budget_range, context, question,
    market_scope, country, countries, continent, content_language,
  } = await req.json();

  if (!offer_description && !question) {
    return NextResponse.json({ error: "offer_description or question required" }, { status: 400 });
  }

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

  // Resolve target market — prefer the structured country (since the wizard
  // now ships an ISO code) and fall back to the legacy free-text location.
  const countryName = getCountryByCode(country)?.name;
  const resolvedLocation = countryName
    || (typeof location === "string" && location.trim() ? location.trim() : "");
  const [mctx, intel] = await Promise.all([
    Promise.resolve(getMarketContext(resolvedLocation || undefined)),
    getMarketIntelligence({
      offerType:        offer_type        || "service",
      offerDescription: offer_description || "",
      location:         resolvedLocation,
      question:         question          || "",
    }),
  ]);

  const stepLabels: Record<number, string> = {
    1: "defining the offer",
    2: "choosing target audience",
    3: "selecting search sources",
    4: "analyzing found leads",
    5: "creating outreach and campaign",
  };

  const marketLabel = resolvedLocation || "global (no specific market provided)";

  // Build the language enforcement block via the shared helper. When
  // content_language is set (the wizard now always sends one), the output
  // language is forced AND the per-language vocabulary pack is injected
  // (RO marriage verbs, EL Greek alphabet, DE Sie capitalization, etc.).
  // When nothing is set, falls back to auto-detect.
  const lang = getLanguageByCode(content_language);
  const languageBlock = buildLanguageInstruction(content_language);

  const platformsBlock = (() => {
    const platforms = recommendedPlatforms({
      scope: (market_scope as MarketScope) || "worldwide",
      country, countries, continent,
    });
    if (!platforms.length) return "";
    return `\nChannels that actually move volume in ${marketLabel}: ${platforms.join(", ")}. Bias your platform recommendations toward these instead of generic global picks (Reddit, Twitter, etc. that have low traction in this market).`;
  })();

  const SYSTEM = `${languageBlock}\n\n${SYSTEM_BASE}`;

  const prompt = `${intel.promptBlock ? `=== LIVE WEB INTELLIGENCE (fetched now from NewsAPI + YouTube) ===\n${intel.promptBlock}\n` : ""}=== REAL-TIME CONTEXT ===
Current date/time: ${mctx.dayOfWeek}, ${mctx.timeOfDay} (timezone: ${mctx.timezone})
Season: ${mctx.season} (${mctx.hemisphere === "S" ? "Southern" : "Northern"} hemisphere)
Platform peaking NOW: ${mctx.platformPeakNow}
Upcoming events & cultural moments: ${mctx.upcomingEvents.join("; ")}
Seasonal buying behaviour: ${mctx.buyingPatterns}
Active urgency signals: ${mctx.urgencySignals.join("; ")}
Avoid now: ${mctx.antiPatterns.join("; ")}

=== CAMPAIGN DETAILS ===
Wizard step: ${step} — ${stepLabels[step] || "unknown"}
Offer type: ${offer_type || "unknown"}
Offer: ${offer_description || ""}
Audience: ${audience_type || "b2c"}
Location/market: ${marketLabel}${countryName ? ` (ISO ${country})` : ""}
Output language: ${lang ? `${lang.name} (${lang.nativeName})` : "auto-detected from question"}
Budget: ${budget_range || "unknown"}${platformsBlock}
${context ? `\nAdditional context:\n${JSON.stringify(context, null, 2)}` : ""}

${question ? `User question: ${question}` : `Provide expert APEX advice for step ${step}.`}

CRITICAL INSTRUCTIONS:
- Respect the language requirement defined in the system prompt — do NOT switch languages.
- Adapt platform recommendations, timing, examples, and cultural references to the market: ${marketLabel}.
- If no specific market is provided, give globally-applicable guidance and say so.
- Be specific to this exact market. If you don't have specific local data, say so and give best global guidance.
- Match response length to question complexity — concise for simple questions, detailed for complex ones.
- NEVER invent data. Use only real, verifiable information.`;

  const MODEL = getPlanConfig(userPlan).premium_action_model;
  const sessionId = req.headers.get("x-cost-session") || "unknown";

  // Retry once if JSON is not returned (Haiku occasionally skips format)
  async function callApex(extraHint = "") {
    return safeAnthropic(() =>
      anthropic.messages.create({
        model:      MODEL,
        max_tokens: 5000,
        system:     SYSTEM,
        messages:   [
          { role: "user", content: prompt + extraHint + "\n\nReturn ONLY a valid JSON object starting with { and ending with }. No markdown, no explanation." },
        ],
      })
    );
  }

  let result = await callApex();

  if (!result.ok) {
    return NextResponse.json(
      { error: result.error, service: "anthropic", degraded: true },
      { status: 503 }
    );
  }

  // Log cost (non-fatal)
  void logApiCost({
    userId: user.id, sessionId, service: "anthropic", operation: "marketing_advisor",
    model: MODEL,
    inputTokens: result.data.usage.input_tokens,
    outputTokens: result.data.usage.output_tokens,
    costUsd: calcAnthropicCost(MODEL, result.data.usage.input_tokens, result.data.usage.output_tokens),
  });

  try {
    const rawText = result.data.content[0].type === "text" ? result.data.content[0].text : "";
    const text = rawText;
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      // Retry once with explicit reminder
      result = await callApex("\n\nIMPORTANT: Return ONLY the JSON object, starting with { and ending with }. No explanation.");
      if (!result.ok) return NextResponse.json({ error: "AI parse error" }, { status: 500 });
      const retryText = (result.data.content[0].type === "text" ? result.data.content[0].text : "");
      const retryMatch = retryText.match(/\{[\s\S]*\}/);
      if (!retryMatch) return NextResponse.json({ error: "AI parse error" }, { status: 500 });
      const retryParsed = JSON.parse(sanitizeJson(retryMatch[0]));
      return NextResponse.json({
        ...retryParsed,
        meta: {
          premium_action_consumed: true,
          remaining: premium.remaining,
          resets_at: premium.resets_at,
        },
      });
    }
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
