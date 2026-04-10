import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { safeAnthropic } from "@/lib/serviceGuard";
import { calcAnthropicCost, logApiCost } from "@/lib/costTracker";
import { getAppAnthropicClient } from "@/lib/anthropic-client";
import { checkAndIncrDailyLimit, limitExceededResponse } from "@/lib/dailyLimits";
import { consumePremiumAction } from "@/lib/premiumActions";
import { getPlanConfig } from "@/lib/plan-config";
import { buildLanguageInstruction } from "@/lib/markets";
import { SYSTEM_SCORE as SYSTEM_BASE, buildFindClientsSystem } from "@/lib/ai-prompts";


const anthropic = getAppAnthropicClient();

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: profile } = await supabase.from("profiles").select("plan").eq("id", user.id).single();
  const userPlan = (profile as any)?.plan ?? "free_test";
  const limitCheck = await checkAndIncrDailyLimit(user.id, userPlan, "apex");
  if (!limitCheck.allowed) return NextResponse.json(limitExceededResponse(limitCheck, "apex"), { status: 429 });

  const { results, offer_summary, intent_signals, content_language } = await req.json();
  if (!results?.length) return NextResponse.json({ error: "Results required" }, { status: 400 });

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

  // Inject language pack so the "why" / "signals" fields and any RU/AR/EL/RO etc.
  // text the model emits respects the user's chosen content language and grammar rules.
  const SYSTEM = buildFindClientsSystem(SYSTEM_BASE, content_language);

  const prompt = `
Offer: ${offer_summary}
Intent signals to look for: ${(intent_signals || []).join(", ")}

Results to score (${results.length} items):
${results.slice(0, 20).map((r: any, i: number) => `
[${i}] Title: ${r.title || r.name || ""}
Description: ${(r.description || r.text || r.snippet || "").slice(0, 200)}
URL: ${r.url || r.profile_url || ""}
Platform: ${r.platform || ""}
`).join("\n")}`;

  const MODEL_S = getPlanConfig(userPlan).premium_action_model;
  const result = await safeAnthropic(() =>
    anthropic.messages.create({
      model: MODEL_S,
      max_tokens: 2500,
      system: SYSTEM,
      messages: [{ role: "user", content: prompt }],
    })
  );

  if (!result.ok) {
    return NextResponse.json({ error: result.error, service: "anthropic", degraded: true }, { status: 503 });
  }


  const usageS = result.data.usage;
  void logApiCost({
    userId: user.id, sessionId: req.headers.get("x-cost-session") || "unknown",
    service: "anthropic", operation: "score", model: MODEL_S,
    inputTokens: usageS.input_tokens, outputTokens: usageS.output_tokens,
    costUsd: calcAnthropicCost(MODEL_S, usageS.input_tokens, usageS.output_tokens),
  });

  try {
    const text = result.data.content[0].type === "text" ? result.data.content[0].text : "";
    const jsonMatch = text.match(/\[[\s\S]*\]/);
    if (!jsonMatch) return NextResponse.json({ error: "AI parse error" }, { status: 500 });
    return NextResponse.json({
      scored: JSON.parse(jsonMatch[0]),
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
