/**
 * Guides — practical how-to articles for SEO long-tail + Ask Consultant
 * deep-links. Each guide is short (skim-friendly), action-oriented, and
 * links to the relevant feature page + in-app entrypoint.
 *
 * Editorial principle: solve ONE specific job in <5 min of reading.
 * No hype, no theory — steps + screenshots + done.
 */

export interface GuideStep {
  heading: string;
  body: string;
}

export interface Guide {
  slug: string;
  title: string;
  reading_minutes: number;
  audience: string;          // "Solo creators" / "Marketing agencies" / etc.
  tagline: string;           // <120 chars meta description
  intro: string;             // 1-2 paragraph hook: what you'll get out of it
  steps: GuideStep[];        // numbered procedure
  related_feature_slug: string;   // → /features/<slug>
  related_app_path: string;       // → in-app entrypoint
  cta_label: string;
  pro_tip?: string;          // optional final-section pro-tip
  seo_keywords: string[];
}

export const GUIDES: Guide[] = [
  {
    slug: "schedule-instagram-posts-batch",
    title: "How to batch a week of Instagram posts in 30 minutes",
    reading_minutes: 4,
    audience: "Solo creators & founders",
    tagline: "Use Campaign Auto-Pilot + Calendar to schedule 7 days of on-brand IG posts in half an hour.",
    intro: "If posting daily on Instagram makes you want to throw your phone, this workflow is for you. We'll generate 7 posts (with images, captions, hashtags) from a single brief, then schedule them across the week — without leaving MarketHub Pro.",
    steps: [
      { heading: "Set Brand Voice once", body: "Open /brand/voice. Either paste 5-10 of your past captions and let AI extract the voice, or fill the form manually. Every AI feature now uses this profile." },
      { heading: "Open Campaign Auto-Pilot", body: "Go to Studio → Campaign Auto-Pilot. Type a 1-2 sentence brief like: 'This week is about productivity for solo founders, leading to a free PDF download.' Click Generate." },
      { heading: "Review the 5 posts", body: "AI delivers 5 posts with different angles, each with a generated image at 1:1 (Instagram). Tweak captions inline if needed." },
      { heading: "Schedule all", body: "Click 'Schedule all'. Pick the start date — posts auto-space across the week." },
      { heading: "Top up to 7", body: "Need 2 more? Use /studio/recycle to refresh your top-performing past posts. Drop those onto the empty calendar slots." },
    ],
    related_feature_slug: "campaign",
    related_app_path: "/studio/campaign",
    cta_label: "Open Campaign Auto-Pilot",
    pro_tip: "Schedule posts for Mon 9am / Tue 1pm / Wed 7pm / Thu 11am / Fri 4pm / Sat 10am / Sun 6pm — these slots historically outperform 'business hours' on most niches.",
    seo_keywords: [
      "batch Instagram posts AI",
      "schedule week of Instagram in 30 minutes",
      "automate Instagram content",
    ],
  },
  {
    slug: "clone-your-voice-for-reels",
    title: "How to clone your voice once and use it on every Reel",
    reading_minutes: 3,
    audience: "Solo creators",
    tagline: "Drop a 10-second voice sample once, generate unlimited voiceovers in YOUR voice via F5-TTS.",
    intro: "Re-recording the same voiceover 30 times because you stumbled on one word kills the joy of making content. With voice cloning, you record yourself ONCE — then every script you type comes back in your voice, ready to drop into a Reel.",
    steps: [
      { heading: "Record a clean 10-15 second sample", body: "Use any decent mic (your phone in a quiet room is fine). Read 2-3 sentences clearly — the more natural your tone, the better the clone." },
      { heading: "Upload to a public URL", body: "Drop it into Asset Library, Dropbox or Google Drive. Make sure the link is public (https URL, not a sharing dialog)." },
      { heading: "Open AI Audio Studio", body: "Go to /studio/audio and switch to 'Your Voice' (the 4th tab)." },
      { heading: "Paste URL + transcript", body: "Paste the audio URL. In the transcript field, type EXACTLY what you said in the sample — word for word. The cleaner this transcript, the better the clone quality." },
      { heading: "Generate", body: "Type the script you want said. Click Generate. ~5-10 seconds later you have an MP3 in your voice — drop it into your video editor." },
    ],
    related_feature_slug: "ai-audio",
    related_app_path: "/studio/audio",
    cta_label: "Open AI Audio Studio",
    pro_tip: "The reference URL + transcript are saved locally — you only set them once. After the first time, every clone takes 10 seconds of typing.",
    seo_keywords: [
      "voice clone for Reels", "F5-TTS voice cloning", "AI voice clone Instagram", "your voice TikTok AI",
    ],
  },
  {
    slug: "find-leads-with-ai",
    title: "How to find your first 50 leads with AI in one afternoon",
    reading_minutes: 5,
    audience: "Marketing agencies & B2B sales",
    tagline: "Use Lead Finder + AI Enrichment to surface 50 qualified prospects + ready-to-send opener messages.",
    intro: "Cold prospecting from spreadsheets dies fast. Lead Finder scans Google Maps, Reddit, Facebook Groups, and Instagram for qualified prospects in your niche, scores them, and (with AI Enrichment) writes a tailored opener for each one. Here's the full playbook.",
    steps: [
      { heading: "Describe your offer in plain language", body: "Open /lead-finder. Type 1-2 sentences like 'I help marketing agencies in Europe automate their content with AI'. AI will recommend the best lead sources for your niche." },
      { heading: "Pick sources, run search", body: "Default picks 2-3 sources (e.g. Google Maps + Facebook Groups for local services, Reddit + LinkedIn for B2B SaaS). Click Search. Results stream in scored 1-10." },
      { heading: "Save the hot ones", body: "Anything 7+ goes into the Leads Database with one click. Skip the obvious junk." },
      { heading: "Enrich each lead", body: "Open /studio/lead-enrich. Paste the prospect's name, category, city, website. AI returns: company angle, ideal pitch, and a 2-3 sentence opener message you can send AS-IS." },
      { heading: "Send + track in CRM", body: "Copy the opener, send via DM/email. In Leads Database, set pipeline_status to 'contacted'. The lightweight CRM tracks who you reached out to + when." },
    ],
    related_feature_slug: "lead-finder",
    related_app_path: "/lead-finder",
    cta_label: "Open Lead Finder",
    pro_tip: "Run Lead Enrichment in batch: prep 10 leads in a spreadsheet, paste them one at a time, build a 'today's outreach' folder. 50 personalized messages in ~90 minutes.",
    seo_keywords: [
      "AI lead generation", "find leads with AI", "B2B prospecting AI", "Google Maps lead finder",
    ],
  },
  {
    slug: "repurpose-one-post-five-platforms",
    title: "How to turn one strong post into 5 platform-optimized variants",
    reading_minutes: 3,
    audience: "Marketing agencies & creators",
    tagline: "Cross-posting fails because each platform has different rules. Use Content Repurposer to actually adapt — not copy-paste.",
    intro: "Posting the same caption to LinkedIn and TikTok is the #1 tell that you don't get social media. The Content Repurposer rewrites your strongest caption 5 ways — one for each platform — preserving meaning while swapping format, hashtag style, length, and tone.",
    steps: [
      { heading: "Pick your strongest caption", body: "Open /studio/repurpose. Paste the original (any platform, any language). Set 'source platform' to where you originally posted — this affects tone inference." },
      { heading: "Toggle target platforms", body: "5 chips: Instagram, LinkedIn, Twitter/X, TikTok, YouTube Shorts. Toggle on the channels you publish to. Skip the ones you don't." },
      { heading: "Generate", body: "10 seconds later, you get a card per platform. Each follows that platform's rules: 270 chars on X, no-hashtags-in-body on LinkedIn, #fyp on TikTok, etc." },
      { heading: "Copy + schedule", body: "Each card has its own Copy button + char counter. Drop into Calendar (or your direct scheduler) per platform." },
    ],
    related_feature_slug: "repurpose",
    related_app_path: "/studio/repurpose",
    cta_label: "Open Content Repurposer",
    pro_tip: "If your Brand Voice is set, all 5 variants sound like YOU — not 5 different AIs. Set it once at /brand/voice.",
    seo_keywords: [
      "repurpose social media content", "cross-post Instagram LinkedIn", "AI content adaptation", "content multiplier",
    ],
  },
  {
    slug: "build-content-strategy-from-scratch",
    title: "How to build a content strategy from scratch in 20 minutes",
    reading_minutes: 5,
    audience: "Founders & in-house marketers",
    tagline: "ICP + values + topic clusters + north star — the 4-block strategy that powers every AI feature on the platform.",
    intro: "Generic AI output gets ignored. Spending 20 minutes on a real Content Strategy Profile compounds on every caption, image, hook, and lead opener you generate from then on. Here's the simple framework.",
    steps: [
      { heading: "Define ICP (Ideal Customer Profile)", body: "One paragraph. Be SPECIFIC. 'Small marketing agencies in Europe, 5-15 people, owners who used to be creatives but are now drowning in ops work.' The more specific, the sharper every AI output." },
      { heading: "List 3-5 brand values", body: "Short phrases that guide every piece of content. 'Clarity over hype', 'Transparent pricing', 'Show the messy middle, not just the polished end'. AI will avoid contradicting them." },
      { heading: "Pick 3-8 topic clusters", body: "The big topic areas you want to OWN. Narrow enough that you could write 20 posts about each. 'AI workflow automation', 'Behind-the-scenes ops', 'Industry hot takes'." },
      { heading: "Write your north-star goal", body: "One sentence: what does success look like 12 months from now? 'Become the go-to AI marketing assistant for 500+ small agencies in Europe by April 2027.' AI uses this as a tie-breaker when ideas conflict." },
      { heading: "Save", body: "Hit Save. Every AI feature on the platform now respects this profile automatically — captions, images, repurposing, hooks, hashtag scanner, lead enrichment, video captions, all of it." },
    ],
    related_feature_slug: "brand-voice",
    related_app_path: "/brand/strategy",
    cta_label: "Open Content Strategy",
    pro_tip: "Re-read your strategy quarterly. As your business evolves, the topic clusters narrow — that's a sign of focus, not loss.",
    seo_keywords: [
      "build content strategy", "content strategy framework", "ICP marketing", "content pillars AI",
    ],
  },
  {
    slug: "ab-test-captions-without-posting",
    title: "How to A/B test two captions BEFORE posting (no risk)",
    reading_minutes: 3,
    audience: "Anyone who agonizes over captions",
    tagline: "Use the A/B Winner Picker to score two drafts on hook, emotion, platform fit, and brand voice — then post the winner with confidence.",
    intro: "Posting the wrong caption costs reach you can't get back. The A/B Winner Picker scores two drafts comparatively, returns a winner with rationale + confidence percent + a merged 'best of both' caption you can use directly. No actual posts harmed in the testing.",
    steps: [
      { heading: "Open A/B Winner Picker", body: "Go to /studio/ab-winner. Paste both drafts side-by-side." },
      { heading: "Set platform + image flag + goal", body: "Scoring weights shift per platform (LinkedIn = clarity-heavy, TikTok = hook-heavy). The 'has image' flag matters too. Optional: state your goal ('signups', 'comments', 'saves')." },
      { heading: "Pick the winner", body: "Click 'Pick the winner'. You get scores per draft (0-100), confidence percent, 3 reasons why the winner wins, and a merged caption that combines the best of both." },
      { heading: "Use the merged version", body: "Often the 'best of both' beats either original draft. Copy + post." },
    ],
    related_feature_slug: "ab-winner",
    related_app_path: "/studio/ab-winner",
    cta_label: "Open A/B Winner Picker",
    pro_tip: "Use this when the stakes are high — launch posts, sales announcements, big content drops. For daily posts, just publish.",
    seo_keywords: [
      "A/B test caption AI", "social media caption testing", "compare captions AI", "predict post performance",
    ],
  },
];

export function getGuide(slug: string): Guide | undefined {
  return GUIDES.find((g) => g.slug === slug);
}
