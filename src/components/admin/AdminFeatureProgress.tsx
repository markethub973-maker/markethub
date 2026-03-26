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

// ── Master Feature List — updated with every new feature ─────────────────────
const FEATURES: Feature[] = [
  // ── Core Platform ──────────────────────────────────────────────────────────
  { id: "f01", name: "YouTube Analytics — Channel Stats", category: "Core", status: "done", priority: "critical", description: "Subscribers, views, videos, engagement rate for own channel", addedAt: "2026-02" },
  { id: "f02", name: "YouTube — Top Videos", category: "Core", status: "done", priority: "high", description: "Top performing videos with metrics and thumbnail", addedAt: "2026-02" },
  { id: "f03", name: "YouTube — Global Trending", category: "Core", status: "done", priority: "high", description: "Worldwide trending videos by country and category", addedAt: "2026-02" },
  { id: "f04", name: "YouTube — Channel Search", category: "Core", status: "done", priority: "high", description: "Search and analyze any public YouTube channel", addedAt: "2026-02" },
  { id: "f05", name: "Instagram Analytics — Feed & Insights", category: "Core", status: "done", priority: "critical", description: "Reach, impressions, engagement for connected IG account via Meta Graph API", addedAt: "2026-02" },
  { id: "f06", name: "Instagram — Demographics", category: "Core", status: "done", priority: "high", description: "Age, gender, city, country breakdown of audience", addedAt: "2026-02" },
  { id: "f07", name: "Instagram — Hashtag Analytics", category: "Core", status: "done", priority: "high", description: "Hashtag performance and trend tracking", addedAt: "2026-02" },
  { id: "f08", name: "Instagram — Competitor Analysis", category: "Core", status: "done", priority: "high", description: "Public profile scraping via RapidAPI + engagement rate calculator", addedAt: "2026-03" },
  { id: "f09", name: "TikTok — Search & Trends", category: "Core", status: "done", priority: "high", description: "Videos, creators, hashtags via TikTok Trend Analysis API (RapidAPI)", addedAt: "2026-03" },
  { id: "f10", name: "Facebook Ads Library", category: "Core", status: "done", priority: "high", description: "Slide-in panel for brand ad research with filters + checklist", addedAt: "2026-03" },
  { id: "f11", name: "News Feed", category: "Core", status: "done", priority: "medium", description: "Marketing industry news aggregation", addedAt: "2026-02" },
  { id: "f12", name: "Alerts System", category: "Core", status: "done", priority: "medium", description: "Channel performance alerts and notifications", addedAt: "2026-02" },
  { id: "f13", name: "Campaigns Manager", category: "Core", status: "done", priority: "medium", description: "Marketing campaign tracking and management", addedAt: "2026-02" },
  { id: "f14", name: "Multi-Account Clients", category: "Core", status: "done", priority: "high", description: "Manage multiple client social accounts", addedAt: "2026-02" },
  { id: "f15", name: "Content Calendar", category: "Core", status: "done", priority: "medium", description: "Visual content planning calendar", addedAt: "2026-02" },

  // ── AI Features ────────────────────────────────────────────────────────────
  { id: "a01", name: "AI Caption Generator", category: "AI", status: "done", priority: "critical", description: "3 caption variants via Claude Sonnet with tone/platform selector", addedAt: "2026-03" },
  { id: "a02", name: "AI Agent — Marketing", category: "AI", status: "done", priority: "high", description: "Content strategy, posting schedule, growth tactics", addedAt: "2026-03" },
  { id: "a03", name: "AI Agent — Email Copywriter", category: "AI", status: "done", priority: "high", description: "Campaign emails, newsletters, subject lines", addedAt: "2026-03" },
  { id: "a04", name: "AI Agent — Financial Analyst", category: "AI", status: "done", priority: "high", description: "ROI analysis, budget optimization, cost breakdown", addedAt: "2026-03" },
  { id: "a05", name: "AI Agent — Support", category: "AI", status: "done", priority: "medium", description: "Customer support assistant with platform knowledge", addedAt: "2026-03" },
  { id: "a06", name: "AI Agent — Competitor Spy", category: "AI", status: "done", priority: "high", description: "Competitor analysis and strategy recommendations", addedAt: "2026-03" },
  { id: "a07", name: "AI Budget Tracking System", category: "AI", status: "done", priority: "critical", description: "Per-user monthly AI budget limits by plan, pre-check before Claude calls", addedAt: "2026-03" },
  { id: "a08", name: "AI Elegant Error Messages", category: "AI", status: "done", priority: "high", description: "User-friendly messages for all Anthropic error types (402, 429, 529, etc.)", addedAt: "2026-03" },
  { id: "a09", name: "Agent Confidentiality Rules", category: "AI", status: "done", priority: "critical", description: "AI agents blocked from revealing app architecture, costs, APIs to regular users", addedAt: "2026-03" },
  { id: "a10", name: "Buyer Persona Builder", category: "AI", status: "testing", priority: "high", description: "Scrapes Instagram + Claude AI generates full buyer persona with affiliate opportunities", addedAt: "2026-03", notes: "Added to admin dashboard. Needs production test with live IG account." },
  { id: "a11", name: "PDF Marketing Reports", category: "AI", status: "done", priority: "medium", description: "AI-generated PDF reports with charts sent via Resend email", addedAt: "2026-03" },

  // ── Admin Tools ────────────────────────────────────────────────────────────
  { id: "ad01", name: "Admin Dashboard", category: "Admin", status: "done", priority: "critical", description: "Private /markethub973 login, users table, revenue analytics, pricing panel", addedAt: "2026-02" },
  { id: "ad02", name: "Admin Users Table", category: "Admin", status: "done", priority: "high", description: "Search/sort users, change plans, reset trials, view API costs", addedAt: "2026-02" },
  { id: "ad03", name: "Admin Revenue Analytics", category: "Admin", status: "done", priority: "high", description: "Daily/weekly/monthly revenue charts with Recharts", addedAt: "2026-02" },
  { id: "ad04", name: "Admin Pricing Panel", category: "Admin", status: "done", priority: "high", description: "Live price management for all 6 plans", addedAt: "2026-03" },
  { id: "ad05", name: "API Keys & Opportunities Dashboard", category: "Admin", status: "done", priority: "medium", description: "All 5 APIs with status, dashboard links, current usage, untapped data opportunities", addedAt: "2026-03" },
  { id: "ad06", name: "Feature Progress Tracker", category: "Admin", status: "done", priority: "medium", description: "This table — tracks all features with status, category, priority, notes", addedAt: "2026-03" },
  { id: "ad07", name: "Competitor Monetization Spy", category: "Admin", status: "planned", priority: "medium", description: "Ads Library + scraper to identify competitor monetization strategies", notes: "Planned for v1.1 update with price increase" },
  { id: "ad08", name: "Affiliate Link Hub", category: "Admin", status: "planned", priority: "medium", description: "Store and manage affiliate links, match to audience demographics", notes: "Planned for v1.1" },
  { id: "ad09", name: "Trending Products Alert", category: "Admin", status: "planned", priority: "medium", description: "Daily TikTok+IG scan for trending products, email alert when detected", notes: "Planned for v1.1" },

  // ── Integrations ───────────────────────────────────────────────────────────
  { id: "i01", name: "Meta Graph API — Instagram Connect", category: "Integration", status: "done", priority: "critical", description: "OAuth flow for connecting user IG accounts, token storage in Supabase", addedAt: "2026-02" },
  { id: "i02", name: "YouTube Data API v3", category: "Integration", status: "done", priority: "critical", description: "Channel, videos, trending, search endpoints — 10K quota/day", addedAt: "2026-02" },
  { id: "i03", name: "RapidAPI — TikTok Trends", category: "Integration", status: "done", priority: "high", description: "tiktok-trend-analysis-api: videos, users, hashtags search", addedAt: "2026-03" },
  { id: "i04", name: "RapidAPI — Instagram Scraper", category: "Integration", status: "done", priority: "high", description: "instagram-public-bulk-scraper: public profile + posts data", addedAt: "2026-03" },
  { id: "i05", name: "Resend Email API", category: "Integration", status: "done", priority: "medium", description: "PDF report delivery via email, 3K free/month", addedAt: "2026-02" },
  { id: "i06", name: "Anthropic — Dual API Keys", category: "Integration", status: "done", priority: "critical", description: "ANTHROPIC_API_KEY (dev/Claude Code) + ANTHROPIC_API_KEY_APP (app features) — independent credits", addedAt: "2026-03" },

  // ── Payment ─────────────────────────────────────────────────────────────────
  { id: "p01", name: "Stripe Subscriptions — 6 Plans", category: "Payment", status: "done", priority: "critical", description: "Free Trial, Starter $9, Lite $19, Pro $39, Business $99, Enterprise $249", addedAt: "2026-03" },
  { id: "p02", name: "Extra AI Credits Purchase", category: "Payment", status: "done", priority: "high", description: "Stripe one-time checkout for $10/$25/$50/$100 credit packs with bonuses", addedAt: "2026-03" },
  { id: "p03", name: "Stripe Webhook Handler", category: "Payment", status: "done", priority: "critical", description: "Handles subscription + credit pack payments, updates Supabase", addedAt: "2026-03" },
  { id: "p04", name: "Early-Bird Pricing Strategy", category: "Payment", status: "in-progress", priority: "high", description: "Current prices are launch prices. Planned increase: Starter $9→$15, etc. with more AI credits", notes: "Activate after 1 month of launch. Update plan-config.ts" },

  // ── Security ────────────────────────────────────────────────────────────────
  { id: "s01", name: "Admin Auth — Secret URL + Password", category: "Security", status: "done", priority: "critical", description: "Private /markethub973 with localStorage token, no Supabase dependency", addedAt: "2026-02" },
  { id: "s02", name: "is_admin Role-Based Access", category: "Security", status: "done", priority: "critical", description: "Supabase is_admin flag controls admin features, checked server-side on all admin APIs", addedAt: "2026-03" },
  { id: "s03", name: "AI Budget Pre-Check", category: "Security", status: "done", priority: "high", description: "Budget checked BEFORE calling Claude — fail fast, no wasted API calls", addedAt: "2026-03" },

  // ── UI/UX ───────────────────────────────────────────────────────────────────
  { id: "u01", name: "Sidebar — Collapsible Groups", category: "UI/UX", status: "done", priority: "high", description: "5 organized groups with animated chevron, YouTube auto-expanded", addedAt: "2026-02" },
  { id: "u02", name: "Settings Page — 3 Tabs", category: "UI/UX", status: "done", priority: "high", description: "Profile, Integrations, AI Credits (admin sees API Keys & Opportunities instead)", addedAt: "2026-03" },
  { id: "u03", name: "Ads Library — Slide-In Panel", category: "UI/UX", status: "done", priority: "high", description: "Right slide-in panel with filters, mini browser preview, checklist, quick links", addedAt: "2026-03" },
  { id: "u04", name: "Admin Sidebar Link Fix", category: "UI/UX", status: "done", priority: "medium", description: "Fixed cn() with style objects bug — now uses style prop correctly", addedAt: "2026-03" },
  { id: "u05", name: "Language Consistency — English UI", category: "UI/UX", status: "done", priority: "medium", description: "Translated Romanian UI text: TikTok, Instagram Search, WorldMap, Settings", addedAt: "2026-03" },
  { id: "u06", name: "6-Plan Pricing Page", category: "UI/UX", status: "done", priority: "high", description: "Responsive pricing page with plan comparison and Stripe integration", addedAt: "2026-03" },
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
    <div className="rounded-2xl border overflow-hidden" style={{ backgroundColor: "#FFFCF7", border: "1px solid rgba(245,215,160,0.3)" }}>

      {/* Header */}
      <div className="p-6 border-b" style={{ borderColor: "rgba(245,215,160,0.25)", background: "linear-gradient(135deg, rgba(194,133,76,0.06), rgba(245,215,160,0.1))" }}>
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h2 className="text-lg font-bold" style={{ color: "#292524" }}>📋 Feature Progress Tracker</h2>
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
            { label: "Total Features", value: summary.total, color: "#292524" },
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
                ? { backgroundColor: cat === "All" ? "#292524" : CATEGORY_COLORS[cat as Category], color: "white" }
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
                ? { backgroundColor: st === "All" ? "#292524" : STATUS_CONFIG[st as Status].bg, color: st === "All" ? "white" : STATUS_CONFIG[st as Status].color, border: `1px solid ${st === "All" ? "transparent" : STATUS_CONFIG[st as Status].color}` }
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
                <span className="text-sm font-medium flex-1 min-w-0 truncate" style={{ color: "#292524" }}>
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
