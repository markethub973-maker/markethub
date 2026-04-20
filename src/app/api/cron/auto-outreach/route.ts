/**
 * GET /api/cron/auto-outreach — Autonomous outreach cron
 *
 * Runs 2x daily via GHA. Automatically:
 * 1. Finds prospects with status='prospect' and email != null
 * 2. That haven't been emailed yet (not in outreach_log)
 * 3. Generates personalized pitch using Claude Haiku
 * 4. Sends via Resend
 * 5. Logs to outreach_log
 *
 * Max 5 emails per run (Resend free tier: 100/day)
 */

import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import Anthropic from "@anthropic-ai/sdk";
import { ALEX_KNOWLEDGE_BRIEF } from "@/lib/alex-knowledge";
import { OUTPUT_SAFETY_RULES } from "@/lib/anthropic-client";

export const dynamic = "force-dynamic";
export const maxDuration = 55;

const BATCH_SIZE = 5;
const FROM_ADDRESS = "Eduard Bostan <alex@markethubpromo.com>";
const REPLY_TO = "alex@markethubpromo.com";

function authOk(req: NextRequest): boolean {
  const h = req.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;
  if (!h || !cronSecret) return false;
  return h === `Bearer ${cronSecret}`;
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

async function generatePitch(
  businessName: string,
  snippet: string,
  countryCode: string
): Promise<{ subject: string; body: string } | null> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return null;

  const client = new Anthropic({ apiKey });
  const lang = countryCode === "RO" ? "Romanian" : "English";
  const signOff = "Eduard";

  const response = await client.messages.create({
    model: "claude-haiku-4-5-20251001",
    max_tokens: 500,
    system: `You write cold outreach emails for MarketHub Pro. Write in ${lang}. Be warm, short (4-5 sentences), personal. Sign as ${signOff}. Never reveal you are AI. Never mention tool names (Claude, AI, Fal.ai etc).

KEY OFFER: We create 5 professional social media posts for their business COMPLETELY FREE — no obligation, no credit card. This is a pilot to show quality before they pay anything.

Structure:
1. Show you know their business (mention something specific from their website)
2. Identify their social media gap (posting too rarely, no visual consistency, etc.)
3. Offer: "We'd like to create 5 free posts for [business name] — captions + images, ready to publish. Zero cost, zero obligation."
4. CTA: book 15-min call to discuss their brand: https://calendar.app.google/kmUnEepd8a3Nj1Mh7
5. P.S. mention the demo page: https://markethubpromo.com/demo` + OUTPUT_SAFETY_RULES,
    messages: [{
      role: "user",
      content: `Write a cold outreach email to "${businessName}". Info about them: ${snippet.slice(0, 300)}. Return JSON only: {"subject":"...","body":"..."}`
    }],
  });

  const text = response.content[0].type === "text" ? response.content[0].text : "";
  const match = text.match(/\{[\s\S]*\}/);
  if (!match) return null;
  try {
    return JSON.parse(match[0]) as { subject: string; body: string };
  } catch {
    return null;
  }
}

function buildEmailHtml(businessName: string, body: string, recipientEmail: string): string {
  const bodyHtml = escapeHtml(body).replace(/\n/g, "<br/>");
  return `<!DOCTYPE html>
<html lang="ro"><head><meta charset="utf-8"/><meta name="viewport" content="width=device-width,initial-scale=1.0"/></head>
<body style="margin:0;padding:0;background:#F5EFE5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;color:#292524;">
<table role="presentation" width="100%" style="background:#F5EFE5;"><tr><td align="center" style="padding:32px 16px;">
<table role="presentation" width="600" style="max-width:600px;background:#FFFCF7;border-radius:16px;overflow:hidden;box-shadow:0 4px 16px rgba(0,0,0,0.06);">
<tr><td style="padding:24px 32px 16px;border-bottom:1px solid rgba(245,215,160,0.3);">
<a href="https://markethubpromo.com" style="text-decoration:none;color:#292524;font-size:18px;font-weight:700;"><span style="color:#F59E0B;">●</span> MarketHub Pro</a>
</td></tr>
<tr><td style="padding:32px;font-size:15px;line-height:1.7;">
<p style="margin:0 0 20px;">Bună ziua,</p>
<div style="margin:0 0 24px;padding:16px 20px;background:#FFF8F0;border-left:3px solid #F59E0B;border-radius:0 8px 8px 0;">${bodyHtml}</div>
<table role="presentation" style="margin:0 0 24px;"><tr><td style="background:linear-gradient(135deg,#F59E0B,#D97706);border-radius:12px;">
<a href="https://calendar.app.google/kmUnEepd8a3Nj1Mh7?hl=en" style="display:inline-block;padding:14px 28px;color:#1C1814;text-decoration:none;font-weight:700;font-size:14px;">Demo gratuit 15 min</a>
</td></tr></table>
<p style="margin:0 0 4px;">Cu stimă,</p><p style="margin:0;font-weight:700;">Eduard Bostan</p>
</td></tr>
<tr><td style="padding:16px 32px;border-top:1px solid rgba(245,215,160,0.3);background:#FFF8F0;">
<p style="margin:0;font-size:11px;color:#A8967E;">MarketHub Pro · <a href="https://markethubpromo.com/unsubscribe?email=${encodeURIComponent(recipientEmail)}" style="color:#A8967E;">Dezabonare</a></p>
</td></tr></table></td></tr></table></body></html>`;
}

export async function GET(req: NextRequest) {
  if (!authOk(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const resendKey = process.env.RESEND_API_KEY;
  if (!resendKey) {
    return NextResponse.json({ error: "RESEND_API_KEY not set" }, { status: 500 });
  }

  const svc = createServiceClient();

  // Get prospects with email that haven't been emailed
  // Get ALL domains already in outreach_log (any status) — never re-send
  const { data: sentRows } = await svc
    .from("outreach_log")
    .select("domain");

  const sentDomains = new Set((sentRows || []).map((r) => r.domain));

  const { data: prospects } = await svc
    .from("brain_global_prospects")
    .select("domain, business_name, email, country_code, snippet")
    .eq("outreach_status", "prospect")
    .not("email", "is", null)
    .not("outreach_status", "in", "(blocked_competitor,prospect_parked,prospect_agency)")
    .order("created_at", { ascending: false })
    .limit(50);

  if (!prospects || !prospects.length) {
    return NextResponse.json({ ok: true, sent: 0, note: "no prospects to email" });
  }

  // ── STRICT SAFETY GUARDS ──────────────────────────────────────────────
  // Blocked keywords in domain/business name — NEVER contact these
  const BLOCKED_KEYWORDS = [
    "marketing", "agency", "digital", "software", "seo", "web", "media",
    "creative", "branding", "design", "studio", "tech", "IT", "saas",
    "development", "developer", "consulting", "advertis", "marcom",
  ];

  // Blocked email prefixes
  const BLOCKED_EMAILS = ["programari@", "appointments@", "rezervari@", "booking@", "noreply@", "no-reply@"];

  // Filter to unsent + apply safety guards
  const toSend = prospects
    .filter((p) => {
      if (!p.email) return false;
      if (sentDomains.has(p.domain)) return false;

      // Block agencies by domain/name keywords
      const domainLower = (p.domain || "").toLowerCase();
      const nameLower = (p.business_name || "").toLowerCase();
      const combined = domainLower + " " + nameLower;
      if (BLOCKED_KEYWORDS.some(kw => combined.includes(kw.toLowerCase()))) {
        // Auto-mark as blocked in DB
        void svc.from("brain_global_prospects").update({ outreach_status: "blocked_competitor" }).eq("domain", p.domain);
        return false;
      }

      // Block bad email prefixes
      const emailLower = p.email.toLowerCase();
      if (BLOCKED_EMAILS.some(prefix => emailLower.startsWith(prefix))) {
        return false;
      }

      return true;
    })
    .slice(0, BATCH_SIZE);

  if (!toSend.length) {
    return NextResponse.json({ ok: true, sent: 0, note: "all prospects already emailed" });
  }

  let sent = 0;
  let failed = 0;
  const results: Array<{ domain: string; email: string; status: string }> = [];

  for (const prospect of toSend) {
    // SAFETY: web-read check — verify NOT a marketing agency before sending
    try {
      const checkUrl = `${process.env.NEXT_PUBLIC_APP_URL || "https://markethubpromo.com"}/api/brain/web-read?url=https://${prospect.domain}`;
      const checkRes = await fetch(checkUrl, {
        headers: { "x-brain-cron-secret": process.env.BRAIN_CRON_SECRET ?? "" },
        signal: AbortSignal.timeout(8000),
      });
      if (checkRes.ok) {
        const checkData = await checkRes.json();
        if (checkData.isMarketingAgency) {
          await svc.from("brain_global_prospects").update({ outreach_status: "blocked_competitor" }).eq("domain", prospect.domain);
          await svc.from("outreach_log").insert({ domain: prospect.domain, email_to: prospect.email, status: "blocked_competitor", subject: "AUTO-BLOCKED: marketing agency detected" });
          results.push({ domain: prospect.domain, email: prospect.email, status: "blocked_agency" });
          continue;
        }
      }
    } catch { /* non-fatal — proceed with send if check fails */ }

    // Generate personalized pitch
    const pitch = await generatePitch(
      prospect.business_name || prospect.domain,
      prospect.snippet || "",
      prospect.country_code || "RO"
    );

    if (!pitch) {
      results.push({ domain: prospect.domain, email: prospect.email, status: "pitch_generation_failed" });
      failed++;
      continue;
    }

    // Send via Resend
    try {
      const sendRes = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${resendKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: FROM_ADDRESS,
          to: [prospect.email],
          reply_to: REPLY_TO,
          bcc: ["office@markethubpromo.com"],
          subject: pitch.subject,
          html: buildEmailHtml(prospect.business_name || prospect.domain, pitch.body, prospect.email),
          text: pitch.body,
          headers: {
            "List-Unsubscribe": `<https://markethubpromo.com/unsubscribe?email=${encodeURIComponent(prospect.email)}>`,
          },
        }),
      });

      const sendData = (await sendRes.json()) as { id?: string };

      if (sendData.id) {
        sent++;
        // Log to outreach_log
        await svc.from("outreach_log").insert({
          domain: prospect.domain,
          email: prospect.email,
          language: prospect.country_code === "RO" ? "ro" : "en",
          subject: pitch.subject,
          body: pitch.body,
          status: "sent",
        });
        results.push({ domain: prospect.domain, email: prospect.email, status: "sent" });
      } else {
        failed++;
        results.push({ domain: prospect.domain, email: prospect.email, status: "send_failed" });
      }
    } catch (err) {
      failed++;
      results.push({ domain: prospect.domain, email: prospect.email, status: `error: ${String(err).slice(0, 50)}` });
    }
  }

  // Telegram notification
  if (sent > 0) {
    const token = process.env.TELEGRAM_BOT_TOKEN;
    const chatId = process.env.TELEGRAM_ALLOWED_CHAT_ID;
    if (token && chatId) {
      const sentList = results
        .filter((r) => r.status === "sent")
        .map((r) => `  • ${r.domain} → ${r.email}`)
        .join("\n");
      await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chat_id: chatId,
          text: `📧 Auto-Outreach: ${sent} emailuri trimise!\n\n${sentList}\n\nFailed: ${failed}`,
        }),
      });
    }
  }

  return NextResponse.json({ ok: true, sent, failed, results });
}
