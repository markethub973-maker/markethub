"use client";
import { useState, useEffect, useCallback } from "react";
import { Shield, AlertTriangle, CheckCircle, Loader2, RefreshCw, Trash2, Eye } from "lucide-react";

interface SecurityEvent {
  id: string; event_type: string; severity: string;
  ip: string | null; path: string | null; user_id: string | null;
  details: Record<string, unknown>; resolved: boolean; created_at: string;
}

const SEV_COLORS: Record<string, { bg: string; color: string }> = {
  critical: { bg: "rgba(239,68,68,0.15)",  color: "#EF4444" },
  high:     { bg: "rgba(245,158,11,0.12)", color: "#F59E0B" },
  medium:   { bg: "rgba(99,102,241,0.1)",  color: "#6366F1" },
  low:      { bg: "rgba(100,116,139,0.1)", color: "#64748B" },
  info:     { bg: "rgba(16,185,129,0.08)", color: "#10B981" },
};

function fmtDate(iso: string) {
  return new Date(iso).toLocaleString("en-GB", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });
}

export default function AdminSecurityPanel() {
  const [events, setEvents] = useState<SecurityEvent[]>([]);
  const [stats, setStats] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");
  const [resolving, setResolving] = useState<string | null>(null);

  const load = useCallback(() => {
    setLoading(true);
    fetch("/api/admin/security-events?limit=200").then(r => r.json())
      .then(d => { if (d.events) { setEvents(d.events); setStats(d.by_severity ?? {}); } })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  const resolve = async (id: string) => {
    setResolving(id);
    await fetch("/api/admin/security-events", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id }) });
    setEvents(p => p.map(e => e.id === id ? { ...e, resolved: true } : e));
    setResolving(null);
  };

  const cleanup = async () => {
    await fetch("/api/admin/security-events", { method: "DELETE" });
    load();
  };

  const filtered = events.filter(e => filter === "all" ? !e.resolved : filter === "resolved" ? e.resolved : e.severity === filter);
  const unresolved = events.filter(e => !e.resolved);
  const critical = unresolved.filter(e => e.severity === "critical").length;

  return (
    <div className="space-y-4">
      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
        {[
          { label: "Total activ", value: unresolved.length, color: "#F5D7A0" },
          { label: "Critical", value: stats.critical ?? 0, color: "#EF4444" },
          { label: "High", value: stats.high ?? 0, color: "#F59E0B" },
          { label: "Medium", value: stats.medium ?? 0, color: "#6366F1" },
          { label: "Low/Info", value: (stats.low ?? 0) + (stats.info ?? 0), color: "#10B981" },
        ].map(s => (
          <div key={s.label} className="rounded-xl p-3 text-center" style={{ backgroundColor: "#FFFCF7", border: "1px solid rgba(245,215,160,0.25)" }}>
            <p className="text-xl font-bold" style={{ color: s.color }}>{s.value}</p>
            <p className="text-xs" style={{ color: "#A8967E" }}>{s.label}</p>
          </div>
        ))}
      </div>

      {/* Actions */}
      <div className="flex gap-2 flex-wrap">
        {["all", "critical", "high", "medium", "low", "resolved"].map(f => (
          <button key={f} type="button" onClick={() => setFilter(f)}
            className="text-xs px-3 py-1.5 rounded-lg font-medium transition-all capitalize"
            style={filter === f
              ? { backgroundColor: f === "all" ? "#292524" : SEV_COLORS[f]?.bg ?? "#292524", color: f === "all" ? "#FFF8F0" : SEV_COLORS[f]?.color ?? "#FFF8F0" }
              : { backgroundColor: "rgba(245,215,160,0.1)", color: "#78614E" }}>
            {f}
          </button>
        ))}
        <button type="button" onClick={load} className="ml-auto p-1.5 rounded-lg" style={{ color: "#A8967E" }}>
          <RefreshCw className="w-4 h-4" />
        </button>
        <button type="button" onClick={cleanup} className="text-xs px-3 py-1.5 rounded-lg" style={{ backgroundColor: "rgba(239,68,68,0.08)", color: "#EF4444" }}>
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center py-8"><Loader2 className="w-5 h-5 animate-spin" style={{ color: "#F59E0B" }} /></div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-8">
          <CheckCircle className="w-8 h-8 mx-auto mb-2" style={{ color: "#10B981" }} />
          <p className="text-sm" style={{ color: "#78614E" }}>Niciun eveniment în categoria selectată</p>
        </div>
      ) : (
        <div className="space-y-1.5 max-h-[500px] overflow-y-auto">
          {filtered.map(e => {
            const sev = SEV_COLORS[e.severity] ?? SEV_COLORS.info;
            return (
              <div key={e.id} className="rounded-xl px-3 py-2.5 flex items-center gap-3"
                style={{ backgroundColor: e.resolved ? "rgba(245,215,160,0.04)" : "#FFFCF7", border: `1px solid ${e.resolved ? "rgba(245,215,160,0.1)" : "rgba(245,215,160,0.25)"}`, opacity: e.resolved ? 0.6 : 1 }}>
                <span className="text-[10px] px-1.5 py-0.5 rounded font-bold shrink-0"
                  style={{ backgroundColor: sev.bg, color: sev.color }}>{e.severity.toUpperCase()}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold truncate" style={{ color: "#292524" }}>{e.event_type}</p>
                  <p className="text-[10px] truncate" style={{ color: "#A8967E" }}>
                    {e.ip && `IP: ${e.ip}`}{e.path && ` · ${e.path}`} · {fmtDate(e.created_at)}
                  </p>
                </div>
                {!e.resolved && (
                  <button type="button" onClick={() => resolve(e.id)} disabled={resolving === e.id}
                    className="p-1 rounded shrink-0" title="Mark resolved" style={{ color: "#10B981" }}>
                    {resolving === e.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle className="w-3.5 h-3.5" />}
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
