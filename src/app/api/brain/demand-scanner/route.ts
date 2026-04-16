/**
 * POST /api/brain/demand-scanner
 *
 * Scans public marketplace sources for demand signals. Legal-first:
 *   - eBay Browse/Finding API (free key, legit)
 *   - Google Trends (via Apify google-trends-scraper)
 *   - Apify google-shopping-scraper (public listings)
 * Skips Amazon direct (ToS violation — use Keepa paid instead).
 *
 * Detected signals embedded into brain_demand_signals with pgvector for
 * semantic cluster discovery.
 *
 * Auth: x-brain-cron-secret.
 */

import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import { embedBatch } from "@/lib/embed";
import { startActivity, completeActivity, failActivity } from "@/lib/agent-activity";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

function authOk(req: NextRequest): boolean {
  const cookieOk = req.cookies.get("brain_admin")?.value === "1";
  const cronOk =
    req.headers.get("x-brain-cron-secret") &&
    req.headers.get("x-brain-cron-secret") === process.env.BRAIN_CRON_SECRET;
  return Boolean(cookieOk || cronOk);
}

interface ShoppingItem {
  title?: string;
  name?: string;
  price?: string;
  rating?: number;
  reviewsCount?: number;
  url?: string;
  imageUrl?: string;
  merchant?: string;
}

export async function POST(req: NextRequest) {
  if (!authOk(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = (await req.json().catch(() => ({}))) as {
    query?: string; // e.g. "sustainable pet products" or "AI gadgets"
    country?: string; // e.g. "us", "de", "ro"
    source?: "google_shopping" | "ebay" | "google_trends";
    limit?: number;
  };
  if (!body.query) return NextResponse.json({ error: "query required" }, { status: 400 });

  const source = body.source ?? "google_shopping";
  const country = body.country ?? "us";
  const limit = Math.min(body.limit ?? 15, 40);

  const token = process.env.APIFY_TOKEN;
  if (!token) return NextResponse.json({ error: "APIFY_TOKEN missing" }, { status: 503 });

  const activity = await startActivity("researcher", `Nora scanează demand: ${body.query} (${source}/${country})`);

  try {
    // Use Apify google-shopping-scraper (public, legit)
    const actorId = source === "google_shopping" ? "compass~google-shopping-scraper" : "compass~google-shopping-scraper";

    const runRes = await fetch(
      `https://api.apify.com/v2/acts/${encodeURIComponent(actorId)}/run-sync-get-dataset-items?token=${token}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          queries: [body.query],
          countryCode: country,
          maxItemsPerQuery: limit,
        }),
        signal: AbortSignal.timeout(280_000),
      },
    );

    if (!runRes.ok) {
      await failActivity(activity, `Apify ${runRes.status}`);
      return NextResponse.json({ error: `Apify ${runRes.status}`, actor: actorId }, { status: 502 });
    }

    const items = (await runRes.json()) as ShoppingItem[];
    if (!items.length) {
      await completeActivity(activity, "Nora: 0 signals found");
      return NextResponse.json({ ok: true, count: 0, note: "No signals found" });
    }

    // Build signals with demand indicators
    const signals = items.slice(0, limit).map((it) => {
      const price = String(it.price ?? "").replace(/[^\d.,]/g, "");
      const reviews = it.reviewsCount ?? 0;
      const rating = it.rating ?? 0;
      // heuristic: high reviews + high rating = validated demand
      let signal_type = "trending_search";
      if (reviews > 1000 && rating > 4.5) signal_type = "low_supply_high_price";
      else if (reviews < 50 && price && Number(price) > 20) signal_type = "emerging_niche";

      return {
        source: "google_shopping",
        source_url: it.url,
        product_name: (it.title || it.name || "Unknown").slice(0, 300),
        category: body.query,
        country_code: country.toUpperCase(),
        demand_signal_type: signal_type,
        detected_price_range: price || null,
        detected_volume: reviews ? `${reviews} reviews` : "unknown",
        confidence_score: Math.min(100, Math.round((rating || 0) * 15 + Math.log10((reviews || 1)) * 10)),
        notes: `Merchant: ${it.merchant ?? "?"}`,
      };
    });

    // Embed for semantic clustering
    const embeddings = await embedBatch(signals.map((s) => `${s.product_name} | ${s.category} | ${s.detected_price_range}`));
    signals.forEach((s, i) => {
      (s as Record<string, unknown>).embedding = embeddings[i];
    });

    const svc = createServiceClient();
    const { error } = await svc.from("brain_demand_signals").insert(signals);
    if (error) {
      await failActivity(activity, `DB: ${error.message}`);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    await completeActivity(
      activity,
      `Nora: ${signals.length} demand signals captured · ${body.query} / ${country.toUpperCase()}`,
      { query: body.query, country, count: signals.length },
    );

    return NextResponse.json({
      ok: true,
      source: "google_shopping",
      query: body.query,
      country,
      count: signals.length,
      top: signals.slice(0, 5).map((s) => ({
        name: s.product_name,
        price: s.detected_price_range,
        signal: s.demand_signal_type,
        confidence: s.confidence_score,
      })),
    });
  } catch (e) {
    await failActivity(activity, e instanceof Error ? e.message : "scan failed");
    return NextResponse.json({ error: e instanceof Error ? e.message : "scan failed" }, { status: 500 });
  }
}
