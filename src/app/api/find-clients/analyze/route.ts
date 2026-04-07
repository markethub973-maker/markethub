import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { safeAnthropic } from "@/lib/serviceGuard";
import { getAppAnthropicClient } from "@/lib/anthropic-client";
import { checkAndIncrDailyLimit, limitExceededResponse } from "@/lib/dailyLimits";

const anthropic = getAppAnthropicClient();

const SYSTEM = `You are an international lead generation strategist. Detect the language of the user's input and respond in that same language. Given an offer description and target audience, you must:
1. Extract the best keywords to find people who NEED this offer right now
2. Recommend the best platforms/sources to find these prospects
3. For each source, generate the exact search query to use
4. Identify intent signals that indicate a hot prospect

Return ONLY valid JSON in this exact format:
{
  "offer_summary": "brief rewrite of the offer in client-benefit terms",
  "target_profile": "who exactly needs this (specific, not generic)",
  "keywords": ["keyword1", "keyword2", "keyword3", "keyword4", "keyword5"],
  "intent_signals": ["signal1", "signal2", "signal3"],
  "sources": [
    {
      "id": "google",
      "platform": "Google Search",
      "icon": "search",
      "query": "exact search query to use",
      "why": "why this source is relevant",
      "estimated_leads": "5-20",
      "intent_level": "high"
    }
  ],
  "affiliate_angle": "if this is affiliate, the specific pain point to target (or null)",
  "outreach_hook": "one sentence that opens a conversation naturally"
}

Available platforms for sources (use only relevant ones, 3-6 max):
- google: Google Search (people actively searching)
- google_maps: Google Maps (local businesses to target)
- reddit: Reddit (people asking for recommendations)
- facebook_groups: Facebook Groups (community discussions)
- instagram_hashtag: Instagram hashtag search
- tiktok_hashtag: TikTok niche community
- classifieds: Local classifieds platforms (Craigslist, OLX, etc. — depending on target market)
- reviews: Google Maps reviews of competitors

intent_level must be: "high", "medium", or "low"`;

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: profile } = await supabase.from("profiles").select("plan").eq("id", user.id).single();
  const userPlan = (profile as any)?.plan ?? "free_test";
  const limitCheck = await checkAndIncrDailyLimit(user.id, userPlan, "apex");
  if (!limitCheck.allowed) return NextResponse.json(limitExceededResponse(limitCheck, "apex"), { status: 429 });

  const { offer_type, offer_description, audience_type, location, budget_range } = await req.json();
  if (!offer_description?.trim()) return NextResponse.json({ error: "Offer description required" }, { status: 400 });

  const prompt = `
Offer type: ${offer_type || "service"}
Description: ${offer_description}
Target audience: ${audience_type || "both individuals and businesses"}
Location: ${location || "worldwide"}
Client budget range: ${budget_range || "unknown"}

Generate the optimal lead generation strategy for this offer.`;

  const result = await safeAnthropic(() =>
    anthropic.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 1500,
      system: SYSTEM,
      messages: [{ role: "user", content: prompt }],
    })
  );

  if (!result.ok) {
    return NextResponse.json({ error: result.error, service: "anthropic", degraded: true }, { status: 503 });
  }

  try {
    const text = result.data.content[0].type === "text" ? result.data.content[0].text : "";
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return NextResponse.json({ error: "AI parse error" }, { status: 500 });
    return NextResponse.json(JSON.parse(jsonMatch[0]));
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
