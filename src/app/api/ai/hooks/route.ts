import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import Anthropic from "@anthropic-ai/sdk";
import { getAnthropicErrorResponse } from "@/lib/anthropic-errors";
import { getPlanConfig, getRemainingBudget, AI_ACTION_COSTS } from "@/lib/plan-config";
import { getAppApiKey } from "@/lib/anthropic-client";
import { requireAuth } from "@/lib/route-helpers";

const SYSTEM_PROMPT = `Generate 5 scroll-stopping hooks for social media posts about the given topic. Each hook should be a different style: question, statistic, bold claim, story opener, controversial take.

Output STRICT JSON:
{
  "hooks": [
    "Hook 1 (question style)",
    "Hook 2 (statistic style)",
    "Hook 3 (bold claim style)",
    "Hook 4 (story opener style)",
    "Hook 5 (controversial take style)"
  ]
}

Rules:
- Each hook must be <=140 characters, punchy and scroll-stopping.
- Language must match the input language.
- Do NOT use generic platitudes. Be specific and provocative.
- Each hook must work standalone as the first line of a post.`;

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
  if (!input?.trim()) return NextResponse.json({ error: "Input topic is required" }, { status: 400 });

  try {
    const client = new Anthropic({ apiKey });
    const message = await client.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 1000,
      system: SYSTEM_PROMPT,
      messages: [{ role: "user", content: `Topic: ${input.trim()}` }],
    });

    const text = message.content[0].type === "text" ? message.content[0].text : "";
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return NextResponse.json({ error: "Failed to parse AI response" }, { status: 500 });
    const result = JSON.parse(jsonMatch[0]) as { hooks?: string[] };

    const inputTokens = message.usage?.input_tokens ?? 400;
    const outputTokens = message.usage?.output_tokens ?? 600;
    const actualCost = (inputTokens * 0.8 + outputTokens * 4) / 1_000_000;
    await supabase.from("usage_tracking").insert({
      user_id: auth.userId, feature: "hooks", api_name: "anthropic",
      cost_usd: parseFloat(actualCost.toFixed(6)), month_year: currentMonth,
      timestamp: new Date().toISOString(),
    });

    return NextResponse.json({
      hooks: (result.hooks ?? []).slice(0, 5),
      ai_budget: {
        spent_usd: parseFloat((spent + actualCost).toFixed(4)),
        remaining_usd: parseFloat(getRemainingBudget(planConfig.ai_budget_usd, spent + actualCost, extraUsd).toFixed(4)),
        budget_usd: planConfig.ai_budget_usd,
      },
    });
  } catch (err: unknown) {
    const e = err as { status?: number; error?: { type?: string }; message?: string };
    console.error("[Hooks API] Error:", e?.status, e?.error?.type, e?.message);
    const { error, error_code, retryable } = getAnthropicErrorResponse(err);
    return NextResponse.json({ error, error_code, retryable }, { status: 503 });
  }
}
