"use client";

import { useEffect, useState, useCallback } from "react";
import { RefreshCw, Shield, User, LogIn, Lock, Unlock, CreditCard, Key, Activity } from "lucide-react";

interface AuditEntry {
  id: string;
  action: string;
  actor_id: string | null;
  target_id: string | null;
  entity_type: string | null;
  details: Record<string, unknown> | null;
  ip: string | null;
  user_agent: string | null;
  created_at: string;
}

const ACTION_CONFIG: Record<string, { label: string; icon: React.ReactNode; color: string; bg: string }> = {
  admin_login:           { label: "Admin Login",        icon: <LogIn size={13} />,    color: "#3B82F6", bg: "rgba(59,130,246,0.1)" },
  admin_logout:          { label: "Admin Logout",       icon: <LogIn size={13} />,    color: "#78716C", bg: "rgba(120,113,108,0.1)" },
  user_blocked:          { label: "User Blocked",       icon: <Lock size={13} />,     color: "#EF4444", bg: "rgba(239,68,68,0.1)" },
  user_unblocked:        { label: "User Unblocked",     icon: <Unlock size={13} />,   color: "#16A34A", bg: "rgba(22,163,74,0.1)" },
  plan_changed:          { label: "Plan Changed",       icon: <CreditCard size={13} />,color: "#F59E0B", bg: "rgba(245,158,11,0.1)" },
  migration_run:         { label: "Migration Run",      icon: <Activity size={13} />, color: "#7C3AED", bg: "rgba(124,58,237,0.1)" },
  credential_updated:    { label: "Credential Updated", icon: <Key size={13} />,      color: "#0891B2", bg: "rgba(8,145,178,0.1)" },
  token_refreshed:       { label: "Token Refreshed",    icon: <Key size={13} />,      color: "#059669", bg: "rgba(5,150,105,0.1)" },
  abuse_flag_created:    { label: "Abuse Flag",         icon: <Shield size={13} />,   color: "#DC2626", bg: "rgba(220,38,38,0.1)" },
  user_registered:       { label: "User Registered",    icon: <User size={13} />,     color: "#16A34A", bg: "rgba(22,163,74,0.1)" },
  pricing_updated:       { label: "Pricing Updated",    icon: <CreditCard size={13} />,color: "#D97706", bg: "rgba(217,119,6,0.1)" },
  feature_flag_updated:  { label: "Feature Flag",       icon: <Activity size={13} />, color: "#7C3AED", bg: "rgba(124,58,237,0.1)" },
};

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  if (diff < 60_000)  return `${Math.floor(diff / 1000)}s ago`;
  if (diff < 3600_000) return `${Math.floor(diff / 60_000)}m ago`;
  if (diff < 86400_000) return `${Math.floor(diff / 3600_000)}h ago`;
  return new Date(iso).toLocaleDateString();
}

export default function AdminAuditLog() {
  const [logs, setLogs]       = useState<AuditEntry[]>([]);
  const [total, setTotal]     = useState(0);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter]   = useState("all");
  const [sessionExpired, setSessionExpired] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setSessionExpired(false);
    try {
      const params = new URLSearchParams({ limit: "80" });
      if (filter !== "all") params.set("action", filter);
      const res  = await fetch(`/api/admin/audit-logs?${params}`);
      // 404 = proxy tunnel cloak (no cookie + no t= query); 401/403 = invalid cookie
      if (res.status === 401 || res.status === 403 || res.status === 404) {
        setSessionExpired(true);
        setLogs([]);
        setTotal(0);
        return;
      }
      const data = await res.json();
      setLogs(data.logs ?? []);
      setTotal(data.total ?? 0);
    } catch { /* ignore */ } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => { load(); }, [load]);

  const actions = ["all", ...Object.keys(ACTION_CONFIG)];

  return (
    <div className="rounded-2xl p-6" style={{ backgroundColor: "#FFFCF7", border: "1px solid rgba(245,215,160,0.25)" }}>
      <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
        <div className="flex items-center gap-2">
          <Shield size={18} style={{ color: "#F59E0B" }} />
          <h2 className="text-lg font-bold" style={{ color: "#292524" }}>Audit Log</h2>
          <span className="text-xs px-2 py-0.5 rounded-full font-medium" style={{ backgroundColor: "rgba(245,158,11,0.1)", color: "#D97706" }}>
            {total} events
          </span>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <select
            value={filter}
            onChange={e => setFilter(e.target.value)}
            className="text-xs px-3 py-1.5 rounded-lg border focus:outline-none"
            style={{ backgroundColor: "#F5EFE6", borderColor: "rgba(245,215,160,0.4)", color: "#292524" }}
          >
            {actions.map(a => (
              <option key={a} value={a}>{a === "all" ? "All events" : (ACTION_CONFIG[a]?.label ?? a)}</option>
            ))}
          </select>
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
      </div>

      {loading && logs.length === 0 ? (
        <div className="text-center py-8 text-sm" style={{ color: "#A8967E" }}>Loading audit log...</div>
      ) : sessionExpired ? (
        <div className="text-center py-8 text-sm space-y-2" style={{ color: "#DC2626" }}>
          <p className="font-semibold">Sesiune admin expirată</p>
          <p style={{ color: "#A8967E" }}>
            Cookie-ul admin a expirat (8h max). Re-loghează-te la{" "}
            <a href="/markethub973" className="underline" style={{ color: "#D97706" }}>
              /markethub973
            </a>{" "}
            și revino aici.
          </p>
        </div>
      ) : logs.length === 0 ? (
        <div className="text-center py-8 text-sm" style={{ color: "#A8967E" }}>
          No audit events yet.
        </div>
      ) : (
        <div className="space-y-1 max-h-96 overflow-y-auto pr-1">
          {logs.map(log => {
            const cfg = ACTION_CONFIG[log.action] ?? {
              label: log.action, icon: <Activity size={13} />, color: "#78716C", bg: "rgba(120,113,108,0.1)"
            };
            return (
              <div
                key={log.id}
                className="flex items-start gap-3 px-3 py-2.5 rounded-xl text-xs"
                style={{ backgroundColor: cfg.bg }}
              >
                {/* Icon */}
                <div className="mt-0.5 flex-shrink-0" style={{ color: cfg.color }}>{cfg.icon}</div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold" style={{ color: cfg.color }}>{cfg.label}</span>
                    {log.target_id && (
                      <span className="text-xs font-mono opacity-60" style={{ color: "#292524" }}>
                        → {log.target_id.slice(0, 8)}…
                      </span>
                    )}
                    {log.details && Object.keys(log.details).length > 0 && (
                      <span className="opacity-60" style={{ color: "#292524" }}>
                        {Object.entries(log.details).map(([k, v]) => `${k}: ${v}`).join(" · ")}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-3 mt-0.5 opacity-50" style={{ color: "#292524" }}>
                    <span>{timeAgo(log.created_at)}</span>
                    {log.ip && <span>IP: {log.ip}</span>}
                    {log.actor_id && <span>by {log.actor_id === "admin" ? "admin" : log.actor_id.slice(0, 8) + "…"}</span>}
                  </div>
                </div>

                {/* Timestamp */}
                <span className="flex-shrink-0 opacity-40 text-xs" style={{ color: "#292524" }}>
                  {new Date(log.created_at).toLocaleTimeString()}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
