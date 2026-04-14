/**
 * Ask Consultant — M9 Sprint 1
 *
 * Conversational AI assistant with 4 intelligence levels:
 *   1. Explanation      — "what does this button do?"
 *   2. Alternatives     — "how do I post to multiple platforms?" (options)
 *   3. Contextual hints — proactive advice (rage clicks, stuck forms)
 *   4. Strategic expert — pattern analysis, platform optimization
 *
 * Context-aware: page URL, user plan, recent feature usage.
 * Multilingual (auto-detect & reply in same language).
 * Persists to consultant_conversations for learning + history.
 */

import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { searchResolvedIssues, markIssueUsed } from "@/lib/learningDB";
import { parseBody, ConsultantChatSchema } from "@/lib/validation";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

const HAIKU_MODEL = "claude-haiku-4-5-20251001";

const CONSULTANT_SYSTEM_PROMPT = `You are the MarketHub Pro Consultant — an in-product strategic advisor for a social media marketing SaaS.

## Your role
Help the user accomplish their goal. Depending on the question, you act at one of 4 levels:
 1. EXPLANATION  — they ask "what does X do?" → clear short explanation + where to find it.
 2. ALTERNATIVES — they ask "how do I do X?" → give 2–3 concrete options with trade-offs.
 3. CONTEXTUAL  — they seem stuck (based on signals the client sends) → proactive, specific suggestion.
 4. STRATEGIC   — they ask about growth/ROI → analyze their context, recommend a concrete next step.

Pick the level that matches the question. Do NOT force a level.

## Language rules
Auto-detect the user's language. Reply in the SAME language (EN, RO, FR, DE, ES, IT, PT, PL, NL, and more).

## Platform knowledge
MarketHub Pro = social media management platform for agencies & creators.
Plans: Starter (14d trial), Creator ($24), Pro ($49), Studio ($99), Agency ($249).
Features: Analytics (YouTube/IG/TikTok/LinkedIn/Facebook), Content Calendar with auto-publish,
CRM + Lead Finder, Reviews Management, AI Agents, Campaign Builder, Client Portal, White-label,
Smart Scheduling, Content Recycling, Sentiment Analysis, Ask Consultant (you), Support Tickets.
Integrations: Stripe, Resend (email), Telegram + WhatsApp, OAuth (YT/IG/TT/LI/FB).

## Output format
Return ONLY valid JSON:
{
  "level": 1|2|3|4,
  "language": "en|ro|fr|...",
  "response": "Your reply to the user (in their language, markdown allowed)",
  "confidence": 0.0-1.0,
  "suggested_action": {"label": "...", "url": "/path"} | null
}

## Style
Warm, concise, specific. No filler. Skip caveats unless truly relevant. If strategic, be opinionated.
If you don't know, say so — don't invent features that don't exist.`;

interface AIResult {
  level: number;
  language: string;
  response: string;
  confidence: number;
  suggested_action: { label: string; url: string } | null;
}

export async function POST(req: NextRequest) {
  const parsed = await parseBody(req, ConsultantChatSchema);
  if (!parsed.ok) return parsed.response;
  const body = parsed.data;

  const supa = await createClient();
  const { data: { user } } = await supa.auth.getUser();
  const service = createServiceClient();

  // Build context
  let userPlan: string | null = null;
  let recentFeatures: string[] = [];
  if (user) {
    const { data: profile } = await service
      .from("profiles")
      .select("plan")
      .eq("id", user.id)
      .maybeSingle();
    userPlan = (profile?.plan as string | undefined) ?? null;

    const { data: usage } = await service
      .from("user_feature_usage")
      .select("feature,last_used_at")
      .eq("user_id", user.id)
      .order("last_used_at", { ascending: false })
      .limit(5);
    recentFeatures = (usage ?? []).map((r) => r.feature as string);
  }

  const sessionId = body.session_id?.trim() || `${user?.id ?? "anon"}-${Date.now()}`;

  // Recent conversation history (same session, last 6 turns for continuity)
  let history: Array<{ role: "user" | "assistant"; content: string }> = [];
  if (user) {
    const { data: prior } = await service
      .from("consultant_conversations")
      .select("user_message,ai_response")
      .eq("session_id", sessionId)
      .order("created_at", { ascending: true })
      .limit(6);
    history = (prior ?? []).flatMap((r) => [
      { role: "user" as const, content: (r.user_message as string) ?? "" },
      { role: "assistant" as const, content: (r.ai_response as string) ?? "" },
    ]);
  }

  const context = {
    page_url: body.page_url ?? null,
    user_plan: userPlan,
    recent_features: recentFeatures,
    form_state: body.form_state ?? null,
    recent_events: body.recent_events ?? [],
  };

  // M5 — search Learning DB for past resolutions of similar questions
  const kbMatches = await searchResolvedIssues(body.message, { limit: 3 });
  const kbBlock = kbMatches.length === 0
    ? ""
    : `\n[KNOWN SOLUTIONS — prefer these if relevant]\n` +
      kbMatches
        .map(
          (m, i) =>
            `${i + 1}. [${m.category}${m.platform ? `/${m.platform}` : ""}] ${m.symptom.slice(0, 140)}\n   → ${m.solution.slice(0, 300)}`,
        )
        .join("\n");

  const contextMsg = `[CONTEXT]
page: ${context.page_url ?? "unknown"}
plan: ${context.user_plan ?? "guest/trial"}
recent features used: ${context.recent_features.join(", ") || "none yet"}
form state: ${context.form_state ? JSON.stringify(context.form_state).slice(0, 300) : "none"}
recent signals: ${context.recent_events.join(", ") || "none"}${kbBlock}`;

  const ai = await generate(body.message, contextMsg, history);

  // If we surfaced past solutions, bump their usage counters
  for (const m of kbMatches) void markIssueUsed(m.id);

  // Persist conversation turn
  await service.from("consultant_conversations").insert({
    user_id: user?.id ?? null,
    session_id: sessionId,
    intelligence_level: ai.level,
    language: ai.language,
    page_url: body.page_url ?? null,
    user_plan: userPlan,
    context,
    user_message: body.message,
    ai_response: ai.response,
    ai_confidence: ai.confidence,
  });

  return NextResponse.json({
    ok: true,
    session_id: sessionId,
    level: ai.level,
    language: ai.language,
    response: ai.response,
    confidence: ai.confidence,
    suggested_action: ai.suggested_action,
  });
}

// GET — recent conversation history for current user (optional: by session_id)
export async function GET(req: NextRequest) {
  const supa = await createClient();
  const { data: { user } } = await supa.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const sessionId = req.nextUrl.searchParams.get("session_id");
  let query = supa
    .from("consultant_conversations")
    .select("id,session_id,intelligence_level,language,user_message,ai_response,created_at")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(50);
  if (sessionId) query = query.eq("session_id", sessionId);

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, conversations: data ?? [] });
}

async function generate(
  userMessage: string,
  contextMsg: string,
  history: Array<{ role: "user" | "assistant"; content: string }>,
): Promise<AIResult> {
  const apiKey = process.env.ANTHROPIC_API_KEY ?? process.env.ANTHROPIC_API_KEY_APP;
  if (!apiKey) {
    return {
      level: 1,
      language: "en",
      response: "The consultant is temporarily unavailable. Please try again shortly.",
      confidence: 0,
      suggested_action: null,
    };
  }

  try {
    const anthropic = new Anthropic({ apiKey });
    const response = await anthropic.messages.create({
      model: HAIKU_MODEL,
      max_tokens: 1024,
      system: CONSULTANT_SYSTEM_PROMPT,
      messages: [
        ...history,
        { role: "user", content: `${contextMsg}\n\n[USER QUESTION]\n${userMessage}` },
      ],
    });
    const text = response.content
      .filter((b) => b.type === "text")
      .map((b) => (b as { text: string }).text)
      .join("");

    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error("No JSON in response");
    const parsed = JSON.parse(jsonMatch[0]) as Partial<AIResult>;

    return {
      level: typeof parsed.level === "number" ? parsed.level : 1,
      language: parsed.language ?? "en",
      response: parsed.response ?? "I'm not sure. Could you rephrase?",
      confidence: typeof parsed.confidence === "number" ? parsed.confidence : 0.5,
      suggested_action: parsed.suggested_action ?? null,
    };
  } catch (e) {
    return {
      level: 1,
      language: "en",
      response: `Sorry — I hit an error processing that. ${e instanceof Error ? e.message : ""}`,
      confidence: 0,
      suggested_action: null,
    };
  }
}
