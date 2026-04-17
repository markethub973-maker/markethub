/**
 * POST /api/brain/outreach-send — Send a REAL personalized email to a prospect.
 *
 * Bridges the gap between AlexLoom (script + voice generation) and actual
 * email delivery. Previously, AlexLoom produced beautiful assets but nobody
 * ever pressed "send". This endpoint IS the send button.
 *
 * Body: { prospect_domain: string, force?: boolean }
 *
 * Pipeline:
 *   1. Look up prospect in brain_global_prospects by domain
 *   2. Find latest AlexLoom output in brain_knowledge_base
 *   3. Extract script, voice_url, email, business_name
 *   4. Compose professional HTML email (Romanian, warm founder tone)
 *   5. Send via Resend API (real delivery)
 *   6. Log to outreach_log with status="sent"
 *
 * Auth: x-brain-cron-secret OR brain_admin cookie OR admin session.
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { Resend } from "resend";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

const FROM_ADDRESS = "Eduard Bostan <alex@markethubpromo.com>";
const REPLY_TO = "alex@markethubpromo.com";
const BCC = "office@markethubpromo.com";
const CALENDLY_LINK = "https://calendly.com/markethubpro/demo";
const UNSUBSCRIBE_URL = "https://markethubpromo.com/unsubscribe";

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

// ── HTML email template ─────────────────────────────────────────────────────

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
<title>${escapeHtml(opts.businessName)} — o propunere rapidă</title>
</head>
<body style="margin:0;padding:0;background-color:#F5EFE5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#292524;">

<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color:#F5EFE5;">
  <tr><td align="center" style="padding:32px 16px;">
    <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="600" style="max-width:600px;background-color:#FFFCF7;border-radius:16px;overflow:hidden;box-shadow:0 4px 16px rgba(0,0,0,0.06);">

      <!-- Header -->
      <tr><td style="padding:24px 32px 16px;border-bottom:1px solid rgba(245,215,160,0.3);">
        <a href="https://markethubpromo.com" style="text-decoration:none;color:#292524;font-size:18px;font-weight:700;">
          <span style="color:#F59E0B;">●</span> MarketHub Pro
        </a>
      </td></tr>

      <!-- Body -->
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

      <!-- Footer -->
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

function buildPlainText(opts: {
  script: string;
  voiceUrl: string | null;
}): string {
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

export async function POST(req: NextRequest) {
  if (!(await authOk(req))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await req.json().catch(() => ({}))) as {
    prospect_domain?: string;
    force?: boolean;
  };

  const domain = body.prospect_domain?.replace(/^https?:\/\//, "").replace(/^www\./, "").split("/")[0];
  if (!domain) {
    return NextResponse.json({ error: "prospect_domain is required" }, { status: 400 });
  }

  const svc = createServiceClient();

  // 1. Look up prospect in brain_global_prospects
  const { data: prospect } = await svc
    .from("brain_global_prospects")
    .select("domain, business_name, email, country_code, vertical, snippet, outreach_status")
    .eq("domain", domain)
    .maybeSingle();

  // Block sending to non-target prospects (software/IT/hosting)
  if (prospect?.outreach_status === "blocked_not_target") {
    return NextResponse.json(
      { error: `Domain "${domain}" is blocked (not a marketing agency). Cannot send outreach.` },
      { status: 403 },
    );
  }

  // 2. Find latest AlexLoom output in brain_knowledge_base
  const { data: kbEntries } = await svc
    .from("brain_knowledge_base")
    .select("content, created_at")
    .eq("category", "case_study")
    .contains("tags", ["alex-loom", domain])
    .order("created_at", { ascending: false })
    .limit(1);

  const kbEntry = kbEntries?.[0];
  if (!kbEntry) {
    return NextResponse.json(
      { error: `No AlexLoom output found for domain "${domain}". Run alex-loom first.` },
      { status: 404 },
    );
  }

  // 3. Extract data from the KB manifest
  const manifest = kbEntry.content as Record<string, unknown>;
  const script = (manifest.script as string) ?? null;
  const voiceUrl = (manifest.voice_url as string) ?? null;
  const prospectEmail = (manifest.prospect_email as string) ?? prospect?.email ?? null;
  const businessName = (manifest.prospect_name as string) ?? prospect?.business_name ?? domain;

  if (!script) {
    return NextResponse.json(
      { error: `AlexLoom entry exists but contains no script for "${domain}".` },
      { status: 422 },
    );
  }

  if (!prospectEmail) {
    return NextResponse.json(
      { error: `No email address found for prospect "${domain}". Add email to brain_global_prospects or pass it during alex-loom generation.` },
      { status: 422 },
    );
  }

  // 4. Check if already sent (unless force=true)
  if (!body.force) {
    const { data: existing } = await svc
      .from("outreach_log")
      .select("id, created_at")
      .eq("domain", domain)
      .eq("status", "sent")
      .limit(1);

    if (existing && existing.length > 0) {
      return NextResponse.json(
        {
          error: `Email already sent to ${domain} on ${existing[0].created_at}. Pass force=true to send again.`,
          already_sent: true,
        },
        { status: 409 },
      );
    }
  }

  // 5. Compose email
  const subject = `${businessName} — o propunere rapidă`;
  const html = buildEmailHtml({
    businessName,
    script,
    voiceUrl,
    recipientEmail: prospectEmail,
  });
  const text = buildPlainText({ script, voiceUrl });

  // 6. Send via Resend
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "RESEND_API_KEY not configured" }, { status: 500 });
  }

  let messageId: string | null = null;
  try {
    const resend = new Resend(apiKey);
    const result = await resend.emails.send({
      from: FROM_ADDRESS,
      to: [prospectEmail],
      bcc: [BCC],
      subject,
      html,
      text,
      replyTo: REPLY_TO,
      headers: {
        "List-Unsubscribe": `<${UNSUBSCRIBE_URL}?email=${encodeURIComponent(prospectEmail)}>`,
        "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
      },
    });
    if (result.error) {
      // Log failed attempt
      try {
        await svc.from("outreach_log").insert({
          domain,
          email: prospectEmail,
          language: "ro",
          subject,
          body: script,
          status: "send_failed",
        });
      } catch { /* non-fatal */ }
      return NextResponse.json(
        { error: `Resend API error: ${result.error.message}` },
        { status: 502 },
      );
    }
    messageId = result.data?.id ?? null;
  } catch (err) {
    try {
      await svc.from("outreach_log").insert({
        domain,
        email: prospectEmail,
        language: "ro",
        subject,
        body: script,
        status: "send_failed",
      });
    } catch { /* non-fatal */ }
    return NextResponse.json(
      { error: `Email send failed: ${err instanceof Error ? err.message : "unknown error"}` },
      { status: 502 },
    );
  }

  // 7. Log success to outreach_log
  try {
    await svc.from("outreach_log").insert({
      domain,
      email: prospectEmail,
      language: "ro",
      subject,
      body: script,
      status: "sent",
    });
  } catch { /* non-fatal */ }

  return NextResponse.json({
    ok: true,
    message_id: messageId,
    domain,
    email: prospectEmail,
    business_name: businessName,
    subject,
    voice_url: voiceUrl,
  });
}
