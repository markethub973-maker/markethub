"use client";

/**
 * Hashtag Scanner — paste candidates + optional competitor/user captions,
 * AI buckets them into rising / safe-bet / saturated / overused-by-you.
 */

import { useState } from "react";
import Header from "@/components/layout/Header";
import {
  Hash, TrendingUp, ShieldCheck, AlertTriangle, Repeat, Loader2,
  Copy, Check,
} from "lucide-react";

interface Bucket {
  rising: { tag: string; reason: string }[];
  "safe-bet": { tag: string; reason: string }[];
  saturated: { tag: string; reason: string }[];
  "overused-by-you": { tag: string; reason: string }[];
}

const BUCKET_META = [
  { key: "rising",            label: "Rising",          icon: TrendingUp,     color: "#10B981",
    desc: "Good discovery upside — you're not using these yet" },
  { key: "safe-bet",          label: "Safe Bet",        icon: ShieldCheck,    color: "#0EA5E9",
    desc: "Steady relevance to your niche" },
  { key: "overused-by-you",   label: "Overused by You", icon: Repeat,         color: "var(--color-primary)",
    desc: "Rotate these out — you rely on them too much" },
  { key: "saturated",         label: "Saturated",       icon: AlertTriangle,  color: "#EF4444",
    desc: "Oversaturated / spammy — avoid" },
] as const;

function splitLines(raw: string): string[] {
  return raw.split(/\n/).map((s) => s.trim()).filter(Boolean);
}

export default function HashtagScanPage() {
  const [candidates, setCandidates] = useState("");
  const [compCaps, setCompCaps] = useState("");
  const [myCaps, setMyCaps] = useState("");
  const [niche, setNiche] = useState("");
  const [platform, setPlatform] = useState("instagram");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<Bucket | null>(null);
  const [analyzedCount, setAnalyzedCount] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const candList = splitLines(candidates);
  const compList = splitLines(compCaps);
  const myList = splitLines(myCaps);

  const canSubmit = (candList.length + compList.filter((s) => s.length > 20).length) >= 3 && !loading;

  const run = async () => {
    if (!canSubmit) return;
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const res = await fetch("/api/ai/hashtag-scan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          candidates: candList,
          competitor_captions: compList.filter((s) => s.length > 20),
          my_captions: myList.filter((s) => s.length > 20),
          niche: niche.trim() || undefined,
          platform,
        }),
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error ?? "Failed");
      setResult(d.buckets);
      setAnalyzedCount(d.analyzed_count ?? 0);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed");
    } finally {
      setLoading(false);
    }
  };

  const copyBucket = async (key: string, items: { tag: string }[]) => {
    try {
      await navigator.clipboard.writeText(items.map((i) => i.tag).join(" "));
      setCopiedKey(key);
      setTimeout(() => setCopiedKey(null), 1500);
    } catch { /* no-op */ }
  };

  return (
    <div className="min-h-screen" style={{ backgroundColor: "var(--color-bg-secondary)" }}>
      <Header title="Hashtag Scanner" subtitle="Rank candidates into rising · safe-bet · saturated · overused" />

      <main className="max-w-5xl mx-auto px-6 py-6 space-y-5">
        <section
          className="rounded-xl p-5 space-y-4"
          style={{ backgroundColor: "white", border: "1px solid rgba(0,0,0,0.06)" }}
        >
          <div className="flex items-center gap-2">
            <Hash className="w-5 h-5" style={{ color: "var(--color-primary)" }} />
            <h2 className="text-sm font-bold" style={{ color: "var(--color-text)" }}>
              Provide inputs
            </h2>
          </div>

          <div>
            <label className="block text-xs font-semibold mb-1" style={{ color: "#78614E" }}>
              Hashtag candidates (one per line)
            </label>
            <textarea
              value={candidates}
              onChange={(e) => setCandidates(e.target.value)}
              rows={4}
              placeholder={"#marketingagency\n#aitools\n#contentcreation"}
              className="w-full rounded-lg px-3 py-2 text-sm resize-none font-mono"
              style={{ backgroundColor: "var(--color-bg)", border: "1px solid rgba(245,215,160,0.4)", color: "var(--color-text)", outline: "none", fontSize: 11 }}
            />
            <p className="text-xs mt-1" style={{ color: "#A8967E" }}>
              {candList.length} candidate{candList.length === 1 ? "" : "s"} — OR leave empty and paste competitor captions below (hashtags auto-extracted)
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold mb-1" style={{ color: "#78614E" }}>
                Competitor captions (optional)
              </label>
              <textarea
                value={compCaps}
                onChange={(e) => setCompCaps(e.target.value)}
                rows={5}
                placeholder="[one caption per line]"
                className="w-full rounded-lg px-3 py-2 text-sm resize-none font-mono"
                style={{ backgroundColor: "var(--color-bg)", border: "1px solid rgba(245,215,160,0.4)", color: "var(--color-text)", outline: "none", fontSize: 11 }}
              />
            </div>
            <div>
              <label className="block text-xs font-semibold mb-1" style={{ color: "#78614E" }}>
                Your past captions (optional — detects saturation)
              </label>
              <textarea
                value={myCaps}
                onChange={(e) => setMyCaps(e.target.value)}
                rows={5}
                placeholder="[one caption per line]"
                className="w-full rounded-lg px-3 py-2 text-sm resize-none font-mono"
                style={{ backgroundColor: "var(--color-bg)", border: "1px solid rgba(245,215,160,0.4)", color: "var(--color-text)", outline: "none", fontSize: 11 }}
              />
            </div>
          </div>

          <div className="flex flex-wrap gap-3 items-end">
            <div className="flex-1 min-w-[240px]">
              <label className="block text-xs font-semibold mb-1" style={{ color: "#78614E" }}>
                Niche / audience (optional)
              </label>
              <input
                type="text"
                value={niche}
                onChange={(e) => setNiche(e.target.value)}
                placeholder="e.g. small fitness studios in Romania"
                className="w-full rounded-lg px-3 py-1.5 text-sm"
                style={{ backgroundColor: "var(--color-bg)", border: "1px solid rgba(245,215,160,0.4)", color: "var(--color-text)", outline: "none" }}
              />
            </div>
            <div>
              <label className="block text-xs font-semibold mb-1" style={{ color: "#78614E" }}>Platform</label>
              <select
                value={platform}
                onChange={(e) => setPlatform(e.target.value)}
                className="rounded-lg px-3 py-1.5 text-sm"
                style={{ backgroundColor: "var(--color-bg)", border: "1px solid rgba(245,215,160,0.4)", color: "var(--color-text)", outline: "none" }}
              >
                {["instagram", "tiktok", "twitter", "linkedin", "facebook", "youtube"].map((p) => (
                  <option key={p} value={p}>{p}</option>
                ))}
              </select>
            </div>
          </div>

          <button
            type="button"
            onClick={run}
            disabled={!canSubmit}
            className="w-full py-3 rounded-xl text-sm font-bold disabled:opacity-40 flex items-center justify-center gap-2"
            style={{ background: "linear-gradient(135deg, var(--color-primary), var(--color-primary-hover))", color: "#1C1814" }}
          >
            {loading ? (<><Loader2 className="w-4 h-4 animate-spin" /> Scanning...</>) : (<><Hash className="w-4 h-4" /> Scan hashtags</>)}
          </button>

          {error && <p className="text-xs font-semibold" style={{ color: "#B91C1C" }}>{error}</p>}
        </section>

        {result && (
          <section className="space-y-3">
            <p className="text-xs font-semibold" style={{ color: "#78614E" }}>
              {analyzedCount} hashtag{analyzedCount === 1 ? "" : "s"} analyzed
            </p>

            {BUCKET_META.map(({ key, label, icon: Icon, color, desc }) => {
              const items = result[key];
              if (!items || items.length === 0) return null;
              return (
                <div
                  key={key}
                  className="rounded-xl p-4"
                  style={{ backgroundColor: "white", border: `1px solid ${color}33` }}
                >
                  <div className="flex items-center gap-2 mb-2">
                    <div
                      className="w-7 h-7 rounded-md flex items-center justify-center"
                      style={{ backgroundColor: `${color}1A` }}
                    >
                      <Icon className="w-4 h-4" style={{ color }} />
                    </div>
                    <p className="text-sm font-bold" style={{ color: "var(--color-text)" }}>
                      {label}
                    </p>
                    <p className="text-xs flex-1" style={{ color: "#A8967E" }}>
                      {desc} · {items.length}
                    </p>
                    <button
                      type="button"
                      onClick={() => copyBucket(key, items)}
                      className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm font-bold"
                      style={{ backgroundColor: copiedKey === key ? "#10B981" : color, color: "white" }}
                    >
                      {copiedKey === key ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                      {copiedKey === key ? "Copied" : "Copy all"}
                    </button>
                  </div>
                  <div className="space-y-1">
                    {items.map((i, idx) => (
                      <div
                        key={idx}
                        className="flex items-center gap-2 py-1"
                      >
                        <code
                          className="text-xs font-mono px-2 py-0.5 rounded flex-shrink-0"
                          style={{ backgroundColor: `${color}1A`, color }}
                        >
                          {i.tag}
                        </code>
                        <p className="text-[11px]" style={{ color: "#78614E" }}>
                          {i.reason}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </section>
        )}
      </main>
    </div>
  );
}
