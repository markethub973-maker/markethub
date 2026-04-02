import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const token = process.env.APIFY_TOKEN;
  if (!token) return NextResponse.json({ error: "Apify not configured" }, { status: 500 });

  const { url, maxPages = 5 } = await req.json();
  if (!url?.trim()) return NextResponse.json({ error: "URL required" }, { status: 400 });

  const startUrl = url.startsWith("http") ? url : `https://${url}`;

  try {
    const res = await fetch(
      `https://api.apify.com/v2/acts/apify~website-content-crawler/run-sync-get-dataset-items?token=${token}&timeout=120&memory=256`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          startUrls: [{ url: startUrl }],
          maxCrawlPages: Math.min(maxPages, 10),
          crawlerType: "playwright:firefox",
          removeElementsCssSelector: "nav, footer, header, .cookie-banner, script, style",
          htmlTransformer: "readableText",
          readableTextCharThreshold: 100,
          aggressivePrune: true,
          debugLog: false,
          saveHtml: false,
          saveMarkdown: true,
        }),
      }
    );

    if (!res.ok) {
      const err = await res.text();
      return NextResponse.json({ error: `Apify error: ${res.status}`, detail: err }, { status: 502 });
    }

    const data = await res.json();
    const pages = (data || []).map((p: any) => ({
      url: p.url,
      title: p.metadata?.title || p.title,
      description: p.metadata?.description || "",
      text: (p.markdown || p.text || "").slice(0, 1500),
      wordCount: p.markdown?.split(/\s+/).length || 0,
    }));

    // Extract key info from homepage
    const home = pages[0];
    const allText = pages.map((p: any) => p.text).join(" ").slice(0, 3000);

    return NextResponse.json({
      pages,
      total: pages.length,
      domain: new URL(startUrl).hostname,
      home_title: home?.title,
      home_description: home?.description,
      combined_text: allText,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
