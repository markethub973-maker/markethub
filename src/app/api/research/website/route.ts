import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { safeApify } from "@/lib/serviceGuard";

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  
  if (!process.env.APIFY_TOKEN) return NextResponse.json({ error: "Apify not configured", degraded: true }, { status: 503 });

  const { url, maxPages = 5 } = await req.json();
  if (!url?.trim()) return NextResponse.json({ error: "URL required" }, { status: 400 });

  const startUrl = url.startsWith("http") ? url : `https://${url}`;

  const result = await safeApify<any[]>("apify~website-content-crawler", {
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
  }, { timeoutSec: 120, retries: 0 });

  if (!result.ok) {
    return NextResponse.json({ error: result.error, service: "apify", degraded: true }, { status: 503 });
  }

  try {
    const data = result.data || [];
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
