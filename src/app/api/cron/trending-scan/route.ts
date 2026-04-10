import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(req: NextRequest) {
  // Vercel cron sends Authorization: Bearer <CRON_SECRET>
  const authHeader = req.headers.get("authorization") ?? "";
  const secret = authHeader.replace("Bearer ", "") || req.headers.get("x-cron-secret") || req.nextUrl.searchParams.get("secret");
  if (secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supa = createServiceClient();
  const { data: configs } = await supa.from("trending_alert_config").select("*").eq("active", true);
  if (!configs?.length) return NextResponse.json({ ok: true, scanned: 0 });

  const RAPIDAPI_KEY = process.env.RAPIDAPI_KEY;
  let totalInserted = 0;

  for (const config of configs) {
    if (!config.keywords?.length && !config.categories?.length) continue;

    const newAlerts: any[] = [];
    const keywords = [...(config.keywords ?? []), ...(config.categories ?? [])].slice(0, 5);

    for (const keyword of keywords) {
      try {
        // TikTok trending scan
        const ttRes = await fetch(
          `https://tiktok-trend-analysis-api.p.rapidapi.com/search/hashtag?keyword=${encodeURIComponent(keyword)}&count=5`,
          { headers: { "x-rapidapi-host": "tiktok-trend-analysis-api.p.rapidapi.com", "x-rapidapi-key": RAPIDAPI_KEY ?? "" } }
        );
        if (ttRes.ok) {
          const ttData = await ttRes.json();
          const hashtags = ttData.hashtags ?? ttData.data ?? [];
          for (const ht of hashtags.slice(0, 3)) {
            const name = ht.title || ht.name || ht.challengeName || keyword;
            const views = ht.view_count || ht.viewCount || ht.stats?.viewCount || 0;
            if (views > 100000) {
              newAlerts.push({
                user_id: config.user_id,
                product: name,
                platform: "TikTok",
                trend_score: Math.min(100, Math.floor(views / 1000000)),
                hashtag: `#${name}`,
                example_url: `https://www.tiktok.com/tag/${encodeURIComponent(name)}`,
                category: keyword,
              });
            }
          }
        }
      } catch { /* non-fatal */ }
    }

    if (newAlerts.length > 0) {
      const { data: inserted } = await supa.from("trending_alerts").insert(newAlerts).select();
      totalInserted += inserted?.length ?? 0;

      // Send email notification
      if (config.email && inserted?.length) {
        const items = inserted.map((a: any) =>
          `<li><strong>${a.product}</strong> on ${a.platform} — Score: ${a.trend_score}/100 | <a href="${a.example_url}">${a.hashtag}</a></li>`
        ).join("");

        await resend.emails.send({
          from: "MarketHub Pro <noreply@markethubpromo.com>",
          to: config.email,
          subject: `🔥 ${inserted.length} trending product${inserted.length > 1 ? "s" : ""} detected`,
          html: `
            <div style="font-family:sans-serif;max-width:520px;margin:0 auto;padding:32px;color:#292524">
              <h2 style="color:#F59E0B">🔥 Trending Products Alert</h2>
              <p>New trending products detected matching your keywords:</p>
              <ul style="line-height:2">${items}</ul>
              <p style="margin-top:24px">
                <a href="https://markethubpromo.com/alerts" style="background:#F59E0B;color:#1C1814;padding:10px 20px;border-radius:8px;text-decoration:none;font-weight:bold">
                  View All Alerts
                </a>
              </p>
              <p style="margin-top:32px;color:#A8967E;font-size:12px">— MarketHub Pro</p>
            </div>
          `,
        }).catch(() => {});
      }
    }
  }

  return NextResponse.json({ ok: true, scanned: configs.length, inserted: totalInserted });
}
