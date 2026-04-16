/**
 * Octivas Web Extraction API — complement to Apify.
 *
 * Apify provides actor-based scraping (Google Maps, LinkedIn, etc.).
 * Octivas does LLM-ready extraction from a single URL — higher-quality
 * markdown/title/description than our regex-based fetch fallback.
 *
 * Pricing (as of 2026-04-16): free tier = 1,000 API credits/month.
 * Each /scrape call consumes credits based on formats requested (markdown
 * typically ~1-3 credits/page). At 3 credits avg, free tier ≈ 330 pages/mo
 * — enough for daily bulk-import runs while Apify is on pause.
 *
 * Env: OCTIVAS_API_KEY (from https://octivas.com — free account).
 *
 * Usage:
 *   import { extractViaOctivas } from "@/lib/octivas";
 *   const result = await extractViaOctivas("https://example.com");
 *   if (result) { result.title, result.description, result.markdown, result.credits_used }
 */

export interface OctivasExtract {
  title: string | null;
  description: string | null;
  markdown: string | null;
  url: string;
  credits_used: number;
  status_code: number;
}

export interface OctivasOptions {
  formats?: Array<"markdown" | "html" | "links" | "summary">;
  only_main_content?: boolean;
  timeout_ms?: number;
}

const OCTIVAS_BASE = "https://api.octivas.com/api/v1";

export async function extractViaOctivas(
  url: string,
  opts: OctivasOptions = {},
): Promise<OctivasExtract | null> {
  const apiKey = process.env.OCTIVAS_API_KEY;
  if (!apiKey) return null;
  if (!url) return null;

  try {
    const res = await fetch(`${OCTIVAS_BASE}/scrape`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        url,
        formats: opts.formats ?? ["markdown"],
        only_main_content: opts.only_main_content ?? true,
        timeout: opts.timeout_ms ?? 20_000,
      }),
      signal: AbortSignal.timeout((opts.timeout_ms ?? 20_000) + 5_000),
    });

    if (!res.ok) return null;
    const data = (await res.json()) as {
      success?: boolean;
      url?: string;
      markdown?: string | null;
      metadata?: {
        title?: string;
        description?: string;
        status_code?: number;
        credits_used?: number;
      };
    };
    if (data.success === false) return null;

    return {
      title: data.metadata?.title ?? null,
      description: data.metadata?.description ?? null,
      markdown: data.markdown ?? null,
      url: data.url ?? url,
      credits_used: data.metadata?.credits_used ?? 0,
      status_code: data.metadata?.status_code ?? 200,
    };
  } catch {
    return null;
  }
}

/**
 * Quick account balance check — how many credits used this month.
 * Returns null if the endpoint or auth isn't available.
 */
export async function octivasAccountStatus(): Promise<{
  credits_used_month?: number;
  credits_remaining?: number;
  plan?: string;
} | null> {
  const apiKey = process.env.OCTIVAS_API_KEY;
  if (!apiKey) return null;
  try {
    const res = await fetch(`${OCTIVAS_BASE}/account`, {
      headers: { Authorization: `Bearer ${apiKey}` },
      signal: AbortSignal.timeout(10_000),
    });
    if (!res.ok) return null;
    return (await res.json()) as {
      credits_used_month?: number;
      credits_remaining?: number;
      plan?: string;
    };
  } catch {
    return null;
  }
}
