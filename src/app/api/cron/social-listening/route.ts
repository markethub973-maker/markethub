import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import { Resend } from "resend";
import { verifyCronSecret } from "@/lib/cronAuth";
import { isAlexPaused, pausedResponse } from "@/lib/killSwitch";


const resend = new Resend(process.env.RESEND_API_KEY);
const RAPIDAPI_KEY = process.env.RAPIDAPI_KEY ?? "";
const NEWS_API_KEY = process.env.NEWS_API_KEY ?? "";

export async function GET(req: NextRequest) {
  if (isAlexPaused()) return pausedResponse();
  if (!verifyCronSecret(req, "/api/cron/social-listening")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supa = createServiceClient();
  const { data: configs } = await supa.from("listening_config").select("*").eq("active", true);
  if (!configs?.length) return NextResponse.json({ ok: true, scanned: 0 });

  let totalMentions = 0;

  for (const config of configs) {
    if (!config.keywords?.length) continue;
    const newMentions: any[] = [];

    for (const keyword of config.keywords.slice(0, 5)) {
      const platforms: string[] = config.platforms ?? ["tiktok", "instagram", "reddit", "news"];

      // ── TikTok hashtag search ────────────────────────────────────────────
      if (platforms.includes("tiktok") && RAPIDAPI_KEY) {
        try {
          const res = await fetch(
            `https://tiktok-trend-analysis-api.p.rapidapi.com/search/video?keyword=${encodeURIComponent(keyword)}&count=5`,
            { headers: { "x-rapidapi-host": "tiktok-trend-analysis-api.p.rapidapi.com", "x-rapidapi-key": RAPIDAPI_KEY } }
          );
          if (res.ok) {
            const data = await res.json();
            const videos = data.videos ?? data.data ?? [];
            for (const v of videos.slice(0, 3)) {
              newMentions.push({
                user_id: config.user_id, keyword,
                platform: "TikTok",
                content: v.desc ?? v.title ?? "",
                author: v.author?.uniqueId ?? v.nickname ?? "",
                url: `https://www.tiktok.com/@${v.author?.uniqueId ?? ""}/video/${v.id ?? ""}`,
                reach: v.stats?.playCount ?? v.playCount ?? 0,
                sentiment: "neutral",
              });
            }
          }
        } catch { /* non-fatal */ }
      }

      // ── Instagram hashtag ────────────────────────────────────────────────
      if (platforms.includes("instagram") && RAPIDAPI_KEY) {
        try {
          const res = await fetch(
            `https://instagram-public-bulk-scraper.p.rapidapi.com/v2/hashtag?tag=${encodeURIComponent(keyword.replace(/^#/, ""))}&count=5`,
            { headers: { "x-rapidapi-host": "instagram-public-bulk-scraper.p.rapidapi.com", "x-rapidapi-key": RAPIDAPI_KEY } }
          );
          if (res.ok) {
            const data = await res.json();
            const posts = data.data?.recent_posts ?? [];
            for (const p of posts.slice(0, 3)) {
              newMentions.push({
                user_id: config.user_id, keyword,
                platform: "Instagram",
                content: p.caption?.slice(0, 200) ?? "",
                author: p.owner_username ?? "",
                url: p.shortcode ? `https://www.instagram.com/p/${p.shortcode}/` : "",
                reach: p.like_count ?? 0,
                sentiment: "neutral",
              });
            }
          }
        } catch { /* non-fatal */ }
      }

      // ── News API ─────────────────────────────────────────────────────────
      if (platforms.includes("news") && NEWS_API_KEY) {
        try {
          const res = await fetch(
            `https://newsapi.org/v2/everything?q=${encodeURIComponent(keyword)}&pageSize=3&sortBy=publishedAt&apiKey=${NEWS_API_KEY}`
          );
          if (res.ok) {
            const data = await res.json();
            for (const article of (data.articles ?? []).slice(0, 3)) {
              newMentions.push({
                user_id: config.user_id, keyword,
                platform: "News",
                content: article.title + (article.description ? " — " + article.description.slice(0, 100) : ""),
                author: article.source?.name ?? "",
                url: article.url ?? "",
                reach: 0,
                sentiment: "neutral",
              });
            }
          }
        } catch { /* non-fatal */ }
      }

      // ── Reddit (via Research Hub logic) ─────────────────────────────────
      if (platforms.includes("reddit")) {
        try {
          const res = await fetch(
            `https://www.reddit.com/search.json?q=${encodeURIComponent(keyword)}&sort=new&limit=5`,
            { headers: { "User-Agent": "MarketHubPro/1.0" } }
          );
          if (res.ok) {
            const data = await res.json();
            const posts = data.data?.children ?? [];
            for (const { data: p } of posts.slice(0, 3)) {
              newMentions.push({
                user_id: config.user_id, keyword,
                platform: "Reddit",
                content: p.title + (p.selftext ? " — " + p.selftext.slice(0, 100) : ""),
                author: `u/${p.author}`,
                url: `https://reddit.com${p.permalink}`,
                reach: p.score ?? 0,
                sentiment: p.score > 100 ? "positive" : p.score < 0 ? "negative" : "neutral",
              });
            }
          }
        } catch { /* non-fatal */ }
      }
    }

    if (newMentions.length > 0) {
      const { data: inserted } = await supa.from("social_mentions").insert(newMentions).select();
      totalMentions += inserted?.length ?? 0;

      // Email notification
      if (config.notify_email && config.email && inserted?.length) {
        const byPlatform = inserted.reduce((acc: Record<string, any[]>, m: any) => {
          if (!acc[m.platform]) acc[m.platform] = [];
          acc[m.platform].push(m);
          return acc;
        }, {});

        const sections = Object.entries(byPlatform).map(([platform, items]) => `
          <h3 style="color:#F59E0B;margin:16px 0 8px">${platform} (${items.length})</h3>
          ${(items as any[]).map(m => `
            <div style="padding:8px 12px;background:#FFF8F0;border-left:3px solid #F5D7A0;margin:6px 0;border-radius:4px">
              <p style="margin:0;font-size:13px;color:#292524">${m.content.slice(0, 150)}${m.content.length > 150 ? "..." : ""}</p>
              <p style="margin:4px 0 0;font-size:11px;color:#A8967E">
                ${m.author ? `@${m.author} · ` : ""}${m.reach > 0 ? `${m.reach.toLocaleString()} reach · ` : ""}
                <a href="${m.url}" style="color:#6366F1">Vezi post</a>
              </p>
            </div>
          `).join("")}
        `).join("");

        const keywords = config.keywords.join(", ");
        await resend.emails.send({
          from: "MarketHub Pro <noreply@markethubpromo.com>",
          to: config.email,
          subject: `🔔 ${inserted.length} mențiuni noi pentru: ${keywords.slice(0, 50)}`,
          html: `
            <div style="font-family:sans-serif;max-width:560px;margin:0 auto;padding:32px;color:#292524">
              <h2 style="color:#F59E0B">Social Listening Alert</h2>
              <p>Am detectat <strong>${inserted.length} mențiuni noi</strong> pentru keyword-urile tale:</p>
              <p style="background:#FFF8F0;padding:8px 12px;border-radius:8px;color:#D97706;font-weight:bold">${keywords}</p>
              ${sections}
              <p style="margin-top:24px">
                <a href="https://markethubpromo.com/social-listening" style="background:#F59E0B;color:#1C1814;padding:10px 20px;border-radius:8px;text-decoration:none;font-weight:bold">
                  Vezi toate mențiunile
                </a>
              </p>
              <p style="margin-top:32px;color:#A8967E;font-size:12px">— MarketHub Pro</p>
            </div>
          `,
        }).catch(() => {});
      }
    }
  }

  const result = { ok: true, scanned: configs.length, mentions: totalMentions };
  await supa.from("cron_logs").upsert({
    job: "social-listening",
    ran_at: new Date().toISOString(),
    result,
  });
  return NextResponse.json(result);
}
