import { parsePhoneNumberFromString, findPhoneNumbersInText, type CountryCode } from "libphonenumber-js";

// Best-effort website scraper: fetch URL → extract email/phone/name from HTML.
// Used by /api/leads/extract-from-url (bulk Google save) and /api/leads/enrich
// (per-row enrich button) so both flows go through the same battle-tested
// validation. Phone validation uses libphonenumber-js so we only accept numbers
// that pass per-country length/prefix rules — no false positives like
// "1001-5000" employee ranges or random 4-4 digit pairs.

const EMAIL_RE = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;

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

function uniq<T>(arr: T[]): T[] { return [...new Set(arr)]; }

// Guess default country from TLD so libphonenumber can validate national-format
// numbers (e.g. "0751135167" needs RO context to be recognized as +40751135167).
export function guessCountryFromUrl(url: string): CountryCode | undefined {
  try {
    const u = new URL(url);
    const host = u.hostname.toLowerCase();
    const tld = host.split(".").pop();
    const TLD_TO_COUNTRY: Record<string, CountryCode> = {
      ro: "RO", uk: "GB", de: "DE", fr: "FR", es: "ES", it: "IT", nl: "NL",
      pl: "PL", be: "BE", at: "AT", ch: "CH", pt: "PT", gr: "GR", hu: "HU",
      cz: "CZ", sk: "SK", se: "SE", no: "NO", dk: "DK", fi: "FI", ie: "IE",
      bg: "BG", hr: "HR", si: "SI", lt: "LT", lv: "LV", ee: "EE", md: "MD",
      ua: "UA", rs: "RS", us: "US", ca: "CA", au: "AU", nz: "NZ", in: "IN",
      jp: "JP", br: "BR", mx: "MX", ar: "AR", za: "ZA", tr: "TR", il: "IL",
    };
    return tld ? TLD_TO_COUNTRY[tld] : undefined;
  } catch {
    return undefined;
  }
}

function validatePhone(raw: string, defaultCountry?: CountryCode): string | null {
  if (!raw) return null;
  try {
    const direct = parsePhoneNumberFromString(raw);
    if (direct?.isValid()) return direct.number;
    if (defaultCountry) {
      const national = parsePhoneNumberFromString(raw, defaultCountry);
      if (national?.isValid()) return national.number;
    }
  } catch {}
  return null;
}

// Address extraction — three strategies tried in order (best signal first):
//   1. JSON-LD schema.org PostalAddress (used by professional sites with SEO)
//   2. <address> HTML element (semantic HTML, used by some CMS templates)
//   3. RO/EN street-prefix regex on stripped text (fallback for hand-built sites)
// Returns the first non-empty match. Capped at 200 chars for sanity.

function extractAddressFromJsonLd(html: string): string | null {
  const blocks = html.match(/<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi) || [];
  for (const block of blocks) {
    const inner = block.replace(/<script[^>]*>/i, "").replace(/<\/script>/i, "").trim();
    let parsed: any;
    try { parsed = JSON.parse(inner); } catch { continue; }
    // JSON-LD can be a single object, an array, or have @graph wrapping
    const items: any[] = Array.isArray(parsed)
      ? parsed
      : Array.isArray(parsed?.["@graph"]) ? parsed["@graph"] : [parsed];
    for (const item of items) {
      const addr = item?.address;
      if (!addr) continue;
      if (typeof addr === "string") return addr.trim().slice(0, 200);
      if (typeof addr === "object") {
        const parts = [addr.streetAddress, addr.addressLocality, addr.addressRegion, addr.postalCode, addr.addressCountry]
          .filter(p => typeof p === "string" && p.trim());
        if (parts.length) return parts.join(", ").slice(0, 200);
      }
    }
  }
  return null;
}

function extractAddressFromTag(html: string): string | null {
  const m = html.match(/<address[^>]*>([\s\S]{5,500}?)<\/address>/i);
  if (!m) return null;
  const cleaned = stripTags(m[1]);
  return cleaned ? cleaned.slice(0, 200) : null;
}

// Street-prefix heuristic. Tolerant on RO orthography (Soseaua/Soseua/Sos.,
// Bulevardul/B-dul/Bd., Strada/Str., Calea, Aleea, Splaiul, Piața/Piata).
// Optional Nr. + sector + city tail. Falls back to EN street types.
const RO_ADDRESS_RE = /(?:Strada|Str\.|Soseaua|Soseua|Sos\.|Bulevardul|B[- ]?dul|Bd\.|Calea|Aleea|Splaiul|Piața|Piata)\s+[A-Za-zŞŢÂÎĂşţâîă][^,\n]{2,60}(?:,\s*Nr\.?\s*\d+[A-Za-z]?)?(?:,\s*Sector(?:ul)?\s*\d)?(?:,\s*(?:Bucureşti|Bucuresti|București|[A-ZŞŢÂÎĂ][a-zşţâîă]+))?/i;
const EN_ADDRESS_RE = /\d+\s+[A-Z][a-zA-Z]{2,}(?:\s+[A-Z][a-zA-Z]+){0,3}\s+(?:Street|St\.?|Avenue|Ave\.?|Road|Rd\.?|Boulevard|Blvd\.?|Lane|Ln\.?|Drive|Dr\.?)(?:,\s*[A-Z][a-zA-Z]+)?(?:,\s*[A-Z]{2}\s*\d{4,6})?/;

function extractAddressFromText(text: string): string | null {
  const ro = text.match(RO_ADDRESS_RE);
  if (ro) return ro[0].trim().slice(0, 200);
  const en = text.match(EN_ADDRESS_RE);
  if (en) return en[0].trim().slice(0, 200);
  return null;
}

function extractAddress(html: string, text: string): string | null {
  return extractAddressFromJsonLd(html)
    || extractAddressFromTag(html)
    || extractAddressFromText(text);
}

function extractPhones(text: string, html: string, url: string): string[] {
  const country = guessCountryFromUrl(url);
  const collected: string[] = [];

  // tel: hrefs are gold — they're explicitly marked as phone numbers
  for (const m of html.matchAll(/href=["']tel:([^"']+)["']/gi)) {
    const validated = validatePhone(m[1].trim(), country);
    if (validated) collected.push(validated);
  }

  try {
    const found = findPhoneNumbersInText(text, country);
    for (const f of found) {
      if (f.number?.isValid()) collected.push(f.number.number);
    }
  } catch {}

  return uniq(collected).slice(0, 5);
}

export interface ScrapeResult {
  url: string;
  ok: boolean;
  name?: string | null;
  description?: string | null;
  address?: string | null;
  emails: string[];
  phones: string[];
  error?: string;
}

export async function fetchAndExtract(url: string, timeoutMs = 8000): Promise<ScrapeResult> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
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

    const phones = extractPhones(text, html, url);
    const address = extractAddress(html, text);

    return { url, ok: true, name, description, address, emails, phones };
  } catch (err: any) {
    clearTimeout(timer);
    return { url, ok: false, emails: [], phones: [], error: err?.name === "AbortError" ? "timeout" : "fetch_failed" };
  }
}
