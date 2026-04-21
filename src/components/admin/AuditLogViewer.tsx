"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Shield, RefreshCw, Download, ChevronLeft, ChevronRight,
  Search, Filter, Activity, LogIn, Lock, Unlock, CreditCard, Key, User,
} from "lucide-react";

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

const ACTION_OPTIONS = [
  { value: "", label: "All Actions" },
  { value: "admin_login", label: "Admin Login" },
  { value: "admin_logout", label: "Admin Logout" },
  { value: "user_blocked", label: "User Blocked" },
  { value: "user_unblocked", label: "User Unblocked" },
  { value: "plan_changed", label: "Plan Changed" },
  { value: "migration_run", label: "Migration Run" },
  { value: "credential_updated", label: "Credential Updated" },
  { value: "token_refreshed", label: "Token Refreshed" },
  { value: "abuse_flag_created", label: "Abuse Flag" },
  { value: "user_registered", label: "User Registered" },
  { value: "pricing_updated", label: "Pricing Updated" },
  { value: "feature_flag_updated", label: "Feature Flag" },
];

const ACTION_COLORS: Record<string, string> = {
  admin_login: "#3B82F6",
  admin_logout: "#78716C",
  user_blocked: "#EF4444",
  user_unblocked: "#16A34A",
  plan_changed: "#F59E0B",
  migration_run: "#7C3AED",
  credential_updated: "#0891B2",
  token_refreshed: "#059669",
  abuse_flag_created: "#DC2626",
  user_registered: "#16A34A",
  pricing_updated: "#D97706",
  feature_flag_updated: "#7C3AED",
};

const LIMIT = 20;

export default function AuditLogViewer() {
  const [logs, setLogs] = useState<AuditEntry[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [actionFilter, setActionFilter] = useState("");
  const [userSearch, setUserSearch] = useState("");
  const [debouncedUser, setDebouncedUser] = useState("");
  const [exporting, setExporting] = useState(false);

  // Debounce user search
  useEffect(() => {
    const t = setTimeout(() => setDebouncedUser(userSearch), 400);
    return () => clearTimeout(t);
  }, [userSearch]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: String(page),
        limit: String(LIMIT),
      });
      if (actionFilter) params.set("action", actionFilter);
      if (debouncedUser.trim()) params.set("user_id", debouncedUser.trim());

      const res = await fetch(`/api/admin/audit-viewer?${params}`, { cache: "no-store" });
      if (res.ok) {
        const d = await res.json();
        setLogs(d.logs ?? []);
        setTotal(d.total ?? 0);
      }
    } catch { /* ignore */ } finally {
      setLoading(false);
    }
  }, [page, actionFilter, debouncedUser]);

  useEffect(() => { load(); }, [load]);

  // Reset to page 1 when filters change
  useEffect(() => { setPage(1); }, [actionFilter, debouncedUser]);

  const totalPages = Math.max(1, Math.ceil(total / LIMIT));

  const handleExport = async () => {
    setExporting(true);
    try {
      const params = new URLSearchParams({ format: "csv", limit: "10000" });
      if (actionFilter) params.set("action", actionFilter);
      if (debouncedUser.trim()) params.set("q", debouncedUser.trim());
      const res = await fetch(`/api/admin/audit-logs?${params}`);
      if (res.ok) {
        const blob = await res.blob();
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `audit-logs-${new Date().toISOString().slice(0, 10)}.csv`;
        a.click();
        URL.revokeObjectURL(url);
      }
    } catch { /* ignore */ } finally {
      setExporting(false);
    }
  };

  const formatDate = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleString("en-GB", {
      day: "2-digit", month: "short", year: "numeric",
      hour: "2-digit", minute: "2-digit",
    });
  };

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
          <Shield size={18} style={{ color: "#F59E0B" }} />
          <h2 className="text-base md:text-lg font-bold" style={{ color: "#F5EFE6" }}>
            Audit Log Viewer
          </h2>
          <span
            className="text-xs px-2 py-0.5 rounded-full font-medium"
            style={{ backgroundColor: "rgba(245,158,11,0.1)", color: "#D97706" }}
          >
            {total} events
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleExport}
            disabled={exporting}
            className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg font-medium transition-colors"
            style={{ backgroundColor: "rgba(16,185,129,0.1)", color: "#10B981" }}
          >
            <Download size={12} className={exporting ? "animate-bounce" : ""} />
            Export CSV
          </button>
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

      {/* Filters */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 mb-4">
        {/* Action filter */}
        <div className="flex items-center gap-2 flex-1">
          <Filter size={14} style={{ color: "#A8967E" }} />
          <select
            value={actionFilter}
            onChange={(e) => setActionFilter(e.target.value)}
            className="text-xs px-3 py-2 rounded-lg border focus:outline-none w-full sm:w-auto"
            style={{
              backgroundColor: "rgba(245,215,160,0.05)",
              borderColor: "rgba(245,215,160,0.2)",
              color: "#F5EFE6",
            }}
          >
            {ACTION_OPTIONS.map((o) => (
              <option key={o.value} value={o.value} style={{ backgroundColor: "#1C1814" }}>
                {o.label}
              </option>
            ))}
          </select>
        </div>
        {/* User search */}
        <div className="flex items-center gap-2 flex-1">
          <Search size={14} style={{ color: "#A8967E" }} />
          <input
            type="text"
            value={userSearch}
            onChange={(e) => setUserSearch(e.target.value)}
            placeholder="Search by user ID..."
            className="text-xs px-3 py-2 rounded-lg border focus:outline-none w-full"
            style={{
              backgroundColor: "rgba(245,215,160,0.05)",
              borderColor: "rgba(245,215,160,0.2)",
              color: "#F5EFE6",
            }}
          />
        </div>
      </div>

      {/* Table */}
      {loading && logs.length === 0 ? (
        <div className="text-center py-8 text-sm" style={{ color: "#A8967E" }}>
          Loading audit logs...
        </div>
      ) : logs.length === 0 ? (
        <div className="text-center py-8 text-sm" style={{ color: "#A8967E" }}>
          No audit events found.
        </div>
      ) : (
        <div className="overflow-x-auto -mx-4 md:mx-0">
          <table className="w-full text-xs" style={{ minWidth: 640 }}>
            <thead>
              <tr style={{ borderBottom: "1px solid rgba(245,215,160,0.15)" }}>
                {["Date", "User", "Action", "Resource", "IP", "Success"].map((h) => (
                  <th
                    key={h}
                    className="text-left px-3 py-2.5 font-semibold uppercase tracking-wider"
                    style={{ color: "#A8967E", fontSize: 10 }}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {logs.map((log) => {
                const actionColor = ACTION_COLORS[log.action] ?? "#78716C";
                return (
                  <tr
                    key={log.id}
                    className="transition-colors"
                    style={{ borderBottom: "1px solid rgba(245,215,160,0.07)" }}
                    onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "rgba(245,215,160,0.04)")}
                    onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "transparent")}
                  >
                    <td className="px-3 py-2.5" style={{ color: "#D4C5A9" }}>
                      {formatDate(log.created_at)}
                    </td>
                    <td className="px-3 py-2.5 font-mono" style={{ color: "#D4C5A9" }}>
                      {log.actor_id
                        ? log.actor_id === "admin"
                          ? "admin"
                          : log.actor_id.slice(0, 12) + "..."
                        : "-"}
                    </td>
                    <td className="px-3 py-2.5">
                      <span
                        className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold"
                        style={{
                          backgroundColor: `${actionColor}15`,
                          color: actionColor,
                        }}
                      >
                        {log.action.replace(/_/g, " ")}
                      </span>
                    </td>
                    <td className="px-3 py-2.5 font-mono" style={{ color: "#D4C5A9" }}>
                      {log.target_id
                        ? log.target_id.slice(0, 12) + "..."
                        : log.entity_type ?? "-"}
                    </td>
                    <td className="px-3 py-2.5" style={{ color: "#A8967E" }}>
                      {log.ip ?? "-"}
                    </td>
                    <td className="px-3 py-2.5">
                      <div
                        className="w-2 h-2 rounded-full mx-auto"
                        style={{ backgroundColor: "#10B981" }}
                        title="Success"
                      />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Pagination */}
      {total > LIMIT && (
        <div className="flex items-center justify-between mt-4 pt-3" style={{ borderTop: "1px solid rgba(245,215,160,0.1)" }}>
          <span className="text-xs" style={{ color: "#A8967E" }}>
            Page {page} of {totalPages} ({total} total)
          </span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
              className="flex items-center gap-1 text-xs px-3 py-1.5 rounded-lg font-medium transition-colors disabled:opacity-30"
              style={{ backgroundColor: "rgba(245,215,160,0.08)", color: "#F5EFE6" }}
            >
              <ChevronLeft size={12} />
              Prev
            </button>
            <button
              type="button"
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages}
              className="flex items-center gap-1 text-xs px-3 py-1.5 rounded-lg font-medium transition-colors disabled:opacity-30"
              style={{ backgroundColor: "rgba(245,215,160,0.08)", color: "#F5EFE6" }}
            >
              Next
              <ChevronRight size={12} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
