import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { safeAnthropic } from "@/lib/serviceGuard";
import { getAppAnthropicClient } from "@/lib/anthropic-client";
import { checkAndIncrDailyLimit, limitExceededResponse } from "@/lib/dailyLimits";
import {
  buildLanguageInstruction, getCountryByCode, recommendedPlatforms,
  type MarketScope,
} from "@/lib/markets";
import { SYSTEM_ANALYZE as SYSTEM_BASE, buildFindClientsSystem } from "@/lib/ai-prompts";


const anthropic = getAppAnthropicClient();

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: profile } = await supabase.from("profiles").select("plan").eq("id", user.id).single();
  const userPlan = (profile as any)?.plan ?? "free_test";
  const limitCheck = await checkAndIncrDailyLimit(user.id, userPlan, "apex");
  if (!limitCheck.allowed) return NextResponse.json(limitExceededResponse(limitCheck, "apex"), { status: 429 });

  const {
    offer_type, offer_description, audience_type, location, budget_range,
    market_scope, country, countries, continent, content_language,
  } = await req.json();
  if (!offer_description?.trim()) return NextResponse.json({ error: "Offer description required" }, { status: 400 });

  // Build the language enforcement prefix — when content_language is set
  // we hard-force the output language; otherwise we fall back to legacy
  // auto-detect behaviour so existing callers stay unchanged.
  const SYSTEM = buildFindClientsSystem(SYSTEM_BASE, content_language);

  const platforms = recommendedPlatforms({
    scope: (market_scope as MarketScope) || "worldwide",
    country, countries, continent,
  });
  const platformHint = platforms.length
    ? `\n\nIMPORTANT — channels that actually work in this market (use them when picking sources): ${platforms.join(", ")}.`
    : "";
  const countryName = getCountryByCode(country)?.name;

  const prompt = `
Offer type: ${offer_type || "service"}
Description: ${offer_description}
Target audience: ${audience_type || "both individuals and businesses"}
Location: ${location || countryName || "worldwide"}${countryName ? `\nCountry (ISO): ${country} — ${countryName}` : ""}
Client budget range: ${budget_range || "unknown"}${platformHint}

Generate the optimal lead generation strategy for this offer.`;

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

  try {
    const text = result.data.content[0].type === "text" ? result.data.content[0].text : "";
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return NextResponse.json({ error: "AI parse error" }, { status: 500 });
    return NextResponse.json(JSON.parse(jsonMatch[0]));
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
