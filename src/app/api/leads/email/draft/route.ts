import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { requirePlan } from "@/lib/requirePlan";
import { safeAnthropic } from "@/lib/serviceGuard";
import { calcAnthropicCost, logApiCost } from "@/lib/costTracker";
import { getAppAnthropicClient, OUTPUT_SAFETY_RULES } from "@/lib/anthropic-client";
import { checkAndIncrDailyLimit, limitExceededResponse } from "@/lib/dailyLimits";
import { LANGUAGE_RULES } from "@/lib/markets";

// Generates a personalized cold email (subject + body) for a single lead.
// Anthropic call goes through the user-facing app key + APEX daily limiter.
// The route does NOT send the email — the client opens Gmail compose with
// the draft pre-filled (zero-OAuth path). Pipeline status bump happens on
// the click handler, not here.

const anthropic = getAppAnthropicClient();

const MODEL = "claude-haiku-4-5-20251001";

// Per-language packs from the shared platform-wide vocabulary system.
// We inject ALL packs at once and tell the model: detect language from
// the lead's info, then apply the matching pack. This way every supported
// market gets correct grammar without needing the caller to pre-detect.
const ALL_LANGUAGE_PACKS = Object.entries(LANGUAGE_RULES)
  .map(([code, rules]) => `=== ${code.toUpperCase()} PACK ===\n${rules}`)
  .join("\n\n");

const SYSTEM = `You write SHORT, NATURAL cold outreach emails for marketing agencies contacting potential clients. Detect the language of the lead's info (name, bio, address, hostname) and write the entire email in that same language. Default to English if no other language is clearly indicated.

Hard rules:
- Subject: max 60 chars, specific to them, NEVER generic ("Quick question", "Hello").
- Body: max 6 short lines, plain text, no markdown, no emojis.
- Open with one concrete observation about THEM (their site, niche, location, follower count). Never "I hope this email finds you well".
- One soft call-to-action at the end (a question, not a pitch).
- No "I'd like to offer you", no "Our company specializes in", no corporate fluff.
- Sign off with just "—" on its own line (the user fills in their name).

LANGUAGE VOCABULARY PACKS — apply the pack matching the language you detected. Each pack is mandatory for its language; ignore the others.

${ALL_LANGUAGE_PACKS}

Before returning, re-read the body and verify it follows the matching language pack — diacritics, register consistency, gender-aware verbs, no invented jargon.

Return strict JSON:
{
  "subject": "the subject line",
  "body": "the email body, with \\n for line breaks"
}`;

function hostnameOf(u: string | null | undefined): string {
  if (!u) return "";
  try {
    const url = u.startsWith("http") ? new URL(u) : new URL("https://" + u);
    return url.hostname.replace(/^www\./, "");
  } catch {
    return u;
  }
}

export async function POST(req: NextRequest) {
  const check = await requirePlan(req, "/leads");
  if (check instanceof NextResponse) return check;

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: profile } = await supabase.from("profiles").select("plan").eq("id", user.id).single();
  const userPlan = (profile as any)?.plan ?? "free_test";
  const limitCheck = await checkAndIncrDailyLimit(user.id, userPlan, "apex");
  if (!limitCheck.allowed) return NextResponse.json(limitExceededResponse(limitCheck, "apex"), { status: 429 });

  const { lead_id, goal } = await req.json();
  if (!lead_id) return NextResponse.json({ error: "lead_id required" }, { status: 400 });

  const supa = createServiceClient();
  const { data: lead, error } = await supa
    .from("research_leads")
    .select("id, lead_type, name, category, address, city, email, phone, website, url, goal, extra_data")
    .eq("id", lead_id)
    .eq("user_id", user.id)
    .single();
  if (error || !lead) return NextResponse.json({ error: "Lead not found" }, { status: 404 });
  if (!lead.email) return NextResponse.json({ error: "Lead has no email address" }, { status: 400 });

  const host = hostnameOf(lead.website || lead.url);
  const bio = lead.extra_data?.bio ? String(lead.extra_data.bio).slice(0, 400) : "";
  const followers = lead.extra_data?.followers ? `${lead.extra_data.followers} followers` : "";

  const prompt = `Lead info:
- Name: ${lead.name || "unknown"}
- Type: ${lead.lead_type}
- Niche/category: ${lead.category || "unknown"}
- Website: ${host || "—"}
- City/Address: ${[lead.city, lead.address].filter(Boolean).join(", ") || "—"}
- Bio: ${bio || "—"}
- Audience: ${followers || "—"}
- Original lead goal: ${lead.goal || "—"}

What I want to achieve with this email: ${goal || "Introduce my marketing agency and ask if they'd be open to a short call about growing their reach."}

Write the personalized cold email now.`;

  const result = await safeAnthropic(() =>
    anthropic.messages.create({
      model: MODEL,
      max_tokens: 600,
      system: SYSTEM + OUTPUT_SAFETY_RULES,
      messages: [{ role: "user", content: prompt }],
    })
  );

  if (!result.ok) {
    return NextResponse.json({ error: result.error, service: "anthropic", degraded: true }, { status: 503 });
  }

  const usage = result.data.usage;
  void logApiCost({
    userId: user.id,
    sessionId: req.headers.get("x-cost-session") || "leads-email-draft",
    service: "anthropic",
    operation: "email_draft",
    model: MODEL,
    inputTokens: usage.input_tokens,
    outputTokens: usage.output_tokens,
    costUsd: calcAnthropicCost(MODEL, usage.input_tokens, usage.output_tokens),
  });

  try {
    const text = result.data.content[0].type === "text" ? result.data.content[0].text : "";
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return NextResponse.json({ error: "AI parse error" }, { status: 500 });

    // Sanitize unescaped control chars inside JSON string values — same trick
    // as find-clients/message: walk char-by-char, escape literal \n/\r/\t
    // when we're inside a JSON string.
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
      subject: parsed.subject || "",
      body: parsed.body || "",
      to: lead.email,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
