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
import { ChevronDown, AlertTriangle, AlertCircle, CheckCircle2, RefreshCw, Shield, MessageCircle, Brain, Zap } from "lucide-react";

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

// B — Subsystems pulse from /api/admin/platform-pulse
interface PulseSection {
  status: "ok" | "warning" | "critical";
}
interface Pulse {
  security_agents: PulseSection & { ok: number; stale: number; missing: number; total: number };
  support_tickets: PulseSection & { open: number; escalated: number; resolved_24h: number; total: number };
  learning_db: PulseSection & { total: number; new_7d: number };
  automations: PulseSection & { templates: number; runs_24h: number; runs_failed_24h: number };
}

const STATUS_CONFIG = {
  ok:       { color: "#10B981", glow: "rgba(16,185,129,0.4)",  label: "ALL SYSTEMS GO",      pulse: false, icon: CheckCircle2 },
  warning:  { color: "var(--color-primary)", glow: "rgba(245,158,11,0.4)",  label: "ATTENTION REQUIRED",  pulse: true,  icon: AlertTriangle },
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
  const [pulse, setPulse] = useState<Pulse | null>(null);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const fetchStatus = useCallback(async () => {
    try {
      const [costRes, pulseRes] = await Promise.all([
        fetch("/api/cost-monitor/status", { cache: "no-store" }),
        fetch("/api/admin/platform-pulse", { cache: "no-store" }),
      ]);
      if (costRes.ok) setStatus(await costRes.json());
      if (pulseRes.ok) {
        const p = await pulseRes.json();
        if (p?.ok && p?.pulse) setPulse(p.pulse as Pulse);
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
      <div className="rounded-2xl p-6 flex items-center justify-center" style={{ backgroundColor: "var(--color-bg-secondary)", border: "1px solid rgba(245,215,160,0.25)" }}>
        <div className="w-6 h-6 rounded-full border-2 border-amber-400 border-t-transparent animate-spin" />
      </div>
    );
  }

  if (!status) {
    return (
      <div className="rounded-2xl p-6 text-center" style={{ backgroundColor: "var(--color-bg-secondary)", border: "1px dashed rgba(239,68,68,0.3)" }}>
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
          <p className="text-base font-bold mt-0.5" style={{ color: "var(--color-bg)" }}>
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
          {/* B — Subsystems pulse strip (4 mini-cards) */}
          {pulse && (
            <div
              className="px-5 py-4 grid grid-cols-2 md:grid-cols-4 gap-3"
              style={{ backgroundColor: "rgba(245,215,160,0.04)", borderBottom: "1px solid rgba(245,215,160,0.1)" }}
            >
              {([
                {
                  key: "security",
                  label: "Security Agents",
                  Icon: Shield,
                  href: "/dashboard/admin#secagents",
                  status: pulse.security_agents.status,
                  primary: `${pulse.security_agents.ok}/${pulse.security_agents.total}`,
                  sub: pulse.security_agents.stale + pulse.security_agents.missing > 0
                    ? `${pulse.security_agents.stale + pulse.security_agents.missing} stale`
                    : "all live",
                },
                {
                  key: "support",
                  label: "Support Tickets",
                  Icon: MessageCircle,
                  href: "/dashboard/admin#support",
                  status: pulse.support_tickets.status,
                  primary: `${pulse.support_tickets.open}`,
                  sub: pulse.support_tickets.escalated > 0
                    ? `${pulse.support_tickets.escalated} escalated`
                    : `${pulse.support_tickets.resolved_24h} resolved 24h`,
                },
                {
                  key: "learning",
                  label: "Learning DB",
                  Icon: Brain,
                  href: "/dashboard/admin",
                  status: pulse.learning_db.status,
                  primary: `${pulse.learning_db.total}`,
                  sub: pulse.learning_db.new_7d > 0 ? `+${pulse.learning_db.new_7d} this week` : "no new this week",
                },
                {
                  key: "automations",
                  label: "Automations",
                  Icon: Zap,
                  href: "/dashboard/automations",
                  status: pulse.automations.status,
                  primary: `${pulse.automations.templates}`,
                  sub: pulse.automations.runs_24h > 0
                    ? `${pulse.automations.runs_24h} runs 24h${pulse.automations.runs_failed_24h > 0 ? ` · ${pulse.automations.runs_failed_24h} failed` : ""}`
                    : "no runs 24h",
                },
              ] as const).map((card) => {
                const c = STATUS_CONFIG[card.status];
                return (
                  <a
                    key={card.key}
                    href={card.href}
                    className="rounded-lg p-3 transition-all hover:scale-[1.02]"
                    style={{
                      backgroundColor: "rgba(0,0,0,0.3)",
                      border: `1px solid ${c.color}33`,
                    }}
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <card.Icon className="w-4 h-4" style={{ color: c.color }} />
                      <p className="text-[10px] font-bold uppercase tracking-wider" style={{ color: "#A8967E" }}>
                        {card.label}
                      </p>
                    </div>
                    <p className="text-2xl font-bold leading-none" style={{ color: c.color }}>
                      {card.primary}
                    </p>
                    <p className="text-[10px] mt-1" style={{ color: "#A8967E" }}>
                      {card.sub}
                    </p>
                  </a>
                );
              })}
            </div>
          )}

          {/* Recent alerts strip */}
          {status.recent_alerts.length > 0 && (
            <div className="px-5 py-3" style={{ backgroundColor: "rgba(239,68,68,0.06)", borderBottom: "1px solid rgba(239,68,68,0.2)" }}>
              <p className="text-xs font-bold uppercase tracking-wider mb-2" style={{ color: "#EF4444" }}>
                ⚠ Recent Alerts (last 7 days)
              </p>
              <div className="space-y-1.5">
                {status.recent_alerts.slice(0, 5).map((a) => (
                  <div key={a.id} className="text-xs" style={{ color: "var(--color-bg)" }}>
                    <span style={{ color: a.threshold === "95" ? "#EF4444" : "var(--color-primary)" }}>●</span>{" "}
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
                          <span className="text-sm font-semibold" style={{ color: "var(--color-bg)" }}>
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
                            <span style={{ color: r.projection_days < 7 ? "#EF4444" : "var(--color-primary)" }}>
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
            <a href="/dashboard/admin/cockpit" className="font-semibold hover:underline" style={{ color: "var(--color-primary)" }}>
              Open full Cockpit →
            </a>
          </div>
        </div>
      )}
    </div>
  );
}
