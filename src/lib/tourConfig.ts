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
    description: "This guide walks you through every feature step by step. Takes ~3 minutes.",
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
    description: "Generate titles, descriptions and hashtags for any content. Uses your Brand Voice profile for on-tone output.",
    position: "bottom",
  },
  {
    id: "calendar",
    page: "/calendar",
    target: "page-header",
    title: "Content Calendar 📅",
    description: "Schedule posts across Instagram, Facebook, LinkedIn, Twitter. Every field has an AI gate: caption variants, hashtag suggester, engagement predictor, alt-text.",
    position: "bottom",
  },
  {
    id: "studio-image",
    page: "/studio/image",
    target: "page-header",
    title: "AI Image Studio 🎨",
    description: "Generate on-brand images via Flux Schnell (Fal.ai). Supports 1:1, 9:16, 16:9, 4:5 — perfect for every platform.",
    position: "bottom",
  },
  {
    id: "studio-video",
    page: "/studio/video",
    target: "page-header",
    title: "AI Video Studio 🎬",
    description: "Turn a prompt — or an image — into a 5-10s video via Seedance 2.0. Great for Reels, TikTok, Shorts.",
    position: "bottom",
  },
  {
    id: "studio-audio",
    page: "/studio/audio",
    target: "page-header",
    title: "AI Audio Studio 🎵",
    description: "Text-to-speech voiceovers, background music, sound effects. All three in one panel.",
    position: "bottom",
  },
  {
    id: "studio-reels",
    page: "/studio/reels",
    target: "page-header",
    title: "Reels Script Studio 🎭",
    description: "Generate hook, beats and a full script for Instagram Reels / TikTok / YouTube Shorts in your Brand Voice.",
    position: "bottom",
  },
  {
    id: "studio-campaign",
    page: "/studio/campaign",
    target: "page-header",
    title: "Campaign Auto-Pilot 🚀",
    description: "One brief → 5 ready-to-schedule posts with AI-generated images and hashtags. Bulk schedule to the calendar.",
    position: "bottom",
  },
  {
    id: "studio-repurpose",
    page: "/studio/repurpose",
    target: "page-header",
    title: "Content Repurposer 🔀",
    description: "Paste one caption, get platform-optimized variants for Instagram, LinkedIn, Twitter, TikTok and YouTube Shorts — each following that platform's proven rules.",
    position: "bottom",
  },
  {
    id: "studio-queue",
    page: "/studio/queue",
    target: "page-header",
    title: "Publish Queue ⏱️",
    description: "See every scheduled post across platforms, with status, retry and manual publish buttons.",
    position: "bottom",
  },
  {
    id: "studio-assets",
    page: "/studio/assets",
    target: "page-header",
    title: "Asset Library 🗂️",
    description: "Every AI asset you've generated — images, videos, audio — in one gallery. Bulk delete, one-click alt-text for accessibility.",
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
    id: "settings-brand-voice",
    page: "/settings",
    target: "page-header",
    title: "Brand Voice & API ⚙️",
    description: "Define your Brand Voice once — every AI feature (captions, images, reels, campaigns) uses it. Plus: connect accounts, manage API tokens and webhooks.",
    position: "bottom",
  },
  {
    id: "account-connections",
    page: "/settings",
    target: "account-connections",
    title: "Connect accounts 🔗",
    description: "Connect YouTube, Instagram, Facebook, LinkedIn, Twitter for real data and auto-publishing.",
    position: "right",
  },
  {
    id: "done",
    page: "/",
    target: "sidebar-logo",
    title: "You're ready! 🚀",
    description: "Tour complete. Tip: start in Settings → Brand Voice to unlock the full power of every AI feature.",
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
  "/calendar": [
    { id: "pg-cal-header", page: "/calendar", target: "page-header", title: "Schedule posts", description: "Pick a date and click '+' to create a post. Every field has AI-powered helpers.", position: "bottom" },
  ],
  "/studio/image": [
    { id: "pg-img-header", page: "/studio/image", target: "page-header", title: "AI Image Studio", description: "Write a prompt, pick an aspect ratio, click Generate. ~5s per image (~$0.003).", position: "bottom" },
  ],
  "/studio/video": [
    { id: "pg-vid-header", page: "/studio/video", target: "page-header", title: "AI Video Studio", description: "Prompt or start-image → 5-10s video. Great for Reels, TikTok, Shorts.", position: "bottom" },
  ],
  "/studio/audio": [
    { id: "pg-aud-header", page: "/studio/audio", target: "page-header", title: "AI Audio Studio", description: "Three modes: Text→Speech (voiceovers), Music (background tracks), Sound Effects.", position: "bottom" },
  ],
  "/studio/reels": [
    { id: "pg-reels-header", page: "/studio/reels", target: "page-header", title: "Reels Script Studio", description: "Give a topic; the AI outputs hook + beats + script in your Brand Voice.", position: "bottom" },
  ],
  "/studio/campaign": [
    { id: "pg-camp-header", page: "/studio/campaign", target: "page-header", title: "Campaign Auto-Pilot", description: "Brief → 5 posts with images + hashtags. Use 'Generate all' then 'Schedule all'.", position: "bottom" },
  ],
  "/studio/queue": [
    { id: "pg-queue-header", page: "/studio/queue", target: "page-header", title: "Publish Queue", description: "Every scheduled post across platforms — with status, retry and manual publish.", position: "bottom" },
  ],
  "/studio/repurpose": [
    { id: "pg-rep-header", page: "/studio/repurpose", target: "page-header", title: "Content Repurposer", description: "Paste one caption, pick targets, click Repurpose. Each platform variant follows its own rules.", position: "bottom" },
  ],
  "/studio/assets": [
    { id: "pg-assets-header", page: "/studio/assets", target: "page-header", title: "Asset Library", description: "Every AI asset in one place. Images have an 'Alt' button for one-click accessibility text.", position: "bottom" },
  ],
};
