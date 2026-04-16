/**
 * POST /api/brain/global-prospects/bulk-import
 *
 * Apify-free prospect ingestion. Accepts a list of domains and, for each,
 * directly fetches the homepage, extracts a short snippet (title + meta
 * description + first visible text), embeds via OpenAI, upserts into
 * brain_global_prospects with the vector ready for semantic search.
 *
 * Use cases:
 *   - Manual seed from LinkedIn / Google search (operator paste)
 *   - Apify is over quota — keeps the pipeline moving
 *   - Quick targeted test of a specific shortlist
 *
 * Body: {
 *   domains: string[],               // plain domains, no protocol required
 *   vertical?: string,               // e.g. "digital marketing agency"
 *   country_code?: string,           // e.g. "RO"
 *   language?: "ro"|"en"|"de"|...,   // used when fetching (Accept-Language)
 *   tag?: string                     // custom tag added to source field
 * }
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
  const secret = req.headers.get("x-brain-cron-secret");
  return Boolean(secret && secret === process.env.BRAIN_CRON_SECRET);
}

function normalizeDomain(raw: string): string | null {
  const s = raw.trim().replace(/^https?:\/\//, "").replace(/^www\./, "").split("/")[0];
  if (!s || !/[a-z0-9]/i.test(s) || !s.includes(".")) return null;
  return s.toLowerCase();
}

interface Extracted {
  title: string | null;
  description: string | null;
  body_snippet: string | null;
  business_name: string | null;
}

// Regex-based homepage extraction — no cheerio dependency. Good enough
// for title + meta description + first 600 chars of visible text, which
// is all the embedding needs.
async function fetchHomepage(domain: string, language = "en"): Promise<Extracted> {
  const urls = [`https://${domain}`, `https://www.${domain}`];
  for (const url of urls) {
    try {
      const res = await fetch(url, {
        redirect: "follow",
        headers: {
          "User-Agent": "Mozilla/5.0 (compatible; MarketHubProBot/1.0; +https://markethubpromo.com)",
          "Accept-Language": language,
        },
        signal: AbortSignal.timeout(12_000),
      });
      if (!res.ok) continue;
      const html = await res.text();

      const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
      const metaDesc = html.match(/<meta[^>]+name=["']description["'][^>]+content=["']([^"']+)["']/i);
      const ogTitle = html.match(/<meta[^>]+property=["']og:title["'][^>]+content=["']([^"']+)["']/i);
      const ogDesc = html.match(/<meta[^>]+property=["']og:description["'][^>]+content=["']([^"']+)["']/i);

      // Strip tags, collapse whitespace, keep first 600 chars
      const bodyText = html
        .replace(/<script[\s\S]*?<\/script>/gi, "")
        .replace(/<style[\s\S]*?<\/style>/gi, "")
        .replace(/<[^>]+>/g, " ")
        .replace(/\s+/g, " ")
        .trim()
        .slice(0, 600);

      const title = (titleMatch?.[1] ?? ogTitle?.[1] ?? null)?.trim() ?? null;
      const description = (metaDesc?.[1] ?? ogDesc?.[1] ?? null)?.trim() ?? null;

      // Business name heuristic: take first part of title before " - " / " | " / " — "
      const bizName = title?.split(/\s+[-|—]\s+/)[0]?.trim() ?? null;

      return { title, description, body_snippet: bodyText, business_name: bizName };
    } catch {
      /* try next variant */
    }
  }
  return { title: null, description: null, body_snippet: null, business_name: null };
}

export async function POST(req: NextRequest) {
  if (!authOk(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = (await req.json().catch(() => ({}))) as {
    domains?: string[];
    vertical?: string;
    country_code?: string;
    language?: string;
    tag?: string;
  };
  const raw = body.domains ?? [];
  if (!Array.isArray(raw) || raw.length === 0) {
    return NextResponse.json({ error: "domains array required" }, { status: 400 });
  }
  if (raw.length > 100) {
    return NextResponse.json({ error: "max 100 domains per call (batch embedding limit)" }, { status: 400 });
  }

  const domains = Array.from(new Set(raw.map(normalizeDomain).filter((d): d is string => d !== null)));
  if (domains.length === 0) {
    return NextResponse.json({ error: "no valid domains after normalization" }, { status: 400 });
  }

  const activity = await startActivity(
    "researcher",
    `Nora: bulk-import ${domains.length} prospecți (fără Apify) pt ${body.vertical ?? "mixed"}`,
  );

  const svc = createServiceClient();
  const language = body.language ?? "ro";

  // Fetch homepages in parallel (capped at 10 at a time to avoid storm)
  const results: Array<{ domain: string; extracted: Extracted }> = [];
  const batchSize = 10;
  for (let i = 0; i < domains.length; i += batchSize) {
    const chunk = domains.slice(i, i + batchSize);
    const fetched = await Promise.all(
      chunk.map(async (d) => ({ domain: d, extracted: await fetchHomepage(d, language) })),
    );
    results.push(...fetched);
  }

  // Build the text to embed for each prospect
  const toEmbed = results.map((r) =>
    [
      r.extracted.title ?? r.domain,
      r.extracted.description ?? "",
      r.extracted.body_snippet ?? "",
    ]
      .filter(Boolean)
      .join("\n")
      .slice(0, 8000),
  );

  const embeddings = await embedBatch(toEmbed);

  // Upsert each row into brain_global_prospects
  const inserted: string[] = [];
  const failed: Array<{ domain: string; reason: string }> = [];

  for (let i = 0; i < results.length; i++) {
    const r = results[i];
    const emb = embeddings[i];
    if (!emb) {
      failed.push({ domain: r.domain, reason: "embedding failed" });
      continue;
    }
    if (!r.extracted.body_snippet && !r.extracted.description) {
      failed.push({ domain: r.domain, reason: "homepage not fetchable" });
      continue;
    }

    const { error } = await svc.from("brain_global_prospects").upsert(
      {
        domain: r.domain,
        business_name: r.extracted.business_name ?? r.domain,
        vertical: body.vertical ?? null,
        country_code: body.country_code ?? null,
        snippet: [r.extracted.description, r.extracted.body_snippet].filter(Boolean).join(" · ").slice(0, 1500),
        embedding: emb,
        last_scanned_at: new Date().toISOString(),
        source: body.tag ? `bulk-import:${body.tag}` : "bulk-import",
      },
      { onConflict: "domain" },
    );
    if (error) {
      failed.push({ domain: r.domain, reason: error.message.slice(0, 100) });
      continue;
    }
    inserted.push(r.domain);
  }

  if (inserted.length === 0 && failed.length > 0) {
    await failActivity(activity, `Nora: bulk-import 0/${domains.length} reuşit — toate homepage-urile au eşuat`);
  } else {
    await completeActivity(
      activity,
      `Nora: bulk-import ${inserted.length}/${domains.length} embedded şi salvaţi cu vector`,
      { inserted: inserted.length, failed: failed.length },
    );
  }

  return NextResponse.json({
    ok: true,
    requested: domains.length,
    inserted: inserted.length,
    inserted_domains: inserted,
    failed,
  });
}
