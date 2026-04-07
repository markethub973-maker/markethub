import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { safeApify } from "@/lib/serviceGuard";
import { checkAndIncrDailyLimit, limitExceededResponse } from "@/lib/dailyLimits";

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: profile } = await supabase.from("profiles").select("plan").eq("id", user.id).single();
  const userPlan = (profile as any)?.plan ?? "free_test";
  const limitCheck = await checkAndIncrDailyLimit(user.id, userPlan, "research");
  if (!limitCheck.allowed) return NextResponse.json(limitExceededResponse(limitCheck, "research"), { status: 429 });

  
  if (!process.env.APIFY_TOKEN) return NextResponse.json({ error: "Apify not configured", degraded: true }, { status: 503 });

  const { query, site } = await req.json();
  if (!query?.trim() || !site?.trim()) {
    return NextResponse.json({ error: "query and site are required" }, { status: 400 });
  }

  const searchQuery = `site:${site} ${query.trim()}`;

  const result = await safeApify<any[]>("apify~google-search-scraper", {
    queries: searchQuery,
    maxPagesPerQuery: 1,
    resultsPerPage: 20,
    includeUnfilteredResults: false,
    saveHtml: false,
    saveHtmlToKeyValueStore: false,
  }, { timeoutSec: 60, retries: 1 });

  if (!result.ok) {
    return NextResponse.json({ error: result.error, service: "apify", degraded: true }, { status: 503 });
  }

  try {
    const data = result.data || [];
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
    return NextResponse.json({ error: "Service temporarily unavailable" }, { status: 500 });
  }
}
