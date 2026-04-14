/**
 * POST /api/brain/outreach-batch — Alex's autonomous outreach engine.
 *
 * Input: list of domains. For each, the endpoint:
 *   1. Fetches the home + /contact page to extract a business email,
 *      industry clues, and social links.
 *   2. Asks Claude to generate a short personalized cold outreach in the
 *      right language (RO for .ro with Romanian content, EN otherwise).
 *   3. Sends the email via Resend (from Alex <alex@markethubpromo.com>).
 *   4. Logs the attempt so follow-up cron can pick up later.
 *
 * Auth: either admin session OR x-brain-cron-secret header (so Alex's
 * scheduled workflow can call it from n8n too).
 */

import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { generateJsonReviewed } from "@/lib/llm";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

const HAIKU = "claude-haiku-4-5-20251001";

interface LeadInput {
  domain: string;
  note?: string;
}

interface EnrichedLead {
  domain: string;
  url: string;
  email: string | null;
  phone: string | null;
  snippet: string;
  language: "ro" | "en";
}

// ── utility: pick language based on TLD / text
function detectLang(domain: string, html: string): "ro" | "en" {
  const isRoDomain = domain.endsWith(".ro");
  const hasRoWords = /\b(contact|despre|servicii|produse|echipa|clien[țt]i|adresa|telefon|email)\b/i.test(html);
  return isRoDomain && hasRoWords ? "ro" : "en";
}

function extractEmail(html: string): string | null {
  // Prefer office@/contact@/info@/hello@ over anything random
  const all = Array.from(html.matchAll(/[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g))
    .map((m) => m[0].toLowerCase())
    .filter((e) => !e.includes("sentry") && !e.includes("example") && !e.includes("yourdomain"));
  if (!all.length) return null;
  const preferred = all.find((e) => /^(office|contact|info|hello|sales|hi)@/.test(e));
  return preferred ?? all[0];
}

function extractPhone(html: string): string | null {
  const m = html.match(/(?:\+?4?0|00?4?0)?\s?[-.]?\(?0?\d{2,3}\)?[-.\s]?\d{3}[-.\s]?\d{3,4}/);
  return m ? m[0].replace(/\s+/g, " ").trim() : null;
}

function extractSnippet(html: string): string {
  // Strip scripts/styles, then tags, collapse whitespace, take 2000 chars of prose.
  const stripped = html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<!--[\s\S]*?-->/g, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&[a-z]+;/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
  return stripped.slice(0, 2000);
}

async function enrichLead(domain: string): Promise<EnrichedLead | null> {
  const url = domain.startsWith("http") ? domain : `https://${domain}`;
  try {
    const res = await fetch(url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (MarketHubPro/1.0; outreach-research; alex@markethubpromo.com)",
        Accept: "text/html,application/xhtml+xml",
      },
      redirect: "follow",
      signal: AbortSignal.timeout(10000),
    });
    if (!res.ok) return null;
    const html = await res.text();
    return {
      domain,
      url,
      email: extractEmail(html),
      phone: extractPhone(html),
      snippet: extractSnippet(html),
      language: detectLang(domain, html),
    };
  } catch {
    return null;
  }
}

async function composeMessage(
  _anthropic: Anthropic,
  lead: EnrichedLead,
): Promise<{ subject: string; body: string } | null> {
  void _anthropic; // kept for ABI-compat with callers, generateJson handles fallback.
  const ro = lead.language === "ro";
  const system = `You are Alex, founder of MarketHub Pro. You write short, honest, specific cold outreach emails offering a done-for-you AI marketing accelerator.
- Romania pricing: €499 (regular €999). Link: https://get.markethubpromo.com/ro
- International pricing: €1000 (regular €1999). Link: https://get.markethubpromo.com/intl
- Offer: 60 platform-optimized captions + 20 AI images + 30-day calendar + 20-50 qualified leads + 1h strategy call. Delivered in 5-7 days.

Rules:
- Write in ${ro ? "Romanian" : "English"}.
- Start with ONE specific observation about their business (use the snippet to ground it). Avoid generic "I noticed your great work".
- One clear value proposition sentence.
- One clear ask: would they want a free 5-caption + 3-image demo?
- Max 110 words body, 60 char subject.
- Sign "— Alex / Founder, MarketHub Pro / alex@markethubpromo.com".
- Include the correct regional link based on domain.
- No emojis, no buzzwords. Professional but warmly human — write like a founder on a Tuesday morning, not a marketing agency template. Avoid academic prose, avoid slang.

OUTPUT STRICT JSON: {"subject":"...","body":"..."}`;

  const { reviewed } = await generateJsonReviewed<{ subject?: string; body?: string } & Record<string, unknown>>(
    system,
    `Target business:\nDomain: ${lead.domain}\nLanguage: ${lead.language}\nSite excerpt (first 2k chars of homepage):\n${lead.snippet}`,
    lead.language,
    { maxTokens: 600 },
  );
  if (!reviewed || !reviewed.subject || !reviewed.body) return null;
  return { subject: String(reviewed.subject).slice(0, 120), body: String(reviewed.body) };
}

async function sendEmail(to: string, subject: string, bodyText: string): Promise<boolean> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) return false;
  // Convert plain body to light HTML (preserving line breaks) so Gmail
  // renders cleanly but the raw text is still readable.
  const html = `<div style="font-family:system-ui,sans-serif;color:#222;line-height:1.55;white-space:pre-wrap;">${bodyText
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")}</div>`;
  try {
    const r = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from: "Alex <alex@markethubpromo.com>",
        to: [to],
        bcc: ["office@markethubpromo.com"],
        subject,
        text: bodyText,
        html,
        reply_to: "alex@markethubpromo.com",
      }),
    });
    return r.ok;
  } catch {
    return false;
  }
}

async function authOk(req: NextRequest): Promise<boolean> {
  const cronSecret = req.headers.get("x-brain-cron-secret");
  if (cronSecret && process.env.BRAIN_CRON_SECRET && cronSecret === process.env.BRAIN_CRON_SECRET) {
    return true;
  }
  // Brain Command Center cookie (set by /api/brain-admin/login)
  const brainCookie = req.cookies.get("brain_admin")?.value;
  if (brainCookie === "1") return true;
  // Admin session fallback
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

export async function POST(req: NextRequest) {
  if (!(await authOk(req))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await req.json().catch(() => ({}))) as {
    leads?: LeadInput[];
    dry_run?: boolean;
  };
  const leads = (body.leads ?? []).slice(0, 25); // cap per batch
  if (!leads.length) {
    return NextResponse.json({ error: "No leads provided" }, { status: 400 });
  }

  const apiKey = process.env.ANTHROPIC_API_KEY ?? process.env.ANTHROPIC_API_KEY_APP;
  if (!apiKey) return NextResponse.json({ error: "AI not configured" }, { status: 500 });
  const anthropic = new Anthropic({ apiKey });

  const results: Array<Record<string, unknown>> = [];

  for (const lead of leads) {
    const enriched = await enrichLead(lead.domain);
    if (!enriched || !enriched.email) {
      results.push({ domain: lead.domain, status: "no_email" });
      continue;
    }
    const msg = await composeMessage(anthropic, enriched);
    if (!msg) {
      results.push({ domain: lead.domain, status: "compose_failed", email: enriched.email });
      continue;
    }
    if (body.dry_run) {
      results.push({
        domain: lead.domain,
        status: "dry_run",
        email: enriched.email,
        language: enriched.language,
        subject: msg.subject,
        body: msg.body,
      });
      continue;
    }
    const sent = await sendEmail(enriched.email, msg.subject, msg.body);
    results.push({
      domain: lead.domain,
      status: sent ? "sent" : "send_failed",
      email: enriched.email,
      language: enriched.language,
      subject: msg.subject,
    });

    // Log to outreach_log table (best-effort — table may not exist yet).
    try {
      const svc = createServiceClient();
      await svc.from("outreach_log").insert({
        domain: lead.domain,
        email: enriched.email,
        language: enriched.language,
        subject: msg.subject,
        body: msg.body,
        status: sent ? "sent" : "send_failed",
      });
    } catch {
      /* table missing — not fatal */
    }
  }

  return NextResponse.json({
    ok: true,
    count: results.length,
    sent: results.filter((r) => r.status === "sent").length,
    results,
  });
}
