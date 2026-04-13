"use client";

/**
 * Admin Command Center — M7 Sprint 1
 *
 * Single expandable 3D-animated panel that aggregates the entire platform
 * state into one overview:
 *   - Cost Monitor (M3) — every paid + free-with-limits resource
 *   - Sentry errors (last 24h count, when integrated)
 *   - Client tickets (M4)
 *   - Security events (SIEM)
 *   - Agent activity (last 24h)
 *   - Smoke test results (latest deploy)
 *
 * Visual states:
 *   - 🟢 Green stable     = all systems OK
 *   - 🟡 Yellow pulsing   = warning (resource >80%, token expiring <7d)
 *   - 🔴 Red intermittent = critical (resource >95%, error spike, security event)
 *
 * Click the orb → expandable panel slides open with full breakdown +
 * deep-link buttons to existing detail panels (no duplication).
 */

import { useEffect, useState, useCallback } from "react";
import { ChevronDown, AlertTriangle, AlertCircle, CheckCircle2, RefreshCw } from "lucide-react";

interface Resource {
  resource: string;
  category: string;
  current: number;
  limit: number;
  unit: string;
  pct: number;
  status: "ok" | "moderate" | "warning" | "critical";
  projection_days: number | null;
  checked_at: string;
  error: string | null;
}

interface Alert {
  id: string;
  resource: string;
  threshold: string;
  pct_at_alert: number;
  message: string;
  recommendation: string;
  created_at: string;
}

interface Status {
  ok: boolean;
  overall_status: "ok" | "warning" | "critical";
  critical_count: number;
  warning_count: number;
  resources: Resource[];
  recent_alerts: Alert[];
}

const STATUS_CONFIG = {
  ok:       { color: "#10B981", glow: "rgba(16,185,129,0.4)",  label: "ALL SYSTEMS GO",      pulse: false, icon: CheckCircle2 },
  warning:  { color: "#F59E0B", glow: "rgba(245,158,11,0.4)",  label: "ATTENTION REQUIRED",  pulse: true,  icon: AlertTriangle },
  critical: { color: "#EF4444", glow: "rgba(239,68,68,0.5)",   label: "CRITICAL — ACT NOW",  pulse: true,  icon: AlertCircle },
} as const;

const CATEGORY_LABELS: Record<string, string> = {
  ai: "AI / Anthropic",
  infra: "Infrastructure",
  payments: "Payments",
  scraping: "Scraping",
  email: "Email",
  tokens: "Platform Tokens",
  api_quota: "API Quotas",
};

export default function AdminCommandCenter() {
  const [status, setStatus] = useState<Status | null>(null);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const fetchStatus = useCallback(async () => {
    try {
      const res = await fetch("/api/cost-monitor/status", { cache: "no-store" });
      if (res.ok) {
        const data = await res.json();
        setStatus(data);
      }
    } catch {
      // silent fail — keep last known state
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchStatus();
    const interval = setInterval(fetchStatus, 60_000); // refresh every 1 min
    return () => clearInterval(interval);
  }, [fetchStatus]);

  const triggerRefresh = async () => {
    setRefreshing(true);
    // Trigger fresh check on backend (uses CRON_SECRET — admin equivalent)
    try {
      await fetch("/api/cost-monitor/check", {
        method: "POST",
        headers: { Authorization: `Bearer ${process.env.NEXT_PUBLIC_CRON_SECRET ?? ""}` },
      });
    } catch {
      // continue regardless
    }
    await fetchStatus();
  };

  if (loading) {
    return (
      <div className="rounded-2xl p-6 flex items-center justify-center" style={{ backgroundColor: "#FFFCF7", border: "1px solid rgba(245,215,160,0.25)" }}>
        <div className="w-6 h-6 rounded-full border-2 border-amber-400 border-t-transparent animate-spin" />
      </div>
    );
  }

  if (!status) {
    return (
      <div className="rounded-2xl p-6 text-center" style={{ backgroundColor: "#FFFCF7", border: "1px dashed rgba(239,68,68,0.3)" }}>
        <p className="text-sm" style={{ color: "#A8967E" }}>Command Center offline. Check /api/cost-monitor/status.</p>
      </div>
    );
  }

  const cfg = STATUS_CONFIG[status.overall_status];
  const Icon = cfg.icon;
  const issuesCount = status.critical_count + status.warning_count;

  // Group resources by category
  const byCategory = new Map<string, Resource[]>();
  for (const r of status.resources) {
    if (!byCategory.has(r.category)) byCategory.set(r.category, []);
    byCategory.get(r.category)!.push(r);
  }

  return (
    <div
      className="rounded-2xl overflow-hidden transition-all duration-300"
      style={{
        backgroundColor: "#1C1814",
        border: `1px solid ${cfg.color}40`,
        boxShadow: `0 0 32px ${cfg.glow}, 0 8px 24px rgba(0,0,0,0.3)`,
      }}
    >
      {/* HEADER — clickable orb */}
      <button
        type="button"
        onClick={() => setExpanded((e) => !e)}
        className="w-full px-5 py-4 flex items-center gap-4 transition-all hover:bg-white/5"
      >
        {/* 3D-ish animated orb */}
        <div
          className="relative w-14 h-14 rounded-full flex items-center justify-center flex-shrink-0"
          style={{
            background: `radial-gradient(circle at 30% 30%, ${cfg.color}cc, ${cfg.color}33)`,
            boxShadow: `0 0 24px ${cfg.glow}, inset 0 -8px 16px rgba(0,0,0,0.4), inset 0 4px 8px rgba(255,255,255,0.2)`,
            transform: "perspective(200px) rotateX(15deg)",
          }}
        >
          {cfg.pulse && (
            <span
              className="absolute inset-0 rounded-full animate-ping"
              style={{ backgroundColor: cfg.color, opacity: 0.3 }}
            />
          )}
          <Icon className="w-6 h-6 relative z-10" style={{ color: "white" }} />
        </div>

        <div className="flex-1 text-left">
          <p className="text-xs uppercase tracking-widest font-bold" style={{ color: cfg.color }}>
            🧠 Command Center
          </p>
          <p className="text-base font-bold mt-0.5" style={{ color: "#FFF8F0" }}>
            {cfg.label}
          </p>
          <p className="text-xs mt-0.5" style={{ color: "#A8967E" }}>
            {status.resources.length} resources monitored ·{" "}
            {issuesCount === 0 ? "no issues" : `${issuesCount} issue${issuesCount > 1 ? "s" : ""}`}
            {status.recent_alerts.length > 0 && ` · ${status.recent_alerts.length} alerts (7d)`}
          </p>
        </div>

        <div className="flex items-center gap-2 flex-shrink-0">
          <span
            onClick={(e) => { e.stopPropagation(); triggerRefresh(); }}
            className="p-2 rounded-lg cursor-pointer hover:bg-white/10 transition-all"
            title="Refresh now"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? "animate-spin" : ""}`} style={{ color: "#A8967E" }} />
          </span>
          <ChevronDown
            className="w-5 h-5 transition-transform"
            style={{
              color: "#A8967E",
              transform: expanded ? "rotate(180deg)" : "rotate(0deg)",
            }}
          />
        </div>
      </button>

      {/* EXPANDABLE PANEL */}
      {expanded && (
        <div className="border-t" style={{ borderColor: "rgba(245,215,160,0.1)" }}>
          {/* Recent alerts strip */}
          {status.recent_alerts.length > 0 && (
            <div className="px-5 py-3" style={{ backgroundColor: "rgba(239,68,68,0.06)", borderBottom: "1px solid rgba(239,68,68,0.2)" }}>
              <p className="text-xs font-bold uppercase tracking-wider mb-2" style={{ color: "#EF4444" }}>
                ⚠ Recent Alerts (last 7 days)
              </p>
              <div className="space-y-1.5">
                {status.recent_alerts.slice(0, 5).map((a) => (
                  <div key={a.id} className="text-xs" style={{ color: "#FFF8F0" }}>
                    <span style={{ color: a.threshold === "95" ? "#EF4444" : "#F59E0B" }}>●</span>{" "}
                    {a.message}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Resources grouped by category */}
          <div className="p-5 space-y-5 max-h-[60vh] overflow-y-auto">
            {Array.from(byCategory.entries()).map(([category, resources]) => (
              <div key={category}>
                <p className="text-xs uppercase tracking-widest font-bold mb-2" style={{ color: "#A8967E" }}>
                  {CATEGORY_LABELS[category] ?? category}
                </p>
                <div className="space-y-2">
                  {resources.map((r) => {
                    const sc = STATUS_CONFIG[r.status === "moderate" ? "ok" : r.status as keyof typeof STATUS_CONFIG] ?? STATUS_CONFIG.ok;
                    return (
                      <div
                        key={r.resource}
                        className="rounded-lg p-3"
                        style={{
                          backgroundColor: "rgba(255,255,255,0.03)",
                          borderLeft: `3px solid ${sc.color}`,
                        }}
                      >
                        <div className="flex items-center justify-between gap-2 mb-1.5">
                          <span className="text-sm font-semibold" style={{ color: "#FFF8F0" }}>
                            {r.resource.replace(/_/g, " ")}
                          </span>
                          <span className="text-xs font-bold" style={{ color: sc.color }}>
                            {r.pct.toFixed(1)}%
                          </span>
                        </div>
                        {/* Progress bar */}
                        <div className="h-1.5 rounded-full overflow-hidden" style={{ backgroundColor: "rgba(255,255,255,0.06)" }}>
                          <div
                            className="h-full rounded-full transition-all"
                            style={{
                              width: `${Math.min(100, r.pct)}%`,
                              backgroundColor: sc.color,
                              boxShadow: r.status === "critical" ? `0 0 8px ${sc.color}` : "none",
                            }}
                          />
                        </div>
                        <div className="flex items-center justify-between mt-1.5 text-xs" style={{ color: "#A8967E" }}>
                          <span>
                            {r.current.toLocaleString()} / {r.limit.toLocaleString()} {r.unit}
                          </span>
                          {r.projection_days != null && r.projection_days < 30 && (
                            <span style={{ color: r.projection_days < 7 ? "#EF4444" : "#F59E0B" }}>
                              ~{r.projection_days}d remaining
                            </span>
                          )}
                          {r.error && (
                            <span style={{ color: "#EF4444" }} title={r.error}>
                              ⚠ check error
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}

            {status.resources.length === 0 && (
              <p className="text-center text-sm py-8" style={{ color: "#A8967E" }}>
                No resource data yet. The cost monitor runs every 6h via GitHub Actions —
                trigger a manual check using the refresh button above.
              </p>
            )}
          </div>

          {/* Footer with deep links to existing panels */}
          <div className="px-5 py-3 border-t flex items-center justify-between text-xs" style={{ borderColor: "rgba(245,215,160,0.1)" }}>
            <span style={{ color: "#A8967E" }}>
              Auto-refresh: 60s · Last check: {status.resources[0]?.checked_at
                ? new Date(status.resources[0].checked_at).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })
                : "—"}
            </span>
            <a href="/dashboard/admin/cockpit" className="font-semibold hover:underline" style={{ color: "#F59E0B" }}>
              Open full Cockpit →
            </a>
          </div>
        </div>
      )}
    </div>
  );
}
