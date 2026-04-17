"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  LogOut, Users, DollarSign, CheckCircle2, X,
  Key, Shield, FlaskConical, BarChart3, Tag, Cpu,
  Zap, Settings, Bug, RefreshCw, BookOpen, Link2,
  Activity, ChevronRight, Mail,
} from "lucide-react";
import AdminStatsCard from "@/components/admin/AdminStatsCard";
import AdminUsersTable from "@/components/admin/AdminUsersTable";
import AdminPricingPanel from "@/components/admin/AdminPricingPanel";
import AdminAnalyticsChart from "@/components/admin/AdminAnalyticsChart";
import AdminBuyerPersona from "@/components/admin/AdminBuyerPersona";
import AdminFeatureProgress from "@/components/admin/AdminFeatureProgress";
import AdminCredentials from "@/components/admin/AdminCredentials";
import AdminPlatformConnect from "@/components/admin/AdminPlatformConnect";
import AdminAnthropicUsage from "@/components/admin/AdminAnthropicUsage";
import AdminTokenStatus from "@/components/admin/AdminTokenStatus";
import AdminFeatureFlagsPanel from "@/components/admin/AdminFeatureFlagsPanel";
import AdminDiscountCodesPanel from "@/components/admin/AdminDiscountCodesPanel";
import AdminHealthCheck from "@/components/admin/AdminHealthCheck";
import AdminTestRunner from "@/components/admin/AdminTestRunner";
import AdminRestorePanel from "@/components/admin/AdminRestorePanel";
import AdminPlanTestAgent from "@/components/admin/AdminPlanTestAgent";
import AdminAuditLog from "@/components/admin/AdminAuditLog";
import AdminTestAccounts from "@/components/admin/AdminTestAccounts";
import AdminMarkupPanel from "@/components/admin/AdminMarkupPanel";
import AdminBusinessPanel from "@/components/admin/AdminBusinessPanel";
import AdminSecurityPanel from "@/components/admin/AdminSecurityPanel";
import AdminCommandCenter from "@/components/admin/AdminCommandCenter";
import AdminSupportTickets from "@/components/admin/AdminSupportTickets";
import AdminSecurityAgents from "@/components/admin/AdminSecurityAgents";
import Admin2FAPanel from "@/components/admin/Admin2FAPanel";
import AdminEmailPreview from "@/components/admin/AdminEmailPreview";
import AdminAiUsage from "@/components/admin/AdminAiUsage";
import { ModuleBoundary } from "@/components/ModuleBoundary";
import GlassCard from "@/components/ui/GlassCard";
import GlassButton from "@/components/ui/GlassButton";

// ── Panel definitions ──────────────────────────────────────────────────────────

type PanelId =
  | "users" | "analytics" | "billing" | "flags" | "discounts"
  | "tokens" | "platform" | "credentials" | "anthropic" | "markup"
  | "audit" | "health" | "tests" | "plantest" | "restore"
  | "persona" | "progress" | "testaccounts" | "business" | "security"
  | "support" | "secagents" | "twofa" | "emailpreview" | "aiusage";

interface PanelDef {
  id: PanelId;
  label: string;
  icon: React.ElementType;
  color: string;
  bg: string;
  group: string;
}

const PANELS: PanelDef[] = [
  // Business Management — primul, cel mai important
  { id: "business", label: "Administrare Business", icon: Shield, color: "var(--color-primary)", bg: "rgba(245,158,11,0.15)", group: "💼 Business" },
  // Support Tickets — M4 Sprint 1
  { id: "support", label: "Support Tickets", icon: Bug, color: "#EF4444", bg: "rgba(239,68,68,0.1)", group: "💼 Business" },
  // Users & Revenue
  { id: "users",       label: "Users",           icon: Users,        color: "#6366F1", bg: "rgba(99,102,241,0.1)",  group: "Users & Revenue" },
  { id: "analytics",   label: "Revenue Chart",   icon: BarChart3,    color: "#10B981", bg: "rgba(16,185,129,0.1)", group: "Users & Revenue" },
  { id: "testaccounts",label: "Test Accounts",   icon: FlaskConical, color: "#8B5CF6", bg: "rgba(139,92,246,0.1)", group: "Users & Revenue" },
  // Billing & Plans
  { id: "billing",     label: "Pricing",         icon: DollarSign,   color: "var(--color-primary)", bg: "rgba(245,158,11,0.1)", group: "Billing & Plans" },
  { id: "flags",       label: "Feature Flags",   icon: Zap,          color: "var(--color-primary)", bg: "rgba(245,158,11,0.1)", group: "Billing & Plans" },
  { id: "discounts",   label: "Discount Codes",  icon: Tag,          color: "#EF4444", bg: "rgba(239,68,68,0.1)",  group: "Billing & Plans" },
  // Platform & API
  { id: "tokens",      label: "API Tokens",      icon: Key,          color: "#0EA5E9", bg: "rgba(14,165,233,0.1)", group: "Platform & API" },
  { id: "platform",    label: "Platform Connect", icon: Link2,       color: "#0EA5E9", bg: "rgba(14,165,233,0.1)", group: "Platform & API" },
  { id: "credentials", label: "Credentials",     icon: Settings,     color: "#64748B", bg: "rgba(100,116,139,0.1)",group: "Platform & API" },
  { id: "anthropic",   label: "AI Usage",        icon: Cpu,          color: "#7C3AED", bg: "rgba(124,58,237,0.1)", group: "Platform & API" },
  { id: "markup",      label: "API Markup",      icon: DollarSign,   color: "var(--color-primary-hover)", bg: "rgba(217,119,6,0.1)",  group: "Platform & API" },
  // Security & QA
  { id: "security",    label: "Security Events", icon: Shield,       color: "#EF4444", bg: "rgba(239,68,68,0.12)", group: "Security & QA" },
  { id: "secagents",   label: "Security Agents", icon: Activity,     color: "#10B981", bg: "rgba(16,185,129,0.12)",group: "Security & QA" },
  { id: "twofa",       label: "Admin 2FA",       icon: Shield,       color: "var(--color-primary)", bg: "rgba(245,158,11,0.12)",group: "Security & QA" },
  { id: "emailpreview",label: "Email Preview",   icon: Mail,         color: "var(--color-primary-hover)", bg: "rgba(217,119,6,0.12)", group: "Security & QA" },
  { id: "aiusage",     label: "AI Usage",        icon: Cpu,          color: "#8B5CF6", bg: "rgba(139,92,246,0.12)",group: "Platform & API" },
  { id: "audit",       label: "Audit Log",       icon: BookOpen,     color: "#6366F1", bg: "rgba(99,102,241,0.1)", group: "Security & QA" },
  { id: "health",      label: "Health Check",    icon: Activity,     color: "#10B981", bg: "rgba(16,185,129,0.1)", group: "Security & QA" },
  { id: "tests",       label: "Integration Tests",icon: Bug,         color: "var(--color-primary)", bg: "rgba(245,158,11,0.1)", group: "Security & QA" },
  { id: "plantest",    label: "Plan Test Agent", icon: FlaskConical, color: "#8B5CF6", bg: "rgba(139,92,246,0.1)", group: "Security & QA" },
  { id: "restore",     label: "Restore / Backup",icon: RefreshCw,    color: "#EF4444", bg: "rgba(239,68,68,0.1)",  group: "Security & QA" },
  // Marketing Tools
  { id: "persona",     label: "Buyer Persona",   icon: Users,        color: "#EC4899", bg: "rgba(236,72,153,0.1)", group: "Marketing Tools" },
  { id: "progress",    label: "Feature Progress",icon: CheckCircle2, color: "#10B981", bg: "rgba(16,185,129,0.1)", group: "Marketing Tools" },
];

const PANEL_CONTENT: Record<PanelId, React.ReactNode> = {
  business:     <ModuleBoundary name="Business" minimal><AdminBusinessPanel /></ModuleBoundary>,
  support:      <ModuleBoundary name="Support Tickets" minimal><AdminSupportTickets /></ModuleBoundary>,
  users:        <ModuleBoundary name="Users Table" minimal><AdminUsersTable /></ModuleBoundary>,
  analytics:    <ModuleBoundary name="Analytics" minimal><div id="analytics-inner" /></ModuleBoundary>,
  testaccounts: <ModuleBoundary name="Test Accounts" minimal><AdminTestAccounts /></ModuleBoundary>,
  billing:      <ModuleBoundary name="Pricing" minimal><AdminPricingPanel /></ModuleBoundary>,
  flags:        <ModuleBoundary name="Feature Flags" minimal><AdminFeatureFlagsPanel /></ModuleBoundary>,
  discounts:    <ModuleBoundary name="Discounts" minimal><AdminDiscountCodesPanel /></ModuleBoundary>,
  tokens:       <ModuleBoundary name="Token Status" minimal><AdminTokenStatus /></ModuleBoundary>,
  platform:     <ModuleBoundary name="Platform Connect" minimal><AdminPlatformConnect /></ModuleBoundary>,
  credentials:  <ModuleBoundary name="Credentials" minimal><AdminCredentials /></ModuleBoundary>,
  anthropic:    <ModuleBoundary name="AI Usage" minimal><AdminAnthropicUsage /></ModuleBoundary>,
  markup:       <ModuleBoundary name="API Markup" minimal><AdminMarkupPanel /></ModuleBoundary>,
  security:     <ModuleBoundary name="Security Events" minimal><AdminSecurityPanel /></ModuleBoundary>,
  secagents:    <ModuleBoundary name="Security Agents" minimal><AdminSecurityAgents /></ModuleBoundary>,
  twofa:        <ModuleBoundary name="Admin 2FA" minimal><Admin2FAPanel /></ModuleBoundary>,
  emailpreview: <ModuleBoundary name="Email Preview" minimal><AdminEmailPreview /></ModuleBoundary>,
  aiusage:      <ModuleBoundary name="AI Usage" minimal><AdminAiUsage /></ModuleBoundary>,
  audit:        <ModuleBoundary name="Audit Log" minimal><AdminAuditLog /></ModuleBoundary>,
  health:       <ModuleBoundary name="Health Check" minimal><AdminHealthCheck /></ModuleBoundary>,
  tests:        <ModuleBoundary name="Integration Tests" minimal><AdminTestRunner /></ModuleBoundary>,
  plantest:     <ModuleBoundary name="Plan Test Agent" minimal><AdminPlanTestAgent /></ModuleBoundary>,
  restore:      <ModuleBoundary name="Restore" minimal><AdminRestorePanel /></ModuleBoundary>,
  persona:      <ModuleBoundary name="Buyer Persona" minimal><AdminBuyerPersona /></ModuleBoundary>,
  progress:     <ModuleBoundary name="Feature Progress" minimal><AdminFeatureProgress /></ModuleBoundary>,
};

const GROUPS = ["💼 Business", "Users & Revenue", "Billing & Plans", "Platform & API", "Security & QA", "Marketing Tools"];

// ── Modal ──────────────────────────────────────────────────────────────────────

function AdminModal({ panel, onClose }: { panel: PanelDef; onClose: () => void }) {
  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  const Icon = panel.icon;

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col"
      style={{ backgroundColor: "rgba(0,0,0,0.7)" }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      {/* Sheet — full screen on mobile, centered on desktop */}
      <GlassCard
        className="relative flex flex-col w-full md:max-w-4xl md:mx-auto md:my-6 overflow-hidden"
        rounded="md:rounded-2xl"
        padding=""
      >
        {/* Modal header */}
        <div
          className="flex items-center gap-3 px-4 py-3 shrink-0"
          style={{ borderBottom: "1px solid rgba(245,215,160,0.3)" }}
        >
          <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0" style={{ backgroundColor: panel.bg }}>
            <Icon className="w-4 h-4" style={{ color: panel.color }} />
          </div>
          <p className="font-bold text-base flex-1 text-glass-primary">{panel.label}</p>
          <GlassButton
            variant="ghost"
            size="sm"
            onClick={onClose}
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </GlassButton>
        </div>

        {/* Scrollable content */}
        <div className="flex-1 overflow-y-auto p-4 md:p-6">
          {PANEL_CONTENT[panel.id]}
        </div>
      </GlassCard>
    </div>
  );
}

// ── Main page ──────────────────────────────────────────────────────────────────

export default function AdminPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [adminAccess, setAdminAccess] = useState(false);
  const [stats, setStats] = useState({ totalUsers: 0, totalRevenue: 0, activeSubscriptions: 0, freeTrials: 0 });
  const [analyticsData, setAnalyticsData] = useState<any>(null);
  const [openPanel, setOpenPanel] = useState<PanelId | null>(null);

  const runMigrationSilently = useCallback(async () => {
    try {
      await fetch("/api/admin/run-migration", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({}) });
    } catch { /* silent */ }
  }, []);

  const fetchData = useCallback(async () => {
    try {
      const [, analyticsRes] = await Promise.all([
        fetch("/api/admin/users"),
        fetch("/api/admin/analytics?period=monthly"),
      ]);
      const analyticsData = await analyticsRes.json();

      if (analyticsData.success) {
        setAnalyticsData(analyticsData);
        const subs = analyticsData.summary.active_subscriptions;
        setStats({
          totalUsers: analyticsData.summary.total_users,
          totalRevenue: analyticsData.summary.total_revenue,
          activeSubscriptions: (subs.lite || 0) + (subs.pro || 0) + (subs.business || 0) + (subs.enterprise || 0),
          freeTrials: subs.free_test || 0,
        });
      }
    } catch { /* ignore */ }
    setLoading(false);
  }, []);

  useEffect(() => {
    const adminAuth = typeof window !== "undefined" ? localStorage.getItem("admin_authenticated") : null;
    if (!adminAuth) { router.push("/markethub973"); return; }
    setAdminAccess(true);
    fetchData();
    runMigrationSilently();
  }, [fetchData, runMigrationSilently, router]);

  const handleLogout = async () => {
    await fetch("/api/admin-auth/logout", { method: "POST" }).catch(() => {});
    localStorage.removeItem("admin_authenticated");
    router.push("/");
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 rounded-full border-2 border-amber-400 border-t-transparent animate-spin" />
          <p className="text-sm text-glass-muted">Loading admin...</p>
        </div>
      </div>
    );
  }

  if (!adminAccess) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-red-600 font-semibold">Access Denied</p>
      </div>
    );
  }

  const activePanelDef = openPanel ? PANELS.find(p => p.id === openPanel) : null;

  return (
    <div className="min-h-screen">
      {/* Top bar */}
      <div className="sticky top-0 z-40 px-4 py-3 flex items-center justify-between"
        style={{ backgroundColor: "#1C1814", borderBottom: "1px solid rgba(245,215,160,0.1)" }}>
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg flex items-center justify-center"
            style={{ background: "linear-gradient(135deg,#F59E0B,#D97706)" }}>
            <Shield className="w-4 h-4 text-white" />
          </div>
          <span className="font-bold text-sm" style={{ color: "var(--color-bg)" }}>Admin</span>
        </div>
        <GlassButton variant="danger" size="sm" onClick={handleLogout} className="flex items-center gap-1.5">
          <LogOut className="w-3.5 h-3.5" />
          Logout
        </GlassButton>
      </div>

      <div className="px-4 py-5 max-w-4xl mx-auto space-y-6">

        {/* M7 — Command Center: pulsing 3D orb with all systems aggregate */}
        <ModuleBoundary name="Command Center" minimal>
          <AdminCommandCenter />
        </ModuleBoundary>

        {/* KPI Stats */}
        <div className="grid grid-cols-2 gap-3">
          {[
            { title: "Total Users",     value: stats.totalUsers,                        icon: "👥", change: "" },
            { title: "Revenue / mo",    value: `$${stats.totalRevenue.toFixed(0)}`,     icon: "💰", change: "" },
            { title: "Active Plans",    value: stats.activeSubscriptions,               icon: "✅", change: "" },
            { title: "Starter Plans",   value: stats.freeTrials,                        icon: "🎁", change: "" },
          ].map((s) => (
            <AdminStatsCard key={s.title} title={s.title} value={s.value} change={s.change} icon={s.icon} />
          ))}
        </div>

        {/* Revenue analytics inline (small) */}
        {analyticsData && (
          <GlassCard>
            <p className="text-sm font-bold mb-3 text-glass-primary">Revenue Analytics</p>
            <AdminAnalyticsChart data={analyticsData} />
          </GlassCard>
        )}

        {/* Panel groups */}
        {GROUPS.map((group) => {
          const panels = PANELS.filter(p => p.group === group);
          return (
            <div key={group}>
              <p className="text-xs font-bold uppercase tracking-wider mb-2 px-1 text-glass-muted">{group}</p>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {panels.map((panel) => {
                  const Icon = panel.icon;
                  return (
                    <GlassCard
                      key={panel.id}
                      className="text-left transition-all active:scale-95 cursor-pointer"
                      rounded="rounded-xl"
                      padding="p-3"
                      onClick={() => setOpenPanel(panel.id)}
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
                          style={{ backgroundColor: panel.bg }}>
                          <Icon className="w-4 h-4" style={{ color: panel.color }} />
                        </div>
                        <span className="text-xs font-semibold flex-1 leading-tight text-glass-primary">
                          {panel.label}
                        </span>
                        <ChevronRight className="w-3.5 h-3.5 shrink-0 text-glass-muted" />
                      </div>
                    </GlassCard>
                  );
                })}
              </div>
            </div>
          );
        })}

        {/* Quick links */}
        <div>
          <p className="text-xs font-bold uppercase tracking-wider mb-2 px-1 text-glass-muted">Quick Links</p>
          <div className="grid grid-cols-2 gap-2">
            {[
              { href: "/dashboard/admin/cockpit", label: "🚀 Cockpit — Mission Control", icon: Activity, color: "var(--color-primary)" },
              { href: "/dashboard/engagement", label: "💬 Unified Inbox", icon: Users, color: "#E1306C" },
              { href: "/dashboard/reviews", label: "⭐ Review Management", icon: Activity, color: "var(--color-primary)" },
              { href: "/dashboard/crm", label: "📊 CRM Kanban", icon: Users, color: "#8B5CF6" },
              { href: "/dashboard/studio", label: "🎨 Content Studio", icon: Zap, color: "#FF0000" },
              { href: "/dashboard/reports", label: "📨 Reports — WA + Telegram", icon: Activity, color: "#25D366" },
              { href: "/dashboard/admin/users", label: "Users & Revenue", icon: Users, color: "#6366F1" },
              { href: "/dashboard/admin/lead-wizard", label: "Lead Wizard", icon: Zap, color: "var(--color-primary)" },
              { href: "/dashboard/admin/maintenance", label: "Maintenance Findings", icon: Activity, color: "#10B981" },
            ].map((link) => {
              const Icon = link.icon;
              return (
                <GlassCard key={link.href} className="transition-all" rounded="rounded-xl" padding="p-0">
                  <a href={link.href}
                    className="flex items-center gap-3 p-3">
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
                      style={{ backgroundColor: `${link.color}15` }}>
                      <Icon className="w-4 h-4" style={{ color: link.color }} />
                    </div>
                    <span className="text-xs font-semibold flex-1 leading-tight text-glass-primary">
                      {link.label}
                    </span>
                    <ChevronRight className="w-3.5 h-3.5 shrink-0 text-glass-muted" />
                  </a>
                </GlassCard>
              );
            })}
          </div>
        </div>

      </div>

      {/* Modal */}
      {activePanelDef && (
        <AdminModal
          panel={activePanelDef}
          onClose={() => setOpenPanel(null)}
        />
      )}
    </div>
  );
}
