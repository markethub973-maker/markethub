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
    tagline: "Drop a 10-second voice sample once, generate unlimited voiceovers in YOUR voice.",
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
      "voice clone for Reels", "zero-shot voice cloning", "AI voice clone Instagram", "your voice TikTok AI",
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
  {
    slug: "how-to-find-b2b-leads-2026",
    title: "How to find B2B leads in 2026 (without buying data)",
    reading_minutes: 6,
    audience: "Founders, sales reps, small agencies",
    tagline: "The 2026 playbook for finding real, reachable B2B leads using AI + public data — no Apollo, no ZoomInfo, no €500/month tools.",
    intro: "The B2B lead-gen industry quietly became a €15B/year scam. You pay for a database full of job-hoppers, wrong emails, and 60% bounce rates. Meanwhile, the people you actually want to reach are publicly listed on Google Maps, LinkedIn, and their own websites — enriched in real time, ignored by the big tools. This guide shows the new 2026 approach: narrow your ICP, scrape only what you need, enrich with AI, and run personalized outreach that doesn't feel like spam. 6 minutes to read, 30 minutes to your first 50 leads.",
    steps: [
      { heading: "Narrow the ICP to one search string", body: "Forget broad TAM lists. Write ONE Google-style search phrase that describes exactly who you want: 'dental clinic Bucharest 5-15 staff', 'fitness coach Madrid Instagram 10k-50k', 'SaaS startup Series A Berlin'. Specificity beats volume 10:1 on reply rates." },
      { heading: "Mine real-time data (not cached DBs)", body: "Use Lead Finder to run that phrase against Google Maps + LinkedIn + website crawling. You get domain, phone, email pattern, staff count, real activity signals — all 24h fresh. ~30 results in 60 seconds. Cost: ~$0.05/lead via Apify vs $4/lead on Apollo." },
      { heading: "Enrich with AI, not webforms", body: "For each domain, AI fetches the About page, product pages, recent news, and builds a 2-sentence firmographic profile. You now know what matters BEFORE writing a message — not after a 30-min research session." },
      { heading: "Personalize outreach per lead (don't blast)", body: "Skip 'Hi {first_name}'. Use the enriched profile as context. AI drafts a 3-sentence message referencing something specific. Reply rates jump from 1-2% to 8-15%." },
      { heading: "Sequence + auto-stop on reply", body: "Send message 1 day 0, follow-up day 3, final day 7. The moment they reply, the sequence stops automatically (Reply Detector). No awkward 'sorry, I already responded' moments." },
      { heading: "Measure the right metric", body: "Vanity = 'emails sent'. Reality = 'conversations started'. Target: 1 conversation per 15 outreach. If you're below that, your ICP isn't specific enough — go back to step 1, narrow harder." },
    ],
    related_feature_slug: "lead-finder",
    related_app_path: "/outreach",
    cta_label: "Open Lead Finder",
    pro_tip: "Stack 2 ICP searches per week. One 'hot' (active hiring, recent funding), one 'cold' (established, stable, budget but no urgency). Hot ICPs reply fast but are crowded. Cold ICPs have less competition and higher LTV.",
    seo_keywords: [
      "find B2B leads 2026", "how to find B2B leads without buying data", "AI lead generation B2B",
      "alternative to Apollo ZoomInfo", "Google Maps B2B leads", "personalized cold outreach AI",
    ],
  },
  {
    slug: "ai-marketing-small-business-guide-2026",
    title: "AI marketing for small business: the 2026 complete guide",
    reading_minutes: 8,
    audience: "Small business owners, solopreneurs, 1-10 person teams",
    tagline: "From 0 to predictable organic growth using AI — a clear 30-day plan for small businesses without a marketing team or agency budget.",
    intro: "Every small business owner in 2026 faces the same math: hiring a marketer costs €3000+/month. An agency costs €1500+/month and 3-month contracts. DIY eats 15 hours/week you don't have. AI finally tips the balance — the right AI marketing stack costs €50-100/month and replaces 80% of what a junior marketer does. This guide is the practical 30-day plan: which tools, which order, what to automate first, what NOT to automate.",
    steps: [
      { heading: "Week 1 · Set Brand Voice + ICP", body: "Before generating a single post, teach AI who you are and who you serve. Open Brand Voice, paste 5-10 existing captions. AI extracts the profile. Write your ICP in one specific paragraph. Every AI output now respects both — no more generic 'engage with our amazing product'." },
      { heading: "Week 1 · Pick 2 platforms, not 5", body: "Small businesses with 2 platforms outperform those with 5. Pick where your ICP actually spends time: LinkedIn (B2B services), Instagram (B2C visual), TikTok (B2C broad reach), YouTube Shorts (authority building). Ignore the rest." },
      { heading: "Week 2 · Generate 30 days in one session", body: "Campaign Auto-Pilot: write a 2-sentence brief ('April theme: productivity for small teams, soft push to free PDF'). AI generates 30 on-brand posts with captions + images + hashtags. Review, tweak 20%, approve. 30 min total. Used to take a week." },
      { heading: "Week 2 · Auto-schedule across your calendar", body: "Drop all 30 posts onto the Calendar. AI picks optimal times per platform based on audience timezone and historical engagement. 0 min/day going forward." },
      { heading: "Week 3 · Set up outbound (50 warm leads)", body: "While organic builds, go outbound. Lead Finder: mine 50 ICP-matching companies. AI drafts personalized outreach per company. Launch day 1, follow-up day 3 and 7. Auto-stop on reply." },
      { heading: "Week 3 · Lead-magnet landing page", body: "Add one lead magnet on your homepage (PDF, checklist, mini-course). Image Studio generates the cover. AI drafts the PDF from 5 bullets. Connect to your email list. Organic + outbound both funnel here." },
      { heading: "Week 4 · Analyze + double down", body: "Dashboard shows which 5 posts drove most engagement. A/B Winner Picker shows which caption style converts. Repurpose Studio turns top 3 posts into Reels + TikToks + threads. You now have data, not hunches." },
      { heading: "After Day 30 · Compounding starts", body: "You spend 2 hours/week maintaining the system. Content keeps shipping. Leads keep replying. Brand voice gets sharper. By month 3: 90 posts live, 100+ conversations, a library of what works. Try doing that manually for €100/month — you can't." },
    ],
    related_feature_slug: "campaign",
    related_app_path: "/studio/campaign",
    cta_label: "Start 30-day plan",
    pro_tip: "Biggest mistake small businesses make with AI: using it to publish MORE. The leverage is publishing SMARTER. 5 great AI-refined posts outperform 25 mediocre AI-blasted ones.",
    seo_keywords: [
      "AI marketing for small business", "small business AI marketing 2026", "AI marketing strategy SMB",
      "marketing automation small business", "how small business can use AI", "affordable AI marketing tools",
    ],
  },
  {
    slug: "linkedin-content-strategy-2026",
    title: "LinkedIn content strategy 2026: the 5-pillar framework",
    reading_minutes: 7,
    audience: "B2B founders, consultants, agency owners, salespeople",
    tagline: "The LinkedIn playbook that works after the 2026 algorithm changes: what to post, when, and why most 'thought leadership' accounts die in 90 days.",
    intro: "LinkedIn in 2026 punishes 3 things: engagement bait, pure promotion, and AI-obvious generic posts. It rewards 3 things: specific stories with numbers, contrarian-but-defensible takes, and consistency at medium frequency (3-5x/week, not daily). This guide gives the 5-pillar content framework top performers actually use — adapted for solo founders and small agencies without a 10-person content team.",
    steps: [
      { heading: "Pillar 1 · Numbered stories (40%)", body: "Hook with specific number ('Last month I turned down €40K in consulting work'), 5-7 short paragraphs of story, one-line lesson at the end. Outperforms every other format 3:1. Why: the 2026 algorithm optimizes for dwell time, not raw likes. Stories = high dwell." },
      { heading: "Pillar 2 · Contrarian opinions (20%)", body: "Not hot takes. Contrarian opinions backed by reasoning. 'Everyone says you need 10k followers to monetize. Here's why 500 hyper-engaged beats 10k passive.' Popular belief → counter-evidence → practical implication. Comments explode (people argue = algorithm boost)." },
      { heading: "Pillar 3 · Behind-the-scenes ops (20%)", body: "Show the mess, not the polish. 'Our last campaign failed. Here's what we thought, what happened, and what we'd do differently.' Builds massive trust. Only 10% of creators do it because it requires vulnerability — underrated leverage." },
      { heading: "Pillar 4 · Tactical how-tos (15%)", body: "Step-by-step format. 'How I closed a €30K deal in one email' with the redacted email. 'How we cut ad spend 60% in 30 days' with the dashboard screenshot. Specific tactics > abstract frameworks. Save rates go up (long-term algo boost)." },
      { heading: "Pillar 5 · Pattern recognition (5%)", body: "'3 things I noticed reviewing 100 B2B landing pages this month.' You're synthesizing what you see across cases. Harder to write, highest authority. Reserved for your best weekly take. Must be based on actual observed data, not ChatGPT guessing." },
      { heading: "Cadence · 4x/week, not daily", body: "2026 LinkedIn penalizes daily posting unless you're already a 100k+ follower account. 4x/week (Mon/Tue/Thu/Fri) is the sweet spot under 50k. Avoid weekends (B2B reach drops 60%). Post between 8-10am in your audience's timezone." },
      { heading: "Comments > likes always", body: "Reply to every comment in the first 90 minutes. Ask a genuine question back. Ignore one-word comments ('Great post!'); engage thoughtful ones deeply. This trains LinkedIn that your posts drive real conversation = permanent reach boost." },
      { heading: "Repurpose · 1 post → 4 assets", body: "Monday's numbered story becomes: (1) Twitter thread Tue, (2) Instagram carousel Wed, (3) TikTok video Thu, (4) YouTube Short Fri. Repurpose Studio does this in 10 min. Your LinkedIn post now earns 4x cross-platform reach." },
    ],
    related_feature_slug: "campaign",
    related_app_path: "/studio/campaign",
    cta_label: "Plan LinkedIn content",
    pro_tip: "Track ONE metric: 'quality comments per post'. If you're getting 10+ thoughtful comments, your content is working — regardless of likes. Likes can be gamed; comments require people actually reading and caring.",
    seo_keywords: [
      "LinkedIn content strategy 2026", "LinkedIn algorithm 2026", "LinkedIn content pillars B2B",
      "how to grow on LinkedIn 2026", "LinkedIn posting strategy", "LinkedIn content framework",
    ],
  },
];

export function getGuide(slug: string): Guide | undefined {
  return GUIDES.find((g) => g.slug === slug);
}
