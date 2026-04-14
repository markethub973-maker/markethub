"use client";

/**
 * Automations page — M10 Sprint 1
 *
 * Browse automation templates, trigger them, and see run history.
 * Backed by /api/n8n/templates, /api/n8n/trigger, and /api/n8n/trigger (GET).
 */

import { useCallback, useEffect, useState } from "react";
import {
  Share2, UserPlus, Mail, Repeat, Zap, Play, Clock,
  CheckCircle2, XCircle, Loader2, RefreshCw,
} from "lucide-react";

interface Template {
  slug: string;
  name: string;
  description: string;
  category: string;
  icon: string;
  required_plan: string;
  inputs_schema: Record<string, unknown> | null;
  user_enabled: boolean;
}

interface Run {
  id: string;
  template_slug: string;
  status: "queued" | "running" | "succeeded" | "failed";
  error: string | null;
  started_at: string;
  finished_at: string | null;
  duration_ms: number | null;
}

const ICONS: Record<string, React.ElementType> = {
  Share2, UserPlus, Mail, Repeat, Zap,
};

const CATEGORY_LABEL: Record<string, string> = {
  social: "📱 Social",
  crm: "👥 CRM",
  reporting: "📊 Reporting",
  content: "✍️ Content",
  integration: "🔌 Integrations",
  other: "🧩 Other",
};

export default function AutomationsPage() {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [runs, setRuns] = useState<Run[]>([]);
  const [loading, setLoading] = useState(true);
  const [triggering, setTriggering] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setErr(null);
    try {
      const [tplRes, runRes] = await Promise.all([
        fetch("/api/n8n/templates", { cache: "no-store" }),
        fetch("/api/n8n/trigger?limit=20", { cache: "no-store" }),
      ]);
      const tplData = (await tplRes.json()) as { ok?: boolean; templates?: Template[]; error?: string };
      const runData = (await runRes.json()) as { ok?: boolean; runs?: Run[] };
      if (!tplData.ok) throw new Error(tplData.error ?? "Failed to load");
      setTemplates(tplData.templates ?? []);
      setRuns(runData.runs ?? []);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Failed");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
    const id = setInterval(load, 10_000);
    return () => clearInterval(id);
  }, [load]);

  const trigger = async (slug: string) => {
    setTriggering(slug);
    try {
      const res = await fetch("/api/n8n/trigger", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ template_slug: slug, inputs: {} }),
      });
      const data = (await res.json()) as { ok?: boolean; error?: string };
      if (!data.ok) setErr(data.error ?? "Failed to trigger");
      await load();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Failed");
    } finally {
      setTriggering(null);
    }
  };

  const byCategory = templates.reduce<Record<string, Template[]>>((acc, t) => {
    (acc[t.category] = acc[t.category] ?? []).push(t);
    return acc;
  }, {});

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6" style={{ color: "var(--color-text)" }}>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Automations</h1>
          <p className="text-sm" style={{ color: "#78614E" }}>
            Pre-built workflows that run on our self-hosted n8n instance.
          </p>
        </div>
        <button
          type="button"
          onClick={load}
          disabled={loading}
          className="p-2 rounded-lg disabled:opacity-40"
          style={{ backgroundColor: "white", border: "1px solid rgba(0,0,0,0.08)" }}
          aria-label="Refresh"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
        </button>
      </div>

      {err && (
        <div
          className="rounded-lg p-3 text-xs"
          style={{ backgroundColor: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.3)", color: "#B91C1C" }}
        >
          {err}
        </div>
      )}

      {/* Catalog */}
      {Object.keys(byCategory).sort().map((cat) => (
        <section key={cat} className="space-y-3">
          <h2 className="text-sm font-bold uppercase tracking-wide" style={{ color: "#78614E" }}>
            {CATEGORY_LABEL[cat] ?? cat}
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {byCategory[cat].map((t) => {
              const Icon = ICONS[t.icon] ?? Zap;
              return (
                <div
                  key={t.slug}
                  className="rounded-xl p-4 flex gap-3"
                  style={{ backgroundColor: "white", border: "1px solid rgba(0,0,0,0.08)" }}
                >
                  <div
                    className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0"
                    style={{ backgroundColor: "rgba(139,92,246,0.12)", color: "#8B5CF6" }}
                  >
                    <Icon className="w-5 h-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start gap-2">
                      <p className="text-sm font-bold truncate flex-1">{t.name}</p>
                      <span
                        className="text-[9px] uppercase font-bold px-1.5 py-0.5 rounded"
                        style={{ backgroundColor: "rgba(245,158,11,0.15)", color: "var(--color-primary-hover)" }}
                      >
                        {t.required_plan}
                      </span>
                    </div>
                    <p className="text-xs mt-1" style={{ color: "#78614E" }}>
                      {t.description}
                    </p>
                    <button
                      type="button"
                      onClick={() => trigger(t.slug)}
                      disabled={triggering === t.slug}
                      className="mt-2 inline-flex items-center gap-1 px-3 py-1.5 rounded-md text-xs font-bold disabled:opacity-40"
                      style={{
                        background: "linear-gradient(135deg, #8B5CF6, #6D28D9)",
                        color: "white",
                      }}
                    >
                      {triggering === t.slug ? (
                        <Loader2 className="w-3 h-3 animate-spin" />
                      ) : (
                        <Play className="w-3 h-3" />
                      )}
                      Run now
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      ))}

      {/* Run history */}
      <section className="space-y-3">
        <h2 className="text-sm font-bold uppercase tracking-wide" style={{ color: "#78614E" }}>
          <Clock className="w-4 h-4 inline mr-1" /> Recent runs
        </h2>
        {runs.length === 0 ? (
          <p className="text-xs" style={{ color: "#A8967E" }}>No runs yet.</p>
        ) : (
          <div className="space-y-2">
            {runs.map((r) => {
              const Icon =
                r.status === "succeeded"
                  ? CheckCircle2
                  : r.status === "failed"
                  ? XCircle
                  : Loader2;
              const color =
                r.status === "succeeded" ? "#10B981"
                : r.status === "failed" ? "#EF4444"
                : "var(--color-primary)";
              return (
                <div
                  key={r.id}
                  className="rounded-lg p-3 flex items-center gap-3"
                  style={{ backgroundColor: "white", border: "1px solid rgba(0,0,0,0.06)" }}
                >
                  <Icon
                    className={`w-4 h-4 ${r.status === "running" || r.status === "queued" ? "animate-spin" : ""}`}
                    style={{ color }}
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold truncate">{r.template_slug}</p>
                    <p className="text-[11px]" style={{ color: "#78614E" }}>
                      {new Date(r.started_at).toLocaleString()}
                      {r.duration_ms ? ` · ${r.duration_ms}ms` : ""}
                      {r.error ? ` · ${r.error.slice(0, 80)}` : ""}
                    </p>
                  </div>
                  <span
                    className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-full"
                    style={{ backgroundColor: `${color}1A`, color }}
                  >
                    {r.status}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
