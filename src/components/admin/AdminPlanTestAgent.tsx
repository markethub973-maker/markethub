"use client";

import { useState, useEffect } from "react";
import { FlaskConical, Play, RefreshCw, CheckCircle, XCircle, AlertCircle, ChevronDown, ChevronUp } from "lucide-react";

const PLAN_ORDER = ["free_test", "lite", "pro", "business", "enterprise"] as const;
type PlanId = typeof PLAN_ORDER[number];

const PLAN_LABELS: Record<PlanId, string> = {
  free_test: "Free Trial",
  lite: "Lite — $24",
  pro: "Pro — $49",
  business: "Business — $99",
  enterprise: "Enterprise — $249",
};

const PLAN_COLORS: Record<PlanId, string> = {
  free_test: "#78614E",
  lite: "#F59E0B",
  pro: "#8B5CF6",
  business: "#E1306C",
  enterprise: "#16A34A",
};

interface MatrixData {
  matrix: Record<string, Record<string, boolean>>;
  accountStatus: Record<string, {
    email: string;
    exists: boolean;
    dbPlan: string | null;
    planMatch: boolean;
  }>;
  routes: Array<{ route: string; label: string; minPlan: string }>;
  plans: string[];
}

interface LiveResult {
  plan: string;
  loginOk: boolean;
  routes: Array<{
    route: string;
    label: string;
    expectedAccess: boolean;
    actualAccess: "accessible" | "blocked" | "error";
    ok: boolean;
  }>;
  passed: number;
  failed: number;
  errors: number;
}

export default function AdminPlanTestAgent() {
  const [matrix, setMatrix] = useState<MatrixData | null>(null);
  const [loadingMatrix, setLoadingMatrix] = useState(true);
  const [liveResults, setLiveResults] = useState<Record<string, LiveResult> | null>(null);
  const [runningPlan, setRunningPlan] = useState<string | null>(null);
  const [expandedPlan, setExpandedPlan] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"matrix" | "live">("matrix");

  const fetchMatrix = async () => {
    setLoadingMatrix(true);
    try {
      const res = await fetch("/api/admin/plan-test-agent");
      const data = await res.json();
      setMatrix(data);
    } catch {}
    setLoadingMatrix(false);
  };

  useEffect(() => { fetchMatrix(); }, []);

  const runLiveTest = async (plan?: string) => {
    setRunningPlan(plan ?? "all");
    setActiveTab("live");
    try {
      const res = await fetch("/api/admin/plan-test-agent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(plan ? { plan } : {}),
      });
      const data = await res.json();
      setLiveResults(prev => ({ ...(prev ?? {}), ...data.results }));
    } catch {}
    setRunningPlan(null);
  };

  const allLivePassed = liveResults
    ? Object.values(liveResults).every(r => r.loginOk && r.failed === 0 && r.errors === 0)
    : null;

  return (
    <div className="bg-[#1a1d27] border border-white/10 rounded-2xl p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center">
            <FlaskConical className="w-4 h-4 text-purple-400" />
          </div>
          <div>
            <h3 className="font-semibold text-white">Plan Testing Agent</h3>
            <p className="text-xs text-gray-400">Verifică accesul corect la features pentru fiecare plan</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={fetchMatrix}
            className="p-2 rounded-lg text-gray-400 hover:text-white hover:bg-white/5 transition-all"
            title="Refresh matrix"
          >
            <RefreshCw className={`w-4 h-4 ${loadingMatrix ? "animate-spin" : ""}`} />
          </button>
          <button
            type="button"
            onClick={() => runLiveTest()}
            disabled={!!runningPlan}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all"
            style={{
              background: "rgba(168,85,247,0.15)",
              color: "#a855f7",
              border: "1px solid rgba(168,85,247,0.3)",
              opacity: runningPlan ? 0.6 : 1,
            }}
          >
            {runningPlan === "all" ? (
              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Play className="w-3.5 h-3.5" />
            )}
            Testează Toate Planurile
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-5 bg-white/5 rounded-xl p-1 w-fit">
        {(["matrix", "live"] as const).map(tab => (
          <button
            key={tab}
            type="button"
            onClick={() => setActiveTab(tab)}
            className="px-4 py-1.5 rounded-lg text-sm font-medium transition-all"
            style={activeTab === tab
              ? { background: "rgba(168,85,247,0.2)", color: "#a855f7" }
              : { color: "#6b7280" }
            }
          >
            {tab === "matrix" ? "Matrice Acces" : "Test Live"}
          </button>
        ))}
      </div>

      {/* ── Matrix Tab ──────────────────────────────────────────────────────── */}
      {activeTab === "matrix" && (
        <div>
          {/* Account Status Row */}
          <div className="mb-5">
            <p className="text-xs text-gray-500 mb-2 font-medium uppercase tracking-wide">Conturi de test în baza de date</p>
            <div className="grid grid-cols-3 gap-2 md:grid-cols-5">
              {PLAN_ORDER.map(planId => {
                const status = matrix?.accountStatus[planId];
                return (
                  <div
                    key={planId}
                    className="rounded-xl p-2.5 text-center"
                    style={{
                      background: status?.exists && status?.planMatch
                        ? `${PLAN_COLORS[planId]}15`
                        : "rgba(255,255,255,0.03)",
                      border: `1px solid ${status?.exists && status?.planMatch
                        ? `${PLAN_COLORS[planId]}30`
                        : "rgba(255,255,255,0.08)"}`,
                    }}
                  >
                    <p className="text-xs font-medium mb-1" style={{ color: PLAN_COLORS[planId] }}>
                      {PLAN_LABELS[planId]}
                    </p>
                    {loadingMatrix ? (
                      <div className="h-4 bg-white/5 rounded animate-pulse" />
                    ) : status?.exists && status?.planMatch ? (
                      <CheckCircle className="w-4 h-4 mx-auto text-green-400" />
                    ) : status?.exists ? (
                      <div className="flex items-center justify-center gap-1">
                        <AlertCircle className="w-3.5 h-3.5 text-yellow-400" />
                        <span className="text-xs text-yellow-400">{status.dbPlan ?? "?"}</span>
                      </div>
                    ) : (
                      <XCircle className="w-4 h-4 mx-auto text-red-400" />
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Access Matrix */}
          {loadingMatrix ? (
            <div className="h-48 flex items-center justify-center">
              <RefreshCw className="w-6 h-6 text-gray-500 animate-spin" />
            </div>
          ) : matrix ? (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr>
                    <th className="text-left text-xs text-gray-500 font-medium pb-3 pr-4 whitespace-nowrap">Feature / Rută</th>
                    {PLAN_ORDER.map(planId => (
                      <th key={planId} className="text-center pb-3 px-2 whitespace-nowrap">
                        <span className="text-xs font-semibold" style={{ color: PLAN_COLORS[planId] }}>
                          {PLAN_LABELS[planId]}
                        </span>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {matrix.routes.map(({ route, label, minPlan }) => (
                    <tr key={route} className="hover:bg-white/2">
                      <td className="py-2 pr-4">
                        <div>
                          <span className="text-white text-xs font-medium">{label}</span>
                          <span className="text-gray-600 text-xs ml-2 font-mono">{route}</span>
                        </div>
                        <span className="text-xs text-gray-600">
                          Min: <span style={{ color: PLAN_COLORS[minPlan as PlanId] ?? "#888" }}>{PLAN_LABELS[minPlan as PlanId] ?? minPlan}</span>
                        </span>
                      </td>
                      {PLAN_ORDER.map(planId => {
                        const hasAccess = matrix.matrix[planId]?.[route] ?? false;
                        return (
                          <td key={planId} className="text-center py-2 px-2">
                            {hasAccess ? (
                              <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-emerald-500/15">
                                <CheckCircle className="w-3.5 h-3.5 text-emerald-400" />
                              </span>
                            ) : (
                              <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-white/3">
                                <span className="w-3.5 h-3.5 text-gray-700 text-xs font-bold flex items-center justify-center">✕</span>
                              </span>
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-gray-500 text-sm">Nu s-au putut încărca datele.</p>
          )}
        </div>
      )}

      {/* ── Live Test Tab ────────────────────────────────────────────────── */}
      {activeTab === "live" && (
        <div className="space-y-3">
          {/* Summary banner */}
          {liveResults && allLivePassed !== null && (
            <div
              className="flex items-center gap-3 px-4 py-3 rounded-xl mb-4"
              style={{
                background: allLivePassed ? "rgba(34,197,94,0.1)" : "rgba(239,68,68,0.1)",
                border: `1px solid ${allLivePassed ? "rgba(34,197,94,0.2)" : "rgba(239,68,68,0.2)"}`,
              }}
            >
              {allLivePassed
                ? <CheckCircle className="w-5 h-5 text-green-400 flex-shrink-0" />
                : <XCircle className="w-5 h-5 text-red-400 flex-shrink-0" />}
              <p className="text-sm font-medium" style={{ color: allLivePassed ? "#4ade80" : "#f87171" }}>
                {allLivePassed
                  ? "Toate testele au trecut — accesul la features este corect configurat."
                  : "Unele teste au eșuat — verifică detaliile de mai jos."}
              </p>
            </div>
          )}

          {!liveResults && !runningPlan && (
            <div className="flex flex-col items-center justify-center py-12 text-center gap-3">
              <FlaskConical className="w-10 h-10 text-gray-700" />
              <p className="text-gray-500 text-sm">Apasă <strong className="text-gray-400">Testează Toate Planurile</strong> pentru a rula testele live.</p>
              <p className="text-gray-600 text-xs max-w-sm">
                Agentul se loghează cu fiecare cont de test și verifică că rutele restricționate returnează redirect corect.
              </p>
            </div>
          )}

          {runningPlan && (
            <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-purple-500/10 border border-purple-500/20">
              <RefreshCw className="w-4 h-4 text-purple-400 animate-spin flex-shrink-0" />
              <p className="text-sm text-purple-300">
                Testare în curs{runningPlan !== "all" ? ` — ${PLAN_LABELS[runningPlan as PlanId] ?? runningPlan}` : " — toate planurile"}...
              </p>
            </div>
          )}

          {/* Per-plan results */}
          {PLAN_ORDER.map(planId => {
            const result = liveResults?.[planId];
            if (!result) return null;
            const isExpanded = expandedPlan === planId;
            const totalTests = result.routes.length;
            const color = PLAN_COLORS[planId];
            const allOk = result.loginOk && result.failed === 0 && result.errors === 0;

            return (
              <div
                key={planId}
                className="rounded-xl border overflow-hidden"
                style={{ borderColor: allOk ? `${color}30` : "rgba(239,68,68,0.3)" }}
              >
                {/* Plan header */}
                <div
                  className="flex items-center gap-3 p-4 cursor-pointer"
                  style={{ background: allOk ? `${color}08` : "rgba(239,68,68,0.05)" }}
                  onClick={() => setExpandedPlan(isExpanded ? null : planId)}
                >
                  {allOk
                    ? <CheckCircle className="w-4 h-4 text-green-400 flex-shrink-0" />
                    : <XCircle className="w-4 h-4 text-red-400 flex-shrink-0" />}

                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-white text-sm">{PLAN_LABELS[planId]}</span>
                      {!result.loginOk && (
                        <span className="text-xs px-2 py-0.5 rounded-full bg-red-500/20 text-red-400">
                          Login eșuat
                        </span>
                      )}
                    </div>
                    {result.loginOk && (
                      <p className="text-xs text-gray-500 mt-0.5">
                        {result.passed}/{totalTests} teste trecute
                        {result.failed > 0 && <span className="text-red-400 ml-2">· {result.failed} eșuate</span>}
                        {result.errors > 0 && <span className="text-yellow-400 ml-2">· {result.errors} erori</span>}
                      </p>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); runLiveTest(planId); }}
                      disabled={!!runningPlan}
                      className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium transition-all"
                      style={{ background: `${color}20`, color, border: `1px solid ${color}30`, opacity: runningPlan ? 0.5 : 1 }}
                    >
                      {runningPlan === planId
                        ? <RefreshCw className="w-3 h-3 animate-spin" />
                        : <Play className="w-3 h-3" />}
                      Retestează
                    </button>
                    {isExpanded ? <ChevronUp className="w-4 h-4 text-gray-500" /> : <ChevronDown className="w-4 h-4 text-gray-500" />}
                  </div>
                </div>

                {/* Expanded route results */}
                {isExpanded && result.loginOk && (
                  <div className="border-t border-white/5">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="border-b border-white/5">
                          <th className="text-left px-4 py-2 text-gray-600 font-medium">Rută</th>
                          <th className="text-center px-4 py-2 text-gray-600 font-medium">Așteptat</th>
                          <th className="text-center px-4 py-2 text-gray-600 font-medium">Actual</th>
                          <th className="text-center px-4 py-2 text-gray-600 font-medium">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/3">
                        {result.routes.map(r => (
                          <tr key={r.route} className={r.ok ? "" : "bg-red-500/5"}>
                            <td className="px-4 py-2">
                              <span className="text-white font-medium">{r.label}</span>
                              <span className="text-gray-600 ml-2 font-mono">{r.route}</span>
                            </td>
                            <td className="px-4 py-2 text-center">
                              <span className={r.expectedAccess ? "text-green-400" : "text-gray-500"}>
                                {r.expectedAccess ? "✓ Acces" : "✕ Blocat"}
                              </span>
                            </td>
                            <td className="px-4 py-2 text-center">
                              {r.actualAccess === "accessible" && <span className="text-green-400">✓ Acces</span>}
                              {r.actualAccess === "blocked" && <span className="text-gray-500">✕ Blocat</span>}
                              {r.actualAccess === "error" && <span className="text-yellow-400">⚠ Eroare</span>}
                            </td>
                            <td className="px-4 py-2 text-center">
                              {r.actualAccess === "error" ? (
                                <AlertCircle className="w-3.5 h-3.5 text-yellow-400 mx-auto" />
                              ) : r.ok ? (
                                <CheckCircle className="w-3.5 h-3.5 text-green-400 mx-auto" />
                              ) : (
                                <XCircle className="w-3.5 h-3.5 text-red-400 mx-auto" />
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
