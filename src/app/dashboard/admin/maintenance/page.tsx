"use client";

/**
 * Admin → Maintenance page
 *
 * Shows unresolved findings produced by the maintenance agent team
 * (probe, schema-drift, consistency). Allows admin to manually mark any
 * finding as resolved. Data source: /api/admin/maintenance (isAdminAuthorized).
 *
 * This page is intentionally thin — the heavy lifting happens in the
 * agent routes + digest email. This is the "escape hatch" when admin
 * wants to act on findings immediately instead of waiting for next run.
 */

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  AlertTriangle,
  CheckCircle2,
  RefreshCw,
  Play,
  ChevronDown,
  ChevronUp,
} from "lucide-react";

interface Finding {
  id: string;
  agent_name: string;
  severity: "info" | "low" | "medium" | "high" | "critical";
  fingerprint: string;
  title: string;
  details: Record<string, unknown>;
  fix_suggestion: string | null;
  first_seen: string;
  last_seen: string;
  occurrences: number;
  resolved: boolean;
  resolved_at: string | null;
}

interface FindingsResponse {
  unresolved: Finding[];
  resolved: Finding[];
  counts: Record<string, number>;
  total_unresolved: number;
}

const SEVERITY_ORDER: Finding["severity"][] = ["critical", "high", "medium", "low", "info"];
const SEVERITY_STYLE: Record<Finding["severity"], { bg: string; fg: string; label: string }> = {
  critical: { bg: "#DC2626", fg: "#FEE2E2", label: "CRITICAL" },
  high: { bg: "#EA580C", fg: "#FED7AA", label: "HIGH" },
  medium: { bg: "#F59E0B", fg: "#FEF3C7", label: "MEDIUM" },
  low: { bg: "#65A30D", fg: "#D9F99D", label: "LOW" },
  info: { bg: "#0891B2", fg: "#CFFAFE", label: "INFO" },
};

export default function MaintenancePage() {
  const [data, setData] = useState<FindingsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [showResolved, setShowResolved] = useState(false);
  const [runningAgent, setRunningAgent] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(
        `/api/admin/maintenance${showResolved ? "?include_resolved=1" : ""}`,
        { cache: "no-store" },
      );
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setData(await res.json());
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }, [showResolved]);

  useEffect(() => {
    void load();
  }, [load]);

  async function markResolved(id: string) {
    await fetch("/api/admin/maintenance", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, resolved: true }),
    });
    await load();
  }

  async function runAgent(agent: "probe" | "schema-drift" | "consistency" | "digest") {
    setRunningAgent(agent);
    try {
      // Admin session gets through verifyCronSecret via no-op; actually these
      // routes require Bearer CRON_SECRET. So we call through a helper admin
      // route instead — but to keep scope tight, rely on the agent routes
      // being safe to hit via cookie-authed tunnel (isAdminAuthorized is not
      // wired on /api/maint/*). For now, show a hint that manual run must
      // happen via curl.
      alert(
        `Manual agent run requires CRON_SECRET. Use:\n\ncurl -H "Authorization: Bearer $CRON_SECRET" https://markethubpromo.com/api/maint/${agent}`,
      );
    } finally {
      setRunningAgent(null);
    }
  }

  function toggleExpand(id: string) {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  const grouped: Record<Finding["severity"], Finding[]> = {
    critical: [],
    high: [],
    medium: [],
    low: [],
    info: [],
  };
  for (const f of data?.unresolved ?? []) {
    grouped[f.severity].push(f);
  }

  return (
    <div style={{ minHeight: "100vh", background: "#1C1814", color: "#FFF8F0", padding: "32px 24px" }}>
      <div style={{ maxWidth: 1000, margin: "0 auto" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 24 }}>
          <Link
            href="/dashboard/admin"
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              padding: "8px 14px",
              background: "rgba(255,255,255,0.05)",
              borderRadius: 8,
              color: "#C4AA8A",
              textDecoration: "none",
              fontSize: 13,
            }}
          >
            <ArrowLeft size={14} /> Back to admin
          </Link>
          <h1 style={{ fontSize: 24, fontWeight: 700, margin: 0 }}>Maintenance Findings</h1>
          <button
            onClick={load}
            disabled={loading}
            style={{
              marginLeft: "auto",
              padding: "8px 14px",
              background: "rgba(245,158,11,0.15)",
              color: "#F59E0B",
              border: "1px solid rgba(245,158,11,0.3)",
              borderRadius: 8,
              fontSize: 13,
              cursor: loading ? "not-allowed" : "pointer",
              display: "flex",
              alignItems: "center",
              gap: 6,
            }}
          >
            <RefreshCw size={14} className={loading ? "spin" : ""} /> Refresh
          </button>
        </div>

        {/* Summary bar */}
        {data && (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(5, 1fr)",
              gap: 12,
              marginBottom: 24,
            }}
          >
            {SEVERITY_ORDER.map((sev) => {
              const style = SEVERITY_STYLE[sev];
              const count = data.counts[sev] ?? 0;
              return (
                <div
                  key={sev}
                  style={{
                    background: count > 0 ? style.bg : "rgba(255,255,255,0.04)",
                    padding: 16,
                    borderRadius: 10,
                    textAlign: "center",
                    border: count > 0 ? "none" : "1px solid rgba(255,255,255,0.08)",
                  }}
                >
                  <div
                    style={{
                      fontSize: 28,
                      fontWeight: 700,
                      color: count > 0 ? "#FFF" : "#6B5B4A",
                    }}
                  >
                    {count}
                  </div>
                  <div
                    style={{
                      fontSize: 11,
                      fontWeight: 600,
                      letterSpacing: 0.8,
                      color: count > 0 ? "#FFF" : "#6B5B4A",
                      marginTop: 4,
                    }}
                  >
                    {style.label}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Manual agent runners */}
        <div
          style={{
            background: "rgba(255,255,255,0.04)",
            padding: 16,
            borderRadius: 10,
            marginBottom: 24,
            border: "1px solid rgba(255,255,255,0.08)",
          }}
        >
          <div style={{ fontSize: 12, color: "#C4AA8A", marginBottom: 10, fontWeight: 600 }}>
            MANUAL AGENT RUN
          </div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {(["probe", "schema-drift", "consistency", "digest"] as const).map((agent) => (
              <button
                key={agent}
                onClick={() => runAgent(agent)}
                disabled={runningAgent === agent}
                style={{
                  padding: "8px 14px",
                  background: "rgba(16,185,129,0.12)",
                  color: "#10B981",
                  border: "1px solid rgba(16,185,129,0.25)",
                  borderRadius: 8,
                  fontSize: 12,
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                }}
              >
                <Play size={12} /> {agent}
              </button>
            ))}
          </div>
        </div>

        {error && (
          <div
            style={{
              padding: 16,
              background: "rgba(239,68,68,0.12)",
              border: "1px solid rgba(239,68,68,0.3)",
              borderRadius: 10,
              color: "#FCA5A5",
              marginBottom: 24,
            }}
          >
            <AlertTriangle size={14} style={{ display: "inline", marginRight: 6 }} />
            Error: {error}
          </div>
        )}

        {loading && !data && <div style={{ color: "#C4AA8A" }}>Loading…</div>}

        {data && data.total_unresolved === 0 && !loading && (
          <div
            style={{
              padding: 32,
              background: "rgba(16,185,129,0.12)",
              border: "1px solid rgba(16,185,129,0.3)",
              borderRadius: 10,
              textAlign: "center",
            }}
          >
            <CheckCircle2 size={40} color="#10B981" style={{ marginBottom: 8 }} />
            <div style={{ fontSize: 18, fontWeight: 700, color: "#10B981" }}>
              All clear — no unresolved findings
            </div>
            <div style={{ fontSize: 13, color: "#86EFAC", marginTop: 4 }}>
              Agents last ran: {data.unresolved[0]?.last_seen ?? "never"}
            </div>
          </div>
        )}

        {/* Findings grouped by severity */}
        {SEVERITY_ORDER.map((sev) => {
          const items = grouped[sev];
          if (items.length === 0) return null;
          const style = SEVERITY_STYLE[sev];
          return (
            <div key={sev} style={{ marginBottom: 32 }}>
              <h2
                style={{
                  fontSize: 14,
                  fontWeight: 700,
                  color: style.bg,
                  letterSpacing: 0.5,
                  marginBottom: 12,
                  paddingBottom: 6,
                  borderBottom: `2px solid ${style.bg}`,
                }}
              >
                {style.label} — {items.length} finding{items.length === 1 ? "" : "s"}
              </h2>
              {items.map((f) => (
                <FindingCard
                  key={f.id}
                  finding={f}
                  expanded={expanded.has(f.id)}
                  onToggle={() => toggleExpand(f.id)}
                  onResolve={() => markResolved(f.id)}
                />
              ))}
            </div>
          );
        })}

        {/* Resolved toggle */}
        <div style={{ marginTop: 32 }}>
          <label
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              fontSize: 13,
              color: "#C4AA8A",
              cursor: "pointer",
            }}
          >
            <input
              type="checkbox"
              checked={showResolved}
              onChange={(e) => setShowResolved(e.target.checked)}
            />
            Show recently resolved (last 7 days)
          </label>
          {showResolved && data && (
            <div style={{ marginTop: 12 }}>
              {data.resolved.length === 0 ? (
                <div style={{ color: "#6B5B4A", fontSize: 12 }}>None.</div>
              ) : (
                data.resolved.map((f) => (
                  <div
                    key={f.id}
                    style={{
                      padding: 10,
                      fontSize: 12,
                      color: "#86EFAC",
                      borderLeft: "2px solid #10B981",
                      marginBottom: 6,
                    }}
                  >
                    ✓ [{f.agent_name}] {f.title} — {f.resolved_at?.slice(0, 19).replace("T", " ")}
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      </div>

      <style jsx>{`
        @keyframes spin {
          from {
            transform: rotate(0deg);
          }
          to {
            transform: rotate(360deg);
          }
        }
        :global(.spin) {
          animation: spin 1s linear infinite;
        }
      `}</style>
    </div>
  );
}

function FindingCard({
  finding,
  expanded,
  onToggle,
  onResolve,
}: {
  finding: Finding;
  expanded: boolean;
  onToggle: () => void;
  onResolve: () => void;
}) {
  return (
    <div
      style={{
        background: "rgba(255,255,255,0.04)",
        border: "1px solid rgba(255,255,255,0.08)",
        borderRadius: 10,
        padding: 14,
        marginBottom: 10,
      }}
    >
      <div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 14, fontWeight: 600, color: "#FFF8F0", marginBottom: 6 }}>
            {finding.title}
          </div>
          <div style={{ fontSize: 11, color: "#C4AA8A" }}>
            agent: <code>{finding.agent_name}</code>
            &nbsp;·&nbsp; {finding.occurrences}× occurrences
            &nbsp;·&nbsp; first seen {finding.first_seen.slice(0, 10)}
            &nbsp;·&nbsp; last seen {finding.last_seen.slice(0, 19).replace("T", " ")}
          </div>
          <div
            style={{
              fontSize: 10,
              color: "#6B5B4A",
              fontFamily: "monospace",
              marginTop: 4,
            }}
          >
            {finding.fingerprint}
          </div>
          {expanded && (
            <div style={{ marginTop: 12 }}>
              {finding.fix_suggestion && (
                <div
                  style={{
                    padding: 10,
                    background: "rgba(245,158,11,0.08)",
                    border: "1px solid rgba(245,158,11,0.25)",
                    borderRadius: 6,
                    fontSize: 12,
                    color: "#F59E0B",
                    whiteSpace: "pre-wrap",
                    marginBottom: 10,
                  }}
                >
                  <strong>Fix:</strong> {finding.fix_suggestion}
                </div>
              )}
              <pre
                style={{
                  padding: 10,
                  background: "rgba(0,0,0,0.3)",
                  borderRadius: 6,
                  fontSize: 11,
                  color: "#C4AA8A",
                  overflow: "auto",
                  maxHeight: 200,
                  margin: 0,
                }}
              >
                {JSON.stringify(finding.details, null, 2)}
              </pre>
            </div>
          )}
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <button
            onClick={onToggle}
            style={{
              padding: "6px 10px",
              background: "rgba(255,255,255,0.05)",
              border: "1px solid rgba(255,255,255,0.1)",
              borderRadius: 6,
              color: "#C4AA8A",
              fontSize: 11,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: 4,
            }}
          >
            {expanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
            {expanded ? "Hide" : "Details"}
          </button>
          <button
            onClick={onResolve}
            style={{
              padding: "6px 10px",
              background: "rgba(16,185,129,0.12)",
              border: "1px solid rgba(16,185,129,0.3)",
              borderRadius: 6,
              color: "#10B981",
              fontSize: 11,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: 4,
            }}
          >
            <CheckCircle2 size={12} /> Resolve
          </button>
        </div>
      </div>
    </div>
  );
}
