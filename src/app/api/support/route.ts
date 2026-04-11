import { NextRequest, NextResponse } from "next/server";
import { Resend } from "resend";
import { createClient } from "@/lib/supabase/server";
import { logAudit, getIpFromHeaders } from "@/lib/auditLog";

// Rate limit: 5 submissions per hour per IP to prevent spam.
const ipSubmissions = new Map<string, number[]>();
const RATE_LIMIT = 5;
const WINDOW_MS = 60 * 60 * 1000; // 1 hour

function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const history = (ipSubmissions.get(ip) ?? []).filter((t) => now - t < WINDOW_MS);
  if (history.length >= RATE_LIMIT) return false;
  history.push(now);
  ipSubmissions.set(ip, history);
  return true;
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const { subject, message, email, category } = body as {
    subject?: string;
    message?: string;
    email?: string;
    category?: string;
  };

  if (!message || message.trim().length < 10) {
    return NextResponse.json(
      { error: "Message must be at least 10 characters" },
      { status: 400 },
    );
  }
  if (message.length > 5000) {
    return NextResponse.json({ error: "Message too long (max 5000 chars)" }, { status: 400 });
  }

  const ip = req.headers.get("x-forwarded-for")?.split(",")[0].trim() ?? "unknown";
  if (!checkRateLimit(ip)) {
    return NextResponse.json({ error: "Too many submissions. Try again in an hour." }, { status: 429 });
  }

  // Optional logged-in user context — anonymous submissions are allowed too.
  let userEmail = email ?? "";
  let userId: string | undefined;
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      userEmail = userEmail || user.email || "";
      userId = user.id;
    }
  } catch { /* anonymous flow */ }

  const resendKey = process.env.RESEND_API_KEY;
  if (!resendKey) {
    return NextResponse.json({ error: "Support email not configured" }, { status: 500 });
  }
  const resend = new Resend(resendKey);

  const subjectLine = `[${category ?? "General"}] ${subject?.slice(0, 80) ?? "Support request"}`;

  try {
    await resend.emails.send({
      from: "MarketHub Pro Support <noreply@markethubpromo.com>",
      to: "markethub973@gmail.com",
      replyTo: userEmail || undefined,
      subject: subjectLine,
      html: `
<div style="font-family:system-ui,-apple-system,sans-serif;max-width:600px;margin:0 auto;padding:24px;background:#FFFCF7;color:#292524">
  <h2 style="margin:0 0 12px;color:#D97706">📨 New Support Request</h2>
  <table style="width:100%;border-collapse:collapse;font-size:13px;color:#78614E">
    <tr><td style="padding:6px 0;width:100px"><b>Category</b></td><td>${category ?? "General"}</td></tr>
    <tr><td style="padding:6px 0"><b>From</b></td><td>${userEmail || "(anonymous)"}${userId ? ` <code style="color:#A8967E">(${userId})</code>` : ""}</td></tr>
    <tr><td style="padding:6px 0"><b>IP</b></td><td>${ip}</td></tr>
    <tr><td style="padding:6px 0"><b>Time</b></td><td>${new Date().toISOString()}</td></tr>
  </table>
  <div style="margin-top:16px;padding:14px;background:#FFF8ED;border-left:3px solid #F59E0B;border-radius:0 8px 8px 0">
    <p style="margin:0 0 4px;color:#A8967E;font-size:11px;text-transform:uppercase;font-weight:600">Message</p>
    <pre style="margin:0;color:#292524;font-size:13px;font-family:inherit;white-space:pre-wrap">${message.replace(/[<>&]/g, (c) => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;" }[c]!))}</pre>
  </div>
</div>`.trim(),
    });

    await logAudit({
      action: "support_request",
      actor_id: userId ?? "anonymous",
      details: { category, subject: subject?.slice(0, 100) },
      ip: getIpFromHeaders(req.headers),
    });

    return NextResponse.json({ ok: true, message: "Thanks — we'll get back to you within 24h." });
  } catch (err) {
    console.error("[support] Resend send failed:", err);
    return NextResponse.json({ error: "Failed to send support email" }, { status: 500 });
  }
}
