"use client";

/**
 * YouTube Thumbnail Generator — title + topic + style → 1280x720 image.
 */

import { useState } from "react";
import Header from "@/components/layout/Header";
import { Youtube, Loader2, Sparkles, Download, Copy, Check } from "lucide-react";

const STYLES = [
  { id: "bold",      label: "Bold",      desc: "Saturated + high contrast" },
  { id: "minimal",   label: "Minimal",   desc: "Clean negative space" },
  { id: "cinematic", label: "Cinematic", desc: "Movie-poster mood" },
  { id: "meme",      label: "Meme",      desc: "Playful cartoon" },
  { id: "tech",      label: "Tech",      desc: "Neon + futuristic" },
  { id: "tutorial",  label: "Tutorial",  desc: "Annotated learning" },
];

export default function ThumbnailPage() {
  const [title, setTitle] = useState("");
  const [topic, setTopic] = useState("");
  const [accent, setAccent] = useState("");
  const [style, setStyle] = useState("bold");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{ image_url?: string; id?: string; cost_usd?: number } | null>(null);
  const [copied, setCopied] = useState(false);

  const canSubmit = title.trim().length >= 3 && !loading;

  const run = async () => {
    if (!canSubmit) return;
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const res = await fetch("/api/ai/thumbnail", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim(),
          topic: topic.trim() || undefined,
          accent: accent.trim() || undefined,
          style,
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

  const copyUrl = async () => {
    if (!result?.image_url) return;
    try {
      await navigator.clipboard.writeText(result.image_url);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch { /* no-op */ }
  };

  return (
    <div className="min-h-screen" style={{ backgroundColor: "#FFFCF7" }}>
      <Header title="Thumbnail Generator" subtitle="YouTube-style thumbnails (1280×720) in one click" />

      <main className="max-w-4xl mx-auto px-6 py-6 space-y-5">
        <section
          className="rounded-xl p-5 space-y-4"
          style={{ backgroundColor: "white", border: "1px solid rgba(0,0,0,0.06)" }}
        >
          <div className="flex items-center gap-2">
            <Youtube className="w-5 h-5" style={{ color: "#FF0000" }} />
            <h2 className="text-sm font-bold" style={{ color: "#292524" }}>
              Design your thumbnail
            </h2>
          </div>

          <div>
            <label className="block text-xs font-semibold mb-1" style={{ color: "#78614E" }}>
              Title (goes on the thumbnail) <span style={{ color: "#EF4444" }}>*</span>
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              maxLength={120}
              placeholder="e.g. I Tested 10 AI Tools in 60 Seconds"
              className="w-full rounded-lg px-3 py-2 text-sm"
              style={{ backgroundColor: "#FFF8F0", border: "1px solid rgba(245,215,160,0.4)", color: "#292524", outline: "none" }}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold mb-1" style={{ color: "#78614E" }}>
                Topic / niche
              </label>
              <input
                type="text"
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                placeholder="productivity, fitness, crypto..."
                className="w-full rounded-lg px-3 py-2 text-sm"
                style={{ backgroundColor: "#FFF8F0", border: "1px solid rgba(245,215,160,0.4)", color: "#292524", outline: "none" }}
              />
            </div>
            <div>
              <label className="block text-xs font-semibold mb-1" style={{ color: "#78614E" }}>
                Visual accent (optional)
              </label>
              <input
                type="text"
                value={accent}
                onChange={(e) => setAccent(e.target.value)}
                placeholder="a shocked YouTuber, glowing laptop..."
                className="w-full rounded-lg px-3 py-2 text-sm"
                style={{ backgroundColor: "#FFF8F0", border: "1px solid rgba(245,215,160,0.4)", color: "#292524", outline: "none" }}
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold mb-2" style={{ color: "#78614E" }}>
              Style
            </label>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
              {STYLES.map((s) => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => setStyle(s.id)}
                  className="text-left rounded-lg px-3 py-2 transition-all"
                  style={{
                    backgroundColor: style === s.id ? "#FF0000" : "rgba(0,0,0,0.03)",
                    color: style === s.id ? "white" : "#292524",
                    border: `1px solid ${style === s.id ? "#FF0000" : "rgba(0,0,0,0.06)"}`,
                  }}
                >
                  <p className="text-xs font-bold">{s.label}</p>
                  <p className="text-[10px] opacity-80">{s.desc}</p>
                </button>
              ))}
            </div>
          </div>

          <button
            type="button"
            onClick={run}
            disabled={!canSubmit}
            className="w-full py-3 rounded-xl text-sm font-bold disabled:opacity-40 flex items-center justify-center gap-2"
            style={{ background: "linear-gradient(135deg, #FF0000, #CC0000)", color: "white" }}
          >
            {loading ? (<><Loader2 className="w-4 h-4 animate-spin" /> Generating...</>) : (<><Sparkles className="w-4 h-4" /> Generate thumbnail</>)}
          </button>

          {error && (
            <p className="text-xs font-semibold" style={{ color: "#B91C1C" }}>
              {error}
            </p>
          )}
        </section>

        {result?.image_url && (
          <section
            className="rounded-xl p-4 space-y-3"
            style={{ backgroundColor: "white", border: "1px solid rgba(0,0,0,0.06)" }}
          >
            <div className="rounded-lg overflow-hidden" style={{ aspectRatio: "16 / 9", backgroundColor: "rgba(0,0,0,0.03)" }}>
              <img
                src={result.image_url}
                alt={title}
                className="w-full h-full object-cover"
                loading="lazy"
              />
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <p className="text-xs flex-1" style={{ color: "#A8967E" }}>
                {result.cost_usd ? `$${result.cost_usd.toFixed(4)}` : "ready"} · 16:9 · saved to Asset Library
              </p>
              <button
                type="button"
                onClick={copyUrl}
                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-md text-xs font-bold"
                style={{ backgroundColor: copied ? "#10B981" : "rgba(0,0,0,0.04)", color: copied ? "white" : "#78614E" }}
              >
                {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                {copied ? "Copied" : "Copy URL"}
              </button>
              <a
                href={result.image_url}
                download
                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-md text-xs font-bold"
                style={{ backgroundColor: "#292524", color: "white" }}
              >
                <Download className="w-3 h-3" />
                Download
              </a>
            </div>
            <p className="text-[11px]" style={{ color: "#A8967E" }}>
              Tip: not happy with the result? Re-run — each generation is a fresh seed.
            </p>
          </section>
        )}
      </main>
    </div>
  );
}
