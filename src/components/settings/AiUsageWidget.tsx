"use client";

/**
 * Self-service AI Usage widget — embeds in /settings.
 * Shows the user their own spend across AI Image / Video / Audio.
 */

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Cpu, Image as ImageIcon, Film, Music, Loader2, RefreshCw, ExternalLink } from "lucide-react";

interface FeatureStats {
  feature: string;
  runs_30d: number;
  runs_7d: number;
  runs_24h: number;
  cost_usd_30d: number;
  cost_usd_7d: number;
  cost_usd_24h: number;
}

interface Summary {
  total_cost_usd_30d: number;
  total_cost_usd_7d: number;
  total_cost_usd_24h: number;
  total_runs_30d: number;
}

const FEATURE_CONFIG: Record<string, { icon: React.ElementType; color: string; label: string; href: string }> = {
  image: { icon: ImageIcon, color: "#8B5CF6", label: "Images",     href: "/studio/image" },
  video: { icon: Film,      color: "#EC4899", label: "Videos",     href: "/studio/video" },
  audio: { icon: Music,     color: "#10B981", label: "Audio",      href: "/studio/audio" },
};

export default function AiUsageWidget() {
  const [summary, setSummary] = useState<Summary | null>(null);
  const [features, setFeatures] = useState<FeatureStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    setRefreshing(true);
    try {
      const res = await fetch("/api/user/ai-usage", { cache: "no-store" });
      if (res.ok) {
        const d = await res.json();
        if (d.ok) {
          setSummary(d.summary);
          setFeatures(d.features ?? []);
        }
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  if (loading && !summary) {
    return (
      <div className="py-6 text-center">
        <Loader2 className="w-4 h-4 animate-spin inline" style={{ color: "#A8967E" }} />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Cpu className="w-5 h-5" style={{ color: "var(--color-primary)" }} />
          <h3 className="text-base font-bold" style={{ color: "var(--color-text)" }}>
            Your AI usage
          </h3>
        </div>
        <button
          type="button"
          onClick={load}
          disabled={refreshing}
          className="p-1.5 rounded"
          style={{ color: "#78614E" }}
        >
          <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? "animate-spin" : ""}`} />
        </button>
      </div>

      <div className="grid grid-cols-3 gap-2">
        <div
          className="rounded-lg p-3 text-center"
          style={{
            backgroundColor: "rgba(245,158,11,0.06)",
            border: "1px solid rgba(245,158,11,0.2)",
          }}
        >
          <p className="text-xl font-bold" style={{ color: "var(--color-primary-hover)" }}>
            ${summary?.total_cost_usd_24h.toFixed(3) ?? "0.00"}
          </p>
          <p className="text-[10px] uppercase tracking-wider mt-1" style={{ color: "#78614E" }}>
            Last 24h
          </p>
        </div>
        <div
          className="rounded-lg p-3 text-center"
          style={{ backgroundColor: "white", border: "1px solid rgba(0,0,0,0.06)" }}
        >
          <p className="text-xl font-bold" style={{ color: "var(--color-text)" }}>
            ${summary?.total_cost_usd_7d.toFixed(2) ?? "0.00"}
          </p>
          <p className="text-[10px] uppercase tracking-wider mt-1" style={{ color: "#78614E" }}>
            Last 7d
          </p>
        </div>
        <div
          className="rounded-lg p-3 text-center"
          style={{ backgroundColor: "white", border: "1px solid rgba(0,0,0,0.06)" }}
        >
          <p className="text-xl font-bold" style={{ color: "var(--color-text)" }}>
            ${summary?.total_cost_usd_30d.toFixed(2) ?? "0.00"}
          </p>
          <p className="text-[10px] uppercase tracking-wider mt-1" style={{ color: "#78614E" }}>
            Last 30d
          </p>
        </div>
      </div>

      <div className="space-y-2">
        {features.map((f) => {
          const cfg = FEATURE_CONFIG[f.feature];
          if (!cfg) return null;
          return (
            <Link
              key={f.feature}
              href={cfg.href}
              className="rounded-lg p-3 flex items-center gap-3 transition-all hover:bg-black/5"
              style={{ backgroundColor: "white", border: "1px solid rgba(0,0,0,0.06)" }}
            >
              <div
                className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0"
                style={{ backgroundColor: `${cfg.color}14`, color: cfg.color }}
              >
                <cfg.icon className="w-4 h-4" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold" style={{ color: "var(--color-text)" }}>
                  {cfg.label}
                </p>
                <p className="text-[11px]" style={{ color: "#78614E" }}>
                  {f.runs_30d} runs · {f.runs_7d} this week · {f.runs_24h} today
                </p>
              </div>
              <div className="text-right">
                <p className="text-sm font-bold tabular-nums" style={{ color: cfg.color }}>
                  ${f.cost_usd_30d.toFixed(3)}
                </p>
                <p className="text-[10px]" style={{ color: "#A8967E" }}>30-day cost</p>
              </div>
              <ExternalLink className="w-3 h-3 flex-shrink-0" style={{ color: "#A8967E" }} />
            </Link>
          );
        })}
      </div>

      <p className="text-[10px]" style={{ color: "#A8967E" }}>
        AI usage is included in your plan up to your monthly allowance.
        Overage is billed at our cost basis.
      </p>
    </div>
  );
}
