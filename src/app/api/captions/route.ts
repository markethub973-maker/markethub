import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import Anthropic from "@anthropic-ai/sdk";
import { getAnthropicErrorResponse } from "@/lib/anthropic-errors";
import { getPlanConfig, getRemainingBudget, AI_ACTION_COSTS } from "@/lib/plan-config";
import { getAppApiKey } from "@/lib/anthropic-client";

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let apiKey: string;
  try {
    apiKey = getAppApiKey();
  } catch {
    return NextResponse.json({ error: "Anthropic API key not configured" }, { status: 500 });
  }

  // ── Pre-check AI budget before calling Claude ────────────────────────────
  const currentMonth = new Date().toISOString().substring(0, 7);
  const { data: profileData } = await supabase.from("profiles").select("subscription_plan").eq("id", user.id).single();
  const planConfig = getPlanConfig(profileData?.subscription_plan);
  const { data: spendData } = await supabase.from("usage_tracking").select("cost_usd").eq("user_id", user.id).eq("month_year", currentMonth);
  const extraResult = await Promise.resolve(
    supabase.from("ai_credits").select("credits_usd").eq("user_id", user.id).eq("month_year", currentMonth).maybeSingle()
  ).catch(() => ({ data: null }));
  const extraData = extraResult?.data ?? null;
  const spent = spendData?.reduce((s, r) => s + (r.cost_usd ?? 0), 0) ?? 0;
  const extraUsd = extraData?.credits_usd ?? 0;
  const remaining = getRemainingBudget(planConfig.ai_budget_usd, spent, extraUsd);

  if (remaining < AI_ACTION_COSTS.caption_set) {
    return NextResponse.json({
      error: "ai_budget_exceeded",
      message: `🤖 You've used your full AI budget for this month ($${planConfig.ai_budget_usd}). Purchase extra credits to continue generating captions.`,
      spent_usd: parseFloat(spent.toFixed(2)),
      budget_usd: planConfig.ai_budget_usd,
      remaining_usd: 0,
      can_purchase_credits: true,
      credit_packs_url: "/settings?tab=credits",
    }, { status: 402 });
  }
  // ── End budget check ─────────────────────────────────────────────────────

  const { topic, platform, tone, language, includeHashtags, includeEmoji, maxLength } = await req.json();

  if (!topic?.trim()) {
    return NextResponse.json({ error: "Topic is required" }, { status: 400 });
  }

  const platformGuide: Record<string, string> = {
    instagram: "Instagram caption (max 2200 chars, optimized for engagement, use line breaks for readability)",
    facebook: "Facebook post (conversational, can be longer, encourage comments/shares)",
    tiktok: "TikTok caption (short, punchy, max 150 chars, trending style)",
    twitter: "Twitter/X post (max 280 chars, concise and impactful)",
    linkedin: "LinkedIn post (professional tone, thought leadership style, use paragraphs)",
    youtube: "YouTube video description (SEO optimized, include key points, structured)",
  };

  const platformInstruction = platformGuide[platform] || platformGuide.instagram;

  const prompt = `Generate 3 creative caption variations for the following:

Topic/Product: ${topic}
Platform: ${platformInstruction}
Tone: ${tone || "engaging"}
Language: ${language || "Romanian"}
${includeHashtags ? "Include 5-10 relevant hashtags at the end of each caption." : "Do NOT include hashtags."}
${includeEmoji ? "Use emojis naturally throughout the caption." : "Do NOT use emojis."}
${maxLength ? `Maximum length: ${maxLength} characters per caption.` : ""}

Return ONLY a JSON array with 3 objects, each having:
- "caption": the full caption text
- "hashtags": array of hashtag strings (without #)
- "charCount": character count

Example format:
[{"caption": "...", "hashtags": ["tag1", "tag2"], "charCount": 150}]

Do not include any other text, explanations or markdown. Just the JSON array.`;

  try {
    const client = new Anthropic({ apiKey });
    const message = await client.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 2000,
      messages: [{ role: "user", content: prompt }],
    });

    const text = message.content[0].type === "text" ? message.content[0].text : "";

    // Parse JSON from response
    const jsonMatch = text.match(/\[[\s\S]*\]/);
    if (!jsonMatch) {
      return NextResponse.json({ error: "Failed to parse AI response" }, { status: 500 });
    }

    const captions = JSON.parse(jsonMatch[0]);

    // Record actual cost after successful generation
    const inputTokens  = message.usage?.input_tokens  ?? 800;
    const outputTokens = message.usage?.output_tokens ?? 1500;
    const actualCost   = (inputTokens * 3 + outputTokens * 15) / 1_000_000;
    await supabase.from("usage_tracking").insert({
      user_id: user.id,
      feature: "ai_captions",
      api_name: "anthropic",
      cost_usd: parseFloat(actualCost.toFixed(6)),
      month_year: currentMonth,
      timestamp: new Date().toISOString(),
    });

    const newRemaining = getRemainingBudget(planConfig.ai_budget_usd, spent + actualCost, extraUsd);
    return NextResponse.json({
      captions,
      ai_budget: {
        spent_usd: parseFloat((spent + actualCost).toFixed(4)),
        remaining_usd: parseFloat(newRemaining.toFixed(4)),
        budget_usd: planConfig.ai_budget_usd,
      },
    });
  } catch (err: any) {
    console.error("[Captions API] Error:", err?.status, err?.error?.type, err?.message);
    const { error, error_code, retryable } = getAnthropicErrorResponse(err);
    return NextResponse.json({ error, error_code, retryable }, { status: 503 });
  }
}
