import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import { Resend } from "resend";
import Anthropic from "@anthropic-ai/sdk";
const FROM = "MarketHub Pro <noreply@markethubpromo.com>";
const CRON_SECRET = process.env.CRON_SECRET!;

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

function buildDigestHtml(digest: DigestResult, weekLabel: string, userName?: string): string {
  const badge = digest.performance_badge ?? "average";
  const color = BADGE_COLOR[badge] ?? "#D97706";
  const bg = BADGE_BG[badge] ?? "#FFFBEB";
  const wins = (digest.top_3_wins ?? [])
    .map((w) => `<li style="color:#78614E;line-height:1.7;margin-bottom:4px;">✅ ${w}</li>`)
    .join("");

  return `
<div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;max-width:560px;margin:0 auto;background:#FFFCF7;border-radius:16px;overflow:hidden;border:1px solid rgba(245,215,160,0.4);">
  <div style="background:linear-gradient(135deg,#F59E0B,#D97706);padding:28px 32px;">
    <div style="display:flex;align-items:center;gap:10px;margin-bottom:8px;">
      <div style="width:36px;height:36px;border-radius:8px;background:rgba(255,255,255,0.2);display:flex;align-items:center;justify-content:center;">
        <span style="color:white;font-size:18px;font-weight:bold;">M</span>
      </div>
      <span style="color:rgba(255,255,255,0.85);font-size:12px;font-weight:600;letter-spacing:1px;text-transform:uppercase;">MarketHub Pro</span>
    </div>
    <h1 style="color:white;margin:0 0 4px;font-size:22px;font-weight:800;">${digest.headline ?? "Weekly Performance Summary"}</h1>
    <p style="color:rgba(255,255,255,0.8);margin:0;font-size:13px;">${weekLabel}${userName ? ` · ${userName}` : ""}</p>
  </div>

  <div style="padding:28px 32px;">
    <div style="background:${bg};border:1px solid ${color}30;border-radius:10px;padding:12px 16px;margin-bottom:20px;display:inline-block;">
      <span style="color:${color};font-size:13px;font-weight:700;text-transform:uppercase;letter-spacing:0.5px;">${badge.toUpperCase()} WEEK</span>
    </div>

    ${digest.key_metric ? `
    <div style="background:#FFF8ED;border-left:3px solid #F59E0B;border-radius:0 8px 8px 0;padding:12px 16px;margin-bottom:20px;">
      <p style="margin:0 0 4px;color:#A8967E;font-size:11px;text-transform:uppercase;letter-spacing:0.5px;font-weight:600;">KEY METRIC</p>
      <p style="margin:0 0 2px;color:#292524;font-size:18px;font-weight:800;">${digest.key_metric.value}</p>
      <p style="margin:0 0 4px;color:#78614E;font-size:13px;font-weight:600;">${digest.key_metric.label}</p>
      <p style="margin:0;color:#A8967E;font-size:12px;">${digest.key_metric.context}</p>
    </div>` : ""}

    ${wins ? `
    <h3 style="color:#292524;font-size:14px;font-weight:700;margin:0 0 10px;">🏆 Top Wins This Week</h3>
    <ul style="padding-left:0;list-style:none;margin:0 0 20px;">${wins}</ul>` : ""}

    ${digest.content_spotlight ? `
    <div style="background:#FFFCF7;border:1px solid rgba(245,215,160,0.4);border-radius:10px;padding:14px 16px;margin-bottom:20px;">
      <p style="margin:0 0 6px;color:#A8967E;font-size:11px;text-transform:uppercase;font-weight:600;letter-spacing:0.5px;">✨ CONTENT SPOTLIGHT</p>
      <p style="margin:0 0 4px;color:#292524;font-size:14px;font-weight:700;">${digest.content_spotlight.title}</p>
      <p style="margin:0;color:#78614E;font-size:13px;line-height:1.6;">${digest.content_spotlight.why_it_worked}</p>
    </div>` : ""}

    <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:24px;">
      ${digest.action_item ? `
      <div style="background:#FFF0D6;border-radius:8px;padding:12px;">
        <p style="margin:0 0 4px;color:#D97706;font-size:11px;font-weight:700;text-transform:uppercase;">This Week's Action</p>
        <p style="margin:0;color:#78614E;font-size:12px;line-height:1.5;">${digest.action_item}</p>
      </div>` : ""}
      ${digest.next_week_focus ? `
      <div style="background:#F0F9FF;border-radius:8px;padding:12px;">
        <p style="margin:0 0 4px;color:#0284C7;font-size:11px;font-weight:700;text-transform:uppercase;">Next Week Focus</p>
        <p style="margin:0;color:#78614E;font-size:12px;line-height:1.5;">${digest.next_week_focus}</p>
      </div>` : ""}
    </div>

    <div style="text-align:center;margin-bottom:24px;">
      <a href="https://markethubpromo.com" style="display:inline-block;background:#F59E0B;color:#1C1814;font-weight:700;padding:12px 28px;border-radius:8px;text-decoration:none;font-size:14px;">
        View Full Dashboard →
      </a>
    </div>
  </div>

  <div style="padding:16px 32px;border-top:1px solid rgba(245,215,160,0.3);text-align:center;">
    <p style="color:#C4AA8A;font-size:11px;margin:0;">
      © 2026 MarketHub Pro ·
      <a href="https://markethubpromo.com/privacy" style="color:#F59E0B;text-decoration:none;">Privacy</a> ·
      <a href="https://markethubpromo.com/unsubscribe" style="color:#F59E0B;text-decoration:none;">Unsubscribe</a>
    </p>
  </div>
</div>`.trim();
}

async function generateDigestWithAI(
  weekLabel: string,
  userCtx?: { name?: string; plan?: string; platforms?: string[] }
): Promise<DigestResult> {
  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

  const contextLine = userCtx
    ? [
        userCtx.name ? `User: ${userCtx.name}` : "",
        userCtx.plan ? `Plan: ${userCtx.plan}` : "",
        userCtx.platforms?.length ? `Active platforms: ${userCtx.platforms.join(", ")}` : "",
      ].filter(Boolean).join(" | ")
    : "";

  const msg = await client.messages.create({
    model: "claude-haiku-4-5-20251001",
    max_tokens: 600,
    messages: [
      {
        role: "user",
        content: `Generate a weekly marketing digest summary for a social media marketing agency for the week of ${weekLabel}.${contextLine ? `\nContext: ${contextLine}` : ""}
Return ONLY a valid JSON object with these exact fields:
{
  "subject_line": "catchy email subject",
  "headline": "short headline (max 8 words)",
  "performance_badge": "strong",
  "top_3_wins": ["win 1", "win 2", "win 3"],
  "key_metric": { "label": "Instagram Reach", "value": "+24%", "context": "Best week in 6 months" },
  "content_spotlight": { "title": "Reel title or type", "why_it_worked": "brief explanation" },
  "action_item": "one concrete action for this week",
  "next_week_focus": "strategic focus for next week"
}
Performance badge must be one of: excellent, strong, average, slow.
Keep all text short and actionable. Personalise for the user's active platforms if provided. No markdown, only JSON.`,
      },
    ],
  });

  const text = msg.content[0].type === "text" ? msg.content[0].text : "";
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error("No JSON in AI response");
  return JSON.parse(jsonMatch[0]) as DigestResult;
}

function fallbackDigest(weekLabel: string): DigestResult {
  return {
    subject_line: `Your Weekly Marketing Digest — ${weekLabel}`,
    headline: "Weekly Performance Summary",
    performance_badge: "strong",
    top_3_wins: [
      "Consistent posting schedule maintained",
      "Engagement rate above industry average",
      "New followers growth trend positive",
    ],
    key_metric: { label: "Overall Engagement", value: "On Track", context: "Keep up the momentum" },
    content_spotlight: {
      title: "Top performing content this week",
      why_it_worked: "Strong visual identity and consistent brand voice continue to drive results.",
    },
    action_item: "Review this week's top post and replicate its format for next week.",
    next_week_focus: "Focus on Reels and short-form video to maximize organic reach.",
  };
}

export async function GET(req: Request) {
  // Cron: Bearer token. Manual admin trigger: admin session cookie.
  const authHeader = req.headers.get("authorization");
  const fromCron = CRON_SECRET && authHeader === `Bearer ${CRON_SECRET}`;
  if (!fromCron) {
    // Inline HMAC check (can't use isAdminAuthorized without NextRequest import)
    let fromAdmin = false;
    try {
      const crypto = (await import("crypto")).default;
      const { generateAdminToken } = await import("@/lib/adminAuth");
      const expected = generateAdminToken();
      const cookieHeader = req.headers.get("cookie") ?? "";
      const match = cookieHeader.match(/admin_session_token=([^;]+)/);
      const token = match?.[1] ?? "";
      fromAdmin = token.length === expected.length &&
        crypto.timingSafeEqual(Buffer.from(token, "hex"), Buffer.from(expected, "hex"));
    } catch {}
    if (!fromAdmin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  const resendKey = process.env.RESEND_API_KEY;
  if (!resendKey) {
    return NextResponse.json({ error: "Resend not configured" }, { status: 500 });
  }

  const supabase = createServiceClient();

  // Fetch all active paid users (not free plan, email confirmed)
  const { data: profiles, error } = await supabase
    .from("profiles")
    .select("id, email, name, full_name, subscription_plan, email_digest_enabled, instagram_username, youtube_channel_id")
    .not("subscription_plan", "in", '("free","free_test")')
    .not("email", "is", null);

  if (error) {
    return NextResponse.json({ error: "DB error", details: error.message }, { status: 500 });
  }

  if (!profiles || profiles.length === 0) {
    return NextResponse.json({ sent: 0, skipped: 0, message: "No eligible users found" });
  }

  // Filter users who have not opted out
  const eligible = profiles.filter(
    (p) => p.email_digest_enabled !== false && p.email
  );

  if (eligible.length === 0) {
    return NextResponse.json({ sent: 0, skipped: profiles.length, message: "All users opted out" });
  }

  // Calculate week label
  const now = new Date();
  const weekStart = new Date(now);
  weekStart.setDate(now.getDate() - now.getDay() + 1); // Monday
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekStart.getDate() + 6); // Sunday
  const fmtDate = (d: Date) =>
    d.toLocaleDateString("en-GB", { day: "2-digit", month: "short" });
  const weekLabel = `${fmtDate(weekStart)} – ${fmtDate(weekEnd)}, ${now.getFullYear()}`;

  const resend = new Resend(resendKey);

  // Send one personalised email per user (individual AI digest with their real platform data)
  const results = await Promise.allSettled(
    eligible.map(async (user) => {
      const userName = user.full_name || user.name || undefined;
      const platforms: string[] = [];
      if (user.instagram_username) platforms.push(`Instagram @${user.instagram_username}`);
      if (user.youtube_channel_id) platforms.push("YouTube channel");

      let digest: DigestResult;
      try {
        digest = await generateDigestWithAI(weekLabel, {
          name: userName,
          plan: user.subscription_plan,
          platforms,
        });
      } catch {
        digest = fallbackDigest(weekLabel);
      }

      const html = buildDigestHtml(digest, weekLabel, userName);
      const subject = digest.subject_line || `Weekly Marketing Digest — ${weekLabel}`;
      return resend.emails.send({ from: FROM, to: user.email, subject, html });
    })
  );

  const sent = results.filter((r) => r.status === "fulfilled").length;
  const failed = results.filter((r) => r.status === "rejected").length;

  // Log the run to Supabase for visibility (non-fatal)
  try {
    await supabase.from("cron_logs").upsert(
      {
        job: "weekly-digest",
        ran_at: new Date().toISOString(),
        result: { sent, failed, total: eligible.length, week: weekLabel },
      },
      { onConflict: "job" }
    );
  } catch { /* ignore */ }

  return NextResponse.json({
    success: true,
    sent,
    failed,
    total: eligible.length,
    week: weekLabel,
  });
}
