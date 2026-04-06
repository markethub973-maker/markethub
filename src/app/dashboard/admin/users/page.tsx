"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  Users, DollarSign, TrendingUp, TrendingDown, Shield, ShieldOff,
  AlertTriangle, Search, Filter, RefreshCw, ChevronDown, ArrowLeft,
  Wifi, Globe, Cpu, Edit3, CheckCircle, XCircle, Server,
  CreditCard, Zap, Mail, Database,
} from "lucide-react";
import Link from "next/link";

// ── Types ─────────────────────────────────────────────────────────────────────
interface User {
  id: string;
  email: string;
  name: string;
  plan: string;
  subscription_status: string;
  trial_expires_at: string | null;
  is_admin: boolean;
  is_blocked: boolean;
  blocked_reason: string | null;
  registration_ip: string | null;
  normalized_email: string | null;
  device_fingerprint: string | null;
  tokens_used_month: number;
  monthly_revenue: number;
  ai_cost_month: number;
  net_per_user: number;
  created_at: string;
  abuse_flags: AbuseFlag[];
}

interface AbuseFlag {
  reason: string;
  severity: string;
  detected_at: string;
  resolved: boolean;
}

interface Summary {
  total_users: number;
  total_monthly_revenue: number;
  total_ai_cost_month: number;
  net_profit_month: number;
  revenue_by_plan: Record<string, { count: number; revenue: number }>;
  blocked_count: number;
  flagged_count: number;
}

interface ServiceCostItem {
  service: string;
  category: string;
  icon: string;
  plan_name: string;
  monthly_usd: number;
  billing_url: string;
  notes: string;
  dynamic?: boolean;
}

interface Finance {
  month: string;
  revenue: {
    total: number;
    by_plan: Record<string, { count: number; revenue: number }>;
    paying_users: number;
    free_users: number;
  };
  costs: {
    total: number;
    items: ServiceCostItem[];
    by_category: Record<string, { total: number; items: ServiceCostItem[] }>;
  };
  net_profit: number;
  margin_pct: number;
}

// ── Helpers ───────────────────────────────────────────────────────────────────
const PLAN_COLORS: Record<string, string> = {
  free_test:  "#78614E",
  starter:    "#3B82F6",
  lite:       "#F59E0B",
  pro:        "#8B5CF6",
  business:   "#E1306C",
  enterprise: "#16A34A",
};

const PLAN_PRICES: Record<string, number> = {
  free_test: 0, starter: 14, lite: 24, pro: 49, business: 99, enterprise: 249,
};

function planBadge(plan: string) {
  const color = PLAN_COLORS[plan] ?? "#78614E";
  return (
    <span className="text-xs font-bold px-2 py-0.5 rounded-full capitalize"
      style={{ backgroundColor: `${color}18`, color }}>
      {plan.replace("_", " ")}
    </span>
  );
}

function fmt(n: number, prefix = "$") {
  return `${prefix}${n.toFixed(2)}`;
}

function timeAgo(iso: string) {
  const d = new Date(iso);
  const diff = Date.now() - d.getTime();
  const days = Math.floor(diff / 86400000);
  if (days === 0) return "today";
  if (days === 1) return "yesterday";
  if (days < 30) return `${days}d ago`;
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function AdminUsersPage() {
  const router = useRouter();
  const [users, setUsers] = useState<User[]>([]);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [finance, setFinance] = useState<Finance | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"users" | "finance">("users");

  // Filters
  const [search, setSearch] = useState("");
  const [filterPlan, setFilterPlan] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all"); // all | blocked | flagged | active
  const [sortBy, setSortBy] = useState<"created_at" | "monthly_revenue" | "ai_cost_month">("created_at");

  // Modals
  const [actionUser, setActionUser] = useState<User | null>(null);
  const [actionType, setActionType] = useState<"block" | "unblock" | "change_plan" | null>(null);
  const [actionReason, setActionReason] = useState("");
  const [actionPlan, setActionPlan] = useState("starter");
  const [actionLoading, setActionLoading] = useState(false);

  // Edit cost modal
  const [editCost, setEditCost] = useState<ServiceCostItem | null>(null);
  const [editCostValue, setEditCostValue] = useState("");
  const [editCostLoading, setEditCostLoading] = useState(false);

  // ── Admin auth check ────────────────────────────────────────────────────────
  useEffect(() => {
    if (typeof window !== "undefined") {
      const auth = localStorage.getItem("admin_authenticated");
      if (!auth) { router.push("/markethub973"); return; }
    }
    loadData();
  }, []);

  const getAdminHeaders = () => {
    const token = typeof window !== "undefined"
      ? localStorage.getItem("admin_token") ?? ""
      : "";
    return { "Content-Type": "application/json", "x-admin-secret": token };
  };

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [usersRes, financeRes] = await Promise.all([
        fetch("/api/admin/users", { headers: getAdminHeaders() }),
        fetch("/api/admin/finance", { headers: getAdminHeaders() }),
      ]);
      const usersData  = await usersRes.json();
      const financeData = await financeRes.json();

      if (usersData.success) {
        setUsers(usersData.users);
        setSummary(usersData.summary);
      }
      if (financeData.success) {
        setFinance(financeData);
      }
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  }, []);

  // ── Actions ─────────────────────────────────────────────────────────────────
  const handleAction = async () => {
    if (!actionUser || !actionType) return;
    setActionLoading(true);
    await fetch("/api/admin/users", {
      method: "POST",
      headers: getAdminHeaders(),
      body: JSON.stringify({
        user_id: actionUser.id,
        action: actionType,
        reason: actionReason || undefined,
        plan: actionType === "change_plan" ? actionPlan : undefined,
      }),
    });
    setActionUser(null);
    setActionType(null);
    setActionReason("");
    setActionLoading(false);
    loadData();
  };

  const handleSaveCost = async () => {
    if (!editCost) return;
    setEditCostLoading(true);
    await fetch("/api/admin/finance", {
      method: "POST",
      headers: getAdminHeaders(),
      body: JSON.stringify({ service: editCost.service, monthly_usd: parseFloat(editCostValue) }),
    });
    setEditCost(null);
    setEditCostLoading(false);
    loadData();
  };

  // ── Filtered + sorted users ──────────────────────────────────────────────────
  const filtered = users
    .filter(u => {
      if (filterPlan !== "all" && u.plan !== filterPlan) return false;
      if (filterStatus === "blocked" && !u.is_blocked) return false;
      if (filterStatus === "flagged" && u.abuse_flags.length === 0) return false;
      if (filterStatus === "active" && (u.is_blocked || u.subscription_status !== "active")) return false;
      if (search) {
        const q = search.toLowerCase();
        return (
          u.email.toLowerCase().includes(q) ||
          u.name.toLowerCase().includes(q) ||
          (u.registration_ip || "").includes(q)
        );
      }
      return true;
    })
    .sort((a, b) => {
      if (sortBy === "monthly_revenue") return b.monthly_revenue - a.monthly_revenue;
      if (sortBy === "ai_cost_month") return b.ai_cost_month - a.ai_cost_month;
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: "#FFF8F0" }}>
        <RefreshCw className="w-8 h-8 animate-spin" style={{ color: "#F59E0B" }} />
      </div>
    );
  }

  return (
    <div className="min-h-screen p-6" style={{ backgroundColor: "#FFF8F0" }}>
      {/* ── Header ──────────────────────────────────────────────────────────── */}
      <div className="flex items-center gap-4 mb-6">
        <Link href="/dashboard/admin"
          className="flex items-center gap-1.5 text-sm font-medium"
          style={{ color: "#A8967E" }}>
          <ArrowLeft size={16} /> Admin Panel
        </Link>
        <div className="h-4 w-px" style={{ backgroundColor: "#D1C4B0" }} />
        <h1 className="text-2xl font-bold" style={{ color: "#292524" }}>Users & Revenue</h1>
        <button onClick={loadData} className="ml-auto p-2 rounded-lg hover:bg-amber-50">
          <RefreshCw size={16} style={{ color: "#A8967E" }} />
        </button>
      </div>

      {/* ── KPI cards ───────────────────────────────────────────────────────── */}
      {summary && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <KpiCard icon={<Users size={20} />} label="Total Users" value={String(summary.total_users)} color="#3B82F6" />
          <KpiCard icon={<DollarSign size={20} />} label="Monthly Revenue" value={`$${summary.total_monthly_revenue.toFixed(2)}`} color="#16A34A" />
          <KpiCard icon={<TrendingDown size={20} />} label="AI Cost / Month" value={`$${summary.total_ai_cost_month.toFixed(2)}`} color="#F59E0B" />
          <KpiCard icon={<TrendingUp size={20} />} label="Net Profit" value={`$${summary.net_profit_month.toFixed(2)}`}
            color={summary.net_profit_month >= 0 ? "#16A34A" : "#EF4444"} />
        </div>
      )}

      {/* ── Tabs ─────────────────────────────────────────────────────────────── */}
      <div className="flex gap-2 mb-6">
        {(["users", "finance"] as const).map(t => (
          <button key={t} onClick={() => setActiveTab(t)}
            className="px-4 py-2 rounded-xl text-sm font-semibold transition-all capitalize"
            style={{
              backgroundColor: activeTab === t ? "#F59E0B" : "rgba(245,158,11,0.08)",
              color: activeTab === t ? "#fff" : "#A8967E",
            }}>
            {t === "users" ? "👥 Users Table" : "💰 Revenue & Costs"}
          </button>
        ))}
      </div>

      {/* ══════════════════════════════════════════════════════════════════════
          TAB: USERS TABLE
      ══════════════════════════════════════════════════════════════════════ */}
      {activeTab === "users" && (
        <>
          {/* Filters */}
          <div className="flex flex-wrap gap-3 mb-4">
            <div className="relative flex-1 min-w-48">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: "#A8967E" }} />
              <input value={search} onChange={e => setSearch(e.target.value)}
                placeholder="Search email, name, IP…"
                className="w-full pl-8 pr-3 py-2 text-sm rounded-xl border outline-none"
                style={{ borderColor: "rgba(245,215,160,0.4)", backgroundColor: "#FFFCF7" }} />
            </div>
            <select value={filterPlan} onChange={e => setFilterPlan(e.target.value)}
              className="px-3 py-2 text-sm rounded-xl border outline-none"
              style={{ borderColor: "rgba(245,215,160,0.4)", backgroundColor: "#FFFCF7" }}>
              <option value="all">All Plans</option>
              {Object.keys(PLAN_PRICES).map(p => (
                <option key={p} value={p}>{p.replace("_", " ")}</option>
              ))}
            </select>
            <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}
              className="px-3 py-2 text-sm rounded-xl border outline-none"
              style={{ borderColor: "rgba(245,215,160,0.4)", backgroundColor: "#FFFCF7" }}>
              <option value="all">All Statuses</option>
              <option value="active">Active</option>
              <option value="blocked">Blocked</option>
              <option value="flagged">Flagged</option>
            </select>
            <select value={sortBy} onChange={e => setSortBy(e.target.value as any)}
              className="px-3 py-2 text-sm rounded-xl border outline-none"
              style={{ borderColor: "rgba(245,215,160,0.4)", backgroundColor: "#FFFCF7" }}>
              <option value="created_at">Newest</option>
              <option value="monthly_revenue">Revenue ↓</option>
              <option value="ai_cost_month">AI Cost ↓</option>
            </select>
          </div>

          {/* Revenue summary per plan */}
          {summary && (
            <div className="flex flex-wrap gap-2 mb-4">
              {Object.entries(summary.revenue_by_plan).map(([plan, d]) => (
                <div key={plan} className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold"
                  style={{ backgroundColor: `${PLAN_COLORS[plan] ?? "#78614E"}15`, color: PLAN_COLORS[plan] ?? "#78614E" }}>
                  {plan.replace("_", " ")}: {d.count} users · ${d.revenue}/mo
                </div>
              ))}
            </div>
          )}

          {/* Table */}
          <div className="rounded-2xl overflow-hidden" style={{ border: "1px solid rgba(245,215,160,0.25)" }}>
            <div className="overflow-x-auto">
              <table className="w-full text-sm" style={{ backgroundColor: "#FFFCF7" }}>
                <thead>
                  <tr style={{ borderBottom: "1px solid rgba(245,215,160,0.3)", backgroundColor: "rgba(245,215,160,0.1)" }}>
                    {["User", "Plan", "Status", "Revenue/mo", "AI Cost", "Net", "IP / Device", "Signed Up", "Actions"].map(h => (
                      <th key={h} className="text-left px-4 py-3 text-xs font-bold uppercase tracking-wide"
                        style={{ color: "#A8967E" }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filtered.map(u => (
                    <tr key={u.id} style={{
                      borderBottom: "1px solid rgba(245,215,160,0.15)",
                      backgroundColor: u.is_blocked ? "rgba(239,68,68,0.03)" : u.abuse_flags.length > 0 ? "rgba(245,158,11,0.03)" : undefined,
                    }}>
                      {/* User */}
                      <td className="px-4 py-3">
                        <div className="font-semibold text-xs" style={{ color: "#292524" }}>
                          {u.name || "(no name)"}
                          {u.is_admin && <span className="ml-1 text-xs px-1.5 py-0.5 rounded bg-purple-100 text-purple-700">admin</span>}
                        </div>
                        <div className="text-xs" style={{ color: "#A8967E" }}>{u.email}</div>
                        {u.normalized_email && u.normalized_email !== u.email && (
                          <div className="text-xs italic" style={{ color: "#C4AA8A" }}>→ {u.normalized_email}</div>
                        )}
                        {u.abuse_flags.length > 0 && (
                          <div className="flex items-center gap-1 mt-0.5">
                            <AlertTriangle size={10} style={{ color: "#F59E0B" }} />
                            <span className="text-xs" style={{ color: "#F59E0B" }}>{u.abuse_flags.length} flag(s)</span>
                          </div>
                        )}
                      </td>

                      {/* Plan */}
                      <td className="px-4 py-3">{planBadge(u.plan)}</td>

                      {/* Status */}
                      <td className="px-4 py-3">
                        {u.is_blocked ? (
                          <span className="flex items-center gap-1 text-xs font-medium" style={{ color: "#EF4444" }}>
                            <XCircle size={12} /> Blocked
                          </span>
                        ) : (
                          <span className="flex items-center gap-1 text-xs font-medium" style={{ color: "#16A34A" }}>
                            <CheckCircle size={12} /> {u.subscription_status || "active"}
                          </span>
                        )}
                        {u.trial_expires_at && (
                          <div className="text-xs" style={{ color: "#A8967E" }}>
                            Trial: {new Date(u.trial_expires_at).toLocaleDateString()}
                          </div>
                        )}
                      </td>

                      {/* Revenue */}
                      <td className="px-4 py-3 font-bold text-xs" style={{ color: "#16A34A" }}>
                        {u.monthly_revenue === 0 ? "—" : `$${u.monthly_revenue}`}
                      </td>

                      {/* AI cost */}
                      <td className="px-4 py-3 text-xs" style={{ color: "#F59E0B" }}>
                        {u.ai_cost_month > 0 ? `$${u.ai_cost_month.toFixed(3)}` : "—"}
                        {u.tokens_used_month > 0 && (
                          <div style={{ color: "#A8967E" }}>{u.tokens_used_month.toLocaleString()} tok</div>
                        )}
                      </td>

                      {/* Net */}
                      <td className="px-4 py-3 font-bold text-xs"
                        style={{ color: u.net_per_user >= 0 ? "#16A34A" : "#EF4444" }}>
                        {u.monthly_revenue === 0 ? "—" : fmt(u.net_per_user)}
                      </td>

                      {/* IP / Device */}
                      <td className="px-4 py-3 text-xs" style={{ color: "#A8967E" }}>
                        {u.registration_ip && (
                          <div className="flex items-center gap-1">
                            <Globe size={10} /> {u.registration_ip}
                          </div>
                        )}
                        {u.device_fingerprint && (
                          <div className="flex items-center gap-1 mt-0.5">
                            <Cpu size={10} /> {u.device_fingerprint}
                          </div>
                        )}
                      </td>

                      {/* Signed up */}
                      <td className="px-4 py-3 text-xs" style={{ color: "#A8967E" }}>
                        {timeAgo(u.created_at)}
                      </td>

                      {/* Actions */}
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1.5">
                          {u.is_blocked ? (
                            <button onClick={() => { setActionUser(u); setActionType("unblock"); }}
                              className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold transition-all"
                              style={{ backgroundColor: "rgba(22,163,74,0.1)", color: "#16A34A" }}>
                              <ShieldOff size={12} /> Unblock
                            </button>
                          ) : (
                            <button onClick={() => { setActionUser(u); setActionType("block"); }}
                              className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold transition-all"
                              style={{ backgroundColor: "rgba(239,68,68,0.1)", color: "#EF4444" }}>
                              <Shield size={12} /> Block
                            </button>
                          )}
                          <button onClick={() => { setActionUser(u); setActionType("change_plan"); setActionPlan(u.plan); }}
                            className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold transition-all"
                            style={{ backgroundColor: "rgba(139,92,246,0.1)", color: "#8B5CF6" }}>
                            <Edit3 size={12} /> Plan
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="px-4 py-2 text-xs" style={{ color: "#A8967E", borderTop: "1px solid rgba(245,215,160,0.2)" }}>
              Showing {filtered.length} of {users.length} users
            </div>
          </div>
        </>
      )}

      {/* ══════════════════════════════════════════════════════════════════════
          TAB: REVENUE & COSTS
      ══════════════════════════════════════════════════════════════════════ */}
      {activeTab === "finance" && finance && (
        <div className="space-y-6">
          {/* Top summary */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <FinCard
              label="Total Revenue" icon="💰"
              value={`$${finance.revenue.total.toFixed(2)}`}
              sub={`${finance.revenue.paying_users} paying · ${finance.revenue.free_users} free`}
              color="#16A34A" />
            <FinCard
              label="Total Costs" icon="💸"
              value={`$${finance.costs.total.toFixed(2)}`}
              sub={`${finance.costs.items.length} services`}
              color="#EF4444" />
            <FinCard
              label={finance.net_profit >= 0 ? "Net Profit" : "Net Loss"}
              icon={finance.net_profit >= 0 ? "📈" : "📉"}
              value={`$${finance.net_profit.toFixed(2)}`}
              sub={`Margin: ${finance.margin_pct}%`}
              color={finance.net_profit >= 0 ? "#16A34A" : "#EF4444"} />
          </div>

          {/* Revenue by plan */}
          <div className="rounded-2xl p-6" style={{ backgroundColor: "#FFFCF7", border: "1px solid rgba(245,215,160,0.25)" }}>
            <h3 className="font-bold mb-4" style={{ color: "#292524" }}>Revenue by Plan</h3>
            <div className="space-y-3">
              {Object.entries(finance.revenue.by_plan).map(([plan, d]) => (
                <div key={plan} className="flex items-center gap-4">
                  <div className="w-24 text-xs font-semibold" style={{ color: PLAN_COLORS[plan] ?? "#78614E" }}>
                    {plan.replace("_", " ")}
                  </div>
                  <div className="flex-1 rounded-full h-2 overflow-hidden" style={{ backgroundColor: "rgba(245,215,160,0.3)" }}>
                    <div className="h-full rounded-full transition-all"
                      style={{
                        width: finance.revenue.total > 0 ? `${(d.revenue / finance.revenue.total) * 100}%` : "0%",
                        backgroundColor: PLAN_COLORS[plan] ?? "#78614E",
                      }} />
                  </div>
                  <div className="text-xs font-bold w-16 text-right" style={{ color: "#292524" }}>${d.revenue}/mo</div>
                  <div className="text-xs w-16 text-right" style={{ color: "#A8967E" }}>{d.count} users</div>
                </div>
              ))}
            </div>
          </div>

          {/* Costs breakdown */}
          <div className="rounded-2xl p-6" style={{ backgroundColor: "#FFFCF7", border: "1px solid rgba(245,215,160,0.25)" }}>
            <h3 className="font-bold mb-4" style={{ color: "#292524" }}>Service Costs — {finance.month}</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr style={{ borderBottom: "1px solid rgba(245,215,160,0.3)" }}>
                    {["", "Service", "Plan", "Monthly Cost", "Notes", ""].map((h, i) => (
                      <th key={i} className="text-left px-3 py-2 text-xs font-bold uppercase tracking-wide"
                        style={{ color: "#A8967E" }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {finance.costs.items.map(item => (
                    <tr key={item.service} style={{ borderBottom: "1px solid rgba(245,215,160,0.1)" }}>
                      <td className="px-3 py-3 text-lg">{item.icon}</td>
                      <td className="px-3 py-3">
                        <div className="font-semibold text-xs" style={{ color: "#292524" }}>{item.service}</div>
                        <div className="text-xs" style={{ color: "#A8967E" }}>{item.category}</div>
                      </td>
                      <td className="px-3 py-3 text-xs" style={{ color: "#78716C" }}>{item.plan_name}</td>
                      <td className="px-3 py-3 font-bold text-xs"
                        style={{ color: item.monthly_usd === 0 ? "#A8967E" : "#EF4444" }}>
                        {item.monthly_usd === 0 ? "Free" : `$${item.monthly_usd.toFixed(2)}`}
                        {item.dynamic && <span className="ml-1 text-xs font-normal" style={{ color: "#A8967E" }}>(live)</span>}
                      </td>
                      <td className="px-3 py-3 text-xs" style={{ color: "#A8967E" }}>{item.notes}</td>
                      <td className="px-3 py-3">
                        <div className="flex items-center gap-2">
                          {!item.dynamic && (
                            <button onClick={() => { setEditCost(item); setEditCostValue(String(item.monthly_usd)); }}
                              className="p-1.5 rounded-lg text-xs"
                              style={{ backgroundColor: "rgba(245,158,11,0.1)", color: "#F59E0B" }}>
                              <Edit3 size={12} />
                            </button>
                          )}
                          {item.billing_url && (
                            <a href={item.billing_url} target="_blank" rel="noreferrer"
                              className="p-1.5 rounded-lg text-xs"
                              style={{ backgroundColor: "rgba(59,130,246,0.1)", color: "#3B82F6" }}>
                              <Globe size={12} />
                            </a>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}

                  {/* Total row */}
                  <tr style={{ borderTop: "2px solid rgba(245,215,160,0.4)", backgroundColor: "rgba(245,215,160,0.05)" }}>
                    <td colSpan={3} className="px-3 py-3 font-bold text-sm" style={{ color: "#292524" }}>Total Costs</td>
                    <td className="px-3 py-3 font-bold text-sm" style={{ color: "#EF4444" }}>
                      ${finance.costs.total.toFixed(2)}/mo
                    </td>
                    <td colSpan={2} />
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Profit summary */}
            <div className="mt-6 rounded-xl p-4"
              style={{
                backgroundColor: finance.net_profit >= 0 ? "rgba(22,163,74,0.07)" : "rgba(239,68,68,0.07)",
                border: `1px solid ${finance.net_profit >= 0 ? "rgba(22,163,74,0.2)" : "rgba(239,68,68,0.2)"}`,
              }}>
              <div className="flex justify-between items-center">
                <div>
                  <div className="text-xs font-semibold mb-0.5" style={{ color: "#A8967E" }}>
                    {finance.revenue.total.toFixed(2)} revenue − {finance.costs.total.toFixed(2)} costs
                  </div>
                  <div className="text-xl font-bold" style={{ color: finance.net_profit >= 0 ? "#16A34A" : "#EF4444" }}>
                    {finance.net_profit >= 0 ? "+" : ""}${finance.net_profit.toFixed(2)} net {finance.net_profit >= 0 ? "profit" : "loss"} / month
                  </div>
                </div>
                <div className="text-3xl font-black" style={{ color: finance.net_profit >= 0 ? "#16A34A" : "#EF4444" }}>
                  {finance.margin_pct}%
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Action Modal ─────────────────────────────────────────────────────── */}
      {actionUser && actionType && (
        <div className="fixed inset-0 flex items-center justify-center z-50 p-4"
          style={{ backgroundColor: "rgba(0,0,0,0.5)" }}>
          <div className="rounded-2xl p-6 w-full max-w-sm shadow-2xl" style={{ backgroundColor: "#FFFCF7" }}>
            <h3 className="font-bold text-lg mb-1" style={{ color: "#292524" }}>
              {actionType === "block" ? "Block User" : actionType === "unblock" ? "Unblock User" : "Change Plan"}
            </h3>
            <p className="text-sm mb-4" style={{ color: "#A8967E" }}>{actionUser.email}</p>

            {actionType === "block" && (
              <textarea value={actionReason} onChange={e => setActionReason(e.target.value)}
                placeholder="Reason for blocking (optional)…"
                rows={3}
                className="w-full px-3 py-2 text-sm rounded-xl border outline-none mb-4 resize-none"
                style={{ borderColor: "rgba(245,215,160,0.4)", backgroundColor: "#FFF8F0" }} />
            )}

            {actionType === "change_plan" && (
              <select value={actionPlan} onChange={e => setActionPlan(e.target.value)}
                className="w-full px-3 py-2 text-sm rounded-xl border outline-none mb-4"
                style={{ borderColor: "rgba(245,215,160,0.4)", backgroundColor: "#FFF8F0" }}>
                {Object.keys(PLAN_PRICES).map(p => (
                  <option key={p} value={p}>{p.replace("_", " ")} — ${PLAN_PRICES[p]}/mo</option>
                ))}
              </select>
            )}

            <div className="flex gap-3">
              <button onClick={() => { setActionUser(null); setActionType(null); }}
                className="flex-1 py-2 rounded-xl text-sm font-semibold"
                style={{ backgroundColor: "rgba(245,215,160,0.2)", color: "#A8967E" }}>
                Cancel
              </button>
              <button onClick={handleAction} disabled={actionLoading}
                className="flex-1 py-2 rounded-xl text-sm font-semibold text-white"
                style={{
                  backgroundColor:
                    actionType === "block" ? "#EF4444"
                    : actionType === "unblock" ? "#16A34A"
                    : "#8B5CF6",
                }}>
                {actionLoading ? "…" : actionType === "block" ? "Block" : actionType === "unblock" ? "Unblock" : "Save"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Edit Cost Modal ──────────────────────────────────────────────────── */}
      {editCost && (
        <div className="fixed inset-0 flex items-center justify-center z-50 p-4"
          style={{ backgroundColor: "rgba(0,0,0,0.5)" }}>
          <div className="rounded-2xl p-6 w-full max-w-sm shadow-2xl" style={{ backgroundColor: "#FFFCF7" }}>
            <h3 className="font-bold text-lg mb-1" style={{ color: "#292524" }}>Edit Cost</h3>
            <p className="text-sm mb-4" style={{ color: "#A8967E" }}>{editCost.service}</p>
            <div className="flex items-center gap-2 mb-4">
              <span className="text-sm font-bold" style={{ color: "#292524" }}>$</span>
              <input type="number" step="0.01" min="0" value={editCostValue}
                onChange={e => setEditCostValue(e.target.value)}
                className="flex-1 px-3 py-2 text-sm rounded-xl border outline-none"
                style={{ borderColor: "rgba(245,215,160,0.4)", backgroundColor: "#FFF8F0" }} />
              <span className="text-sm" style={{ color: "#A8967E" }}>/month</span>
            </div>
            <div className="flex gap-3">
              <button onClick={() => setEditCost(null)}
                className="flex-1 py-2 rounded-xl text-sm font-semibold"
                style={{ backgroundColor: "rgba(245,215,160,0.2)", color: "#A8967E" }}>
                Cancel
              </button>
              <button onClick={handleSaveCost} disabled={editCostLoading}
                className="flex-1 py-2 rounded-xl text-sm font-semibold text-white"
                style={{ backgroundColor: "#F59E0B" }}>
                {editCostLoading ? "…" : "Save"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Sub-components ────────────────────────────────────────────────────────────
function KpiCard({ icon, label, value, color }: { icon: React.ReactNode; label: string; value: string; color: string }) {
  return (
    <div className="rounded-2xl p-5" style={{ backgroundColor: "#FFFCF7", border: "1px solid rgba(245,215,160,0.25)" }}>
      <div className="flex items-center gap-2 mb-2">
        <div className="w-8 h-8 rounded-lg flex items-center justify-center"
          style={{ backgroundColor: `${color}15`, color }}>
          {icon}
        </div>
        <span className="text-xs font-semibold" style={{ color: "#A8967E" }}>{label}</span>
      </div>
      <div className="text-2xl font-black" style={{ color }}>{value}</div>
    </div>
  );
}

function FinCard({ icon, label, value, sub, color }: { icon: string; label: string; value: string; sub: string; color: string }) {
  return (
    <div className="rounded-2xl p-6" style={{ backgroundColor: "#FFFCF7", border: "1px solid rgba(245,215,160,0.25)" }}>
      <div className="text-2xl mb-2">{icon}</div>
      <div className="text-xs font-semibold mb-1" style={{ color: "#A8967E" }}>{label}</div>
      <div className="text-3xl font-black mb-1" style={{ color }}>{value}</div>
      <div className="text-xs" style={{ color: "#A8967E" }}>{sub}</div>
    </div>
  );
}
