"use client";

/**
 * Admin AI Usage panel — cost visibility across all AI features.
 * Pulls from /api/admin/ai-usage (30-day window, refreshed every 60s).
 */

import { useCallback, useEffect, useState } from "react";
import { Cpu, Image as ImageIcon, Film, Zap, MessageCircle, RefreshCw, Loader2, TrendingUp } from "lucide-react";

interface FeatureStats {
  feature: string;
  runs_30d: number;
  runs_24h: number;
  cost_usd_30d: number;
  cost_usd_24h: number;
  failure_rate_30d: number;
  avg_duration_ms: number | null;
}

interface TopUser {
  user_id: string;
  email: string | null;
  runs: number;
  image_cost_usd: number;
  video_cost_usd: number;
  total_cost_usd: number;
}

interface Summary {
  total_cost_usd_30d: number;
  total_cost_usd_24h: number;
  total_runs_30d: number;
  generated_at: string;
}

interface TrendPoint { hour: string; cost_usd: number; }

const FEATURE_CONFIG: Record<string, { icon: React.ElementType; color: string; label: string }> = {
  image:      { icon: ImageIcon,    color: "#8B5CF6", label: "AI Image" },
  video:      { icon: Film,         color: "#EC4899", label: "AI Video" },
  automation: { icon: Zap,          color: "var(--color-primary)", label: "Automations" },
  consultant: { icon: MessageCircle, color: "#10B981", label: "Consultant" },
};

export default function AdminAiUsage() {
  const [summary, setSummary] = useState<Summary | null>(null);
  const [features, setFeatures] = useState<FeatureStats[]>([]);
  const [topUsers, setTopUsers] = useState<TopUser[]>([]);
  const [trend, setTrend] = useState<TrendPoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    setRefreshing(true);
    try {
      const res = await fetch("/api/admin/ai-usage", { cache: "no-store" });
      if (res.ok) {
        const d = await res.json();
        if (d.ok) {
          setSummary(d.summary);
          setFeatures(d.features ?? []);
          setTopUsers(d.top_users ?? []);
          setTrend(d.trend ?? []);
        }
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    load();
    const id = setInterval(load, 60_000);
    return () => clearInterval(id);
  }, [load]);

  // Max trend value for bar chart
  const maxTrendCost = trend.reduce((m, p) => Math.max(m, p.cost_usd), 0);

  if (loading && !summary) {
    return (
      <div className="py-8 text-center">
        <Loader2 className="w-5 h-5 animate-spin inline" style={{ color: "#A8967E" }} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Summary banner */}
      <div
        className="rounded-xl p-5 flex items-center gap-4"
        style={{
          background: "linear-gradient(135deg, rgba(245,158,11,0.08), rgba(139,92,246,0.08))",
          border: "1px solid rgba(245,158,11,0.2)",
        }}
      >
        <div
          className="w-12 h-12 rounded-xl flex items-center justify-center"
          style={{ backgroundColor: "rgba(245,158,11,0.15)", color: "var(--color-primary)" }}
        >
          <Cpu className="w-6 h-6" />
        </div>
        <div className="flex-1">
          <p className="text-[10px] font-bold uppercase tracking-wider" style={{ color: "#78614E" }}>
            Last 30 days
          </p>
          <p className="text-2xl font-bold" style={{ color: "var(--color-text)" }}>
            ${summary?.total_cost_usd_30d.toFixed(2)} AI spend
          </p>
          <p className="text-xs mt-1" style={{ color: "#78614E" }}>
            {summary?.total_runs_30d.toLocaleString()} runs · ${summary?.total_cost_usd_24h.toFixed(2)} last 24h
          </p>
        </div>
        <button
          type="button"
          onClick={load}
          disabled={refreshing}
          className="p-2 rounded-lg disabled:opacity-40"
          style={{ backgroundColor: "white", color: "var(--color-primary)" }}
          aria-label="Refresh"
        >
          <RefreshCw className={`w-4 h-4 ${refreshing ? "animate-spin" : ""}`} />
        </button>
      </div>

      {/* Feature breakdown */}
      <div>
        <h3 className="text-xs font-bold uppercase tracking-wider mb-2" style={{ color: "#78614E" }}>
          Per feature
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {features.map((f) => {
            const cfg = FEATURE_CONFIG[f.feature] ?? {
              icon: Cpu,
              color: "#78614E",
              label: f.feature,
            };
            return (
              <div
                key={f.feature}
                className="rounded-xl p-4"
                style={{ backgroundColor: "white", border: "1px solid rgba(0,0,0,0.06)" }}
              >
                <div className="flex items-center gap-3 mb-3">
                  <div
                    className="w-8 h-8 rounded-lg flex items-center justify-center"
                    style={{ backgroundColor: `${cfg.color}14`, color: cfg.color }}
                  >
                    <cfg.icon className="w-4 h-4" />
                  </div>
                  <p className="text-sm font-bold" style={{ color: "var(--color-text)" }}>
                    {cfg.label}
                  </p>
                </div>
                <div className="grid grid-cols-3 gap-2 text-center">
                  <div>
                    <p className="text-lg font-bold" style={{ color: cfg.color }}>
                      ${f.cost_usd_30d.toFixed(2)}
                    </p>
                    <p className="text-[9px]" style={{ color: "#78614E" }}>30d cost</p>
                  </div>
                  <div>
                    <p className="text-lg font-bold" style={{ color: "var(--color-text)" }}>
                      {f.runs_30d}
                    </p>
                    <p className="text-[9px]" style={{ color: "#78614E" }}>
                      runs ({f.runs_24h} 24h)
                    </p>
                  </div>
                  <div>
                    <p
                      className="text-lg font-bold"
                      style={{ color: f.failure_rate_30d > 10 ? "#EF4444" : "#10B981" }}
                    >
                      {f.failure_rate_30d}%
                    </p>
                    <p className="text-[9px]" style={{ color: "#78614E" }}>failure</p>
                  </div>
                </div>
                {f.avg_duration_ms && (
                  <p className="text-[10px] mt-2 text-center" style={{ color: "#A8967E" }}>
                    avg latency: {f.avg_duration_ms < 1000 ? `${f.avg_duration_ms}ms` : `${(f.avg_duration_ms / 1000).toFixed(1)}s`}
                  </p>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* 7-day cost trend */}
      {trend.length > 0 && (
        <div>
          <h3 className="text-xs font-bold uppercase tracking-wider mb-2 flex items-center gap-1" style={{ color: "#78614E" }}>
            <TrendingUp className="w-3 h-3" />
            Last 7 days — hourly cost
          </h3>
          <div
            className="rounded-xl p-4"
            style={{ backgroundColor: "white", border: "1px solid rgba(0,0,0,0.06)" }}
          >
            <div className="flex items-end gap-0.5 h-24">
              {trend.slice(-168).map((p) => (
                <div
                  key={p.hour}
                  className="flex-1 rounded-t-sm transition-all"
                  style={{
                    height: maxTrendCost > 0 ? `${(p.cost_usd / maxTrendCost) * 100}%` : "0%",
                    minHeight: p.cost_usd > 0 ? "2px" : "0",
                    backgroundColor: "var(--color-primary)",
                    opacity: 0.7,
                  }}
                  title={`${p.hour}: $${p.cost_usd.toFixed(4)}`}
                />
              ))}
            </div>
            <p className="text-[10px] mt-2 text-center" style={{ color: "#A8967E" }}>
              Bars = hourly spend. Peak: ${maxTrendCost.toFixed(4)}/h.
            </p>
          </div>
        </div>
      )}

      {/* Top users */}
      {topUsers.length > 0 && (
        <div>
          <h3 className="text-xs font-bold uppercase tracking-wider mb-2" style={{ color: "#78614E" }}>
            Top spenders (30d)
          </h3>
          <div
            className="rounded-xl overflow-hidden"
            style={{ border: "1px solid rgba(0,0,0,0.06)" }}
          >
            <table className="w-full text-sm">
              <thead style={{ backgroundColor: "rgba(0,0,0,0.03)" }}>
                <tr>
                  <th className="text-left px-3 py-2 text-[10px] font-bold uppercase tracking-wider" style={{ color: "#78614E" }}>User</th>
                  <th className="text-right px-3 py-2 text-[10px] font-bold uppercase tracking-wider" style={{ color: "#78614E" }}>Runs</th>
                  <th className="text-right px-3 py-2 text-[10px] font-bold uppercase tracking-wider" style={{ color: "#78614E" }}>Image</th>
                  <th className="text-right px-3 py-2 text-[10px] font-bold uppercase tracking-wider" style={{ color: "#78614E" }}>Video</th>
                  <th className="text-right px-3 py-2 text-[10px] font-bold uppercase tracking-wider" style={{ color: "#78614E" }}>Total</th>
                </tr>
              </thead>
              <tbody>
                {topUsers.map((u) => (
                  <tr
                    key={u.user_id}
                    className="border-t"
                    style={{ borderColor: "rgba(0,0,0,0.04)", backgroundColor: "white" }}
                  >
                    <td className="px-3 py-2 text-xs" style={{ color: "var(--color-text)" }}>
                      {u.email ?? <code className="text-[10px]">{u.user_id.slice(0, 8)}...</code>}
                    </td>
                    <td className="px-3 py-2 text-right text-xs tabular-nums" style={{ color: "var(--color-text)" }}>
                      {u.runs}
                    </td>
                    <td className="px-3 py-2 text-right text-xs tabular-nums" style={{ color: "#8B5CF6" }}>
                      ${u.image_cost_usd.toFixed(3)}
                    </td>
                    <td className="px-3 py-2 text-right text-xs tabular-nums" style={{ color: "#EC4899" }}>
                      ${u.video_cost_usd.toFixed(3)}
                    </td>
                    <td className="px-3 py-2 text-right text-xs font-bold tabular-nums" style={{ color: "var(--color-text)" }}>
                      ${u.total_cost_usd.toFixed(3)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
