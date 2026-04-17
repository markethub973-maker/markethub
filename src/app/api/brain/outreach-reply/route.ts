/**
 * POST /api/brain/outreach-reply — Alex auto-replies to prospect emails.
 *
 * Called by the Resend inbound webhook when a prospect replies.
 * Alex composes an intelligent response based on:
 *   1. The prospect's message
 *   2. Conversation history (outreach_log + reply_log)
 *   3. Alex's knowledge base (frameworks, platform capabilities, rules)
 *
 * Intent classification:
 *   - "general_question" → Alex replies autonomously
 *   - "demo_interest" → Alex replies + Telegram notify Eduard
 *   - "pricing_question" → Alex replies + Telegram notify Eduard
 *   - "objection" → Alex replies with framework-based handling
 *   - "not_interested" → Alex sends polite close + marks lead cold
 *   - "demo_booked" → Telegram notify Eduard immediately
 *
 * Auth: BRAIN_CRON_SECRET (called internally by webhook, not browser)
 */

import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import Anthropic from "@anthropic-ai/sdk";
import { ALEX_KNOWLEDGE_BRIEF } from "@/lib/alex-knowledge";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

const FROM_ADDRESS = "Eduard Bostan <alex@markethubpromo.com>";
const REPLY_TO = "alex@markethubpromo.com";
const CALENDLY_LINK = "https://calendly.com/markethubpro/demo";

// Intents that trigger Eduard notification
const NOTIFY_INTENTS = ["demo_interest", "pricing_question", "demo_booked"];

// ── Auth ────────────────────────────────────────────────────────────────────

function authOk(req: NextRequest): boolean {
  const secret = req.headers.get("x-brain-cron-secret");
  return Boolean(
    secret &&
      process.env.BRAIN_CRON_SECRET &&
      secret === process.env.BRAIN_CRON_SECRET
  );
}

// ── Telegram notify ─────────────────────────────────────────────────────────

async function notifyEduard(
  domain: string,
  intent: string,
  prospectMessage: string,
  alexReply: string
): Promise<void> {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_ALLOWED_CHAT_ID;
  if (!token || !chatId) return;

  const emoji =
    intent === "demo_booked"
      ? "🎯"
      : intent === "demo_interest"
        ? "🔥"
        : intent === "pricing_question"
          ? "💰"
          : "📬";

  const text = [
    `${emoji} OUTREACH REPLY — ${domain}`,
    ``,
    `Intent: ${intent}`,
    ``,
    `Prospect a scris:`,
    `"${prospectMessage.slice(0, 300)}"`,
    ``,
    `Alex a raspuns:`,
    `"${alexReply.slice(0, 300)}"`,
    ``,
    intent === "demo_booked"
      ? `Eduard, verifica Calendly!`
      : `Alex gestioneaza conversatia autonom.`,
  ].join("\n");

  try {
    await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id: chatId, text }),
    });
  } catch {
    /* best effort */
  }
}

// ── Compose reply via Claude ────────────────────────────────────────────────

interface ComposeResult {
  intent: string;
  reply: string;
  subject: string;
}

async function composeReply(
  prospectName: string,
  prospectDomain: string,
  prospectMessage: string,
  conversationHistory: string,
  language: string
): Promise<ComposeResult> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error("ANTHROPIC_API_KEY not set");

  const client = new Anthropic({ apiKey });

  const systemPrompt = `${ALEX_KNOWLEDGE_BRIEF}

## YOUR TASK RIGHT NOW
You are replying to a prospect who responded to your outreach email.
You are Alex (but sign as Eduard Bostan, fondator MarketHub Pro).
Language: ${language === "ro" ? "Romanian" : "English"}.

RULES:
1. Be warm, professional, concise (3-5 sentences max).
2. NEVER reveal you are AI. You are Eduard, a real person.
3. Always steer toward booking a demo: ${CALENDLY_LINK}
4. If they ask specific questions, answer honestly based on platform capabilities.
5. If they show interest, propose 2-3 time slots or share Calendly link.
6. If they're not interested, be gracious and leave door open.
7. Match their energy — if casual, be casual. If formal, be formal.
8. NEVER mention tool names (Claude, Resend, Fal.ai, etc.) — ANTI-INTELLECTUAL-THEFT rule.

CONVERSATION HISTORY:
${conversationHistory}

PROSPECT'S LATEST MESSAGE:
"${prospectMessage}"

Respond with JSON only:
{
  "intent": "general_question" | "demo_interest" | "pricing_question" | "objection" | "not_interested" | "demo_booked",
  "reply": "your reply text here",
  "subject": "Re: original subject or appropriate reply subject"
}`;

  const response = await client.messages.create({
    model: "claude-haiku-4-5-20251001",
    max_tokens: 500,
    messages: [{ role: "user", content: "Compose the reply now." }],
    system: systemPrompt,
  });

  const text =
    response.content[0].type === "text" ? response.content[0].text : "";

  // Parse JSON from response (handle markdown code blocks)
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    return {
      intent: "general_question",
      reply: text,
      subject: `Re: ${prospectName}`,
    };
  }

  try {
    const parsed = JSON.parse(jsonMatch[0]) as ComposeResult;
    return parsed;
  } catch {
    return {
      intent: "general_question",
      reply: text,
      subject: `Re: ${prospectName}`,
    };
  }
}

// ── HTML email wrapper ──────────────────────────────────────────────────────

function wrapHtml(body: string, prospectEmail: string): string {
  const escaped = body
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\n/g, "<br/>");

  return `<!DOCTYPE html>
<html lang="ro"><head>
<meta charset="utf-8"/>
<meta name="viewport" content="width=device-width, initial-scale=1.0"/>
</head>
<body style="margin:0;padding:0;background-color:#F5EFE5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#292524;">
<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color:#F5EFE5;">
  <tr><td align="center" style="padding:32px 16px;">
    <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="600" style="max-width:600px;background-color:#FFFCF7;border-radius:16px;overflow:hidden;box-shadow:0 4px 16px rgba(0,0,0,0.06);">
      <tr><td style="padding:24px 32px 16px;border-bottom:1px solid rgba(245,215,160,0.3);">
        <a href="https://markethubpromo.com" style="text-decoration:none;color:#292524;font-size:18px;font-weight:700;">
          <span style="color:#F59E0B;">\u25CF</span> MarketHub Pro
        </a>
      </td></tr>
      <tr><td style="padding:32px;color:#292524;font-size:15px;line-height:1.7;">
        ${escaped}
      </td></tr>
      <tr><td style="padding:24px 32px 32px;border-top:1px solid rgba(245,215,160,0.3);background-color:#FFF8F0;">
        <p style="margin:0 0 8px;font-size:12px;color:#78614E;">
          Aveți întrebări? Răspundeți direct la acest email.
        </p>
        <p style="margin:0;font-size:11px;color:#A8967E;">
          MarketHub Pro &middot; Social Media Marketing for Agencies &amp; Creators<br/>
          <a href="https://markethubpromo.com/unsubscribe?email=${encodeURIComponent(prospectEmail)}" style="color:#A8967E;text-decoration:underline;">Dezabonare</a>
        </p>
      </td></tr>
    </table>
  </td></tr>
</table>
</body></html>`;
}

// ── Main handler ────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  if (!authOk(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const {
    prospect_email,
    prospect_domain,
    prospect_name,
    prospect_message,
    original_subject,
    language = "ro",
  } = (await req.json()) as {
    prospect_email: string;
    prospect_domain: string;
    prospect_name?: string;
    prospect_message: string;
    original_subject?: string;
    language?: string;
  };

  if (!prospect_email || !prospect_message) {
    return NextResponse.json(
      { error: "prospect_email and prospect_message required" },
      { status: 400 }
    );
  }

  const domain = prospect_domain || prospect_email.split("@").pop() || "";
  const name = prospect_name || domain;

  // Load conversation history from outreach_log
  const svc = createServiceClient();
  const { data: history } = await svc
    .from("outreach_log")
    .select("subject, body, created_at, status")
    .eq("domain", domain)
    .order("created_at", { ascending: true })
    .limit(10);

  const conversationCtx = (history || [])
    .map(
      (h) =>
        `[${h.created_at}] Alex sent (${h.status}): Subject: ${h.subject}\n${h.body?.slice(0, 500) || ""}`
    )
    .join("\n\n");

  // Load any previous replies from reply_log
  const { data: prevReplies } = await svc
    .from("outreach_reply_log")
    .select("direction, message, created_at")
    .eq("domain", domain)
    .order("created_at", { ascending: true })
    .limit(20);

  const replyCtx = (prevReplies || [])
    .map(
      (r) =>
        `[${r.created_at}] ${r.direction === "inbound" ? "Prospect" : "Alex"}: ${r.message?.slice(0, 500) || ""}`
    )
    .join("\n\n");

  const fullHistory = [conversationCtx, replyCtx].filter(Boolean).join("\n\n---\n\n");

  // Compose reply
  const { intent, reply, subject } = await composeReply(
    name,
    domain,
    prospect_message,
    fullHistory,
    language
  );

  // Send reply via Resend
  const resendKey = process.env.RESEND_API_KEY;
  if (!resendKey) {
    return NextResponse.json({ error: "RESEND_API_KEY not set" }, { status: 500 });
  }

  const replySubject = subject || `Re: ${original_subject || name}`;

  const sendRes = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${resendKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: FROM_ADDRESS,
      to: [prospect_email],
      reply_to: REPLY_TO,
      subject: replySubject,
      html: wrapHtml(reply, prospect_email),
      text: reply,
      headers: {
        "List-Unsubscribe": `<https://markethubpromo.com/unsubscribe?email=${encodeURIComponent(prospect_email)}>`,
      },
    }),
  });

  const sendData = (await sendRes.json()) as { id?: string; error?: string };

  // Log inbound message
  await svc
    .from("outreach_reply_log")
    .insert({
      domain,
      email: prospect_email,
      direction: "inbound",
      message: prospect_message,
      intent,
    });

  // Log outbound reply
  await svc
    .from("outreach_reply_log")
    .insert({
      domain,
      email: prospect_email,
      direction: "outbound",
      message: reply,
      intent,
      resend_id: sendData.id || null,
    });

  // Notify Eduard on conversion-relevant intents
  if (NOTIFY_INTENTS.includes(intent)) {
    await notifyEduard(domain, intent, prospect_message, reply);
  }

  // Mark lead as cold if not interested
  if (intent === "not_interested") {
    await svc
      .from("outreach_log")
      .update({ status: "closed_cold" })
      .eq("domain", domain)
      .is("replied_at", null);
  }

  return NextResponse.json({
    ok: true,
    intent,
    reply_sent: Boolean(sendData.id),
    resend_id: sendData.id,
    reply_preview: reply.slice(0, 200),
  });
}
