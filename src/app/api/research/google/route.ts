import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const token = process.env.APIFY_TOKEN;
  if (!token) return NextResponse.json({ error: "Apify not configured" }, { status: 500 });

  const { query, country = "ro", language = "ro", pages = 1 } = await req.json();
  if (!query?.trim()) return NextResponse.json({ error: "Query required" }, { status: 400 });

  try {
    const res = await fetch(
      `https://api.apify.com/v2/acts/apify~google-search-scraper/run-sync-get-dataset-items?token=${token}&timeout=60&memory=256`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          queries: query,
          maxPagesPerQuery: Math.min(pages, 3),
          resultsPerPage: 10,
          countryCode: country.toUpperCase(),
          languageCode: language,
          includeUnfilteredResults: false,
          saveHtml: false,
          saveHtmlToKeyValueStore: false,
        }),
      }
    );

    if (!res.ok) {
      const err = await res.text();
      return NextResponse.json({ error: `Apify error: ${res.status}`, detail: err }, { status: 502 });
    }

    const data = await res.json();
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
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
