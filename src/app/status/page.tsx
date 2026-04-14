"use client";

/**
 * Public status page at /status.
 *
 * Anyone (logged in or not) can see real-time platform health.
 * Auto-refresh every 30s. Mobile-friendly. Brand-styled.
 *
 * Backed by GET /api/status which aggregates subsystem statuses.
 */

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { CheckCircle2, AlertTriangle, XCircle, RefreshCw, ArrowLeft, Activity } from "lucide-react";

interface Subsystem {
  name: string;
  status: "operational" | "degraded" | "outage";
  message?: string;
  last_check: string;
}

interface StatusResponse {
  overall: "operational" | "degraded" | "outage";
  subsystems: Subsystem[];
  generated_at: string;
  generated_in_ms: number;
}

const STATUS_CONFIG = {
  operational: {
    color: "#10B981",
    bg: "rgba(16,185,129,0.1)",
    label: "All Systems Operational",
    short: "Operational",
    Icon: CheckCircle2,
  },
  degraded: {
    color: "var(--color-primary)",
    bg: "rgba(245,158,11,0.1)",
    label: "Partial Degradation",
    short: "Degraded",
    Icon: AlertTriangle,
  },
  outage: {
    color: "#EF4444",
    bg: "rgba(239,68,68,0.1)",
    label: "Service Outage",
    short: "Outage",
    Icon: XCircle,
  },
} as const;

export default function StatusPage() {
  const [data, setData] = useState<StatusResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    setRefreshing(true);
    try {
      const res = await fetch("/api/status", { cache: "no-store" });
      if (res.ok) {
        setData((await res.json()) as StatusResponse);
      }
    } catch {
      /* keep stale data */
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    load();
    const id = setInterval(load, 30_000);
    return () => clearInterval(id);
  }, [load]);

  const cfg = data ? STATUS_CONFIG[data.overall] : STATUS_CONFIG.operational;

  return (
    <div className="min-h-screen" style={{ backgroundColor: "var(--color-bg-secondary)" }}>
      <header
        className="border-b"
        style={{ borderColor: "rgba(245,215,160,0.3)", backgroundColor: "white" }}
      >
        <div className="max-w-3xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-sm font-bold transition-all hover:opacity-80"
            style={{ color: "var(--color-text)" }}
          >
            <Activity className="w-5 h-5" style={{ color: "var(--color-primary)" }} />
            MarketHub Pro
          </Link>
          <Link
            href="/"
            className="inline-flex items-center gap-1 text-xs font-semibold transition-all hover:underline"
            style={{ color: "#78614E" }}
          >
            <ArrowLeft className="w-3 h-3" />
            Back to dashboard
          </Link>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-6 py-10">
        <h1 className="text-3xl font-bold mb-2" style={{ color: "var(--color-text)" }}>
          Platform Status
        </h1>
        <p className="text-sm mb-8" style={{ color: "#78614E" }}>
          Real-time health of every MarketHub Pro subsystem. Auto-refreshes every 30
          seconds.
        </p>

        {/* Overall status banner */}
        <div
          className="rounded-2xl p-6 mb-8 flex items-center gap-4"
          style={{
            backgroundColor: cfg.bg,
            border: `1px solid ${cfg.color}44`,
          }}
        >
          <div
            className="w-14 h-14 rounded-full flex items-center justify-center flex-shrink-0"
            style={{ backgroundColor: cfg.color }}
          >
            <cfg.Icon className="w-7 h-7" style={{ color: "white" }} />
          </div>
          <div className="flex-1">
            <p
              className="text-xs font-bold uppercase tracking-widest mb-1"
              style={{ color: cfg.color }}
            >
              Current Status
            </p>
            <p className="text-2xl font-bold" style={{ color: "var(--color-text)" }}>
              {cfg.label}
            </p>
            {data && (
              <p className="text-xs mt-1" style={{ color: "#78614E" }}>
                Last checked {new Date(data.generated_at).toLocaleTimeString()} ·
                response in {data.generated_in_ms}ms
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={load}
            disabled={refreshing}
            className="p-2 rounded-lg disabled:opacity-40"
            style={{ backgroundColor: "white", color: cfg.color }}
            aria-label="Refresh now"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? "animate-spin" : ""}`} />
          </button>
        </div>

        {/* Subsystems list */}
        <div className="space-y-2">
          {loading && !data && (
            <div className="text-center py-8 text-sm" style={{ color: "#A8967E" }}>
              Loading...
            </div>
          )}
          {data?.subsystems.map((s) => {
            const sc = STATUS_CONFIG[s.status];
            return (
              <div
                key={s.name}
                className="rounded-xl p-4 flex items-center gap-3"
                style={{
                  backgroundColor: "white",
                  border: "1px solid rgba(0,0,0,0.06)",
                }}
              >
                <sc.Icon className="w-5 h-5 flex-shrink-0" style={{ color: sc.color }} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold" style={{ color: "var(--color-text)" }}>
                    {s.name}
                  </p>
                  {s.message && (
                    <p className="text-xs mt-0.5" style={{ color: "#78614E" }}>
                      {s.message}
                    </p>
                  )}
                </div>
                <span
                  className="text-[10px] font-bold uppercase px-2 py-1 rounded-full"
                  style={{ backgroundColor: sc.bg, color: sc.color }}
                >
                  {sc.short}
                </span>
              </div>
            );
          })}
        </div>

        {/* Footer note */}
        <div
          className="mt-10 rounded-xl p-4 text-center"
          style={{
            backgroundColor: "rgba(245,215,160,0.1)",
            border: "1px solid rgba(245,215,160,0.3)",
          }}
        >
          <p className="text-xs" style={{ color: "#78614E" }}>
            Subscribe to incident updates by following us on social media or
            <Link href="/help" className="font-bold hover:underline" style={{ color: "var(--color-primary-hover)" }}>
              {" "}contacting support
            </Link>
            . For real-time alerts, point your favorite uptime monitor at
            <code
              className="mx-1 px-1.5 py-0.5 rounded"
              style={{ backgroundColor: "rgba(0,0,0,0.06)", color: "var(--color-text)", fontSize: "11px" }}
            >
              /api/health
            </code>
            .
          </p>
        </div>

        <p className="text-center text-xs mt-6" style={{ color: "#A8967E" }}>
          MarketHub Pro · Status updated automatically
        </p>
      </main>
    </div>
  );
}
