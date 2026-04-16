/**
 * POST /api/brain/global-prospects/scan
 *
 * Scans a country × vertical via Apify Google Maps, embeds each prospect
 * using OpenAI, saves to brain_global_prospects with vector for semantic
 * search later.
 *
 * Body: { country_code: "DE", vertical: "digital marketing agency", limit?: 25 }
 *
 * Auth: x-brain-cron-secret.
 */

import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import { embedBatch } from "@/lib/embed";
import { startActivity, completeActivity, failActivity } from "@/lib/agent-activity";
import { detectNeeds } from "@/lib/client-needs-tagger";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

interface ApifyPlace {
  title?: string;
  name?: string;
  website?: string;
  url?: string;
  phone?: string;
  emails?: string[];
  categoryName?: string;
  description?: string;
  address?: string;
  city?: string;
}

function domainOf(url: string | undefined | null): string | null {
  if (!url) return null;
  try {
    return new URL(url.startsWith("http") ? url : `https://${url}`).hostname.replace(/^www\./, "");
  } catch {
    return null;
  }
}

function authOk(req: NextRequest): boolean {
  const cookieOk = req.cookies.get("brain_admin")?.value === "1";
  const cronOk =
    req.headers.get("x-brain-cron-secret") &&
    req.headers.get("x-brain-cron-secret") === process.env.BRAIN_CRON_SECRET;
  return Boolean(cookieOk || cronOk);
}

export async function POST(req: NextRequest) {
  if (!authOk(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = (await req.json().catch(() => ({}))) as {
    country_code?: string;
    vertical?: string;
    city?: string;
    limit?: number;
  };
  if (!body.country_code || !body.vertical) {
    return NextResponse.json({ error: "country_code + vertical required" }, { status: 400 });
  }

  const token = process.env.APIFY_TOKEN;
  if (!token) return NextResponse.json({ error: "APIFY_TOKEN missing" }, { status: 503 });

  const svc = createServiceClient();
  const { data: country } = await svc
    .from("brain_target_countries")
    .select("country_name, business_language")
    .eq("country_code", body.country_code.toUpperCase())
    .maybeSingle();

  const countryName = country?.country_name ?? body.country_code;
  const activity = await startActivity("researcher", `Nora scanează ${body.vertical} în ${countryName}`);

  const searchQuery = body.city
    ? `${body.vertical} ${body.city} ${countryName}`
    : `${body.vertical} ${countryName}`;

  try {
    // Run Apify (lukaskrivka for email enrichment)
    const apifyRes = await fetch(
      `https://api.apify.com/v2/acts/lukaskrivka~google-maps-with-contact-details/run-sync-get-dataset-items?token=${token}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          searchStringsArray: [searchQuery],
          maxCrawledPlacesPerSearch: Math.min(body.limit ?? 25, 50),
          language: country?.business_language?.includes("en") ? "en" : "en",
          countryCode: body.country_code.toLowerCase(),
          maxImages: 0,
          maxReviews: 0,
        }),
        signal: AbortSignal.timeout(280_000),
      },
    );
    if (!apifyRes.ok) {
      await failActivity(activity, `Apify ${apifyRes.status}`);
      return NextResponse.json({ error: `Apify ${apifyRes.status}` }, { status: 502 });
    }

    const items = (await apifyRes.json()) as ApifyPlace[];
    const seen = new Set<string>();
    const prospects: Array<Record<string, unknown>> = [];

    for (const it of items) {
      const domain = domainOf(it.website) || domainOf(it.url);
      if (!domain || seen.has(domain)) continue;
      seen.add(domain);
      const email = (it.emails && it.emails[0]) || null;
      const snippet = [it.title, it.description, it.categoryName, it.address].filter(Boolean).join(" · ");
      prospects.push({
        domain,
        business_name: it.title || it.name || null,
        country_code: body.country_code.toUpperCase(),
        vertical: body.vertical,
        intermediary_type: body.vertical,
        website: it.website || `https://${domain}`,
        email,
        phone: it.phone || null,
        snippet: snippet.slice(0, 2000),
        detected_needs: detectNeeds(snippet),
      });
    }

    if (!prospects.length) {
      await completeActivity(activity, `Nora: 0 prospecți găsiți pentru ${searchQuery}`);
      return NextResponse.json({ ok: true, count: 0, note: "No prospects found" });
    }

    // Embed snippets in batch (cheap — ~$0.01 per 100 prospects)
    const embeddings = await embedBatch(prospects.map((p) => `${p.business_name} | ${p.vertical} | ${p.country_code} | ${p.snippet}`));
    prospects.forEach((p, i) => { p.embedding = embeddings[i]; });

    // Upsert into brain_global_prospects
    const { error } = await svc
      .from("brain_global_prospects")
      .upsert(prospects as Array<{ domain: string }>, { onConflict: "domain" });

    if (error) {
      await failActivity(activity, `DB insert failed: ${error.message}`);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Mark country as scanned
    await svc
      .from("brain_target_countries")
      .update({ current_coverage_status: "scanned" })
      .eq("country_code", body.country_code.toUpperCase());

    const withEmail = prospects.filter((p) => p.email).length;
    await completeActivity(
      activity,
      `Nora: ${prospects.length} prospecți embed + salvați · ${withEmail} cu email · ${countryName}/${body.vertical}`,
      { total: prospects.length, with_email: withEmail },
    );

    return NextResponse.json({
      ok: true,
      country: countryName,
      vertical: body.vertical,
      count: prospects.length,
      with_email: withEmail,
      sample: prospects.slice(0, 5).map((p) => ({ domain: p.domain, name: p.business_name, email: p.email })),
    });
  } catch (e) {
    await failActivity(activity, e instanceof Error ? e.message : "scan failed");
    return NextResponse.json({ error: e instanceof Error ? e.message : "scan failed" }, { status: 500 });
  }
}
