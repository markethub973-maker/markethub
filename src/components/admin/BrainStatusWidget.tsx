"use client";

import { useCallback, useEffect, useState } from "react";
import { Brain, RefreshCw, Zap, Hash, Target, Clock, Activity } from "lucide-react";

interface BrainData {
  totalCampaigns: number;
  nichesLearned: number;
  avgConfidence: number;
  lastLearningCycle: string | null;
  activeHashes: number;
}

function timeAgo(iso: string | null): string {
  if (!iso) return "Never";
  const diff = Date.now() - new Date(iso).getTime();
  if (diff < 60_000) return `${Math.floor(diff / 1000)}s ago`;
  if (diff < 3600_000) return `${Math.floor(diff / 60_000)}m ago`;
  if (diff < 86400_000) return `${Math.floor(diff / 3600_000)}h ago`;
  return new Date(iso).toLocaleDateString();
}

function getStatus(data: BrainData): { label: string; color: string; glow: string } {
  if (data.totalCampaigns === 0 && data.nichesLearned === 0) {
    return { label: "Paused", color: "#EF4444", glow: "rgba(239,68,68,0.4)" };
  }
  if (data.lastLearningCycle) {
    const minutesSinceLast = (Date.now() - new Date(data.lastLearningCycle).getTime()) / 60_000;
    if (minutesSinceLast < 60) {
      return { label: "Learning", color: "#F59E0B", glow: "rgba(245,158,11,0.4)" };
    }
  }
  return { label: "Active", color: "#10B981", glow: "rgba(16,185,129,0.4)" };
}

export default function BrainStatusWidget() {
  const [data, setData] = useState<BrainData | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/brain-status", { cache: "no-store" });
      if (res.ok) {
        const d = await res.json();
        if (d.ok) setData(d);
      }
    } catch { /* ignore */ } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const status = data ? getStatus(data) : { label: "Loading", color: "#78716C", glow: "rgba(120,113,108,0.3)" };

  const metrics = data
    ? [
        { label: "Campaigns Processed", value: data.totalCampaigns, icon: Target, color: "#6366F1" },
        { label: "Niches Learned", value: data.nichesLearned, icon: Brain, color: "#8B5CF6" },
        { label: "Avg Confidence", value: `${(data.avgConfidence * 100).toFixed(0)}%`, icon: Zap, color: "#F59E0B" },
        { label: "Last Learning", value: timeAgo(data.lastLearningCycle), icon: Clock, color: "#10B981" },
        { label: "Active Hashes", value: data.activeHashes, icon: Hash, color: "#0EA5E9" },
      ]
    : [];

  return (
    <div
      className="rounded-2xl p-4 md:p-6"
      style={{
        backgroundColor: "#1C1814",
        border: "1px solid rgba(245,215,160,0.2)",
      }}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
        <div className="flex items-center gap-2.5">
          <Activity size={18} style={{ color: "#F59E0B" }} />
          <h2 className="text-base md:text-lg font-bold" style={{ color: "#F5EFE6" }}>
            Brain Status
          </h2>
          {/* Status LED */}
          <div className="flex items-center gap-1.5 ml-1">
            <div
              className="w-2.5 h-2.5 rounded-full"
              style={{
                backgroundColor: status.color,
                boxShadow: `0 0 8px ${status.glow}`,
                animation: status.label === "Learning" ? "pulse 2s infinite" : undefined,
              }}
            />
            <span
              className="text-xs font-semibold"
              style={{ color: status.color }}
            >
              {status.label}
            </span>
          </div>
        </div>
        <button
          type="button"
          onClick={load}
          disabled={loading}
          className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg font-medium transition-colors"
          style={{ backgroundColor: "rgba(245,158,11,0.1)", color: "#D97706" }}
        >
          <RefreshCw size={12} className={loading ? "animate-spin" : ""} />
          Refresh
        </button>
      </div>

      {/* Metrics grid */}
      {loading && !data ? (
        <div className="text-center py-8 text-sm" style={{ color: "#A8967E" }}>
          Loading brain metrics...
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
          {metrics.map((m) => {
            const Icon = m.icon;
            return (
              <div
                key={m.label}
                className="rounded-xl p-3"
                style={{
                  backgroundColor: "rgba(245,215,160,0.05)",
                  border: "1px solid rgba(245,215,160,0.1)",
                }}
              >
                <div className="flex items-center gap-2 mb-2">
                  <Icon size={14} style={{ color: m.color }} />
                  <span className="text-[10px] md:text-xs font-medium uppercase tracking-wide" style={{ color: "#A8967E" }}>
                    {m.label}
                  </span>
                </div>
                <p className="text-lg md:text-xl font-bold" style={{ color: "#F5EFE6" }}>
                  {m.value}
                </p>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
