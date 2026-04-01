import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { Resend } from "resend";

const FROM = "MarketHub Pro <noreply@markethubpromo.com>";

interface DigestResult {
  subject_line: string;
  headline: string;
  performance_badge: "excellent" | "strong" | "average" | "slow";
  top_3_wins: string[];
  key_metric: { label: string; value: string; context: string };
  content_spotlight: { title: string; why_it_worked: string };
  action_item: string;
  next_week_focus: string;
}

const BADGE_COLOR: Record<string, string> = {
  excellent: "#16A34A",
  strong: "#059669",
  average: "#D97706",
  slow: "#DC2626",
};
const BADGE_BG: Record<string, string> = {
  excellent: "#F0FFF4",
  strong: "#ECFDF5",
  average: "#FFFBEB",
  slow: "#FEF2F2",
};

function buildDigestHtml(digest: DigestResult, weekLabel: string, clientName?: string): string {
  const badge = digest.performance_badge ?? "average";
  const color = BADGE_COLOR[badge] ?? "#D97706";
  const bg = BADGE_BG[badge] ?? "#FFFBEB";
  const wins = (digest.top_3_wins ?? []).map(
    (w) => `<li style="color:#78614E;line-height:1.7;margin-bottom:4px;">✅ ${w}</li>`
  ).join("");

  return `
<div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;max-width:560px;margin:0 auto;background:#FFFCF7;border-radius:16px;overflow:hidden;border:1px solid rgba(245,215,160,0.4);">
  <!-- Header -->
  <div style="background:linear-gradient(135deg,#F59E0B,#D97706);padding:28px 32px;">
    <div style="display:flex;align-items:center;gap:10px;margin-bottom:8px;">
      <div style="width:36px;height:36px;border-radius:8px;background:rgba(255,255,255,0.2);display:flex;align-items:center;justify-content:center;">
        <span style="color:white;font-size:18px;font-weight:bold;">M</span>
      </div>
      <span style="color:rgba(255,255,255,0.85);font-size:12px;font-weight:600;letter-spacing:1px;text-transform:uppercase;">MarketHub Pro</span>
    </div>
    <h1 style="color:white;margin:0 0 4px;font-size:22px;font-weight:800;">${digest.headline ?? "Weekly Performance Summary"}</h1>
    <p style="color:rgba(255,255,255,0.8);margin:0;font-size:13px;">${weekLabel}${clientName ? ` · ${clientName}` : ""}</p>
  </div>

  <div style="padding:28px 32px;">
    <!-- Performance badge -->
    <div style="background:${bg};border:1px solid ${color}30;border-radius:10px;padding:12px 16px;margin-bottom:20px;display:inline-block;">
      <span style="color:${color};font-size:13px;font-weight:700;text-transform:uppercase;letter-spacing:0.5px;">${badge.toUpperCase()} WEEK</span>
    </div>

    <!-- Key metric -->
    ${digest.key_metric ? `
    <div style="background:#FFF8ED;border-left:3px solid #F59E0B;border-radius:0 8px 8px 0;padding:12px 16px;margin-bottom:20px;">
      <p style="margin:0 0 4px;color:#A8967E;font-size:11px;text-transform:uppercase;letter-spacing:0.5px;font-weight:600;">KEY METRIC</p>
      <p style="margin:0 0 2px;color:#292524;font-size:18px;font-weight:800;">${digest.key_metric.value}</p>
      <p style="margin:0 0 4px;color:#78614E;font-size:13px;font-weight:600;">${digest.key_metric.label}</p>
      <p style="margin:0;color:#A8967E;font-size:12px;">${digest.key_metric.context}</p>
    </div>
    ` : ""}

    <!-- Top wins -->
    ${wins ? `
    <h3 style="color:#292524;font-size:14px;font-weight:700;margin:0 0 10px;">🏆 Top Wins This Week</h3>
    <ul style="padding-left:0;list-style:none;margin:0 0 20px;">${wins}</ul>
    ` : ""}

    <!-- Content spotlight -->
    ${digest.content_spotlight ? `
    <div style="background:#FFFCF7;border:1px solid rgba(245,215,160,0.4);border-radius:10px;padding:14px 16px;margin-bottom:20px;">
      <p style="margin:0 0 6px;color:#A8967E;font-size:11px;text-transform:uppercase;font-weight:600;letter-spacing:0.5px;">✨ CONTENT SPOTLIGHT</p>
      <p style="margin:0 0 4px;color:#292524;font-size:14px;font-weight:700;">${digest.content_spotlight.title}</p>
      <p style="margin:0;color:#78614E;font-size:13px;line-height:1.6;">${digest.content_spotlight.why_it_worked}</p>
    </div>
    ` : ""}

    <!-- Action + Focus -->
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:24px;">
      ${digest.action_item ? `
      <div style="background:#FFF0D6;border-radius:8px;padding:12px;">
        <p style="margin:0 0 4px;color:#D97706;font-size:11px;font-weight:700;text-transform:uppercase;">This Week's Action</p>
        <p style="margin:0;color:#78614E;font-size:12px;line-height:1.5;">${digest.action_item}</p>
      </div>
      ` : ""}
      ${digest.next_week_focus ? `
      <div style="background:#F0F9FF;border-radius:8px;padding:12px;">
        <p style="margin:0 0 4px;color:#0284C7;font-size:11px;font-weight:700;text-transform:uppercase;">Next Week Focus</p>
        <p style="margin:0;color:#78614E;font-size:12px;line-height:1.5;">${digest.next_week_focus}</p>
      </div>
      ` : ""}
    </div>

    <!-- CTA -->
    <div style="text-align:center;margin-bottom:24px;">
      <a href="https://markethubpromo.com" style="display:inline-block;background:#F59E0B;color:#1C1814;font-weight:700;padding:12px 28px;border-radius:8px;text-decoration:none;font-size:14px;">
        View Full Dashboard →
      </a>
    </div>
  </div>

  <!-- Footer -->
  <div style="padding:16px 32px;border-top:1px solid rgba(245,215,160,0.3);text-align:center;">
    <p style="color:#C4AA8A;font-size:11px;margin:0;">
      © 2026 MarketHub Pro ·
      <a href="https://markethubpromo.com/privacy" style="color:#F59E0B;text-decoration:none;">Privacy</a> ·
      <a href="https://markethubpromo.com/unsubscribe" style="color:#F59E0B;text-decoration:none;">Unsubscribe</a>
    </p>
  </div>
</div>`.trim();
}

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) return NextResponse.json({ error: "Email not configured" }, { status: 500 });

  const body = await req.json();
  const { recipients, digest, weekLabel, clientName } = body as {
    recipients: string[];
    digest: DigestResult;
    weekLabel: string;
    clientName?: string;
  };

  if (!recipients?.length || !digest) {
    return NextResponse.json({ error: "recipients and digest are required" }, { status: 400 });
  }

  const subject = digest.subject_line || `Weekly Marketing Digest — ${weekLabel}`;
  const html = buildDigestHtml(digest, weekLabel, clientName);

  const resend = new Resend(apiKey);

  // Send one email per recipient (personalized)
  const results = await Promise.allSettled(
    recipients.map((to) =>
      resend.emails.send({ from: FROM, to, subject, html })
    )
  );

  const sent = results.filter((r) => r.status === "fulfilled").length;
  const failed = results.filter((r) => r.status === "rejected").length;

  return NextResponse.json({ sent, failed, total: recipients.length });
}
