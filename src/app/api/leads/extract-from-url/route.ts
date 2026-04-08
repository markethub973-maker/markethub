import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// Best-effort scraper: fetch URL → extract email/phone/name from HTML.
// No external service needed; uses native fetch + regex on the body.
// Per-URL timeout 8s, total batch capped to 30 URLs to avoid runaway.

const EMAIL_RE = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
// Matches international and local phone formats (loose). Filters out years/IDs after.
const PHONE_RE = /(?:\+?\d{1,3}[\s.\-()]*)?(?:\(?\d{2,4}\)?[\s.\-]?)?\d{3,4}[\s.\-]?\d{3,4}/g;

const COMMON_TLDS = new Set([
  "com", "ro", "net", "org", "io", "co", "eu", "uk", "de", "fr", "es", "it", "nl", "pl",
  "ai", "app", "dev", "shop", "store", "info", "biz",
]);

function decodeEntities(s: string): string {
  return s
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'")
    .replace(/&nbsp;/g, " ");
}

function stripTags(html: string): string {
  return html.replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function extractTitle(html: string): string | null {
  const m = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  return m ? decodeEntities(m[1].trim()).slice(0, 200) : null;
}

function extractMeta(html: string, name: string): string | null {
  const re = new RegExp(`<meta[^>]+(?:name|property)=["']${name}["'][^>]+content=["']([^"']+)["']`, "i");
  const m = html.match(re);
  return m ? decodeEntities(m[1].trim()).slice(0, 300) : null;
}

function looksLikePhone(s: string): boolean {
  const digits = s.replace(/\D/g, "");
  if (digits.length < 8 || digits.length > 15) return false;
  // Filter out years (e.g. 1999-2024) and pure numeric ids
  if (/^(19|20)\d{2}$/.test(digits)) return false;
  return true;
}

function uniq<T>(arr: T[]): T[] { return [...new Set(arr)]; }

async function fetchAndExtract(url: string): Promise<{
  url: string;
  ok: boolean;
  name?: string | null;
  description?: string | null;
  emails: string[];
  phones: string[];
  error?: string;
}> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 8000);
  try {
    const res = await fetch(url, {
      signal: controller.signal,
      redirect: "follow",
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; MarketHubLeadBot/1.0; +https://markethubpromo.com)",
        "Accept": "text/html,application/xhtml+xml",
      },
    });
    clearTimeout(timer);
    if (!res.ok) return { url, ok: false, emails: [], phones: [], error: `HTTP ${res.status}` };
    const ct = res.headers.get("content-type") || "";
    if (!ct.includes("text/html") && !ct.includes("application/xhtml")) {
      return { url, ok: false, emails: [], phones: [], error: "non-html" };
    }

    // Cap response size at 1.5 MB
    const reader = res.body?.getReader();
    if (!reader) return { url, ok: false, emails: [], phones: [], error: "no body" };
    const chunks: Uint8Array[] = [];
    let total = 0;
    while (total < 1_500_000) {
      const { done, value } = await reader.read();
      if (done) break;
      chunks.push(value);
      total += value.length;
    }
    try { await reader.cancel(); } catch {}
    const html = new TextDecoder("utf-8", { fatal: false }).decode(
      Uint8Array.from(chunks.flatMap(c => Array.from(c)))
    );

    const title = extractTitle(html);
    const description = extractMeta(html, "description") || extractMeta(html, "og:description");
    const ogSite = extractMeta(html, "og:site_name");
    const name = ogSite || title;

    const text = stripTags(html);

    // Emails: dedupe + filter junk
    const rawEmails: string[] = [
      ...(text.match(EMAIL_RE) || []),
      ...(html.match(EMAIL_RE) || []),
    ]
      .map(e => e.toLowerCase())
      .filter(e => {
        if (e.includes("sentry") || e.includes("wixpress") || e.includes("example.")) return false;
        if (e.length > 80) return false;
        const tld = e.split(".").pop() || "";
        return COMMON_TLDS.has(tld) || tld.length === 2;
      });
    const emails = uniq(rawEmails).slice(0, 5);

    // Phones: search for tel: hrefs first (very reliable), then loose match
    const telLinks = uniq(
      Array.from(html.matchAll(/href=["']tel:([^"']+)["']/gi)).map(m => m[1].trim())
    );
    const phoneCandidates = telLinks.length > 0
      ? telLinks
      : uniq((text.match(PHONE_RE) || []).map(s => s.trim()).filter(looksLikePhone));
    const phones = phoneCandidates.slice(0, 5);

    return { url, ok: true, name, description, emails, phones };
  } catch (err: any) {
    clearTimeout(timer);
    return { url, ok: false, emails: [], phones: [], error: err?.name === "AbortError" ? "timeout" : "fetch_failed" };
  }
}

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const urls: string[] = Array.isArray(body?.urls) ? body.urls : [];
  if (!urls.length) return NextResponse.json({ error: "urls array required" }, { status: 400 });

  const capped = urls.slice(0, 30);

  // Fetch in parallel batches of 6 to avoid hammering
  const results: Awaited<ReturnType<typeof fetchAndExtract>>[] = [];
  for (let i = 0; i < capped.length; i += 6) {
    const batch = capped.slice(i, i + 6);
    const settled = await Promise.all(batch.map(u => fetchAndExtract(u).catch(() => ({
      url: u, ok: false, emails: [], phones: [], error: "exception",
    }))));
    results.push(...settled);
  }

  return NextResponse.json({ results, total: results.length });
}
