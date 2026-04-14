"use client";

/**
 * CEO Brain Command Center — admin-only strategic dashboard.
 *
 * Phase 2 (current): operator opens this page → Brain analyzes state
 * + returns 3-5 recommendations. Operator executes manually by clicking
 * into the relevant tool.
 *
 * Phase 3 (future): Brain runs on a cron, auto-executes high-priority
 * items, and logs results here for review.
 */

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  Brain, Loader2, RefreshCw, ArrowRight, Zap, AlertCircle,
  TrendingUp, Users, DollarSign, FileText, Target, Sparkles,
} from "lucide-react";

interface State {
  total_users: number;
  paying_users: number;
  trial_users: number;
  mrr_usd: number;
  new_signups_7d: number;
  published_posts_30d: number;
  scheduled_posts_next_7d: number;
  leads_total: number;
  leads_new_7d: number;
  ai_assets_30d: number;
  brand_voice_configured: boolean;
  content_strategy_configured: boolean;
}

interface Recommendation {
  action: string;
  why: string;
  priority: "high" | "medium" | "low";
  tool: string;
  app_path: string;
  estimated_hours?: number;
}

interface BrainResponse {
  ok: boolean;
  generated_at: string;
  state: State;
  summary_headline: string;
  recommendations: Recommendation[];
  error?: string;
}

const PRIO_META: Record<string, { color: string; bg: string; label: string }> = {
  high:   { color: "#B91C1C", bg: "rgba(239, 68, 68, 0.10)",  label: "HIGH" },
  medium: { color: "#D97706", bg: "rgba(245, 158, 11, 0.10)", label: "MEDIUM" },
  low:    { color: "#059669", bg: "rgba(16, 185, 129, 0.10)", label: "LOW" },
};

export default function BrainCommandCenterPage() {
  const [data, setData] = useState<BrainResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/brain/advisor", { cache: "no-store" });
      const d = (await res.json()) as BrainResponse;
      if (!res.ok) throw new Error(d.error ?? "Failed");
      setData(d);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  return (
    <div className="min-h-screen" style={{ backgroundColor: "var(--color-bg-secondary)" }}>
      <main className="max-w-6xl mx-auto px-6 py-6 space-y-5">
        {/* Header */}
        <div className="flex items-center gap-3 flex-wrap">
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center"
            style={{ background: "linear-gradient(135deg, var(--color-primary), var(--color-accent))" }}
          >
            <Brain className="w-5 h-5 text-white" />
          </div>
          <div className="flex-1">
            <h1 className="text-2xl font-bold" style={{ color: "var(--color-text)" }}>
              CEO Brain · Command Center
            </h1>
            <p className="text-xs" style={{ color: "#78614E" }}>
              Strategic advisor · analyzes platform state · recommends next moves
            </p>
          </div>
          <button
            type="button"
            onClick={load}
            disabled={loading}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold disabled:opacity-40"
            style={{ background: "linear-gradient(135deg, var(--color-primary), var(--color-primary-hover))", color: "#1C1814" }}
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
            {loading ? "Thinking..." : "Re-analyze"}
          </button>
        </div>

        {error && (
          <div
            className="rounded-xl p-4 flex items-start gap-3"
            style={{ backgroundColor: "rgba(239, 68, 68, 0.06)", border: "1px solid rgba(239, 68, 68, 0.25)" }}
          >
            <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" style={{ color: "#EF4444" }} />
            <div className="flex-1">
              <p className="text-sm font-bold" style={{ color: "#B91C1C" }}>Brain couldn&apos;t analyze</p>
              <p className="text-xs mt-1" style={{ color: "#78614E" }}>{error}</p>
            </div>
          </div>
        )}

        {data && (
          <>
            {/* Summary headline */}
            {data.summary_headline && (
              <section
                className="rounded-2xl p-5"
                style={{
                  background: "linear-gradient(135deg, rgba(245,158,11,0.08), rgba(139,92,246,0.08))",
                  border: "1px solid rgba(245,158,11,0.25)",
                }}
              >
                <div className="flex items-start gap-3">
                  <Sparkles className="w-5 h-5 flex-shrink-0 mt-0.5" style={{ color: "var(--color-primary)" }} />
                  <p className="text-base" style={{ color: "var(--color-text)", lineHeight: 1.5 }}>
                    {data.summary_headline}
                  </p>
                </div>
              </section>
            )}

            {/* State snapshot grid */}
            <section>
              <p className="text-xs font-bold uppercase tracking-wide mb-3" style={{ color: "#78614E" }}>
                Current state
              </p>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <StatTile icon={DollarSign} label="MRR"               value={`$${data.state.mrr_usd}`}        sub={`${data.state.paying_users} paying`} />
                <StatTile icon={Users}      label="Total users"       value={String(data.state.total_users)}  sub={`+${data.state.new_signups_7d} this week`} />
                <StatTile icon={Users}      label="Trials active"     value={String(data.state.trial_users)}  sub="→ convert or churn" />
                <StatTile icon={FileText}   label="Scheduled next 7d" value={String(data.state.scheduled_posts_next_7d)} sub={`${data.state.published_posts_30d} published 30d`} />
                <StatTile icon={Target}     label="Leads total"       value={String(data.state.leads_total)}  sub={`+${data.state.leads_new_7d} this week`} />
                <StatTile icon={Sparkles}   label="AI assets 30d"     value={String(data.state.ai_assets_30d)} sub="images + videos + audio" />
                <StatTile icon={TrendingUp} label="Brand Voice"       value={data.state.brand_voice_configured ? "✓ set" : "✗ missing"} sub={data.state.content_strategy_configured ? "+ strategy ✓" : "+ strategy missing"} good={data.state.brand_voice_configured} bad={!data.state.brand_voice_configured} />
                <StatTile icon={Zap}        label="Reviewed"          value={new Date(data.generated_at).toLocaleTimeString()} sub="Re-analyze to refresh" />
              </div>
            </section>

            {/* Recommendations */}
            <section className="space-y-3">
              <div className="flex items-center gap-2">
                <p className="text-xs font-bold uppercase tracking-wide flex-1" style={{ color: "#78614E" }}>
                  Next moves · {data.recommendations.length} recommendation{data.recommendations.length === 1 ? "" : "s"}
                </p>
                <span className="text-[10px]" style={{ color: "#A8967E" }}>
                  Sorted by priority
                </span>
              </div>

              {data.recommendations.length === 0 && (
                <div
                  className="rounded-xl p-8 text-center"
                  style={{ backgroundColor: "white", border: "1px dashed rgba(0,0,0,0.1)" }}
                >
                  <p className="text-sm" style={{ color: "#78614E" }}>
                    No recommendations. Either everything is on track — or state data was insufficient.
                  </p>
                </div>
              )}

              {data.recommendations
                .slice()
                .sort((a, b) => {
                  const order = { high: 0, medium: 1, low: 2 };
                  return order[a.priority] - order[b.priority];
                })
                .map((r, i) => {
                  const meta = PRIO_META[r.priority];
                  return (
                    <div
                      key={i}
                      className="rounded-xl p-5 flex items-start gap-4"
                      style={{ backgroundColor: "white", border: "1px solid rgba(0,0,0,0.06)" }}
                    >
                      <div
                        className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 font-bold text-sm"
                        style={{ backgroundColor: meta.bg, color: meta.color }}
                      >
                        {i + 1}
                      </div>
                      <div className="flex-1 min-w-0 space-y-1.5">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span
                            className="text-[10px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wide"
                            style={{ backgroundColor: meta.bg, color: meta.color }}
                          >
                            {meta.label}
                          </span>
                          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded uppercase"
                            style={{ backgroundColor: "rgba(0,0,0,0.04)", color: "#78614E" }}
                          >
                            {r.tool}
                          </span>
                          {r.estimated_hours !== undefined && (
                            <span className="text-[10px]" style={{ color: "#A8967E" }}>
                              ~{r.estimated_hours}h
                            </span>
                          )}
                        </div>
                        <p className="text-base font-bold" style={{ color: "var(--color-text)" }}>
                          {r.action}
                        </p>
                        <p className="text-xs" style={{ color: "#78614E", lineHeight: 1.5 }}>
                          {r.why}
                        </p>
                      </div>
                      <Link
                        href={r.app_path}
                        target="_blank"
                        className="inline-flex items-center gap-1 px-4 py-2 rounded-lg text-xs font-bold flex-shrink-0"
                        style={{ background: "linear-gradient(135deg, var(--color-primary), var(--color-primary-hover))", color: "#1C1814" }}
                      >
                        Execute
                        <ArrowRight className="w-3.5 h-3.5" />
                      </Link>
                    </div>
                  );
                })}
            </section>

            {/* Phase 3 teaser */}
            <section
              className="rounded-xl p-4"
              style={{ backgroundColor: "rgba(139,92,246,0.04)", border: "1px dashed rgba(139,92,246,0.25)" }}
            >
              <p className="text-xs font-bold mb-1" style={{ color: "#8B5CF6" }}>
                Phase 3 roadmap
              </p>
              <p className="text-xs" style={{ color: "#78614E", lineHeight: 1.5 }}>
                When the brain.markethubpromo.com subdomain goes live, high-priority recommendations will auto-execute
                (e.g. weekly Campaign Auto-Pilot runs, nightly lead outreach batches, auto-repurpose of top performers).
                You&apos;ll only approve the monthly summary + any action flagged as &quot;needs human approval&quot;.
              </p>
            </section>
          </>
        )}

        {!data && loading && (
          <div className="py-12 text-center">
            <Loader2 className="w-6 h-6 animate-spin inline" style={{ color: "var(--color-primary)" }} />
            <p className="text-xs mt-2" style={{ color: "#78614E" }}>Brain is thinking...</p>
          </div>
        )}
      </main>
    </div>
  );
}

function StatTile({
  icon: Icon,
  label,
  value,
  sub,
  good,
  bad,
}: {
  icon: React.ElementType;
  label: string;
  value: string;
  sub: string;
  good?: boolean;
  bad?: boolean;
}) {
  const accent = good ? "#059669" : bad ? "#B91C1C" : "var(--color-primary)";
  return (
    <div
      className="rounded-xl p-4"
      style={{ backgroundColor: "white", border: "1px solid rgba(0,0,0,0.06)" }}
    >
      <div className="flex items-center gap-2 mb-1">
        <Icon className="w-3.5 h-3.5" style={{ color: accent }} />
        <p className="text-[10px] font-bold uppercase tracking-wide" style={{ color: "#78614E" }}>
          {label}
        </p>
      </div>
      <p className="text-xl font-bold" style={{ color: "var(--color-text)" }}>{value}</p>
      <p className="text-[10px] mt-0.5" style={{ color: "#A8967E" }}>{sub}</p>
    </div>
  );
}
