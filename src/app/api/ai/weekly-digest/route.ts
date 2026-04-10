import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import Anthropic from "@anthropic-ai/sdk";
import { getAnthropicErrorResponse } from "@/lib/anthropic-errors";
import { getPlanConfig, getRemainingBudget, AI_ACTION_COSTS } from "@/lib/plan-config";
import { getAppApiKey } from "@/lib/anthropic-client";
import { BUSINESS_BRIEF_SYSTEM_PROMPT, buildWeeklyDigestPrompt } from "@/lib/ai-prompts";
import { requireAuth } from "@/lib/route-helpers";

export async function POST(req: NextRequest) {
  const auth = await requireAuth();
  if (!auth.ok) return auth.response;
  const user = { id: auth.userId };
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

  if (remaining < AI_ACTION_COSTS.weekly_digest) {
    return NextResponse.json({
      error: "ai_budget_exceeded",
      message: `AI budget exhausted ($${planConfig.ai_budget_usd}/month). Purchase extra credits to continue.`,
      credit_packs_url: "/settings?tab=credits",
    }, { status: 402 });
  }

  const metrics = await req.json();
  if (!metrics?.platforms?.length) return NextResponse.json({ error: "Platforms array required" }, { status: 400 });

  try {
    const client = new Anthropic({ apiKey });
    const message = await client.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 1200,
      system: BUSINESS_BRIEF_SYSTEM_PROMPT,
      messages: [{ role: "user", content: buildWeeklyDigestPrompt(metrics) }],
    });

    const text = message.content[0].type === "text" ? message.content[0].text : "";
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return NextResponse.json({ error: "Failed to parse AI response" }, { status: 500 });
    const result = JSON.parse(jsonMatch[0]);

    const inputTokens = message.usage?.input_tokens ?? 600;
    const outputTokens = message.usage?.output_tokens ?? 800;
    const actualCost = (inputTokens * 3 + outputTokens * 15) / 1_000_000;
    await supabase.from("usage_tracking").insert({
      user_id: auth.userId, feature: "weekly_digest", api_name: "anthropic",
      cost_usd: parseFloat(actualCost.toFixed(6)), month_year: currentMonth,
      timestamp: new Date().toISOString(),
    });

    return NextResponse.json({
      ...result,
      generated_at: new Date().toISOString(),
      ai_budget: {
        spent_usd: parseFloat((spent + actualCost).toFixed(4)),
        remaining_usd: parseFloat(getRemainingBudget(planConfig.ai_budget_usd, spent + actualCost, extraUsd).toFixed(4)),
        budget_usd: planConfig.ai_budget_usd,
      },
    });
  } catch (err: unknown) {
    const e = err as { status?: number; error?: { type?: string }; message?: string };
    console.error("[Weekly Digest API] Error:", e?.status, e?.error?.type, e?.message);
    const { error, error_code, retryable } = getAnthropicErrorResponse(err);
    return NextResponse.json({ error, error_code, retryable }, { status: 503 });
  }
}
