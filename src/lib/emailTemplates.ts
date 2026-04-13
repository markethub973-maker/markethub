/**
 * Branded email templates — central library.
 *
 * Replaces the inline string concatenation scattered across endpoints.
 * Every customer-facing email goes through `renderEmail()` so:
 *  - Brand colors stay consistent (#FFFCF7 cream, #F59E0B amber, #292524 dark)
 *  - Header + footer + unsubscribe live in one place
 *  - Mobile-responsive (table-based layout, inline CSS, no media queries
 *    needed — compatible with Outlook, Gmail, Apple Mail)
 *
 * Usage:
 *   import { sendBrandedEmail } from "@/lib/emailTemplates";
 *   await sendBrandedEmail("user@example.com", "welcome", { name: "Alex" });
 */

import { Resend } from "resend";

const FROM_DEFAULT = "MarketHub Pro <hello@markethubpromo.com>";
const APP_URL = "https://markethubpromo.com";
const SUPPORT_EMAIL = "support@markethubpromo.com";

interface EmailContent {
  subject: string;
  preheader: string; // hidden preview text shown in inbox preview
  bodyHtml: string;  // already-rendered HTML body — wrapper adds chrome
  bodyText: string;  // plaintext fallback
  cta?: { label: string; url: string };
}

// ── Branded HTML wrapper ────────────────────────────────────────────────────

function wrap(content: EmailContent, recipientEmail?: string): string {
  return `<!DOCTYPE html>
<html lang="en"><head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>${escape(content.subject)}</title>
</head>
<body style="margin:0;padding:0;background-color:#F5EFE5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#292524;">
<!-- Preheader (hidden but shown by inbox preview) -->
<div style="display:none;font-size:1px;color:#F5EFE5;line-height:1px;max-height:0;max-width:0;opacity:0;overflow:hidden;">${escape(content.preheader)}</div>

<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color:#F5EFE5;">
  <tr><td align="center" style="padding:32px 16px;">
    <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="600" style="max-width:600px;background-color:#FFFCF7;border-radius:16px;overflow:hidden;box-shadow:0 4px 16px rgba(0,0,0,0.06);">
      <!-- Header -->
      <tr><td style="padding:24px 32px 0;border-bottom:1px solid rgba(245,215,160,0.3);">
        <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
          <tr>
            <td style="padding-bottom:20px;">
              <a href="${APP_URL}" style="text-decoration:none;color:#292524;font-size:18px;font-weight:700;">
                <span style="color:#F59E0B;">●</span> MarketHub Pro
              </a>
            </td>
          </tr>
        </table>
      </td></tr>

      <!-- Body -->
      <tr><td style="padding:32px;color:#292524;font-size:15px;line-height:1.6;">
        ${content.bodyHtml}
        ${
          content.cta
            ? `<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:24px auto 0;">
                 <tr><td style="background:linear-gradient(135deg,#F59E0B,#D97706);border-radius:12px;">
                   <a href="${content.cta.url}" style="display:inline-block;padding:14px 28px;color:#1C1814;text-decoration:none;font-weight:700;font-size:14px;">
                     ${escape(content.cta.label)}
                   </a>
                 </td></tr>
               </table>`
            : ""
        }
      </td></tr>

      <!-- Footer -->
      <tr><td style="padding:24px 32px 32px;border-top:1px solid rgba(245,215,160,0.3);background-color:#FFF8F0;">
        <p style="margin:0 0 8px;font-size:12px;color:#78614E;">
          Need help? Email <a href="mailto:${SUPPORT_EMAIL}" style="color:#D97706;text-decoration:none;">${SUPPORT_EMAIL}</a>
        </p>
        <p style="margin:0;font-size:11px;color:#A8967E;">
          MarketHub Pro · Social Media Marketing for Agencies & Creators<br/>
          ${recipientEmail ? `Sent to ${escape(recipientEmail)}. ` : ""}<a href="${APP_URL}/settings" style="color:#A8967E;">Manage email preferences</a>
        </p>
      </td></tr>
    </table>
  </td></tr>
</table>
</body></html>`;
}

function escape(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

// ── Template builders ───────────────────────────────────────────────────────

interface WelcomeData {
  name?: string;
}
function tplWelcome(d: WelcomeData): EmailContent {
  const greet = d.name ? `Hi ${d.name},` : "Welcome aboard,";
  return {
    subject: "Welcome to MarketHub Pro — let's get you set up",
    preheader: "Connect your first social account in 60 seconds.",
    bodyHtml: `
      <h1 style="margin:0 0 12px;font-size:22px;font-weight:700;color:#292524;">Welcome to MarketHub Pro 👋</h1>
      <p style="margin:0 0 16px;">${escape(greet)}</p>
      <p style="margin:0 0 16px;">You just got 14 days of full access. Here&rsquo;s how to make the most of it:</p>
      <ol style="padding-left:20px;margin:0 0 16px;">
        <li style="margin-bottom:8px;"><strong>Connect a social account</strong> (Instagram, TikTok, YouTube, or LinkedIn) — analytics start flowing immediately.</li>
        <li style="margin-bottom:8px;"><strong>Schedule your first post</strong> in the Calendar — auto-publishes to all connected platforms.</li>
        <li style="margin-bottom:8px;"><strong>Try the AI Consultant</strong> — purple bubble bottom-left of any page. Ask anything about strategy or features.</li>
      </ol>
      <p style="margin:0 0 8px;color:#78614E;font-size:13px;">Need help? Reply to this email or hit the &ldquo;Need help?&rdquo; button anywhere in the app — our team responds in your language within minutes.</p>
    `,
    bodyText: `${greet}

Welcome to MarketHub Pro. You have 14 days of full access.

Get started:
1. Connect a social account: ${APP_URL}/integrations
2. Schedule your first post: ${APP_URL}/calendar
3. Try the AI Consultant in any page (purple bubble bottom-left)

Need help? Reply to this email or contact ${SUPPORT_EMAIL}.

— The MarketHub Pro team`,
    cta: { label: "Open dashboard", url: APP_URL },
  };
}

interface TrialEndingData {
  daysLeft: number;
  name?: string;
}
function tplTrialEnding(d: TrialEndingData): EmailContent {
  const subj = d.daysLeft <= 1
    ? "Your MarketHub Pro trial ends tomorrow"
    : `Your MarketHub Pro trial ends in ${d.daysLeft} days`;
  return {
    subject: subj,
    preheader: "Pick a plan to keep your analytics + automations running.",
    bodyHtml: `
      <h1 style="margin:0 0 12px;font-size:22px;font-weight:700;color:#292524;">${escape(subj)}</h1>
      <p style="margin:0 0 16px;">${d.name ? `Hi ${escape(d.name)},` : "Hello,"}</p>
      <p style="margin:0 0 16px;">Your trial ends in <strong>${d.daysLeft} day${d.daysLeft === 1 ? "" : "s"}</strong>. To keep your analytics, scheduled posts, and AI consultant working, pick a plan:</p>
      <ul style="padding-left:20px;margin:0 0 16px;">
        <li style="margin-bottom:6px;"><strong>Creator</strong> — $24/mo · for solo creators</li>
        <li style="margin-bottom:6px;"><strong>Pro</strong> — $49/mo · most popular, includes CRM + automations</li>
        <li style="margin-bottom:6px;"><strong>Studio</strong> — $99/mo · for small teams</li>
        <li style="margin-bottom:6px;"><strong>Agency</strong> — $249/mo · multi-client + white-label</li>
      </ul>
      <p style="margin:0;color:#78614E;font-size:13px;">If you don&rsquo;t pick one before the trial ends, your account drops to the free tier — your data stays, but auto-publishing and AI features pause.</p>
    `,
    bodyText: `${subj}

Your trial ends in ${d.daysLeft} day${d.daysLeft === 1 ? "" : "s"}.

Pick a plan: ${APP_URL}/pricing
- Creator $24/mo
- Pro $49/mo (most popular)
- Studio $99/mo
- Agency $249/mo

If you don't pick before the trial ends, the account drops to the free tier — data stays but automations pause.

— The MarketHub Pro team`,
    cta: { label: "View plans", url: `${APP_URL}/pricing` },
  };
}

interface NotificationData {
  title: string;
  body: string; // plain text — will be wrapped in <p> per line
  cta?: { label: string; url: string };
}
function tplNotification(d: NotificationData): EmailContent {
  const paragraphs = d.body
    .split(/\n\n+/)
    .map((p) => `<p style="margin:0 0 16px;">${escape(p).replace(/\n/g, "<br/>")}</p>`)
    .join("");
  return {
    subject: d.title,
    preheader: d.body.slice(0, 100),
    bodyHtml: `
      <h1 style="margin:0 0 12px;font-size:22px;font-weight:700;color:#292524;">${escape(d.title)}</h1>
      ${paragraphs}
    `,
    bodyText: `${d.title}\n\n${d.body}\n\n— The MarketHub Pro team`,
    cta: d.cta,
  };
}

// ── Template registry ───────────────────────────────────────────────────────

export type TemplateName = "welcome" | "trial-ending" | "notification";

interface TemplateMap {
  welcome: WelcomeData;
  "trial-ending": TrialEndingData;
  notification: NotificationData;
}

function build<T extends TemplateName>(name: T, data: TemplateMap[T]): EmailContent {
  switch (name) {
    case "welcome":
      return tplWelcome(data as WelcomeData);
    case "trial-ending":
      return tplTrialEnding(data as TrialEndingData);
    case "notification":
      return tplNotification(data as NotificationData);
    default:
      throw new Error(`Unknown template: ${name}`);
  }
}

// ── Public API ──────────────────────────────────────────────────────────────

export async function sendBrandedEmail<T extends TemplateName>(
  to: string,
  template: T,
  data: TemplateMap[T],
  opts: { from?: string; replyTo?: string } = {},
): Promise<{ ok: boolean; id?: string; error?: string }> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) return { ok: false, error: "RESEND_API_KEY not set" };

  const content = build(template, data);
  const html = wrap(content, to);

  try {
    const resend = new Resend(apiKey);
    const r = await resend.emails.send({
      from: opts.from ?? FROM_DEFAULT,
      to: [to],
      subject: content.subject,
      html,
      text: content.bodyText,
      replyTo: opts.replyTo ?? SUPPORT_EMAIL,
    });
    if (r.error) return { ok: false, error: r.error.message };
    return { ok: true, id: r.data?.id };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "send failed" };
  }
}

// Render-only (returns HTML + text, no send) — useful for preview/testing.
export function previewEmail<T extends TemplateName>(template: T, data: TemplateMap[T], to = "preview@example.com"): {
  subject: string;
  html: string;
  text: string;
} {
  const content = build(template, data);
  return {
    subject: content.subject,
    html: wrap(content, to),
    text: content.bodyText,
  };
}
