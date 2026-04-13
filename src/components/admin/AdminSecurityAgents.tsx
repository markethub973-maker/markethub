"use client";

/**
 * Admin Security Agents — M6 Sprint 1
 *
 * Shows the health of every security/maintenance agent by querying
 * /api/security/health-check (public summary) and /api/admin/security-agents
 * (detailed list — service-role). Auto-refreshes every 60s.
 */

import { useEffect, useState, useCallback } from "react";
import { Shield, RefreshCw, CheckCircle2, AlertTriangle, XCircle } from "lucide-react";

interface Agent {
  job: string;
  label: string;
  kind: string;
  severity: string;
  last_run: string | null;
  age_min: number | null;
  max_stale_min: number;
  status: "ok" | "stale" | "missing";
}

interface Summary {
  total: number;
  ok: number;
  stale: number;
  missing: number;
  overall: "ok" | "degraded" | "down";
}

export default function AdminSecurityAgents() {
  const [summary, setSummary] = useState<Summary | null>(null);
  const [agents, setAgents] = useState<Agent[]>([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setErr(null);
    try {
      const res = await fetch("/api/admin/security-agents", { cache: "no-store" });
      const data = (await res.json()) as
        | { ok: true; summary: Summary; agents: Agent[] }
        | { ok: false; error: string };
      if ("ok" in data && data.ok) {
        setSummary(data.summary);
        setAgents(data.agents);
      } else {
        setErr("error" in data ? data.error : "Failed to load");
      }
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Network error");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
    const id = setInterval(load, 60_000);
    return () => clearInterval(id);
  }, [load]);

  const overallColor =
    summary?.overall === "ok"
      ? "#10B981"
      : summary?.overall === "degraded"
      ? "#F59E0B"
      : "#EF4444";

  return (
    <div className="space-y-4">
      {/* Summary header */}
      <div
        className="rounded-xl p-4 flex items-center gap-3"
        style={{
          backgroundColor: `${overallColor}14`,
          border: `1px solid ${overallColor}44`,
        }}
      >
        <Shield className="w-6 h-6" style={{ color: overallColor }} />
        <div className="flex-1">
          <p className="text-sm font-bold" style={{ color: "#292524" }}>
            Security Agents —{" "}
            <span style={{ color: overallColor }}>
              {(summary?.overall ?? "loading").toUpperCase()}
            </span>
          </p>
          <p className="text-xs" style={{ color: "#78614E" }}>
            {summary
              ? `${summary.ok}/${summary.total} running · ${summary.stale} stale · ${summary.missing} missing`
              : "Loading..."}
          </p>
        </div>
        <button
          type="button"
          onClick={load}
          disabled={loading}
          className="p-2 rounded-lg disabled:opacity-40"
          style={{ backgroundColor: "white", color: overallColor }}
          aria-label="Refresh"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
        </button>
      </div>

      {err && (
        <div
          className="rounded-lg p-3 text-xs"
          style={{
            backgroundColor: "rgba(239,68,68,0.08)",
            border: "1px solid rgba(239,68,68,0.3)",
            color: "#B91C1C",
          }}
        >
          {err}
        </div>
      )}

      {/* Agent list */}
      <div className="space-y-2">
        {agents.map((a) => {
          const Icon =
            a.status === "ok"
              ? CheckCircle2
              : a.status === "stale"
              ? AlertTriangle
              : XCircle;
          const color =
            a.status === "ok" ? "#10B981" : a.status === "stale" ? "#F59E0B" : "#EF4444";
          return (
            <div
              key={a.job}
              className="rounded-lg p-3 flex items-center gap-3"
              style={{
                backgroundColor: "white",
                border: "1px solid rgba(0,0,0,0.06)",
              }}
            >
              <Icon className="w-4 h-4 flex-shrink-0" style={{ color }} />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold truncate" style={{ color: "#292524" }}>
                  {a.label}
                </p>
                <p className="text-[11px]" style={{ color: "#78614E" }}>
                  {a.last_run
                    ? `Last ran ${a.age_min}min ago · limit ${a.max_stale_min}min`
                    : "Never ran"}
                  {" · "}
                  <span style={{ color, fontWeight: 600 }}>
                    {a.severity}
                  </span>
                  {" · "}
                  {a.kind}
                </p>
              </div>
              <span
                className="text-[10px] font-bold px-2 py-0.5 rounded-full uppercase"
                style={{ backgroundColor: `${color}1A`, color }}
              >
                {a.status}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
