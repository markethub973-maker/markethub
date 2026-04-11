/**
 * /api/reports/send — high-level report delivery endpoint.
 *
 * Wraps the per-channel send endpoints with one consistent interface.
 * The agency calls this from the Reports page; it figures out which
 * channel-specific endpoint to invoke based on `channel` field.
 *
 * POST {
 *   client_id?: string,
 *   recipient: string,         // phone number or telegram chat_id
 *   channel: 'whatsapp'|'telegram',
 *   subject?: string,          // brief title
 *   body?: string,             // message body (auto-formatted per channel)
 *   report_url?: string,       // link to PDF/HTML report
 *   report_type?: 'monthly'|'weekly'|'on_demand'|'custom'|'test',
 *   format?: 'pdf'|'link'|'summary_text'
 * }
 *
 * Auto-format:
 *   - WhatsApp: plain text with optional URL preview
 *   - Telegram: HTML formatting (bold subject + body + clickable link)
 *
 * Auth: requireAuth.
 */
import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/route-helpers";

export const dynamic = "force-dynamic";

interface ReportSendBody {
  client_id?: string;
  recipient: string;
  channel: "whatsapp" | "telegram";
  subject?: string;
  body?: string;
  report_url?: string;
  report_type?: "monthly" | "weekly" | "on_demand" | "custom" | "test";
  format?: "pdf" | "link" | "summary_text";
}

function buildWhatsAppMessage(b: ReportSendBody): string {
  const parts: string[] = [];
  if (b.subject) parts.push(`📊 ${b.subject}`);
  if (b.body) parts.push(b.body);
  if (b.report_url) parts.push(`🔗 ${b.report_url}`);
  parts.push("");
  parts.push("— MarketHub Pro");
  return parts.join("\n\n");
}

function buildTelegramHTMLMessage(b: ReportSendBody): string {
  const parts: string[] = [];
  if (b.subject) parts.push(`<b>📊 ${escapeHtml(b.subject)}</b>`);
  if (b.body) parts.push(escapeHtml(b.body));
  if (b.report_url) parts.push(`🔗 <a href="${escapeHtml(b.report_url)}">Vezi raportul complet</a>`);
  parts.push("");
  parts.push("<i>— MarketHub Pro</i>");
  return parts.join("\n\n");
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

export async function POST(req: NextRequest) {
  const auth = await requireAuth();
  if (!auth.ok) return auth.response;

  const body = (await req.json().catch(() => null)) as ReportSendBody | null;
  if (!body?.recipient || !body.channel) {
    return NextResponse.json({ error: "recipient and channel required" }, { status: 400 });
  }
  if (!body.subject && !body.body && !body.report_url) {
    return NextResponse.json({ error: "At least one of subject/body/report_url required" }, { status: 400 });
  }

  // Forward auth via the same Supabase cookie — these are internal hops on
  // the same domain, fetch will reuse the cookie automatically.
  const cookie = req.headers.get("cookie") ?? "";
  const baseUrl = new URL(req.url).origin;

  let target: string;
  let payload: Record<string, unknown>;

  if (body.channel === "whatsapp") {
    target = `${baseUrl}/api/channels/whatsapp/send`;
    payload = {
      to: body.recipient,
      message: buildWhatsAppMessage(body),
      report_type: body.report_type,
      format: body.format ?? "summary_text",
      report_url: body.report_url,
      client_id: body.client_id,
    };
  } else if (body.channel === "telegram") {
    target = `${baseUrl}/api/channels/telegram/send`;
    payload = {
      chat_id: body.recipient,
      message: buildTelegramHTMLMessage(body),
      parse_mode: "HTML",
      report_type: body.report_type,
      format: body.format ?? "summary_text",
      report_url: body.report_url,
      client_id: body.client_id,
    };
  } else {
    return NextResponse.json({ error: `Unsupported channel: ${body.channel}` }, { status: 400 });
  }

  try {
    const res = await fetch(target, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Cookie: cookie,
      },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : String(e) },
      { status: 500 },
    );
  }
}
