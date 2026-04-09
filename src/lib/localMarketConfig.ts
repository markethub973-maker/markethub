/**
 * Local market configuration per region.
 * Each region defines: flag, label, language, currency,
 * and the extra Research Hub tabs + Marketing Agent actors specific to that market.
 */

export type LocalActor = {
  id: string;
  label: string;
  icon: string;
  placeholder: string;
  endpoint: string;          // e.g. /api/research/olx
  apifyActor: string;        // e.g. "custom~olx-ro-scraper"
  description: string;
  bodyBuilder: (query: string) => Record<string, unknown>;
};

export type LocalMarketConfig = {
  region: string;
  flag: string;
  label: string;
  language: string;
  currency: string;
  color: string;
  actors: LocalActor[];
  agentHints: string[];       // hints injected into Marketing Agent prompt
  searchKeywords: {            // pre-translated common keywords
    events: string;
    food: string;
    beauty: string;
    real_estate: string;
    auto: string;
    jobs: string;
  };
};

export const LOCAL_MARKETS: Record<string, LocalMarketConfig> = {
  RO: {
    region: "RO",
    flag: "🇷🇴",
    label: "Romania",
    language: "ro",
    currency: "RON",
    color: "#002B7F",
    actors: [
      {
        id: "olx",
        label: "OLX.ro",
        icon: "🛒",
        placeholder: "Caută anunțuri (ex: echipament DJ, scaune evenimente)",
        endpoint: "/api/research/olx",
        apifyActor: "piotrv1001~olx-listings-scraper",
        description: "Anunțuri reale OLX.ro — preț, vânzător, oraș, contact (scraper dedicat, nu Google snippets)",
        bodyBuilder: (q) => ({ query: q, country: "ro", limit: 30 }),
      },
      {
        id: "pagini_aurii",
        label: "Pagini Aurii",
        icon: "📒",
        placeholder: "Search businesses (e.g. event venues, catering)",
        endpoint: "/api/research/local-market",
        apifyActor: "apify~web-scraper",
        description: "Romanian business directory — phone numbers, addresses, websites",
        bodyBuilder: (q) => ({ query: q, site: "paginiauri.ro" }),
      },
      {
        id: "storia",
        label: "Storia.ro",
        icon: "🏠",
        placeholder: "Search properties (e.g. commercial space Bucharest)",
        endpoint: "/api/research/local-market",
        apifyActor: "apify~web-scraper",
        description: "Real estate market — prices, availability, owners",
        bodyBuilder: (q) => ({ query: q, site: "storia.ro" }),
      },
      {
        id: "autovit",
        label: "Autovit.ro",
        icon: "🚗",
        placeholder: "Search cars (e.g. BMW 3 Series 2020)",
        endpoint: "/api/research/local-market",
        apifyActor: "apify~web-scraper",
        description: "Auto market — prices, dealer stock, specifications",
        bodyBuilder: (q) => ({ query: q, site: "autovit.ro" }),
      },
    ],
    agentHints: [
      "For Romanian market use Romanian keywords",
      "Include OLX.ro for classifieds and local leads",
      "Pagini Aurii is the main Romanian business directory",
      "Google Maps searches should include Romanian city names",
      "Romanian businesses often list on OLX before having a website",
    ],
    searchKeywords: {
      events: "sali de evenimente nunta botez",
      food: "restaurant cafenea catering",
      beauty: "salon coafor unghii",
      real_estate: "imobiliare spatiu comercial",
      auto: "service auto dealer",
      jobs: "angajari locuri de munca",
    },
  },

  US: {
    region: "US",
    flag: "🇺🇸",
    label: "United States",
    language: "en",
    currency: "USD",
    color: "#B22234",
    actors: [
      {
        id: "yelp",
        label: "Yelp",
        icon: "⭐",
        placeholder: "Search businesses (ex: event venues, catering)",
        endpoint: "/api/research/local-market",
        apifyActor: "apify~web-scraper",
        description: "US business reviews, ratings, contact info",
        bodyBuilder: (q) => ({ query: q, site: "yelp.com" }),
      },
      {
        id: "craigslist",
        label: "Craigslist",
        icon: "📋",
        placeholder: "Search listings (ex: DJ equipment, venues)",
        endpoint: "/api/research/local-market",
        apifyActor: "apify~web-scraper",
        description: "US classifieds — local sellers, services, jobs",
        bodyBuilder: (q) => ({ query: q, site: "craigslist.org" }),
      },
    ],
    agentHints: [
      "Use English keywords for US market",
      "Yelp is the primary US local business directory",
      "Include LinkedIn for B2B lead generation",
      "US businesses respond well to email outreach",
    ],
    searchKeywords: {
      events: "event venue wedding reception hall",
      food: "restaurant cafe catering service",
      beauty: "salon hair nails spa",
      real_estate: "commercial space for rent",
      auto: "auto dealer car dealership",
      jobs: "job hiring employment",
    },
  },

  DE: {
    region: "DE",
    flag: "🇩🇪",
    label: "Deutschland",
    language: "de",
    currency: "EUR",
    color: "#000000",
    actors: [
      {
        id: "ebay_kleinanzeigen",
        label: "Kleinanzeigen",
        icon: "🛍️",
        placeholder: "Suche Anzeigen (ex: DJ Ausrüstung, Veranstaltungsräume)",
        endpoint: "/api/research/local-market",
        apifyActor: "apify~web-scraper",
        description: "Deutschlands größter Kleinanzeigenmarkt",
        bodyBuilder: (q) => ({ query: q, site: "kleinanzeigen.de" }),
      },
    ],
    agentHints: [
      "Use German keywords for DE market",
      "XING is more popular than LinkedIn in Germany for B2B",
      "Germans prefer formal communication (Sie form)",
      "Kleinanzeigen.de is the main classifieds platform",
    ],
    searchKeywords: {
      events: "Veranstaltungssaal Hochzeit Event Location",
      food: "Restaurant Catering Café",
      beauty: "Friseur Nagelstudio Kosmetik",
      real_estate: "Gewerberaum mieten",
      auto: "Autohandler KFZ Händler",
      jobs: "Stellenangebote Arbeit",
    },
  },
};

export function getLocalMarket(region: string | null | undefined): LocalMarketConfig | null {
  if (!region) return null;
  return LOCAL_MARKETS[region.toUpperCase()] ?? null;
}

export const SUPPORTED_REGIONS = [
  { code: null,  flag: "🌍", label: "International (no local market)" },
  { code: "RO",  flag: "🇷🇴", label: "Romania" },
  { code: "US",  flag: "🇺🇸", label: "United States" },
  { code: "DE",  flag: "🇩🇪", label: "Deutschland" },
  { code: "GB",  flag: "🇬🇧", label: "United Kingdom" },
  { code: "FR",  flag: "🇫🇷", label: "France" },
  { code: "IT",  flag: "🇮🇹", label: "Italy" },
  { code: "ES",  flag: "🇪🇸", label: "Spain" },
  { code: "PL",  flag: "🇵🇱", label: "Poland" },
  { code: "HU",  flag: "🇭🇺", label: "Hungary" },
];
