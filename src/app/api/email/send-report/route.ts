import { NextRequest, NextResponse } from "next/server";
import { Resend } from "resend";
import { createClient } from "@/lib/supabase/server";
import { renderToBuffer } from "@react-pdf/renderer";
import { createElement } from "react";
import { MarketingReportPDF, MarketingReportData } from "@/lib/marketingReportPDF";
import { resolveIGToken } from "@/lib/igToken";

function fmtNum(n: number) {
  if (n >= 1000000) return (n / 1000000).toFixed(1) + "M";
  if (n >= 1000) return (n / 1000).toFixed(1) + "K";
  return String(Math.round(n));
}

function engColor(rate: number) {
  if (rate >= 5) return "#1DB954";
  if (rate >= 2) return "#F59E0B";
  return "#EF4444";
}

function htmlEmail(data: {
  clientName: string;
  username: string;
  followers: number;
  avgEngRate: number;
  reach30: number;
  impressions30: number;
  period: string;
}) {
  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#F5F0E8;font-family:Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#F5F0E8;padding:40px 20px;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="background:#FFFCF7;border-radius:16px;overflow:hidden;box-shadow:0 4px 20px rgba(0,0,0,0.08);">
        <tr>
          <td style="background:linear-gradient(135deg,#1C1814,#2D2420);padding:40px;text-align:center;">
            <div style="display:inline-block;background:linear-gradient(135deg,#F59E0B,#D97706);border-radius:12px;padding:10px 14px;margin-bottom:16px;">
              <span style="color:white;font-size:20px;font-weight:bold;">⚡</span>
            </div>
            <h1 style="color:#FFF8F0;margin:0 0 8px;font-size:24px;">MarketHub Pro</h1>
            <p style="color:#A8967E;margin:0;font-size:14px;">Your monthly Instagram report is attached to this email</p>
          </td>
        </tr>
        <tr>
          <td style="padding:24px 40px 0;text-align:center;">
            <p style="margin:0;font-size:13px;color:#A8967E;">Period: <strong style="color:#292524;">${data.period}</strong></p>
            <p style="margin:4px 0 0;font-size:13px;color:#A8967E;">Account: <strong style="color:#E1306C;">@${data.username}</strong></p>
          </td>
        </tr>
        <tr>
          <td style="padding:24px 40px;">
            <table width="100%" cellpadding="0" cellspacing="0">
              <tr>
                <td width="25%" style="padding:4px;">
                  <div style="background:#F59E0B10;border:1px solid #F59E0B20;border-radius:12px;padding:16px;text-align:center;">
                    <p style="margin:0 0 4px;font-size:11px;color:#A8967E;">Followers</p>
                    <p style="margin:0;font-size:22px;font-weight:bold;color:#F59E0B;">${fmtNum(data.followers)}</p>
                  </div>
                </td>
                <td width="25%" style="padding:4px;">
                  <div style="background:${engColor(data.avgEngRate)}10;border:1px solid ${engColor(data.avgEngRate)}20;border-radius:12px;padding:16px;text-align:center;">
                    <p style="margin:0 0 4px;font-size:11px;color:#A8967E;">Engagement</p>
                    <p style="margin:0;font-size:22px;font-weight:bold;color:${engColor(data.avgEngRate)};">${data.avgEngRate.toFixed(1)}%</p>
                  </div>
                </td>
                <td width="25%" style="padding:4px;">
                  <div style="background:#1877F210;border:1px solid #1877F220;border-radius:12px;padding:16px;text-align:center;">
                    <p style="margin:0 0 4px;font-size:11px;color:#A8967E;">Reach 30d</p>
                    <p style="margin:0;font-size:22px;font-weight:bold;color:#1877F2;">${fmtNum(data.reach30)}</p>
                  </div>
                </td>
                <td width="25%" style="padding:4px;">
                  <div style="background:#6366F110;border:1px solid #6366F120;border-radius:12px;padding:16px;text-align:center;">
                    <p style="margin:0 0 4px;font-size:11px;color:#A8967E;">Impressions 30d</p>
                    <p style="margin:0;font-size:22px;font-weight:bold;color:#6366F1;">${fmtNum(data.impressions30)}</p>
                  </div>
                </td>
              </tr>
            </table>
          </td>
        </tr>
        <tr>
          <td style="padding:0 40px 32px;text-align:center;">
            <div style="background:#F5F0E8;border-radius:12px;padding:16px;">
              <p style="margin:0;font-size:13px;color:#78614E;">📎 The full PDF report is attached to this email.</p>
              <p style="margin:8px 0 0;font-size:12px;color:#A8967E;">Includes top posts, best posting days, content mix and strategic recommendations.</p>
            </div>
          </td>
        </tr>
        <tr>
          <td style="background:#F5F0E8;padding:20px 40px;text-align:center;border-top:1px solid rgba(245,215,160,0.3);">
            <p style="margin:0;font-size:11px;color:#C4AA8A;">Trimis de <strong>MarketHub Pro</strong> · markethubpromo.com</p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: profile } = await supabase
    .from("profiles")
    .select("instagram_access_token, instagram_user_id, instagram_username, name")
    .eq("id", user.id)
    .single();

  if (!profile?.instagram_access_token || !profile?.instagram_user_id) {
    return NextResponse.json({ error: "Instagram not connected" }, { status: 400 });
  }

  const body = await req.json().catch(() => ({}));
  const recipientEmail = body.email || user.email;
  if (!recipientEmail) return NextResponse.json({ error: "Recipient email missing" }, { status: 400 });

  const igId = profile.instagram_user_id;
  const clientName = profile.name || profile.instagram_username || "Client";

  try {
    // Resolve correct token (Page Token if User Token doesn't have IG access)
    const token = await resolveIGToken(profile.instagram_access_token, igId);

    // Fetch all data — handle failures gracefully
    let igProfile: any = {};
    let igInsights: any = {};
    let igMedia: any = {};
    let fbAccounts: any = {};

    try {
      const [profileRes, insightsRes, mediaRes, fbRes] = await Promise.all([
        fetch(`https://graph.facebook.com/v22.0/${igId}?fields=followers_count,media_count,username,biography,profile_picture_url&access_token=${token}`),
        fetch(`https://graph.facebook.com/v22.0/${igId}/insights?metric=reach,impressions&period=day&since=${Math.floor(Date.now() / 1000) - 30 * 86400}&until=${Math.floor(Date.now() / 1000)}&access_token=${token}`),
        fetch(`https://graph.facebook.com/v22.0/${igId}/media?fields=id,caption,media_type,thumbnail_url,media_url,timestamp,like_count,comments_count,permalink&limit=20&access_token=${token}`),
        fetch(`https://graph.facebook.com/v22.0/me/accounts?fields=id,name,fan_count,followers_count&access_token=${token}`),
      ]);

      [igProfile, igInsights, igMedia, fbAccounts] = await Promise.all([
        profileRes.json(), insightsRes.json(), mediaRes.json(), fbRes.json(),
      ]);
    } catch {
      // API calls failed — continue with empty data
    }

    // If IG profile failed, use fallback data from Supabase profile
    if (igProfile.error || !igProfile.followers_count) {
      igProfile = {
        username: profile.instagram_username || "hub9.73",
        followers_count: 0,
        media_count: 0,
        biography: "",
        profile_picture_url: "",
      };
    }

    const followers = igProfile.followers_count || 0;
    const posts = igMedia.data || [];

    const postsWithEng = posts.map((p: any) => ({
      ...p,
      engagement: (p.like_count || 0) + (p.comments_count || 0),
      engRate: followers > 0 ? (((p.like_count || 0) + (p.comments_count || 0)) / followers) * 100 : 0,
      dayOfWeek: new Date(p.timestamp).toLocaleDateString("en-US", { weekday: "short" }),
    }));

    const topPosts = [...postsWithEng].sort((a, b) => b.engagement - a.engagement).slice(0, 8);
    const avgEngRate = postsWithEng.length > 0
      ? postsWithEng.reduce((s: number, p: any) => s + p.engRate, 0) / postsWithEng.length : 0;

    const reachSeries = (igInsights.data || []).find((m: any) => m.name === "reach")?.values || [];
    const impSeries = (igInsights.data || []).find((m: any) => m.name === "impressions")?.values || [];
    const totalReach = reachSeries.reduce((s: number, pt: any) => s + (pt.value || 0), 0);
    const totalImpressions = impSeries.reduce((s: number, pt: any) => s + (pt.value || 0), 0);

    const dayEng: Record<string, { total: number; count: number }> = {};
    postsWithEng.forEach((p: any) => {
      dayEng[p.dayOfWeek] = dayEng[p.dayOfWeek] || { total: 0, count: 0 };
      dayEng[p.dayOfWeek].total += p.engRate;
      dayEng[p.dayOfWeek].count += 1;
    });
    const bestDays = Object.entries(dayEng)
      .map(([day, d]) => ({ day, avg: d.total / d.count }))
      .sort((a, b) => b.avg - a.avg);

    const typeCount: Record<string, number> = {};
    postsWithEng.forEach((p: any) => { typeCount[p.media_type] = (typeCount[p.media_type] || 0) + 1; });
    const contentMix = Object.entries(typeCount).map(([name, value]) => ({
      name: name === "VIDEO" ? "Video" : name === "CAROUSEL_ALBUM" ? "Carusel" : "Foto",
      value,
    }));

    const fbPage = fbAccounts.data?.[0];
    const period = `${new Date(Date.now() - 30 * 86400 * 1000).toLocaleDateString("en-US", { day: "2-digit", month: "long" })} — ${new Date().toLocaleDateString("en-US", { day: "2-digit", month: "long", year: "numeric" })}`;

    const recommendations = [
      {
        title: "Posting frequency",
        text: igProfile.media_count < 30
          ? `${igProfile.media_count} total posts. We recommend at least 4-5 posts/week to grow organic reach.`
          : `Current frequency is solid. Keep the consistency and experiment with different posting times.`,
      },
      {
        title: "Engagement Rate",
        text: avgEngRate >= 3
          ? `Engagement rate of ${avgEngRate.toFixed(1)}% is excellent. Ideal for influencer campaigns.`
          : `Engagement rate of ${avgEngRate.toFixed(1)}% is below the 3% benchmark. Try polls in Stories and interactive content.`,
      },
      {
        title: "Content type",
        text: contentMix.find(c => c.name === "Video")
          ? `${contentMix.find(c => c.name === "Video")?.value} videos detected. Reels generate 30-50% higher reach.`
          : `Add Reels (15-30 sec) for algorithm boost. Recommended mix: 60% video, 30% carousel, 10% photo.`,
      },
      {
        title: "Reach strategy",
        text: totalReach > 0
          ? `Reach of ${fmtNum(totalReach)} in 30 days = ${((totalReach / (followers || 1)) * 100).toFixed(0)}% of followers. Post during peak hours 6PM-9PM.`
          : `Enable Instagram Business Insights to track your reach.`,
      },
    ];

    const reportData: MarketingReportData = {
      clientName,
      period,
      generatedAt: new Date().toLocaleDateString("en-US", { day: "2-digit", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit" }),
      instagram: {
        username: igProfile.username || profile.instagram_username || "",
        followers,
        mediaCount: igProfile.media_count || 0,
        biography: igProfile.biography,
        profilePicture: igProfile.profile_picture_url,
      },
      facebook: fbPage ? { name: fbPage.name, followers: fbPage.followers_count || fbPage.fan_count || 0 } : undefined,
      reach30: totalReach,
      impressions30: totalImpressions,
      avgEngRate,
      topPosts: topPosts.map((p: any) => ({
        caption: p.caption,
        thumbnail: p.thumbnail_url || p.media_url,
        likes: p.like_count || 0,
        comments: p.comments_count || 0,
        engRate: p.engRate,
        mediaType: p.media_type,
        date: new Date(p.timestamp).toLocaleDateString("en-US", { day: "2-digit", month: "2-digit", year: "2-digit" }),
        permalink: p.permalink,
      })),
      bestDays,
      contentMix,
      recommendations,
    };

    // Generate PDF
    const element = createElement(MarketingReportPDF, { data: reportData });
    const pdfBuffer = await renderToBuffer(element as any);
    const pdfFilename = `MarketHub-Report-${clientName.replace(/\s+/g, "-")}-${new Date().toLocaleDateString("en-US", { month: "2-digit", year: "numeric" }).replace("/", "-")}.pdf`;

    // Send email with PDF attachment
    const resend = new Resend(process.env.RESEND_API_KEY);
    const result = await resend.emails.send({
      from: "MarketHub Pro <rapoarte@markethubpromo.com>",
      to: [recipientEmail],
      subject: `Instagram Report ${new Date().toLocaleDateString("en-US", { month: "long", year: "numeric" })} — @${igProfile.username || profile.instagram_username}`,
      html: htmlEmail({
        clientName,
        username: igProfile.username || profile.instagram_username || "",
        followers,
        avgEngRate,
        reach30: totalReach,
        impressions30: totalImpressions,
        period,
      }),
      attachments: [
        {
          filename: pdfFilename,
          content: pdfBuffer.toString("base64"),
        },
      ],
    });

    if (result.error) {
      return NextResponse.json({ error: result.error.message }, { status: 400 });
    }

    return NextResponse.json({ success: true, emailId: result.data?.id, sentTo: recipientEmail });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
