"use client";

/**
 * Content Gap Analyzer — paste competitor captions + your own, AI maps
 * topics they cover that you don't, ranked by strategic importance.
 */

import { useState } from "react";
import Header from "@/components/layout/Header";
import {
  Target, Loader2, Sparkles, Calendar as CalIcon, Copy, Check,
  TrendingUp, Compass,
} from "lucide-react";

interface Gap {
  cluster_label: string;
  why_it_matters: string;
  post_ideas: string[];
}

const SAMPLE_COMP = "[paste one per line — or separate by blank line]";
const SAMPLE_MY = "[paste one per line — or separate by blank line]";

function splitCaptions(raw: string): string[] {
  // Accept blank-line-separated OR one-per-line. Pick the split that gives more items.
  const byBlank = raw.split(/\n\s*\n/).map((s) => s.trim()).filter(Boolean);
  if (byBlank.length >= 3) return byBlank;
  return raw.split(/\n/).map((s) => s.trim()).filter((s) => s.length > 20);
}

export default function ContentGapPage() {
  const [comp, setComp] = useState("");
  const [mine, setMine] = useState("");
  const [niche, setNiche] = useState("");
  const [loading, setLoading] = useState(false);
  const [gaps, setGaps] = useState<Gap[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);

  const compList = splitCaptions(comp);
  const myList = splitCaptions(mine);
  const canSubmit = compList.length >= 3 && myList.length >= 1 && !loading;

  const run = async () => {
    if (!canSubmit) return;
    setLoading(true);
    setError(null);
    setGaps(null);
    try {
      const res = await fetch("/api/ai/content-gap", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          competitor_captions: compList,
          my_captions: myList,
          niche: niche.trim() || undefined,
        }),
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error ?? "Failed");
      setGaps(d.gaps ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed");
    } finally {
      setLoading(false);
    }
  };

  const copy = async (key: string, text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(key);
      setTimeout(() => setCopied(null), 1500);
    } catch { /* no-op */ }
  };

  return (
    <div className="min-h-screen" style={{ backgroundColor: "#FFFCF7" }}>
      <Header title="Content Gap Analyzer" subtitle="What competitors cover that you don't — with post ideas you can ship today" />

      <main className="max-w-5xl mx-auto px-6 py-6 space-y-5">
        <section
          className="rounded-xl p-5 space-y-4"
          style={{ backgroundColor: "white", border: "1px solid rgba(0,0,0,0.06)" }}
        >
          <div className="flex items-center gap-2">
            <Target className="w-5 h-5" style={{ color: "#F59E0B" }} />
            <h2 className="text-sm font-bold" style={{ color: "#292524" }}>
              Paste captions (one per line or blank-line separated)
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <label className="text-xs font-semibold" style={{ color: "#78614E" }}>
                  Competitor posts <span style={{ color: "#EF4444" }}>*</span>
                </label>
                <span className="ml-auto text-[10px]" style={{ color: "#A8967E" }}>
                  {compList.length} found (need ≥3)
                </span>
              </div>
              <textarea
                value={comp}
                onChange={(e) => setComp(e.target.value)}
                rows={8}
                placeholder={SAMPLE_COMP}
                className="w-full rounded-lg px-3 py-2 text-sm resize-none font-mono"
                style={{ backgroundColor: "#FFF8F0", border: "1px solid rgba(245,215,160,0.4)", color: "#292524", outline: "none", fontSize: 11 }}
              />
            </div>
            <div>
              <div className="flex items-center gap-2 mb-1">
                <label className="text-xs font-semibold" style={{ color: "#78614E" }}>
                  Your own posts <span style={{ color: "#EF4444" }}>*</span>
                </label>
                <span className="ml-auto text-[10px]" style={{ color: "#A8967E" }}>
                  {myList.length} found (need ≥1)
                </span>
              </div>
              <textarea
                value={mine}
                onChange={(e) => setMine(e.target.value)}
                rows={8}
                placeholder={SAMPLE_MY}
                className="w-full rounded-lg px-3 py-2 text-sm resize-none font-mono"
                style={{ backgroundColor: "#FFF8F0", border: "1px solid rgba(245,215,160,0.4)", color: "#292524", outline: "none", fontSize: 11 }}
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold mb-1" style={{ color: "#78614E" }}>
              Niche / audience (optional but helps)
            </label>
            <input
              type="text"
              value={niche}
              onChange={(e) => setNiche(e.target.value)}
              placeholder="e.g. small marketing agencies in EU, 5-15 employees"
              className="w-full rounded-lg px-3 py-2 text-sm"
              style={{ backgroundColor: "#FFF8F0", border: "1px solid rgba(245,215,160,0.4)", color: "#292524", outline: "none" }}
            />
          </div>

          <button
            type="button"
            onClick={run}
            disabled={!canSubmit}
            className="w-full py-3 rounded-xl text-sm font-bold disabled:opacity-40 flex items-center justify-center gap-2"
            style={{ background: "linear-gradient(135deg, #F59E0B, #D97706)", color: "#1C1814" }}
          >
            {loading ? (<><Loader2 className="w-4 h-4 animate-spin" /> Analyzing...</>) : (<><Compass className="w-4 h-4" /> Find content gaps</>)}
          </button>

          {error && <p className="text-xs font-semibold" style={{ color: "#B91C1C" }}>{error}</p>}
        </section>

        {gaps && gaps.length === 0 && !loading && (
          <div
            className="rounded-xl p-6 text-center"
            style={{ backgroundColor: "white", border: "1px dashed rgba(0,0,0,0.1)" }}
          >
            <TrendingUp className="w-6 h-6 mx-auto mb-2" style={{ color: "#10B981" }} />
            <p className="text-sm font-bold" style={{ color: "#292524" }}>
              No clear gaps — you're covering their topics already 🎉
            </p>
            <p className="text-xs mt-1" style={{ color: "#78614E" }}>
              Try adding more competitor captions, or change your niche description.
            </p>
          </div>
        )}

        {gaps && gaps.length > 0 && (
          <section className="space-y-3">
            <p className="text-xs font-semibold" style={{ color: "#78614E" }}>
              {gaps.length} gap{gaps.length === 1 ? "" : "s"} found, ranked by strategic value:
            </p>
            {gaps.map((g, i) => (
              <div
                key={i}
                className="rounded-xl p-4 space-y-3"
                style={{ backgroundColor: "white", border: "1px solid rgba(0,0,0,0.06)" }}
              >
                <div className="flex items-start gap-3">
                  <div
                    className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 font-bold text-sm"
                    style={{ backgroundColor: "rgba(245,158,11,0.15)", color: "#D97706" }}
                  >
                    {i + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold" style={{ color: "#292524" }}>
                      {g.cluster_label}
                    </p>
                    <p className="text-xs mt-1" style={{ color: "#78614E", lineHeight: 1.5 }}>
                      {g.why_it_matters}
                    </p>
                  </div>
                </div>
                <div className="space-y-1.5 pl-11">
                  {g.post_ideas.map((idea, j) => (
                    <div
                      key={j}
                      className="rounded-md p-2 flex items-center gap-2"
                      style={{ backgroundColor: "rgba(245,158,11,0.04)", border: "1px solid rgba(245,158,11,0.15)" }}
                    >
                      <Sparkles className="w-3 h-3 flex-shrink-0" style={{ color: "#D97706" }} />
                      <p className="text-xs flex-1" style={{ color: "#292524", lineHeight: 1.4 }}>
                        {idea}
                      </p>
                      <button
                        type="button"
                        onClick={() => copy(`${i}-${j}`, idea)}
                        className="text-[10px] font-bold px-1.5 py-0.5 rounded inline-flex items-center gap-1"
                        style={{
                          backgroundColor: copied === `${i}-${j}` ? "#10B981" : "white",
                          color: copied === `${i}-${j}` ? "white" : "#78614E",
                        }}
                      >
                        {copied === `${i}-${j}` ? <Check className="w-2.5 h-2.5" /> : <Copy className="w-2.5 h-2.5" />}
                        {copied === `${i}-${j}` ? "Copied" : "Copy"}
                      </button>
                      <button
                        type="button"
                        onClick={() => window.open(`/calendar?caption=${encodeURIComponent(idea)}`, "_blank")}
                        className="text-[10px] font-bold px-1.5 py-0.5 rounded inline-flex items-center gap-1"
                        style={{ backgroundColor: "#D97706", color: "white" }}
                      >
                        <CalIcon className="w-2.5 h-2.5" />
                        Draft
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </section>
        )}
      </main>
    </div>
  );
}
