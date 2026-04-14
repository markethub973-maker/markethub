"use client";

import { useState } from "react";
import { RotateCcw, CheckCircle2, XCircle, Loader2, ChevronDown, ExternalLink, Shield, Activity } from "lucide-react";

const card = {
  backgroundColor: "var(--color-bg-secondary)",
  border: "1px solid rgba(245,215,160,0.25)",
  boxShadow: "0 1px 3px rgba(120,97,78,0.08)",
};

interface Deployment {
  id: string;
  url: string;
  createdAt: number;
  state: string;
}

interface HealthCheck {
  checked_at: string;
  all_ok: boolean;
  failed_services: string[];
  auto_redeploy?: boolean;
}

export default function AdminRestorePanel() {
  const [deployments, setDeployments] = useState<Deployment[]>([]);
  const [loadingDeploys, setLoadingDeploys] = useState(false);
  const [restoring, setRestoring] = useState(false);
  const [result, setResult] = useState<{ ok: boolean; message: string; url?: string } | null>(null);
  const [healthLogs, setHealthLogs] = useState<HealthCheck[]>([]);
  const [loadingHealth, setLoadingHealth] = useState(false);
  const [activeTab, setActiveTab] = useState<"restore" | "health">("health");
  const [sessionExpired, setSessionExpired] = useState(false);

  const loadDeployments = async () => {
    setLoadingDeploys(true);
    setResult(null);
    try {
      const res = await fetch("/api/admin/restore", { credentials: "include" });
      const data = await res.json();
      setDeployments(data.deployments ?? []);
    } catch {
      setDeployments([]);
    } finally {
      setLoadingDeploys(false);
    }
  };

  const handleRestore = async (skipLatest = false) => {
    setRestoring(true);
    setResult(null);
    try {
      const res = await fetch("/api/admin/restore", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ skipLatest }),
      });
      const data = await res.json();
      if (data.ok) {
        setResult({ ok: true, message: data.message, url: data.inspectorUrl });
      } else {
        setResult({ ok: false, message: data.error ?? "Restore failed" });
      }
    } catch (e: any) {
      setResult({ ok: false, message: e.message });
    } finally {
      setRestoring(false);
    }
  };

  const loadHealthLogs = async () => {
    setLoadingHealth(true);
    setSessionExpired(false);
    try {
      const res = await fetch("/api/cron/health-monitor", { credentials: "include" });
      if (res.status === 401 || res.status === 403) {
        setSessionExpired(true);
        setHealthLogs([]);
        return;
      }
      const data = await res.json();
      // Fresh check result as first entry
      setHealthLogs([{
        checked_at: data.timestamp ?? new Date().toISOString(),
        all_ok: data.ok ?? false,
        failed_services: data.failedServices ?? [],
        auto_redeploy: data.autoRedeployTriggered,
      }]);
    } catch {
      setHealthLogs([]);
    } finally {
      setLoadingHealth(false);
    }
  };

  return (
    <div className="rounded-2xl overflow-hidden" style={card}>
      {/* Header */}
      <div className="flex items-center justify-between p-5" style={{ borderBottom: "1px solid rgba(245,215,160,0.2)" }}>
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: "rgba(99,102,241,0.1)", color: "#6366F1" }}>
            <Shield size={18} />
          </div>
          <div>
            <p className="font-bold text-sm" style={{ color: "var(--color-text)" }}>Sistema Restore & Health Monitor</p>
            <p className="text-xs" style={{ color: "#A8967E" }}>Auto-redeploy pe 3 consecutive failures · HMAC webhooks · Rate limiting activ</p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex" style={{ borderBottom: "1px solid rgba(245,215,160,0.2)" }}>
        {(["health", "restore"] as const).map((tab) => (
          <button
            key={tab}
            type="button"
            onClick={() => setActiveTab(tab)}
            className="flex-1 py-2.5 text-xs font-semibold transition-all"
            style={{
              color: activeTab === tab ? "#6366F1" : "#A8967E",
              borderBottom: activeTab === tab ? "2px solid #6366F1" : "2px solid transparent",
            }}
          >
            {tab === "health" ? "Health Check" : "Restore Deployment"}
          </button>
        ))}
      </div>

      <div className="p-5">
        {/* Health Tab */}
        {activeTab === "health" && (
          <div className="space-y-4">
            <p className="text-xs" style={{ color: "#A8967E" }}>
              Rulează un health check live pe toate serviciile externe. Dacă 3 consecutive checks eșuează, se declanșează auto-redeploy via Vercel API.
            </p>

            <button
              type="button"
              onClick={loadHealthLogs}
              disabled={loadingHealth}
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all hover:opacity-90"
              style={{ background: "linear-gradient(135deg, #6366F1, #4F46E5)", color: "white" }}
            >
              {loadingHealth ? <Loader2 size={14} className="animate-spin" /> : <Activity size={14} />}
              {loadingHealth ? "Se verifică..." : "Run Health Check Now"}
            </button>

            {sessionExpired && (
              <div className="rounded-xl p-4 text-xs space-y-1"
                style={{ background: "rgba(239,68,68,0.06)", border: "1px solid rgba(239,68,68,0.2)", color: "#DC2626" }}>
                <p className="font-semibold">Sesiune admin expirată</p>
                <p style={{ color: "#A8967E" }}>
                  Re-loghează-te la{" "}
                  <a href="/markethub973" className="underline" style={{ color: "#6366F1" }}>/markethub973</a>{" "}
                  apoi rerulează health check-ul.
                </p>
              </div>
            )}

            {healthLogs.map((log, i) => (
              <div key={i} className="rounded-xl p-4 space-y-2" style={{
                background: log.all_ok ? "rgba(34,197,94,0.04)" : "rgba(239,68,68,0.04)",
                border: `1px solid ${log.all_ok ? "rgba(34,197,94,0.2)" : "rgba(239,68,68,0.2)"}`,
              }}>
                <div className="flex items-center gap-2">
                  {log.all_ok
                    ? <CheckCircle2 size={15} className="text-green-500" />
                    : <XCircle size={15} className="text-red-500" />}
                  <span className="font-semibold text-xs" style={{ color: log.all_ok ? "#16A34A" : "#DC2626" }}>
                    {log.all_ok ? "Toate serviciile funcționează" : `Servicii cu probleme: ${log.failed_services.join(", ")}`}
                  </span>
                </div>
                <p className="text-xs" style={{ color: "#A8967E" }}>
                  {new Date(log.checked_at).toLocaleString("ro-RO")}
                  {log.auto_redeploy && " · Auto-redeploy declanșat ⚡"}
                </p>
              </div>
            ))}
          </div>
        )}

        {/* Restore Tab */}
        {activeTab === "restore" && (
          <div className="space-y-4">
            <p className="text-xs" style={{ color: "#A8967E" }}>
              Redeploy producția la ultimul deployment stabil. Útil când o actualizare recentă a cauzat probleme.
            </p>

            <div className="flex gap-2 flex-wrap">
              <button
                type="button"
                onClick={() => handleRestore(false)}
                disabled={restoring}
                className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all hover:opacity-90"
                style={{ background: "linear-gradient(135deg, var(--color-primary), var(--color-primary-hover))", color: "white" }}
              >
                {restoring ? <Loader2 size={14} className="animate-spin" /> : <RotateCcw size={14} />}
                Restore ultimul deployment
              </button>

              <button
                type="button"
                onClick={loadDeployments}
                disabled={loadingDeploys}
                className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all hover:opacity-80"
                style={{ background: "rgba(0,0,0,0.04)", color: "#5C4A35", border: "1px solid rgba(245,215,160,0.3)" }}
              >
                {loadingDeploys ? <Loader2 size={14} className="animate-spin" /> : <ChevronDown size={14} />}
                Vezi deployments recente
              </button>
            </div>

            {/* Result */}
            {result && (
              <div className="rounded-xl p-4" style={{
                background: result.ok ? "rgba(34,197,94,0.04)" : "rgba(239,68,68,0.04)",
                border: `1px solid ${result.ok ? "rgba(34,197,94,0.2)" : "rgba(239,68,68,0.2)"}`,
              }}>
                <div className="flex items-center gap-2">
                  {result.ok
                    ? <CheckCircle2 size={15} className="text-green-500" />
                    : <XCircle size={15} className="text-red-500" />}
                  <span className="text-xs font-semibold" style={{ color: result.ok ? "#16A34A" : "#DC2626" }}>
                    {result.message}
                  </span>
                  {result.ok && result.url && (
                    <a href={result.url} target="_blank" rel="noreferrer"
                       className="ml-auto flex items-center gap-1 text-xs" style={{ color: "#6366F1" }}>
                      <ExternalLink size={11} /> Inspector
                    </a>
                  )}
                </div>
              </div>
            )}

            {/* Deployments list */}
            {deployments.length > 0 && (
              <div className="space-y-2">
                <p className="text-xs font-bold uppercase tracking-wider" style={{ color: "#A8967E" }}>Deployments recente</p>
                {deployments.map((d) => (
                  <div key={d.id} className="flex items-center justify-between rounded-lg px-3 py-2"
                       style={{ background: "rgba(0,0,0,0.02)", border: "1px solid rgba(245,215,160,0.2)" }}>
                    <div>
                      <p className="text-xs font-mono font-medium" style={{ color: "var(--color-text)" }}>{d.id.slice(0, 12)}…</p>
                      <p className="text-xs" style={{ color: "#A8967E" }}>
                        {new Date(d.createdAt).toLocaleString("ro-RO")} · {d.url}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleRestore(false)}
                      disabled={restoring}
                      className="text-xs px-3 py-1 rounded-lg font-bold transition-all hover:opacity-80"
                      style={{ background: "rgba(99,102,241,0.1)", color: "#6366F1", border: "1px solid rgba(99,102,241,0.2)" }}
                    >
                      Restore
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
