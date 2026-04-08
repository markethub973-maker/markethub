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
    description: "This guide will walk you through every feature of the platform step by step. Takes ~2 minutes.",
    position: "right",
  },
  {
    id: "youtube-overview",
    page: "/",
    target: "page-header",
    title: "YouTube Analytics",
    description: "Track your channel's performance: views, subscribers, revenue and trends. All in one place.",
    position: "bottom",
  },
  {
    id: "research-hub",
    page: "/research",
    target: "page-header",
    title: "Research Hub 🔍",
    description: "Search Google, Instagram, TikTok, Facebook, YouTube and Reddit from a single place. Ideal for market analysis.",
    position: "bottom",
  },
  {
    id: "marketing-agent",
    page: "/marketing",
    target: "page-header",
    title: "Marketing Agent 🤖",
    description: "The AI agent automatically plans a marketing strategy based on your goal and runs sequential research steps.",
    position: "bottom",
  },
  {
    id: "lead-finder",
    page: "/lead-finder",
    target: "page-header",
    title: "Lead Finder 🎯",
    description: "Step-by-step wizard: describe your offer → AI finds the best sources → search for prospects → score them → generate outreach messages.",
    position: "bottom",
  },
  {
    id: "leads-db",
    page: "/leads",
    target: "page-header",
    title: "Leads Database 📊",
    description: "All prospects saved from the Lead Finder land here. Filter by score, status and platform. Simple built-in CRM.",
    position: "bottom",
  },
  {
    id: "captions",
    page: "/captions",
    target: "page-header",
    title: "AI Captions ✨",
    description: "Automatically generate titles, descriptions and hashtags for any type of content using Claude AI.",
    position: "bottom",
  },
  {
    id: "ai-hub",
    page: "/ai-hub",
    target: "page-header",
    title: "AI Hub 🧠",
    description: "The AI command center: every smart tool on the platform grouped together. Access any AI feature from here.",
    position: "bottom",
  },
  {
    id: "settings-connect",
    page: "/settings",
    target: "page-header",
    title: "Connect your accounts ⚙️",
    description: "Important first step: connect YouTube and Instagram for real data. Click the 'Integrations' tab.",
    position: "bottom",
  },
  {
    id: "account-connections",
    page: "/settings",
    target: "account-connections",
    title: "YouTube & Instagram 🔗",
    description: "Connect YouTube for your own channel stats and Instagram Business for real reach, engagement and demographics.",
    position: "right",
  },
  {
    id: "done",
    page: "/",
    target: "sidebar-logo",
    title: "You're ready! 🚀",
    description: "The tour is finished. Connect your accounts in Settings → Integrations for real data. You can ask the AI assistant anything.",
    position: "right",
  },
];

// Steps scoped to each page (for "Page Guide" button)
export const PAGE_GUIDES: Record<string, TourStep[]> = {
  "/": [
    { id: "pg-yt-header", page: "/", target: "page-header", title: "YouTube Overview", description: "General stats for your YouTube channel.", position: "bottom" },
  ],
  "/settings": [
    { id: "pg-settings-connect", page: "/settings", target: "account-connections", title: "Connect accounts", description: "Click 'Connect YouTube' or 'Connect Instagram' to link your accounts and see your real data.", position: "right" },
  ],
  "/research": [
    { id: "pg-research-search", page: "/research", target: "research-search", title: "Search any platform", description: "Pick the platform (Google, Instagram, TikTok, etc.) and enter your search term.", position: "bottom" },
    { id: "pg-research-results", page: "/research", target: "research-results", title: "Real-time results", description: "Results appear here. You can save them directly to the Leads Database.", position: "top" },
  ],
  "/marketing": [
    { id: "pg-mkt-goal", page: "/marketing", target: "marketing-goal", title: "Describe the goal", description: "Write what you want to achieve (e.g. 'Find clients for DJ services'). The AI plans the strategy.", position: "bottom" },
    { id: "pg-mkt-steps", page: "/marketing", target: "marketing-steps", title: "Automated steps", description: "The agent executes each step sequentially and shows the results.", position: "top" },
  ],
  "/lead-finder": [
    { id: "pg-lf-offer", page: "/lead-finder", target: "lf-step-1", title: "Step 1: Your offer", description: "Describe what you sell or which service you provide.", position: "bottom" },
    { id: "pg-lf-sources", page: "/lead-finder", target: "lf-step-3", title: "Step 3: AI sources", description: "AI recommends the platforms that fit your offer best.", position: "bottom" },
  ],
  "/leads": [
    { id: "pg-leads-filter", page: "/leads", target: "leads-filter", title: "Filter leads", description: "Filter by score (hot/warm/cold), platform or status.", position: "bottom" },
  ],
};
