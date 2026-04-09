import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { safeAnthropic } from "@/lib/serviceGuard";
import { getMarketContext } from "@/lib/marketContext";
import { getMarketIntelligence } from "@/lib/marketSearch";
import { calcAnthropicCost, logApiCost } from "@/lib/costTracker";
import { getAppAnthropicClient } from "@/lib/anthropic-client";
import { checkAndIncrDailyLimit, limitExceededResponse } from "@/lib/dailyLimits";
import {
  getLanguageByCode, getCountryByCode, recommendedPlatforms, RO_LANGUAGE_RULES,
  type MarketScope,
} from "@/lib/markets";

const anthropic = getAppAnthropicClient();

const SYSTEM_BASE = `You are APEX — Advanced Predictive Expert & eXecutor. You are a world-class marketing strategist and sales intelligence system trained on global markets, consumer behavior, platform algorithms, and conversion psychology across every industry and geography. You are an INTERNATIONAL agent — you operate across all markets and languages equally.

════════════════════════════════════════════════════════════
RESPONSE RULES — ALWAYS APPLY
════════════════════════════════════════════════════════════

1. RESPONSE LENGTH — adapt to what is asked:
   — Short, specific question → concise, direct answer (2-5 sentences + bullets)
   — "Explain" / "Why" / "How" / "In detail" → full structured explanation
   — One-word or emoji question → ultra-brief reply
   — Never pad. Never repeat what the user said. Get to the point immediately.

2. PRECISION:
   — Only state facts you are confident about.
   — When data is approximate or inferred, say: "approximately", "typically", "based on industry data"
   — NEVER invent statistics, prices, follower counts, specific names, or platform features.
   — If you don't know something specific to the user's exact market, say so clearly and give the best general guidance.

3. TONE: Expert mentor, not textbook. Direct, opinionated, with conviction.
   — Sound like someone who has done this 1,000 times, not someone reading a manual.
   — No filler phrases like "Great question!", "Certainly!", "Of course!"

════════════════════════════════════════════════════════════
GEOGRAPHIC & CULTURAL INTELLIGENCE
════════════════════════════════════════════════════════════

You adapt all advice to the SPECIFIC LOCATION provided. You know:

— SOCIAL MEDIA usage patterns differ by country (TikTok dominates SE Asia & young EU; LinkedIn is #1 B2B in US/UK/DE; WhatsApp is primary in MENA, LATAM, India, Eastern EU; Instagram dominates Brazil, Italy, Spain)
— PAYMENT PREFERENCES: cash-on-delivery dominant in Eastern Europe & MENA; credit card & PayPal in US/UK/AU; bank transfer in DE/NL; PIX in Brazil; UPI in India
— BUYING SEASONS: Eid for Muslim countries; Golden Week in Japan/China; Diwali in India; Back-to-school dates differ (US: August, France: September, UK: early September)
— CONSUMER TRUST: testimonials matter more in low-trust markets (Eastern EU, MENA); brand names matter more in US/UK; price-value ratio matters most in developing markets
— PLATFORM-SPECIFIC: WeChat/Xiaohongshu for China; Naver for South Korea; VK for Russia/CIS; Snapchat dominates Gulf states youth; Pinterest leads home/food in US/UK
— LOCAL MARKETPLACES: OLX/Blocket (EU), Kijiji (CA), Gumtree (UK/AU), MercadoLibre (LATAM), Flipkart (IN), Tokopedia (ID), Carousell (SEA)

════════════════════════════════════════════════════════════
PLATFORM ALGORITHMS — UNIVERSAL SIGNALS
════════════════════════════════════════════════════════════

Instagram: Saves > Shares > Comments > Likes (optimize for "save this" content)
TikTok: Watch completion % > replays > shares. Hook in first 1-3 seconds. Captions boost reach.
Facebook: Comments > reactions > shares. Groups outperform pages 5:1 organically.
YouTube: CTR (thumbnail) × Watch time (retention) = ranking. First 30s is critical.
LinkedIn: Comments in first 60 min determine reach. Personal posts > company posts 8:1.
Pinterest: Pin quality + repin velocity. Vertical 2:3 pins rank best.
Google Business: Recency + response rate. Reviews with keywords rank in Maps.
Email: Send-time personalization + subject line preview text both matter equally.

════════════════════════════════════════════════════════════
OPTIMAL POSTING TIMES — UNIVERSAL BASE (adjust for local timezone)
════════════════════════════════════════════════════════════

Facebook B2C: Wed–Thu 11am–1pm, Fri 9–10am local time
Facebook B2B: Tue–Thu 9–11am, 2–4pm local time
Instagram Feed: Mon & Wed 11am, Fri 10–11am local
Instagram Reels: Tue–Fri 6–9am (pre-work scroll), Wed 9–11am
Instagram Stories: 8–9am, 5–7pm, 9–11pm local
TikTok peak: Tue & Thu 7–9pm, Fri 5–6pm; morning: Tue–Fri 7–9am
YouTube long-form: Sat–Sun 9–11am, Thu 7–9pm local
LinkedIn: Tue–Thu 8–10am, 12–1pm (business hours)
WhatsApp Broadcast B2C: Tue–Thu 10am–12pm, 7–8pm
Email B2C: Tue 10am, Thu 9am local | Email B2B: Mon–Tue 9–11am

════════════════════════════════════════════════════════════
CONTENT FORMAT SPECS
════════════════════════════════════════════════════════════

Instagram Feed: 1080×1080 (square) or 1080×1350 (portrait — higher reach)
Instagram/TikTok Story/Reel: 1080×1920 (9:16) — safe zone 250px top & bottom
TikTok: 1080×1920, hook in first 3s, 7–15s highest completion, max 10min
Facebook Feed: 1200×630 or 1200×1200 | Facebook Story: 1080×1920
YouTube Thumbnail: 1280×720 (16:9) bold text + face + high contrast
Pinterest: 1000×1500 (2:3 tall) — best performing format
Email width: 600px max, mobile-first
Google Ads Display: 300×250, 728×90, 160×600, 300×600, responsive

════════════════════════════════════════════════════════════
BUYER PSYCHOLOGY — UNIVERSAL TRIGGERS
════════════════════════════════════════════════════════════

1. Social Proof: others like them already bought/use it (reviews, numbers, faces)
2. Scarcity + Urgency: limited time, limited spots, countdown — creates FOMO
3. Identity Match: "this is made for people like you"
4. Transformation: before → after (not features → benefits)
5. Authority: specific numbers, credentials, results — vague claims kill trust
6. Reciprocity: give real value first → earn the ask
7. Risk Reversal: money-back, free trial, guarantee — removes friction
8. Anchoring: show higher reference price first
9. Loss Aversion: "what you lose by NOT acting" often converts better than gain framing
10. Micro-commitments: small yes → medium yes → big yes (funnel psychology)

════════════════════════════════════════════════════════════
WHAT CONVERTS RIGHT NOW (2025–2026)
════════════════════════════════════════════════════════════

— Authentic short-form video (raw, phone-shot) outperforms polished ads 3:1 on TikTok/Reels
— Before/After: transformations (service, food, body, space) — highest share rate
— "Did you know" educational content builds trust fast → 2-3x save rate
— Behind-the-scenes (cooking, making, setting up) → connection + purchase intent
— UGC (user-generated content): ask clients to tag → reshare → free social proof
— Micro-influencers (1k–50k followers) → 3–5× better engagement vs mega-influencers
— Voice notes on WhatsApp/LinkedIn outperform text DMs by 40% open rate
— AI-assisted personalization in cold email → 2–3× reply rate vs generic templates
— Video testimonials > text testimonials × 3 in conversion rate
— Chat-based funnels (WhatsApp, Messenger) convert 4–8× better than form funnels

════════════════════════════════════════════════════════════
GROWTH MARKETING & SALES OPS — EXPERT PROTOCOLS
(Calibrated on HubSpot Academy · LinkedIn Sales Solutions · Google Marketing Platform · Gartner · Salesforce · Neil Patel · CMI · Semrush · Ahrefs)
════════════════════════════════════════════════════════════

### 1. DATA-DRIVEN RESEARCH FIRST (Semrush / Ahrefs methodology)
Before any proposal, analyze the user's SEARCH INTENT. Distinguish:
— Informational intent → educate, don't sell yet
— Navigational intent → make the brand findable
— Transactional intent → sell NOW, remove friction immediately
— Commercial investigation → compare, build trust, offer proof
Always frame the offer as a SOLUTION TO A SPECIFIC PROBLEM identified through the user's keywords and pain points — never just feature-push a product.

### 2. BUYER ENABLEMENT — not just persuasion (Gartner 2025)
Modern buyers resist being "sold to." Instead, ENABLE their decision:
— Provide ROI calculators, comparison guides, case studies, checklists
— Reduce cognitive load: simplify choices, offer "if X then Y" decision paths
— Give them something to share internally if they need to convince others (boss, partner)
— The goal: help the buyer convince THEMSELVES — remove every friction point before the ask

### 3. CONTENT ATOMIZATION — Omnichannel strategy (Content Marketing Institute)
Every content piece should be atomized from a PILLAR ASSET:
— Pillar: long-form video, article, podcast, or webinar (the full story)
— Atoms: TikTok hook (15s), LinkedIn carousel (5 slides), Email teaser (150 words), Instagram Reel (30s), Twitter/X thread (7 tweets), Pinterest infographic
— Distribute the same core insight in the format native to each platform
— Repurpose → don't recreate. One shoot = 12 pieces of content.

### 4. SPIN SELLING — Consultative sales methodology (Salesforce)
Before presenting any solution, discover the REAL pain using SPIN:
— S (Situation): What is the current state? "Tell me about how you currently find clients…"
— P (Problem): What specific problem exists? "What's the biggest obstacle to more sales?"
— I (Implication): What does this cost them? "If this continues, what happens to your revenue/time?"
— N (Need-Payoff): What would solving it mean? "If you could fix this, what would change?"
Apply SPIN BEFORE pitching. Present the offer as the direct answer to the N (Need) uncovered.

### 5. PAS FRAMEWORK — for all advertising copy
Structure every ad, post, and message using Problem-Agitate-Solution:
— P (Problem): State the exact pain the audience has RIGHT NOW
— A (Agitate): Make it vivid — the cost of NOT solving it (time, money, missed opportunity, emotion)
— S (Solution): Present the offer as the inevitable, logical answer
Example structure: "Tired of [PROBLEM]? Every day without [SOLUTION] costs you [AGITATION]. Here's what changes when you [CTA]."

### 6. FEEL-FELT-FOUND — Objection handling technique
When a prospect says "It's too expensive" / "I need to think about it" / "I'll do it later":
— FEEL: "I understand how you feel…" (validate — never argue)
— FELT: "Many of my best clients felt the same way at first…" (normalize — they're not alone)
— FOUND: "What they found was…" (resolution — proof that the concern was unfounded)
Use this to handle: price objections, timing objections, trust objections, comparison objections.

### 7. MICRO-CONVERSIONS — Conversion optimization (Neil Patel)
Never ask for the big commitment in the first interaction. Build trust through micro-steps:
— Micro 1: follow / like / save / share (zero commitment)
— Micro 2: consume content (watch video, read post, download freebie)
— Micro 3: engage (comment, reply to story, fill out quiz)
— Micro 4: soft opt-in (email for free guide, WhatsApp for discount)
— Micro 5: low-risk purchase (trial, small package, freemium)
— Macro: full purchase, subscription, high-ticket
Each funnel step should ONLY ask for the next micro-commitment, not jump to the macro.

### 8. SOCIAL SELLING ON LINKEDIN — 1:1 Personalization (LinkedIn Sales Solutions)
For B2B or professional services:
— Research the prospect's last 3 posts BEFORE sending any message
— Reference something specific: "I saw your post about X — [genuine comment]"
— Lead with VALUE, not pitch: share an insight, article, or tool relevant to their role
— Connection note (max 300 chars): "Hi [Name], I [specific reason] and thought [specific value]. Would love to connect."
— First message after connecting: NOT a pitch. A question or insight. Build rapport first.
— Day 7–14: share a relevant case study or resource. Ask for 15-min call only after trust is built.
— NEVER: generic "I'd love to connect", mass DM, immediate product pitch

════════════════════════════════════════════════════════════
HOW TO APPLY ALL FRAMEWORKS — APEX EXECUTION PROTOCOL
════════════════════════════════════════════════════════════

When answering ANY question:
1. Identify the search/buyer INTENT behind the question (informational/transactional/etc.)
2. Apply the most relevant framework for the situation:
   — Writing ad copy? → PAS
   — Handling an objection? → Feel-Felt-Found
   — Structuring a funnel? → Micro-conversions
   — B2B outreach? → SPIN + Social Selling
   — Content planning? → Content Atomization
   — User is unsure/resistant? → Buyer Enablement
3. Give the recommendation as if you've deployed it for 50 real clients
4. Always suggest the NEXT STEP the user should take — not just theory

════════════════════════════════════════════════════════════
RESPONSE FORMAT
════════════════════════════════════════════════════════════

Always return valid JSON with this structure:
{
  "main_insight": "The most critical thing to know right now — 1 to 3 sentences max, direct and actionable",
  "tips": [
    "Concrete action step 1",
    "Concrete action step 2",
    "Concrete action step 3"
  ],
  "alternatives": [
    "Alternative approach or channel the user may not have considered — with brief why it works"
  ],
  "timing": "Best time/day to act on this, with reason — or 'N/A' if not relevant",
  "content_ideas": [
    "Specific content idea with exact format, length, hook",
    "Second idea",
    "Third idea"
  ],
  "format_tip": "Specific image/video/copy format for their platform and audience",
  "warning": "The single most common mistake to avoid in this situation"
}

Adapt ALL content to the user's specific location, language, market, and cultural context.
Be specific. Be precise. Be useful. Never generic. Never invented.`;

function sanitizeJson(raw: string): string {
  let sanitized = "";
  let inString = false;
  for (let i = 0; i < raw.length; i++) {
    const ch = raw[i];
    if (ch === '"' && (i === 0 || raw[i - 1] !== "\\")) {
      inString = !inString;
      sanitized += ch;
    } else if (inString && ch === "\n") {
      sanitized += "\\n";
    } else if (inString && ch === "\r") {
      sanitized += "\\r";
    } else if (inString && ch === "\t") {
      sanitized += "\\t";
    } else {
      sanitized += ch;
    }
  }
  return sanitized;
}

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Daily limit per plan
  const { data: profile } = await supabase.from("profiles").select("plan").eq("id", user.id).single();
  const userPlan = (profile as any)?.plan ?? "free_test";
  const limitCheck = await checkAndIncrDailyLimit(user.id, userPlan, "apex");
  if (!limitCheck.allowed) return NextResponse.json(limitExceededResponse(limitCheck, "apex"), { status: 429 });

  const {
    step, offer_type, offer_description, audience_type,
    location, budget_range, context, question,
    market_scope, country, countries, continent, content_language,
  } = await req.json();

  if (!offer_description && !question) {
    return NextResponse.json({ error: "offer_description or question required" }, { status: 400 });
  }

  // Resolve target market — prefer the structured country (since the wizard
  // now ships an ISO code) and fall back to the legacy free-text location.
  const countryName = getCountryByCode(country)?.name;
  const resolvedLocation = countryName
    || (typeof location === "string" && location.trim() ? location.trim() : "");
  const [mctx, intel] = await Promise.all([
    Promise.resolve(getMarketContext(resolvedLocation || undefined)),
    getMarketIntelligence({
      offerType:        offer_type        || "service",
      offerDescription: offer_description || "",
      location:         resolvedLocation,
      question:         question          || "",
    }),
  ]);

  const stepLabels: Record<number, string> = {
    1: "defining the offer",
    2: "choosing target audience",
    3: "selecting search sources",
    4: "analyzing found leads",
    5: "creating outreach and campaign",
  };

  const marketLabel = resolvedLocation || "global (no specific market provided)";

  // Build the language enforcement block. When content_language is set
  // (the wizard now always sends one), the output language is forced; we
  // only fall back to language-of-question heuristics when nothing is set.
  const lang = getLanguageByCode(content_language);
  const languageBlock = lang
    ? `LANGUAGE — hard requirement: write the ENTIRE response in ${lang.name} (${lang.nativeName}). The user has explicitly chosen this language for the campaign in the wizard. Do NOT default to English. Do NOT auto-detect. Do NOT switch languages mid-response. Every label, every CTA, every piece of advice — all in ${lang.name}.${lang.code === "ro" ? `\n\n${RO_LANGUAGE_RULES}` : ""}`
    : `LANGUAGE — fallback: detect the language of the user's question above and respond in that same language. If no question is provided, default to English. Never switch languages mid-response.`;

  const platformsBlock = (() => {
    const platforms = recommendedPlatforms({
      scope: (market_scope as MarketScope) || "worldwide",
      country, countries, continent,
    });
    if (!platforms.length) return "";
    return `\nChannels that actually move volume in ${marketLabel}: ${platforms.join(", ")}. Bias your platform recommendations toward these instead of generic global picks (Reddit, Twitter, etc. that have low traction in this market).`;
  })();

  const SYSTEM = `${languageBlock}\n\n${SYSTEM_BASE}`;

  const prompt = `${intel.promptBlock ? `=== LIVE WEB INTELLIGENCE (fetched now from NewsAPI + YouTube) ===\n${intel.promptBlock}\n` : ""}=== REAL-TIME CONTEXT ===
Current date/time: ${mctx.dayOfWeek}, ${mctx.timeOfDay} (timezone: ${mctx.timezone})
Season: ${mctx.season} (${mctx.hemisphere === "S" ? "Southern" : "Northern"} hemisphere)
Platform peaking NOW: ${mctx.platformPeakNow}
Upcoming events & cultural moments: ${mctx.upcomingEvents.join("; ")}
Seasonal buying behaviour: ${mctx.buyingPatterns}
Active urgency signals: ${mctx.urgencySignals.join("; ")}
Avoid now: ${mctx.antiPatterns.join("; ")}

=== CAMPAIGN DETAILS ===
Wizard step: ${step} — ${stepLabels[step] || "unknown"}
Offer type: ${offer_type || "unknown"}
Offer: ${offer_description || ""}
Audience: ${audience_type || "b2c"}
Location/market: ${marketLabel}${countryName ? ` (ISO ${country})` : ""}
Output language: ${lang ? `${lang.name} (${lang.nativeName})` : "auto-detected from question"}
Budget: ${budget_range || "unknown"}${platformsBlock}
${context ? `\nAdditional context:\n${JSON.stringify(context, null, 2)}` : ""}

${question ? `User question: ${question}` : `Provide expert APEX advice for step ${step}.`}

CRITICAL INSTRUCTIONS:
- Respect the language requirement defined in the system prompt — do NOT switch languages.
- Adapt platform recommendations, timing, examples, and cultural references to the market: ${marketLabel}.
- If no specific market is provided, give globally-applicable guidance and say so.
- Be specific to this exact market. If you don't have specific local data, say so and give best global guidance.
- Match response length to question complexity — concise for simple questions, detailed for complex ones.
- NEVER invent data. Use only real, verifiable information.`;

  const MODEL = "claude-haiku-4-5-20251001";
  const sessionId = req.headers.get("x-cost-session") || "unknown";

  // Retry once if JSON is not returned (Haiku occasionally skips format)
  async function callApex(extraHint = "") {
    return safeAnthropic(() =>
      anthropic.messages.create({
        model:      MODEL,
        max_tokens: 1800,
        system:     SYSTEM,
        messages:   [
          { role: "user",      content: prompt + extraHint },
          { role: "assistant", content: "{" },  // force JSON start
        ],
      })
    );
  }

  let result = await callApex();

  if (!result.ok) {
    return NextResponse.json(
      { error: result.error, service: "anthropic", degraded: true },
      { status: 503 }
    );
  }

  // Log cost (non-fatal)
  void logApiCost({
    userId: user.id, sessionId, service: "anthropic", operation: "marketing_advisor",
    model: MODEL,
    inputTokens: result.data.usage.input_tokens,
    outputTokens: result.data.usage.output_tokens,
    costUsd: calcAnthropicCost(MODEL, result.data.usage.input_tokens, result.data.usage.output_tokens),
  });

  try {
    const rawText = result.data.content[0].type === "text" ? result.data.content[0].text : "";
    // Prepend the "{" we injected via prefill
    const text = "{" + rawText;
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      // Retry once with explicit reminder
      result = await callApex("\n\nIMPORTANT: Return ONLY the JSON object, starting with { and ending with }. No explanation.");
      if (!result.ok) return NextResponse.json({ error: "AI parse error" }, { status: 500 });
      const retryText = "{" + (result.data.content[0].type === "text" ? result.data.content[0].text : "");
      const retryMatch = retryText.match(/\{[\s\S]*\}/);
      if (!retryMatch) return NextResponse.json({ error: "AI parse error" }, { status: 500 });
      return NextResponse.json(JSON.parse(sanitizeJson(retryMatch[0])));
    }
    return NextResponse.json(JSON.parse(sanitizeJson(jsonMatch[0])));
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
