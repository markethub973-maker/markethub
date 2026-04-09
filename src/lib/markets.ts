/**
 * Country / continent / language registry for the Lead Finder wizard.
 *
 * The wizard lets the user pick the target market explicitly so every
 * downstream AI call (analyze, message, campaign, marketing-advisor) can:
 *   1. Force the output language (no more silent auto-detect → English fallback)
 *   2. Recommend platforms popular in that exact market
 *   3. Build a free-text location label for legacy components and the
 *      `getMarketContext` fuzzy resolver in src/lib/marketContext.ts
 */

export type MarketScope = "country" | "multi_country" | "continent" | "worldwide";

export interface Country {
  code: string;          // ISO 3166-1 alpha-2 (e.g. "RO")
  name: string;          // English display name (matches marketContext keys)
  nativeName?: string;   // Optional native-language name shown in the UI
  flag: string;          // Emoji
  language: string;      // ISO 639-1 — primary content language
  continent: string;     // Continent code
  /** Channels that actually move volume in this country, ranked. */
  topPlatforms: string[];
}

export interface Continent {
  code: string;          // "EU", "NA", ...
  name: string;
  flag: string;
  defaultLanguage: string;
}

export const CONTINENTS: Continent[] = [
  { code: "EU", name: "Europe",          flag: "🇪🇺", defaultLanguage: "en" },
  { code: "NA", name: "North America",   flag: "🌎", defaultLanguage: "en" },
  { code: "SA", name: "South America",   flag: "🌎", defaultLanguage: "es" },
  { code: "AS", name: "Asia",            flag: "🌏", defaultLanguage: "en" },
  { code: "AF", name: "Africa",          flag: "🌍", defaultLanguage: "en" },
  { code: "OC", name: "Oceania",         flag: "🌏", defaultLanguage: "en" },
];

export const COUNTRIES: Country[] = [
  // Europe
  { code: "RO", name: "Romania",        nativeName: "România",        flag: "🇷🇴", language: "ro", continent: "EU",
    topPlatforms: ["Facebook", "Instagram", "WhatsApp", "TikTok", "OLX.ro", "Google Search"] },
  { code: "GB", name: "United Kingdom", nativeName: "United Kingdom", flag: "🇬🇧", language: "en", continent: "EU",
    topPlatforms: ["Instagram", "TikTok", "Facebook", "LinkedIn", "Google Search", "Gumtree"] },
  { code: "IE", name: "Ireland",        nativeName: "Éire",           flag: "🇮🇪", language: "en", continent: "EU",
    topPlatforms: ["Instagram", "Facebook", "TikTok", "LinkedIn", "Google Search"] },
  { code: "DE", name: "Germany",        nativeName: "Deutschland",    flag: "🇩🇪", language: "de", continent: "EU",
    topPlatforms: ["WhatsApp", "Instagram", "Facebook", "LinkedIn", "Google Search", "eBay Kleinanzeigen"] },
  { code: "FR", name: "France",         nativeName: "France",         flag: "🇫🇷", language: "fr", continent: "EU",
    topPlatforms: ["Instagram", "Facebook", "TikTok", "WhatsApp", "Le Bon Coin", "Google Search"] },
  { code: "IT", name: "Italy",          nativeName: "Italia",         flag: "🇮🇹", language: "it", continent: "EU",
    topPlatforms: ["Instagram", "WhatsApp", "Facebook", "TikTok", "Subito.it", "Google Search"] },
  { code: "ES", name: "Spain",          nativeName: "España",         flag: "🇪🇸", language: "es", continent: "EU",
    topPlatforms: ["Instagram", "WhatsApp", "TikTok", "Facebook", "Wallapop", "Google Search"] },
  { code: "PT", name: "Portugal",       nativeName: "Portugal",       flag: "🇵🇹", language: "pt", continent: "EU",
    topPlatforms: ["Instagram", "WhatsApp", "Facebook", "OLX.pt", "TikTok", "Google Search"] },
  { code: "NL", name: "Netherlands",    nativeName: "Nederland",      flag: "🇳🇱", language: "nl", continent: "EU",
    topPlatforms: ["Instagram", "WhatsApp", "LinkedIn", "Facebook", "Marktplaats", "Google Search"] },
  { code: "BE", name: "Belgium",        nativeName: "België",         flag: "🇧🇪", language: "fr", continent: "EU",
    topPlatforms: ["Facebook", "Instagram", "WhatsApp", "LinkedIn", "2dehands", "Google Search"] },
  { code: "AT", name: "Austria",        nativeName: "Österreich",     flag: "🇦🇹", language: "de", continent: "EU",
    topPlatforms: ["WhatsApp", "Instagram", "Facebook", "LinkedIn", "willhaben.at", "Google Search"] },
  { code: "CH", name: "Switzerland",    nativeName: "Schweiz",        flag: "🇨🇭", language: "de", continent: "EU",
    topPlatforms: ["WhatsApp", "Instagram", "LinkedIn", "Facebook", "Ricardo.ch", "Google Search"] },
  { code: "PL", name: "Poland",         nativeName: "Polska",         flag: "🇵🇱", language: "pl", continent: "EU",
    topPlatforms: ["Facebook", "Instagram", "WhatsApp", "TikTok", "OLX.pl", "Allegro"] },
  { code: "HU", name: "Hungary",        nativeName: "Magyarország",   flag: "🇭🇺", language: "hu", continent: "EU",
    topPlatforms: ["Facebook", "Instagram", "TikTok", "Jófogás", "Google Search"] },
  { code: "BG", name: "Bulgaria",       nativeName: "България",       flag: "🇧🇬", language: "bg", continent: "EU",
    topPlatforms: ["Facebook", "Instagram", "Viber", "TikTok", "OLX.bg", "Google Search"] },
  { code: "GR", name: "Greece",         nativeName: "Ελλάδα",         flag: "🇬🇷", language: "el", continent: "EU",
    topPlatforms: ["Instagram", "Facebook", "Viber", "TikTok", "Google Search"] },
  { code: "CZ", name: "Czechia",        nativeName: "Česko",          flag: "🇨🇿", language: "cs", continent: "EU",
    topPlatforms: ["Facebook", "Instagram", "WhatsApp", "TikTok", "Sbazar.cz", "Google Search"] },
  { code: "SE", name: "Sweden",         nativeName: "Sverige",        flag: "🇸🇪", language: "sv", continent: "EU",
    topPlatforms: ["Instagram", "Facebook", "TikTok", "LinkedIn", "Blocket", "Google Search"] },
  { code: "NO", name: "Norway",         nativeName: "Norge",          flag: "🇳🇴", language: "no", continent: "EU",
    topPlatforms: ["Instagram", "Facebook", "TikTok", "LinkedIn", "Finn.no", "Google Search"] },
  { code: "DK", name: "Denmark",        nativeName: "Danmark",        flag: "🇩🇰", language: "da", continent: "EU",
    topPlatforms: ["Facebook", "Instagram", "TikTok", "LinkedIn", "DBA.dk", "Google Search"] },
  { code: "FI", name: "Finland",        nativeName: "Suomi",          flag: "🇫🇮", language: "fi", continent: "EU",
    topPlatforms: ["Instagram", "Facebook", "WhatsApp", "Tori.fi", "LinkedIn", "Google Search"] },

  // North America
  { code: "US", name: "United States",  nativeName: "United States",  flag: "🇺🇸", language: "en", continent: "NA",
    topPlatforms: ["Instagram", "TikTok", "Facebook", "LinkedIn", "Google Search", "Reddit"] },
  { code: "CA", name: "Canada",         nativeName: "Canada",         flag: "🇨🇦", language: "en", continent: "NA",
    topPlatforms: ["Instagram", "Facebook", "TikTok", "LinkedIn", "Kijiji", "Google Search"] },
  { code: "MX", name: "Mexico",         nativeName: "México",         flag: "🇲🇽", language: "es", continent: "NA",
    topPlatforms: ["WhatsApp", "Facebook", "Instagram", "TikTok", "Mercado Libre", "Google Search"] },

  // South America
  { code: "BR", name: "Brazil",         nativeName: "Brasil",         flag: "🇧🇷", language: "pt", continent: "SA",
    topPlatforms: ["WhatsApp", "Instagram", "TikTok", "Facebook", "Mercado Livre", "Google Search"] },
  { code: "AR", name: "Argentina",      nativeName: "Argentina",      flag: "🇦🇷", language: "es", continent: "SA",
    topPlatforms: ["WhatsApp", "Instagram", "Facebook", "TikTok", "Mercado Libre", "Google Search"] },
  { code: "CL", name: "Chile",          nativeName: "Chile",          flag: "🇨🇱", language: "es", continent: "SA",
    topPlatforms: ["WhatsApp", "Instagram", "Facebook", "TikTok", "Mercado Libre", "Google Search"] },
  { code: "CO", name: "Colombia",       nativeName: "Colombia",       flag: "🇨🇴", language: "es", continent: "SA",
    topPlatforms: ["WhatsApp", "Facebook", "Instagram", "TikTok", "Mercado Libre", "Google Search"] },

  // Asia
  { code: "IN", name: "India",          nativeName: "India",          flag: "🇮🇳", language: "en", continent: "AS",
    topPlatforms: ["WhatsApp", "Instagram", "YouTube", "Facebook", "Flipkart", "Google Search"] },
  { code: "JP", name: "Japan",          nativeName: "日本",           flag: "🇯🇵", language: "ja", continent: "AS",
    topPlatforms: ["LINE", "Twitter/X", "Instagram", "YouTube", "Mercari", "Google Search"] },
  { code: "KR", name: "South Korea",    nativeName: "대한민국",       flag: "🇰🇷", language: "ko", continent: "AS",
    topPlatforms: ["KakaoTalk", "Naver", "Instagram", "YouTube", "Coupang", "Google Search"] },
  { code: "SG", name: "Singapore",      nativeName: "Singapore",      flag: "🇸🇬", language: "en", continent: "AS",
    topPlatforms: ["WhatsApp", "Instagram", "TikTok", "Facebook", "Carousell", "Google Search"] },
  { code: "AE", name: "United Arab Emirates", nativeName: "الإمارات", flag: "🇦🇪", language: "ar", continent: "AS",
    topPlatforms: ["WhatsApp", "Instagram", "TikTok", "Snapchat", "Dubizzle", "Google Search"] },
  { code: "SA", name: "Saudi Arabia",   nativeName: "السعودية",       flag: "🇸🇦", language: "ar", continent: "AS",
    topPlatforms: ["WhatsApp", "Snapchat", "Instagram", "TikTok", "Haraj", "Google Search"] },
  { code: "TR", name: "Turkey",         nativeName: "Türkiye",        flag: "🇹🇷", language: "tr", continent: "AS",
    topPlatforms: ["WhatsApp", "Instagram", "TikTok", "Facebook", "Sahibinden", "Google Search"] },

  // Africa
  { code: "ZA", name: "South Africa",   nativeName: "South Africa",   flag: "🇿🇦", language: "en", continent: "AF",
    topPlatforms: ["WhatsApp", "Facebook", "Instagram", "TikTok", "Gumtree", "Google Search"] },
  { code: "EG", name: "Egypt",          nativeName: "مصر",            flag: "🇪🇬", language: "ar", continent: "AF",
    topPlatforms: ["Facebook", "WhatsApp", "Instagram", "TikTok", "OLX.com.eg", "Google Search"] },
  { code: "NG", name: "Nigeria",        nativeName: "Nigeria",        flag: "🇳🇬", language: "en", continent: "AF",
    topPlatforms: ["WhatsApp", "Facebook", "Instagram", "TikTok", "Jiji", "Google Search"] },

  // Oceania
  { code: "AU", name: "Australia",      nativeName: "Australia",      flag: "🇦🇺", language: "en", continent: "OC",
    topPlatforms: ["Instagram", "Facebook", "TikTok", "LinkedIn", "Gumtree", "Google Search"] },
  { code: "NZ", name: "New Zealand",    nativeName: "New Zealand",    flag: "🇳🇿", language: "en", continent: "OC",
    topPlatforms: ["Instagram", "Facebook", "TikTok", "LinkedIn", "Trade Me", "Google Search"] },
];

export interface Language {
  code: string;
  name: string;       // English name
  nativeName: string; // Native name
}

export const LANGUAGES: Language[] = [
  { code: "en", name: "English",     nativeName: "English" },
  { code: "ro", name: "Romanian",    nativeName: "Română" },
  { code: "de", name: "German",      nativeName: "Deutsch" },
  { code: "fr", name: "French",      nativeName: "Français" },
  { code: "it", name: "Italian",     nativeName: "Italiano" },
  { code: "es", name: "Spanish",     nativeName: "Español" },
  { code: "pt", name: "Portuguese",  nativeName: "Português" },
  { code: "nl", name: "Dutch",       nativeName: "Nederlands" },
  { code: "pl", name: "Polish",      nativeName: "Polski" },
  { code: "hu", name: "Hungarian",   nativeName: "Magyar" },
  { code: "bg", name: "Bulgarian",   nativeName: "Български" },
  { code: "el", name: "Greek",       nativeName: "Ελληνικά" },
  { code: "cs", name: "Czech",       nativeName: "Čeština" },
  { code: "sv", name: "Swedish",     nativeName: "Svenska" },
  { code: "no", name: "Norwegian",   nativeName: "Norsk" },
  { code: "da", name: "Danish",      nativeName: "Dansk" },
  { code: "fi", name: "Finnish",     nativeName: "Suomi" },
  { code: "ja", name: "Japanese",    nativeName: "日本語" },
  { code: "ko", name: "Korean",      nativeName: "한국어" },
  { code: "ar", name: "Arabic",      nativeName: "العربية" },
  { code: "tr", name: "Turkish",     nativeName: "Türkçe" },
];

export function getCountryByCode(code?: string | null): Country | undefined {
  if (!code) return undefined;
  return COUNTRIES.find(c => c.code === code);
}

export function getLanguageByCode(code?: string | null): Language | undefined {
  if (!code) return undefined;
  return LANGUAGES.find(l => l.code === code);
}

export function getContinentByCode(code?: string | null): Continent | undefined {
  if (!code) return undefined;
  return CONTINENTS.find(c => c.code === code);
}

/**
 * Build a free-text location label from the structured selection.
 * The label is consumed by:
 *   - the legacy display chips ("📍 Romania")
 *   - getMarketContext fuzzy resolver (matches "romania" → Europe/Bucharest tz)
 *   - the existing API contract that still ships a `location` field
 */
export function buildLocationLabel(opts: {
  scope: MarketScope;
  country?: string;
  countries?: string[];
  continent?: string;
  region?: string;
}): string {
  const { scope, country, countries, continent, region } = opts;
  if (scope === "country") {
    const c = getCountryByCode(country);
    if (!c) return region || "";
    return region ? `${region}, ${c.name}` : c.name;
  }
  if (scope === "multi_country") {
    const names = (countries || []).map(code => getCountryByCode(code)?.name).filter(Boolean) as string[];
    return names.join(", ");
  }
  if (scope === "continent") {
    return getContinentByCode(continent)?.name || "";
  }
  return ""; // worldwide
}

/**
 * Pretty country list for a continent — ordered alphabetically by display name.
 */
export function countriesForContinent(continentCode: string): Country[] {
  return COUNTRIES.filter(c => c.continent === continentCode)
    .sort((a, b) => a.name.localeCompare(b.name));
}

/**
 * The list of platforms recommended for a given target market.
 * Used by the AI prompts to bias channel selection toward what actually
 * works in that country (Romania → no point recommending Reddit).
 */
export function recommendedPlatforms(opts: {
  scope: MarketScope;
  country?: string;
  countries?: string[];
  continent?: string;
}): string[] {
  const { scope, country, countries, continent } = opts;
  if (scope === "country") return getCountryByCode(country)?.topPlatforms ?? [];
  if (scope === "multi_country") {
    // Union of top platforms across the picked countries, deduped, capped.
    const set = new Set<string>();
    (countries || []).forEach(code => {
      getCountryByCode(code)?.topPlatforms.forEach(p => set.add(p));
    });
    return [...set].slice(0, 8);
  }
  if (scope === "continent") {
    const set = new Set<string>();
    countriesForContinent(continent || "").forEach(c => {
      c.topPlatforms.slice(0, 3).forEach(p => set.add(p));
    });
    return [...set].slice(0, 8);
  }
  return [];
}

/**
 * Romanian grammar block — included in any system prompt that ships
 * `content_language === "ro"`. Mirrors the rules from
 * src/app/api/leads/email/draft/route.ts where we already verified e2e
 * that this guidance produces correct diacritics + formal address.
 */
export const RO_LANGUAGE_RULES = `CRITICAL — Romanian language rules (apply to every Romanian sentence you write):
- ALWAYS use proper diacritics: ă, â, î, ș, ț. Never strip them. Never substitute look-alikes (s/t for ș/ț, a for ă/â).
- Common verb conjugations to get RIGHT (these are frequently messed up):
  * "I see" = "Văd" (NEVER "Ved", NEVER "Vad")
  * "I noticed" = "Am observat" or "Am văzut"
  * "I think" = "Cred" (NEVER "Cret")
- GENDER-AWARE marriage verbs (one of the most common AI mistakes — be very careful):
  * For a MAN getting married: "te însori" / "se însoară" / "vă însurați" (NEVER "te măriți", NEVER "te măritezi")
  * For a WOMAN getting married: "te măriți" / "se mărită" / "vă măritați" (NEVER "te măritezi" — that word DOES NOT EXIST in Romanian)
  * Gender-neutral safe form (use when name/gender is unclear): "te căsătorești" / "se căsătorește" / "vă căsătoriți" — works for both, NEVER wrong
  * Detect gender from the lead's name when possible (Mihai/Andrei/Cristian/Bogdan/Vlad/Răzvan/Alexandru/Ionuț/George/Florin = M; Maria/Ana/Elena/Ioana/Andreea/Bianca/Cristina/Diana/Alexandra = F). If uncertain, use the neutral "te căsătorești" form — never guess.
  * "Mariaj" is a noun, not a verb — never conjugate it.
- Use FORMAL second person (politețe) consistently throughout the entire text — pick ONE register and stick with it:
  * "dumneavoastră" / "vă" / "ați" / "sunteți" — NEVER mix with informal "tu" / "te" / "ai" / "ești"
  * Verbs must agree with the formal pronoun: "Ați fi deschis(ă) la o conversație?" NOT "Ar fi deschis la o conversație?"
  * Adjectives agree in gender with the addressee: assume neutral/masculine if unknown.
  * EXCEPTION — casual platforms (Reddit, Facebook Groups for couples planning weddings/baptisms, Instagram DM): the informal "tu/te" register is more natural. Pick the register that matches the platform context, then stick with it.
- DO NOT INVENT music/tech/marketing jargon. When describing the offer to a prospect, use the EXACT terms the user provided in the offer description. NEVER invent compound adjectives like "live bilingv", "live trilingv", "audio premium", "experiență multilingvă" if those words are not in the offer description. Use the user's own phrasing verbatim. Example: if the offer says "cover internațional, cover românesc, muzică grecească", write exactly "cover internațional, cover românesc și un program grecesc" — not "live bilingv" or "muzică multilingvă". Similarly, do not paraphrase technical equipment names: if the offer says "mașină fum greu (gheață carbonică)", say "mașină de fum greu cu gheață carbonică", not "efecte ceață premium".
- Greetings: "Bună ziua," is the formal B2B greeting. Use "Salut," only for explicitly casual contexts.
- Question marks and Romanian punctuation are mandatory.
Before returning, re-read every Romanian sentence and verify: (1) diacritics, (2) verb agreement, (3) gender-correct marriage verbs (or neutral "căsătorești"), (4) zero invented jargon — only the user's own phrasing for offer details.`;

/**
 * Builds the language enforcement block to inject in every system prompt.
 * If content_language is provided, language is forced. If it's missing,
 * we fall back to the legacy auto-detect behavior so existing callers
 * keep working unchanged.
 */
export function buildLanguageInstruction(contentLanguage?: string | null): string {
  const lang = getLanguageByCode(contentLanguage || undefined);
  if (!lang) {
    return `Detect the language of the user's input and respond in that same language. Never switch languages mid-response.`;
  }
  const ro = lang.code === "ro" ? `\n\n${RO_LANGUAGE_RULES}` : "";
  return `LANGUAGE — hard requirement: write the ENTIRE output in ${lang.name} (${lang.nativeName}). This is a non-negotiable instruction set by the user. Do NOT auto-detect, do NOT default to English, do NOT switch languages mid-response. Every sentence, every label, every CTA must be in ${lang.name}.${ro}`;
}
