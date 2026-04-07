import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { safeApify } from "@/lib/serviceGuard";

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  if (!process.env.APIFY_TOKEN) return NextResponse.json({ error: "Apify not configured", degraded: true }, { status: 503 });

  const { query, country = "ro", language = "ro", pages = 1 } = await req.json();
  if (!query?.trim()) return NextResponse.json({ error: "Query required" }, { status: 400 });

  try {
    const result = await safeApify<any[]>("apify~google-search-scraper", {
      queries: query,
      maxPagesPerQuery: Math.min(pages, 3),
      resultsPerPage: 10,
      countryCode: country.toLowerCase(),
      languageCode: language,
      includeUnfilteredResults: false,
      saveHtml: false,
      saveHtmlToKeyValueStore: false,
    }, { timeoutSec: 60, retries: 1 });

    if (!result.ok) {
      return NextResponse.json({ error: result.error, service: "apify", degraded: true }, { status: 503 });
    }

    const data = result.data || [];
    const results = (data || []).flatMap((page: {
      organicResults?: unknown[];
      paidResults?: unknown[];
      peopleAlsoAsk?: unknown[];
      relatedQueries?: unknown[];
    }) => {
      const organic = (page.organicResults || []).map((r: any) => ({
        type: "organic",
        title: r.title,
        url: r.url,
        description: r.description,
        position: r.position,
        displayedUrl: r.displayedUrl,
        sitelinks: r.sitelinks,
      }));
      const paid = (page.paidResults || []).map((r: any) => ({
        type: "ad",
        title: r.title,
        url: r.url,
        description: r.description,
        displayedUrl: r.displayedUrl,
      }));
      const paa = (page.peopleAlsoAsk || []).map((q: any) => ({
        type: "paa",
        question: q.question,
        answer: q.answer,
        url: q.url,
      }));
      const related = (page.relatedQueries || []).map((q: any) => ({
        type: "related",
        query: typeof q === "string" ? q : q.query,
      }));
      return [...paid, ...organic, ...paa, ...related];
    });

    return NextResponse.json({ results, query, total: results.length });
  } catch (err: any) {
    return NextResponse.json({ error: "Service temporarily unavailable" }, { status: 500 });
  }
}
