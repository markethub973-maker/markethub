/**
 * GET /api/cron/outreach-inbox — Scan Gmail for prospect replies, trigger Alex auto-reply.
 *
 * Runs every 5 minutes via GHA cron.
 * 1. Reads unread emails from markethub973@gmail.com
 * 2. Matches sender to outreach_log domains
 * 3. For each match: triggers /api/brain/outreach-reply (Alex composes + sends)
 * 4. Marks email as read so it's not processed twice
 *
 * Auth: CRON_SECRET header
 */

import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import { listMessages, getMessage, headerOf, extractBody, markAsRead } from "@/lib/gmail";

export const dynamic = "force-dynamic";
export const maxDuration = 55;

const GMAIL_ACCOUNT = "markethub973@gmail.com";

function authOk(req: NextRequest): boolean {
  const h = req.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;
  if (!h || !cronSecret) return false;
  return h === `Bearer ${cronSecret}`;
}

export async function GET(req: NextRequest) {
  if (!authOk(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const svc = createServiceClient();

  // Get all outreach domains we've emailed
  const { data: outreachRows } = await svc
    .from("outreach_log")
    .select("domain, email, subject, language")
    .in("status", ["sent", "replied"])
    .order("created_at", { ascending: false })
    .limit(200);

  if (!outreachRows || !outreachRows.length) {
    return NextResponse.json({ ok: true, scanned: 0, note: "no outreach history" });
  }

  // Build lookup maps
  const domainSet = new Set(outreachRows.map((r) => r.domain));
  const emailToDomain = new Map<string, string>();
  const domainToLang = new Map<string, string>();
  for (const r of outreachRows) {
    emailToDomain.set(r.email.toLowerCase(), r.domain);
    domainToLang.set(r.domain, r.language || "ro");
  }

  // Get already-processed message IDs to avoid duplicates
  const { data: processed } = await svc
    .from("outreach_reply_log")
    .select("metadata")
    .not("metadata", "is", null)
    .order("created_at", { ascending: false })
    .limit(500);

  const processedIds = new Set<string>();
  if (processed) {
    for (const r of processed) {
      const meta = r.metadata as Record<string, unknown> | null;
      if (meta?.gmail_id) processedIds.add(meta.gmail_id as string);
    }
  }

  // Scan Gmail inbox — unread emails from the last 6 hours
  const messages = await listMessages(GMAIL_ACCOUNT, "is:unread newer_than:6h", 50);

  let matched = 0;
  let skipped = 0;
  const results: Array<{ from: string; domain: string; status: string }> = [];

  for (const m of messages) {
    if (processedIds.has(m.id)) {
      skipped++;
      continue;
    }

    const msg = await getMessage(GMAIL_ACCOUNT, m.id);
    if (!msg) continue;

    const from = headerOf(msg, "From") || "";
    const cleanFrom = from.replace(/^.*<(.+)>.*$/, "$1").toLowerCase().trim();
    const senderDomain = cleanFrom.split("@").pop() || "";

    // Skip our own emails
    if (
      senderDomain === "markethubpromo.com" ||
      senderDomain === "resend.dev" ||
      senderDomain === "gmail.com" // skip gmail notifications
    ) {
      continue;
    }

    // Match by email or domain
    const matchedDomain =
      emailToDomain.get(cleanFrom) ||
      (domainSet.has(senderDomain) ? senderDomain : null);

    if (!matchedDomain) continue;

    // Extract body
    const body = extractBody(msg);
    if (!body.trim()) continue;

    const subject = headerOf(msg, "Subject") || "";
    const language = domainToLang.get(matchedDomain) || "ro";

    // Trigger Alex auto-reply
    const cronSecret = process.env.BRAIN_CRON_SECRET;
    if (cronSecret) {
      const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://markethubpromo.com";
      try {
        const replyRes = await fetch(`${baseUrl}/api/brain/outreach-reply`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-brain-cron-secret": cronSecret,
          },
          body: JSON.stringify({
            prospect_email: cleanFrom,
            prospect_domain: matchedDomain,
            prospect_name: matchedDomain,
            prospect_message: body.slice(0, 3000),
            original_subject: subject,
            language,
            gmail_message_id: m.id,
          }),
          signal: AbortSignal.timeout(25000),
        });

        const replyData = (await replyRes.json()) as Record<string, unknown>;
        results.push({
          from: cleanFrom,
          domain: matchedDomain,
          status: replyData.ok ? "auto_replied" : "reply_failed",
        });

        // Log gmail_id to prevent re-processing
        await svc.from("outreach_reply_log").insert({
          domain: matchedDomain,
          email: cleanFrom,
          direction: "inbound",
          message: body.slice(0, 3000),
          intent: (replyData.intent as string) || "unknown",
          metadata: { gmail_id: m.id, subject },
        });

        matched++;
      } catch {
        results.push({ from: cleanFrom, domain: matchedDomain, status: "error" });
      }
    }

    // Mark as read
    await markAsRead(GMAIL_ACCOUNT, m.id);
  }

  return NextResponse.json({
    ok: true,
    scanned: messages.length,
    matched,
    skipped,
    results,
  });
}
