/**
 * Public feature catalog — drives /features index + /features/[slug]
 * landing pages. Each entry is the single source of truth for one
 * customer-visible capability.
 *
 * Demo slot is intentionally swappable: today it points to a still
 * screenshot; later we plug in Spline / Lottie / 3D exploded-view
 * media without touching the page template.
 */

export interface FeatureStep {
  title: string;
  body: string;
}

export interface FeatureCatalogEntry {
  slug: string;                  // route segment: /features/<slug>
  category: "create" | "plan" | "grow" | "operate";
  title: string;                 // SEO + sidebar title
  tagline: string;               // <80 chars, hero subtitle
  hero_h1: string;               // Outcome-driven, customer-language
  hero_pain: string;             // 1-2 sentence pain it solves
  app_path: string;              // Where the live feature lives in-app
  outcomes: { label: string; body: string }[];   // 3
  steps: FeatureStep[];          // 3
  use_cases: string[];           // 2-3 short examples
  cta_primary: { label: string; href: string };
  cta_secondary?: { label: string; href: string };
  demo_kind: "screenshot" | "video" | "spline";
  demo_src?: string;             // path to the asset (placeholder for now)
  emoji: string;                 // small visual cue
  seo_keywords: string[];        // for <meta>
}

const APP = (path: string) => path; // placeholder if we ever need to prefix

export const FEATURES: FeatureCatalogEntry[] = [
  // ── CREATE ───────────────────────────────────────────────────────────────
  {
    slug: "ai-image",
    category: "create",
    title: "AI Image Studio",
    tagline: "On-brand visuals, no Canva, no designer.",
    hero_h1: "Generate post-ready images in 5 seconds.",
    hero_pain: "Stop hunting stock photos that don't fit your brand. Describe what you want — get a high-res image tuned to your aspect ratio and voice.",
    app_path: APP("/studio/image"),
    outcomes: [
      { label: "5 seconds per image",  body: "From prompt to download. No queues, no warm-up." },
      { label: "Every aspect ratio",   body: "1:1, 9:16, 16:9, 4:5 — the right size for every channel." },
      { label: "On-brand by default",  body: "Pulls in your Brand Voice + Strategy so output feels like YOU, not generic AI." },
    ],
    steps: [
      { title: "Describe", body: "Type what you want — even loosely (\"team brainstorm in golden hour\")." },
      { title: "Pick the size", body: "1:1 for IG, 9:16 for Reels & TikTok, 16:9 for blog & YouTube." },
      { title: "Use it", body: "Auto-saved to Asset Library. One-click drop into Calendar." },
    ],
    use_cases: [
      "Hero images for blog posts",
      "Reels covers + TikTok thumbnails",
      "Social ads at 4:5 + 1:1",
    ],
    cta_primary: { label: "Try it free →", href: "/register" },
    cta_secondary: { label: "Open in app", href: "/studio/image" },
    demo_kind: "screenshot",
    demo_src: "/screenshots/ai-image.png",
    emoji: "🎨",
    seo_keywords: ["AI image generator for social media", "on-brand AI images", "Flux Schnell social"],
  },
  {
    slug: "ai-video",
    category: "create",
    title: "AI Video Studio",
    tagline: "5-10s clips from a prompt — or from a single image.",
    hero_h1: "Reels & TikToks without filming.",
    hero_pain: "Filming a 7-second clip can take 2 hours of setup. Type a sentence — get a usable video. Or animate a still image you already have.",
    app_path: APP("/studio/video"),
    outcomes: [
      { label: "Prompt → clip",  body: "Plain English in, ready-to-post MP4 out. Powered by Seedance 2.0." },
      { label: "Image → motion", body: "Got a great photo? Animate it instead of starting from scratch." },
      { label: "Vertical-first",  body: "9:16 default — works for Reels, TikTok, Shorts without cropping." },
    ],
    steps: [
      { title: "Prompt or image", body: "Describe a scene OR drag a starting image." },
      { title: "Pick duration",   body: "5 or 10 seconds. The shorter, the punchier." },
      { title: "Download",        body: "MP4 saved to Asset Library, droppable into Calendar." },
    ],
    use_cases: [
      "Reels openers when you have no footage",
      "Animating product photos for ads",
      "Background loops for streams + shops",
    ],
    cta_primary: { label: "Try it free →", href: "/register" },
    cta_secondary: { label: "Open in app", href: "/studio/video" },
    demo_kind: "screenshot",
    demo_src: "/screenshots/ai-video.png",
    emoji: "🎬",
    seo_keywords: ["AI video generator", "Seedance video", "text to video Reels TikTok"],
  },
  {
    slug: "ai-audio",
    category: "create",
    title: "AI Audio Studio + Voice Cloning",
    tagline: "Voiceovers in YOUR voice. Music. Sound effects.",
    hero_h1: "Stop re-recording the same voiceover 30 times.",
    hero_pain: "Drop a 10-second sample of your voice once. From then on, every script is rendered IN YOUR VOICE — no studio, no microphone, no second takes.",
    app_path: APP("/studio/audio"),
    outcomes: [
      { label: "Your voice, scaled",  body: "F5-TTS zero-shot cloning. One sample, infinite voiceovers." },
      { label: "Music + SFX",          body: "Background tracks (5-30s) + one-shot sound effects all in one panel." },
      { label: "$0.001/sec",           body: "Cheaper than coffee. No subscriptions stacked on top." },
    ],
    steps: [
      { title: "Upload your sample", body: "Record 10 seconds of yourself reading anything." },
      { title: "Type the script",    body: "What you want said. Any language." },
      { title: "Download",            body: "MP3 in your voice — drop into Reels / Shorts / podcasts." },
    ],
    use_cases: [
      "Voiceovers for daily Reels without re-recording",
      "Background music for video ads",
      "Sound effects for transitions",
    ],
    cta_primary: { label: "Try it free →", href: "/register" },
    cta_secondary: { label: "Open in app", href: "/studio/audio" },
    demo_kind: "screenshot",
    demo_src: "/screenshots/ai-audio.png",
    emoji: "🎙️",
    seo_keywords: ["voice cloning AI", "F5-TTS voice clone", "AI voiceover from sample"],
  },
  {
    slug: "thumbnail",
    category: "create",
    title: "Thumbnail Generator",
    tagline: "1280×720 YouTube thumbnails in one click.",
    hero_h1: "Click-worthy thumbnails without opening Photoshop.",
    hero_pain: "Thumbnails decide if your video gets watched. Skip the hour of layouts — title in, thumbnail out, in 6 styles.",
    app_path: APP("/studio/thumbnail"),
    outcomes: [
      { label: "6 proven styles",  body: "Bold · minimal · cinematic · meme · tech · tutorial." },
      { label: "Bold text overlay", body: "Your title rendered with thick stroke + drop shadow — readable on phone." },
      { label: "Auto-saved",        body: "Lives in Asset Library next to all your AI media." },
    ],
    steps: [
      { title: "Title + topic", body: "Type the video title + niche." },
      { title: "Pick a style",  body: "Bold for retention, minimal for premium, cinematic for storytelling." },
      { title: "Done",          body: "16:9 image ready to upload to YouTube Studio." },
    ],
    use_cases: [
      "YouTube videos + Shorts",
      "Blog post hero images",
      "LinkedIn post images",
    ],
    cta_primary: { label: "Try it free →", href: "/register" },
    cta_secondary: { label: "Open in app", href: "/studio/thumbnail" },
    demo_kind: "screenshot",
    demo_src: "/screenshots/thumbnail.png",
    emoji: "🖼️",
    seo_keywords: ["YouTube thumbnail generator AI", "AI thumbnail maker", "1280x720 thumbnail tool"],
  },
  {
    slug: "video-caption",
    category: "create",
    title: "Video → Caption",
    tagline: "Whisper transcript + 5 platform captions in one shot.",
    hero_h1: "Upload a video. Get every caption ready.",
    hero_pain: "Writing 5 different captions for the same video clip kills your day. Drop the URL — get transcript + Instagram + LinkedIn + Twitter + TikTok + YouTube captions, plus 12 hashtags.",
    app_path: APP("/studio/video-caption"),
    outcomes: [
      { label: "Whisper-grade transcripts", body: "Multilingual, punctuated, ready to paste anywhere." },
      { label: "5 platform captions",        body: "Each follows that platform's proven rules — char limits, hashtag style, tone." },
      { label: "Hashtags from your topic",   body: "Not generic. Pulled from what's actually in the video." },
    ],
    steps: [
      { title: "Paste URL",      body: "Public mp4/mov/mp3/m4a — Asset Library, Drive, Dropbox, anywhere." },
      { title: "Pick platforms", body: "Toggle the channels you'll post on." },
      { title: "Copy + post",     body: "Each caption has its own Copy button + char counter." },
    ],
    use_cases: [
      "Repurposing podcast clips into 5 social posts",
      "Captioning client deliverables in seconds",
      "Building a blog post from a Reel transcript",
    ],
    cta_primary: { label: "Try it free →", href: "/register" },
    cta_secondary: { label: "Open in app", href: "/studio/video-caption" },
    demo_kind: "screenshot",
    demo_src: "/screenshots/video-caption.png",
    emoji: "🎤",
    seo_keywords: ["video to caption AI", "transcribe video to caption", "Whisper social captions"],
  },
  // ── PLAN ─────────────────────────────────────────────────────────────────
  {
    slug: "calendar",
    category: "plan",
    title: "Content Calendar + Auto-Publish",
    tagline: "Schedule. Publish. To everywhere. From one tab.",
    hero_h1: "One calendar. Every channel. Auto-publish.",
    hero_pain: "Switching between Buffer, Later, Hootsuite, and 4 native apps adds 90 minutes a day. We give you ONE calendar that publishes to Instagram, Facebook, LinkedIn, Twitter and TikTok on schedule — automatically.",
    app_path: APP("/calendar"),
    outcomes: [
      { label: "5 platforms, 1 view",   body: "Instagram · Facebook · LinkedIn · Twitter · TikTok — color-coded." },
      { label: "AI gates everywhere",   body: "Caption variants · hashtags · engagement predictor · alt-text — inline." },
      { label: "Bulk schedule",          body: "Pull a campaign of 5 posts onto the calendar in one drag." },
    ],
    steps: [
      { title: "Pick a date", body: "Click a day, hit '+' to draft." },
      { title: "Write or generate", body: "Type, OR use AI to draft caption + image + hashtags + alt-text." },
      { title: "Schedule",   body: "Cron picks it up at the scheduled minute. You sleep." },
    ],
    use_cases: [
      "Solo creators batching a week of content in 30 min",
      "Agencies running 10+ client calendars side-by-side",
      "Founders posting daily without the daily friction",
    ],
    cta_primary: { label: "Try it free →", href: "/register" },
    cta_secondary: { label: "Open in app", href: "/calendar" },
    demo_kind: "screenshot",
    demo_src: "/screenshots/calendar.png",
    emoji: "📅",
    seo_keywords: ["social media calendar auto-publish", "Buffer alternative AI", "schedule Instagram LinkedIn TikTok"],
  },
  {
    slug: "campaign",
    category: "plan",
    title: "Campaign Auto-Pilot",
    tagline: "1 brief → 5 posts with images + hashtags.",
    hero_h1: "Plan a week of content in 90 seconds.",
    hero_pain: "Coming up with 5 fresh posts every Sunday is the #1 reason creators burn out. Type one brief — get 5 ready-to-schedule posts with AI-generated images, captions, and hashtags. One click bulk-schedules them all.",
    app_path: APP("/studio/campaign"),
    outcomes: [
      { label: "5 posts per brief", body: "Different angles + different hooks. Not 5 copies of the same thing." },
      { label: "Images included",    body: "Each post has its own AI-generated visual at the right ratio." },
      { label: "Bulk schedule",       body: "Drop the whole campaign on the calendar in one click." },
    ],
    steps: [
      { title: "Write the brief", body: "1-2 sentences: what's the topic, who's it for." },
      { title: "Generate",         body: "5 posts appear with images, captions, hashtags." },
      { title: "Schedule all",     body: "Pick start date — auto-spaced across the week." },
    ],
    use_cases: [
      "Product launch week",
      "Webinar promotion sequence",
      "Evergreen content rotation",
    ],
    cta_primary: { label: "Try it free →", href: "/register" },
    cta_secondary: { label: "Open in app", href: "/studio/campaign" },
    demo_kind: "screenshot",
    demo_src: "/screenshots/campaign.png",
    emoji: "🚀",
    seo_keywords: ["AI content campaign", "social media campaign generator", "weekly content batch AI"],
  },
  {
    slug: "repurpose",
    category: "plan",
    title: "Content Repurposer",
    tagline: "1 caption → 5 platform variants, each on its own rules.",
    hero_h1: "Write once. Post everywhere. Properly.",
    hero_pain: "Cross-posting the same caption to Instagram and LinkedIn is a tell. Each platform has its own rules. We rewrite your caption 5 ways — one for each — preserving meaning, swapping format.",
    app_path: APP("/studio/repurpose"),
    outcomes: [
      { label: "Platform-aware",  body: "270 char limit on Twitter. No-hashtags-in-body on LinkedIn. #fyp on TikTok. We know." },
      { label: "Brand voice baked in", body: "All 5 variants sound like YOU — not 5 different AIs." },
      { label: "Toggle targets",  body: "Only need IG + LinkedIn? Skip the rest." },
    ],
    steps: [
      { title: "Paste source",  body: "Your strongest caption from any platform." },
      { title: "Pick targets",  body: "Toggle the channels you want." },
      { title: "Copy + post",    body: "Each variant has its own Copy button + char counter." },
    ],
    use_cases: [
      "LinkedIn thought leadership → IG carousel → Twitter thread",
      "TikTok hook → Reels → YouTube Shorts description",
      "Newsletter intro → 4 social posts",
    ],
    cta_primary: { label: "Try it free →", href: "/register" },
    cta_secondary: { label: "Open in app", href: "/studio/repurpose" },
    demo_kind: "screenshot",
    demo_src: "/screenshots/repurpose.png",
    emoji: "🔀",
    seo_keywords: ["content repurposing AI", "caption rewriter multi-platform", "social cross-post AI"],
  },
  {
    slug: "recycle",
    category: "plan",
    title: "Evergreen Post Recycler",
    tagline: "Refresh your past hits in 3 angles. Re-post.",
    hero_h1: "Your best post deserves a second run.",
    hero_pain: "That post that performed 6 months ago? Your audience grew 3x since. They never saw it. We refresh it in 3 fresh angles so you can re-publish without sounding like you copy-pasted.",
    app_path: APP("/studio/recycle"),
    outcomes: [
      { label: "3 distinct angles", body: "Seasonal · counterexample · specific-story. Same lesson, new framing." },
      { label: "Hook preserved",     body: "If the original worked, the core stays. Only the wrapper changes." },
      { label: "1-click to Calendar", body: "Send the refreshed version straight to the scheduler." },
    ],
    steps: [
      { title: "Pick a past post",  body: "Browse your published posts in the left panel." },
      { title: "AI refreshes",       body: "3 angle cards generated in 5 seconds." },
      { title: "Schedule",           body: "Drop the angle that fits this month's mood." },
    ],
    use_cases: [
      "Quarterly evergreen content rotation",
      "Newsletter teaser spinoffs",
      "Sales-team-asked-for-this re-runs",
    ],
    cta_primary: { label: "Try it free →", href: "/register" },
    cta_secondary: { label: "Open in app", href: "/studio/recycle" },
    demo_kind: "screenshot",
    demo_src: "/screenshots/recycle.png",
    emoji: "♻️",
    seo_keywords: ["evergreen content recycler", "republish social posts AI", "content rotation tool"],
  },
  {
    slug: "ab-winner",
    category: "plan",
    title: "A/B Winner Picker",
    tagline: "2 drafts in. Predicted winner + best-of-both out.",
    hero_h1: "Pick the better caption before the algorithm does.",
    hero_pain: "Posting the wrong variant costs reach you can't get back. Drop both drafts — AI scores them on hook, emotion, platform fit, and brand voice — then picks the winner with rationale you can argue with.",
    app_path: APP("/studio/ab-winner"),
    outcomes: [
      { label: "Comparative scoring", body: "Per-draft scores + confidence percent. No more coin flips." },
      { label: "3 reasons why",        body: "Concrete bullets — not 'Variant B is better'." },
      { label: "Best of both",         body: "AI merges the strongest parts into a drop-in caption." },
    ],
    steps: [
      { title: "Paste both drafts", body: "Same post, two angles." },
      { title: "Pick platform",     body: "Scoring weights shift per platform." },
      { title: "Use the winner",    body: "Or use the merged version. Copy + go." },
    ],
    use_cases: [
      "Big launches where reach matters",
      "Settling team disputes objectively",
      "Training your gut on what works",
    ],
    cta_primary: { label: "Try it free →", href: "/register" },
    cta_secondary: { label: "Open in app", href: "/studio/ab-winner" },
    demo_kind: "screenshot",
    demo_src: "/screenshots/ab-winner.png",
    emoji: "⚖️",
    seo_keywords: ["A/B test caption AI", "social post copy comparison", "AI caption scoring"],
  },
  {
    slug: "hooks",
    category: "plan",
    title: "Hook Library",
    tagline: "Save the lines that stop the scroll. Reuse them.",
    hero_h1: "Never start from a blank caption again.",
    hero_pain: "The hardest 7 words on social are the first 7. Save the openers that worked — yours and others' — and reach into your library every time you sit down to post.",
    app_path: APP("/studio/hooks"),
    outcomes: [
      { label: "Save manually OR extract", body: "Paste any past caption — AI pulls the 5 best hook-worthy lines." },
      { label: "5-star rating + tags",       body: "Filter by what's actually performing." },
      { label: "1-click to Calendar",        body: "Pick a hook, draft a post around it." },
    ],
    steps: [
      { title: "Build the library", body: "Add a few hooks manually or extract from past posts." },
      { title: "Tag + rate",         body: "Track which hooks earn comments." },
      { title: "Reuse",              body: "Filter by rating, drop into Calendar — never blank-page again." },
    ],
    use_cases: [
      "Daily content batching",
      "Inspiration pool for slow days",
      "Onboarding new content team members",
    ],
    cta_primary: { label: "Try it free →", href: "/register" },
    cta_secondary: { label: "Open in app", href: "/studio/hooks" },
    demo_kind: "screenshot",
    demo_src: "/screenshots/hooks.png",
    emoji: "🪝",
    seo_keywords: ["social media hook library", "content hooks tool", "viral hook generator"],
  },
  // ── GROW ─────────────────────────────────────────────────────────────────
  {
    slug: "lead-finder",
    category: "grow",
    title: "Lead Finder + Enrichment",
    tagline: "Find prospects. Enrich them. Send the opener.",
    hero_h1: "Stop scraping spreadsheets. Find leads inside the app.",
    hero_pain: "Cold lead lists die in spreadsheets. We surface qualified prospects from Google Maps + Reddit + Facebook Groups + Instagram, then enrich each one with company angle, ideal pitch and a usable opener message.",
    app_path: APP("/lead-finder"),
    outcomes: [
      { label: "Multi-source search",  body: "Google Maps · Reddit · Facebook Groups · Instagram — pick the right channel per niche." },
      { label: "AI enrichment",         body: "Company angle + pitch + send-as-is opener. No more 'Hi [Name]'." },
      { label: "Lightweight CRM",       body: "Pipeline status, contacted flag, estimated value — built in." },
    ],
    steps: [
      { title: "Describe your offer", body: "AI recommends the best sources for YOUR niche." },
      { title: "Run search",           body: "Get scored prospects. Save the hot ones." },
      { title: "Enrich + reach out",   body: "AI writes your opener. You just send." },
    ],
    use_cases: [
      "Agencies prospecting new clients",
      "B2B SaaS finding pilots",
      "Local services finding clients in city",
    ],
    cta_primary: { label: "Try it free →", href: "/register" },
    cta_secondary: { label: "Open in app", href: "/lead-finder" },
    demo_kind: "screenshot",
    demo_src: "/screenshots/lead-finder.png",
    emoji: "🎯",
    seo_keywords: ["AI lead finder", "B2B prospect enrichment", "Google Maps lead generation"],
  },
  {
    slug: "content-gap",
    category: "grow",
    title: "Content Gap Analyzer",
    tagline: "What competitors cover that you don't — with post ideas.",
    hero_h1: "See the topics your audience wants — that you're missing.",
    hero_pain: "If your competitors are getting comments on a topic and you've never touched it, that's lost reach. Paste their captions + yours — AI maps the clusters they own and you don't, with 2-3 concrete post angles per gap.",
    app_path: APP("/studio/content-gap"),
    outcomes: [
      { label: "Ranked gaps",         body: "By strategic value (audience signal × novelty for you)." },
      { label: "Post ideas, not topics", body: "Concrete angles you can draft today — not 'productivity'." },
      { label: "Niche-aware",          body: "Paste your audience description for sharper recommendations." },
    ],
    steps: [
      { title: "Paste captions",  body: "≥3 competitor posts + ≥1 of yours." },
      { title: "Analyze",         body: "AI clusters topics, finds the gaps." },
      { title: "Draft",           body: "Click an idea — opens Calendar pre-filled." },
    ],
    use_cases: [
      "Quarterly content audits",
      "New niche entry research",
      "Course/product positioning",
    ],
    cta_primary: { label: "Try it free →", href: "/register" },
    cta_secondary: { label: "Open in app", href: "/studio/content-gap" },
    demo_kind: "screenshot",
    demo_src: "/screenshots/content-gap.png",
    emoji: "🧭",
    seo_keywords: ["content gap analysis AI", "competitor content audit", "topic cluster finder"],
  },
  {
    slug: "hashtag-scan",
    category: "grow",
    title: "Hashtag Scanner",
    tagline: "Rising · safe-bet · saturated · overused-by-you.",
    hero_h1: "Stop guessing which hashtags still work.",
    hero_pain: "Most hashtag tools list the same generic tags everyone uses. We bucket YOUR candidates against your competitors' actual usage AND your own past saturation — so you stop reusing the same 10 tags every post.",
    app_path: APP("/studio/hashtag-scan"),
    outcomes: [
      { label: "4 honest buckets",    body: "Rising · safe-bet · saturated · overused-by-you. With one-line rationale per tag." },
      { label: "Auto-extracts from competitors", body: "Paste their captions — we pull every tag they used 2+ times." },
      { label: "Personal saturation",  body: "If you used #marketing 8x already, we tell you to rotate." },
    ],
    steps: [
      { title: "Provide candidates",  body: "List or auto-extract from competitor captions." },
      { title: "Add context",         body: "Niche + your past captions for accurate scoring." },
      { title: "Use the rising ones", body: "Copy the 'rising' bucket — paste into your post." },
    ],
    use_cases: [
      "Quarterly hashtag refresh",
      "New campaign hashtag strategy",
      "Avoiding shadowban-prone tags",
    ],
    cta_primary: { label: "Try it free →", href: "/register" },
    cta_secondary: { label: "Open in app", href: "/studio/hashtag-scan" },
    demo_kind: "screenshot",
    demo_src: "/screenshots/hashtag-scan.png",
    emoji: "#️⃣",
    seo_keywords: ["hashtag analyzer AI", "trending hashtags niche", "Instagram hashtag tool"],
  },
  {
    slug: "competitors",
    category: "grow",
    title: "Competitor Tracker",
    tagline: "Daily snapshots + 24h follower deltas.",
    hero_h1: "See how the competition is growing — every day.",
    hero_pain: "You can't out-strategize what you can't measure. Add up to 10 competitor profiles (IG + TikTok), see followers / engagement / posts, and a 24h delta on every refresh.",
    app_path: APP("/competitors"),
    outcomes: [
      { label: "IG + TikTok",       body: "Public profile data, post counts, engagement rate." },
      { label: "24h deltas",         body: "Green = growth, red = decline. See momentum at a glance." },
      { label: "Monetization spy",   body: "AI infers how each competitor likely makes money." },
    ],
    steps: [
      { title: "Add competitors",  body: "Paste their @ handles." },
      { title: "Refresh whenever", body: "Each refresh stores a snapshot." },
      { title: "Watch deltas",      body: "After 24h, deltas appear under follower counts." },
    ],
    use_cases: [
      "Tracking direct competitors weekly",
      "Niche research before a launch",
      "Sales pitch evidence ('they grew Xk in 2 weeks')",
    ],
    cta_primary: { label: "Try it free →", href: "/register" },
    cta_secondary: { label: "Open in app", href: "/competitors" },
    demo_kind: "screenshot",
    demo_src: "/screenshots/competitors.png",
    emoji: "📊",
    seo_keywords: ["Instagram competitor tracker", "TikTok analytics tool", "social media spy tool"],
  },
  // ── OPERATE ──────────────────────────────────────────────────────────────
  {
    slug: "brand-voice",
    category: "operate",
    title: "Brand Voice + Strategy",
    tagline: "Set tone + strategy once. Every AI feature uses it.",
    hero_h1: "Make every AI feature sound like YOU.",
    hero_pain: "Generic AI output gets ignored. Spend 5 minutes defining your brand voice + content strategy — every caption, image, video, hook, hashtag and lead opener after that automatically respects it.",
    app_path: APP("/brand/voice"),
    outcomes: [
      { label: "Tone profile",      body: "Auto-extract from your past posts OR define manually." },
      { label: "Content strategy",   body: "ICP + values + topic clusters + north-star — all AI features pull this in." },
      { label: "Compounding effect", body: "Every new AI tool we ship inherits your voice automatically." },
    ],
    steps: [
      { title: "Brand Voice",      body: "Tone, vocabulary, dos/don'ts. Auto-analyze past posts." },
      { title: "Content Strategy", body: "Who you write for + what you stand for + topic clusters." },
      { title: "Done forever",     body: "Set once — every AI feature on the platform respects it." },
    ],
    use_cases: [
      "Single-creator brands",
      "Agencies running multi-client voices",
      "Teams aligning on messaging",
    ],
    cta_primary: { label: "Try it free →", href: "/register" },
    cta_secondary: { label: "Open in app", href: "/brand/voice" },
    demo_kind: "screenshot",
    demo_src: "/screenshots/brand-voice.png",
    emoji: "🎙️",
    seo_keywords: ["brand voice AI", "content strategy profile", "AI tone of voice"],
  },
  {
    slug: "asset-library",
    category: "operate",
    title: "Asset Library",
    tagline: "Every AI asset you've ever made — in one gallery.",
    hero_h1: "All your AI assets. One place. Searchable.",
    hero_pain: "Your generated images live in 12 download folders, video clips in another, voiceovers somewhere else. We collect every AI asset into one filterable gallery — with one-click alt-text and bulk delete.",
    app_path: APP("/studio/assets"),
    outcomes: [
      { label: "Images · video · audio", body: "All three media types in a single grid." },
      { label: "Alt-text in 1 click",     body: "WCAG-ready accessibility text via Claude vision." },
      { label: "Bulk delete",              body: "Multi-select cleanup when storage gets messy." },
    ],
    steps: [
      { title: "Use any studio",   body: "Image, Video, Audio — every output saves here." },
      { title: "Filter + search",  body: "By type, prompt, or date." },
      { title: "Drop into Calendar", body: "Asset Picker in the post form pulls from here." },
    ],
    use_cases: [
      "Agencies organizing client deliverables",
      "Creators reusing on-brand assets",
      "Accessibility-first publishing",
    ],
    cta_primary: { label: "Try it free →", href: "/register" },
    cta_secondary: { label: "Open in app", href: "/studio/assets" },
    demo_kind: "screenshot",
    demo_src: "/screenshots/asset-library.png",
    emoji: "🗂️",
    seo_keywords: ["AI asset library", "DAM for content creators", "AI-generated media gallery"],
  },
  {
    slug: "webhooks-api",
    category: "operate",
    title: "Public API + Webhooks",
    tagline: "Integrate MarketHub into your stack. Get notified.",
    hero_h1: "Wire MarketHub into Zapier, Make, n8n, your CRM.",
    hero_pain: "If your stack speaks HTTP, MarketHub fits. 20+ REST endpoints (posts, leads, AI tools) + outbound webhooks for 10 events (image generated, post published, lead created, automation completed, ...).",
    app_path: APP("/api/docs"),
    outcomes: [
      { label: "20+ REST endpoints",  body: "Auth via Bearer token. All AI features available headless." },
      { label: "10 webhook events",    body: "HMAC-signed. Auto-disable after 10 failures." },
      { label: "Recipes included",     body: "Slack notifications, Zapier→HubSpot, Make→Notion — copy-paste." },
    ],
    steps: [
      { title: "Generate a token", body: "Settings → API & Tokens. Free for Pro+." },
      { title: "Wire your hook",   body: "Pick the events you care about, add the URL." },
      { title: "Build whatever",   body: "Slack alerts, CRM sync, Notion archive — your call." },
    ],
    use_cases: [
      "Slack alerts on every published post",
      "Sync new leads into HubSpot via Zapier",
      "Push every AI image into Notion via Make",
    ],
    cta_primary: { label: "Read the docs →", href: "/api/docs" },
    cta_secondary: { label: "Generate token", href: "/settings" },
    demo_kind: "screenshot",
    demo_src: "/screenshots/api-docs.png",
    emoji: "🔌",
    seo_keywords: ["social media management API", "outbound webhooks SaaS", "marketing automation API"],
  },
];

export const FEATURE_CATEGORIES: Record<FeatureCatalogEntry["category"], { label: string; desc: string }> = {
  create:  { label: "Create",  desc: "AI-generated content — visuals, video, audio, captions." },
  plan:    { label: "Plan",    desc: "Schedule, repurpose, recycle, A/B-test, build a hook library." },
  grow:    { label: "Grow",    desc: "Find leads, find content gaps, scan hashtags, track competitors." },
  operate: { label: "Operate", desc: "Brand voice, asset library, public API + webhooks." },
};

export function getFeature(slug: string): FeatureCatalogEntry | undefined {
  return FEATURES.find((f) => f.slug === slug);
}
