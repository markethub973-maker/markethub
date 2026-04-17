/**
 * POST /api/webhooks/resend-inbound — processes prospect replies.
 *
 * When a prospect replies to an Alex outreach email:
 *   1. Verify Resend signature
 *   2. Extract sender + message body
 *   3. Match to outreach_log → mark replied_at
 *   4. Trigger Alex auto-reply via /api/brain/outreach-reply
 *   5. Alex handles the conversation autonomously
 *   6. Eduard gets Telegram only on demo_interest/pricing/demo_booked
 */

import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { createServiceClient } from "@/lib/supabase/service";

export const dynamic = "force-dynamic";

function verifySignature(
  payload: string,
  sigHeader: string | null,
  secret: string
): boolean {
  if (!sigHeader) return false;
  const computed = crypto
    .createHmac("sha256", secret)
    .update(payload)
    .digest("hex");
  try {
    return crypto.timingSafeEqual(
      Buffer.from(sigHeader),
      Buffer.from(computed)
    );
  } catch {
    return false;
  }
}

// Extract plain text body from Resend webhook payload
function extractBody(data: Record<string, unknown>): string {
  // Resend sends text in various shapes
  if (typeof data.text === "string" && data.text.trim()) return data.text.trim();
  if (typeof data.body === "string" && data.body.trim()) return data.body.trim();
  if (typeof data.html === "string") {
    // Strip HTML tags for a rough plaintext
    return data.html
      .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "")
      .replace(/<[^>]+>/g, " ")
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, 3000);
  }
  return "";
}

export async function POST(req: NextRequest) {
  const raw = await req.text();
  const secret = process.env.RESEND_WEBHOOK_SECRET;
  if (secret) {
    const ok = verifySignature(
      raw,
      req.headers.get("resend-signature"),
      secret
    );
    if (!ok)
      return NextResponse.json({ error: "Bad signature" }, { status: 401 });
  }

  let body: Record<string, unknown>;
  try {
    body = JSON.parse(raw);
  } catch {
    return NextResponse.json({ error: "Bad JSON" }, { status: 400 });
  }

  // Resend shape varies
  const data = (body.data ?? body) as Record<string, unknown>;
  const from =
    (data.from as string | undefined) ||
    ((data.envelope as Record<string, unknown>)?.from as string | undefined) ||
    "";
  const subject = (data.subject as string | undefined) || "";
  const messageBody = extractBody(data);
  const cleanFrom = from.replace(/^.*<(.+)>.*$/, "$1").toLowerCase().trim();

  if (!cleanFrom) {
    return NextResponse.json({ ok: true, matched: 0, note: "no from address" });
  }

  // Ignore our own emails (prevent reply loops)
  if (
    cleanFrom.endsWith("@markethubpromo.com") ||
    cleanFrom.endsWith("@resend.dev")
  ) {
    return NextResponse.json({ ok: true, matched: 0, note: "own email ignored" });
  }

  const svc = createServiceClient();

  // Match to outreach_log by email first, then by domain
  let matchedRow: { id: number; domain: string; email: string; subject: string | null; language: string | null } | null = null;

  const { data: emailRows } = await svc
    .from("outreach_log")
    .select("id,domain,email,subject,language")
    .eq("email", cleanFrom)
    .is("replied_at", null)
    .order("created_at", { ascending: false })
    .limit(1);

  if (emailRows && emailRows.length) {
    matchedRow = emailRows[0];
  } else {
    // Try matching by domain (prospect might reply from different address)
    const senderDomain = cleanFrom.split("@").pop() || "";
    const { data: domainRows } = await svc
      .from("outreach_log")
      .select("id,domain,email,subject,language")
      .eq("domain", senderDomain)
      .order("created_at", { ascending: false })
      .limit(1);

    if (domainRows && domainRows.length) {
      matchedRow = domainRows[0];
    }
  }

  if (!matchedRow) {
    // No match — forward to operator and return
    if (process.env.RESEND_API_KEY) {
      await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: "Alex <alex@markethubpromo.com>",
          to: ["markethub973@gmail.com"],
          subject: `📥 Reply from ${cleanFrom} (no pipeline match): ${subject}`,
          text: `From: ${cleanFrom}\nSubject: ${subject}\n\n${messageBody.slice(0, 3000)}`,
        }),
      });
    }
    return NextResponse.json({ ok: true, matched: 0 });
  }

  const row = matchedRow;

  // Mark as replied
  await svc
    .from("outreach_log")
    .update({ replied_at: new Date().toISOString(), status: "replied" })
    .eq("id", row.id);

  // Trigger Alex auto-reply (fire-and-forget with short timeout)
  const cronSecret = process.env.BRAIN_CRON_SECRET;
  if (cronSecret && messageBody) {
    const baseUrl =
      process.env.NEXT_PUBLIC_APP_URL || "https://markethubpromo.com";
    try {
      await fetch(`${baseUrl}/api/brain/outreach-reply`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-brain-cron-secret": cronSecret,
        },
        body: JSON.stringify({
          prospect_email: cleanFrom,
          prospect_domain: row.domain,
          prospect_name: row.domain,
          prospect_message: messageBody.slice(0, 3000),
          original_subject: row.subject || subject,
          language: row.language || "ro",
        }),
        signal: AbortSignal.timeout(25000),
      });
    } catch {
      // If auto-reply fails, still notify operator
      if (process.env.RESEND_API_KEY) {
        await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            from: "Alex <alex@markethubpromo.com>",
            to: ["markethub973@gmail.com"],
            subject: `⚠️ Auto-reply failed for ${row.domain} — manual reply needed`,
            text: `From: ${cleanFrom}\nSubject: ${subject}\n\n${messageBody.slice(0, 3000)}\n\n---\nAuto-reply failed. Please respond manually.`,
          }),
        });
      }
    }
  }

  return NextResponse.json({ ok: true, matched: 1, id: row.id, auto_reply: Boolean(cronSecret && messageBody) });
}
