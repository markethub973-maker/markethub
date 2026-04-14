/**
 * Support Tickets — M4 Sprint 1
 *
 * POST — create new ticket + trigger AI auto-response (Haiku 4.5, multilingual).
 * GET  — list user's own tickets (authenticated).
 *
 * Flow:
 *   1. User submits via "Report Issue" button
 *   2. Ticket stored in Supabase
 *   3. Language detected + AI responds in user's language
 *   4. If AI confidence < 0.5 → escalate to admin (Telegram + email)
 *   5. Ticket thread visible in user's account + admin dashboard
 */

import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { parseBody, SupportTicketSchema } from "@/lib/validation";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

const HAIKU_MODEL = "claude-haiku-4-5-20251001";

const SUPPORT_SYSTEM_PROMPT = `You are the MarketHub Pro Support Agent, a helpful multilingual AI assistant for a social media marketing SaaS platform.

## Your role
Respond to user questions, bug reports, and feature requests. Be warm, professional, and concise.

## Language rules
- Detect the user's language automatically from their message
- Reply in the SAME language they wrote in (supports: EN, RO, FR, DE, ES, IT, PT, PL, NL, and more)
- Use the native conventions of that language (proper grammar, appropriate formality)

## Platform knowledge
- MarketHub Pro = social media management platform for agencies and creators
- Plans: Starter (14-day trial), Creator ($24/mo), Pro ($49/mo), Studio ($99/mo), Agency ($249/mo)
- Features: Analytics (YouTube/Instagram/TikTok/LinkedIn/Facebook), Content Calendar, CRM/Lead Finder, Reviews Management, AI Agents, Campaign Builder, Client Portal, White-label
- Integrations: Stripe (payments), Resend (email), WhatsApp + Telegram (reports), YouTube/IG/TT/LI OAuth

## Response format
Return ONLY valid JSON in this shape:
{
  "language": "en|ro|fr|de|es|it|pt|pl|nl|other",
  "category": "bug|question|billing|feature_request|other",
  "response": "Your reply to the user (in their language)",
  "confidence": 0.0-1.0,
  "escalate": true|false,
  "reasoning": "One sentence: why this confidence / why escalate"
}

## Escalation rules (escalate: true)
- Billing disputes or refund requests
- Legal/privacy concerns
- Security reports (hacking, leaks)
- Complex technical bugs requiring code investigation
- Complaints that require human empathy
- When confidence < 0.5

## When you DON'T know the answer
Don't make up answers. Acknowledge the limitation briefly, apologize, and say a human will follow up. Set escalate=true, confidence<0.5.

## Tone
Warm but efficient. Skip filler. Address the actual question. Offer concrete next steps.`;

export async function POST(req: NextRequest) {
  const parsed = await parseBody(req, SupportTicketSchema);
  if (!parsed.ok) return parsed.response;
  const body = parsed.data;

  // Get user (optional — ticket can be from anonymous)
  const supa = await createClient();
  const { data: { user } } = await supa.auth.getUser();
  const service = createServiceClient();

  // 1. Create ticket row
  const { data: ticket, error: insertErr } = await service
    .from("support_tickets")
    .insert({
      user_id: user?.id ?? null,
      email: user?.email ?? body.email ?? null,
      source: "ui",
      subject: body.subject ?? null,
      message: body.message,
      page_url: body.page_url ?? null,
      browser_info: body.browser_info ?? null,
      screenshot_url: body.screenshot_url ?? null,
      status: "new",
    })
    .select("id")
    .single();

  if (insertErr || !ticket) {
    return NextResponse.json({ error: insertErr?.message ?? "Failed to create ticket" }, { status: 500 });
  }

  // Also save initial user message in thread
  await service.from("support_messages").insert({
    ticket_id: ticket.id,
    sender_type: "user",
    sender_name: user?.email ?? body.email ?? "anonymous",
    message: body.message,
  });

  // 2. Trigger AI response (Haiku multilingual)
  const aiResult = await generateAIResponse(body.message);

  // 3. Update ticket with AI response + status
  await service
    .from("support_tickets")
    .update({
      language: aiResult.language,
      category: aiResult.category,
      ai_response: aiResult.response,
      ai_responded_at: new Date().toISOString(),
      ai_confidence: aiResult.confidence,
      status: aiResult.escalate ? "escalated" : "ai_responded",
      escalated_at: aiResult.escalate ? new Date().toISOString() : null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", ticket.id);

  await service.from("support_messages").insert({
    ticket_id: ticket.id,
    sender_type: "ai",
    sender_name: "Support Assistant",
    message: aiResult.response,
    metadata: {
      model: HAIKU_MODEL,
      confidence: aiResult.confidence,
      language: aiResult.language,
      reasoning: aiResult.reasoning,
    },
  });

  // 4. If escalated, notify admin via Telegram + email
  if (aiResult.escalate) {
    await notifyAdmin(ticket.id, body.message, aiResult);
  }

  return NextResponse.json({
    ok: true,
    ticket_id: ticket.id,
    ai_response: aiResult.response,
    language: aiResult.language,
    escalated: aiResult.escalate,
  });
}

export async function GET() {
  const supa = await createClient();
  const { data: { user } } = await supa.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data, error } = await supa
    .from("support_tickets")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(50);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, tickets: data ?? [] });
}

// ── Helpers ────────────────────────────────────────────────────────────

interface AIResult {
  language: string;
  category: string;
  response: string;
  confidence: number;
  escalate: boolean;
  reasoning: string;
}

async function generateAIResponse(userMessage: string): Promise<AIResult> {
  const apiKey = process.env.ANTHROPIC_API_KEY ?? process.env.ANTHROPIC_API_KEY_APP;
  if (!apiKey) {
    return {
      language: "en",
      category: "other",
      response: "Thank you for your message. A team member will follow up shortly.",
      confidence: 0,
      escalate: true,
      reasoning: "No API key configured",
    };
  }

  try {
    const anthropic = new Anthropic({ apiKey });
    const response = await anthropic.messages.create({
      model: HAIKU_MODEL,
      max_tokens: 1024,
      system: SUPPORT_SYSTEM_PROMPT,
      messages: [{ role: "user", content: userMessage }],
    });
    const text = response.content
      .filter((b) => b.type === "text")
      .map((b) => (b as { text: string }).text)
      .join("");

    // Extract JSON from response (Haiku may wrap in text)
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error("No JSON in AI response");
    const parsed = JSON.parse(jsonMatch[0]) as Partial<AIResult>;

    return {
      language: parsed.language ?? "en",
      category: parsed.category ?? "other",
      response: parsed.response ?? "Thank you. We'll review your message and follow up.",
      confidence: typeof parsed.confidence === "number" ? parsed.confidence : 0.5,
      escalate: parsed.escalate ?? false,
      reasoning: parsed.reasoning ?? "",
    };
  } catch (e) {
    return {
      language: "en",
      category: "other",
      response: "Thank you for your message. A team member will follow up shortly.",
      confidence: 0,
      escalate: true,
      reasoning: `AI error: ${e instanceof Error ? e.message : "unknown"}`,
    };
  }
}

async function notifyAdmin(ticketId: string, userMessage: string, ai: AIResult) {
  const botToken = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_ADMIN_CHAT_ID;
  const adminEmail = process.env.ADMIN_EMAIL;
  const resendKey = process.env.RESEND_API_KEY;

  const text = `🆘 <b>Escalated Ticket #${ticketId.slice(0, 8)}</b>
Language: ${ai.language} · Category: ${ai.category}
Confidence: ${(ai.confidence * 100).toFixed(0)}%

<b>User said:</b>
${userMessage.slice(0, 500)}${userMessage.length > 500 ? "..." : ""}

<b>AI reasoning:</b>
${ai.reasoning}

<a href="https://markethubpromo.com/dashboard/admin">Open Admin</a>`;

  // Telegram
  if (botToken && chatId) {
    try {
      await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ chat_id: chatId, text, parse_mode: "HTML" }),
      });
    } catch {
      // silent
    }
  }

  // Email
  if (resendKey && adminEmail) {
    try {
      await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${resendKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: "MarketHub Support <support@markethubpromo.com>",
          to: [adminEmail],
          subject: `[Escalated] Support ticket ${ticketId.slice(0, 8)}`,
          text: text.replace(/<[^>]+>/g, ""),
        }),
      });
    } catch {
      // silent
    }
  }
}
