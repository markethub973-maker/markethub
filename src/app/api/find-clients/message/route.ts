import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { safeAnthropic } from "@/lib/serviceGuard";
import { calcAnthropicCost, logApiCost } from "@/lib/costTracker";
import { getAppAnthropicClient, OUTPUT_SAFETY_RULES } from "@/lib/anthropic-client";
import { checkAndIncrDailyLimit, limitExceededResponse } from "@/lib/dailyLimits";
import { consumePremiumAction } from "@/lib/premiumActions";
import { getPlanConfig } from "@/lib/plan-config";
import { buildLanguageInstruction, getCountryByCode } from "@/lib/markets";
import { SYSTEM_MESSAGE as SYSTEM_BASE, buildFindClientsSystem } from "@/lib/ai-prompts";


const anthropic = getAppAnthropicClient();

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: profile } = await supabase.from("profiles").select("plan").eq("id", user.id).single();
  const userPlan = (profile as any)?.plan ?? "free_test";
  const limitCheck = await checkAndIncrDailyLimit(user.id, userPlan, "apex");
  if (!limitCheck.allowed) return NextResponse.json(limitExceededResponse(limitCheck, "apex"), { status: 429 });

  const { lead, offer_summary, outreach_hook, country, content_language } = await req.json();
  if (!lead || !offer_summary) return NextResponse.json({ error: "lead and offer_summary required" }, { status: 400 });

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
  const countryName = getCountryByCode(country)?.name;

  const prompt = `
Lead info:
- Name/Handle: ${lead.contact_hint || lead.title || "unknown"}
- Platform: ${lead.platform}
- What they posted/searched: ${(lead.description || lead.text || "").slice(0, 300)}
- Intent signals: ${(lead.signals || []).join(", ")}
- Score: ${lead.score}/10
${countryName ? `- Target market: ${countryName}` : ""}

Offer: ${offer_summary}
Suggested opening hook: ${outreach_hook || ""}

Write personalized outreach messages for this specific lead.`;

  const MODEL_M = getPlanConfig(userPlan).premium_action_model;
  const result = await safeAnthropic(() =>
    anthropic.messages.create({
      model: MODEL_M,
      max_tokens: 1200,
      system: SYSTEM + OUTPUT_SAFETY_RULES,
      messages: [{ role: "user", content: prompt }],
    })
  );

  if (!result.ok) {
    return NextResponse.json({ error: result.error, service: "anthropic", degraded: true }, { status: 503 });
  }


  const usageM = result.data.usage;
  void logApiCost({
    userId: user.id, sessionId: req.headers.get("x-cost-session") || "unknown",
    service: "anthropic", operation: "message", model: MODEL_M,
    inputTokens: usageM.input_tokens, outputTokens: usageM.output_tokens,
    costUsd: calcAnthropicCost(MODEL_M, usageM.input_tokens, usageM.output_tokens),
  });

  try {
    const text = result.data.content[0].type === "text" ? result.data.content[0].text : "";
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return NextResponse.json({ error: "AI parse error" }, { status: 500 });
    // Sanitize unescaped control characters inside JSON string values.
    // Walk char-by-char: track whether we're inside a JSON string,
    // and escape any literal newline/tab that appears there.
    const raw = jsonMatch[0];
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
    const parsed = JSON.parse(sanitized);
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