/**
 * GET /api/brain/outreach-batch-send — Batch-send emails for all AlexLoom
 * outputs that haven't been emailed yet.
 *
 * Pipeline:
 *   1. Query brain_knowledge_base for case_study entries tagged "alex-loom"
 *   2. For each, check if domain already has a "sent" row in outreach_log
 *   3. If not sent, call the outreach-send logic internally
 *   4. Cap at 10 per batch (anti-spam + Resend rate limit safety)
 *   5. Log summary to brain_agent_activity
 *   6. Send Telegram notification with count
 *
 * Auth: x-brain-cron-secret OR brain_admin cookie OR admin session.
 * Designed to be called by a cron job (GitHub Actions / n8n).
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { Resend } from "resend";
import { startActivity, completeActivity, failActivity } from "@/lib/agent-activity";

export const dynamic = "force-dynamic";
export const maxDuration = 120;

const FROM_ADDRESS = "Eduard Bostan <alex@markethubpromo.com>";
const REPLY_TO = "alex@markethubpromo.com";
const BCC = "office@markethubpromo.com";
const CALENDLY_LINK = "https://calendly.com/markethubpro/demo";
const UNSUBSCRIBE_URL = "https://markethubpromo.com/unsubscribe";
const BATCH_CAP = 10;

// ── Auth ────────────────────────────────────────────────────────────────────

async function authOk(req: NextRequest): Promise<boolean> {
  const cronSecret = req.headers.get("x-brain-cron-secret");
  if (cronSecret && process.env.BRAIN_CRON_SECRET && cronSecret === process.env.BRAIN_CRON_SECRET) {
    return true;
  }
  const brainCookie = req.cookies.get("brain_admin")?.value;
  if (brainCookie === "1") return true;
  const supa = await createClient();
  const { data: { user } } = await supa.auth.getUser();
  if (!user) return false;
  const svc = createServiceClient();
  const { data: profile } = await svc
    .from("profiles")
    .select("is_admin")
    .eq("id", user.id)
    .maybeSingle();
  return Boolean(profile?.is_admin);
}

// ── Telegram notification ───────────────────────────────────────────────────

async function notifyTelegram(text: string): Promise<boolean> {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_ALLOWED_CHAT_ID;
  if (!token || !chatId) return false;
  try {
    const r = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id: chatId, text, parse_mode: "Markdown" }),
    });
    const j = (await r.json()) as { ok?: boolean };
    return Boolean(j.ok);
  } catch {
    return false;
  }
}

// ── HTML email builder (same as outreach-send) ─────────────────────────────

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function buildEmailHtml(opts: {
  businessName: string;
  script: string;
  voiceUrl: string | null;
  recipientEmail: string;
}): string {
  const scriptHtml = escapeHtml(opts.script).replace(/\n/g, "<br/>");
  const voiceBlock = opts.voiceUrl
    ? `<p style="margin:24px 0 0;font-size:14px;color:#78614E;">
        P.S. Am pregătit și o scurtă înregistrare audio cu propunerea:
        <a href="${escapeHtml(opts.voiceUrl)}" style="color:#D97706;text-decoration:underline;">Ascultă aici</a>
      </p>`
    : "";

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
          <span style="color:#F59E0B;">●</span> MarketHub Pro
        </a>
      </td></tr>
      <tr><td style="padding:32px;color:#292524;font-size:15px;line-height:1.7;">
        <p style="margin:0 0 20px;">Bună ziua,</p>
        <div style="margin:0 0 24px;padding:16px 20px;background:#FFF8F0;border-left:3px solid #F59E0B;border-radius:0 8px 8px 0;font-size:15px;line-height:1.7;">
          ${scriptHtml}
        </div>
        <p style="margin:0 0 16px;">
          Dacă doriți să vedeți cum arată în practică, vă invit la o demonstrație gratuită:
        </p>
        <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 24px;">
          <tr><td style="background:linear-gradient(135deg,#F59E0B,#D97706);border-radius:12px;">
            <a href="${CALENDLY_LINK}" style="display:inline-block;padding:14px 28px;color:#1C1814;text-decoration:none;font-weight:700;font-size:14px;">
              Programează o demonstrație gratuită
            </a>
          </td></tr>
        </table>
        <p style="margin:0 0 4px;">Cu stimă,</p>
        <p style="margin:0 0 4px;font-weight:700;">Eduard Bostan</p>
        <p style="margin:0;color:#78614E;font-size:13px;">Fondator, MarketHub Pro</p>
        ${voiceBlock}
      </td></tr>
      <tr><td style="padding:24px 32px 32px;border-top:1px solid rgba(245,215,160,0.3);background-color:#FFF8F0;">
        <p style="margin:0 0 8px;font-size:12px;color:#78614E;">
          Aveți întrebări? Răspundeți direct la acest email.
        </p>
        <p style="margin:0 0 8px;font-size:11px;color:#A8967E;">
          MarketHub Pro · Social Media Marketing for Agencies & Creators<br/>
          Trimis către ${escapeHtml(opts.recipientEmail)}.
        </p>
        <p style="margin:0;font-size:11px;color:#A8967E;">
          <a href="${UNSUBSCRIBE_URL}?email=${encodeURIComponent(opts.recipientEmail)}" style="color:#A8967E;text-decoration:underline;">Dezabonare</a>
          · Nu mai doriți emailuri? Răspundeți cu "dezabonare" și vă scoatem imediat din listă.
        </p>
      </td></tr>
    </table>
  </td></tr>
</table>
</body></html>`;
}

function buildPlainText(opts: { script: string; voiceUrl: string | null }): string {
  return `Bună ziua,

${opts.script}

Dacă doriți să vedeți cum arată în practică, vă invit la o demonstrație gratuită: ${CALENDLY_LINK}

Cu stimă,
Eduard Bostan
Fondator, MarketHub Pro
${opts.voiceUrl ? `\n---\nP.S. Am pregătit și o scurtă înregistrare audio cu propunerea: ${opts.voiceUrl}` : ""}

---
Nu mai doriți emailuri? Răspundeți cu "dezabonare" sau: ${UNSUBSCRIBE_URL}`;
}

// ── Main handler ────────────────────────────────────────────────────────────

export async function GET(req: NextRequest) {
  if (!(await authOk(req))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "RESEND_API_KEY not configured" }, { status: 500 });
  }

  const svc = createServiceClient();

  // 1. Get all AlexLoom entries from knowledge base
  const { data: kbEntries, error: kbError } = await svc
    .from("brain_knowledge_base")
    .select("content, created_at, tags")
    .eq("category", "case_study")
    .contains("tags", ["alex-loom"])
    .order("created_at", { ascending: false })
    .limit(100);

  if (kbError || !kbEntries?.length) {
    return NextResponse.json({
      ok: true,
      message: "No AlexLoom entries found in knowledge base",
      sent: 0,
      skipped: 0,
    });
  }

  // 2. Get all domains that already have a "sent" row in outreach_log
  const { data: sentRows } = await svc
    .from("outreach_log")
    .select("domain")
    .eq("status", "sent");

  const sentDomains = new Set((sentRows ?? []).map((r) => r.domain));

  // 3. Filter to unsent entries, extract domain from manifest
  const unsent: Array<{
    domain: string;
    script: string;
    voiceUrl: string | null;
    prospectEmail: string | null;
    businessName: string;
  }> = [];

  for (const entry of kbEntries) {
    const manifest = entry.content as Record<string, unknown>;
    const domain = (manifest.domain as string) ?? null;
    if (!domain) continue;

    // Deduplicate: only take first (latest) entry per domain
    if (unsent.some((u) => u.domain === domain)) continue;
    if (sentDomains.has(domain)) continue;

    const script = (manifest.script as string) ?? null;
    if (!script) continue;

    unsent.push({
      domain,
      script,
      voiceUrl: (manifest.voice_url as string) ?? null,
      prospectEmail: (manifest.prospect_email as string) ?? null,
      businessName: (manifest.prospect_name as string) ?? domain,
    });

    if (unsent.length >= BATCH_CAP) break;
  }

  if (!unsent.length) {
    return NextResponse.json({
      ok: true,
      message: "All AlexLoom prospects have already been emailed",
      sent: 0,
      skipped: kbEntries.length,
    });
  }

  // 4. For entries without an email, try to look up from brain_global_prospects
  const domainsNeedingEmail = unsent.filter((u) => !u.prospectEmail).map((u) => u.domain);
  if (domainsNeedingEmail.length) {
    const { data: prospects } = await svc
      .from("brain_global_prospects")
      .select("domain, email, business_name")
      .in("domain", domainsNeedingEmail);

    if (prospects) {
      const emailMap = new Map(prospects.map((p) => [p.domain, { email: p.email, name: p.business_name }]));
      for (const entry of unsent) {
        if (!entry.prospectEmail && emailMap.has(entry.domain)) {
          const info = emailMap.get(entry.domain)!;
          entry.prospectEmail = info.email;
          if (info.name && entry.businessName === entry.domain) {
            entry.businessName = info.name;
          }
        }
      }
    }
  }

  // 5. Send emails
  const activity = await startActivity(
    "sales",
    `Sofia trimite batch outreach: ${unsent.length} emailuri din AlexLoom`,
  );

  const resend = new Resend(apiKey);
  const results: Array<{
    domain: string;
    status: "sent" | "no_email" | "send_failed";
    email?: string;
    message_id?: string;
    error?: string;
  }> = [];

  for (const entry of unsent) {
    if (!entry.prospectEmail) {
      results.push({ domain: entry.domain, status: "no_email" });
      continue;
    }

    const subject = `${entry.businessName} — o propunere rapidă`;
    const html = buildEmailHtml({
      businessName: entry.businessName,
      script: entry.script,
      voiceUrl: entry.voiceUrl,
      recipientEmail: entry.prospectEmail,
    });
    const text = buildPlainText({ script: entry.script, voiceUrl: entry.voiceUrl });

    try {
      const result = await resend.emails.send({
        from: FROM_ADDRESS,
        to: [entry.prospectEmail],
        bcc: [BCC],
        subject,
        html,
        text,
        replyTo: REPLY_TO,
        headers: {
          "List-Unsubscribe": `<${UNSUBSCRIBE_URL}?email=${encodeURIComponent(entry.prospectEmail)}>`,
          "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
        },
      });

      if (result.error) {
        results.push({
          domain: entry.domain,
          status: "send_failed",
          email: entry.prospectEmail,
          error: result.error.message,
        });
        try {
          await svc.from("outreach_log").insert({
            domain: entry.domain,
            email: entry.prospectEmail,
            language: "ro",
            subject,
            body: entry.script,
            status: "send_failed",
          });
        } catch { /* non-fatal */ }
        continue;
      }

      const messageId = result.data?.id ?? undefined;
      results.push({
        domain: entry.domain,
        status: "sent",
        email: entry.prospectEmail,
        message_id: messageId,
      });

      // Log to outreach_log
      try {
        await svc.from("outreach_log").insert({
          domain: entry.domain,
          email: entry.prospectEmail,
          language: "ro",
          subject,
          body: entry.script,
          status: "sent",
        });
      } catch { /* non-fatal */ }
    } catch (err) {
      results.push({
        domain: entry.domain,
        status: "send_failed",
        email: entry.prospectEmail,
        error: err instanceof Error ? err.message : "unknown",
      });
      try {
        await svc.from("outreach_log").insert({
          domain: entry.domain,
          email: entry.prospectEmail,
          language: "ro",
          subject,
          body: entry.script,
          status: "send_failed",
        });
      } catch { /* non-fatal */ }
    }
  }

  const sentCount = results.filter((r) => r.status === "sent").length;
  const failedCount = results.filter((r) => r.status === "send_failed").length;
  const noEmailCount = results.filter((r) => r.status === "no_email").length;

  // 6. Log summary to agent activity
  await completeActivity(
    activity,
    `Sofia: batch outreach trimis — ${sentCount} sent, ${failedCount} failed, ${noEmailCount} no_email`,
    { sent: sentCount, failed: failedCount, no_email: noEmailCount, total: results.length },
  );

  // 7. Send Telegram notification
  const sentDomainsList = results
    .filter((r) => r.status === "sent")
    .map((r) => `  - ${r.domain} → ${r.email}`)
    .join("\n");

  const tgMessage = sentCount > 0
    ? `*Outreach Batch Send*\n\n${sentCount} emailuri trimise cu succes:\n${sentDomainsList}${failedCount ? `\n\n${failedCount} esuate` : ""}${noEmailCount ? `\n${noEmailCount} fara email` : ""}`
    : `*Outreach Batch Send*\n\n0 emailuri trimise.${failedCount ? ` ${failedCount} esuate.` : ""}${noEmailCount ? ` ${noEmailCount} fara email.` : ""}`;

  await notifyTelegram(tgMessage);

  return NextResponse.json({
    ok: true,
    sent: sentCount,
    failed: failedCount,
    no_email: noEmailCount,
    total: results.length,
    results,
  });
}
