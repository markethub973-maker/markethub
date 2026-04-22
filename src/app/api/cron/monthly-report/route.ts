import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import { isAdminAuthorized } from "@/lib/adminAuth";
import { Resend } from "resend";
import { renderToBuffer } from "@react-pdf/renderer";
import { createElement } from "react";
import { MarketingReportPDF, MarketingReportData } from "@/lib/marketingReportPDF";
import { resolveIGToken } from "@/lib/igToken";
const CRON_SECRET = process.env.CRON_SECRET!;
const FROM = "MarketHub Pro <rapoarte@markethubpromo.com>";

function fmtNum(n: number) {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + "M";
  if (n >= 1_000) return (n / 1_000).toFixed(1) + "K";
  return String(Math.round(n));
}

function buildHtml(data: {
  clientName: string; username: string; followers: number;
  avgEngRate: number; reach30: number; impressions30: number; period: string;
}) {
  const engColor = data.avgEngRate >= 5 ? "#1DB954" : data.avgEngRate >= 2 ? "#F59E0B" : "#EF4444";
  return `<!DOCTYPE html>
<html><head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background:#F5F0E8;font-family:Arial,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#F5F0E8;padding:40px 20px;">
<tr><td align="center">
<table width="600" cellpadding="0" cellspacing="0" style="background:#FFFCF7;border-radius:16px;overflow:hidden;box-shadow:0 4px 20px rgba(0,0,0,0.08);">
<tr><td style="background:linear-gradient(135deg,#1C1814,#2D2420);padding:40px;text-align:center;">
  <h1 style="color:#FFF8F0;margin:0 0 8px;font-size:24px;">MarketHub Pro</h1>
  <p style="color:#A8967E;margin:0;font-size:14px;">Monthly Instagram Report — ${data.period}</p>
</td></tr>
<tr><td style="padding:24px 40px 0;text-align:center;">
  <p style="margin:0;font-size:13px;color:#A8967E;">Account: <strong style="color:#E1306C;">@${data.username}</strong></p>
</td></tr>
<tr><td style="padding:24px 40px;">
  <table width="100%" cellpadding="0" cellspacing="0">
    <tr>
      <td width="25%" style="padding:4px;"><div style="background:#F59E0B10;border:1px solid #F59E0B20;border-radius:12px;padding:16px;text-align:center;">
        <p style="margin:0 0 4px;font-size:11px;color:#A8967E;">Followers</p>
        <p style="margin:0;font-size:22px;font-weight:bold;color:#F59E0B;">${fmtNum(data.followers)}</p>
      </div></td>
      <td width="25%" style="padding:4px;"><div style="background:${engColor}10;border:1px solid ${engColor}20;border-radius:12px;padding:16px;text-align:center;">
        <p style="margin:0 0 4px;font-size:11px;color:#A8967E;">Engagement</p>
        <p style="margin:0;font-size:22px;font-weight:bold;color:${engColor};">${data.avgEngRate.toFixed(1)}%</p>
      </div></td>
      <td width="25%" style="padding:4px;"><div style="background:#1877F210;border:1px solid #1877F220;border-radius:12px;padding:16px;text-align:center;">
        <p style="margin:0 0 4px;font-size:11px;color:#A8967E;">Reach 30d</p>
        <p style="margin:0;font-size:22px;font-weight:bold;color:#1877F2;">${fmtNum(data.reach30)}</p>
      </div></td>
      <td width="25%" style="padding:4px;"><div style="background:#6366F110;border:1px solid #6366F120;border-radius:12px;padding:16px;text-align:center;">
        <p style="margin:0 0 4px;font-size:11px;color:#A8967E;">Impressions</p>
        <p style="margin:0;font-size:22px;font-weight:bold;color:#6366F1;">${fmtNum(data.impressions30)}</p>
      </div></td>
    </tr>
  </table>
</td></tr>
<tr><td style="padding:0 40px 32px;text-align:center;">
  <div style="background:#F5F0E8;border-radius:12px;padding:16px;">
    <p style="margin:0;font-size:13px;color:#78614E;">📎 Full PDF report attached.</p>
  </div>
</td></tr>
<tr><td style="background:#F5F0E8;padding:20px 40px;text-align:center;border-top:1px solid rgba(245,215,160,0.3);">
  <p style="margin:0;font-size:11px;color:#C4AA8A;">Sent by <strong>MarketHub Pro</strong> · markethubpromo.com</p>
</td></tr>
</table>
</td></tr>
</table>
</body></html>`;
}

export async function GET(req: NextRequest) {
  // Accept: cron Bearer token (from Vercel cron) OR valid admin session cookie.
  // The old admin path only checked for the cookie NAME being present —
  // replaced with the proper HMAC-verified isAdminAuthorized() check.
  const authHeader = req.headers.get("authorization");
  const isCron = CRON_SECRET && authHeader === `Bearer ${CRON_SECRET}`;
  if (!isCron && !isAdminAuthorized(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const resendKey = process.env.RESEND_API_KEY;
  if (!resendKey) return NextResponse.json({ error: "Resend not configured" }, { status: 500 });

  const supabase = createServiceClient();
  const resend = new Resend(resendKey);

  // Paid users with IG connected and an email address
  const { data: profiles, error } = await supabase
    .from("profiles")
    .select("id, email, full_name, instagram_access_token, instagram_user_id, instagram_username, subscription_plan")
    .not("instagram_access_token", "is", null)
    .not("instagram_user_id", "is", null)
    .not("subscription_plan", "in", '("free","free_test")')
    .not("email", "is", null);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const summary = { sent: 0, failed: 0, total: profiles?.length ?? 0 };
  const monthLabel = new Date().toLocaleDateString("en-US", { month: "long", year: "numeric" });
  const period = `${new Date(Date.now() - 30 * 86400 * 1000).toLocaleDateString("en-US", { day: "2-digit", month: "long" })} — ${new Date().toLocaleDateString("en-US", { day: "2-digit", month: "long", year: "numeric" })}`;

  for (const profile of profiles ?? []) {
    try {
      const token = await resolveIGToken(profile.instagram_access_token, profile.instagram_user_id);

      const [igRes, mediaRes, insightsRes] = await Promise.all([
        fetch(`https://graph.facebook.com/v22.0/${profile.instagram_user_id}?fields=followers_count,media_count,username,biography,profile_picture_url&access_token=${token}`),
        fetch(`https://graph.facebook.com/v22.0/${profile.instagram_user_id}/media?fields=id,caption,media_type,thumbnail_url,media_url,timestamp,like_count,comments_count,permalink&limit=20&access_token=${token}`),
        fetch(`https://graph.facebook.com/v22.0/${profile.instagram_user_id}/insights?metric=reach,impressions&period=day&since=${Math.floor(Date.now() / 1000) - 30 * 86400}&until=${Math.floor(Date.now() / 1000)}&access_token=${token}`),
      ]);

      const [igData, mediaData, insightsData] = await Promise.all([igRes.json(), mediaRes.json(), insightsRes.json()]);

      const followers = igData.followers_count || 0;
      const posts = (mediaData.data || []).map((p: {
        caption?: string; media_type: string; thumbnail_url?: string; media_url?: string;
        timestamp: string; like_count?: number; comments_count?: number; permalink?: string;
      }) => ({
        ...p,
        engagement: (p.like_count || 0) + (p.comments_count || 0),
        engRate: followers > 0 ? (((p.like_count || 0) + (p.comments_count || 0)) / followers) * 100 : 0,
        dayOfWeek: new Date(p.timestamp).toLocaleDateString("en-US", { weekday: "short" }),
      }));

      const topPosts = [...posts].sort((a: { engagement: number }, b: { engagement: number }) => b.engagement - a.engagement).slice(0, 8);
      const avgEngRate = posts.length > 0 ? posts.reduce((s: number, p: { engRate: number }) => s + p.engRate, 0) / posts.length : 0;

      const reachSeries = (insightsData.data || []).find((m: { name: string }) => m.name === "reach")?.values || [];
      const impSeries = (insightsData.data || []).find((m: { name: string }) => m.name === "impressions")?.values || [];
      const totalReach = reachSeries.reduce((s: number, pt: { value?: number }) => s + (pt.value || 0), 0);
      const totalImpressions = impSeries.reduce((s: number, pt: { value?: number }) => s + (pt.value || 0), 0);

      const dayEng: Record<string, { total: number; count: number }> = {};
      posts.forEach((p: { dayOfWeek: string; engRate: number }) => {
        dayEng[p.dayOfWeek] = dayEng[p.dayOfWeek] || { total: 0, count: 0 };
        dayEng[p.dayOfWeek].total += p.engRate;
        dayEng[p.dayOfWeek].count += 1;
      });
      const bestDays = Object.entries(dayEng)
        .map(([day, d]) => ({ day, avg: d.total / d.count }))
        .sort((a, b) => b.avg - a.avg);

      const typeCount: Record<string, number> = {};
      posts.forEach((p: { media_type: string }) => { typeCount[p.media_type] = (typeCount[p.media_type] || 0) + 1; });
      const contentMix = Object.entries(typeCount).map(([name, value]) => ({
        name: name === "VIDEO" ? "Video" : name === "CAROUSEL_ALBUM" ? "Carusel" : "Foto",
        value: value as number,
      }));

      const clientName = profile.full_name || igData.username || profile.instagram_username || "Client";
      const username = igData.username || profile.instagram_username || "";

      const reportData: MarketingReportData = {
        clientName,
        period,
        generatedAt: new Date().toLocaleDateString("en-US", { day: "2-digit", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit" }),
        instagram: {
          username,
          followers,
          mediaCount: igData.media_count || 0,
          biography: igData.biography,
          profilePicture: igData.profile_picture_url,
        },
        reach30: totalReach,
        impressions30: totalImpressions,
        avgEngRate,
        topPosts: topPosts.map((p: {
          caption?: string; thumbnail_url?: string; media_url?: string;
          like_count?: number; comments_count?: number; engRate: number;
          media_type: string; timestamp: string; permalink?: string;
        }) => ({
          caption: p.caption,
          thumbnail: p.thumbnail_url || p.media_url,
          likes: p.like_count || 0,
          comments: p.comments_count || 0,
          engRate: p.engRate,
          mediaType: p.media_type,
          date: new Date(p.timestamp).toLocaleDateString("en-US", { day: "2-digit", month: "2-digit", year: "2-digit" }),
          permalink: p.permalink ?? "",
        })),
        bestDays,
        contentMix,
        recommendations: [
          {
            title: "Engagement Rate",
            text: avgEngRate >= 3
              ? `ER of ${avgEngRate.toFixed(1)}% is excellent. Ideal for influencer campaigns.`
              : `ER of ${avgEngRate.toFixed(1)}% is below the 3% benchmark. Try polls and interactive Stories.`,
          },
          {
            title: "Content Mix",
            text: contentMix.find(c => c.name === "Video")
              ? `${contentMix.find(c => c.name === "Video")?.value} videos detected. Reels generate 30–50% higher reach.`
              : `Add Reels (15–30 sec) for algorithm boost. Recommended mix: 60% video, 30% carousel, 10% photo.`,
          },
        ],
      };

      const element = createElement(MarketingReportPDF, { data: reportData });
      const pdfBuffer = await renderToBuffer(element as Parameters<typeof renderToBuffer>[0]);
      const pdfFilename = `MarketHub-Report-${clientName.replace(/\s+/g, "-")}-${new Date().toLocaleDateString("en-US", { month: "2-digit", year: "numeric" }).replace("/", "-")}.pdf`;

      await resend.emails.send({
        from: FROM,
        to: [profile.email],
        subject: `Instagram Monthly Report — ${monthLabel} · @${username}`,
        html: buildHtml({ clientName, username, followers, avgEngRate, reach30: totalReach, impressions30: totalImpressions, period }),
        attachments: [{ filename: pdfFilename, content: pdfBuffer.toString("base64") }],
      });

      summary.sent++;
    } catch {
      summary.failed++;
    }
  }

  // Log run
  try {
    await supabase.from("cron_logs").upsert(
      { job: "monthly-report", ran_at: new Date().toISOString(), result: summary },
      { onConflict: "job" }
    );
  } catch { /* ignore */ }

  return NextResponse.json({ success: true, ...summary });
}
