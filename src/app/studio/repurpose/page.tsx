"use client";

/**
 * Content Repurposer — one caption → platform-optimized variants for
 * Instagram, LinkedIn, Twitter/X, TikTok and YouTube Shorts.
 */

import { useState } from "react";
import Header from "@/components/layout/Header";
import {
  Sparkles, Loader2, Copy, Check, Instagram, Linkedin, Twitter,
  Music2, Youtube, Shuffle,
} from "lucide-react";

type Target = "instagram" | "linkedin" | "twitter" | "tiktok" | "youtube";

const TARGETS: { id: Target; label: string; icon: React.ElementType; color: string }[] = [
  { id: "instagram", label: "Instagram", icon: Instagram, color: "#E1306C" },
  { id: "linkedin",  label: "LinkedIn",  icon: Linkedin,  color: "#0A66C2" },
  { id: "twitter",   label: "Twitter/X", icon: Twitter,   color: "#1DA1F2" },
  { id: "tiktok",    label: "TikTok",    icon: Music2,    color: "#000000" },
  { id: "youtube",   label: "YT Shorts", icon: Youtube,   color: "#FF0000" },
];

export default function RepurposePage() {
  const [source, setSource] = useState("");
  const [sourcePlatform, setSourcePlatform] = useState<Target>("instagram");
  const [enabled, setEnabled] = useState<Set<Target>>(new Set(TARGETS.map((t) => t.id)));
  const [loading, setLoading] = useState(false);
  const [variants, setVariants] = useState<Partial<Record<Target, string>>>({});
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState<Target | null>(null);

  const toggle = (id: Target) => {
    setEnabled((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const canSubmit = source.trim().length >= 10 && enabled.size > 0 && !loading;

  const run = async () => {
    if (!canSubmit) return;
    setLoading(true);
    setError(null);
    setVariants({});
    try {
      const res = await fetch("/api/ai/repurpose", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          caption: source.trim(),
          source_platform: sourcePlatform,
          targets: Array.from(enabled),
        }),
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error ?? "Failed");
      setVariants(d.variants ?? {});
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed");
    } finally {
      setLoading(false);
    }
  };

  const copy = async (id: Target, text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(id);
      setTimeout(() => setCopied(null), 1500);
    } catch { /* no-op */ }
  };

  return (
    <div className="min-h-screen" style={{ backgroundColor: "#FFFCF7" }}>
      <Header title="Content Repurposer" subtitle="One caption → platform-optimized variants for every channel" />

      <main className="max-w-5xl mx-auto px-6 py-6 space-y-5">
        {/* Input card */}
        <section
          className="rounded-xl p-5 space-y-4"
          style={{ backgroundColor: "white", border: "1px solid rgba(0,0,0,0.06)" }}
        >
          <div className="flex items-center gap-2">
            <Shuffle className="w-5 h-5" style={{ color: "#F59E0B" }} />
            <h2 className="text-sm font-bold" style={{ color: "#292524" }}>
              Source caption
            </h2>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <label className="text-xs font-semibold" style={{ color: "#78614E" }}>
              Source platform:
            </label>
            <select
              value={sourcePlatform}
              onChange={(e) => setSourcePlatform(e.target.value as Target)}
              className="rounded-md px-2 py-1 text-xs"
              style={{
                backgroundColor: "#FFF8F0",
                border: "1px solid rgba(245,215,160,0.4)",
                color: "#292524",
                outline: "none",
              }}
            >
              {TARGETS.map((t) => (
                <option key={t.id} value={t.id}>{t.label}</option>
              ))}
            </select>
          </div>

          <textarea
            value={source}
            onChange={(e) => setSource(e.target.value)}
            rows={5}
            maxLength={3000}
            placeholder="Paste your original caption — any language, any platform."
            className="w-full rounded-lg px-3 py-2 text-sm resize-none"
            style={{
              backgroundColor: "#FFF8F0",
              border: "1px solid rgba(245,215,160,0.4)",
              color: "#292524",
              outline: "none",
            }}
          />

          <div>
            <p className="text-xs font-semibold mb-2" style={{ color: "#78614E" }}>
              Repurpose for:
            </p>
            <div className="flex flex-wrap gap-2">
              {TARGETS.map((t) => {
                const Icon = t.icon;
                const on = enabled.has(t.id);
                return (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => toggle(t.id)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold transition-all"
                    style={{
                      backgroundColor: on ? t.color : "rgba(0,0,0,0.04)",
                      color: on ? "white" : "#78614E",
                      border: `1px solid ${on ? t.color : "rgba(0,0,0,0.08)"}`,
                    }}
                  >
                    <Icon className="w-3 h-3" />
                    {t.label}
                  </button>
                );
              })}
            </div>
          </div>

          <button
            type="button"
            onClick={run}
            disabled={!canSubmit}
            className="w-full py-3 rounded-xl text-sm font-bold disabled:opacity-40 flex items-center justify-center gap-2"
            style={{ background: "linear-gradient(135deg, #F59E0B, #D97706)", color: "#1C1814" }}
          >
            {loading ? (<><Loader2 className="w-4 h-4 animate-spin" /> Repurposing...</>) : (<><Sparkles className="w-4 h-4" /> Repurpose</>)}
          </button>

          {error && (
            <p className="text-xs font-semibold" style={{ color: "#B91C1C" }}>
              {error}
            </p>
          )}
        </section>

        {/* Output cards */}
        {Object.keys(variants).length > 0 && (
          <section className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {TARGETS.filter((t) => variants[t.id]).map((t) => {
              const Icon = t.icon;
              const v = variants[t.id]!;
              return (
                <div
                  key={t.id}
                  className="rounded-xl p-4 flex flex-col gap-3"
                  style={{ backgroundColor: "white", border: `1px solid ${t.color}33` }}
                >
                  <div className="flex items-center gap-2">
                    <div
                      className="w-7 h-7 rounded-md flex items-center justify-center"
                      style={{ backgroundColor: `${t.color}1A` }}
                    >
                      <Icon className="w-4 h-4" style={{ color: t.color }} />
                    </div>
                    <p className="text-sm font-bold flex-1" style={{ color: "#292524" }}>
                      {t.label}
                    </p>
                    <span className="text-[10px]" style={{ color: "#A8967E" }}>
                      {v.length} chars
                    </span>
                    <button
                      type="button"
                      onClick={() => copy(t.id, v)}
                      className="inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-bold"
                      style={{ backgroundColor: copied === t.id ? "#10B981" : "rgba(0,0,0,0.04)", color: copied === t.id ? "white" : "#78614E" }}
                    >
                      {copied === t.id ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                      {copied === t.id ? "Copied" : "Copy"}
                    </button>
                  </div>
                  <p
                    className="text-sm whitespace-pre-wrap"
                    style={{ color: "#292524", lineHeight: 1.5 }}
                  >
                    {v}
                  </p>
                </div>
              );
            })}
          </section>
        )}
      </main>
    </div>
  );
}
