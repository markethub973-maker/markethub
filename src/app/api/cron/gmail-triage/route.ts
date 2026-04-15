/**
 * GET /api/cron/gmail-triage — polls Gmail for platform alerts, classifies,
 * logs to ops_incidents, pings Telegram for critical ones.
 *
 * Runs every 5 minutes via n8n. Auth: x-brain-cron-secret.
 */

import { NextRequest, NextResponse } from "next/server";
import { listMessages, getMessage, headerOf, extractBody, markAsRead } from "@/lib/gmail";
import { createServiceClient } from "@/lib/supabase/service";

export const dynamic = "force-dynamic";
export const maxDuration = 120;

const OPERATOR_EMAIL = "markethub973@gmail.com";

interface Classification {
  source: string;
  severity: "critical" | "warning" | "info";
  ignore?: boolean;
}

function classify(from: string, subject: string): Classification {
  const f = from.toLowerCase();
  const s = subject.toLowerCase();
  // Sentry
  if (f.includes("sentry.io")) {
    if (s.includes("new issue") || s.includes("regression") || s.includes("spike")) return { source: "sentry", severity: "critical" };
    return { source: "sentry", severity: "warning" };
  }
  // Vercel
  if (f.includes("vercel.com") || f.includes("noreply@vercel")) {
    if (s.includes("failed") || s.includes("error") || s.includes("down")) return { source: "vercel", severity: "critical" };
    if (s.includes("deployed") || s.includes("succeeded")) return { source: "vercel", severity: "info", ignore: true };
    return { source: "vercel", severity: "warning" };
  }
  // Stripe
  if (f.includes("stripe.com")) {
    if (s.includes("dispute") || s.includes("chargeback") || s.includes("failed payment") || s.includes("fraud")) return { source: "stripe", severity: "critical" };
    if (s.includes("payment") || s.includes("receipt")) return { source: "stripe", severity: "info" };
    return { source: "stripe", severity: "warning" };
  }
  // Supabase
  if (f.includes("supabase.io") || f.includes("supabase.com")) {
    if (s.includes("outage") || s.includes("downtime") || s.includes("quota exceeded")) return { source: "supabase", severity: "critical" };
    return { source: "supabase", severity: "warning" };
  }
  // Cloudflare
  if (f.includes("cloudflare.com")) {
    if (s.includes("downtime") || s.includes("expir")) return { source: "cloudflare", severity: "critical" };
    return { source: "cloudflare", severity: "warning" };
  }
  // Resend
  if (f.includes("resend.com") || f.includes("resend.dev")) {
    if (s.includes("bounce") || s.includes("complaint") || s.includes("blocked")) return { source: "resend", severity: "warning" };
    return { source: "resend", severity: "info" };
  }
  // GitHub
  if (f.includes("github.com") || f.includes("noreply@github")) {
    if (s.includes("security") || s.includes("vulnerability") || s.includes("secret")) return { source: "github", severity: "critical" };
    return { source: "github", severity: "info", ignore: true };
  }
  // Apify
  if (f.includes("apify.com")) {
    if (s.includes("low credit") || s.includes("failed")) return { source: "apify", severity: "warning" };
    return { source: "apify", severity: "info" };
  }
  // Our own brain health alert
  if (s.includes("brain health check") || s.includes("🧠 brain")) {
    return { source: "internal", severity: "critical" };
  }
  return { source: "other", severity: "info", ignore: true };
}

async function notifyTelegram(text: string): Promise<void> {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_ALLOWED_CHAT_ID;
  if (!token || !chatId) return;
  try {
    await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id: chatId, text, parse_mode: "Markdown" }),
    });
  } catch { /* no-op */ }
}

export async function GET(req: NextRequest) {
  if (req.headers.get("x-brain-cron-secret") !== process.env.BRAIN_CRON_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Pull unread messages from the last 2 hours
  const list = await listMessages(OPERATOR_EMAIL, "is:unread newer_than:2h", 30);
  if (!list.length) return NextResponse.json({ ok: true, processed: 0 });

  const svc = createServiceClient();
  const stats = { processed: 0, logged: 0, critical: 0, warning: 0, ignored: 0 };

  for (const { id } of list) {
    stats.processed++;
    // Skip if already logged
    const { data: existing } = await svc
      .from("ops_incidents")
      .select("id")
      .eq("gmail_message_id", id)
      .maybeSingle();
    if (existing) continue;

    const msg = await getMessage(OPERATOR_EMAIL, id);
    if (!msg) continue;
    const from = headerOf(msg, "From") ?? "";
    const subject = headerOf(msg, "Subject") ?? "";
    const body = extractBody(msg).slice(0, 500);
    const cls = classify(from, subject);

    if (cls.ignore) { stats.ignored++; continue; }

    await svc.from("ops_incidents").insert({
      source: cls.source,
      severity: cls.severity,
      subject: subject.slice(0, 300),
      body_excerpt: body,
      gmail_message_id: id,
      notified_at: cls.severity === "critical" ? new Date().toISOString() : null,
    });
    stats.logged++;
    if (cls.severity === "critical") {
      stats.critical++;
      await notifyTelegram(`🚨 *CRITICAL · ${cls.source.toUpperCase()}*\n\n*${subject}*\n\n${body.slice(0, 280)}`);
    } else if (cls.severity === "warning") {
      stats.warning++;
    }

    // Mark as read so we don't reprocess
    await markAsRead(OPERATOR_EMAIL, id);
  }

  return NextResponse.json({ ok: true, ...stats });
}
