"use client";

import Link from "next/link";
import { useState } from "react";
import {
  Zap, BarChart2, Search, Brain, Instagram, Youtube, TrendingUp,
  Users, Globe, Target, ChevronRight, Check, Star, ArrowRight,
  Sparkles, Shield, Clock, DollarSign, Play, ChevronDown,
  Megaphone, PenTool, BookOpen, BarChart, MessageSquare,
} from "lucide-react";

// ── Brand colors ──────────────────────────────────────────────────────────────
const C = {
  bg: "#FFF8F0",
  card: "#FFFCF7",
  amber: "#F59E0B",
  amberDark: "#D97706",
  amberLight: "rgba(245,158,11,0.1)",
  amberBorder: "rgba(245,215,160,0.4)",
  text: "#292524",
  muted: "#78614E",
  light: "#A8967E",
  lighter: "#C4AA8A",
};

// ── Data ──────────────────────────────────────────────────────────────────────
const FEATURES = [
  {
    icon: <Search className="w-5 h-5" />,
    color: "#F59E0B",
    title: "AI Lead Finder — 50+ leads/week",
    description:
      "Describe your offer. AI scans 8 platforms simultaneously, scores every lead by fit (1–10), flags competitors, and writes personalized outreach in your language. You review and send.",
    badge: "Most used",
  },
  {
    icon: <BarChart2 className="w-5 h-5" />,
    color: "#6366F1",
    title: "Multi-Platform Analytics",
    description:
      "YouTube channel stats, Instagram insights, TikTok trends, Facebook pages — all real data in one dashboard. Real ER%, demographic breakdowns, competitor benchmarking.",
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
];

const AGENTS = [
  { name: "Market Researcher", color: "#D97706", emoji: "🔍" },
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
  { name: "Support & Setup", color: "#F59E0B", emoji: "⚡" },
];

const PLANS = [
  {
    id: "free",
    name: "Free Trial",
    price: 0,
    actions: "5",
    model: "Haiku AI",
    color: "#A8967E",
    features: ["5 Premium AI Actions/mo", "Basic AI unlimited", "3 tracked channels", "Research Hub", "Lead Database", "Social Analytics"],
  },
  {
    id: "lite",
    name: "Lite",
    price: 24,
    actions: "20",
    model: "Haiku AI",
    color: "#F59E0B",
    features: ["20 Premium AI Actions/mo", "Basic AI unlimited", "12 tracked channels", "2 Instagram accounts", "All 16 AI Agents", "Client Portal"],
  },
  {
    id: "pro",
    name: "Pro",
    price: 49,
    actions: "50",
    model: "Sonnet AI ★",
    color: "#8B5CF6",
    highlight: true,
    badge: "Best Value",
    features: ["50 Premium AI Actions/mo", "Claude Sonnet (top model)", "30 tracked channels", "4 Instagram accounts", "Priority Support", "Power Workflows", "All features"],
  },
  {
    id: "business",
    name: "Business",
    price: 99,
    actions: "200",
    model: "Sonnet AI ★",
    color: "#EC4899",
    features: ["200 Premium AI Actions/mo", "Claude Sonnet (top model)", "100 tracked channels", "10 Instagram accounts", "API Access", "20 client accounts", "White Label"],
  },
];

const FAQS = [
  {
    q: "Do I need a credit card to start?",
    a: "No. The Free Trial plan is completely free — no card required. You get 5 Premium AI Actions per month, access to all analytics dashboards, Research Hub and Lead Database.",
  },
  {
    q: "What's a Premium AI Action?",
    a: "A Premium Action is one use of a specialized AI agent feature: Lead Scoring, Outreach Generator, Full Campaign Builder, or APEX Advisor. Basic AI (captions, drafts, Q&A) is unlimited on all plans.",
  },
  {
    q: "What AI model powers the agents?",
    a: "Lite uses Claude Haiku 4.5 (fast, efficient). Pro, Business and Enterprise use Claude Sonnet 4.6 — Anthropic's current top model — delivering noticeably better output quality for complex tasks.",
  },
  {
    q: "Which languages does the platform support?",
    a: "All 16 AI agents support 20+ languages including Romanian, English, French, German, Spanish, Italian, Greek, Arabic and more. The AI automatically applies native grammar rules and vocabulary — no extra setup.",
  },
  {
    q: "Can I manage multiple client accounts?",
    a: "Yes. Lite starts with 2 Instagram accounts, Pro supports 4, Business supports 10, and Enterprise is unlimited. The Client Portal lets you share white-label dashboards with each client.",
  },
  {
    q: "Does it work for the Romanian market?",
    a: "Yes — and it's optimized for it. Local Market Mode activates Romanian-specific sources: OLX.ro scraper (with real prices, city, seller), Pagini Aurii, Storia.ro, Autovit.ro. The AI uses correct Romanian grammar including gender-specific verb forms.",
  },
];

const BLOG_POSTS = [
  {
    tag: "Lead Generation",
    tagColor: "#F59E0B",
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
    role: "Marketing Agency Owner, London 🇬🇧",
    text: "We went from spending 3 hours/day searching for clients to having 50+ qualified leads delivered every week. The AI outreach messages are better than what we wrote manually.",
    rating: 5,
    metric: "50+ leads/week",
  },
  {
    name: "Markus H.",
    role: "Social Media Manager, Berlin 🇩🇪",
    text: "The multi-platform analytics alone is worth the subscription. I manage 8 client accounts and see everything in one place. The competitor analysis feature is game-changing.",
    rating: 5,
    metric: "8 accounts managed",
  },
  {
    name: "Carlos R.",
    role: "E-commerce Brand Owner, Madrid 🇪🇸",
    text: "The APEX advisor gave me a content strategy that increased our Instagram ER from 1.2% to 4.8% in 6 weeks. I was skeptical about AI but this actually works.",
    rating: 5,
    metric: "1.2% → 4.8% ER",
  },
  {
    name: "Yuki T.",
    role: "Digital Marketing Director, Tokyo 🇯🇵",
    text: "MarketHub Pro changed how our agency operates. The Lead Finder alone saves my team 15 hours per week. The multi-language support works perfectly for our Japanese clients.",
    rating: 5,
    metric: "15h saved/week",
  },
];

// ── Components ────────────────────────────────────────────────────────────────
function FaqItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div style={{ borderBottom: `1px solid ${C.amberBorder}` }}>
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between py-4 text-left"
      >
        <span className="font-semibold text-sm pr-4" style={{ color: C.text }}>{q}</span>
        <ChevronDown
          className="w-4 h-4 flex-shrink-0 transition-transform"
          style={{ color: C.lighter, transform: open ? "rotate(180deg)" : "rotate(0deg)" }}
        />
      </button>
      {open && (
        <p className="pb-4 text-sm leading-relaxed" style={{ color: C.muted }}>{a}</p>
      )}
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────
export default function PromoPage() {
  return (
    <>

      <div style={{ backgroundColor: C.bg, color: C.text, fontFamily: "system-ui, -apple-system, sans-serif" }}>

        {/* ── NAV ──────────────────────────────────────────────────────────── */}
        <nav
          style={{ backgroundColor: C.card, borderBottom: `1px solid ${C.amberBorder}` }}
          className="sticky top-0 z-50 px-6 py-4 flex items-center justify-between"
        >
          <div className="flex items-center gap-2">
            <div
              className="w-8 h-8 rounded-lg flex items-center justify-center"
              style={{ background: `linear-gradient(135deg, ${C.amber}, ${C.amberDark})` }}
            >
              <Zap className="w-4 h-4 text-white" />
            </div>
            <span className="font-bold text-base" style={{ color: C.text }}>MarketHub Pro</span>
          </div>
          <div className="hidden md:flex items-center gap-6 text-sm" style={{ color: C.muted }}>
            <a href="#features">Features</a>
            <a href="#agents">AI Agents</a>
            <a href="#pricing">Pricing</a>
            <a href="#blog">Blog</a>
            <a href="#faq">FAQ</a>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/login" className="text-sm font-medium px-4 py-2 rounded-lg" style={{ color: C.muted }}>
              Sign in
            </Link>
            <Link
              href="/register"
              className="text-sm font-bold px-4 py-2 rounded-lg"
              style={{ backgroundColor: C.amber, color: "white" }}
            >
              Start Free
            </Link>
          </div>
        </nav>

        {/* ── HERO ─────────────────────────────────────────────────────────── */}
        <section className="px-6 py-20 text-center max-w-4xl mx-auto">
          <div
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium mb-8"
            style={{ backgroundColor: C.amberLight, color: C.amberDark, border: `1px solid ${C.amberBorder}` }}
          >
            <Sparkles className="w-4 h-4" />
            Powered by Claude Sonnet 4.6 — Anthropic&apos;s top AI model
          </div>

          <h1 className="text-4xl md:text-6xl font-bold leading-tight mb-6" style={{ color: C.text }}>
            The marketing platform that
            <span style={{ color: C.amber }}> finds your clients</span>,
            writes your copy,
            and <span style={{ color: C.amber }}>grows your agency</span>
          </h1>

          <p className="text-xl mb-4 max-w-2xl mx-auto leading-relaxed" style={{ color: C.muted }}>
            16 specialized AI agents + real-time analytics for YouTube, Instagram, TikTok & Facebook.
            Find 50+ qualified leads per week — automatically.
          </p>

          <p className="text-base mb-10 max-w-xl mx-auto" style={{ color: C.lighter }}>
            Used by marketing agencies, content creators and brand owners across Romania, Europe and beyond.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-16">
            <Link
              href="/register"
              className="flex items-center gap-2 px-8 py-4 rounded-xl text-base font-bold transition-all hover:opacity-90"
              style={{ backgroundColor: C.amber, color: "white", boxShadow: `0 8px 24px ${C.amber}40` }}
            >
              Start Free Trial — No card required
              <ArrowRight className="w-4 h-4" />
            </Link>
            <Link
              href="#pricing"
              className="flex items-center gap-2 px-8 py-4 rounded-xl text-base font-semibold border"
              style={{ color: C.muted, border: `1px solid ${C.amberBorder}`, backgroundColor: C.card }}
            >
              <Play className="w-4 h-4" />
              View pricing
            </Link>
          </div>

          {/* Trust stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 max-w-2xl mx-auto">
            {[
              { v: "50+", l: "leads found per week" },
              { v: "16", l: "specialized AI agents" },
              { v: "20+", l: "languages supported" },
              { v: "3h", l: "saved daily per user" },
            ].map(s => (
              <div key={s.l} className="text-center">
                <div className="text-3xl font-bold" style={{ color: C.amber }}>{s.v}</div>
                <div className="text-xs mt-1" style={{ color: C.light }}>{s.l}</div>
              </div>
            ))}
          </div>
        </section>

        {/* ── TRUST BAR ────────────────────────────────────────────────────── */}
        <div
          style={{ backgroundColor: C.card, borderTop: `1px solid ${C.amberBorder}`, borderBottom: `1px solid ${C.amberBorder}` }}
          className="py-5 px-6"
        >
          <div
            className="max-w-4xl mx-auto flex flex-wrap items-center justify-center gap-x-8 gap-y-3 text-xs font-medium"
            style={{ color: C.lighter }}
          >
            {[
              { icon: <Instagram className="w-3.5 h-3.5" style={{ color: "#E1306C" }} />, label: "Instagram Graph API" },
              { icon: <Youtube className="w-3.5 h-3.5" style={{ color: "#FF0000" }} />, label: "YouTube Data API v3" },
              { icon: <TrendingUp className="w-3.5 h-3.5" />, label: "TikTok Trends" },
              { icon: <Search className="w-3.5 h-3.5" style={{ color: C.amber }} />, label: "OLX · Google · Reddit" },
              { icon: <Shield className="w-3.5 h-3.5" style={{ color: "#16A34A" }} />, label: "GDPR Compliant" },
              { icon: <Brain className="w-3.5 h-3.5" style={{ color: "#8B5CF6" }} />, label: "Claude Sonnet 4.6" },
              { icon: <Globe className="w-3.5 h-3.5" style={{ color: "#0EA5E9" }} />, label: "20+ Languages" },
            ].map(({ icon, label }) => (
              <div key={label} className="flex items-center gap-1.5">{icon}{label}</div>
            ))}
          </div>
        </div>

        {/* ── FEATURES ─────────────────────────────────────────────────────── */}
        <section id="features" className="px-6 py-20 max-w-5xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold mb-4" style={{ color: C.text }}>
              Everything your agency needs — in one platform
            </h2>
            <p className="text-base max-w-xl mx-auto" style={{ color: C.muted }}>
              From finding your first client to running a full-service agency with 20+ accounts — MarketHub Pro scales with you.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {FEATURES.map((f) => (
              <div
                key={f.title}
                className="rounded-2xl p-6 relative"
                style={{ backgroundColor: C.card, border: `1px solid ${C.amberBorder}`, boxShadow: "0 2px 8px rgba(120,97,78,0.06)" }}
              >
                {f.badge && (
                  <span
                    className="absolute top-4 right-4 text-xs font-bold px-2 py-0.5 rounded-full"
                    style={{ backgroundColor: `${f.color}15`, color: f.color }}
                  >
                    {f.badge}
                  </span>
                )}
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center mb-4"
                  style={{ backgroundColor: `${f.color}15` }}
                >
                  <span style={{ color: f.color }}>{f.icon}</span>
                </div>
                <h3 className="font-bold text-base mb-2" style={{ color: C.text }}>{f.title}</h3>
                <p className="text-sm leading-relaxed" style={{ color: C.light }}>{f.description}</p>
              </div>
            ))}
          </div>
        </section>

        {/* ── AI AGENTS ────────────────────────────────────────────────────── */}
        <section
          id="agents"
          style={{ backgroundColor: C.card, borderTop: `1px solid ${C.amberBorder}`, borderBottom: `1px solid ${C.amberBorder}` }}
          className="px-6 py-16"
        >
          <div className="max-w-4xl mx-auto">
            <div className="text-center mb-3">
              <h2 className="text-3xl font-bold mb-3" style={{ color: C.text }}>
                16 AI Agents. Every marketing discipline. One subscription.
              </h2>
              <p className="text-base max-w-xl mx-auto" style={{ color: C.muted }}>
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
                <div key={w.title} className="rounded-xl p-4" style={{ backgroundColor: `${w.color}08`, border: `1px solid ${w.color}25` }}>
                  <div className="flex items-center gap-2 mb-2">
                    <span style={{ color: w.color }}>{w.icon}</span>
                    <span className="font-bold text-sm" style={{ color: C.text }}>{w.title}</span>
                  </div>
                  <p className="text-xs" style={{ color: C.light }}>{w.steps}</p>
                </div>
              ))}
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {AGENTS.map((a) => (
                <div
                  key={a.name}
                  className="rounded-xl px-3 py-2.5 flex items-center gap-2"
                  style={{ backgroundColor: `${a.color}08`, border: `1px solid ${a.color}25` }}
                >
                  <span className="text-base">{a.emoji}</span>
                  <span className="font-medium text-xs" style={{ color: C.text }}>{a.name}</span>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── IMPACT STATS ─────────────────────────────────────────────────── */}
        <section
          style={{ background: `linear-gradient(135deg, ${C.amber}12, ${C.amberDark}06)`, borderBottom: `1px solid ${C.amberBorder}` }}
          className="py-16 px-6"
        >
          <div className="max-w-4xl mx-auto">
            <h2 className="text-2xl font-bold text-center mb-10" style={{ color: C.text }}>
              The math is simple
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-center">
              <div>
                <div className="flex items-center justify-center gap-2 mb-3">
                  <Clock className="w-5 h-5" style={{ color: C.amber }} />
                  <span className="text-4xl font-bold" style={{ color: C.amber }}>3h</span>
                </div>
                <p className="font-semibold mb-1" style={{ color: C.text }}>Saved every day</p>
                <p className="text-sm" style={{ color: C.light }}>15 min × 12 AI actions = 3 hours back in your week, every week</p>
              </div>
              <div>
                <div className="flex items-center justify-center gap-2 mb-3">
                  <DollarSign className="w-5 h-5" style={{ color: "#16A34A" }} />
                  <span className="text-4xl font-bold" style={{ color: "#16A34A" }}>$750</span>
                </div>
                <p className="font-semibold mb-1" style={{ color: C.text }}>Operational savings/month</p>
                <p className="text-sm" style={{ color: C.light }}>50 Pro actions × 15 min × $25/hr = $312. Senior copywriter cost avoided = $438.</p>
              </div>
              <div>
                <div className="flex items-center justify-center gap-2 mb-3">
                  <TrendingUp className="w-5 h-5" style={{ color: "#6366F1" }} />
                  <span className="text-4xl font-bold" style={{ color: "#6366F1" }}>15×</span>
                </div>
                <p className="font-semibold mb-1" style={{ color: C.text }}>ROI on subscription</p>
                <p className="text-sm" style={{ color: C.light }}>Pro plan at $49/month. Value delivered: $750+. ROI: 15x minimum.</p>
              </div>
            </div>
          </div>
        </section>

        {/* ── TESTIMONIALS ─────────────────────────────────────────────────── */}
        <section className="px-6 py-16 max-w-4xl mx-auto">
          <h2 className="text-2xl font-bold text-center mb-8" style={{ color: C.text }}>
            What agencies say
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {TESTIMONIALS.map((t) => (
              <div
                key={t.name}
                className="rounded-2xl p-6"
                style={{ backgroundColor: C.card, border: `1px solid ${C.amberBorder}` }}
              >
                <div className="flex items-center justify-between mb-4">
                  <div className="flex gap-0.5">
                    {Array.from({ length: t.rating }).map((_, i) => (
                      <Star key={i} className="w-4 h-4" style={{ color: C.amber, fill: C.amber }} />
                    ))}
                  </div>
                  <span
                    className="text-xs font-bold px-2 py-1 rounded-full"
                    style={{ backgroundColor: C.amberLight, color: C.amberDark }}
                  >
                    {t.metric}
                  </span>
                </div>
                <p className="text-sm leading-relaxed mb-5" style={{ color: C.muted }}>&ldquo;{t.text}&rdquo;</p>
                <div>
                  <p className="font-semibold text-sm" style={{ color: C.text }}>{t.name}</p>
                  <p className="text-xs mt-0.5" style={{ color: C.lighter }}>{t.role}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* ── PRICING ──────────────────────────────────────────────────────── */}
        <section
          id="pricing"
          style={{ backgroundColor: C.card, borderTop: `1px solid ${C.amberBorder}`, borderBottom: `1px solid ${C.amberBorder}` }}
          className="px-6 py-20"
        >
          <div className="max-w-5xl mx-auto">
            <div className="text-center mb-4">
              <h2 className="text-3xl md:text-4xl font-bold mb-3" style={{ color: C.text }}>
                Pricing that pays for itself
              </h2>
              <p className="text-base mb-2" style={{ color: C.muted }}>
                Start free. Upgrade when you see results. No hidden fees, no contracts.
              </p>
              <p className="text-sm" style={{ color: C.lighter }}>
                💡 Pro delivers $750+ in value at $49/month — that&apos;s 15× ROI.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5 mt-10">
              {PLANS.map((plan) => (
                <div
                  key={plan.id}
                  className="rounded-2xl p-6 flex flex-col relative"
                  style={{
                    backgroundColor: plan.highlight ? plan.color : C.bg,
                    border: `2px solid ${plan.highlight ? plan.color : C.amberBorder}`,
                    boxShadow: plan.highlight ? `0 8px 32px ${plan.color}30` : "0 2px 8px rgba(120,97,78,0.06)",
                  }}
                >
                  {plan.badge && (
                    <div
                      className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full text-xs font-bold whitespace-nowrap"
                      style={{ backgroundColor: C.text, color: "white" }}
                    >
                      {plan.badge}
                    </div>
                  )}
                  <div className="mb-5">
                    <h3 className="font-bold text-base mb-1" style={{ color: plan.highlight ? "white" : C.text }}>{plan.name}</h3>
                    <div className="flex items-baseline gap-1">
                      <span className="text-3xl font-bold" style={{ color: plan.highlight ? "white" : plan.color }}>
                        {plan.price === 0 ? "Free" : `$${plan.price}`}
                      </span>
                      {plan.price > 0 && (
                        <span className="text-sm" style={{ color: plan.highlight ? "rgba(255,255,255,0.7)" : C.lighter }}>/month</span>
                      )}
                    </div>
                    <div className="text-xs mt-1" style={{ color: plan.highlight ? "rgba(255,255,255,0.8)" : C.lighter }}>
                      {plan.actions} Premium Actions · {plan.model}
                    </div>
                  </div>
                  <ul className="flex flex-col gap-2 flex-1 mb-6">
                    {plan.features.map((f) => (
                      <li key={f} className="flex items-start gap-2 text-xs">
                        <Check className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" style={{ color: plan.highlight ? "rgba(255,255,255,0.9)" : "#16A34A" }} />
                        <span style={{ color: plan.highlight ? "rgba(255,255,255,0.9)" : C.muted }}>{f}</span>
                      </li>
                    ))}
                  </ul>
                  <Link
                    href="/register"
                    className="text-center py-2.5 rounded-xl text-sm font-semibold transition-all hover:opacity-90"
                    style={{
                      backgroundColor: plan.highlight ? "white" : C.amberLight,
                      color: plan.highlight ? plan.color : C.amberDark,
                    }}
                  >
                    {plan.price === 0 ? "Start Free" : "Start Free Trial"}
                  </Link>
                </div>
              ))}
            </div>
            <p className="text-center text-xs mt-6" style={{ color: C.lighter }}>
              All paid plans include a free trial period. Cancel anytime. Need Enterprise (1,000 actions, $249/mo)?{" "}
              <Link href="/pricing" style={{ color: C.amberDark }}>See full pricing →</Link>
            </p>
          </div>
        </section>

        {/* ── MINI BLOG ────────────────────────────────────────────────────── */}
        <section id="blog" className="px-6 py-20 max-w-5xl mx-auto">
          <div className="flex items-center justify-between mb-10">
            <div>
              <h2 className="text-3xl font-bold mb-2" style={{ color: C.text }}>
                Marketing insights & guides
              </h2>
              <p className="text-base" style={{ color: C.muted }}>
                Practical tactics used by agencies on MarketHub Pro.
              </p>
            </div>
            <Link
              href="/register"
              className="hidden md:flex items-center gap-1 text-sm font-semibold"
              style={{ color: C.amber }}
            >
              See more in-app <ChevronRight className="w-4 h-4" />
            </Link>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {BLOG_POSTS.map((post) => (
              <article
                key={post.title}
                className="rounded-2xl overflow-hidden"
                style={{ backgroundColor: C.card, border: `1px solid ${C.amberBorder}` }}
              >
                <div className="p-6">
                  <div className="flex items-center gap-3 mb-4">
                    <span
                      className="text-xs font-bold px-2.5 py-1 rounded-full"
                      style={{ backgroundColor: `${post.tagColor}15`, color: post.tagColor }}
                    >
                      {post.tag}
                    </span>
                    <span className="text-xs" style={{ color: C.lighter }}>{post.readTime}</span>
                  </div>
                  <h3 className="font-bold text-base leading-snug mb-3" style={{ color: C.text }}>
                    {post.title}
                  </h3>
                  <p className="text-sm leading-relaxed mb-5" style={{ color: C.light }}>
                    {post.excerpt}
                  </p>
                  <ul className="flex flex-col gap-2">
                    {post.points.map((point) => (
                      <li key={point} className="flex items-start gap-2">
                        <Check className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" style={{ color: post.tagColor }} />
                        <span className="text-xs" style={{ color: C.muted }}>{point}</span>
                      </li>
                    ))}
                  </ul>
                </div>
                <div style={{ borderTop: `1px solid ${C.amberBorder}` }} className="px-6 py-3">
                  <Link
                    href="/register"
                    className="flex items-center gap-1 text-xs font-semibold"
                    style={{ color: C.amberDark }}
                  >
                    Try it yourself
                    <ArrowRight className="w-3 h-3" />
                  </Link>
                </div>
              </article>
            ))}
          </div>
        </section>

        {/* ── FAQ ──────────────────────────────────────────────────────────── */}
        <section
          id="faq"
          style={{ backgroundColor: C.card, borderTop: `1px solid ${C.amberBorder}`, borderBottom: `1px solid ${C.amberBorder}` }}
          className="px-6 py-20"
        >
          <div className="max-w-2xl mx-auto">
            <div className="flex items-center gap-3 mb-8">
              <MessageSquare className="w-5 h-5" style={{ color: C.amber }} />
              <h2 className="text-3xl font-bold" style={{ color: C.text }}>Frequently asked questions</h2>
            </div>
            <div>
              {FAQS.map((faq) => (
                <FaqItem key={faq.q} q={faq.q} a={faq.a} />
              ))}
            </div>
            <p className="text-sm mt-8" style={{ color: C.lighter }}>
              More questions?{" "}
              <a href="mailto:support@markethubpromo.com" style={{ color: C.amberDark }}>
                support@markethubpromo.com
              </a>
            </p>
          </div>
        </section>

        {/* ── FINAL CTA ────────────────────────────────────────────────────── */}
        <section className="px-6 py-24 text-center max-w-2xl mx-auto">
          <div
            className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-6"
            style={{ background: `linear-gradient(135deg, ${C.amber}, ${C.amberDark})` }}
          >
            <Zap className="w-8 h-8 text-white" />
          </div>
          <h2 className="text-3xl md:text-4xl font-bold mb-4" style={{ color: C.text }}>
            Start finding clients today
          </h2>
          <p className="text-base mb-4" style={{ color: C.muted }}>
            Join marketing agencies using MarketHub Pro to automate lead generation, analyze social media performance, and grow faster with AI.
          </p>
          <p className="text-sm mb-10" style={{ color: C.lighter }}>
            Free trial includes 5 Premium AI Actions, Research Hub, Lead Database and all analytics. No credit card required.
          </p>
          <Link
            href="/register"
            className="inline-flex items-center gap-2 px-10 py-4 rounded-xl text-lg font-bold transition-all hover:opacity-90"
            style={{ backgroundColor: C.amber, color: "white", boxShadow: `0 12px 32px ${C.amber}40` }}
          >
            Start Free Trial
            <ChevronRight className="w-5 h-5" />
          </Link>
          <p className="text-sm mt-4" style={{ color: C.lighter }}>No credit card · Cancel anytime · Free forever plan available</p>

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
                style={{ backgroundColor: C.amberLight, color: C.amberDark }}
              >
                {icon}{label}
              </div>
            ))}
          </div>
        </section>

        {/* ── FOOTER ───────────────────────────────────────────────────────── */}
        <footer
          style={{ backgroundColor: C.card, borderTop: `1px solid ${C.amberBorder}` }}
          className="px-6 py-10"
        >
          <div className="max-w-5xl mx-auto">
            <div className="flex flex-col md:flex-row items-start justify-between gap-8 mb-8">
              <div className="max-w-xs">
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-7 h-7 rounded-lg flex items-center justify-center"
                    style={{ background: `linear-gradient(135deg, ${C.amber}, ${C.amberDark})` }}>
                    <Zap className="w-3.5 h-3.5 text-white" />
                  </div>
                  <span className="font-bold" style={{ color: C.muted }}>MarketHub Pro</span>
                </div>
                <p className="text-xs leading-relaxed" style={{ color: C.lighter }}>
                  AI-powered marketing platform for agencies and content creators. Real-time analytics + 16 specialized AI agents.
                </p>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-8 text-sm">
                <div>
                  <p className="font-semibold mb-3 text-xs uppercase tracking-wide" style={{ color: C.light }}>Product</p>
                  <div className="flex flex-col gap-2" style={{ color: C.lighter }}>
                    <Link href="#features" className="hover:text-amber-600 transition-colors text-xs">Features</Link>
                    <Link href="#agents" className="hover:text-amber-600 transition-colors text-xs">AI Agents</Link>
                    <Link href="#pricing" className="hover:text-amber-600 transition-colors text-xs">Pricing</Link>
                    <Link href="/pricing" className="hover:text-amber-600 transition-colors text-xs">Full pricing</Link>
                  </div>
                </div>
                <div>
                  <p className="font-semibold mb-3 text-xs uppercase tracking-wide" style={{ color: C.light }}>Resources</p>
                  <div className="flex flex-col gap-2" style={{ color: C.lighter }}>
                    <Link href="#blog" className="hover:text-amber-600 transition-colors text-xs">Blog</Link>
                    <Link href="#faq" className="hover:text-amber-600 transition-colors text-xs">FAQ</Link>
                    <a href="mailto:support@markethubpromo.com" className="hover:text-amber-600 transition-colors text-xs">Support</a>
                  </div>
                </div>
                <div>
                  <p className="font-semibold mb-3 text-xs uppercase tracking-wide" style={{ color: C.light }}>Legal</p>
                  <div className="flex flex-col gap-2" style={{ color: C.lighter }}>
                    <Link href="/privacy" className="hover:text-amber-600 transition-colors text-xs">Privacy Policy</Link>
                    <Link href="/terms" className="hover:text-amber-600 transition-colors text-xs">Terms of Service</Link>
                  </div>
                </div>
              </div>
            </div>
            <div style={{ borderTop: `1px solid ${C.amberBorder}`, color: C.lighter }} className="pt-6 flex flex-col md:flex-row items-center justify-between gap-2 text-xs">
              <span>© {new Date().getFullYear()} MarketHub Pro. All rights reserved.</span>
              <span>Powered by Claude Sonnet 4.6 (Anthropic) · GDPR Compliant</span>
            </div>
          </div>
        </footer>
      </div>
    </>
  );
}
