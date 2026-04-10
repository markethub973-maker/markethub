"use client";

import Link from "next/link";
import { useState } from "react";
import {
  Zap, BarChart2, Search, Brain, Instagram, Youtube, TrendingUp,
  Users, Globe, Target, ChevronRight, Check, Star, ArrowRight,
  Sparkles, Shield, Clock, DollarSign, Play,
} from "lucide-react";

// ── Brand colors (Amber palette matching the app) ─────────────────────────────
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

const FEATURES = [
  {
    icon: <Search className="w-5 h-5" />,
    color: "#F59E0B",
    title: "AI Lead Finder",
    description: "Find 50+ qualified leads per week automatically. AI scores each lead, writes personalized outreach, and builds full campaigns — in any language.",
  },
  {
    icon: <BarChart2 className="w-5 h-5" />,
    color: "#6366F1",
    title: "Multi-Platform Analytics",
    description: "YouTube, Instagram, TikTok, Facebook — all your metrics in one dashboard. Real ER%, trending videos, competitor analysis, and audience demographics.",
  },
  {
    icon: <Brain className="w-5 h-5" />,
    color: "#8B5CF6",
    title: "16 Specialized AI Agents",
    description: "Market researcher, copywriter, pricing strategist, SEO optimizer, blog writer, ad copy creator and more — each an expert in its domain.",
  },
  {
    icon: <Globe className="w-5 h-5" />,
    color: "#10B981",
    title: "Research Hub",
    description: "Search leads across Google, OLX, Instagram, TikTok, Reddit, Facebook Groups and YouTube simultaneously. Save to your leads database in one click.",
  },
  {
    icon: <Target className="w-5 h-5" />,
    color: "#EF4444",
    title: "APEX Marketing Advisor",
    description: "Your personal senior marketing strategist. Analyzes your market, recommends content pillars, timing, and platform-specific strategies.",
  },
  {
    icon: <Users className="w-5 h-5" />,
    color: "#EC4899",
    title: "Client Portal",
    description: "White-label dashboards for your clients with live IG + TikTok data, password protection, and your agency branding.",
  },
];

const PLANS = [
  {
    id: "lite",
    name: "Lite",
    price: 24,
    actions: "20",
    model: "Haiku AI",
    color: "#F59E0B",
    features: ["20 Premium AI Actions/mo", "Basic AI unlimited", "12 tracked channels", "2 Instagram accounts", "Research Hub", "Lead Database"],
  },
  {
    id: "pro",
    name: "Pro",
    price: 49,
    actions: "50",
    model: "Sonnet AI",
    color: "#8B5CF6",
    highlight: true,
    badge: "Best Value",
    features: ["50 Premium AI Actions/mo", "Claude Sonnet (top AI)", "30 tracked channels", "4 Instagram accounts", "All 16 AI Agents", "Client Portal", "Priority Support"],
  },
  {
    id: "business",
    name: "Business",
    price: 99,
    actions: "200",
    model: "Sonnet AI",
    color: "#EC4899",
    features: ["200 Premium AI Actions/mo", "Claude Sonnet (top AI)", "100 tracked channels", "10 Instagram accounts", "API Access", "20 client accounts", "White Label"],
  },
  {
    id: "enterprise",
    name: "Enterprise",
    price: 249,
    actions: "1,000",
    model: "Sonnet AI",
    color: "#16A34A",
    features: ["1,000 Premium AI Actions/mo", "Claude Sonnet (top AI)", "Unlimited everything", "White Label", "Full API Access", "SLA 99.9%", "Priority Support"],
  },
];

const TESTIMONIALS = [
  {
    name: "Alexandra M.",
    role: "Marketing Agency Owner, Bucharest",
    text: "We went from spending 3 hours/day searching for clients to having 50+ qualified leads delivered every week. The AI outreach messages are better than what we wrote manually.",
    rating: 5,
  },
  {
    name: "Mihai T.",
    role: "Social Media Manager",
    text: "The multi-platform analytics alone is worth the subscription. I manage 8 client accounts and see everything in one place. The competitor analysis feature is incredible.",
    rating: 5,
  },
  {
    name: "Diana P.",
    role: "E-commerce Brand Owner",
    text: "The APEX advisor gave me a content strategy that increased our Instagram ER from 1.2% to 4.8% in 6 weeks. I was skeptical about AI but this actually works.",
    rating: 5,
  },
];

const WORKFLOWS = [
  {
    title: "Find Clients",
    steps: ["Describe your offer", "AI finds leads on 8 platforms", "Scores & ranks by fit", "Writes personalized outreach", "Export & send"],
    color: "#F59E0B",
  },
  {
    title: "Analyze Competitors",
    steps: ["Enter competitor name", "AI scrapes their social presence", "Compares your metrics", "Identifies gaps", "Recommends your strategy"],
    color: "#6366F1",
  },
  {
    title: "Launch Campaign",
    steps: ["Choose target market", "Market Researcher validates", "Copywriter writes copy", "Ad Creator writes ads", "Social Creator plans content"],
    color: "#10B981",
  },
];

function StatBadge({ value, label }: { value: string; label: string }) {
  return (
    <div className="text-center">
      <div className="text-3xl font-bold" style={{ color: C.amber }}>{value}</div>
      <div className="text-xs mt-1" style={{ color: C.light }}>{label}</div>
    </div>
  );
}

export default function PromoPage() {
  const [billingAnnual] = useState(false);

  return (
    <div style={{ backgroundColor: C.bg, color: C.text, fontFamily: "system-ui, -apple-system, sans-serif" }}>

      {/* ── NAV ─────────────────────────────────────────────────────────────── */}
      <nav style={{ backgroundColor: C.card, borderBottom: `1px solid ${C.amberBorder}` }}
        className="sticky top-0 z-50 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center"
            style={{ background: `linear-gradient(135deg, ${C.amber}, ${C.amberDark})` }}>
            <Zap className="w-4 h-4 text-white" />
          </div>
          <span className="font-bold text-base" style={{ color: C.text }}>MarketHub Pro</span>
        </div>
        <div className="hidden md:flex items-center gap-6 text-sm" style={{ color: C.muted }}>
          <a href="#features" className="hover:text-amber-600 transition-colors">Features</a>
          <a href="#how-it-works" className="hover:text-amber-600 transition-colors">How it works</a>
          <a href="#pricing" className="hover:text-amber-600 transition-colors">Pricing</a>
          <a href="#testimonials" className="hover:text-amber-600 transition-colors">Reviews</a>
        </div>
        <div className="flex items-center gap-3">
          <Link href="/login" className="text-sm font-medium px-4 py-2 rounded-lg transition-colors"
            style={{ color: C.muted }}>
            Sign in
          </Link>
          <Link href="/register" className="text-sm font-semibold px-4 py-2 rounded-lg transition-all"
            style={{ backgroundColor: C.amber, color: "white" }}>
            Start Free Trial
          </Link>
        </div>
      </nav>

      {/* ── HERO ────────────────────────────────────────────────────────────── */}
      <section className="px-6 py-20 text-center max-w-4xl mx-auto">
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium mb-8"
          style={{ backgroundColor: C.amberLight, color: C.amberDark, border: `1px solid ${C.amberBorder}` }}>
          <Sparkles className="w-4 h-4" />
          AI-powered marketing platform for agencies & creators
        </div>

        <h1 className="text-5xl md:text-6xl font-bold leading-tight mb-6" style={{ color: C.text }}>
          Find clients, analyze markets,
          <span style={{ color: C.amber }}> grow faster</span>
        </h1>

        <p className="text-xl mb-10 max-w-2xl mx-auto leading-relaxed" style={{ color: C.muted }}>
          MarketHub Pro combines real-time analytics for YouTube, Instagram, TikTok & Facebook with 16 specialized AI agents — so you spend less time researching and more time closing.
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-16">
          <Link href="/register"
            className="flex items-center gap-2 px-8 py-4 rounded-xl text-base font-bold transition-all hover:opacity-90 hover:scale-105 shadow-lg"
            style={{ backgroundColor: C.amber, color: "white", boxShadow: `0 8px 24px ${C.amber}40` }}>
            Start Free Trial — No card required
            <ArrowRight className="w-4 h-4" />
          </Link>
          <Link href="/pricing"
            className="flex items-center gap-2 px-8 py-4 rounded-xl text-base font-semibold border transition-all hover:opacity-80"
            style={{ color: C.muted, border: `1px solid ${C.amberBorder}`, backgroundColor: C.card }}>
            <Play className="w-4 h-4" />
            See pricing
          </Link>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 max-w-2xl mx-auto">
          <StatBadge value="50+" label="leads found per week" />
          <StatBadge value="16" label="specialized AI agents" />
          <StatBadge value="8" label="platforms monitored" />
          <StatBadge value="3h" label="saved per day" />
        </div>
      </section>

      {/* ── SOCIAL PROOF BAR ────────────────────────────────────────────────── */}
      <div style={{ backgroundColor: C.card, borderTop: `1px solid ${C.amberBorder}`, borderBottom: `1px solid ${C.amberBorder}` }}
        className="py-5 px-6">
        <div className="max-w-4xl mx-auto flex flex-wrap items-center justify-center gap-6 text-sm" style={{ color: C.lighter }}>
          <div className="flex items-center gap-2">
            <Instagram className="w-4 h-4" style={{ color: "#E1306C" }} />
            Instagram Analytics
          </div>
          <div className="flex items-center gap-2">
            <Youtube className="w-4 h-4" style={{ color: "#FF0000" }} />
            YouTube Analytics
          </div>
          <div className="flex items-center gap-2">
            <TrendingUp className="w-4 h-4" style={{ color: "#000" }} />
            TikTok Trends
          </div>
          <div className="flex items-center gap-2">
            <Search className="w-4 h-4" style={{ color: C.amber }} />
            OLX + Google + Reddit
          </div>
          <div className="flex items-center gap-2">
            <Shield className="w-4 h-4" style={{ color: "#16A34A" }} />
            GDPR compliant
          </div>
          <div className="flex items-center gap-2">
            <Brain className="w-4 h-4" style={{ color: "#8B5CF6" }} />
            Powered by Claude AI
          </div>
        </div>
      </div>

      {/* ── FEATURES ────────────────────────────────────────────────────────── */}
      <section id="features" className="px-6 py-20 max-w-5xl mx-auto">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold mb-4" style={{ color: C.text }}>
            Everything you need to grow
          </h2>
          <p className="text-base max-w-xl mx-auto" style={{ color: C.muted }}>
            From finding your first client to scaling your agency — MarketHub Pro covers the full marketing stack.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {FEATURES.map((f) => (
            <div key={f.title} className="rounded-2xl p-6 transition-all hover:scale-[1.02]"
              style={{ backgroundColor: C.card, border: `1px solid ${C.amberBorder}`, boxShadow: "0 2px 8px rgba(120,97,78,0.06)" }}>
              <div className="w-10 h-10 rounded-xl flex items-center justify-center mb-4"
                style={{ backgroundColor: `${f.color}15` }}>
                <span style={{ color: f.color }}>{f.icon}</span>
              </div>
              <h3 className="font-bold text-base mb-2" style={{ color: C.text }}>{f.title}</h3>
              <p className="text-sm leading-relaxed" style={{ color: C.light }}>{f.description}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── AI AGENTS HIGHLIGHT ─────────────────────────────────────────────── */}
      <section style={{ backgroundColor: C.card, borderTop: `1px solid ${C.amberBorder}`, borderBottom: `1px solid ${C.amberBorder}` }}
        className="px-6 py-16">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-10">
            <h2 className="text-3xl font-bold mb-3" style={{ color: C.text }}>16 AI Agents. One platform.</h2>
            <p className="text-base" style={{ color: C.muted }}>Each agent is a specialist. Together they cover your entire marketing workflow.</p>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
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
            ].map((a) => (
              <div key={a.name} className="rounded-xl px-3 py-2.5 flex items-center gap-2 text-sm"
                style={{ backgroundColor: `${a.color}08`, border: `1px solid ${a.color}25` }}>
                <span>{a.emoji}</span>
                <span className="font-medium text-xs" style={{ color: C.text }}>{a.name}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── HOW IT WORKS ────────────────────────────────────────────────────── */}
      <section id="how-it-works" className="px-6 py-20 max-w-5xl mx-auto">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold mb-4" style={{ color: C.text }}>How it works</h2>
          <p className="text-base" style={{ color: C.muted }}>Three proven workflows. Each uses multiple AI agents in sequence.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {WORKFLOWS.map((wf) => (
            <div key={wf.title} className="rounded-2xl p-6"
              style={{ backgroundColor: C.card, border: `1px solid ${wf.color}30` }}>
              <div className="flex items-center gap-2 mb-5">
                <div className="w-2 h-6 rounded-full" style={{ backgroundColor: wf.color }} />
                <h3 className="font-bold text-base" style={{ color: C.text }}>{wf.title}</h3>
              </div>
              <div className="flex flex-col gap-3">
                {wf.steps.map((step, i) => (
                  <div key={i} className="flex items-start gap-3">
                    <span className="w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5"
                      style={{ backgroundColor: `${wf.color}20`, color: wf.color }}>
                      {i + 1}
                    </span>
                    <span className="text-sm" style={{ color: C.muted }}>{step}</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── IMPACT STATS ────────────────────────────────────────────────────── */}
      <div style={{ background: `linear-gradient(135deg, ${C.amber}15, ${C.amberDark}08)`, borderTop: `1px solid ${C.amberBorder}`, borderBottom: `1px solid ${C.amberBorder}` }}
        className="py-16 px-6">
        <div className="max-w-4xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-8 text-center">
          <div>
            <div className="flex items-center justify-center gap-2 mb-2">
              <Clock className="w-5 h-5" style={{ color: C.amber }} />
              <span className="text-4xl font-bold" style={{ color: C.amber }}>3h</span>
            </div>
            <p className="font-semibold" style={{ color: C.text }}>Saved per day</p>
            <p className="text-sm mt-1" style={{ color: C.light }}>15 min × 12 AI actions = time back in your week</p>
          </div>
          <div>
            <div className="flex items-center justify-center gap-2 mb-2">
              <DollarSign className="w-5 h-5" style={{ color: "#16A34A" }} />
              <span className="text-4xl font-bold" style={{ color: "#16A34A" }}>$750</span>
            </div>
            <p className="font-semibold" style={{ color: C.text }}>Saved per month (Pro)</p>
            <p className="text-sm mt-1" style={{ color: C.light }}>50 actions × 15 min × $25/hr equivalent</p>
          </div>
          <div>
            <div className="flex items-center justify-center gap-2 mb-2">
              <TrendingUp className="w-5 h-5" style={{ color: "#6366F1" }} />
              <span className="text-4xl font-bold" style={{ color: "#6366F1" }}>50+</span>
            </div>
            <p className="font-semibold" style={{ color: C.text }}>Leads found per week</p>
            <p className="text-sm mt-1" style={{ color: C.light }}>Across Google, OLX, Instagram, TikTok, Facebook</p>
          </div>
        </div>
      </div>

      {/* ── PRICING ─────────────────────────────────────────────────────────── */}
      <section id="pricing" className="px-6 py-20 max-w-5xl mx-auto">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold mb-4" style={{ color: C.text }}>Simple, transparent pricing</h2>
          <p className="text-base" style={{ color: C.muted }}>Start free. Upgrade when you're ready. No hidden fees.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
          {PLANS.map((plan) => (
            <div key={plan.id}
              className="rounded-2xl p-6 flex flex-col relative transition-all hover:scale-[1.02]"
              style={{
                backgroundColor: plan.highlight ? plan.color : C.card,
                border: `2px solid ${plan.highlight ? plan.color : C.amberBorder}`,
                boxShadow: plan.highlight ? `0 8px 32px ${plan.color}30` : "0 2px 8px rgba(120,97,78,0.06)",
              }}>
              {plan.badge && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full text-xs font-bold"
                  style={{ backgroundColor: C.text, color: "white" }}>
                  {plan.badge}
                </div>
              )}
              <div className="mb-4">
                <h3 className="font-bold text-base mb-1" style={{ color: plan.highlight ? "white" : C.text }}>{plan.name}</h3>
                <div className="flex items-baseline gap-1">
                  <span className="text-3xl font-bold" style={{ color: plan.highlight ? "white" : plan.color }}>${plan.price}</span>
                  <span className="text-sm" style={{ color: plan.highlight ? "rgba(255,255,255,0.7)" : C.lighter }}>/month</span>
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
              <Link href="/register"
                className="text-center py-2.5 rounded-xl text-sm font-semibold transition-all hover:opacity-90"
                style={{
                  backgroundColor: plan.highlight ? "white" : C.amberLight,
                  color: plan.highlight ? plan.color : C.amberDark,
                }}>
                Start Free Trial
              </Link>
            </div>
          ))}
        </div>

        <p className="text-center text-sm mt-6" style={{ color: C.lighter }}>
          All plans include a free trial. No credit card required to start.
        </p>
      </section>

      {/* ── TESTIMONIALS ────────────────────────────────────────────────────── */}
      <section id="testimonials" style={{ backgroundColor: C.card, borderTop: `1px solid ${C.amberBorder}`, borderBottom: `1px solid ${C.amberBorder}` }}
        className="px-6 py-20">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-3xl font-bold text-center mb-12" style={{ color: C.text }}>What agencies say</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {TESTIMONIALS.map((t) => (
              <div key={t.name} className="rounded-2xl p-6"
                style={{ backgroundColor: C.bg, border: `1px solid ${C.amberBorder}` }}>
                <div className="flex gap-0.5 mb-4">
                  {Array.from({ length: t.rating }).map((_, i) => (
                    <Star key={i} className="w-4 h-4" style={{ color: C.amber, fill: C.amber }} />
                  ))}
                </div>
                <p className="text-sm leading-relaxed mb-5" style={{ color: C.muted }}>"{t.text}"</p>
                <div>
                  <p className="font-semibold text-sm" style={{ color: C.text }}>{t.name}</p>
                  <p className="text-xs mt-0.5" style={{ color: C.lighter }}>{t.role}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── FINAL CTA ───────────────────────────────────────────────────────── */}
      <section className="px-6 py-24 text-center max-w-2xl mx-auto">
        <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-6"
          style={{ background: `linear-gradient(135deg, ${C.amber}, ${C.amberDark})` }}>
          <Zap className="w-8 h-8 text-white" />
        </div>
        <h2 className="text-3xl md:text-4xl font-bold mb-4" style={{ color: C.text }}>
          Ready to grow your agency?
        </h2>
        <p className="text-base mb-10" style={{ color: C.muted }}>
          Join agencies already using MarketHub Pro to find clients, analyze competitors, and automate their marketing workflows.
        </p>
        <Link href="/register"
          className="inline-flex items-center gap-2 px-10 py-4 rounded-xl text-lg font-bold transition-all hover:opacity-90 hover:scale-105 shadow-xl"
          style={{ backgroundColor: C.amber, color: "white", boxShadow: `0 12px 32px ${C.amber}40` }}>
          Start Free Trial
          <ChevronRight className="w-5 h-5" />
        </Link>
        <p className="text-sm mt-4" style={{ color: C.lighter }}>No credit card required · Cancel anytime</p>
      </section>

      {/* ── FOOTER ──────────────────────────────────────────────────────────── */}
      <footer style={{ backgroundColor: C.card, borderTop: `1px solid ${C.amberBorder}` }}
        className="px-6 py-8">
        <div className="max-w-4xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4 text-sm" style={{ color: C.lighter }}>
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-lg flex items-center justify-center"
              style={{ background: `linear-gradient(135deg, ${C.amber}, ${C.amberDark})` }}>
              <Zap className="w-3 h-3 text-white" />
            </div>
            <span className="font-semibold" style={{ color: C.muted }}>MarketHub Pro</span>
          </div>
          <div className="flex items-center gap-6">
            <Link href="/privacy" className="hover:text-amber-600 transition-colors">Privacy</Link>
            <Link href="/terms" className="hover:text-amber-600 transition-colors">Terms</Link>
            <Link href="/pricing" className="hover:text-amber-600 transition-colors">Pricing</Link>
            <Link href="/login" className="hover:text-amber-600 transition-colors">Sign In</Link>
          </div>
          <span>© {new Date().getFullYear()} MarketHub Pro</span>
        </div>
      </footer>
    </div>
  );
}
