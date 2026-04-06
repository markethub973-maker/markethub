export interface TourStep {
  id: string;
  page: string;           // route to navigate to
  target: string;         // data-tour="..." attribute value
  title: string;
  description: string;
  position: "top" | "bottom" | "left" | "right" | "center";
}

export const FULL_TOUR: TourStep[] = [
  {
    id: "welcome",
    page: "/",
    target: "sidebar-logo",
    title: "Welcome to MarketHub Pro 👋",
    description: "Acest ghid îți va arăta toate funcțiile platformei pas cu pas. Durează ~2 minute.",
    position: "right",
  },
  {
    id: "youtube-overview",
    page: "/",
    target: "page-header",
    title: "YouTube Analytics",
    description: "Urmărește performanța canalului tău: vizualizări, abonați, venituri și tendințe. Totul într-un singur loc.",
    position: "bottom",
  },
  {
    id: "research-hub",
    page: "/research",
    target: "page-header",
    title: "Research Hub 🔍",
    description: "Caută pe Google, Instagram, TikTok, Facebook, YouTube și Reddit dintr-un singur loc. Ideal pentru analiza pieței.",
    position: "bottom",
  },
  {
    id: "marketing-agent",
    page: "/marketing",
    target: "page-header",
    title: "Marketing Agent 🤖",
    description: "Agentul AI planifică automat o strategie de marketing bazată pe obiectivul tău și execută pași secvențiali de cercetare.",
    position: "bottom",
  },
  {
    id: "lead-finder",
    page: "/lead-finder",
    target: "page-header",
    title: "Lead Finder 🎯",
    description: "Wizard pas cu pas: descrie oferta ta → AI găsește cele mai bune surse → caută prospecți → îi scorează → generează mesaje de outreach.",
    position: "bottom",
  },
  {
    id: "leads-db",
    page: "/leads",
    target: "page-header",
    title: "Leads Database 📊",
    description: "Toți prospecții salvați din Lead Finder ajung aici. Filtrează după scor, status și platformă. CRM simplu integrat.",
    position: "bottom",
  },
  {
    id: "captions",
    page: "/captions",
    target: "page-header",
    title: "AI Captions ✨",
    description: "Generează automat titluri, descrieri și hashtag-uri pentru orice tip de conținut folosind Claude AI.",
    position: "bottom",
  },
  {
    id: "ai-hub",
    page: "/ai-hub",
    target: "page-header",
    title: "AI Hub 🧠",
    description: "Centrul de comandă AI: toate instrumentele inteligente ale platformei grupate. De aici poți accesa orice funcție AI.",
    position: "bottom",
  },
  {
    id: "settings-connect",
    page: "/settings",
    target: "page-header",
    title: "Conectează-ți conturile ⚙️",
    description: "Primul pas important: conectează YouTube și Instagram pentru date reale. Click pe tab-ul 'Integrations'.",
    position: "bottom",
  },
  {
    id: "account-connections",
    page: "/settings",
    target: "account-connections",
    title: "YouTube & Instagram 🔗",
    description: "Conectează YouTube pentru statistici canal propriu și Instagram Business pentru reach, engagement și demografii reale.",
    position: "right",
  },
  {
    id: "done",
    page: "/",
    target: "sidebar-logo",
    title: "Ești gata! 🚀",
    description: "Turul s-a terminat. Conectează-ți conturile din Settings → Integrations pentru date reale. Poți întreba asistentul AI orice.",
    position: "right",
  },
];

// Steps scoped to each page (for "Page Guide" button)
export const PAGE_GUIDES: Record<string, TourStep[]> = {
  "/": [
    { id: "pg-yt-header", page: "/", target: "page-header", title: "YouTube Overview", description: "Statistici generale ale canalului tău YouTube.", position: "bottom" },
  ],
  "/settings": [
    { id: "pg-settings-connect", page: "/settings", target: "account-connections", title: "Conectează conturile", description: "Apasă 'Connect YouTube' sau 'Connect Instagram' pentru a lega conturile și a vedea datele tale reale.", position: "right" },
  ],
  "/research": [
    { id: "pg-research-search", page: "/research", target: "research-search", title: "Caută pe orice platformă", description: "Selectează platforma (Google, Instagram, TikTok etc.) și introdu termenul de căutare.", position: "bottom" },
    { id: "pg-research-results", page: "/research", target: "research-results", title: "Rezultate în timp real", description: "Rezultatele apar aici. Le poți salva direct în Leads Database.", position: "top" },
  ],
  "/marketing": [
    { id: "pg-mkt-goal", page: "/marketing", target: "marketing-goal", title: "Descrie obiectivul", description: "Scrie ce vrei să realizezi (ex: 'Găsește clienți pentru servicii DJ'). AI planifică strategia.", position: "bottom" },
    { id: "pg-mkt-steps", page: "/marketing", target: "marketing-steps", title: "Pași automați", description: "Agentul execută fiecare pas secvențial și afișează rezultatele.", position: "top" },
  ],
  "/lead-finder": [
    { id: "pg-lf-offer", page: "/lead-finder", target: "lf-step-1", title: "Pasul 1: Oferta ta", description: "Descrie ce vinzi sau ce serviciu oferi.", position: "bottom" },
    { id: "pg-lf-sources", page: "/lead-finder", target: "lf-step-3", title: "Pasul 3: Surse AI", description: "AI recomandă platformele cele mai potrivite pentru oferta ta.", position: "bottom" },
  ],
  "/leads": [
    { id: "pg-leads-filter", page: "/leads", target: "leads-filter", title: "Filtrare leads", description: "Filtrează după scor (hot/warm/cold), platformă sau status.", position: "bottom" },
  ],
};
