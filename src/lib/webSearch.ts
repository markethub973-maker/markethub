/**
 * Web Search + Web Read — gives Alex autonomous web access.
 *
 * Search: Serper.dev Google Search API (2500 free/mo)
 * Read: Direct fetch + HTML-to-text extraction (fallback: Octivas)
 */

import { extractViaOctivas } from "@/lib/octivas";

// ── Web Search via Serper ───────────────────────────────────────────────────

export interface SearchResult {
  title: string;
  link: string;
  snippet: string;
  position: number;
}

export interface SearchResponse {
  results: SearchResult[];
  query: string;
  total: number;
}

export async function webSearch(
  query: string,
  options: { num?: number; country?: string; lang?: string } = {}
): Promise<SearchResponse> {
  const apiKey = process.env.SERPER_API_KEY;
  if (!apiKey) {
    throw new Error("SERPER_API_KEY not set");
  }

  const res = await fetch("https://google.serper.dev/search", {
    method: "POST",
    headers: {
      "X-API-KEY": apiKey,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      q: query,
      num: options.num ?? 10,
      gl: options.country ?? "ro",
      hl: options.lang ?? "ro",
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Serper API error ${res.status}: ${text}`);
  }

  const data = (await res.json()) as {
    organic?: Array<{
      title?: string;
      link?: string;
      snippet?: string;
      position?: number;
    }>;
    searchParameters?: { q?: string };
  };

  const results: SearchResult[] = (data.organic || []).map((r, i) => ({
    title: r.title || "",
    link: r.link || "",
    snippet: r.snippet || "",
    position: r.position || i + 1,
  }));

  return {
    results,
    query,
    total: results.length,
  };
}

// ── Web Read — extract text content from URL ────────────────────────────────

export interface ReadResult {
  url: string;
  title: string;
  text: string;
  emails: string[];
  phones: string[];
  success: boolean;
  source: "direct" | "octivas";
}

/**
 * Reads a web page and extracts structured content.
 * Tries direct fetch first (free), falls back to Octivas.
 */
export async function webRead(url: string): Promise<ReadResult> {
  // Try direct fetch first
  try {
    const res = await fetch(url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (compatible; MarketHubBot/1.0; +https://markethubpromo.com)",
        Accept: "text/html,application/xhtml+xml",
      },
      signal: AbortSignal.timeout(10000),
    });

    if (res.ok) {
      const html = await res.text();
      const result = extractFromHtml(html, url);
      if (result.text.length > 100) {
        return { ...result, source: "direct", success: true };
      }
    }
  } catch {
    // Fall through to Octivas
  }

  // Fallback: Octivas
  try {
    const octivas = await extractViaOctivas(url);
    if (octivas && typeof octivas === "object") {
      const octivasObj = octivas as unknown as Record<string, unknown>;
      const text =
        (octivasObj.text as string) ||
        (octivasObj.content as string) ||
        JSON.stringify(octivas).slice(0, 5000);
      return {
        url,
        title: (octivasObj.title as string) || "",
        text: text.slice(0, 5000),
        emails: extractEmails(text),
        phones: extractPhones(text),
        source: "octivas",
        success: true,
      };
    }
  } catch {
    // Both failed
  }

  return {
    url,
    title: "",
    text: "",
    emails: [],
    phones: [],
    source: "direct",
    success: false,
  };
}

// ── HTML helpers ────────────────────────────────────────────────────────────

function extractFromHtml(
  html: string,
  url: string
): Omit<ReadResult, "source" | "success"> {
  // Extract title
  const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
  const title = titleMatch ? titleMatch[1].trim() : "";

  // Strip scripts, styles, nav, footer
  let text = html
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "")
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "")
    .replace(/<nav[^>]*>[\s\S]*?<\/nav>/gi, "")
    .replace(/<footer[^>]*>[\s\S]*?<\/footer>/gi, "")
    .replace(/<header[^>]*>[\s\S]*?<\/header>/gi, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&#\d+;/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  // Limit to 5000 chars
  text = text.slice(0, 5000);

  return {
    url,
    title,
    text,
    emails: extractEmails(html),
    phones: extractPhones(html),
  };
}

function extractEmails(text: string): string[] {
  const matches = text.match(
    /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g
  );
  return [...new Set(matches || [])].slice(0, 10);
}

function extractPhones(text: string): string[] {
  const matches = text.match(
    /(?:\+?\d{1,3}[-.\s]?)?\(?\d{2,4}\)?[-.\s]?\d{3,4}[-.\s]?\d{3,4}/g
  );
  return [...new Set(matches || [])]
    .filter((p) => p.replace(/\D/g, "").length >= 8)
    .slice(0, 10);
}

// ── Prospect verification — is this a marketing agency? ─────────────────────

export interface ProspectVerification {
  domain: string;
  isMarketingAgency: boolean;
  confidence: "high" | "medium" | "low";
  reason: string;
  services: string[];
  emails: string[];
  phones: string[];
}

const MARKETING_KEYWORDS = [
  "marketing", "social media", "seo", "advertising", "branding",
  "pr ", "public relations", "content", "creative agency",
  "media agency", "digital agency", "marketing agency",
  "comunicare", "publicitate", "promovare", "agenție",
];

const NON_MARKETING_KEYWORDS = [
  "software development", "web development", "app development",
  "it consulting", "saas", "erp", "hosting", "programare",
  "dezvoltare software", "development company", "tech company",
  "system integrator", "it services", "cloud services",
];

export function classifyProspect(
  text: string,
  title: string
): Pick<ProspectVerification, "isMarketingAgency" | "confidence" | "reason" | "services"> {
  const combined = `${title} ${text}`.toLowerCase();

  const marketingHits = MARKETING_KEYWORDS.filter((kw) =>
    combined.includes(kw)
  );
  const nonMarketingHits = NON_MARKETING_KEYWORDS.filter((kw) =>
    combined.includes(kw)
  );

  const services = marketingHits;

  if (nonMarketingHits.length > 0 && marketingHits.length === 0) {
    return {
      isMarketingAgency: false,
      confidence: "high",
      reason: `Non-marketing: found ${nonMarketingHits.join(", ")}`,
      services: [],
    };
  }

  if (nonMarketingHits.length > marketingHits.length) {
    return {
      isMarketingAgency: false,
      confidence: "medium",
      reason: `More non-marketing signals (${nonMarketingHits.length}) than marketing (${marketingHits.length})`,
      services,
    };
  }

  if (marketingHits.length >= 3) {
    return {
      isMarketingAgency: true,
      confidence: "high",
      reason: `Strong marketing signals: ${marketingHits.slice(0, 5).join(", ")}`,
      services,
    };
  }

  if (marketingHits.length >= 1) {
    return {
      isMarketingAgency: true,
      confidence: "medium",
      reason: `Some marketing signals: ${marketingHits.join(", ")}`,
      services,
    };
  }

  return {
    isMarketingAgency: false,
    confidence: "low",
    reason: "No clear marketing signals found",
    services: [],
  };
}
