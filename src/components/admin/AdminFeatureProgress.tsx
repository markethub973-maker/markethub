"use client";

import { useState } from "react";
import { CheckCircle, Clock, AlertCircle, Circle, ChevronDown, ChevronUp, RefreshCw } from "lucide-react";

type Status = "done" | "testing" | "in-progress" | "planned" | "pending";
type Priority = "critical" | "high" | "medium" | "low";
type Category = "Core" | "AI" | "Admin" | "Integration" | "Payment" | "Security" | "UI/UX";

interface Feature {
  id: string;
  name: string;
  category: Category;
  status: Status;
  priority: Priority;
  description: string;
  notes?: string;
  addedAt?: string;
}

// ── Master Feature List — updated 10 apr 2026 ────────────────────────────────
const FEATURES: Feature[] = [
  // ── Core Platform ──────────────────────────────────────────────────────────
  { id: "f01", name: "YouTube Analytics — Channel Stats", category: "Core", status: "done", priority: "critical", description: "Subscribers, views, videos, engagement rate for own channel", addedAt: "2026-02" },
  { id: "f02", name: "YouTube — Top Videos & Trending", category: "Core", status: "done", priority: "high", description: "Top videos + trending by region (195 countries), search, sort, engagement rate. /videos route (canonical, /trending redirects here)", addedAt: "2026-02" },
  { id: "f03", name: "YouTube — Channel Search", category: "Core", status: "done", priority: "high", description: "Search and analyze any public YouTube channel", addedAt: "2026-02" },
  { id: "f04", name: "Google Trends", category: "Core", status: "done", priority: "high", description: "Trending searches, keyword comparison, interest over time, regional breakdown. /trends route (canonical, /global redirects here)", addedAt: "2026-02" },
  { id: "f05", name: "Instagram Analytics — Feed & Insights", category: "Core", status: "done", priority: "critical", description: "Reach, impressions, engagement for connected IG account via Meta Graph API", addedAt: "2026-02" },
  { id: "f06", name: "Instagram — Demographics", category: "Core", status: "done", priority: "high", description: "Age, gender, city, country breakdown of audience", addedAt: "2026-02" },
  { id: "f07", name: "Instagram — Hashtag Analytics + Sets", category: "Core", status: "done", priority: "high", description: "Hashtag performance and trend tracking. Sets saved to Supabase hashtag_sets table", addedAt: "2026-02" },
  { id: "f08", name: "Instagram — Competitor & Public Search", category: "Core", status: "done", priority: "high", description: "Public profile scraping via RapidAPI + engagement rate calculator. /instagram-search (canonical)", addedAt: "2026-03" },
  { id: "f09", name: "TikTok — Search & Trends", category: "Core", status: "done", priority: "high", description: "Videos, creators, hashtags via TikTok Trend Analysis API (RapidAPI)", addedAt: "2026-03" },
  { id: "f10", name: "Meta Insights — Stories, Reels, Ads, Audience", category: "Core", status: "done", priority: "high", description: "5 tabs: Stories analytics, Reels insights, Ad Account (CPM/CPC/ROAS), Cross-platform, Audience Overlap", addedAt: "2026-03" },
  { id: "f11", name: "Facebook Ads Library", category: "Core", status: "done", priority: "high", description: "Slide-in panel for brand ad research with filters + checklist", addedAt: "2026-03" },
  { id: "f12", name: "News Feed", category: "Core", status: "done", priority: "medium", description: "Marketing industry news aggregation by country", addedAt: "2026-02" },
  { id: "f13", name: "Alerts System", category: "Core", status: "done", priority: "medium", description: "Channel performance alerts and notifications", addedAt: "2026-02" },
  { id: "f14", name: "Campaigns Manager — Supabase", category: "Core", status: "done", priority: "medium", description: "Campaign tracking per user: budget, spent, ROI, impressions, clicks, conversions, live IG/TT sync. Migrat din localStorage la Supabase 10 apr 2026", addedAt: "2026-10", notes: "Migrat complet la Supabase în 10 apr 2026. API: GET/POST/PATCH/DELETE /api/campaigns cu ownership check." },
  { id: "f15", name: "Multi-Account Clients + Share Links", category: "Core", status: "done", priority: "high", description: "Monitor IG/TT username-only. White-label portal links cu live refresh, password protection, agency branding", addedAt: "2026-02" },
  { id: "f16", name: "Content Calendar", category: "Core", status: "done", priority: "medium", description: "Visual content planning calendar, auto-publish Instagram", addedAt: "2026-02" },
  { id: "f17", name: "Competitors Monitor", category: "Core", status: "done", priority: "medium", description: "Monitor competitors IG + TikTok. Real-time followers, engagement, posts. Compare side-by-side.", addedAt: "2026-03" },

  // ── AI Features ────────────────────────────────────────────────────────────
  { id: "a01", name: "AI Caption Generator (45+ limbi)", category: "AI", status: "done", priority: "critical", description: "3 caption variants via Claude Sonnet with tone/platform selector, 45+ limbi grupate pe regiuni", addedAt: "2026-03" },
  { id: "a02", name: "Lead Finder — Full Wizard (5 steps)", category: "AI", status: "done", priority: "critical", description: "Analyze → Score (DEMAND vs SUPPLY) → Message → Campaign → APEX Advisor. Canonical: /lead-finder (/marketing redirects here). Per-plan model routing, language enforcement", addedAt: "2026-04" },
  { id: "a03", name: "AI Hub — 8 Specialized Agents", category: "AI", status: "done", priority: "high", description: "Market researcher, copywriter, landing page writer, SEO optimizer, blog writer, ad copy creator, pricing strategist, competitive analyst", addedAt: "2026-03" },
  { id: "a04", name: "AI Email Composer per Lead", category: "AI", status: "done", priority: "high", description: "POST /api/leads/email/draft: fetch lead → Claude Haiku → subject+body plain text → Gmail Compose URL. Zero OAuth.", addedAt: "2026-04" },
  { id: "a05", name: "Premium AI Actions — Monthly Counter", category: "AI", status: "done", priority: "critical", description: "RPC atomic consume_premium_action. Cote: free=5, lite=20, pro=50, business=200, agency=1000", addedAt: "2026-04" },
  { id: "a06", name: "Per-plan AI Model Routing", category: "AI", status: "done", priority: "high", description: "Starter/Creator → Haiku 4.5, Pro/Studio/Agency → Sonnet 4.6", addedAt: "2026-04" },
  { id: "a07", name: "Buyer Persona Builder", category: "AI", status: "done", priority: "high", description: "Scrapes Instagram + Claude AI generates full buyer persona (demographics, psychographics, affiliate opps, monetization score)", addedAt: "2026-03" },
  { id: "a08", name: "Monthly Report PDF", category: "AI", status: "done", priority: "medium", description: "AI-generated PDF A4 download via @react-pdf/renderer", addedAt: "2026-03" },
  { id: "a09", name: "Agent Confidentiality + Error Messages", category: "AI", status: "done", priority: "high", description: "Agents blocked from revealing architecture/costs. Elegant user-facing messages for 402/429/529 etc.", addedAt: "2026-03" },
  { id: "a10", name: "ProfitStatsCard — Value Realization", category: "AI", status: "done", priority: "medium", description: "Dashboard widget: timp recuperat + costuri economisite bazat pe premium_actions_used. Counter animation.", addedAt: "2026-04" },

  // ── Admin Tools ────────────────────────────────────────────────────────────
  { id: "ad01", name: "Admin Dashboard — Mobile-first", category: "Admin", status: "done", priority: "critical", description: "Private /markethub973 login. 18 panouri în modals full-screen (mobile) / centrate (desktop). 6 grupuri logice. Redesignat 10 apr 2026.", addedAt: "2026-02", notes: "Redesignat complet 10 apr 2026: mobile-first, toate panourile în modals, Escape/backdrop pentru închidere." },
  { id: "ad02", name: "Admin Users Table", category: "Admin", status: "done", priority: "high", description: "Search/sort users, change plans, reset trials, view API costs", addedAt: "2026-02" },
  { id: "ad03", name: "Admin Revenue Analytics", category: "Admin", status: "done", priority: "high", description: "Daily/weekly/monthly revenue charts with Recharts", addedAt: "2026-02" },
  { id: "ad04", name: "Admin Pricing + Feature Flags + Discounts", category: "Admin", status: "done", priority: "high", description: "Live price management, per-plan feature flags, discount codes CRUD", addedAt: "2026-03" },
  { id: "ad05", name: "Onboarding Checklist + Premium Notifications", category: "Admin", status: "done", priority: "high", description: "4-step onboarding checklist. Bell notifications când remaining ≤5 sau =0.", addedAt: "2026-04" },
  { id: "ad06", name: "Feature Progress Tracker", category: "Admin", status: "done", priority: "medium", description: "Acest tabel — tracks all features cu status, category, priority, notes. Actualizat 10 apr 2026.", addedAt: "2026-03" },
  { id: "ad07", name: "Competitor Monetization Spy", category: "Admin", status: "planned", priority: "medium", description: "Ads Library + scraper to identify competitor monetization strategies", notes: "Planned v1.1" },
  { id: "ad08", name: "Affiliate Link Hub", category: "Admin", status: "planned", priority: "medium", description: "Store and manage affiliate links, match to audience demographics", notes: "Planned v1.1" },
  { id: "ad09", name: "Trending Products Alert", category: "Admin", status: "planned", priority: "medium", description: "Daily TikTok+IG scan for trending products, email alert when detected", notes: "Planned v1.1" },

  // ── Integrations ───────────────────────────────────────────────────────────
  { id: "i01", name: "Meta Graph API — Instagram Connect", category: "Integration", status: "done", priority: "critical", description: "OAuth flow for connecting user IG accounts. Token expiră ~29 mai 2026 — reînnoire din Admin → Platform Connect.", addedAt: "2026-02", notes: "Token curent expiră ~29 mai 2026." },
  { id: "i02", name: "YouTube Data API v3 + OAuth", category: "Integration", status: "done", priority: "critical", description: "Channel, videos, trending, search endpoints — 10K quota/day. Google OAuth pentru cont propriu.", addedAt: "2026-02" },
  { id: "i03", name: "RapidAPI — TikTok + Instagram Scraper", category: "Integration", status: "done", priority: "high", description: "tiktok-trend-analysis-api + instagram-public-bulk-scraper via RapidAPI", addedAt: "2026-03" },
  { id: "i04", name: "Resend Email API", category: "Integration", status: "done", priority: "medium", description: "PDF report delivery + payment confirmation + subscription cancelled emails", addedAt: "2026-02" },
  { id: "i05", name: "Anthropic — Dual API Keys", category: "Integration", status: "done", priority: "critical", description: "ANTHROPIC_API_KEY (dev) + ANTHROPIC_API_KEY_APP (app features) — independent credits", addedAt: "2026-03" },
  { id: "i06", name: "Apify — OLX + FB Groups Scrapers", category: "Integration", status: "done", priority: "high", description: "piotrv1001~olx-listings-scraper + apify~facebook-groups-scraper cu webhook integration", addedAt: "2026-04" },
  { id: "i07", name: "Oblio — Auto Invoice", category: "Integration", status: "done", priority: "medium", description: "Auto-emite factură Oblio la fiecare plată Stripe (non-fatal, log dacă eșuează)", addedAt: "2026-04" },

  // ── Payment ─────────────────────────────────────────────────────────────────
  { id: "p01", name: "Stripe Subscriptions — 4 Plans (Live)", category: "Payment", status: "done", priority: "critical", description: "Creator $24, Pro $49, Studio $99, Agency $249. sk_live + price_live IDs + webhook live configurat Vercel. 10 apr 2026.", addedAt: "2026-03", notes: "Switchat la live mode 10 apr 2026. Webhook: 5 events inclusiv subscription.created." },
  { id: "p02", name: "Extra AI Credits Purchase", category: "Payment", status: "done", priority: "high", description: "Stripe one-time checkout pentru credit packs $10/$25/$50/$100 cu bonusuri. Atomic upsert via RPC.", addedAt: "2026-03" },
  { id: "p03", name: "Stripe Webhook — 5 Events", category: "Payment", status: "done", priority: "critical", description: "checkout.session.completed + subscription.created (nou 10 apr) + subscription.updated + subscription.deleted + invoice.payment_failed. Idempotency via stripe_webhook_events table.", addedAt: "2026-03", notes: "subscription.created adăugat 10 apr 2026 pentru subscripții create direct (non-Checkout)." },

  // ── Security ────────────────────────────────────────────────────────────────
  { id: "s01", name: "Admin Auth — Secret URL + Password", category: "Security", status: "done", priority: "critical", description: "Private /markethub973 cu ?t=tunnel_secret + cookie httpOnly 8h. 404 fără token.", addedAt: "2026-02" },
  { id: "s02", name: "requireAuth + requirePlan — 54 routes", category: "Security", status: "done", priority: "critical", description: "Centralizat în route-helpers.ts. Aplicat pe 54 route handlers. RLS pe 14 tabele Supabase.", addedAt: "2026-04" },
  { id: "s03", name: "Rate Limiting — Auth + API", category: "Security", status: "done", priority: "high", description: "10 req/min auth, 120 req/min API. Upstash Redis. Brute-force protection pe login/register.", addedAt: "2026-03" },
  { id: "s04", name: "SSRF + Injection fixes (Security Audit)", category: "Security", status: "done", priority: "high", description: "7 fixuri post-audit: SSRF private IP block pe research/website, IDOR portal password brute-force, bio-link PATCH auth, meta routes requireAuth, oblio fail-loud, token redact din logs", addedAt: "2026-04" },

  // ── UI/UX ───────────────────────────────────────────────────────────────────
  { id: "u01", name: "Sidebar — 6 Grupuri Logice (Reorganizat)", category: "UI/UX", status: "done", priority: "high", description: "YouTube Analytics | Social Platforms | Discover | Research & Leads | Content & Planning | Clients. Duplicate eliminate (redirects). Reorganizat 10 apr 2026.", addedAt: "2026-02", notes: "Reorganizat 10 apr: 5 grupuri haotice → 6 logice. /marketing, /trending, /global, /dashboard/subscription devin redirects." },
  { id: "u02", name: "Settings Page — 3 Tabs", category: "UI/UX", status: "done", priority: "high", description: "Profile, Integrations, AI Credits (admin sees API Keys & Opportunities instead)", addedAt: "2026-03" },
  { id: "u03", name: "Research Hub — Multi-source + Local Market", category: "UI/UX", status: "done", priority: "high", description: "9 surse: Google, YouTube, Website, Instagram, TikTok, Facebook, FB Groups, Reddit, Reviews. OLX/Pagini Aurii/Storia/Autovit pentru Romania.", addedAt: "2026-04" },
  { id: "u04", name: "Lead Database — Pipeline + Email", category: "UI/UX", status: "done", priority: "high", description: "6 stagii pipeline, AI email composer per lead (Gmail Compose URL), CSV export, enrich IG/YT/website", addedAt: "2026-04" },
  { id: "u05", name: "Client Portal — White-label + Password + Live", category: "UI/UX", status: "done", priority: "high", description: "Agency name/logo/accent per link. Live data refresh ≥30min. Password protection cu scrypt hash. /portal/[token] (canonical, /report/[token] = snapshot vechi).", addedAt: "2026-04" },
  { id: "u06", name: "Pricing Page — Premium Actions", category: "UI/UX", status: "done", priority: "high", description: "Token-based → Premium Actions. Comparison table, FAQ. Checkout live Stripe.", addedAt: "2026-04" },
];

// ── Status config ─────────────────────────────────────────────────────────────
const STATUS_CONFIG: Record<Status, { label: string; icon: React.ReactNode; color: string; bg: string }> = {
  done:        { label: "Done",        icon: <CheckCircle size={13} />, color: "#16a34a", bg: "rgba(34,197,94,0.1)"  },
  testing:     { label: "Testing",     icon: <RefreshCw   size={13} />, color: "#d97706", bg: "rgba(245,158,11,0.1)" },
  "in-progress": { label: "In Progress", icon: <Clock size={13} />,    color: "#2563eb", bg: "rgba(37,99,235,0.1)"  },
  planned:     { label: "Planned",     icon: <Circle      size={13} />, color: "#7c3aed", bg: "rgba(124,58,237,0.1)" },
  pending:     { label: "Pending",     icon: <AlertCircle size={13} />, color: "#dc2626", bg: "rgba(239,68,68,0.1)"  },
};

const PRIORITY_COLORS: Record<Priority, string> = {
  critical: "#ef4444", high: "#f59e0b", medium: "#3b82f6", low: "#94a3b8",
};

const CATEGORY_COLORS: Record<Category, string> = {
  "Core": "#C2854C", "AI": "#7c3aed", "Admin": "#d97706",
  "Integration": "#0ea5e9", "Payment": "#16a34a", "Security": "#ef4444", "UI/UX": "#ec4899",
};

const ALL_CATEGORIES: Category[] = ["Core", "AI", "Admin", "Integration", "Payment", "Security", "UI/UX"];
const ALL_STATUSES: Status[] = ["done", "testing", "in-progress", "planned", "pending"];

// ── Summary counts ────────────────────────────────────────────────────────────
function getSummary() {
  const total = FEATURES.length;
  const done = FEATURES.filter(f => f.status === "done").length;
  const testing = FEATURES.filter(f => f.status === "testing").length;
  const inProgress = FEATURES.filter(f => f.status === "in-progress").length;
  const planned = FEATURES.filter(f => f.status === "planned").length;
  return { total, done, testing, inProgress, planned, completionPct: Math.round((done / total) * 100) };
}

export default function AdminFeatureProgress() {
  const [filterCategory, setFilterCategory] = useState<Category | "All">("All");
  const [filterStatus, setFilterStatus] = useState<Status | "All">("All");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [showPlanned, setShowPlanned] = useState(true);

  const summary = getSummary();

  const filtered = FEATURES.filter(f => {
    if (filterCategory !== "All" && f.category !== filterCategory) return false;
    if (filterStatus !== "All" && f.status !== filterStatus) return false;
    return true;
  });

  return (
    <div className="rounded-2xl border overflow-hidden" style={{ backgroundColor: "var(--color-bg-secondary)", border: "1px solid rgba(245,215,160,0.3)" }}>

      {/* Header */}
      <div className="p-6 border-b" style={{ borderColor: "rgba(245,215,160,0.25)", background: "linear-gradient(135deg, rgba(194,133,76,0.06), rgba(245,215,160,0.1))" }}>
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h2 className="text-lg font-bold" style={{ color: "var(--color-text)" }}>📋 Feature Progress Tracker</h2>
            <p className="text-xs mt-0.5" style={{ color: "#A8967E" }}>
              Auto-updated with every conversation session · Last sync: {new Date().toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })}
            </p>
          </div>
          <span className="text-xs px-2.5 py-1 rounded-full font-medium" style={{ backgroundColor: "rgba(245,158,11,0.12)", color: "#d97706", border: "1px solid rgba(245,158,11,0.2)" }}>
            👑 Admin only
          </span>
        </div>

        {/* Summary bar */}
        <div className="mt-4 grid grid-cols-2 sm:grid-cols-5 gap-3">
          {[
            { label: "Total Features", value: summary.total, color: "var(--color-text)" },
            { label: "✅ Done", value: summary.done, color: "#16a34a" },
            { label: "🧪 Testing", value: summary.testing, color: "#d97706" },
            { label: "🔄 In Progress", value: summary.inProgress, color: "#2563eb" },
            { label: "📋 Planned", value: summary.planned, color: "#7c3aed" },
          ].map(({ label, value, color }) => (
            <div key={label} className="rounded-xl p-3 text-center" style={{ backgroundColor: "rgba(255,255,255,0.6)" }}>
              <p className="text-xl font-bold" style={{ color }}>{value}</p>
              <p className="text-xs" style={{ color: "#A8967E" }}>{label}</p>
            </div>
          ))}
        </div>

        {/* Completion bar */}
        <div className="mt-4">
          <div className="flex justify-between text-xs mb-1.5" style={{ color: "#A8967E" }}>
            <span>Platform completion</span>
            <span className="font-bold" style={{ color: "#C2854C" }}>{summary.completionPct}%</span>
          </div>
          <div className="w-full h-2.5 rounded-full overflow-hidden" style={{ backgroundColor: "rgba(245,215,160,0.3)" }}>
            <div className="h-full rounded-full transition-all duration-700"
              style={{ width: `${summary.completionPct}%`, background: "linear-gradient(90deg, #C2854C, #E8A96B)" }} />
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="p-4 border-b flex flex-wrap gap-2" style={{ borderColor: "rgba(245,215,160,0.2)" }}>
        {/* Category filter */}
        <div className="flex flex-wrap gap-1.5">
          {(["All", ...ALL_CATEGORIES] as (Category | "All")[]).map(cat => (
            <button key={cat} onClick={() => setFilterCategory(cat)}
              className="text-xs px-2.5 py-1 rounded-full font-medium transition-all"
              style={filterCategory === cat
                ? { backgroundColor: cat === "All" ? "var(--color-text)" : CATEGORY_COLORS[cat as Category], color: "white" }
                : { backgroundColor: "rgba(245,215,160,0.15)", color: "#78614E" }}>
              {cat}
            </button>
          ))}
        </div>

        <div className="w-px self-stretch" style={{ backgroundColor: "rgba(245,215,160,0.3)" }} />

        {/* Status filter */}
        <div className="flex flex-wrap gap-1.5">
          {(["All", ...ALL_STATUSES] as (Status | "All")[]).map(st => (
            <button key={st} onClick={() => setFilterStatus(st)}
              className="text-xs px-2.5 py-1 rounded-full font-medium transition-all"
              style={filterStatus === st
                ? { backgroundColor: st === "All" ? "var(--color-text)" : STATUS_CONFIG[st as Status].bg, color: st === "All" ? "white" : STATUS_CONFIG[st as Status].color, border: `1px solid ${st === "All" ? "transparent" : STATUS_CONFIG[st as Status].color}` }
                : { backgroundColor: "rgba(245,215,160,0.15)", color: "#78614E" }}>
              {st === "All" ? "All statuses" : STATUS_CONFIG[st as Status].label}
            </button>
          ))}
        </div>
      </div>

      {/* Feature list */}
      <div className="divide-y" style={{ borderColor: "rgba(245,215,160,0.15)" }}>
        {filtered.map(feature => {
          const statusCfg = STATUS_CONFIG[feature.status];
          const isExpanded = expandedId === feature.id;
          return (
            <div key={feature.id} className="transition-all" style={{ backgroundColor: isExpanded ? "rgba(245,215,160,0.05)" : "transparent" }}>
              <div
                className="flex items-center gap-3 px-5 py-3 cursor-pointer hover:bg-amber-50/30 transition-colors"
                onClick={() => setExpandedId(isExpanded ? null : feature.id)}
              >
                {/* Status badge */}
                <span className="flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-medium shrink-0"
                  style={{ backgroundColor: statusCfg.bg, color: statusCfg.color }}>
                  {statusCfg.icon}
                  {statusCfg.label}
                </span>

                {/* Category dot */}
                <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: CATEGORY_COLORS[feature.category] }} />

                {/* Name */}
                <span className="text-sm font-medium flex-1 min-w-0 truncate" style={{ color: "var(--color-text)" }}>
                  {feature.name}
                </span>

                {/* Category tag */}
                <span className="text-xs px-2 py-0.5 rounded-full shrink-0 hidden sm:inline-flex"
                  style={{ backgroundColor: `${CATEGORY_COLORS[feature.category]}15`, color: CATEGORY_COLORS[feature.category] }}>
                  {feature.category}
                </span>

                {/* Priority dot */}
                <span className="w-2 h-2 rounded-full shrink-0" title={`Priority: ${feature.priority}`}
                  style={{ backgroundColor: PRIORITY_COLORS[feature.priority] }} />

                {/* Expand toggle */}
                <span style={{ color: "#A8967E" }}>
                  {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                </span>
              </div>

              {/* Expanded detail */}
              {isExpanded && (
                <div className="px-5 pb-4 ml-12 space-y-1.5">
                  <p className="text-sm" style={{ color: "#78614E" }}>{feature.description}</p>
                  {feature.notes && (
                    <p className="text-xs px-3 py-1.5 rounded-lg" style={{ backgroundColor: "rgba(245,158,11,0.08)", color: "#d97706" }}>
                      📝 {feature.notes}
                    </p>
                  )}
                  <div className="flex gap-3 text-xs" style={{ color: "#A8967E" }}>
                    <span>ID: {feature.id}</span>
                    {feature.addedAt && <span>Added: {feature.addedAt}</span>}
                    <span>Priority: <strong style={{ color: PRIORITY_COLORS[feature.priority] }}>{feature.priority}</strong></span>
                  </div>
                </div>
              )}
            </div>
          );
        })}

        {filtered.length === 0 && (
          <div className="p-8 text-center" style={{ color: "#A8967E" }}>
            <p className="text-sm">No features match the current filters.</p>
          </div>
        )}
      </div>

      {/* Footer legend */}
      <div className="p-4 border-t flex flex-wrap gap-4 text-xs" style={{ borderColor: "rgba(245,215,160,0.2)", color: "#A8967E" }}>
        <span className="font-medium" style={{ color: "#78614E" }}>Priority:</span>
        {(Object.entries(PRIORITY_COLORS) as [Priority, string][]).map(([p, c]) => (
          <span key={p} className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full" style={{ backgroundColor: c }} />
            {p}
          </span>
        ))}
        <span className="ml-2 font-medium" style={{ color: "#78614E" }}>Category:</span>
        {ALL_CATEGORIES.map(cat => (
          <span key={cat} className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full" style={{ backgroundColor: CATEGORY_COLORS[cat] }} />
            {cat}
          </span>
        ))}
      </div>
    </div>
  );
}
