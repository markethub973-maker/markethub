/**
 * POST /api/brain/mine-leads — daily lead miner using Apify actors.
 *
 * Body: { actor: string, input: object, limit?: number }
 *
 * Typical actor IDs we use:
 *   - "apify/google-maps-scraper"   — search e.g. "dental clinic Bucharest"
 *   - "apify/google-search-scraper" — SERP scrape
 *   - "curious_coder/linkedin-jobs-scraper" — companies hiring
 *
 * Output: list of candidate domains + metadata. The operator reviews and
 * copies domains into /brain-private/outreach.
 *
 * Auth: brain_admin cookie OR cron secret.
 * Env: APIFY_TOKEN required.
 */

import { NextRequest, NextResponse } from "next/server";
import { startActivity, completeActivity, failActivity } from "@/lib/agent-activity";
import { tagClientNeeds } from "@/lib/client-needs-tagger";
import { isAlexPaused, pausedResponse } from "@/lib/killSwitch";


export const dynamic = "force-dynamic";
export const maxDuration = 300;

function authOk(req: NextRequest): boolean {
  const cookieOk = req.cookies.get("brain_admin")?.value === "1";
  const cronOk =
    req.headers.get("x-brain-cron-secret") &&
    req.headers.get("x-brain-cron-secret") === process.env.BRAIN_CRON_SECRET;
  return Boolean(cookieOk || cronOk);
}

interface ApifyItem {
  url?: string;
  website?: string;
  domain?: string;
  title?: string;
  name?: string;
  emails?: string[];
  phone?: string;
  city?: string;
  categoryName?: string;
  [k: string]: unknown;
}

function domainOf(urlOrDomain: string | undefined): string | null {
  if (!urlOrDomain) return null;
  try {
    const u = new URL(urlOrDomain.startsWith("http") ? urlOrDomain : `https://${urlOrDomain}`);
    return u.hostname.replace(/^www\./, "");
  } catch {
    return null;
  }
}

export async function POST(req: NextRequest) {
  if (isAlexPaused()) return pausedResponse();
  if (!authOk(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const token = process.env.APIFY_TOKEN;
  if (!token) {
    return NextResponse.json(
      { error: "APIFY_TOKEN not configured", setup_url: "https://console.apify.com/account/integrations" },
      { status: 503 },
    );
  }

  const body = (await req.json().catch(() => ({}))) as {
    actor?: string;
    input?: Record<string, unknown>;
    limit?: number;
  };
  const actor = body.actor ?? "compass/crawler-google-places";
  const input = body.input ?? { searchStringsArray: ["dental clinic Bucharest"], maxCrawledPlacesPerSearch: 20 };
  const limit = Math.min(body.limit ?? 50, 100);

  // Extract query for the activity description
  const queryDesc =
    (Array.isArray((input as Record<string, unknown>).searchStringsArray) && ((input as Record<string, string[]>).searchStringsArray[0])) ||
    ((input as Record<string, string>).searchString) ||
    actor;

  const activity = await startActivity("researcher", `Nora scanează: ${queryDesc}`);

  // Run actor synchronously and stream the dataset
  try {
    const runRes = await fetch(
      `https://api.apify.com/v2/acts/${encodeURIComponent(actor)}/run-sync-get-dataset-items?token=${token}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
        signal: AbortSignal.timeout(280_000),
      },
    );
    if (!runRes.ok) {
      await failActivity(activity, `Apify ${runRes.status}`, `Apify ${runRes.status}`);
      return NextResponse.json({ error: `Apify ${runRes.status}` }, { status: 502 });
    }
    const items = (await runRes.json()) as ApifyItem[];
    const seen = new Set<string>();
    const leads: Array<{ domain: string; title?: string; email?: string; phone?: string; city?: string; category?: string }> = [];
    for (const it of items) {
      const d = domainOf(it.website) || domainOf(it.url) || domainOf(it.domain);
      if (!d || seen.has(d)) continue;
      seen.add(d);
      leads.push({
        domain: d,
        title: it.title || it.name || undefined,
        email: (it.emails && it.emails[0]) || undefined,
        phone: it.phone || undefined,
        city: it.city || undefined,
        category: it.categoryName || undefined,
      });
      if (leads.length >= limit) break;
    }
    // Populate cross-sell graph — tag each lead with its detected needs.
    // Basic tagging (vertical + category detected from title/category). Full
    // snippet-based tagging happens later in outreach-batch enrichment.
    await Promise.all(
      leads.map((l) =>
        tagClientNeeds({
          domain: l.domain,
          business_name: l.title,
          vertical: l.category || String(queryDesc),
          extra_needs: [l.category || "unknown"].filter(Boolean),
        }),
      ),
    );
    await completeActivity(activity, `Nora: ${leads.length} domenii identificate pentru "${queryDesc}"`, { count: leads.length, query: String(queryDesc) });
    return NextResponse.json({ ok: true, actor, count: leads.length, leads });
  } catch (e) {
    await failActivity(activity, `Apify run failed`, e instanceof Error ? e.message : String(e));
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Apify run failed" },
      { status: 502 },
    );
  }
}
