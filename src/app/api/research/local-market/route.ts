import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const token = process.env.APIFY_TOKEN;
  if (!token) return NextResponse.json({ error: "Apify not configured" }, { status: 500 });

  const { query, site } = await req.json();
  if (!query?.trim() || !site?.trim()) {
    return NextResponse.json({ error: "query and site are required" }, { status: 400 });
  }

  const searchQuery = `site:${site} ${query.trim()}`;

  try {
    const res = await fetch(
      `https://api.apify.com/v2/acts/apify~google-search-scraper/run-sync-get-dataset-items?token=${token}&timeout=60&memory=256`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          queries: searchQuery,
          maxPagesPerQuery: 1,
          resultsPerPage: 20,
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
    const results = (data || []).flatMap((page: any) =>
      (page.organicResults || []).map((r: any) => ({
        title: r.title,
        url: r.url,
        description: r.description,
        displayedUrl: r.displayedUrl,
      }))
    );

    return NextResponse.json({ results, query, site, total: results.length });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
