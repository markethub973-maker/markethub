import type { Metadata } from "next";
import Link from "next/link";
import {
  Zap, BarChart2, Search, Brain, Instagram, Youtube, TrendingUp,
  Users, Globe, Target, ChevronRight, Check, Star, ArrowRight,
  Sparkles, Shield, Clock, DollarSign, Play,
  Megaphone, PenTool, BookOpen, BarChart, MessageSquare,
} from "lucide-react";
import GlassCard from "@/components/ui/GlassCard";
import DashboardPreviewMockup from "@/components/ui/DashboardPreviewMockup";
import FaqItem from "./FaqItem";

export const metadata: Metadata = {
  title: "From 6 Tools to 1 — Save 12h/week on Social Media Marketing",
  description:
    "1 brief → 5 posts ready to publish. 500 prospects/week without manual search. Analytics in 3 seconds. For agencies managing 8+ clients who want to scale without hiring.",
  alternates: { canonical: "https://markethubpromo.com/promo" },
};

// ── Dark Liquid Glass palette ────────────────────────────────────────────────
const D = {
  heading: "rgba(255,255,255,0.95)",
  body: "rgba(255,255,255,0.65)",
  muted: "rgba(255,255,255,0.35)",
  accent: "#f59e0b",
  accentDark: "#d97706",
  border: "rgba(255,255,255,0.08)",
  cardBg: "rgba(255,255,255,0.04)",
  cardBorder: "rgba(255,255,255,0.08)",
};

/**
 * Safely produce a semi-transparent version of a color.
 * Works with both hex (#RRGGBB) and CSS variables (var(--x)).
 * For hex colors, appends a 2-digit alpha suffix (e.g. #F59E0B15).
 * For CSS variables, uses color-mix() for proper alpha blending.
 */
function withAlpha(color: string, hexAlpha: string): string {
  if (color.startsWith("var(")) {
    // hexAlpha like "15" = 0x15/0xFF = ~8%, "40" = ~25%, "08" = ~3%, "06" = ~2%, "12" = ~7%, "25" = ~15%, "30" = ~19%
    const pct = Math.round((parseInt(hexAlpha, 16) / 255) * 100);
    return `color-mix(in srgb, ${color} ${pct}%, transparent)`;
  }
  return `${color}${hexAlpha}`;
}

// ── Data ──────────────────────────────────────────────────────────────────────
const FEATURES = [
  {
    icon: <Sparkles className="w-5 h-5" />,
    color: "#8B5CF6",
    title: "Images + Video + Audio — No Designer Needed",
    description:
      "Generate branded visuals, short Reels, voiceovers and music — without Canva, without a designer. Your brand voice is baked in, so every output sounds like your client, not generic stock.",
    badge: "New",
  },
  {
    icon: <Zap className="w-5 h-5" />,
    color: "#f59e0b",
    title: "1 Brief → 5 Posts Ready to Publish. 2 Minutes.",
    description:
      "Write one brief about your client's new product. Get 5 complete posts with hooks, captions, hashtags, and images — each written in your client's brand voice. Schedule all with one click.",
    badge: "Most loved",
  },
  {
    icon: <Search className="w-5 h-5" />,
    color: "#f59e0b",
    title: "500 New Prospects This Week — No Manual Search",
    description:
      "Describe your ideal client. The system finds them across 8 platforms, scores each by fit, filters out competitors, and drafts personalized outreach in their language. You just review and send.",
    badge: null,
  },
  {
    icon: <BarChart2 className="w-5 h-5" />,
    color: "#6366F1",
    title: "When Clients Ask 'How's the Campaign?' — Answer in 3 Seconds",
    description:
      "YouTube, Instagram, TikTok, Facebook, LinkedIn — all metrics in one dashboard. No more screenshotting 6 different tools. Generate a professional client report in 2 clicks.",
    badge: null,
  },
  {
    icon: <Brain className="w-5 h-5" />,
    color: "#8B5CF6",
    title: "16 Specialized AI Agents",
    description:
      "Market researcher, copywriter, pricing strategist, SEO optimizer, blog writer, ad copy creator, social media creator, landing page writer and 8 more — each a domain expert.",
    badge: "New",
  },
  {
    icon: <Globe className="w-5 h-5" />,
    color: "#10B981",
    title: "Research Hub — 8 Sources",
    description:
      "Search Google, OLX, Instagram, TikTok, Reddit, Facebook Groups, YouTube and Google Maps simultaneously. Save leads to your database with one click.",
    badge: null,
  },
  {
    icon: <Target className="w-5 h-5" />,
    color: "#EF4444",
    title: "APEX Marketing Advisor",
    description:
      "Your senior marketing strategist. Analyzes your market, recommends content pillars, optimal posting times, platform-specific strategies and affiliate opportunities.",
    badge: null,
  },
  {
    icon: <Users className="w-5 h-5" />,
    color: "#EC4899",
    title: "White-Label Client Portal",
    description:
      "Share live IG + TikTok dashboards with clients under your agency brand. Custom logo, colors, password protection. Clients see their data, not your platform.",
    badge: null,
  },
  {
    icon: <PenTool className="w-5 h-5" />,
    color: "#0EA5E9",
    title: "Public REST API + Webhooks",
    description:
      "Build integrations on top of MarketHub. List posts/leads/automations, push events to your Slack/Notion/Zapier on post.published, lead.created, image.generated. HMAC-signed.",
    badge: "Pro+",
  },
];

const AGENTS = [
  { name: "Market Researcher", color: "#d97706", emoji: "🔍" },
  { name: "Pricing Strategist", color: "#16A34A", emoji: "💰" },
  { name: "Copywriter", color: "#8B5CF6", emoji: "✍️" },
  { name: "Ad Copy Creator", color: "#F97316", emoji: "📢" },
  { name: "Landing Page Writer", color: "#0EA5E9", emoji: "🏠" },
  { name: "SEO Optimizer", color: "#10B981", emoji: "🔎" },
  { name: "Blog Writer", color: "#EC4899", emoji: "📝" },
  { name: "Social Media Creator", color: "#6366F1", emoji: "📱" },
  { name: "Email Marketing", color: "#EC4899", emoji: "📧" },
  { name: "Financial Analyst", color: "#10B981", emoji: "📊" },
  { name: "Campaign Brainstorming", color: "#F97316", emoji: "💡" },
  { name: "Prompt Factory", color: "#8B5CF6", emoji: "🎨" },
  { name: "Brand Guidelines", color: "#0EA5E9", emoji: "🎯" },
  { name: "Ad Analysis", color: "#EF4444", emoji: "🕵️" },
  { name: "Deep Research", color: "#6366F1", emoji: "🧪" },
  { name: "Support & Setup", color: "#f59e0b", emoji: "⚡" },
];

const PLANS = [
  {
    id: "free",
    name: "Starter",
    price: 0,
    actions: "5",
    model: "Standard AI",
    color: "#A8967E",
    features: ["14-day free trial", "5 Premium AI Actions/mo", "Basic AI unlimited", "3 tracked channels", "Research Hub", "Lead Database", "Social Analytics"],
  },
  {
    id: "lite",
    name: "Creator",
    price: 24,
    actions: "20",
    model: "Standard AI",
    color: "#f59e0b",
    features: ["20 Premium AI Actions/mo", "Basic AI unlimited", "12 tracked channels", "2 Instagram accounts", "All 16 AI Agents", "Client Portal"],
  },
  {
    id: "pro",
    name: "Pro",
    price: 49,
    actions: "50",
    model: "Premium AI ★",
    color: "#8B5CF6",
    highlight: true,
    badge: "Best Value",
    features: ["50 Premium AI Actions/mo", "Top-tier AI model", "30 tracked channels", "4 Instagram accounts", "Priority Support", "Power Workflows", "All features"],
  },
  {
    id: "business",
    name: "Studio",
    price: 99,
    actions: "200",
    model: "Premium AI ★",
    color: "#EC4899",
    features: ["200 Premium AI Actions/mo", "Top-tier AI model", "100 tracked channels", "10 Instagram accounts", "API Access", "20 client accounts", "White Label"],
  },
  {
    id: "agency",
    name: "Agency",
    price: 249,
    actions: "1,000",
    model: "Premium AI ★",
    color: "#16A34A",
    features: ["1,000 Premium AI Actions/mo", "Top-tier AI model", "Unlimited everything", "White Label", "Full API Access", "SLA 99.9%", "Priority Support"],
  },
];

const FAQS = [
  {
    q: "Do I need a credit card to start?",
    a: "No. The Starter plan is completely free for 14 days — no card required. You get 5 Premium AI Actions per month, access to all analytics dashboards, Research Hub and Lead Database.",
  },
  {
    q: "What's a Premium AI Action?",
    a: "A Premium Action is one use of a specialized AI agent feature: Lead Scoring, Outreach Generator, Full Campaign Builder, or APEX Advisor. Basic AI (captions, drafts, Q&A) is unlimited on all plans.",
  },
  {
    q: "What AI model powers the agents?",
    a: "Creator uses the AI MarketHub Engine Standard tier (fast, efficient). Pro, Studio and Agency use the AI MarketHub Engine Premium tier — delivering noticeably better output quality for complex tasks.",
  },
  {
    q: "Which languages does the platform support?",
    a: "All 16 AI agents support 20+ languages including English, French, German, Spanish, Italian, Greek, Arabic, Japanese, Korean and more. The AI automatically applies native grammar rules and vocabulary — no extra setup.",
  },
  {
    q: "Can I manage multiple client accounts?",
    a: "Yes. Creator starts with 2 Instagram accounts, Pro supports 4, Studio supports 10, and Agency is unlimited. The Client Portal lets you share white-label dashboards with each client.",
  },
  {
    q: "Does it work for local and regional markets?",
    a: "Yes — it's optimized for local market discovery. Local Market Mode activates region-specific sources alongside Google, OLX, Facebook Groups and more. The AI adapts language, tone and platform recommendations to each target market.",
  },
];

const BLOG_POSTS = [
  {
    tag: "Lead Generation",
    tagColor: "#f59e0b",
    title: "How to find 50+ qualified leads per week using AI — without cold calling",
    excerpt:
      "Most marketing agencies spend 3+ hours daily searching for potential clients across Google, social media and directories. Here's how AI can automate this entire process and deliver scored, ranked leads every morning.",
    readTime: "5 min read",
    points: [
      "Define your offer and target market once — AI searches 8 platforms simultaneously",
      "AI scores each lead 1–10 and flags business listings vs. real buyers",
      "Get personalized outreach messages ready to send in any language",
      "Export to CSV or save directly to your Lead Database with pipeline stages",
    ],
  },
  {
    tag: "Analytics",
    tagColor: "#6366F1",
    title: "The 5 Instagram metrics that actually predict client growth (and how to track them)",
    excerpt:
      "Follower count is a vanity metric. The agencies growing their clients' accounts are tracking engagement rate, reach ratio, story exit rate, saves-to-impressions, and profile visits. Here's what each means and how to benchmark against competitors.",
    readTime: "7 min read",
    points: [
      "ER% = (Likes + Comments) / Views × 100. Below 0.5% = poor, 2–5% = good, 5%+ = excellent",
      "Saves-to-impressions ratio predicts content virality better than likes",
      "Story exit rate above 40% means your content hook needs work",
      "Use competitor analysis to benchmark your client against their top 5 rivals",
    ],
  },
  {
    tag: "AI Workflow",
    tagColor: "#10B981",
    title: "The 15-minute daily workflow that replaced 3 hours of manual research",
    excerpt:
      "Agencies using MarketHub Pro follow a simple morning routine: check analytics (3 min), review AI-scored leads (5 min), send outreach (7 min). Total: 15 minutes. Here's the exact workflow step by step.",
    readTime: "4 min read",
    points: [
      "Open dashboard: see overnight analytics updates for all client accounts",
      "Research Hub: AI has pre-searched your saved queries across 8 platforms",
      "Lead Finder: review scored leads, edit outreach message, export batch",
      "APEX Advisor: weekly strategy check — what content to post, when, and why",
    ],
  },
];

const TESTIMONIALS = [
  {
    name: "James W.",
    role: "Marketing Agency Owner, London",
    text: "We went from spending 3 hours/day searching for clients to having 50+ qualified leads delivered every week. The AI outreach messages are better than what we wrote manually.",
    rating: 5,
    metric: "50+ leads/week",
  },
  {
    name: "Markus H.",
    role: "Social Media Manager, Berlin",
    text: "The multi-platform analytics alone is worth the subscription. I manage 8 client accounts and see everything in one place. The competitor analysis feature is game-changing.",
    rating: 5,
    metric: "8 accounts managed",
  },
  {
    name: "Carlos R.",
    role: "E-commerce Brand Owner, Madrid",
    text: "The APEX advisor gave me a content strategy that increased our Instagram ER from 1.2% to 4.8% in 6 weeks. I was skeptical about AI but this actually works.",
    rating: 5,
    metric: "1.2% → 4.8% ER",
  },
  {
    name: "Yuki T.",
    role: "Digital Marketing Director, Tokyo",
    text: "MarketHub Pro changed how our agency operates. The Lead Finder alone saves my team 15 hours per week. The multi-language support works perfectly for our Japanese clients.",
    rating: 5,
    metric: "15h saved/week",
  },
];

// ── JSON-LD Schemas ──────────────────────────────────────────────────────────
const organizationSchema = {
  "@context": "https://schema.org",
  "@type": "Organization",
  name: "MarketHub Pro",
  url: "https://markethubpromo.com",
  logo: "https://markethubpromo.com/og-image.png",
  description:
    "AI marketing platform for agencies. 16 specialized AI agents, real-time social analytics, and an AI lead finder that delivers 50+ qualified leads per week.",
  sameAs: [
    "https://www.linkedin.com/company/markethub-pro",
    "https://twitter.com/markethubpro",
    "https://www.instagram.com/markethubpro",
  ],
  contactPoint: {
    "@type": "ContactPoint",
    email: "markethub973@gmail.com",
    contactType: "customer support",
    availableLanguage: ["English", "Romanian"],
  },
};

const softwareSchema = {
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  name: "MarketHub Pro",
  applicationCategory: "BusinessApplication",
  operatingSystem: "Web",
  offers: {
    "@type": "Offer",
    priceCurrency: "USD",
    price: "0",
    priceValidUntil: "2027-12-31",
    availability: "https://schema.org/InStock",
  },
  aggregateRating: {
    "@type": "AggregateRating",
    ratingValue: "4.9",
    reviewCount: "127",
  },
};

const faqSchema = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: FAQS.map((f) => ({
    "@type": "Question",
    name: f.q,
    acceptedAnswer: {
      "@type": "Answer",
      text: f.a,
    },
  })),
};

export default function PromoPage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationSchema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(softwareSchema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }}
      />

      <div
        style={{
          background: "linear-gradient(135deg, #0d0b1e 0%, #1a0a2e 40%, #0a1628 100%)",
          color: D.body,
          fontFamily: "system-ui, -apple-system, sans-serif",
          minHeight: "100vh",
          position: "relative",
          overflow: "hidden",
        }}
      >
        {/* ── Ambient blobs ──────────────────────────────────────────────── */}
        <div
          aria-hidden="true"
          style={{
            position: "fixed",
            top: "-10vh",
            left: "-8vw",
            width: "45vw",
            height: "45vw",
            borderRadius: "50%",
            background: "radial-gradient(circle, rgba(168,85,247,0.18) 0%, transparent 70%)",
            pointerEvents: "none",
            zIndex: 0,
          }}
        />
        <div
          aria-hidden="true"
          style={{
            position: "fixed",
            bottom: "-10vh",
            right: "-8vw",
            width: "40vw",
            height: "40vw",
            borderRadius: "50%",
            background: "radial-gradient(circle, rgba(245,158,11,0.15) 0%, transparent 70%)",
            pointerEvents: "none",
            zIndex: 0,
          }}
        />
        <div
          aria-hidden="true"
          style={{
            position: "fixed",
            top: "30vh",
            left: "35vw",
            width: "30vw",
            height: "30vw",
            borderRadius: "50%",
            background: "radial-gradient(circle, rgba(16,185,129,0.1) 0%, transparent 70%)",
            pointerEvents: "none",
            zIndex: 0,
          }}
        />

        {/* ── NAV ──────────────────────────────────────────────────────────── */}
        <nav
          style={{
            background: "rgba(13,11,30,0.75)",
            backdropFilter: "blur(20px) saturate(1.6)",
            WebkitBackdropFilter: "blur(20px) saturate(1.6)",
            borderBottom: `1px solid ${D.border}`,
          }}
          className="sticky top-0 z-50 px-6 py-4 flex items-center justify-between"
        >
          <div className="flex items-center gap-2">
            <div
              className="w-8 h-8 rounded-lg flex items-center justify-center"
              style={{ background: `linear-gradient(135deg, ${D.accent}, ${D.accentDark})` }}
            >
              <Zap className="w-4 h-4 text-white" />
            </div>
            <span className="font-bold text-base" style={{ color: D.heading }}>MarketHub Pro</span>
          </div>
          <div className="hidden md:flex items-center gap-6 text-sm" style={{ color: D.muted }}>
            <Link href="/features" className="hover:text-white transition-colors">Features</Link>
            <Link href="/for/agencies" className="hover:text-white transition-colors">Solutions</Link>
            <Link href="/vs/buffer" className="hover:text-white transition-colors">Compare</Link>
            <Link href="/guides" className="hover:text-white transition-colors">Guides</Link>
            <a href="#pricing" className="hover:text-white transition-colors">Pricing</a>
            <a href="#faq" className="hover:text-white transition-colors">FAQ</a>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/login" className="text-sm font-medium px-4 py-2 rounded-lg hover:text-white transition-colors" style={{ color: D.muted }}>
              Sign in
            </Link>
            <Link
              href="/register"
              className="text-sm font-bold px-4 py-2 rounded-lg transition-all hover:opacity-90"
              style={{ backgroundColor: D.accent, color: "#0d0b1e" }}
            >
              Start Free
            </Link>
          </div>
        </nav>

        {/* ── HERO ─────────────────────────────────────────────────────────── */}
        <section className="px-6 py-24 md:py-32 text-center max-w-4xl mx-auto relative z-10">
          <div
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium mb-8"
            style={{
              backgroundColor: "rgba(245,158,11,0.1)",
              color: D.accent,
              border: `1px solid rgba(245,158,11,0.2)`,
            }}
          >
            <Sparkles className="w-4 h-4" />
            For agencies managing 8+ social media clients
          </div>

          <h1 className="text-2xl sm:text-3xl md:text-4xl lg:text-6xl font-bold leading-tight mb-6" style={{ color: D.heading }}>
            From <span style={{ color: D.accent }}>6 tools</span> to 1.
            <br />
            Save <span style={{ color: D.accent }}>12 hours</span> every week.
          </h1>

          <p className="text-xl mb-4 max-w-2xl mx-auto leading-relaxed" style={{ color: D.body }}>
            Write 1 brief, get 5 posts ready to publish. Find 500 prospects without manual search.
            Answer &quot;how&apos;s the campaign?&quot; in 3 seconds. Scale to 50 clients without hiring.
          </p>

          <p className="text-base mb-10 max-w-xl mx-auto" style={{ color: D.muted }}>
            Replace Hootsuite + Canva + ChatGPT + Hunter.io + Excel + Google Analytics with one platform.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-16">
            <Link
              href="/register?plan=free_forever"
              className="flex items-center gap-2 px-8 py-4 rounded-xl text-base font-bold transition-all hover:opacity-90"
              style={{
                background: `linear-gradient(135deg, ${D.accent}, ${D.accentDark})`,
                color: "#0d0b1e",
                boxShadow: `0 8px 32px rgba(245,158,11,0.35)`,
              }}
            >
              Get Started Free — No card required
              <ArrowRight className="w-4 h-4" />
            </Link>
            <Link
              href="/features"
              className="flex items-center gap-2 px-8 py-4 rounded-xl text-base font-semibold transition-all hover:bg-white/5"
              style={{
                color: D.body,
                border: `1px solid ${D.border}`,
                background: "rgba(255,255,255,0.03)",
                backdropFilter: "blur(12px)",
              }}
            >
              <Play className="w-4 h-4" />
              Browse all features
            </Link>
          </div>

          {/* Dashboard preview */}
          <div style={{ marginTop: 48, position: "relative" }}>
            {/* Glow under mockup */}
            <div style={{
              position: "absolute", bottom: -40, left: "50%",
              transform: "translateX(-50%)",
              width: "70%", height: 80,
              background: "radial-gradient(ellipse, rgba(245,158,11,0.25) 0%, transparent 70%)",
              filter: "blur(20px)", pointerEvents: "none",
            }} />

            {/* Browser chrome frame */}
            <div style={{
              background: "rgba(255,255,255,0.06)",
              backdropFilter: "blur(20px)",
              border: "1px solid rgba(255,255,255,0.12)",
              borderRadius: 16, overflow: "hidden",
              boxShadow: "0 32px 80px rgba(0,0,0,0.6)",
            }}>
              {/* Browser top bar with 3 dots */}
              <div style={{
                height: 36, background: "rgba(0,0,0,0.3)",
                display: "flex", alignItems: "center", gap: 6, padding: "0 12px",
                borderBottom: "1px solid rgba(255,255,255,0.06)",
              }}>
                <div style={{ width:10, height:10, borderRadius:"50%", background:"rgba(239,68,68,0.5)" }} />
                <div style={{ width:10, height:10, borderRadius:"50%", background:"rgba(245,158,11,0.5)" }} />
                <div style={{ width:10, height:10, borderRadius:"50%", background:"rgba(16,185,129,0.5)" }} />
                <div style={{ flex:1, margin:"0 8px", background:"rgba(255,255,255,0.05)", borderRadius:4, height:18, display:"flex", alignItems:"center", justifyContent:"center" }}>
                  <span style={{ fontSize:9, color:"rgba(255,255,255,0.3)" }}>markethubpromo.com/dashboard</span>
                </div>
              </div>
              <DashboardPreviewMockup />
            </div>
          </div>

          {/* Trust stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 max-w-2xl mx-auto">
            {[
              { v: "19",   l: "AI features included" },
              { v: "5",    l: "platforms auto-publish" },
              { v: "20+",  l: "languages supported" },
              { v: "7d",   l: "free trial · no card" },
            ].map(s => (
              <div key={s.l} className="text-center">
                <div className="text-3xl font-bold" style={{ color: D.accent }}>{s.v}</div>
                <div className="text-xs mt-1" style={{ color: D.muted }}>{s.l}</div>
              </div>
            ))}
          </div>
        </section>

        {/* ── TRUST BAR ────────────────────────────────────────────────────── */}
        <div
          style={{
            background: "rgba(255,255,255,0.02)",
            borderTop: `1px solid ${D.border}`,
            borderBottom: `1px solid ${D.border}`,
          }}
          className="py-5 px-6 relative z-10"
        >
          <div
            className="max-w-4xl mx-auto flex flex-wrap items-center justify-center gap-x-8 gap-y-3 text-xs font-medium"
            style={{ color: D.muted }}
          >
            {[
              { icon: <Instagram className="w-3.5 h-3.5" style={{ color: "#E1306C" }} />, label: "Instagram Graph API" },
              { icon: <Youtube className="w-3.5 h-3.5" style={{ color: "#FF0000" }} />, label: "YouTube Data API v3" },
              { icon: <TrendingUp className="w-3.5 h-3.5" />, label: "TikTok Trends" },
              { icon: <Search className="w-3.5 h-3.5" style={{ color: D.accent }} />, label: "OLX · Google · Reddit" },
              { icon: <Shield className="w-3.5 h-3.5" style={{ color: "#16A34A" }} />, label: "GDPR Compliant" },
              { icon: <Brain className="w-3.5 h-3.5" style={{ color: "#8B5CF6" }} />, label: "Premium AI Engine" },
              { icon: <Globe className="w-3.5 h-3.5" style={{ color: "#0EA5E9" }} />, label: "20+ Languages" },
            ].map(({ icon, label }) => (
              <div key={label} className="flex items-center gap-1.5">{icon}{label}</div>
            ))}
          </div>
        </div>

        {/* ── FEATURES ─────────────────────────────────────────────────────── */}
        <section id="features" className="px-6 py-24 max-w-5xl mx-auto relative z-10">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold mb-4" style={{ color: D.heading }}>
              Stop paying for 6 tools. Start scaling.
            </h2>
            <p className="text-base max-w-xl mx-auto" style={{ color: D.body }}>
              Every feature built for one outcome: more clients, less manual work, more money in your pocket.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {FEATURES.map((f) => (
              <GlassCard key={f.title} padding="p-6" className="relative">
                {f.badge && (
                  <span
                    className="absolute top-4 right-4 text-xs font-bold px-2 py-0.5 rounded-full"
                    style={{ backgroundColor: withAlpha(f.color, "25"), color: f.color }}
                  >
                    {f.badge}
                  </span>
                )}
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center mb-4"
                  style={{ backgroundColor: withAlpha(f.color, "20") }}
                >
                  <span style={{ color: f.color }}>{f.icon}</span>
                </div>
                <h3 className="font-bold text-base mb-2" style={{ color: D.heading }}>{f.title}</h3>
                <p className="text-sm leading-relaxed" style={{ color: D.body }}>{f.description}</p>
              </GlassCard>
            ))}
          </div>
        </section>

        {/* ── AI AGENTS ────────────────────────────────────────────────────── */}
        <section
          id="agents"
          style={{
            background: "rgba(255,255,255,0.02)",
            borderTop: `1px solid ${D.border}`,
            borderBottom: `1px solid ${D.border}`,
          }}
          className="px-6 py-20 relative z-10"
        >
          <div className="max-w-4xl mx-auto">
            <div className="text-center mb-3">
              <h2 className="text-3xl font-bold mb-3" style={{ color: D.heading }}>
                16 AI Agents. Every marketing discipline. One subscription.
              </h2>
              <p className="text-base max-w-xl mx-auto" style={{ color: D.body }}>
                Each agent is purpose-built for its domain. They work independently or in sequence through Power Workflows.
              </p>
            </div>

            {/* 3 power workflows highlight */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 my-10">
              {[
                { icon: <Megaphone className="w-4 h-4" />, color: "#F97316", title: "Launch a Feature", steps: "Market Research → Copy → Landing Page → SEO → Blog" },
                { icon: <Target className="w-4 h-4" />, color: "#EF4444", title: "Paid Ads Campaign", steps: "Research → Ad Copy → Landing Page → Pricing Strategy" },
                { icon: <TrendingUp className="w-4 h-4" />, color: "#10B981", title: "Organic Growth", steps: "SEO Keywords → Blog → Social Media → CTA Copy" },
              ].map(w => (
                <GlassCard key={w.title} padding="p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <span style={{ color: w.color }}>{w.icon}</span>
                    <span className="font-bold text-sm" style={{ color: D.heading }}>{w.title}</span>
                  </div>
                  <p className="text-xs" style={{ color: D.body }}>{w.steps}</p>
                </GlassCard>
              ))}
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {AGENTS.map((a) => (
                <div
                  key={a.name}
                  className="rounded-xl px-3 py-2.5 flex items-center gap-2"
                  style={{
                    backgroundColor: withAlpha(a.color, "12"),
                    border: `1px solid ${withAlpha(a.color, "25")}`,
                  }}
                >
                  <span className="text-base">{a.emoji}</span>
                  <span className="font-medium text-xs" style={{ color: D.heading }}>{a.name}</span>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── IMPACT STATS ─────────────────────────────────────────────────── */}
        <section
          style={{
            background: "linear-gradient(135deg, rgba(245,158,11,0.08) 0%, rgba(139,92,246,0.06) 100%)",
            borderBottom: `1px solid ${D.border}`,
          }}
          className="py-24 px-6 relative z-10"
        >
          <div className="max-w-4xl mx-auto">
            <h2 className="text-2xl font-bold text-center mb-10" style={{ color: D.heading }}>
              The math is simple
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-center">
              <GlassCard padding="p-8">
                <div className="flex items-center justify-center gap-2 mb-3">
                  <Clock className="w-5 h-5" style={{ color: D.accent }} />
                  <span className="text-4xl font-bold" style={{ color: D.accent }}>3h</span>
                </div>
                <p className="font-semibold mb-1" style={{ color: D.heading }}>Saved every day</p>
                <p className="text-sm" style={{ color: D.body }}>15 min × 12 AI actions = 3 hours back in your week, every week</p>
              </GlassCard>
              <GlassCard padding="p-8">
                <div className="flex items-center justify-center gap-2 mb-3">
                  <DollarSign className="w-5 h-5" style={{ color: "#16A34A" }} />
                  <span className="text-4xl font-bold" style={{ color: "#16A34A" }}>$750</span>
                </div>
                <p className="font-semibold mb-1" style={{ color: D.heading }}>Operational savings/month</p>
                <p className="text-sm" style={{ color: D.body }}>50 Pro actions × 15 min × $25/hr = $312. Senior copywriter cost avoided = $438.</p>
              </GlassCard>
              <GlassCard padding="p-8">
                <div className="flex items-center justify-center gap-2 mb-3">
                  <TrendingUp className="w-5 h-5" style={{ color: "#6366F1" }} />
                  <span className="text-4xl font-bold" style={{ color: "#6366F1" }}>15×</span>
                </div>
                <p className="font-semibold mb-1" style={{ color: D.heading }}>ROI on subscription</p>
                <p className="text-sm" style={{ color: D.body }}>Pro plan at $49/month. Value delivered: $750+. ROI: 15x minimum.</p>
              </GlassCard>
            </div>
          </div>
        </section>

        {/* ── TESTIMONIALS ─────────────────────────────────────────────────── */}
        <section className="px-6 py-24 max-w-4xl mx-auto relative z-10">
          <h2 className="text-2xl font-bold text-center mb-8" style={{ color: D.heading }}>
            What agencies say
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {TESTIMONIALS.map((t) => (
              <GlassCard key={t.name} padding="p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex gap-0.5">
                    {Array.from({ length: t.rating }).map((_, i) => (
                      <Star key={i} className="w-4 h-4" style={{ color: D.accent, fill: D.accent }} />
                    ))}
                  </div>
                  <span
                    className="text-xs font-bold px-2 py-1 rounded-full"
                    style={{ backgroundColor: "rgba(245,158,11,0.15)", color: D.accent }}
                  >
                    {t.metric}
                  </span>
                </div>
                <p className="text-sm leading-relaxed mb-5" style={{ color: D.body }}>&ldquo;{t.text}&rdquo;</p>
                <div>
                  <p className="font-semibold text-sm" style={{ color: D.heading }}>{t.name}</p>
                  <p className="text-xs mt-0.5" style={{ color: D.muted }}>{t.role}</p>
                </div>
              </GlassCard>
            ))}
          </div>
        </section>

        {/* ── PRICING ──────────────────────────────────────────────────────── */}
        <section
          id="pricing"
          style={{
            background: "rgba(255,255,255,0.02)",
            borderTop: `1px solid ${D.border}`,
            borderBottom: `1px solid ${D.border}`,
          }}
          className="px-6 py-24 relative z-10"
        >
          <div className="max-w-5xl mx-auto">
            <div className="text-center mb-4">
              <h2 className="text-3xl md:text-4xl font-bold mb-3" style={{ color: D.heading }}>
                Pricing that pays for itself
              </h2>
              <p className="text-base mb-2" style={{ color: D.body }}>
                Start free. Upgrade when you see results. No hidden fees, no contracts.
              </p>
              <p className="text-sm" style={{ color: D.muted }}>
                Pro delivers $750+ in value at $49/month — that&apos;s 15x ROI.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5 mt-10">
              {PLANS.map((plan) => (
                <div
                  key={plan.id}
                  className="rounded-2xl p-6 flex flex-col relative"
                  style={{
                    backgroundColor: plan.highlight
                      ? `${plan.color}`
                      : "rgba(255,255,255,0.03)",
                    border: `1px solid ${plan.highlight ? plan.color : D.border}`,
                    boxShadow: plan.highlight
                      ? `0 8px 40px ${withAlpha(plan.color, "35")}`
                      : "0 2px 8px rgba(0,0,0,0.2)",
                    backdropFilter: plan.highlight ? undefined : "blur(12px)",
                  }}
                >
                  {plan.badge && (
                    <div
                      className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full text-xs font-bold whitespace-nowrap"
                      style={{ backgroundColor: "white", color: plan.color }}
                    >
                      {plan.badge}
                    </div>
                  )}
                  <div className="mb-5">
                    <h3 className="font-bold text-base mb-1" style={{ color: plan.highlight ? "white" : D.heading }}>{plan.name}</h3>
                    <div className="flex items-baseline gap-1">
                      <span className="text-3xl font-bold" style={{ color: plan.highlight ? "white" : plan.color }}>
                        {plan.price === 0 ? "Free" : `$${plan.price}`}
                      </span>
                      {plan.price > 0 && (
                        <span className="text-sm" style={{ color: plan.highlight ? "rgba(255,255,255,0.7)" : D.muted }}>/month</span>
                      )}
                    </div>
                    <div className="text-xs mt-1" style={{ color: plan.highlight ? "rgba(255,255,255,0.8)" : D.muted }}>
                      {plan.actions} Premium Actions · {plan.model}
                    </div>
                  </div>
                  <ul className="flex flex-col gap-2 flex-1 mb-6">
                    {plan.features.map((f) => (
                      <li key={f} className="flex items-start gap-2 text-xs">
                        <Check className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" style={{ color: plan.highlight ? "rgba(255,255,255,0.9)" : "#16A34A" }} />
                        <span style={{ color: plan.highlight ? "rgba(255,255,255,0.9)" : D.body }}>{f}</span>
                      </li>
                    ))}
                  </ul>
                  <Link
                    href="/register"
                    className="text-center py-2.5 rounded-xl text-sm font-semibold transition-all hover:opacity-90 block"
                    style={{
                      backgroundColor: plan.highlight ? "white" : "rgba(245,158,11,0.12)",
                      color: plan.highlight ? plan.color : D.accent,
                    }}
                  >
                    {plan.price === 0 ? "Start Free" : "Get Started Free"}
                  </Link>
                </div>
              ))}
            </div>
            <p className="text-center text-xs mt-6" style={{ color: D.muted }}>
              All paid plans include a 14-day free trial. Cancel anytime.{" "}
              <Link href="/pricing" style={{ color: D.accent }}>Compare all plans →</Link>
            </p>
          </div>
        </section>

        {/* ── MINI BLOG ────────────────────────────────────────────────────── */}
        <section id="blog" className="px-6 py-24 max-w-5xl mx-auto relative z-10">
          <div className="flex items-center justify-between mb-10">
            <div>
              <h2 className="text-3xl font-bold mb-2" style={{ color: D.heading }}>
                Marketing insights & guides
              </h2>
              <p className="text-base" style={{ color: D.body }}>
                Practical tactics used by agencies on MarketHub Pro.
              </p>
            </div>
            <Link
              href="/register"
              className="hidden md:flex items-center gap-1 text-sm font-semibold"
              style={{ color: D.accent }}
            >
              See more in-app <ChevronRight className="w-4 h-4" />
            </Link>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {BLOG_POSTS.map((post) => (
              <GlassCard key={post.title} as="article" padding="p-0" className="overflow-hidden">
                <div className="p-6">
                  <div className="flex items-center gap-3 mb-4">
                    <span
                      className="text-xs font-bold px-2.5 py-1 rounded-full"
                      style={{ backgroundColor: withAlpha(post.tagColor, "20"), color: post.tagColor }}
                    >
                      {post.tag}
                    </span>
                    <span className="text-xs" style={{ color: D.muted }}>{post.readTime}</span>
                  </div>
                  <h3 className="font-bold text-base leading-snug mb-3" style={{ color: D.heading }}>
                    {post.title}
                  </h3>
                  <p className="text-sm leading-relaxed mb-5" style={{ color: D.body }}>
                    {post.excerpt}
                  </p>
                  <ul className="flex flex-col gap-2">
                    {post.points.map((point) => (
                      <li key={point} className="flex items-start gap-2">
                        <Check className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" style={{ color: post.tagColor }} />
                        <span className="text-xs" style={{ color: D.body }}>{point}</span>
                      </li>
                    ))}
                  </ul>
                </div>
                <div style={{ borderTop: `1px solid ${D.border}` }} className="px-6 py-3">
                  <Link
                    href="/register"
                    className="flex items-center gap-1 text-xs font-semibold"
                    style={{ color: D.accent }}
                  >
                    Try it yourself
                    <ArrowRight className="w-3 h-3" />
                  </Link>
                </div>
              </GlassCard>
            ))}
          </div>
        </section>

        {/* ── FAQ ──────────────────────────────────────────────────────────── */}
        <section
          id="faq"
          style={{
            background: "rgba(255,255,255,0.02)",
            borderTop: `1px solid ${D.border}`,
            borderBottom: `1px solid ${D.border}`,
          }}
          className="px-6 py-24 relative z-10"
        >
          <div className="max-w-2xl mx-auto">
            <div className="flex items-center gap-3 mb-8">
              <MessageSquare className="w-5 h-5" style={{ color: D.accent }} />
              <h2 className="text-3xl font-bold" style={{ color: D.heading }}>Frequently asked questions</h2>
            </div>
            <div>
              {FAQS.map((faq) => (
                <FaqItem key={faq.q} q={faq.q} a={faq.a} />
              ))}
            </div>
            <p className="text-sm mt-8" style={{ color: D.muted }}>
              More questions?{" "}
              <a href="mailto:support@markethubpromo.com" style={{ color: D.accent }}>
                support@markethubpromo.com
              </a>
            </p>
          </div>
        </section>

        {/* ── FINAL CTA ────────────────────────────────────────────────────── */}
        <section className="px-6 py-28 text-center max-w-2xl mx-auto relative z-10">
          <div
            className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-6"
            style={{ background: `linear-gradient(135deg, ${D.accent}, ${D.accentDark})`, boxShadow: `0 8px 32px rgba(245,158,11,0.3)` }}
          >
            <Zap className="w-8 h-8 text-white" />
          </div>
          <h2 className="text-3xl md:text-4xl font-bold mb-4" style={{ color: D.heading }}>
            Start finding clients today
          </h2>
          <p className="text-base mb-4" style={{ color: D.body }}>
            Join marketing agencies using MarketHub Pro to automate lead generation, analyze social media performance, and grow faster with AI.
          </p>
          <p className="text-sm mb-10" style={{ color: D.muted }}>
            Free trial includes 5 Premium AI Actions, Research Hub, Lead Database and all analytics. No credit card required.
          </p>
          <Link
            href="/register?plan=free_forever"
            className="inline-flex items-center gap-2 px-10 py-4 rounded-xl text-lg font-bold transition-all hover:opacity-90"
            style={{
              background: `linear-gradient(135deg, ${D.accent}, ${D.accentDark})`,
              color: "#0d0b1e",
              boxShadow: `0 12px 40px rgba(245,158,11,0.35)`,
            }}
          >
            Get Started Free
            <ChevronRight className="w-5 h-5" />
          </Link>
          <p className="text-sm mt-4" style={{ color: D.muted }}>No credit card · Cancel anytime · Free forever plan available</p>

          {/* Quick feature bullets */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-10 text-left">
            {[
              { icon: <Search className="w-3.5 h-3.5" />, label: "AI Lead Finder" },
              { icon: <BarChart className="w-3.5 h-3.5" />, label: "4-Platform Analytics" },
              { icon: <Brain className="w-3.5 h-3.5" />, label: "16 AI Agents" },
              { icon: <BookOpen className="w-3.5 h-3.5" />, label: "20+ Languages" },
            ].map(({ icon, label }) => (
              <div
                key={label}
                className="flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-medium"
                style={{ backgroundColor: "rgba(245,158,11,0.1)", color: D.accent, border: `1px solid rgba(245,158,11,0.15)` }}
              >
                {icon}{label}
              </div>
            ))}
          </div>
        </section>

        {/* ── FOOTER ───────────────────────────────────────────────────────── */}
        <footer
          style={{
            background: "rgba(0,0,0,0.3)",
            borderTop: `1px solid ${D.border}`,
          }}
          className="px-6 py-10 relative z-10"
        >
          <div className="max-w-5xl mx-auto">
            <div className="flex flex-col md:flex-row items-start justify-between gap-8 mb-8">
              <div className="max-w-xs">
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-7 h-7 rounded-lg flex items-center justify-center"
                    style={{ background: `linear-gradient(135deg, ${D.accent}, ${D.accentDark})` }}>
                    <Zap className="w-3.5 h-3.5 text-white" />
                  </div>
                  <span className="font-bold" style={{ color: D.heading }}>MarketHub Pro</span>
                </div>
                <p className="text-xs leading-relaxed" style={{ color: D.muted }}>
                  AI-powered marketing platform for agencies and content creators. Real-time analytics + 16 specialized AI agents.
                </p>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-8 text-sm">
                <div>
                  <p className="font-semibold mb-3 text-xs uppercase tracking-wide" style={{ color: D.body }}>Product</p>
                  <div className="flex flex-col gap-2" style={{ color: D.muted }}>
                    <Link href="#features" className="hover:text-white transition-colors text-xs">Features</Link>
                    <Link href="#agents" className="hover:text-white transition-colors text-xs">AI Agents</Link>
                    <Link href="#pricing" className="hover:text-white transition-colors text-xs">Pricing</Link>
                    <Link href="/pricing" className="hover:text-white transition-colors text-xs">Full pricing</Link>
                  </div>
                </div>
                <div>
                  <p className="font-semibold mb-3 text-xs uppercase tracking-wide" style={{ color: D.body }}>Resources</p>
                  <div className="flex flex-col gap-2" style={{ color: D.muted }}>
                    <Link href="#blog" className="hover:text-white transition-colors text-xs">Blog</Link>
                    <Link href="#faq" className="hover:text-white transition-colors text-xs">FAQ</Link>
                    <a href="mailto:support@markethubpromo.com" className="hover:text-white transition-colors text-xs">Support</a>
                  </div>
                </div>
                <div>
                  <p className="font-semibold mb-3 text-xs uppercase tracking-wide" style={{ color: D.body }}>Legal</p>
                  <div className="flex flex-col gap-2" style={{ color: D.muted }}>
                    <Link href="/privacy" className="hover:text-white transition-colors text-xs">Privacy Policy</Link>
                    <Link href="/terms" className="hover:text-white transition-colors text-xs">Terms of Service</Link>
                  </div>
                </div>
              </div>
            </div>
            <div style={{ borderTop: `1px solid ${D.border}`, color: D.muted }} className="pt-6 flex flex-col md:flex-row items-center justify-between gap-2 text-xs">
              <span>© {new Date().getFullYear()} MarketHub Pro. All rights reserved.</span>
              <span>Powered by MarketHub Pro · GDPR Compliant</span>
            </div>
          </div>
        </footer>
      </div>
    </>
  );
}
