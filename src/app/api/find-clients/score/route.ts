import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { safeAnthropic } from "@/lib/serviceGuard";
import { calcAnthropicCost, logApiCost } from "@/lib/costTracker";
import { getAppAnthropicClient } from "@/lib/anthropic-client";
import { checkAndIncrDailyLimit, limitExceededResponse } from "@/lib/dailyLimits";
import { consumePremiumAction } from "@/lib/premiumActions";
import { getPlanConfig } from "@/lib/plan-config";
import { buildLanguageInstruction } from "@/lib/markets";

const anthropic = getAppAnthropicClient();

const SYSTEM_BASE = `You are a sales qualification expert. Given a list of search results and an offer, score each result as a potential lead.

For each result evaluate:
- Are they actively looking for this type of offer? (intent)
- Do they match the target profile?
- Is the timing good (recent post/activity)?
- Can they afford it?

CRITICAL — DEMAND vs SUPPLY filter:
You MUST distinguish between DEMAND-side leads (people who NEED the offer) and SUPPLY-side listings (other businesses that already OFFER the same thing).
- DEMAND examples: "caut DJ pentru nunta mea", "looking for a recording studio", "any recommendations for a wedding photographer?", "need a plumber in Bucharest" — these are HOT/WARM prospects (score 6-10).
- SUPPLY examples: another DJ company's website, a competitor studio's Google Maps listing, a directory page like "Top 10 DJs in Bucharest", a PR press release about an event agency, a "services / pachete / tarife" landing page — these are COMPETITORS, NOT customers. Score them 1-2 ("cold") and write in "why": "supply-side competitor listing — not a buyer".
- Detection signals for SUPPLY/competitor: business name with "SRL"/"PFA"/"Studio"/"Events"/"Agency", URL paths like /servicii/, /pachete/, /tarife/, /portfolio/, /about-us/, Google Maps business listings, directory aggregators (top10, recomandari, reviews of providers), price lists, "contact us to book" CTAs.
- Detection signals for DEMAND: first-person language ("caut", "am nevoie", "looking for", "anyone know"), question marks, mentions of personal events ("nunta mea", "for my wedding"), specific dates in the future, budget mentions framed as buyer not seller, posts in customer-side communities (FB groups for couples planning weddings, Reddit r/<niche>, classified ads from individuals).

When in doubt between demand and supply, prefer the LOWER score — false positives on competitors waste the user's outreach effort and lead to embarrassing B2B-pitched-as-B2C messages.

Return ONLY valid JSON array:
[
  {
    "index": 0,
    "score": 8,
    "label": "hot",
    "signals": ["Actively searching", "Budget mentioned", "Specific event"],
    "contact_hint": "name or handle if visible",
    "lead_kind": "customer",
    "why": "one sentence why this is a good lead"
  }
]

score: 1-10 (10 = perfect prospect, 1 = not relevant)
label: "hot" (8-10), "warm" (5-7), "cold" (1-4)
lead_kind: "customer" (someone who needs the offer) | "business" (a competitor offering the same thing) | "unknown"`;

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
  const SYSTEM = `${buildLanguageInstruction(content_language)}\n\n${SYSTEM_BASE}`;

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
