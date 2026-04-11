"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  LogOut, Users, DollarSign, CheckCircle2, X,
  Key, Shield, FlaskConical, BarChart3, Tag, Cpu,
  Zap, Settings, Bug, RefreshCw, BookOpen, Link2,
  Activity, ChevronRight,
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
import { ModuleBoundary } from "@/components/ModuleBoundary";

// ── Panel definitions ──────────────────────────────────────────────────────────

type PanelId =
  | "users" | "analytics" | "billing" | "flags" | "discounts"
  | "tokens" | "platform" | "credentials" | "anthropic" | "markup"
  | "audit" | "health" | "tests" | "plantest" | "restore"
  | "persona" | "progress" | "testaccounts" | "business" | "security";

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
  { id: "business", label: "Administrare Business", icon: Shield, color: "#F59E0B", bg: "rgba(245,158,11,0.15)", group: "💼 Business" },
  // Users & Revenue
  { id: "users",       label: "Users",           icon: Users,        color: "#6366F1", bg: "rgba(99,102,241,0.1)",  group: "Users & Revenue" },
  { id: "analytics",   label: "Revenue Chart",   icon: BarChart3,    color: "#10B981", bg: "rgba(16,185,129,0.1)", group: "Users & Revenue" },
  { id: "testaccounts",label: "Test Accounts",   icon: FlaskConical, color: "#8B5CF6", bg: "rgba(139,92,246,0.1)", group: "Users & Revenue" },
  // Billing & Plans
  { id: "billing",     label: "Pricing",         icon: DollarSign,   color: "#F59E0B", bg: "rgba(245,158,11,0.1)", group: "Billing & Plans" },
  { id: "flags",       label: "Feature Flags",   icon: Zap,          color: "#F59E0B", bg: "rgba(245,158,11,0.1)", group: "Billing & Plans" },
  { id: "discounts",   label: "Discount Codes",  icon: Tag,          color: "#EF4444", bg: "rgba(239,68,68,0.1)",  group: "Billing & Plans" },
  // Platform & API
  { id: "tokens",      label: "API Tokens",      icon: Key,          color: "#0EA5E9", bg: "rgba(14,165,233,0.1)", group: "Platform & API" },
  { id: "platform",    label: "Platform Connect", icon: Link2,       color: "#0EA5E9", bg: "rgba(14,165,233,0.1)", group: "Platform & API" },
  { id: "credentials", label: "Credentials",     icon: Settings,     color: "#64748B", bg: "rgba(100,116,139,0.1)",group: "Platform & API" },
  { id: "anthropic",   label: "AI Usage",        icon: Cpu,          color: "#7C3AED", bg: "rgba(124,58,237,0.1)", group: "Platform & API" },
  { id: "markup",      label: "API Markup",      icon: DollarSign,   color: "#D97706", bg: "rgba(217,119,6,0.1)",  group: "Platform & API" },
  // Security & QA
  { id: "security",    label: "Security Events", icon: Shield,       color: "#EF4444", bg: "rgba(239,68,68,0.12)", group: "Security & QA" },
  { id: "audit",       label: "Audit Log",       icon: BookOpen,     color: "#6366F1", bg: "rgba(99,102,241,0.1)", group: "Security & QA" },
  { id: "health",      label: "Health Check",    icon: Activity,     color: "#10B981", bg: "rgba(16,185,129,0.1)", group: "Security & QA" },
  { id: "tests",       label: "Integration Tests",icon: Bug,         color: "#F59E0B", bg: "rgba(245,158,11,0.1)", group: "Security & QA" },
  { id: "plantest",    label: "Plan Test Agent", icon: FlaskConical, color: "#8B5CF6", bg: "rgba(139,92,246,0.1)", group: "Security & QA" },
  { id: "restore",     label: "Restore / Backup",icon: RefreshCw,    color: "#EF4444", bg: "rgba(239,68,68,0.1)",  group: "Security & QA" },
  // Marketing Tools
  { id: "persona",     label: "Buyer Persona",   icon: Users,        color: "#EC4899", bg: "rgba(236,72,153,0.1)", group: "Marketing Tools" },
  { id: "progress",    label: "Feature Progress",icon: CheckCircle2, color: "#10B981", bg: "rgba(16,185,129,0.1)", group: "Marketing Tools" },
];

const PANEL_CONTENT: Record<PanelId, React.ReactNode> = {
  business:     <ModuleBoundary name="Business" minimal><AdminBusinessPanel /></ModuleBoundary>,
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
      <div
        className="relative flex flex-col w-full md:max-w-4xl md:mx-auto md:my-6 md:rounded-2xl overflow-hidden"
        style={{
          backgroundColor: "#FFFCF7",
          flex: 1,
          maxHeight: "100dvh",
        }}
      >
        {/* Modal header */}
        <div
          className="flex items-center gap-3 px-4 py-3 shrink-0"
          style={{ borderBottom: "1px solid rgba(245,215,160,0.3)", backgroundColor: "#FFF8F0" }}
        >
          <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0" style={{ backgroundColor: panel.bg }}>
            <Icon className="w-4 h-4" style={{ color: panel.color }} />
          </div>
          <p className="font-bold text-base flex-1" style={{ color: "#292524" }}>{panel.label}</p>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg transition-colors"
            style={{ color: "#78614E" }}
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable content */}
        <div className="flex-1 overflow-y-auto p-4 md:p-6">
          {PANEL_CONTENT[panel.id]}
        </div>
      </div>
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
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: "#FAFAF8" }}>
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 rounded-full border-2 border-amber-400 border-t-transparent animate-spin" />
          <p className="text-sm" style={{ color: "#78614E" }}>Loading admin...</p>
        </div>
      </div>
    );
  }

  if (!adminAccess) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: "#FAFAF8" }}>
        <p className="text-red-600 font-semibold">Access Denied</p>
      </div>
    );
  }

  const activePanelDef = openPanel ? PANELS.find(p => p.id === openPanel) : null;

  return (
    <div className="min-h-screen" style={{ backgroundColor: "#FAFAF8" }}>
      {/* Top bar */}
      <div className="sticky top-0 z-40 px-4 py-3 flex items-center justify-between"
        style={{ backgroundColor: "#1C1814", borderBottom: "1px solid rgba(245,215,160,0.1)" }}>
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg flex items-center justify-center"
            style={{ background: "linear-gradient(135deg,#F59E0B,#D97706)" }}>
            <Shield className="w-4 h-4 text-white" />
          </div>
          <span className="font-bold text-sm" style={{ color: "#FFF8F0" }}>Admin</span>
        </div>
        <button onClick={handleLogout}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium"
          style={{ backgroundColor: "rgba(239,68,68,0.15)", color: "#EF4444" }}>
          <LogOut className="w-3.5 h-3.5" />
          Logout
        </button>
      </div>

      <div className="px-4 py-5 max-w-4xl mx-auto space-y-6">

        {/* KPI Stats */}
        <div className="grid grid-cols-2 gap-3">
          {[
            { title: "Total Users",     value: stats.totalUsers,                        icon: "👥", change: "" },
            { title: "Revenue / mo",    value: `$${stats.totalRevenue.toFixed(0)}`,     icon: "💰", change: "" },
            { title: "Active Plans",    value: stats.activeSubscriptions,               icon: "✅", change: "" },
            { title: "Free Trials",     value: stats.freeTrials,                        icon: "🎁", change: "" },
          ].map((s) => (
            <AdminStatsCard key={s.title} title={s.title} value={s.value} change={s.change} icon={s.icon} />
          ))}
        </div>

        {/* Revenue analytics inline (small) */}
        {analyticsData && (
          <div className="rounded-2xl p-4" style={{ backgroundColor: "#FFFCF7", border: "1px solid rgba(245,215,160,0.25)" }}>
            <p className="text-sm font-bold mb-3" style={{ color: "#292524" }}>Revenue Analytics</p>
            <AdminAnalyticsChart data={analyticsData} />
          </div>
        )}

        {/* Panel groups */}
        {GROUPS.map((group) => {
          const panels = PANELS.filter(p => p.group === group);
          return (
            <div key={group}>
              <p className="text-xs font-bold uppercase tracking-wider mb-2 px-1" style={{ color: "#A8967E" }}>{group}</p>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {panels.map((panel) => {
                  const Icon = panel.icon;
                  return (
                    <button
                      key={panel.id}
                      onClick={() => setOpenPanel(panel.id)}
                      className="flex items-center gap-3 p-3 rounded-xl text-left transition-all active:scale-95"
                      style={{
                        backgroundColor: "#FFFCF7",
                        border: "1px solid rgba(245,215,160,0.25)",
                        boxShadow: "0 1px 3px rgba(120,97,78,0.06)",
                      }}
                    >
                      <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
                        style={{ backgroundColor: panel.bg }}>
                        <Icon className="w-4 h-4" style={{ color: panel.color }} />
                      </div>
                      <span className="text-xs font-semibold flex-1 leading-tight" style={{ color: "#292524" }}>
                        {panel.label}
                      </span>
                      <ChevronRight className="w-3.5 h-3.5 shrink-0" style={{ color: "#C4AA8A" }} />
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}

        {/* Quick links */}
        <div>
          <p className="text-xs font-bold uppercase tracking-wider mb-2 px-1" style={{ color: "#A8967E" }}>Quick Links</p>
          <div className="grid grid-cols-2 gap-2">
            {[
              { href: "/dashboard/admin/cockpit", label: "🚀 Cockpit — Mission Control", icon: Activity, color: "#F59E0B" },
              { href: "/dashboard/engagement", label: "💬 Unified Inbox", icon: Users, color: "#E1306C" },
              { href: "/dashboard/reviews", label: "⭐ Review Management", icon: Activity, color: "#F59E0B" },
              { href: "/dashboard/crm", label: "📊 CRM Kanban", icon: Users, color: "#8B5CF6" },
              { href: "/dashboard/admin/users", label: "Users & Revenue", icon: Users, color: "#6366F1" },
              { href: "/dashboard/admin/lead-wizard", label: "Lead Wizard", icon: Zap, color: "#F59E0B" },
              { href: "/dashboard/admin/maintenance", label: "Maintenance Findings", icon: Activity, color: "#10B981" },
            ].map((link) => {
              const Icon = link.icon;
              return (
                <a key={link.href} href={link.href}
                  className="flex items-center gap-3 p-3 rounded-xl transition-all"
                  style={{ backgroundColor: "#FFFCF7", border: "1px solid rgba(245,215,160,0.25)" }}>
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
                    style={{ backgroundColor: `${link.color}15` }}>
                    <Icon className="w-4 h-4" style={{ color: link.color }} />
                  </div>
                  <span className="text-xs font-semibold flex-1 leading-tight" style={{ color: "#292524" }}>
                    {link.label}
                  </span>
                  <ChevronRight className="w-3.5 h-3.5 shrink-0" style={{ color: "#C4AA8A" }} />
                </a>
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
