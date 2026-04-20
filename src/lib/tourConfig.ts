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
    description: "Generate on-brand images instantly. Supports 1:1, 9:16, 16:9, 4:5 — perfect for every platform.",
    position: "bottom",
  },
  {
    id: "studio-video",
    page: "/studio/video",
    target: "page-header",
    title: "AI Video Studio 🎬",
    description: "Turn a prompt — or an image — into a 5-10s video. Great for Reels, TikTok, Shorts.",
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
  // ─── Dashboard ───────────────────────────────────────────────────────
  "/dashboard": [
    { id: "pg-dash-overview", page: "/dashboard", target: "page-header", title: "Your Dashboard", description: "A bird's-eye view of your account: key stats, recent activity, and performance trends.", position: "bottom" },
    { id: "pg-dash-stats", page: "/dashboard", target: "dashboard-stats", title: "Key Metrics", description: "Total followers, engagement rate, posts this week, and AI credits used.", position: "bottom" },
    { id: "pg-dash-recent", page: "/dashboard", target: "dashboard-recent-posts", title: "Recent Posts", description: "Your latest published content with quick performance indicators.", position: "bottom" },
    { id: "pg-dash-ai-impact", page: "/dashboard", target: "dashboard-ai-impact", title: "AI Impact", description: "See how AI-generated content performs vs. manually created posts.", position: "bottom" },
  ],
  // ─── YouTube Overview (legacy root) ──────────────────────────────────
  "/": [
    { id: "pg-yt-header", page: "/", target: "page-header", title: "YouTube Overview", description: "General stats for your YouTube channel.", position: "bottom" },
    { id: "pg-yt-metrics", page: "/", target: "yt-metrics", title: "Channel Metrics", description: "Views, subscribers, watch time and revenue at a glance.", position: "bottom" },
    { id: "pg-yt-recent", page: "/", target: "yt-recent-videos", title: "Recent Videos", description: "Your latest uploads with view counts and engagement.", position: "bottom" },
  ],
  // ─── Calendar ────────────────────────────────────────────────────────
  "/calendar": [
    { id: "pg-cal-header", page: "/calendar", target: "page-header", title: "Content Calendar", description: "Plan and schedule posts visually. See your entire month at a glance.", position: "bottom" },
    { id: "pg-cal-create", page: "/calendar", target: "calendar-create-btn", title: "Create a Post", description: "Click any date or the '+' button to create a new scheduled post.", position: "bottom" },
    { id: "pg-cal-drag", page: "/calendar", target: "calendar-grid", title: "Drag to Reschedule", description: "Drag posts between dates to reschedule them instantly.", position: "bottom" },
    { id: "pg-cal-ai-gates", page: "/calendar", target: "calendar-ai-gates", title: "AI Helpers", description: "Each post has AI gates: generate captions, suggest hashtags, predict engagement.", position: "right" },
    { id: "pg-cal-platforms", page: "/calendar", target: "calendar-platform-filter", title: "Filter by Platform", description: "Toggle platforms to see only Instagram, LinkedIn, Facebook, etc.", position: "bottom" },
  ],
  // ─── Captions ────────────────────────────────────────────────────────
  "/captions": [
    { id: "pg-cap-header", page: "/captions", target: "page-header", title: "AI Captions", description: "Generate engaging captions for any social platform using AI.", position: "bottom" },
    { id: "pg-cap-platform", page: "/captions", target: "captions-platform", title: "Select Platform", description: "Choose the target platform. Caption length and style adapt automatically.", position: "bottom" },
    { id: "pg-cap-tone", page: "/captions", target: "captions-tone", title: "Choose Tone", description: "Pick a tone (professional, casual, humorous, etc.) or use your Brand Voice.", position: "bottom" },
    { id: "pg-cap-generate", page: "/captions", target: "captions-generate", title: "Generate Variants", description: "Click Generate to get multiple caption options. Copy or send to Calendar.", position: "bottom" },
  ],
  // ─── Studio: Image ───────────────────────────────────────────────────
  "/studio/image": [
    { id: "pg-img-header", page: "/studio/image", target: "page-header", title: "AI Image Studio", description: "Generate images from text prompts in seconds.", position: "bottom" },
    { id: "pg-img-prompt", page: "/studio/image", target: "image-prompt", title: "Write Your Prompt", description: "Describe the image you want. Be specific about style, colors, and composition.", position: "bottom" },
    { id: "pg-img-aspect", page: "/studio/image", target: "image-aspect-ratio", title: "Aspect Ratio", description: "Choose 1:1 (feed), 9:16 (stories/reels), 16:9 (YouTube), or 4:5 (Instagram).", position: "bottom" },
    { id: "pg-img-generate", page: "/studio/image", target: "image-generate-btn", title: "Generate", description: "Click Generate. Images appear in ~5 seconds and save to your Asset Library.", position: "bottom" },
  ],
  // ─── Studio: Video ───────────────────────────────────────────────────
  "/studio/video": [
    { id: "pg-vid-header", page: "/studio/video", target: "page-header", title: "AI Video Studio", description: "Create short videos from text prompts or images.", position: "bottom" },
    { id: "pg-vid-input", page: "/studio/video", target: "video-input", title: "Prompt or Image", description: "Enter a text prompt or upload a start image to animate.", position: "bottom" },
    { id: "pg-vid-settings", page: "/studio/video", target: "video-settings", title: "Duration & Ratio", description: "Select 5s or 10s duration and the aspect ratio for your target platform.", position: "bottom" },
    { id: "pg-vid-generate", page: "/studio/video", target: "video-generate-btn", title: "Generate Video", description: "Click Generate. Video renders in 30-60s and saves to Asset Library.", position: "bottom" },
  ],
  // ─── Studio: Audio ───────────────────────────────────────────────────
  "/studio/audio": [
    { id: "pg-aud-header", page: "/studio/audio", target: "page-header", title: "AI Audio Studio", description: "Create voiceovers, music, and sound effects with AI.", position: "bottom" },
    { id: "pg-aud-tts", page: "/studio/audio", target: "audio-tts-tab", title: "Text to Speech", description: "Type or paste text, choose a voice, and generate natural-sounding voiceovers.", position: "bottom" },
    { id: "pg-aud-music", page: "/studio/audio", target: "audio-music-tab", title: "Music Generation", description: "Describe the mood or genre to generate background music tracks.", position: "bottom" },
    { id: "pg-aud-sfx", page: "/studio/audio", target: "audio-sfx-tab", title: "Sound Effects", description: "Generate specific sound effects by describing what you need.", position: "bottom" },
  ],
  // ─── Studio: Thumbnail ───────────────────────────────────────────────
  "/studio/thumbnail": [
    { id: "pg-thumb-header", page: "/studio/thumbnail", target: "page-header", title: "Thumbnail Generator", description: "Create eye-catching YouTube thumbnails with text overlays.", position: "bottom" },
    { id: "pg-thumb-template", page: "/studio/thumbnail", target: "thumbnail-template", title: "Choose a Style", description: "Pick a template or start from scratch with a custom background.", position: "bottom" },
    { id: "pg-thumb-text", page: "/studio/thumbnail", target: "thumbnail-text", title: "Add Text Overlay", description: "Add bold headline text. Use short, attention-grabbing phrases.", position: "bottom" },
    { id: "pg-thumb-download", page: "/studio/thumbnail", target: "thumbnail-download", title: "Download", description: "Export your thumbnail at 1280x720 for YouTube.", position: "bottom" },
  ],
  // ─── Studio: Video Caption ───────────────────────────────────────────
  "/studio/video-caption": [
    { id: "pg-vcap-header", page: "/studio/video-caption", target: "page-header", title: "Video Captions", description: "Upload a video and get an automatic transcript with captions.", position: "bottom" },
    { id: "pg-vcap-upload", page: "/studio/video-caption", target: "vcap-upload", title: "Upload Video", description: "Drag or click to upload your video file for transcription.", position: "bottom" },
    { id: "pg-vcap-transcript", page: "/studio/video-caption", target: "vcap-transcript", title: "Review Transcript", description: "Edit the auto-generated transcript for accuracy.", position: "bottom" },
    { id: "pg-vcap-export", page: "/studio/video-caption", target: "vcap-export", title: "Export Captions", description: "Download as SRT or copy platform-optimized captions.", position: "bottom" },
  ],
  // ─── Studio: Reels ───────────────────────────────────────────────────
  "/studio/reels": [
    { id: "pg-reels-header", page: "/studio/reels", target: "page-header", title: "Reels Script Studio", description: "Generate complete scripts for Reels, TikTok, and Shorts.", position: "bottom" },
    { id: "pg-reels-topic", page: "/studio/reels", target: "reels-topic", title: "Enter Topic", description: "Describe what your reel is about. The AI builds hook + beats + script.", position: "bottom" },
    { id: "pg-reels-voice", page: "/studio/reels", target: "reels-voiceover", title: "Voiceover Option", description: "Toggle voiceover to generate a TTS audio track for your script.", position: "bottom" },
    { id: "pg-reels-output", page: "/studio/reels", target: "reels-output", title: "Your Script", description: "Copy the script or send it directly to the Calendar for scheduling.", position: "top" },
  ],
  // ─── Studio: Hooks ───────────────────────────────────────────────────
  "/studio/hooks": [
    { id: "pg-hooks-header", page: "/studio/hooks", target: "page-header", title: "Hook Library", description: "Save and manage opening lines that grab attention.", position: "bottom" },
    { id: "pg-hooks-create", page: "/studio/hooks", target: "hooks-create", title: "Create a Hook", description: "Write or AI-generate new hooks. Tag them by platform or niche.", position: "bottom" },
    { id: "pg-hooks-list", page: "/studio/hooks", target: "hooks-list", title: "Your Hooks", description: "Browse saved hooks. Click to copy or insert into a caption.", position: "bottom" },
    { id: "pg-hooks-ai", page: "/studio/hooks", target: "hooks-ai-generate", title: "AI Generate", description: "Describe your topic and get 5+ hook variants instantly.", position: "bottom" },
  ],
  // ─── Studio: Hashtag Scan ────────────────────────────────────────────
  "/studio/hashtag-scan": [
    { id: "pg-hscan-header", page: "/studio/hashtag-scan", target: "page-header", title: "Hashtag Scanner", description: "Find trending and relevant hashtags for your content.", position: "bottom" },
    { id: "pg-hscan-input", page: "/studio/hashtag-scan", target: "hscan-input", title: "Enter Topic or URL", description: "Type a keyword or paste a post URL to analyze relevant hashtags.", position: "bottom" },
    { id: "pg-hscan-results", page: "/studio/hashtag-scan", target: "hscan-results", title: "Hashtag Results", description: "See volume, competition, and trending status for each hashtag.", position: "bottom" },
    { id: "pg-hscan-copy", page: "/studio/hashtag-scan", target: "hscan-copy", title: "Copy Set", description: "One click to copy all hashtags ready to paste into your post.", position: "bottom" },
  ],
  // ─── Studio: Lead Enrich ─────────────────────────────────────────────
  "/studio/lead-enrich": [
    { id: "pg-enrich-header", page: "/studio/lead-enrich", target: "page-header", title: "Lead Enrichment", description: "Enrich leads with social media data and contact info.", position: "bottom" },
    { id: "pg-enrich-input", page: "/studio/lead-enrich", target: "enrich-input", title: "Enter Lead Data", description: "Paste a name, email, or social URL to look up.", position: "bottom" },
    { id: "pg-enrich-results", page: "/studio/lead-enrich", target: "enrich-results", title: "Enriched Profile", description: "View social accounts, follower counts, and engagement metrics.", position: "bottom" },
    { id: "pg-enrich-save", page: "/studio/lead-enrich", target: "enrich-save", title: "Save to CRM", description: "Add the enriched lead directly to your Leads database.", position: "bottom" },
  ],
  // ─── Studio: A/B Winner ──────────────────────────────────────────────
  "/studio/ab-winner": [
    { id: "pg-ab-header", page: "/studio/ab-winner", target: "page-header", title: "A/B Caption Tester", description: "Compare two caption variants to see which performs better.", position: "bottom" },
    { id: "pg-ab-inputs", page: "/studio/ab-winner", target: "ab-inputs", title: "Enter Two Variants", description: "Paste variant A and variant B. They can be for any platform.", position: "bottom" },
    { id: "pg-ab-analyze", page: "/studio/ab-winner", target: "ab-analyze", title: "Run Analysis", description: "AI scores each variant on clarity, engagement potential, and tone.", position: "bottom" },
    { id: "pg-ab-winner", page: "/studio/ab-winner", target: "ab-result", title: "See the Winner", description: "Get a clear recommendation with reasoning for which to use.", position: "bottom" },
  ],
  // ─── Studio: Recycle ─────────────────────────────────────────────────
  "/studio/recycle": [
    { id: "pg-recycle-header", page: "/studio/recycle", target: "page-header", title: "Content Recycler", description: "Breathe new life into old posts with fresh angles.", position: "bottom" },
    { id: "pg-recycle-select", page: "/studio/recycle", target: "recycle-select", title: "Pick Old Content", description: "Select a past post or paste any caption you want to refresh.", position: "bottom" },
    { id: "pg-recycle-options", page: "/studio/recycle", target: "recycle-options", title: "Refresh Options", description: "Choose how to update: new angle, different tone, updated stats.", position: "bottom" },
    { id: "pg-recycle-output", page: "/studio/recycle", target: "recycle-output", title: "Recycled Version", description: "Review the refreshed caption and schedule or copy it.", position: "bottom" },
  ],
  // ─── Studio: Repurpose ───────────────────────────────────────────────
  "/studio/repurpose": [
    { id: "pg-rep-header", page: "/studio/repurpose", target: "page-header", title: "Content Repurposer", description: "Convert one caption into optimized versions for other platforms.", position: "bottom" },
    { id: "pg-rep-input", page: "/studio/repurpose", target: "repurpose-input", title: "Paste Original", description: "Paste your caption from any platform as the source.", position: "bottom" },
    { id: "pg-rep-targets", page: "/studio/repurpose", target: "repurpose-targets", title: "Select Targets", description: "Choose which platforms you want the content adapted for.", position: "bottom" },
    { id: "pg-rep-results", page: "/studio/repurpose", target: "repurpose-results", title: "Platform Variants", description: "Each variant follows that platform's rules for length, hashtags, and format.", position: "bottom" },
  ],
  // ─── Research ────────────────────────────────────────────────────────
  "/research": [
    { id: "pg-research-header", page: "/research", target: "page-header", title: "Research Hub", description: "Search multiple platforms from a single interface.", position: "bottom" },
    { id: "pg-research-search", page: "/research", target: "research-search", title: "Pick a Platform", description: "Select Google, YouTube, Instagram, TikTok, Facebook, or Reddit.", position: "bottom" },
    { id: "pg-research-query", page: "/research", target: "research-query", title: "Enter Search Term", description: "Type your keyword or topic. Results update in real time.", position: "bottom" },
    { id: "pg-research-results", page: "/research", target: "research-results", title: "Browse Results", description: "View results with metrics. Save any item directly to Leads.", position: "top" },
    { id: "pg-research-save", page: "/research", target: "research-save-lead", title: "Save as Lead", description: "Click the save icon to add a result to your Leads database.", position: "bottom" },
  ],
  // ─── Leads ───────────────────────────────────────────────────────────
  "/leads": [
    { id: "pg-leads-header", page: "/leads", target: "page-header", title: "Leads CRM", description: "Track prospects from discovery to signed client.", position: "bottom" },
    { id: "pg-leads-filter", page: "/leads", target: "leads-filter", title: "Filter & Search", description: "Filter by score (hot/warm/cold), platform, or pipeline stage.", position: "bottom" },
    { id: "pg-leads-pipeline", page: "/leads", target: "leads-pipeline", title: "Pipeline Stages", description: "Drag leads between stages: New, Contacted, Qualified, Client.", position: "bottom" },
    { id: "pg-leads-actions", page: "/leads", target: "leads-actions", title: "Quick Actions", description: "Email, message, or enrich a lead with one click.", position: "right" },
  ],
  // ─── Lead Finder ─────────────────────────────────────────────────────
  "/lead-finder": [
    { id: "pg-lf-header", page: "/lead-finder", target: "page-header", title: "Lead Finder", description: "Find potential clients using AI-powered search and scoring.", position: "bottom" },
    { id: "pg-lf-offer", page: "/lead-finder", target: "lf-step-1", title: "Describe Your Offer", description: "Tell the AI what service you provide or product you sell.", position: "bottom" },
    { id: "pg-lf-sources", page: "/lead-finder", target: "lf-step-3", title: "AI-Suggested Sources", description: "AI recommends the best platforms and search terms for your offer.", position: "bottom" },
    { id: "pg-lf-results", page: "/lead-finder", target: "lf-results", title: "Scored Results", description: "Prospects are scored 0-100 based on fit. Save the best ones.", position: "bottom" },
    { id: "pg-lf-outreach", page: "/lead-finder", target: "lf-outreach", title: "Generate Outreach", description: "AI writes personalized messages for your top prospects.", position: "bottom" },
  ],
  // ─── Campaigns ───────────────────────────────────────────────────────
  "/campaigns": [
    { id: "pg-camp-header", page: "/campaigns", target: "page-header", title: "Campaigns", description: "Track marketing campaigns with budget, timeline, and performance.", position: "bottom" },
    { id: "pg-camp-create", page: "/campaigns", target: "campaigns-create", title: "Create Campaign", description: "Set a name, budget, date range, and target platforms.", position: "bottom" },
    { id: "pg-camp-metrics", page: "/campaigns", target: "campaigns-metrics", title: "Performance Metrics", description: "See reach, engagement, leads generated, and cost per result.", position: "bottom" },
    { id: "pg-camp-posts", page: "/campaigns", target: "campaigns-posts", title: "Campaign Posts", description: "All posts linked to this campaign in one view.", position: "bottom" },
  ],
  // ─── Channels ────────────────────────────────────────────────────────
  "/channels": [
    { id: "pg-chan-header", page: "/channels", target: "page-header", title: "Top YouTube Channels", description: "Discover top YouTube channels by region and category.", position: "bottom" },
    { id: "pg-chan-region", page: "/channels", target: "channels-region", title: "Select Region", description: "Filter channels by country to find local influencers.", position: "bottom" },
    { id: "pg-chan-list", page: "/channels", target: "channels-list", title: "Channel Rankings", description: "Sorted by subscribers with growth rate and upload frequency.", position: "bottom" },
    { id: "pg-chan-details", page: "/channels", target: "channels-details", title: "Channel Details", description: "Click any channel to see detailed analytics and recent videos.", position: "bottom" },
  ],
  // ─── Videos ──────────────────────────────────────────────────────────
  "/videos": [
    { id: "pg-vid-header2", page: "/videos", target: "page-header", title: "Trending Videos", description: "Browse trending YouTube videos with analytics.", position: "bottom" },
    { id: "pg-vid-filters", page: "/videos", target: "videos-filters", title: "Filter Videos", description: "Filter by category, region, date range, or view count.", position: "bottom" },
    { id: "pg-vid-analytics", page: "/videos", target: "videos-analytics", title: "Video Metrics", description: "Views, likes, comments, and engagement rate for each video.", position: "bottom" },
    { id: "pg-vid-save", page: "/videos", target: "videos-save", title: "Save for Research", description: "Bookmark videos to reference later in your content strategy.", position: "bottom" },
  ],
  // ─── Assets ──────────────────────────────────────────────────────────
  "/assets": [
    { id: "pg-assets-header", page: "/assets", target: "page-header", title: "Media Library", description: "All your media files: images, videos, and audio in one place.", position: "bottom" },
    { id: "pg-assets-upload", page: "/assets", target: "assets-upload", title: "Upload Files", description: "Drag files or click to upload images, videos, or audio.", position: "bottom" },
    { id: "pg-assets-filter", page: "/assets", target: "assets-filter", title: "Filter by Type", description: "Toggle between images, videos, and audio to find what you need.", position: "bottom" },
    { id: "pg-assets-bulk", page: "/assets", target: "assets-bulk-actions", title: "Bulk Actions", description: "Select multiple files to delete, download, or add to a post.", position: "bottom" },
  ],
  // ─── Social Accounts ─────────────────────────────────────────────────
  "/social-accounts": [
    { id: "pg-social-header", page: "/social-accounts", target: "page-header", title: "Social Accounts", description: "Connect and manage your social media accounts.", position: "bottom" },
    { id: "pg-social-connect", page: "/social-accounts", target: "social-connect-btn", title: "Connect Account", description: "Click to connect Instagram, Facebook, TikTok, LinkedIn, or YouTube.", position: "bottom" },
    { id: "pg-social-status", page: "/social-accounts", target: "social-status", title: "Connection Status", description: "Green = active, yellow = token expiring soon, red = disconnected.", position: "bottom" },
    { id: "pg-social-refresh", page: "/social-accounts", target: "social-refresh", title: "Refresh Token", description: "Reconnect an account if the token has expired.", position: "bottom" },
  ],
  // ─── Settings ────────────────────────────────────────────────────────
  "/settings": [
    { id: "pg-settings-header", page: "/settings", target: "page-header", title: "Settings", description: "Manage your profile, integrations, privacy, and data.", position: "bottom" },
    { id: "pg-settings-connect", page: "/settings", target: "account-connections", title: "Connect Accounts", description: "Link your YouTube, Instagram, and other social accounts.", position: "right" },
    { id: "pg-settings-brand", page: "/settings", target: "settings-brand-voice", title: "Brand Voice", description: "Define your brand tone. All AI features use this automatically.", position: "bottom" },
    { id: "pg-settings-api", page: "/settings", target: "settings-api-tokens", title: "API Tokens", description: "Generate tokens for external integrations and automations.", position: "bottom" },
    { id: "pg-settings-export", page: "/settings", target: "settings-data-export", title: "Data Export", description: "Export your data as CSV or JSON for backup or migration.", position: "bottom" },
  ],
  // ─── Trends ──────────────────────────────────────────────────────────
  "/trends": [
    { id: "pg-trends-header", page: "/trends", target: "page-header", title: "Google Trends", description: "Explore trending search topics by country and category.", position: "bottom" },
    { id: "pg-trends-country", page: "/trends", target: "trends-country", title: "Select Country", description: "Pick a country to see what people are searching for.", position: "bottom" },
    { id: "pg-trends-chart", page: "/trends", target: "trends-chart", title: "Trend Over Time", description: "See how interest changes over days, weeks, or months.", position: "bottom" },
    { id: "pg-trends-related", page: "/trends", target: "trends-related", title: "Related Queries", description: "Discover related topics and rising searches for content ideas.", position: "bottom" },
  ],
  // ─── Competitors ─────────────────────────────────────────────────────
  "/competitors": [
    { id: "pg-comp-header", page: "/competitors", target: "page-header", title: "Competitor Tracker", description: "Monitor competitor social media accounts and content.", position: "bottom" },
    { id: "pg-comp-add", page: "/competitors", target: "competitors-add", title: "Add Competitor", description: "Enter a competitor's social profile URL to start tracking.", position: "bottom" },
    { id: "pg-comp-metrics", page: "/competitors", target: "competitors-metrics", title: "Compare Metrics", description: "See follower growth, posting frequency, and engagement side by side.", position: "bottom" },
    { id: "pg-comp-content", page: "/competitors", target: "competitors-content", title: "Their Top Posts", description: "See what content performs best for your competitors.", position: "bottom" },
  ],
  // ─── Hashtags ────────────────────────────────────────────────────────
  "/hashtags": [
    { id: "pg-hash-header", page: "/hashtags", target: "page-header", title: "Hashtag Manager", description: "Create and manage hashtag sets for quick reuse in posts.", position: "bottom" },
    { id: "pg-hash-create", page: "/hashtags", target: "hashtags-create", title: "Create Set", description: "Group related hashtags into a named set (e.g., 'Travel', 'Fitness').", position: "bottom" },
    { id: "pg-hash-list", page: "/hashtags", target: "hashtags-list", title: "Your Sets", description: "View all sets. Click to copy the entire group at once.", position: "bottom" },
    { id: "pg-hash-use", page: "/hashtags", target: "hashtags-use", title: "Use in Posts", description: "Sets appear in the Calendar post editor for one-click insertion.", position: "bottom" },
  ],
  // ─── Demographics ────────────────────────────────────────────────────
  "/demographics": [
    { id: "pg-demo-header", page: "/demographics", target: "page-header", title: "Audience Demographics", description: "Understand who follows you: age, gender, location, and interests.", position: "bottom" },
    { id: "pg-demo-age", page: "/demographics", target: "demographics-age", title: "Age & Gender", description: "See the age and gender breakdown of your audience.", position: "bottom" },
    { id: "pg-demo-geo", page: "/demographics", target: "demographics-geo", title: "Geography", description: "Top countries and cities where your followers are located.", position: "bottom" },
    { id: "pg-demo-insights", page: "/demographics", target: "demographics-insights", title: "Insights", description: "AI-generated insights about the best times and content for your audience.", position: "bottom" },
  ],
  // ─── Social Listening ────────────────────────────────────────────────
  "/social-listening": [
    { id: "pg-listen-header", page: "/social-listening", target: "page-header", title: "Social Listening", description: "Monitor brand mentions and keywords across platforms.", position: "bottom" },
    { id: "pg-listen-keywords", page: "/social-listening", target: "listening-keywords", title: "Track Keywords", description: "Add brand names, product names, or topics to monitor.", position: "bottom" },
    { id: "pg-listen-feed", page: "/social-listening", target: "listening-feed", title: "Mention Feed", description: "Real-time feed of posts mentioning your tracked keywords.", position: "bottom" },
    { id: "pg-listen-sentiment", page: "/social-listening", target: "listening-sentiment", title: "Sentiment Analysis", description: "See whether mentions are positive, neutral, or negative.", position: "bottom" },
  ],
  // ─── Instagram Search ────────────────────────────────────────────────
  "/instagram-search": [
    { id: "pg-ig-header", page: "/instagram-search", target: "page-header", title: "Instagram Search", description: "Search Instagram profiles by username, followers, or engagement.", position: "bottom" },
    { id: "pg-ig-search", page: "/instagram-search", target: "ig-search-input", title: "Search Profiles", description: "Enter a username, hashtag, or niche keyword.", position: "bottom" },
    { id: "pg-ig-results", page: "/instagram-search", target: "ig-results", title: "Profile Results", description: "See follower count, engagement rate, and recent post stats.", position: "bottom" },
    { id: "pg-ig-save", page: "/instagram-search", target: "ig-save-lead", title: "Save as Lead", description: "Add interesting profiles directly to your Leads database.", position: "bottom" },
  ],
  // ─── Email Reports ───────────────────────────────────────────────────
  "/email-reports": [
    { id: "pg-email-header", page: "/email-reports", target: "page-header", title: "Email Reports", description: "Create and schedule branded email reports for clients.", position: "bottom" },
    { id: "pg-email-create", page: "/email-reports", target: "email-create", title: "Create Report", description: "Pick metrics, date range, and branding for your report.", position: "bottom" },
    { id: "pg-email-schedule", page: "/email-reports", target: "email-schedule", title: "Schedule Delivery", description: "Set up weekly or monthly automatic report emails.", position: "bottom" },
    { id: "pg-email-recipients", page: "/email-reports", target: "email-recipients", title: "Add Recipients", description: "Enter client email addresses to receive the reports.", position: "bottom" },
  ],
  // ─── Ads Library ─────────────────────────────────────────────────────
  "/ads-library": [
    { id: "pg-ads-header", page: "/ads-library", target: "page-header", title: "Ads Library", description: "Search active Facebook and Instagram ads by brand or keyword.", position: "bottom" },
    { id: "pg-ads-search", page: "/ads-library", target: "ads-search", title: "Search Ads", description: "Enter a brand name or keyword to find their active ads.", position: "bottom" },
    { id: "pg-ads-results", page: "/ads-library", target: "ads-results", title: "Ad Results", description: "Browse ad creatives, copy, and estimated spend.", position: "bottom" },
    { id: "pg-ads-save", page: "/ads-library", target: "ads-save", title: "Save for Inspiration", description: "Bookmark ads to reference when creating your own campaigns.", position: "bottom" },
  ],
  // ─── Marketing Agent ─────────────────────────────────────────────────
  "/marketing": [
    { id: "pg-mkt-header", page: "/marketing", target: "page-header", title: "Marketing Agent", description: "AI agent that plans and executes marketing strategies.", position: "bottom" },
    { id: "pg-mkt-goal", page: "/marketing", target: "marketing-goal", title: "Set Your Goal", description: "Describe what you want to achieve. The AI plans the strategy.", position: "bottom" },
    { id: "pg-mkt-steps", page: "/marketing", target: "marketing-steps", title: "Execution Steps", description: "The agent runs each step sequentially and shows results.", position: "top" },
    { id: "pg-mkt-results", page: "/marketing", target: "marketing-results", title: "Results & Actions", description: "Review findings and take action: save leads, create posts, etc.", position: "bottom" },
  ],
  // ─── Studio: Campaign Auto-Pilot ─────────────────────────────────────
  "/studio/campaign": [
    { id: "pg-camp-header2", page: "/studio/campaign", target: "page-header", title: "Campaign Auto-Pilot", description: "One brief generates a full campaign with multiple posts.", position: "bottom" },
    { id: "pg-camp-brief", page: "/studio/campaign", target: "campaign-brief", title: "Write Your Brief", description: "Describe the campaign goal, audience, and key messages.", position: "bottom" },
    { id: "pg-camp-generate", page: "/studio/campaign", target: "campaign-generate-all", title: "Generate All", description: "AI creates 5 posts with captions, images, and hashtags.", position: "bottom" },
    { id: "pg-camp-schedule", page: "/studio/campaign", target: "campaign-schedule-all", title: "Schedule All", description: "Send all posts to the Calendar with one click.", position: "bottom" },
  ],
  // ─── Studio: Queue ───────────────────────────────────────────────────
  "/studio/queue": [
    { id: "pg-queue-header", page: "/studio/queue", target: "page-header", title: "Publish Queue", description: "View and manage all scheduled posts awaiting publication.", position: "bottom" },
    { id: "pg-queue-list", page: "/studio/queue", target: "queue-list", title: "Queued Posts", description: "Posts ordered by scheduled time with platform and status.", position: "bottom" },
    { id: "pg-queue-retry", page: "/studio/queue", target: "queue-retry", title: "Retry Failed", description: "Click retry on any failed post to attempt publishing again.", position: "bottom" },
    { id: "pg-queue-manual", page: "/studio/queue", target: "queue-manual-publish", title: "Manual Publish", description: "Force-publish any post immediately, bypassing the schedule.", position: "bottom" },
  ],
  // ─── Studio: Assets ──────────────────────────────────────────────────
  "/studio/assets": [
    { id: "pg-sassets-header", page: "/studio/assets", target: "page-header", title: "Asset Library", description: "All AI-generated images, videos, and audio files.", position: "bottom" },
    { id: "pg-sassets-filter", page: "/studio/assets", target: "studio-assets-filter", title: "Filter by Type", description: "Show only images, videos, or audio files.", position: "bottom" },
    { id: "pg-sassets-alt", page: "/studio/assets", target: "studio-assets-alt", title: "Alt Text", description: "Click 'Alt' on any image for one-click accessibility text.", position: "bottom" },
    { id: "pg-sassets-bulk", page: "/studio/assets", target: "studio-assets-bulk", title: "Bulk Delete", description: "Select multiple files and delete them to free up storage.", position: "bottom" },
  ],
};
