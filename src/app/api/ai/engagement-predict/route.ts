import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import Anthropic from "@anthropic-ai/sdk";
import { getAnthropicErrorResponse } from "@/lib/anthropic-errors";
import { getPlanConfig, getRemainingBudget, AI_ACTION_COSTS } from "@/lib/plan-config";
import { getAppApiKey } from "@/lib/anthropic-client";
import { requireAuth } from "@/lib/route-helpers";

const SYSTEM_PROMPT = `Analyze this social media post and predict its engagement score from 0-100. Consider: hook strength, emotional triggers, CTA clarity, hashtag relevance, posting format. Return a score and 3 improvement suggestions.

Output STRICT JSON:
{
  "score": 0-100,
  "suggestions": [
    "Specific improvement suggestion 1",
    "Specific improvement suggestion 2",
    "Specific improvement suggestion 3"
  ]
}

Scoring guide:
0-30 = structural issues (no hook, wrong tone, no CTA)
31-50 = basic but nothing special
51-70 = solid, will get average reach
71-85 = strong, likely above average
86-100 = exceptional — all the boxes checked

Rules:
- Be honest and specific. Most posts score 40-60.
- Each suggestion must be actionable (not generic advice).
- Language must match the input language.
- Consider platform conventions if mentioned.`;

export async function POST(req: NextRequest) {
  const auth = await requireAuth();
  if (!auth.ok) return auth.response;
  const supabase = await createClient();

  let apiKey: string;
  try { apiKey = getAppApiKey(); } catch {
    return NextResponse.json({ error: "Anthropic API key not configured" }, { status: 500 });
  }

  // Budget check
  const currentMonth = new Date().toISOString().substring(0, 7);
  const { data: profileData } = await supabase.from("profiles").select("subscription_plan").eq("id", auth.userId).single();
  const planConfig = getPlanConfig(profileData?.subscription_plan);
  const { data: spendData } = await supabase.from("usage_tracking").select("cost_usd").eq("user_id", auth.userId).eq("month_year", currentMonth);
  const extraResult = await Promise.resolve(supabase.from("ai_credits").select("credits_usd").eq("user_id", auth.userId).eq("month_year", currentMonth).maybeSingle()).catch(() => ({ data: null }));
  const spent = spendData?.reduce((s, r) => s + (r.cost_usd ?? 0), 0) ?? 0;
  const extraUsd = (extraResult?.data as { credits_usd?: number } | null)?.credits_usd ?? 0;
  const remaining = getRemainingBudget(planConfig.ai_budget_usd, spent, extraUsd);

  const actionCost = AI_ACTION_COSTS.ai_analysis;
  if (remaining < actionCost) {
    return NextResponse.json({
      error: "ai_budget_exceeded",
      message: `AI budget exhausted ($${planConfig.ai_budget_usd}/month). Purchase extra credits to continue.`,
      credit_packs_url: "/settings?tab=credits",
    }, { status: 402 });
  }

  const { input } = await req.json();
  if (!input?.trim()) return NextResponse.json({ error: "Post content is required" }, { status: 400 });

  try {
    const client = new Anthropic({ apiKey });
    const message = await client.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 800,
      system: SYSTEM_PROMPT,
      messages: [{ role: "user", content: `Post to analyze:\n${input.trim()}` }],
    });

    const text = message.content[0].type === "text" ? message.content[0].text : "";
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return NextResponse.json({ error: "Failed to parse AI response" }, { status: 500 });
    const result = JSON.parse(jsonMatch[0]) as { score?: number; suggestions?: string[] };

    const inputTokens = message.usage?.input_tokens ?? 400;
    const outputTokens = message.usage?.output_tokens ?? 500;
    const actualCost = (inputTokens * 0.8 + outputTokens * 4) / 1_000_000;
    await supabase.from("usage_tracking").insert({
      user_id: auth.userId, feature: "engagement_predict", api_name: "anthropic",
      cost_usd: parseFloat(actualCost.toFixed(6)), month_year: currentMonth,
      timestamp: new Date().toISOString(),
    });

    return NextResponse.json({
      score: Math.min(Math.max(result.score ?? 50, 0), 100),
      suggestions: (result.suggestions ?? []).slice(0, 3),
      ai_budget: {
        spent_usd: parseFloat((spent + actualCost).toFixed(4)),
        remaining_usd: parseFloat(getRemainingBudget(planConfig.ai_budget_usd, spent + actualCost, extraUsd).toFixed(4)),
        budget_usd: planConfig.ai_budget_usd,
      },
    });
  } catch (err: unknown) {
    const e = err as { status?: number; error?: { type?: string }; message?: string };
    console.error("[Engagement Predict API] Error:", e?.status, e?.error?.type, e?.message);
    const { error, error_code, retryable } = getAnthropicErrorResponse(err);
    return NextResponse.json({ error, error_code, retryable }, { status: 503 });
  }
}
