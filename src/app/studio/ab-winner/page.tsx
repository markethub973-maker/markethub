"use client";

/**
 * A/B Winner Picker — paste two drafts, AI picks the stronger one with
 * a comparative scorecard + "best of both" merged caption.
 */

import { useState } from "react";
import Header from "@/components/layout/Header";
import { Swords, Loader2, Trophy, Sparkles, Copy, Check } from "lucide-react";

const PLATFORMS = ["instagram", "linkedin", "twitter", "tiktok", "facebook", "youtube"] as const;

interface WinnerResult {
  winner: "A" | "B";
  confidence: number;
  scores: { a: number; b: number };
  reasons: string[];
  best_of_both: string | null;
}

export default function ABWinnerPage() {
  const [a, setA] = useState("");
  const [b, setB] = useState("");
  const [platform, setPlatform] = useState<string>("instagram");
  const [hasImage, setHasImage] = useState(true);
  const [goal, setGoal] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<WinnerResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const canSubmit = a.trim().length >= 10 && b.trim().length >= 10 && a.trim() !== b.trim() && !loading;

  const run = async () => {
    if (!canSubmit) return;
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const res = await fetch("/api/ai/ab-winner", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          variant_a: a.trim(),
          variant_b: b.trim(),
          platform,
          has_image: hasImage,
          goal: goal.trim() || undefined,
        }),
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error ?? "Failed");
      setResult(d);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed");
    } finally {
      setLoading(false);
    }
  };

  const copyMerged = async () => {
    if (!result?.best_of_both) return;
    try {
      await navigator.clipboard.writeText(result.best_of_both);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch { /* no-op */ }
  };

  return (
    <div className="min-h-screen" style={{ backgroundColor: "var(--color-bg-secondary)" }}>
      <Header title="A/B Winner Picker" subtitle="Two drafts in, one predicted winner out — with rationale" />

      <main className="max-w-5xl mx-auto px-6 py-6 space-y-5">
        <section
          className="rounded-xl p-5 space-y-4"
          style={{ backgroundColor: "white", border: "1px solid rgba(0,0,0,0.06)" }}
        >
          <div className="flex items-center gap-2">
            <Swords className="w-5 h-5" style={{ color: "var(--color-primary)" }} />
            <h2 className="text-sm font-bold" style={{ color: "var(--color-text)" }}>
              Paste your two drafts
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold mb-1" style={{ color: "#78614E" }}>
                Draft A <span style={{ color: "#EF4444" }}>*</span>
              </label>
              <textarea
                value={a}
                onChange={(e) => setA(e.target.value)}
                rows={6}
                maxLength={3000}
                placeholder="Your first draft..."
                className="w-full rounded-lg px-3 py-2 text-sm resize-none"
                style={{ backgroundColor: "var(--color-bg)", border: "1px solid rgba(245,215,160,0.4)", color: "var(--color-text)", outline: "none" }}
              />
              <p className="text-xs mt-0.5" style={{ color: "#A8967E" }}>{a.length} chars</p>
            </div>
            <div>
              <label className="block text-xs font-semibold mb-1" style={{ color: "#78614E" }}>
                Draft B <span style={{ color: "#EF4444" }}>*</span>
              </label>
              <textarea
                value={b}
                onChange={(e) => setB(e.target.value)}
                rows={6}
                maxLength={3000}
                placeholder="Your second draft..."
                className="w-full rounded-lg px-3 py-2 text-sm resize-none"
                style={{ backgroundColor: "var(--color-bg)", border: "1px solid rgba(245,215,160,0.4)", color: "var(--color-text)", outline: "none" }}
              />
              <p className="text-xs mt-0.5" style={{ color: "#A8967E" }}>{b.length} chars</p>
            </div>
          </div>

          <div className="flex flex-wrap gap-3 items-center">
            <div>
              <label className="block text-xs font-semibold mb-1" style={{ color: "#78614E" }}>Platform</label>
              <select
                value={platform}
                onChange={(e) => setPlatform(e.target.value)}
                className="rounded-lg px-3 py-1.5 text-sm"
                style={{ backgroundColor: "var(--color-bg)", border: "1px solid rgba(245,215,160,0.4)", color: "var(--color-text)", outline: "none" }}
              >
                {PLATFORMS.map((p) => (
                  <option key={p} value={p}>{p}</option>
                ))}
              </select>
            </div>
            <label className="flex items-center gap-2 text-xs" style={{ color: "#78614E" }}>
              <input
                type="checkbox"
                checked={hasImage}
                onChange={(e) => setHasImage(e.target.checked)}
              />
              Has image/video
            </label>
            <div className="flex-1 min-w-[200px]">
              <label className="block text-xs font-semibold mb-1" style={{ color: "#78614E" }}>
                Goal (optional)
              </label>
              <input
                type="text"
                value={goal}
                onChange={(e) => setGoal(e.target.value)}
                placeholder="drive signups, build trust, get comments..."
                className="w-full rounded-lg px-3 py-1.5 text-sm"
                style={{ backgroundColor: "var(--color-bg)", border: "1px solid rgba(245,215,160,0.4)", color: "var(--color-text)", outline: "none" }}
              />
            </div>
          </div>

          <button
            type="button"
            onClick={run}
            disabled={!canSubmit}
            className="w-full py-3 rounded-xl text-sm font-bold disabled:opacity-40 flex items-center justify-center gap-2"
            style={{ background: "linear-gradient(135deg, var(--color-primary), var(--color-primary-hover))", color: "#1C1814" }}
          >
            {loading ? (<><Loader2 className="w-4 h-4 animate-spin" /> Judging...</>) : (<><Swords className="w-4 h-4" /> Pick the winner</>)}
          </button>

          {error && <p className="text-xs font-semibold" style={{ color: "#B91C1C" }}>{error}</p>}
        </section>

        {result && (
          <>
            {/* Scorecards */}
            <section className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {(["A", "B"] as const).map((k) => {
                const isWinner = result.winner === k;
                const score = k === "A" ? result.scores.a : result.scores.b;
                const text = k === "A" ? a : b;
                return (
                  <div
                    key={k}
                    className="rounded-xl p-4 flex flex-col gap-2 relative"
                    style={{
                      backgroundColor: "white",
                      border: `2px solid ${isWinner ? "var(--color-primary)" : "rgba(0,0,0,0.08)"}`,
                    }}
                  >
                    {isWinner && (
                      <span
                        className="absolute -top-2 -right-2 inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold"
                        style={{ background: "linear-gradient(135deg, var(--color-primary), var(--color-primary-hover))", color: "white" }}
                      >
                        <Trophy className="w-2.5 h-2.5" />
                        Winner
                      </span>
                    )}
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-bold flex-1" style={{ color: "var(--color-text)" }}>
                        Draft {k}
                      </p>
                      <p className="text-xl font-bold" style={{ color: isWinner ? "var(--color-primary)" : "#A8967E" }}>
                        {score}
                      </p>
                    </div>
                    <div className="h-1.5 rounded-full overflow-hidden" style={{ backgroundColor: "rgba(0,0,0,0.06)" }}>
                      <div
                        className="h-full rounded-full transition-all"
                        style={{
                          width: `${score}%`,
                          background: isWinner ? "linear-gradient(90deg, #F59E0B, #D97706)" : "#C4AA8A",
                        }}
                      />
                    </div>
                    <p className="text-xs line-clamp-4" style={{ color: "#78614E", lineHeight: 1.5 }}>
                      {text}
                    </p>
                  </div>
                );
              })}
            </section>

            {/* Reasons */}
            <section
              className="rounded-xl p-4"
              style={{ backgroundColor: "white", border: "1px solid rgba(0,0,0,0.06)" }}
            >
              <p className="text-sm font-bold mb-2 flex items-center gap-2" style={{ color: "var(--color-text)" }}>
                <Sparkles className="w-4 h-4" style={{ color: "var(--color-primary)" }} />
                Why Draft {result.winner} wins
                <span className="ml-auto text-xs font-normal" style={{ color: "#A8967E" }}>
                  {result.confidence}% confidence
                </span>
              </p>
              <ul className="list-disc pl-5 space-y-1">
                {result.reasons.map((r, i) => (
                  <li key={i} className="text-xs" style={{ color: "var(--color-text)", lineHeight: 1.5 }}>
                    {r}
                  </li>
                ))}
              </ul>
            </section>

            {/* Best of both */}
            {result.best_of_both && (
              <section
                className="rounded-xl p-4"
                style={{ backgroundColor: "rgba(245,158,11,0.06)", border: "1px solid rgba(245,158,11,0.25)" }}
              >
                <div className="flex items-center gap-2 mb-2">
                  <Sparkles className="w-4 h-4" style={{ color: "var(--color-primary-hover)" }} />
                  <p className="text-sm font-bold flex-1" style={{ color: "var(--color-text)" }}>
                    Best of both — merged draft
                  </p>
                  <button
                    type="button"
                    onClick={copyMerged}
                    className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm font-bold"
                    style={{ backgroundColor: copied ? "#10B981" : "var(--color-primary-hover)", color: "white" }}
                  >
                    {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                    {copied ? "Copied" : "Use this"}
                  </button>
                </div>
                <p className="text-sm whitespace-pre-wrap" style={{ color: "var(--color-text)", lineHeight: 1.5 }}>
                  {result.best_of_both}
                </p>
              </section>
            )}
          </>
        )}
      </main>
    </div>
  );
}
