/**
 * GET /api/brain/debug-inbox — TEMPORARY debug endpoint.
 * Shows what the Gmail inbox scanner sees. DELETE AFTER TESTING.
 */
import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import { listMessages, getMessage, headerOf, extractBody } from "@/lib/gmail";

export const dynamic = "force-dynamic";

const GMAIL_ACCOUNT = "markethub973@gmail.com";

export async function GET(req: NextRequest) {
  // Quick auth check
  const secret = req.headers.get("x-debug");
  if (secret !== "test123") {
    return NextResponse.json({ error: "no" }, { status: 401 });
  }

  const svc = createServiceClient();

  // Step 1: Check outreach_log
  const { data: outreachRows, error: oErr } = await svc
    .from("outreach_log")
    .select("domain, email, subject, language, status")
    .in("status", ["sent", "replied"])
    .order("created_at", { ascending: false })
    .limit(20);

  // Step 2: Check Gmail
  let gmailMessages: Array<{ id: string; threadId: string }> = [];
  let gmailError = "";
  try {
    gmailMessages = await listMessages(GMAIL_ACCOUNT, "is:unread newer_than:6h", 10);
  } catch (e) {
    gmailError = String(e);
  }

  // Step 3: Read first 5 messages details
  const details = [];
  for (const m of gmailMessages.slice(0, 5)) {
    const msg = await getMessage(GMAIL_ACCOUNT, m.id);
    if (!msg) {
      details.push({ id: m.id, error: "could not fetch" });
      continue;
    }
    details.push({
      id: m.id,
      from: headerOf(msg, "From"),
      subject: headerOf(msg, "Subject"),
      body_preview: extractBody(msg).slice(0, 200),
      labels: msg.labelIds,
    });
  }

  return NextResponse.json({
    outreach_domains: (outreachRows || []).map((r) => ({
      domain: r.domain,
      email: r.email,
      subject: r.subject,
      status: r.status,
    })),
    outreach_error: oErr?.message,
    gmail_count: gmailMessages.length,
    gmail_error: gmailError || null,
    gmail_messages: details,
  });
}
