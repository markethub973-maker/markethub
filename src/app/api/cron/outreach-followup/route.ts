/**
 * GET /api/cron/outreach-followup — scheduled follow-up sender.
 *
 * Runs via n8n daily. For each `outreach_log` row:
 *   - If sent ≥ 3 days ago AND no follow-up #1 AND no reply → send FU #1
 *   - If FU #1 sent ≥ 4 days ago AND no follow-up #2 AND no reply → send FU #2
 *   - Stop after #2.
 *
 * Auth: x-brain-cron-secret header. Idempotent — updates timestamp
 * before sending so a retried cron doesn't double-send.
 */

import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { createServiceClient } from "@/lib/supabase/service";
import { OUTPUT_SAFETY_RULES } from "@/lib/anthropic-client";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

// 🛑 KILL SWITCH — follow-ups DEZACTIVAT până platforma e funcțională
export async function GET() {
  return NextResponse.json({
    paused: true,
    reason: "Follow-ups paused — platform publishing not yet functional",
  });
}
// Original handler disabled:

const HAIKU = "claude-haiku-4-5-20251001";

interface LogRow {
  id: number;
  created_at: string;
  domain: string;
  email: string;
  language: string | null;
  subject: string | null;
  body: string | null;
  status: string;
  replied_at: string | null;
  follow_up_1_sent_at: string | null;
  follow_up_2_sent_at: string | null;
}

async function composeFollowUp(
  anthropic: Anthropic,
  row: LogRow,
  round: 1 | 2,
): Promise<{ subject: string; body: string } | null> {
  const ro = row.language === "ro";
  const system = `You are Alex, founder of MarketHub Pro, writing a SHORT follow-up (${round === 1 ? "3 days" : "7 days"}) to a prospect who did not reply to your initial outreach.

Rules:
- Write in ${ro ? "Romanian" : "English"}.
- Max 60 words body. Gentle, not pushy.
- Reference the initial ask implicitly (do NOT repeat the whole pitch).
- Round ${round === 1 ? "1: nudge + ask if timing is bad + restate the free demo offer" : "2: break-up message — 'sounds like timing isn't right, no problem, good luck with X, reach out anytime'"}.
- Subject MUST reuse the subject tree (Re: or similar) — keep it short.
- Sign "— Alex".
- No emojis, no buzzwords. Warm and human — write like one founder following up with another, not a CRM template. Avoid academic prose, avoid slang.

OUTPUT STRICT JSON: {"subject":"...","body":"..."}` + OUTPUT_SAFETY_RULES;

  try {
    const r = await anthropic.messages.create({
      model: HAIKU,
      max_tokens: 350,
      system,
      messages: [
        {
          role: "user",
          content: `Original subject: ${row.subject ?? ""}
Original body:
${row.body ?? ""}

Target domain: ${row.domain}
Days since original: ${round === 1 ? 3 : 7}`,
        },
      ],
    });
    const text = r.content
      .filter((b) => b.type === "text")
      .map((b) => (b as { text: string }).text)
      .join("");
    const m = text.match(/\{[\s\S]*\}/);
    if (!m) return null;
    const parsed = JSON.parse(m[0]) as { subject?: string; body?: string };
    if (!parsed.subject || !parsed.body) return null;
    return { subject: parsed.subject.slice(0, 120), body: parsed.body };
  } catch {
    return null;
  }
}

async function sendEmail(to: string, subject: string, body: string): Promise<boolean> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) return false;
  const html = `<div style="font-family:system-ui,sans-serif;color:#222;line-height:1.55;white-space:pre-wrap;">${body
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
        text: body,
        html,
        reply_to: "alex@markethubpromo.com",
      }),
    });
    return r.ok;
  } catch {
    return false;
  }
}

async function _ORIGINAL_GET(req: NextRequest) {
  const secret = req.headers.get("x-brain-cron-secret");
  if (!secret || secret !== process.env.BRAIN_CRON_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const apiKey = process.env.ANTHROPIC_API_KEY ?? process.env.ANTHROPIC_API_KEY_APP;
  if (!apiKey) return NextResponse.json({ error: "AI not configured" }, { status: 500 });
  const anthropic = new Anthropic({ apiKey });

  const svc = createServiceClient();
  const now = Date.now();
  const day = 24 * 60 * 60 * 1000;

  // Candidates for follow-up #1 — sent 3-4 days ago, no reply, no FU yet
  const { data: fu1Rows } = await svc
    .from("outreach_log")
    .select("*")
    .eq("status", "sent")
    .is("replied_at", null)
    .is("follow_up_1_sent_at", null)
    .lte("created_at", new Date(now - 3 * day).toISOString())
    .gte("created_at", new Date(now - 5 * day).toISOString())
    .limit(50);

  // Candidates for follow-up #2 — FU1 sent 4+ days ago, still no reply
  const { data: fu2Rows } = await svc
    .from("outreach_log")
    .select("*")
    .eq("status", "sent")
    .is("replied_at", null)
    .is("follow_up_2_sent_at", null)
    .not("follow_up_1_sent_at", "is", null)
    .lte("follow_up_1_sent_at", new Date(now - 4 * day).toISOString())
    .limit(50);

  const processed = { fu1: 0, fu2: 0, fu1_failed: 0, fu2_failed: 0 };

  for (const row of (fu1Rows ?? []) as LogRow[]) {
    // Mark first to avoid double-send on retry.
    const { error: claimErr } = await svc
      .from("outreach_log")
      .update({ follow_up_1_sent_at: new Date().toISOString() })
      .eq("id", row.id)
      .is("follow_up_1_sent_at", null);
    if (claimErr) continue;
    const msg = await composeFollowUp(anthropic, row, 1);
    if (!msg) { processed.fu1_failed++; continue; }
    const ok = await sendEmail(row.email, msg.subject, msg.body);
    ok ? processed.fu1++ : processed.fu1_failed++;
  }

  for (const row of (fu2Rows ?? []) as LogRow[]) {
    const { error: claimErr } = await svc
      .from("outreach_log")
      .update({ follow_up_2_sent_at: new Date().toISOString() })
      .eq("id", row.id)
      .is("follow_up_2_sent_at", null);
    if (claimErr) continue;
    const msg = await composeFollowUp(anthropic, row, 2);
    if (!msg) { processed.fu2_failed++; continue; }
    const ok = await sendEmail(row.email, msg.subject, msg.body);
    ok ? processed.fu2++ : processed.fu2_failed++;
  }

  return NextResponse.json({ ok: true, ...processed });
}
