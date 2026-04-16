/**
 * GET /api/brain/prospect-breakdown — exact prospect counts for agents.
 *
 * Problem this solves: agents (Alex, Ethan, Kai, Sofia) work on a text
 * context snapshot and can't execute ad-hoc SQL. When Eduard asks
 * "câți prospecți am în New York?" Alex historically estimated a range
 * like "5-15" and promised to come back with real numbers in 30 min —
 * but neither Ethan nor Kai had a query tool either. The answer was
 * already in the DB.
 *
 * This endpoint exposes precise counts an agent can cite verbatim:
 *   - total prospecți
 *   - per country_code
 *   - per vertical
 *   - per outreach_status
 *   - per city (via snippet fuzzy match — city name mentioned in address)
 *   - per intermediary_type if populated
 *
 * Auth: x-brain-cron-secret. Agents (ask-agent) inject this data into
 * their own context before replying to Eduard, so answers are always
 * DB-accurate.
 *
 * Query params:
 *   city — CSV of city names to count (e.g. "New York,Los Angeles,Cluj")
 *   country — optional filter (ISO code)
 */

import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";

export const dynamic = "force-dynamic";
export const maxDuration = 20;

function authOk(req: NextRequest): boolean {
  const secret = req.headers.get("x-brain-cron-secret");
  return Boolean(secret && secret === process.env.BRAIN_CRON_SECRET);
}

interface Prospect {
  id: string;
  domain: string;
  country_code: string | null;
  vertical: string | null;
  intermediary_type: string | null;
  outreach_status: string | null;
  snippet: string | null;
}

function countBy<K extends string | null | undefined>(
  rows: Prospect[],
  key: (r: Prospect) => K,
): Record<string, number> {
  const out: Record<string, number> = {};
  for (const r of rows) {
    const k = (key(r) ?? "(none)") as string;
    out[k] = (out[k] ?? 0) + 1;
  }
  return Object.fromEntries(Object.entries(out).sort(([, a], [, b]) => b - a));
}

function cityMatches(snippet: string | null, city: string): boolean {
  if (!snippet) return false;
  const s = snippet.toLowerCase();
  const c = city.toLowerCase().trim();
  if (!c) return false;
  // Whole-word match on common spellings
  const patterns = [c, c.replace(/\s+/g, ""), c.replace(/-/g, " ")];
  // Abbreviations for NY / LA only
  if (c === "new york") patterns.push("nyc", "manhattan", "brooklyn", ", ny ", ", ny.", " ny,");
  if (c === "los angeles") patterns.push(" la ", "santa monica", "hollywood", ", ca ", ", ca.");
  return patterns.some((p) => s.includes(p));
}

export async function GET(req: NextRequest) {
  if (!authOk(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const url = req.nextUrl;
  const cityCsv = url.searchParams.get("city") ?? "";
  const countryFilter = url.searchParams.get("country");

  const svc = createServiceClient();
  let query = svc
    .from("brain_global_prospects")
    .select("id, domain, country_code, vertical, intermediary_type, outreach_status, snippet");
  if (countryFilter) query = query.eq("country_code", countryFilter.toUpperCase());
  const { data } = await query.limit(2000);
  const prospects = (data ?? []) as Prospect[];

  // Core breakdowns
  const byCountry = countBy(prospects, (r) => r.country_code);
  const byVertical = countBy(prospects, (r) => r.vertical);
  const byIntermediary = countBy(prospects, (r) => r.intermediary_type);
  const byStatus = countBy(prospects, (r) => r.outreach_status);

  // City breakdown from CSV
  const cities = cityCsv
    .split(",")
    .map((c) => c.trim())
    .filter(Boolean);
  const cityBreakdown: Record<string, { count: number; domains: string[] }> = {};
  for (const city of cities) {
    const matches = prospects.filter((p) => cityMatches(p.snippet, city));
    cityBreakdown[city] = {
      count: matches.length,
      domains: matches.map((m) => m.domain).slice(0, 20),
    };
  }

  return NextResponse.json({
    ok: true,
    generated_at: new Date().toISOString(),
    total: prospects.length,
    filter: { country: countryFilter ?? null, cities },
    by_country: byCountry,
    by_vertical: byVertical,
    by_intermediary_type: byIntermediary,
    by_outreach_status: byStatus,
    by_city: cities.length ? cityBreakdown : undefined,
    sample: prospects.slice(0, 5).map((p) => ({
      domain: p.domain,
      country: p.country_code,
      vertical: p.vertical,
    })),
  });
}
