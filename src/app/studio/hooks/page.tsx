"use client";

/**
 * Hook Library — a persistent collection of opening lines that work.
 *
 * Users save hooks manually OR extract them from past captions via AI.
 * Filter by type + tag + search. Each hook has:
 *   - the hook text
 *   - a type (question/contradiction/stat/story/contrarian/manual)
 *   - free-text tags (niche, audience, etc.)
 *   - optional star rating (1-5) for how well it performed
 *   - copy-to-clipboard + "use in Calendar" shortcut
 *
 * Storage: localStorage for now — zero DDL required, consistent with
 * the existing competitors snapshot pattern. Ready to migrate to a
 * Supabase table when cross-device sync is needed.
 */

import { useCallback, useEffect, useMemo, useState } from "react";
import Header from "@/components/layout/Header";
import {
  BookOpen, Plus, Search, Trash2, Copy, Check, Star, Sparkles, Loader2,
  Tag, Filter, Calendar as CalIcon, Wand2,
} from "lucide-react";

type HookType = "question" | "contradiction" | "stat" | "story" | "contrarian" | "manual";

interface Hook {
  id: string;
  text: string;
  type: HookType;
  rationale?: string;
  tags: string[];
  rating: number;  // 0 = unrated, 1-5
  created_at: number;
}

const STORAGE_KEY = "mhp_hooks_v1";
const TYPE_META: Record<HookType, { label: string; color: string }> = {
  question:      { label: "Question",      color: "#0EA5E9" },
  contradiction: { label: "Contradiction", color: "#EF4444" },
  stat:          { label: "Stat",          color: "#10B981" },
  story:         { label: "Story",         color: "var(--color-primary)" },
  contrarian:    { label: "Contrarian",    color: "#8B5CF6" },
  manual:        { label: "Manual",        color: "#78614E" },
};

function loadHooks(): Hook[] {
  if (typeof window === "undefined") return [];
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "[]") as Hook[]; }
  catch { return []; }
}
function saveHooks(list: Hook[]) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(list)); } catch { /* storage full */ }
}

export default function HookLibraryPage() {
  const [hooks, setHooks] = useState<Hook[]>([]);
  const [mounted, setMounted] = useState(false);
  const [q, setQ] = useState("");
  const [typeFilter, setTypeFilter] = useState<HookType | "all">("all");
  const [minRating, setMinRating] = useState(0);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Add form
  const [draftText, setDraftText] = useState("");
  const [draftTags, setDraftTags] = useState("");

  // Extract from caption
  const [sourceCaption, setSourceCaption] = useState("");
  const [extracting, setExtracting] = useState(false);
  const [extractError, setExtractError] = useState<string | null>(null);
  const [extractedBatch, setExtractedBatch] = useState<
    Array<{ hook: string; type: string; rationale: string }>
  >([]);

  useEffect(() => {
    setHooks(loadHooks());
    setMounted(true);
  }, []);

  const commit = useCallback((next: Hook[]) => {
    setHooks(next);
    saveHooks(next);
  }, []);

  const addManual = () => {
    const text = draftText.trim();
    if (text.length < 5) return;
    const tags = draftTags.split(",").map((t) => t.trim()).filter(Boolean).slice(0, 8);
    const newHook: Hook = {
      id: `h_${Date.now()}`,
      text,
      type: "manual",
      tags,
      rating: 0,
      created_at: Date.now(),
    };
    commit([newHook, ...hooks]);
    setDraftText("");
    setDraftTags("");
  };

  const extract = async () => {
    const cap = sourceCaption.trim();
    if (cap.length < 20 || extracting) return;
    setExtracting(true);
    setExtractError(null);
    setExtractedBatch([]);
    try {
      const res = await fetch("/api/ai/extract-hooks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ caption: cap }),
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error ?? "Failed");
      setExtractedBatch(d.hooks ?? []);
    } catch (e) {
      setExtractError(e instanceof Error ? e.message : "Failed");
    } finally {
      setExtracting(false);
    }
  };

  const saveExtracted = (idx: number) => {
    const item = extractedBatch[idx];
    if (!item) return;
    const type: HookType = (["question", "contradiction", "stat", "story", "contrarian"] as const)
      .find((t) => t === item.type) ?? "manual";
    const newHook: Hook = {
      id: `h_${Date.now()}_${idx}`,
      text: item.hook,
      type,
      rationale: item.rationale,
      tags: [],
      rating: 0,
      created_at: Date.now(),
    };
    commit([newHook, ...hooks]);
    setExtractedBatch((prev) => prev.filter((_, i) => i !== idx));
  };

  const deleteHook = (id: string) => commit(hooks.filter((h) => h.id !== id));

  const rate = (id: string, r: number) => {
    commit(hooks.map((h) => (h.id === id ? { ...h, rating: h.rating === r ? 0 : r } : h)));
  };

  const copyHook = async (id: string, text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 1500);
    } catch { /* no-op */ }
  };

  const useInCalendar = (text: string) => {
    window.open(`/calendar?caption=${encodeURIComponent(text)}`, "_blank");
  };

  const filtered = useMemo(() => {
    const qLower = q.trim().toLowerCase();
    return hooks.filter((h) => {
      if (typeFilter !== "all" && h.type !== typeFilter) return false;
      if (h.rating < minRating) return false;
      if (qLower && !h.text.toLowerCase().includes(qLower) && !h.tags.some((t) => t.toLowerCase().includes(qLower))) return false;
      return true;
    });
  }, [hooks, q, typeFilter, minRating]);

  return (
    <div className="min-h-screen" style={{ backgroundColor: "var(--color-bg-secondary)" }}>
      <Header title="Hook Library" subtitle="Your reusable opening lines — never start from scratch again" />

      <main className="max-w-6xl mx-auto px-6 py-6 space-y-5">
        {/* Add new */}
        <section className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div
            className="rounded-xl p-4 space-y-3"
            style={{ backgroundColor: "white", border: "1px solid rgba(0,0,0,0.06)" }}
          >
            <div className="flex items-center gap-2">
              <Plus className="w-4 h-4" style={{ color: "var(--color-primary)" }} />
              <p className="text-sm font-bold" style={{ color: "var(--color-text)" }}>Save a hook manually</p>
            </div>
            <textarea
              value={draftText}
              onChange={(e) => setDraftText(e.target.value)}
              rows={3}
              maxLength={140}
              placeholder="The one-liner you want to reuse..."
              className="w-full rounded-lg px-3 py-2 text-sm resize-none"
              style={{ backgroundColor: "var(--color-bg)", border: "1px solid rgba(245,215,160,0.4)", color: "var(--color-text)", outline: "none" }}
            />
            <input
              type="text"
              value={draftTags}
              onChange={(e) => setDraftTags(e.target.value)}
              placeholder="tags, comma-separated — e.g. agency, pain-point, curiosity"
              className="w-full rounded-lg px-3 py-2 text-xs"
              style={{ backgroundColor: "var(--color-bg)", border: "1px solid rgba(245,215,160,0.4)", color: "var(--color-text)", outline: "none" }}
            />
            <button
              type="button"
              onClick={addManual}
              disabled={draftText.trim().length < 5}
              className="inline-flex items-center gap-1 px-3 py-2 rounded-md text-xs font-bold disabled:opacity-40"
              style={{ backgroundColor: "var(--color-primary)", color: "#1C1814" }}
            >
              <Plus className="w-3 h-3" />
              Save to library
            </button>
          </div>

          <div
            className="rounded-xl p-4 space-y-3"
            style={{ backgroundColor: "rgba(139,92,246,0.04)", border: "1px solid rgba(139,92,246,0.2)" }}
          >
            <div className="flex items-center gap-2">
              <Wand2 className="w-4 h-4" style={{ color: "#8B5CF6" }} />
              <p className="text-sm font-bold" style={{ color: "var(--color-text)" }}>Extract hooks from a caption</p>
            </div>
            <textarea
              value={sourceCaption}
              onChange={(e) => setSourceCaption(e.target.value)}
              rows={3}
              maxLength={5000}
              placeholder="Paste a past post or an article — AI pulls the 5 strongest hook-worthy lines."
              className="w-full rounded-lg px-3 py-2 text-sm resize-none"
              style={{ backgroundColor: "white", border: "1px solid rgba(139,92,246,0.25)", color: "var(--color-text)", outline: "none" }}
            />
            <button
              type="button"
              onClick={extract}
              disabled={sourceCaption.trim().length < 20 || extracting}
              className="inline-flex items-center gap-1 px-3 py-2 rounded-md text-xs font-bold disabled:opacity-40"
              style={{ backgroundColor: "#8B5CF6", color: "white" }}
            >
              {extracting ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />}
              {extracting ? "Extracting..." : "Extract hooks"}
            </button>

            {extractError && (
              <p className="text-xs font-semibold" style={{ color: "#B91C1C" }}>{extractError}</p>
            )}

            {extractedBatch.length > 0 && (
              <div className="space-y-2 pt-2 border-t" style={{ borderColor: "rgba(139,92,246,0.2)" }}>
                {extractedBatch.map((x, i) => (
                  <div
                    key={i}
                    className="rounded-md p-2 flex items-start gap-2"
                    style={{ backgroundColor: "white", border: "1px solid rgba(139,92,246,0.15)" }}
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold" style={{ color: "var(--color-text)" }}>{x.hook}</p>
                      <p className="text-[10px] mt-0.5" style={{ color: "#78614E" }}>
                        <span className="uppercase font-bold" style={{ color: "#8B5CF6" }}>{x.type}</span> · {x.rationale}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => saveExtracted(i)}
                      className="flex-shrink-0 inline-flex items-center gap-1 px-2 py-1 rounded text-[10px] font-bold"
                      style={{ backgroundColor: "#8B5CF6", color: "white" }}
                    >
                      <Plus className="w-2.5 h-2.5" />
                      Save
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>

        {/* Filters */}
        <section
          className="rounded-xl p-3 flex items-center gap-3 flex-wrap"
          style={{ backgroundColor: "white", border: "1px solid rgba(0,0,0,0.06)" }}
        >
          <BookOpen className="w-4 h-4" style={{ color: "var(--color-primary)" }} />
          <div className="flex-1 min-w-[200px] relative">
            <Search className="w-3 h-3 absolute left-3 top-1/2 -translate-y-1/2" style={{ color: "#A8967E" }} />
            <input
              type="text"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search hooks or tags..."
              className="w-full rounded-md pl-8 pr-3 py-1.5 text-xs"
              style={{ backgroundColor: "var(--color-bg)", border: "1px solid rgba(245,215,160,0.4)", color: "var(--color-text)", outline: "none" }}
            />
          </div>
          <div className="flex items-center gap-1">
            <Filter className="w-3 h-3" style={{ color: "#78614E" }} />
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value as HookType | "all")}
              className="rounded-md px-2 py-1 text-xs"
              style={{ backgroundColor: "var(--color-bg)", border: "1px solid rgba(245,215,160,0.4)", color: "var(--color-text)", outline: "none" }}
            >
              <option value="all">All types</option>
              {(Object.keys(TYPE_META) as HookType[]).map((t) => (
                <option key={t} value={t}>{TYPE_META[t].label}</option>
              ))}
            </select>
          </div>
          <div className="flex items-center gap-1">
            <Star className="w-3 h-3" style={{ color: "#78614E" }} />
            <select
              value={minRating}
              onChange={(e) => setMinRating(parseInt(e.target.value))}
              className="rounded-md px-2 py-1 text-xs"
              style={{ backgroundColor: "var(--color-bg)", border: "1px solid rgba(245,215,160,0.4)", color: "var(--color-text)", outline: "none" }}
            >
              <option value={0}>Any rating</option>
              <option value={3}>≥3 stars</option>
              <option value={4}>≥4 stars</option>
              <option value={5}>5 stars</option>
            </select>
          </div>
          <p className="text-[11px]" style={{ color: "#A8967E" }}>
            {filtered.length} of {hooks.length}
          </p>
        </section>

        {/* Hook list */}
        {mounted && filtered.length === 0 && (
          <div
            className="rounded-xl py-12 text-center"
            style={{ backgroundColor: "white", border: "1px dashed rgba(0,0,0,0.1)" }}
          >
            <BookOpen className="w-6 h-6 mx-auto mb-2" style={{ color: "#A8967E" }} />
            <p className="text-sm font-bold" style={{ color: "var(--color-text)" }}>
              {hooks.length === 0 ? "No hooks yet" : "No hooks match your filters"}
            </p>
            <p className="text-xs mt-1" style={{ color: "#78614E" }}>
              {hooks.length === 0
                ? "Save hooks manually, or paste any past post above and let AI extract them."
                : "Try clearing the search or lowering the rating threshold."}
            </p>
          </div>
        )}

        <section className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {filtered.map((h) => {
            const meta = TYPE_META[h.type];
            return (
              <div
                key={h.id}
                className="rounded-xl p-4 flex flex-col gap-2"
                style={{ backgroundColor: "white", border: `1px solid ${meta.color}33` }}
              >
                <div className="flex items-center gap-2 flex-wrap">
                  <span
                    className="text-[10px] font-bold uppercase px-1.5 py-0.5 rounded"
                    style={{ backgroundColor: `${meta.color}1A`, color: meta.color }}
                  >
                    {meta.label}
                  </span>
                  <div className="flex items-center gap-0.5">
                    {[1, 2, 3, 4, 5].map((n) => (
                      <button
                        key={n}
                        type="button"
                        onClick={() => rate(h.id, n)}
                        className="p-0.5"
                        aria-label={`Rate ${n} stars`}
                      >
                        <Star
                          className="w-3 h-3"
                          style={{
                            color: n <= h.rating ? "var(--color-primary)" : "#E5E1D9",
                            fill: n <= h.rating ? "var(--color-primary)" : "transparent",
                          }}
                        />
                      </button>
                    ))}
                  </div>
                  <span className="ml-auto text-[10px]" style={{ color: "#A8967E" }}>
                    {new Date(h.created_at).toLocaleDateString()}
                  </span>
                </div>
                <p className="text-sm" style={{ color: "var(--color-text)", lineHeight: 1.4 }}>
                  {h.text}
                </p>
                {h.rationale && (
                  <p className="text-[11px] italic" style={{ color: "#78614E" }}>
                    {h.rationale}
                  </p>
                )}
                {h.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {h.tags.map((t) => (
                      <span
                        key={t}
                        className="inline-flex items-center gap-0.5 text-[10px] px-1.5 py-0.5 rounded"
                        style={{ backgroundColor: "rgba(0,0,0,0.04)", color: "#78614E" }}
                      >
                        <Tag className="w-2 h-2" />
                        {t}
                      </span>
                    ))}
                  </div>
                )}
                <div className="flex gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => copyHook(h.id, h.text)}
                    className="flex-1 inline-flex items-center justify-center gap-1 px-2 py-1 rounded text-xs font-bold"
                    style={{ backgroundColor: copiedId === h.id ? "#10B981" : "rgba(0,0,0,0.04)", color: copiedId === h.id ? "white" : "#78614E" }}
                  >
                    {copiedId === h.id ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                    {copiedId === h.id ? "Copied" : "Copy"}
                  </button>
                  <button
                    type="button"
                    onClick={() => useInCalendar(h.text)}
                    className="flex-1 inline-flex items-center justify-center gap-1 px-2 py-1 rounded text-xs font-bold"
                    style={{ backgroundColor: meta.color, color: "white" }}
                  >
                    <CalIcon className="w-3 h-3" />
                    Use
                  </button>
                  <button
                    type="button"
                    onClick={() => deleteHook(h.id)}
                    className="inline-flex items-center justify-center w-7 h-7 rounded"
                    style={{ backgroundColor: "rgba(239,68,68,0.08)", color: "#EF4444" }}
                    aria-label="Delete"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              </div>
            );
          })}
        </section>
      </main>
    </div>
  );
}
