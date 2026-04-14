/**
 * POST /api/webhooks/resend-inbound — marks outreach_log rows as REPLIED.
 *
 * Receives Resend's inbound-email webhook. When a prospect replies to
 * an Alex outreach, we:
 *   1. Extract the sender address + subject
 *   2. Match back to outreach_log by from-email
 *   3. Update replied_at so the follow-up cron stops chasing them and
 *      the pipeline dashboard shows the REPLIED badge.
 *   4. Forward the reply notification to office@ so operator sees it.
 *
 * Resend sends JSON with `type: "email.received"` or similar shape.
 * We verify the signature header when RESEND_WEBHOOK_SECRET is set.
 */

import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { createServiceClient } from "@/lib/supabase/service";

export const dynamic = "force-dynamic";

function verifySignature(payload: string, sigHeader: string | null, secret: string): boolean {
  if (!sigHeader) return false;
  const computed = crypto.createHmac("sha256", secret).update(payload).digest("hex");
  try {
    return crypto.timingSafeEqual(Buffer.from(sigHeader), Buffer.from(computed));
  } catch {
    return false;
  }
}

export async function POST(req: NextRequest) {
  const raw = await req.text();
  const secret = process.env.RESEND_WEBHOOK_SECRET;
  if (secret) {
    const ok = verifySignature(raw, req.headers.get("resend-signature"), secret);
    if (!ok) return NextResponse.json({ error: "Bad signature" }, { status: 401 });
  }

  let body: Record<string, unknown>;
  try {
    body = JSON.parse(raw);
  } catch {
    return NextResponse.json({ error: "Bad JSON" }, { status: 400 });
  }

  // Resend shape varies — try common shapes.
  const data = (body.data ?? body) as Record<string, unknown>;
  const from =
    (data.from as string | undefined) ||
    ((data.envelope as Record<string, unknown>)?.from as string | undefined) ||
    "";
  const subject = (data.subject as string | undefined) || "";
  const cleanFrom = from.replace(/^.*<(.+)>.*$/, "$1").toLowerCase().trim();

  if (!cleanFrom) {
    return NextResponse.json({ ok: true, matched: 0, note: "no from address" });
  }

  const svc = createServiceClient();
  // Match by email (most recent outreach to this address that hasn't replied yet)
  const { data: rows, error } = await svc
    .from("outreach_log")
    .select("id,domain,email,subject")
    .eq("email", cleanFrom)
    .is("replied_at", null)
    .order("created_at", { ascending: false })
    .limit(1);

  if (error || !rows || !rows.length) {
    // Still forward the reply to operator inbox
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
          text: raw.slice(0, 5000),
        }),
      });
    }
    return NextResponse.json({ ok: true, matched: 0 });
  }

  const row = rows[0];
  await svc
    .from("outreach_log")
    .update({ replied_at: new Date().toISOString() })
    .eq("id", row.id);

  // Operator alert
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
        subject: `✨ Reply from ${row.domain} — open pipeline`,
        html: `<p><b>${cleanFrom}</b> replied to your outreach.</p>
          <p>Original subject: <i>${row.subject ?? "—"}</i></p>
          <p>Reply subject: <b>${subject}</b></p>
          <p><a href="https://brain.markethubpromo.com/pipeline">Open pipeline →</a></p>
          <p><a href="https://brain.markethubpromo.com/demo">Generate demo for ${row.domain} →</a></p>`,
      }),
    });
  }

  return NextResponse.json({ ok: true, matched: 1, id: row.id });
}
