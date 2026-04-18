"use client";

/**
 * Content Strategy Profile — ICP + values + topic clusters + north star.
 * One input screen, compounds with Brand Voice on every AI feature.
 */

import { useEffect, useState } from "react";
import Header from "@/components/layout/Header";
import {
  Target, Loader2, Sparkles, Save, Check, AlertTriangle, Plus, X,
  Compass, Heart, Hash,
} from "lucide-react";
import Link from "next/link";

const VALUE_HINT = [
  "Clarity over hype",
  "Transparent pricing",
  "Human, not corporate",
  "Ship fast, learn faster",
];
const CLUSTER_HINT = [
  "AI workflow automation",
  "Client acquisition playbooks",
  "Behind-the-scenes process",
  "Industry hot takes",
  "Tool reviews & comparisons",
];

interface Strategy {
  icp: string;
  values: string[];
  topic_clusters: string[];
  north_star: string;
}

export default function StrategyPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [migrationPending, setMigrationPending] = useState(false);

  const [icp, setIcp] = useState("");
  const [values, setValues] = useState<string[]>([]);
  const [clusters, setClusters] = useState<string[]>([]);
  const [northStar, setNorthStar] = useState("");

  const [newValue, setNewValue] = useState("");
  const [newCluster, setNewCluster] = useState("");

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/brand/strategy", { cache: "no-store" });
        const d = await res.json();
        if (d.migration_pending) setMigrationPending(true);
        if (d.ok && d.strategy) {
          setIcp(d.strategy.icp ?? "");
          setValues(d.strategy.values ?? []);
          setClusters(d.strategy.topic_clusters ?? []);
          setNorthStar(d.strategy.north_star ?? "");
        }
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const addValue = () => {
    const v = newValue.trim();
    if (v && !values.includes(v) && values.length < 5) {
      setValues([...values, v]);
      setNewValue("");
    }
  };
  const addCluster = () => {
    const v = newCluster.trim();
    if (v && !clusters.includes(v) && clusters.length < 8) {
      setClusters([...clusters, v]);
      setNewCluster("");
    }
  };

  const save = async () => {
    setSaving(true);
    setSaved(false);
    setError(null);
    try {
      const res = await fetch("/api/brand/strategy", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          icp: icp.trim() || undefined,
          values,
          topic_clusters: clusters,
          north_star: northStar.trim() || undefined,
        }),
      });
      const d = await res.json();
      if (!res.ok) {
        if (d.migration_pending) {
          setMigrationPending(true);
          throw new Error("Database migration needed — see banner above.");
        }
        throw new Error(d.error ?? "Failed");
      }
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed");
    } finally {
      setSaving(false);
    }
  };

  const filled = icp.trim().length > 10 || values.length >= 2 || clusters.length >= 2 || northStar.trim().length > 10;

  return (
    <div className="min-h-screen" style={{ backgroundColor: "var(--color-bg-secondary)" }}>
      <Header title="Content Strategy" subtitle="Who you write for + what you stand for — compounds with Brand Voice on every AI feature" />

      <main className="max-w-4xl mx-auto px-6 py-6 space-y-5">
        {/* Migration banner hidden from users — admin sees in console only */}

        {!loading && (
          <>
            {/* ICP */}
            <section
              className="rounded-xl p-5 space-y-3"
              style={{ backgroundColor: "white", border: "1px solid rgba(0,0,0,0.06)" }}
            >
              <div className="flex items-center gap-2">
                <Target className="w-4 h-4" style={{ color: "var(--color-primary)" }} />
                <h2 className="text-sm font-bold" style={{ color: "var(--color-text)" }}>
                  Ideal Customer Profile (ICP)
                </h2>
              </div>
              <p className="text-xs" style={{ color: "#78614E" }}>
                Who SPECIFICALLY are you making content for? One paragraph, plain language. The more specific, the sharper every AI output.
              </p>
              <textarea
                value={icp}
                onChange={(e) => setIcp(e.target.value)}
                rows={4}
                maxLength={600}
                placeholder="Small marketing agencies in Europe, 5-15 employees, owners who are ex-creatives now overwhelmed by ops work. They lose 6-10h/week to repetitive content tasks and can't afford a senior content lead..."
                className="w-full rounded-lg px-3 py-2 text-sm resize-none"
                style={{ backgroundColor: "var(--color-bg)", border: "1px solid rgba(245,215,160,0.4)", color: "var(--color-text)", outline: "none" }}
              />
              <p className="text-[10px]" style={{ color: "#A8967E" }}>{icp.length}/600</p>
            </section>

            {/* Values */}
            <section
              className="rounded-xl p-5 space-y-3"
              style={{ backgroundColor: "white", border: "1px solid rgba(0,0,0,0.06)" }}
            >
              <div className="flex items-center gap-2">
                <Heart className="w-4 h-4" style={{ color: "#EC4899" }} />
                <h2 className="text-sm font-bold flex-1" style={{ color: "var(--color-text)" }}>
                  Brand values ({values.length}/5)
                </h2>
              </div>
              <p className="text-xs" style={{ color: "#78614E" }}>
                3-5 short principles that guide every piece of content. AI will avoid contradicting them.
              </p>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newValue}
                  onChange={(e) => setNewValue(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addValue())}
                  placeholder="Short phrase, e.g. 'Clarity over hype'"
                  className="flex-1 rounded-md px-3 py-1.5 text-sm"
                  style={{ backgroundColor: "var(--color-bg)", border: "1px solid rgba(245,215,160,0.4)", color: "var(--color-text)", outline: "none" }}
                />
                <button
                  type="button"
                  onClick={addValue}
                  disabled={!newValue.trim() || values.length >= 5}
                  className="inline-flex items-center gap-1 px-3 py-1.5 rounded-md text-xs font-bold disabled:opacity-40"
                  style={{ backgroundColor: "#EC4899", color: "white" }}
                >
                  <Plus className="w-3 h-3" />
                  Add
                </button>
              </div>
              {values.length === 0 && (
                <div className="flex flex-wrap gap-1">
                  {VALUE_HINT.map((h) => (
                    <button
                      key={h}
                      type="button"
                      onClick={() => setValues([...values, h])}
                      className="text-[10px] px-2 py-0.5 rounded"
                      style={{ backgroundColor: "rgba(236,72,153,0.08)", color: "#BE185D", border: "1px dashed rgba(236,72,153,0.3)" }}
                    >
                      + {h}
                    </button>
                  ))}
                </div>
              )}
              <div className="flex flex-wrap gap-2">
                {values.map((v, i) => (
                  <span
                    key={i}
                    className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs"
                    style={{ backgroundColor: "rgba(236,72,153,0.1)", color: "#BE185D", border: "1px solid rgba(236,72,153,0.25)" }}
                  >
                    {v}
                    <button
                      type="button"
                      onClick={() => setValues(values.filter((_, idx) => idx !== i))}
                      aria-label="Remove"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))}
              </div>
            </section>

            {/* Topic clusters */}
            <section
              className="rounded-xl p-5 space-y-3"
              style={{ backgroundColor: "white", border: "1px solid rgba(0,0,0,0.06)" }}
            >
              <div className="flex items-center gap-2">
                <Hash className="w-4 h-4" style={{ color: "#8B5CF6" }} />
                <h2 className="text-sm font-bold flex-1" style={{ color: "var(--color-text)" }}>
                  Topic clusters ({clusters.length}/8)
                </h2>
              </div>
              <p className="text-xs" style={{ color: "#78614E" }}>
                The 3-8 big topic areas you want to own. Narrow enough that you could write 20 posts about each.
              </p>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newCluster}
                  onChange={(e) => setNewCluster(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addCluster())}
                  placeholder="Short phrase, e.g. 'AI workflow automation'"
                  className="flex-1 rounded-md px-3 py-1.5 text-sm"
                  style={{ backgroundColor: "var(--color-bg)", border: "1px solid rgba(245,215,160,0.4)", color: "var(--color-text)", outline: "none" }}
                />
                <button
                  type="button"
                  onClick={addCluster}
                  disabled={!newCluster.trim() || clusters.length >= 8}
                  className="inline-flex items-center gap-1 px-3 py-1.5 rounded-md text-xs font-bold disabled:opacity-40"
                  style={{ backgroundColor: "#8B5CF6", color: "white" }}
                >
                  <Plus className="w-3 h-3" />
                  Add
                </button>
              </div>
              {clusters.length === 0 && (
                <div className="flex flex-wrap gap-1">
                  {CLUSTER_HINT.map((h) => (
                    <button
                      key={h}
                      type="button"
                      onClick={() => setClusters([...clusters, h])}
                      className="text-[10px] px-2 py-0.5 rounded"
                      style={{ backgroundColor: "rgba(139,92,246,0.08)", color: "#6D28D9", border: "1px dashed rgba(139,92,246,0.3)" }}
                    >
                      + {h}
                    </button>
                  ))}
                </div>
              )}
              <div className="flex flex-wrap gap-2">
                {clusters.map((c, i) => (
                  <span
                    key={i}
                    className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs"
                    style={{ backgroundColor: "rgba(139,92,246,0.1)", color: "#6D28D9", border: "1px solid rgba(139,92,246,0.25)" }}
                  >
                    {c}
                    <button
                      type="button"
                      onClick={() => setClusters(clusters.filter((_, idx) => idx !== i))}
                      aria-label="Remove"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))}
              </div>
            </section>

            {/* North star */}
            <section
              className="rounded-xl p-5 space-y-3"
              style={{ backgroundColor: "white", border: "1px solid rgba(0,0,0,0.06)" }}
            >
              <div className="flex items-center gap-2">
                <Compass className="w-4 h-4" style={{ color: "#10B981" }} />
                <h2 className="text-sm font-bold" style={{ color: "var(--color-text)" }}>
                  North-star goal
                </h2>
              </div>
              <p className="text-xs" style={{ color: "#78614E" }}>
                One sentence: what does success look like a year from now? AI uses this as a tie-breaker when ideas conflict.
              </p>
              <textarea
                value={northStar}
                onChange={(e) => setNorthStar(e.target.value)}
                rows={2}
                maxLength={300}
                placeholder="Become the go-to AI marketing assistant for 500+ small agencies in Europe within 12 months."
                className="w-full rounded-lg px-3 py-2 text-sm resize-none"
                style={{ backgroundColor: "var(--color-bg)", border: "1px solid rgba(245,215,160,0.4)", color: "var(--color-text)", outline: "none" }}
              />
              <p className="text-[10px]" style={{ color: "#A8967E" }}>{northStar.length}/300</p>
            </section>

            {/* Save */}
            <div className="flex items-center gap-3 flex-wrap">
              <button
                type="button"
                onClick={save}
                disabled={!filled || saving}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold disabled:opacity-40"
                style={{ background: "linear-gradient(135deg, var(--color-primary), var(--color-primary-hover))", color: "#1C1814" }}
              >
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : saved ? <Check className="w-4 h-4" /> : <Save className="w-4 h-4" />}
                {saving ? "Saving..." : saved ? "Saved" : "Save strategy"}
              </button>
              <Link
                href="/brand/voice"
                className="text-xs underline"
                style={{ color: "#78614E" }}
              >
                ← Back to Brand Voice
              </Link>
              {error && <p className="text-xs font-semibold" style={{ color: "#B91C1C" }}>{error}</p>}
            </div>

            <p className="text-[11px] italic text-center" style={{ color: "#A8967E" }}>
              <Sparkles className="w-2.5 h-2.5 inline mr-1" />
              Once saved, every AI feature (captions, images, campaigns, hooks, repurpose, recycle, hashtag scanner, content gap, lead enrichment, video caption) uses this profile automatically.
            </p>
          </>
        )}

        {loading && (
          <div className="py-12 text-center">
            <Loader2 className="w-5 h-5 animate-spin inline" style={{ color: "#A8967E" }} />
          </div>
        )}
      </main>
    </div>
  );
}
