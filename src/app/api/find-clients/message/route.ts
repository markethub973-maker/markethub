import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { safeAnthropic } from "@/lib/serviceGuard";
import { calcAnthropicCost, logApiCost } from "@/lib/costTracker";
import { getAppAnthropicClient } from "@/lib/anthropic-client";
import { checkAndIncrDailyLimit, limitExceededResponse } from "@/lib/dailyLimits";
import { consumePremiumAction } from "@/lib/premiumActions";
import { getPlanConfig } from "@/lib/plan-config";
import { buildLanguageInstruction, getCountryByCode } from "@/lib/markets";

const anthropic = getAppAnthropicClient();

const SYSTEM_BASE = `You are an international expert copywriter for outreach messages. Write SHORT, NATURAL, non-salesy messages.

CRITICAL — FIRST decide WHO this lead actually is, before writing anything:
- "customer": an end user who NEEDS the offer (e.g. a couple planning a wedding, an indie artist looking for a studio, a homeowner needing a plumber). Pitch is B2C → present the FULL offer as a complete service that solves their need. Use phrases like "vă scriu pentru că văd că vă pregătiți pentru…", "îmi imaginez că vreți să…", focus on their event/need, end with a soft question about availability or next step.
- "business": another company that ALREADY OFFERS the same service the user sells (a competitor DJ, a competing studio, an event agency directory listing). Pitch is B2B partnership or vendor — NEVER frame the user's offer as "the missing piece they need". Instead frame as "complementary capacity for overflow events", "white-label availability for dates you can't cover", or skip the message entirely with best_platform="skip" if no realistic partnership angle exists.
- "unknown": treat conservatively as customer but stay generic — do not assume specifics about their event.

DETECTION SIGNALS the lead is a BUSINESS not a customer:
- Title/handle contains: SRL, PFA, Studio, Events, Agency, Production, "DJ <Name>" with website, "Pachete", "Servicii", "Tarife"
- Description reads like marketing copy ("oferim", "experienta de X ani", "echipa noastra", "we offer", "our team")
- Platform is "google" (Google Search) AND the URL is a homepage / services page / Maps listing
- Contact_hint reads like a brand, not a person

If lead_kind is "business" and there is no good partnership angle, return:
{ "lead_kind": "business", "best_platform": "skip", "warning": "Acest lead este un competitor (alt DJ/studio/agenție), nu un client. Nu trimite mesaj de vânzare — alege un lead din Facebook Groups sau Reddit unde oamenii cer recomandări.", "messages": { ... still generate them but framed as B2B partnership ... } }

NEVER write "we add what's missing" / "noi adăugăm ce vouă vă lipsește" when the lead already offers a complete service. That's the #1 mistake to avoid — it makes the user look uninformed about who they're pitching to.

Rules for the message body:
- Max 3 sentences
- Start with something specific about them (not generic)
- No "I hope this message finds you well"
- No "I'd like to offer you..."
- Sound like a person, not a company
- Match the platform tone (Reddit = casual, Email = slightly more formal, LinkedIn = professional)
- Include a soft call-to-action (question, not a pitch)
- For B2C: present the FULL offer as a complete package (do NOT cherry-pick parts — if the user's offer includes DJ + vocalist + sound + lights + fog + CO2, mention all of them as ONE package, not as additions to what the lead already has)

Return JSON:
{
  "lead_kind": "customer" | "business" | "unknown",
  "messages": {
    "reddit": "message for Reddit DM",
    "email": "message for email (with subject line)",
    "facebook": "message for Facebook",
    "generic": "generic message"
  },
  "subject_line": "email subject line",
  "best_platform": "which platform is best for this specific lead, or 'skip' if lead_kind=business with no partnership angle",
  "warning": "optional warning to show the user (e.g. when lead_kind=business)"
}`;

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

  const SYSTEM = `${buildLanguageInstruction(content_language)}\n\n${SYSTEM_BASE}`;
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
      system: SYSTEM,
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