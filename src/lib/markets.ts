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
 * Per-language vocabulary & grammar packs. Injected into every AI system
 * prompt that targets that language. Romanian has the most polished pack
 * (it's the priority language for the first big test); others get a
 * focused starter pack covering: address register, common pitfalls,
 * special chars, and the universal "do not invent jargon" rule.
 *
 * MANDATORY for every AI agent on the platform — wired through
 * buildLanguageInstruction() so any route that calls Anthropic gets
 * the right pack automatically when content_language is set.
 */
export const LANGUAGE_RULES: Record<string, string> = {
  ro: RO_LANGUAGE_RULES,

  en: `CRITICAL — English language rules:
- Use natural, contemporary English. Avoid corporate jargon ("synergy", "leverage", "circle back", "touch base").
- Pick a register and stick with it: friendly-direct for B2C / Reddit / FB Groups / DMs; polite-professional for B2B / cold email / LinkedIn. Never mix.
- Contractions ("I'm", "you're", "we'd") are fine and natural in casual contexts; avoid in formal cold email.
- Title-case headlines and CTAs only when stylistically appropriate; otherwise sentence case.
- Match British vs American spelling to the target market: GB/IE/AU/NZ → "organisation", "colour", "centre"; US/CA → "organization", "color", "center".
- DO NOT INVENT product or technical jargon. Use the EXACT terms from the user's offer description (e.g., if the offer says "live vocalist", do not paraphrase as "premium audio talent" or "bilingual live experience"). Use the user's own phrasing verbatim.
- One question, not three. End with a soft, single CTA — never a wall of asks.
Before returning, re-read every sentence and verify: (1) consistent register, (2) zero corporate clichés, (3) zero invented jargon — only the user's own phrasing for offer details.`,

  es: `CRITICAL — Spanish language rules:
- ALWAYS use proper Spanish punctuation: opening ¿ and ¡ on every question/exclamation. Use accents (á, é, í, ó, ú, ü, ñ) on every word that needs them.
- Pick the register and stick with it. By default for cold outreach use FORMAL "usted/ustedes" with all verbs/possessives agreeing ("le envío", "su empresa", "¿le interesaría?"). EXCEPTION — casual platforms (Reddit, FB Groups, Instagram DMs) and the LATAM markets where "tú/vos" is more natural socially: use informal but consistently.
- Latin America vs Spain: in Spain "vosotros" / "os" is normal; in LATAM use "ustedes" for plural always. Match the target country.
- Argentina/Uruguay use "vos" + voseo conjugations ("vos tenés", not "tú tienes") when writing for AR/UY casual contexts.
- Common verb traps: "ser" vs "estar" (permanent vs temporary state), "por" vs "para" (cause vs purpose). Get them right.
- DO NOT invent product/tech jargon. Use the EXACT terms from the user's offer description (no "experiencia premium" if the offer just says "DJ + cantante"). Use the user's own phrasing verbatim.
- "Quedo a su disposición" / "Quedo atento(a)" are natural sign-offs; avoid corporate fluff like "Aprovecho la oportunidad para...".
Before returning, re-read every sentence and verify: (1) accents and ¿¡ punctuation, (2) consistent register, (3) zero invented jargon.`,

  fr: `CRITICAL — French language rules:
- ALWAYS use proper diacritics: à, â, ç, é, è, ê, ë, î, ï, ô, ù, û, ü, ÿ. Never strip them.
- Use FORMAL "vous" by default for cold outreach — never mix "tu" and "vous" in the same message. EXCEPTION: Reddit, Discord, Insta DMs targeting young consumers may use "tu" if consistently.
- French typography: non-breaking space before : ; ! ? » and after «. "Bonjour, ..." not "Bonjour ,...". French quotation marks « like this » when stylistically appropriate.
- Common pitfalls: agreement of past participles with "avoir" + preceding direct object; subjunctive after "il faut que"; "c'est" vs "il est".
- Professional greetings: "Bonjour Madame/Monsieur," (B2B), "Bonjour [Prénom]," (B2C casual). Avoid "Cher/Chère" unless deeply personal.
- Sign-offs: "Bien cordialement," "Cordialement," — never "Sincerely" translated literally.
- DO NOT invent product/tech jargon. Use the EXACT terms from the user's offer description. Never paraphrase ("DJ live" → don't write "ambiance sonore premium"). Use the user's own phrasing verbatim.
Before returning, re-read every sentence and verify: (1) diacritics, (2) consistent vous/tu, (3) typographic spacing, (4) zero invented jargon.`,

  de: `CRITICAL — German language rules:
- ALWAYS use proper umlauts (ä, ö, ü) and ß. Never substitute "ae/oe/ue/ss" unless the user explicitly asks (some Swiss contexts drop ß for ss — match country: AT/DE → ß, CH → ss).
- Use FORMAL "Sie / Ihnen / Ihr" by default for cold outreach. ALL formal pronouns and possessives must be capitalized mid-sentence ("Ich freue mich, von Ihnen zu hören"). Never mix with informal "du / dich / dein" in the same message. EXCEPTION: casual platforms (Reddit, Discord, IG DMs targeting youth) may use "du" if consistently lowercase.
- Compound nouns: write them as ONE word ("Hochzeitsmusik", not "Hochzeit Musik"). Capitalize ALL nouns mid-sentence.
- Common pitfalls: case agreement (nominative/accusative/dative/genitive) on every article and adjective; verb-second word order in main clauses; verb-final in subordinate clauses.
- Greetings: "Sehr geehrte Frau / Sehr geehrter Herr [Nachname]," (formal B2B), "Hallo [Vorname]," (casual). "Guten Tag" works in both.
- Sign-offs: "Mit freundlichen Grüßen," (formal), "Viele Grüße," (semi-formal), "Beste Grüße," (modern professional).
- DO NOT invent product/tech jargon. Use the EXACT terms from the user's offer description. Never paraphrase. Use the user's own phrasing verbatim.
Before returning, re-read every sentence and verify: (1) umlauts and ß, (2) noun capitalization, (3) consistent Sie/du, (4) case agreement, (5) zero invented jargon.`,

  it: `CRITICAL — Italian language rules:
- ALWAYS use proper accents: à, è, é, ì, ò, ù. Never strip them. The difference between "è" (is) and "e" (and) is mandatory.
- Use FORMAL "Lei" (capitalized for politeness) by default for cold outreach. All verbs/pronouns agree with 3rd person singular ("Le scrivo", "La ringrazio", "se Le interessasse"). Never mix with "tu". EXCEPTION: Reddit, IG DMs targeting youth may use "tu" if consistently.
- Common pitfalls: gender agreement on every adjective and past participle; subjunctive after "se" + hypothetical; elision ("l'ho" not "lo ho").
- Apostrophes: "un'amica" (feminine elision before vowel), "un amico" (no apostrophe — masculine).
- Greetings: "Buongiorno [Nome/Cognome]," (formal), "Salve [Nome]," (neutral-formal), "Ciao [Nome]," (casual only).
- Sign-offs: "Cordiali saluti," (formal), "Un caro saluto," (warm professional). Avoid "Distinti saluti" — sounds cold.
- DO NOT invent product/tech jargon. Use the EXACT terms from the user's offer description. Never paraphrase. Use the user's own phrasing verbatim.
Before returning, re-read every sentence and verify: (1) accents, (2) Lei capitalization and consistency, (3) gender agreement, (4) zero invented jargon.`,

  el: `CRITICAL — Greek language rules:
- Write ALL Greek text in the Greek alphabet (Ελληνικά). Never use Greeklish (Latin transliteration) — it looks unprofessional.
- ALWAYS include the tonic mark (τόνος) on every word that needs one: ά, έ, ή, ί, ό, ύ, ώ. Also use diaeresis ϊ, ϋ, ΐ, ΰ where required.
- Use FORMAL plural "εσείς / σας" by default for cold outreach (the polite form). All verbs in 2nd person plural ("σας γράφω", "θα σας ενδιέφερε;"). Never mix with informal "εσύ / σε / σου". EXCEPTION: casual platforms (Reddit, IG DMs targeting youth) may use singular "εσύ" if consistently.
- Greek question mark is ";" (semicolon character), NOT "?". Greek period is "." but the upper dot "·" replaces the semicolon. Use them correctly.
- Greetings: "Καλησπέρα σας," (formal afternoon/evening), "Καλημέρα σας," (formal morning), "Γεια σας," (neutral). "Γεια σου" is informal singular only.
- Sign-offs: "Με εκτίμηση," (with appreciation, formal), "Φιλικά," (warmly, semi-formal).
- DO NOT invent product/tech jargon. Use the EXACT terms from the user's offer description. If the user's offer is in another language, translate accurately but do not embellish. Use the user's own phrasing verbatim where possible.
Before returning, re-read every sentence and verify: (1) Greek alphabet only (no Greeklish), (2) tonic marks, (3) consistent εσείς/εσύ register, (4) Greek question mark ";", (5) zero invented jargon.`,

  pt: `CRITICAL — Portuguese language rules:
- ALWAYS use proper diacritics: á, à, â, ã, ç, é, ê, í, ó, ô, õ, ú. Never strip them.
- Brazilian (BR) vs European (PT) Portuguese: pick one and stick with it based on the target country. BR → "você" is normal even in business contexts. PT → "você" can sound distant; use formal address with the person's title or "o senhor / a senhora" + 3rd person verb.
- BR-specific: gerund forms ("estou fazendo"), "tu" rarely used outside the south. PT-specific: present continuous uses "estar a + infinitive" ("estou a fazer"), preserve the "tu" in informal contexts.
- Common pitfalls: nasal vowels (ã, õ); gender agreement; "haver" vs "ter" (BR uses "tem" for existential, PT uses "há").
- Greetings: "Bom dia," / "Boa tarde," / "Boa noite," + name. "Olá [Nome]," for casual.
- Sign-offs: "Cumprimentos," (formal), "Com os melhores cumprimentos," (very formal), "Abraço," (warm casual, BR).
- DO NOT invent product/tech jargon. Use the EXACT terms from the user's offer description. Use the user's own phrasing verbatim.
Before returning, re-read every sentence and verify: (1) diacritics, (2) BR vs PT consistency, (3) gender agreement, (4) zero invented jargon.`,

  pl: `CRITICAL — Polish language rules:
- ALWAYS use proper Polish characters: ą, ć, ę, ł, ń, ó, ś, ź, ż. Never substitute Latin look-alikes.
- Use FORMAL "Pan / Pani" + 3rd person verb by default for cold outreach ("Pan widzi", "czy zechciałby Pan...?"). Never address strangers with "ty". EXCEPTION: casual platforms (Reddit, FB groups for hobbies) may use "ty" if consistently.
- Polish has 7 grammatical cases — every noun, adjective, and pronoun must agree. Get the case right: "dziękuję Panu" (dative), "spotkanie z Panem" (instrumental).
- Common pitfalls: aspect of verbs (perfective vs imperfective) — pick the right one for the meaning. Negation triggers genitive case ("nie mam czasu", not "nie mam czas").
- Greetings: "Dzień dobry Panu / Pani [Nazwisko]," (formal), "Witam Pana / Panią," (neutral but slightly cold), "Cześć [Imię]," (casual only).
- Sign-offs: "Z poważaniem," (formal), "Pozdrawiam serdecznie," (warm professional), "Pozdrawiam," (neutral).
- DO NOT invent product/tech jargon. Use the EXACT terms from the user's offer description. Use the user's own phrasing verbatim.
Before returning, re-read every sentence and verify: (1) Polish diacritics, (2) consistent Pan/Pani register, (3) case agreement, (4) zero invented jargon.`,

  hu: `CRITICAL — Hungarian language rules:
- ALWAYS use proper Hungarian characters: á, é, í, ó, ö, ő, ú, ü, ű. Never confuse ö/ő or ü/ű — they're DIFFERENT vowels with different meanings.
- Use FORMAL "Ön / Önök" + 3rd person verb by default ("látom" → "Ön látja", "köszönöm Önnek"). Never mix with informal "te / ti". EXCEPTION: casual platforms / younger audiences may use "te" if consistently.
- Hungarian is agglutinative — suffixes pile up on nouns and verbs. Get vowel harmony right: front-vowel words take front-vowel suffixes ("kertben"), back-vowel words take back-vowel suffixes ("házban").
- Common pitfalls: definite vs indefinite conjugation ("látok egy embert" vs "látom az embert"); possessive suffixes ("a házam" = my house, no separate possessive pronoun needed).
- Family name comes BEFORE given name in Hungarian usage ("Kovács Péter"), but in business email salutations the international order is also accepted.
- Greetings: "Tisztelt [Vezetéknév] Úr / Hölgyem," (formal), "Kedves [Keresztnév]," (warm neutral), "Szia [Keresztnév]," (casual only).
- Sign-offs: "Tisztelettel," (formal), "Üdvözlettel," (neutral professional).
- DO NOT invent product/tech jargon. Use the EXACT terms from the user's offer description. Use the user's own phrasing verbatim.
Before returning, re-read every sentence and verify: (1) ő/ű distinction, (2) Ön/te consistency, (3) vowel harmony in suffixes, (4) zero invented jargon.`,

  bg: `CRITICAL — Bulgarian language rules:
- Write ALL Bulgarian text in CYRILLIC alphabet. Never use Latin transliteration ("shlyokavitsa") in business writing — it looks unprofessional.
- Use FORMAL "Вие / Ви" (capitalized as a sign of politeness) by default for cold outreach. All verbs in 2nd person plural ("Виждам, че Вие..."). Never mix with informal "ти / те". EXCEPTION: casual platforms (FB groups, Reddit translations) may use "ти" if consistently.
- Bulgarian has no infinitive — use "да" + present tense to express it ("искам да Ви питам", not a single-word infinitive).
- Definite article is a SUFFIX attached to the noun ("къщата" = the house), not a separate word. Get this right.
- Common pitfalls: gender agreement on adjectives; aspect of verbs (perfective vs imperfective); reflexive "се" placement.
- Greetings: "Здравейте, г-н / г-жа [Фамилия]," (formal), "Добър ден," (formal neutral), "Здрасти," (casual only).
- Sign-offs: "С уважение," (with respect, formal), "Поздрави," (regards, neutral).
- DO NOT invent product/tech jargon. Use the EXACT terms from the user's offer description. Use the user's own phrasing verbatim.
Before returning, re-read every sentence and verify: (1) Cyrillic only, (2) Вие capitalization and consistency, (3) gender agreement, (4) zero invented jargon.`,

  nl: `CRITICAL — Dutch language rules:
- Use FORMAL "u / uw" by default for cold outreach (Netherlands business culture is more egalitarian than DE/FR but "u" is still standard for first contact). Never mix with informal "je / jij / jouw" in the same message. EXCEPTION: explicitly casual contexts and younger audiences accept "je" if consistently.
- Belgium (Flemish) tends to stay more formal longer than Netherlands; calibrate to country.
- Common pitfalls: separable verbs ("opbellen" → "ik bel je op"); word order in subordinate clauses (verb at the end); "de" vs "het" article (memorize per noun).
- Diminutives ("-je", "-tje", "-pje") are extremely common and warm but make the word neuter — articles change accordingly.
- Greetings: "Geachte heer / mevrouw [Achternaam]," (formal), "Beste [Voornaam]," (neutral professional, very common), "Hoi [Voornaam]," (casual).
- Sign-offs: "Met vriendelijke groet," (standard professional), "Hartelijke groet," (warm), "Groet," (very casual).
- DO NOT invent product/tech jargon. Use the EXACT terms from the user's offer description. Use the user's own phrasing verbatim.
Before returning, re-read every sentence and verify: (1) consistent u/je register, (2) word order, (3) zero invented jargon.`,

  cs: `CRITICAL — Czech language rules:
- ALWAYS use proper Czech characters: á, č, ď, é, ě, í, ň, ó, ř, š, ť, ú, ů, ý, ž. The ř is unique to Czech — never substitute.
- Use FORMAL "vy / Vám / Váš" (capitalized as politeness) by default. All verbs in 2nd person plural even when addressing one person ("Vidím, že jste..."). Never mix with informal "ty". EXCEPTION: casual platforms / hobby groups may use "ty" if consistently.
- Czech has 7 cases — every noun, adjective, and pronoun must agree. Get the case right.
- Common pitfalls: aspect of verbs (perfective vs imperfective); animate vs inanimate masculine declension; clitic word order (short pronouns go in the second slot).
- Greetings: "Vážený pane / Vážená paní [Příjmení]," (formal), "Dobrý den," (universal polite), "Ahoj [Jméno]," (casual only).
- Sign-offs: "S pozdravem," (formal standard), "S přátelským pozdravem," (warm professional).
- DO NOT invent product/tech jargon. Use the EXACT terms from the user's offer description. Use the user's own phrasing verbatim.
Before returning, re-read every sentence and verify: (1) Czech diacritics, (2) Vy capitalization and consistency, (3) case agreement, (4) zero invented jargon.`,

  sv: `CRITICAL — Swedish language rules:
- ALWAYS use proper Swedish characters: å, ä, ö. Never substitute "a/o".
- Swedish business culture is INFORMAL and egalitarian — use "du" by default even in cold B2B outreach. The formal "ni" is rare and can sound distant or sarcastic in modern usage. EXCEPTION: very traditional finance/legal/government contexts may still use "ni".
- Common pitfalls: "en" vs "ett" articles (memorize per noun); definite form is a suffix ("huset" = the house); v2 word order in main clauses.
- Compound nouns: write as one word ("bröllopsmusik", not "bröllops musik"). Splitting them is a common error and changes meaning.
- Greetings: "Hej [Förnamn]," (universal — works for casual AND business), "Hej!," (very casual).
- Sign-offs: "Med vänlig hälsning," (MVH, standard professional), "Vänliga hälsningar," (warm), "Hälsningar," (casual).
- DO NOT invent product/tech jargon. Use the EXACT terms from the user's offer description. Use the user's own phrasing verbatim.
Before returning, re-read every sentence and verify: (1) å/ä/ö, (2) du register (not ni), (3) compound nouns joined, (4) zero invented jargon.`,

  da: `CRITICAL — Danish language rules:
- ALWAYS use proper Danish characters: æ, ø, å. Never substitute.
- Danish business culture is INFORMAL — use "du" by default even in B2B cold outreach. Formal "De" is archaic and rarely used outside the royal family.
- Common pitfalls: "en" vs "et" articles; definite form is a suffix ("huset"); glottal stop (stød) marks meaning differences in speech but not writing.
- Compound nouns: write as one word ("bryllupsmusik"). Splitting them is a common Danglish error.
- Greetings: "Hej [Fornavn]," (universal), "Kære [Fornavn]," (warm).
- Sign-offs: "Med venlig hilsen," (MVH, standard), "Venlig hilsen," (neutral), "Bedste hilsner," (warm).
- DO NOT invent product/tech jargon. Use the EXACT terms from the user's offer description. Use the user's own phrasing verbatim.
Before returning, re-read every sentence and verify: (1) æ/ø/å, (2) du register, (3) compound nouns joined, (4) zero invented jargon.`,

  no: `CRITICAL — Norwegian language rules:
- ALWAYS use proper Norwegian characters: æ, ø, å. Never substitute.
- Bokmål is the default written form for business outreach. Nynorsk is rarer; only use if explicitly requested or targeting a Nynorsk-region.
- Norwegian business culture is INFORMAL — use "du" by default. The formal "De" is archaic.
- Common pitfalls: "en/et/ei" articles (three genders, though feminine "ei" is optional and can be replaced with "en"); definite form is a suffix.
- Compound nouns: write as one word.
- Greetings: "Hei [Fornavn]," (universal), "Hallo," (casual).
- Sign-offs: "Med vennlig hilsen," (MVH, standard), "Vennlig hilsen," (neutral), "Beste hilsen," (warm).
- DO NOT invent product/tech jargon. Use the EXACT terms from the user's offer description. Use the user's own phrasing verbatim.
Before returning, re-read every sentence and verify: (1) æ/ø/å, (2) du register, (3) compound nouns, (4) zero invented jargon.`,

  fi: `CRITICAL — Finnish language rules:
- ALWAYS use proper Finnish characters: ä, ö. Never substitute "a/o" — they are completely different vowels in Finnish.
- Finnish business culture is moderately INFORMAL — "sinä / sinun" (informal) is standard for most cold outreach to individuals. The formal "Te / Teidän" exists but is reserved for very traditional contexts (law firms, government letters, addressing much older people). When in doubt, "sinä" is safer than sounding stiff.
- Finnish is agglutinative with 15 grammatical cases — suffixes encode meaning ("talossa" = in the house). Get vowel harmony right: front-vowel words take front-vowel suffixes (ä/ö/y), back-vowel words take back-vowel suffixes (a/o/u).
- Common pitfalls: consonant gradation (k/p/t alternations like "katto" → "katon"); partitive case for incomplete actions and quantities; no grammatical gender (he/she = "hän" for both).
- Greetings: "Hei [Etunimi]," (universal), "Hyvää päivää," (formal good day), "Moi," (very casual).
- Sign-offs: "Ystävällisin terveisin," (kindest regards, standard), "Terveisin," (regards, neutral).
- DO NOT invent product/tech jargon. Use the EXACT terms from the user's offer description. Use the user's own phrasing verbatim.
Before returning, re-read every sentence and verify: (1) ä/ö, (2) sinä register, (3) vowel harmony, (4) case agreement, (5) zero invented jargon.`,

  tr: `CRITICAL — Turkish language rules:
- ALWAYS use proper Turkish characters: ç, ğ, ı, İ, ö, ş, ü. The dotted İ vs dotless ı distinction is mandatory — they are different letters with different sounds.
- Use FORMAL "siz / sizin" + 2nd person plural verb by default for cold outreach ("sizinle iletişime geçmek istiyorum"). Address with "Sayın [Soyadı] Bey/Hanım,". Never mix with informal "sen". EXCEPTION: casual platforms / younger audiences may use "sen" if consistently.
- Turkish is agglutinative — suffixes pile on the noun/verb root. Get vowel harmony right: e/i/ö/ü (front) vs a/ı/o/u (back). Wrong harmony = wrong word.
- Common pitfalls: word order is SOV (subject-object-verb); no grammatical gender; possessive is a suffix not a separate word ("evim" = my house).
- Greetings: "Sayın [Soyadı] Bey / Hanım," (formal), "Merhaba [İsim] Bey / Hanım," (neutral professional), "Merhaba [İsim]," (casual).
- Sign-offs: "Saygılarımla," (with my respects, formal), "İyi çalışmalar," (good work, warm professional), "Selamlar," (casual).
- DO NOT invent product/tech jargon. Use the EXACT terms from the user's offer description. Use the user's own phrasing verbatim.
Before returning, re-read every sentence and verify: (1) Turkish characters esp. dotted/dotless I, (2) siz register, (3) vowel harmony, (4) zero invented jargon.`,

  ar: `CRITICAL — Arabic language rules:
- Write ALL Arabic text in Arabic script (right-to-left). Use Modern Standard Arabic (MSA / فصحى) for written business outreach — colloquial dialects (Egyptian, Gulf, Levantine) are for spoken contexts only.
- Use FORMAL respectful address. Default formal greeting: "السلام عليكم ورحمة الله وبركاته" (peace be upon you) is universal across all Muslim-majority markets. Christian Arab contexts may use "تحية طيبة" instead.
- Address recipients as "حضرة الأستاذ [Last name]" or "السيد [Last name] المحترم" (formal masculine), "حضرة الأستاذة [Last name]" / "السيدة [Last name] المحترمة" (formal feminine).
- Gender agreement is mandatory on every adjective and verb — get the recipient's gender right. When unknown, default to masculine (the unmarked form).
- Diacritics (تشكيل) are usually omitted in modern business writing — that's correct. Only include them on words where ambiguity would cause misreading.
- Sign-offs: "وتفضلوا بقبول فائق الاحترام والتقدير," (please accept the highest respect, very formal), "مع تحياتي," (with my regards, neutral professional), "تحياتي," (regards, casual).
- Numbers: Arabic-Indic numerals (٠١٢٣٤٥٦٧٨٩) are used in some contexts; Western numerals (0-9) are equally acceptable in business writing — match the recipient's apparent style.
- DO NOT invent product/tech jargon. Use the EXACT terms from the user's offer description. Loanwords from English are common in tech contexts but transliterate them in Arabic script ("دي جي" for DJ).
Before returning, re-read every sentence and verify: (1) MSA not dialect, (2) gender agreement on verbs/adjectives, (3) formal salutation/sign-off, (4) zero invented jargon.`,

  ja: `CRITICAL — Japanese language rules:
- Write in standard Japanese using a natural mix of kanji, hiragana, and katakana. Loanwords from English are written in katakana (DJ → ディージェー or kept as DJ).
- Use the appropriate politeness register. Cold business outreach requires KEIGO (敬語) — combinations of teineigo (丁寧語: です/ます), sonkeigo (尊敬語: subject-honorific), and kenjōgo (謙譲語: humble). Never use plain form (だ/する) in cold outreach.
- Standard business email opening: "[Company name] [Last name]様" or "[Last name]様" + "お世話になっております。" / "突然のご連絡失礼いたします。" (apologetic opening for cold outreach).
- Address recipients with 様 (sama) for clients/prospects, さん (san) only after established rapport. Never use just the name without an honorific.
- Common pitfalls: は vs が particles; transitive vs intransitive verb pairs (開ける/開く); humble forms for self ("いたします" not "します") vs respectful forms for the recipient ("いらっしゃいます" not "います").
- Sign-offs: "よろしくお願いいたします。" (universal closing for any business email), "何卒よろしくお願い申し上げます。" (very formal/humble).
- Numbers: half-width Arabic numerals (1, 2, 3) are standard in modern business writing. Full-width (１, ２, ３) only for traditional contexts.
- DO NOT invent product/tech jargon. Use the EXACT terms from the user's offer description. Foreign brand names stay in original form or katakana.
Before returning, re-read every sentence and verify: (1) keigo throughout, (2) 様 honorifics, (3) humble vs respectful forms used correctly, (4) zero invented jargon.`,

  ko: `CRITICAL — Korean language rules:
- Write in standard Korean (Hangul). Hanja (Chinese characters) are rarely used in modern business writing — stick to Hangul.
- Use the appropriate speech level. Cold business outreach requires HASIPSIO-CHE (합쇼체, formal-polite) or HAEYO-CHE (해요체, casual-polite). Never use plain forms (해체 / 해라체) with strangers — it's deeply rude.
- Standard cold email opening: "[Company name] [Last name]님께" or "[Last name]님 안녕하세요." Address with 님 (-nim) honorific suffix for any client/prospect.
- Honorific verb endings (-시-) for the recipient: "사장님께서 말씀하셨습니다" (the CEO said). Humble forms for self.
- Common pitfalls: subject (-이/-가) vs topic (-은/-는) particles; honorific forms; the difference between -ㅂ니다 and -아/어요 endings (the former is more formal, latter more conversational-polite).
- Sign-offs: "감사합니다." (thank you, universal), "잘 부탁드립니다." (please look after this matter — common business closer), "감사합니다. [Your name] 드림." (formal sign-off).
- DO NOT invent product/tech jargon. Use the EXACT terms from the user's offer description. Foreign brand names stay in original form or in Hangul transliteration.
Before returning, re-read every sentence and verify: (1) appropriate speech level (-습니다/-요), (2) 님 honorifics, (3) honorific verb endings for recipient, (4) zero invented jargon.`,
};

/**
 * Builds the language enforcement block to inject in every system prompt.
 * If content_language is provided, language is forced AND the per-language
 * vocabulary pack is appended (if available). If it's missing, we fall back
 * to the legacy auto-detect behavior so existing callers keep working.
 *
 * MANDATORY: every AI route on the platform should call this helper and
 * concatenate the result into its system prompt. This guarantees that
 * Romanian leads get the gender-aware marriage verb rules, Greek leads get
 * Greek alphabet enforcement, German leads get formal "Sie", etc.
 */
export function buildLanguageInstruction(contentLanguage?: string | null): string {
  const lang = getLanguageByCode(contentLanguage || undefined);
  if (!lang) {
    return `Detect the language of the user's input and respond in that same language. Never switch languages mid-response.`;
  }
  const pack = LANGUAGE_RULES[lang.code];
  const packBlock = pack ? `\n\n${pack}` : "";
  return `LANGUAGE — hard requirement: write the ENTIRE output in ${lang.name} (${lang.nativeName}). This is a non-negotiable instruction set by the user. Do NOT auto-detect, do NOT default to English, do NOT switch languages mid-response. Every sentence, every label, every CTA must be in ${lang.name}.${packBlock}`;
}
