"use client";

/**
 * Brand Voice — setup + editing.
 *
 * Flow:
 *  1. User pastes 3-5 past posts in separate textareas
 *  2. Click "Analyze" → Haiku returns tone, vocabulary, rules, dos/donts,
 *     and a summary ready for system prompts
 *  3. User reviews + edits
 *  4. Click "Save" → stored in user_brand_voice
 *  5. From then on, every AI feature (Campaign Auto-Pilot, AI Image
 *     prompts, etc.) prepends this profile to its system prompt
 */

import { useCallback, useEffect, useState } from "react";
import Header from "@/components/layout/Header";
import { Mic, Loader2, Sparkles, Save, Trash2, AlertCircle, Plus, X, Check } from "lucide-react";

interface Voice {
  tone: string;
  vocabulary: string;
  style_guide: string;
  dos: string[];
  donts: string[];
  ai_summary: string;
  sample_posts?: string[];
}

export default function BrandVoicePage() {
  const [samples, setSamples] = useState<string[]>(["", "", ""]);
  const [voice, setVoice] = useState<Voice | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [savedOnce, setSavedOnce] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const load = useCallback(async () => {
    const res = await fetch("/api/brand/voice", { cache: "no-store" });
    if (res.ok) {
      const d = await res.json();
      if (d.voice) {
        setVoice({
          tone: d.voice.tone ?? "",
          vocabulary: d.voice.vocabulary ?? "",
          style_guide: d.voice.style_guide ?? "",
          dos: d.voice.dos ?? [],
          donts: d.voice.donts ?? [],
          ai_summary: d.voice.ai_summary ?? "",
          sample_posts: d.voice.sample_posts ?? [],
        });
        if (d.voice.sample_posts?.length) {
          setSamples(d.voice.sample_posts);
        }
        setSavedOnce(true);
      }
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const analyze = async () => {
    const filled = samples.filter((s) => s.trim().length >= 20);
    if (filled.length < 2) {
      setErr("Provide at least 2 samples of 20+ chars each");
      return;
    }
    setAnalyzing(true);
    setErr(null);
    try {
      const res = await fetch("/api/brand/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ samples: filled }),
      });
      const d = await res.json();
      if (!res.ok || !d.ok) {
        setErr(d.error ?? "Analysis failed");
        return;
      }
      setVoice({ ...d.voice, sample_posts: filled });
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Failed");
    } finally {
      setAnalyzing(false);
    }
  };

  const save = async () => {
    if (!voice) return;
    setSaving(true);
    setErr(null);
    try {
      const res = await fetch("/api/brand/voice", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...voice,
          sample_posts: samples.filter((s) => s.trim().length >= 20),
        }),
      });
      if (res.ok) setSavedOnce(true);
      else setErr("Save failed");
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Failed");
    } finally {
      setSaving(false);
    }
  };

  const deleteVoice = async () => {
    if (!confirm("Delete your brand voice profile? AI will fall back to a neutral voice.")) return;
    await fetch("/api/brand/voice", { method: "DELETE" });
    setVoice(null);
    setSavedOnce(false);
    setSamples(["", "", ""]);
  };

  const updateField = <K extends keyof Voice>(key: K, value: Voice[K]) => {
    setVoice((v) => (v ? { ...v, [key]: value } : v));
  };

  const updateListItem = (key: "dos" | "donts", idx: number, value: string) => {
    setVoice((v) => {
      if (!v) return v;
      const list = [...v[key]];
      list[idx] = value;
      return { ...v, [key]: list };
    });
  };
  const addListItem = (key: "dos" | "donts") => {
    setVoice((v) => (v ? { ...v, [key]: [...v[key], ""] } : v));
  };
  const removeListItem = (key: "dos" | "donts", idx: number) => {
    setVoice((v) => (v ? { ...v, [key]: v[key].filter((_, i) => i !== idx) } : v));
  };

  return (
    <div className="min-h-screen" style={{ backgroundColor: "var(--color-bg-secondary)" }}>
      <Header title="Brand Voice" subtitle="Teach AI how your brand sounds, used everywhere" />

      <main className="max-w-4xl mx-auto px-6 py-6 space-y-6">
        {/* Samples */}
        <section
          className="rounded-2xl p-6"
          style={{
            backgroundColor: "white",
            border: "1px solid rgba(245,158,11,0.2)",
          }}
        >
          <div className="flex items-center gap-2 mb-2">
            <Mic className="w-5 h-5" style={{ color: "var(--color-primary)" }} />
            <h2 className="text-lg font-bold" style={{ color: "var(--color-text)" }}>
              Sample posts
            </h2>
          </div>
          <p className="text-xs mb-4" style={{ color: "#78614E" }}>
            Paste 3-5 of your best past social posts. The more representative of
            your usual style, the more accurate the analysis. Min 20 chars each.
          </p>

          <div className="space-y-3">
            {samples.map((s, i) => (
              <div key={i} className="relative">
                <textarea
                  value={s}
                  onChange={(e) => {
                    const next = [...samples];
                    next[i] = e.target.value;
                    setSamples(next);
                  }}
                  placeholder={`Sample ${i + 1} — paste a complete post including emojis + hashtags`}
                  rows={3}
                  maxLength={4000}
                  className="w-full rounded-lg px-3 py-2 text-sm resize-none"
                  style={{
                    backgroundColor: "var(--color-bg)",
                    border: "1px solid rgba(245,215,160,0.4)",
                    color: "var(--color-text)",
                    outline: "none",
                  }}
                />
                {i >= 3 && (
                  <button
                    type="button"
                    onClick={() => setSamples(samples.filter((_, j) => j !== i))}
                    className="absolute top-2 right-2 p-1 rounded"
                    style={{ color: "#A8967E" }}
                  >
                    <X className="w-3 h-3" />
                  </button>
                )}
              </div>
            ))}
            {samples.length < 5 && (
              <button
                type="button"
                onClick={() => setSamples([...samples, ""])}
                className="text-xs font-bold inline-flex items-center gap-1"
                style={{ color: "#8B5CF6" }}
              >
                <Plus className="w-3 h-3" />
                Add another sample
              </button>
            )}
          </div>

          <button
            type="button"
            onClick={analyze}
            disabled={analyzing || samples.filter((s) => s.trim().length >= 20).length < 2}
            className="mt-4 px-5 py-2.5 rounded-xl text-sm font-bold flex items-center gap-2 disabled:opacity-40"
            style={{
              background: "linear-gradient(135deg, #8B5CF6, #6D28D9)",
              color: "white",
            }}
          >
            {analyzing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
            {analyzing ? "Analyzing..." : voice ? "Re-analyze" : "Analyze voice"}
          </button>

          {err && (
            <div
              className="mt-3 rounded-lg p-2.5 flex items-center gap-2 text-xs"
              style={{
                backgroundColor: "rgba(239,68,68,0.08)",
                border: "1px solid rgba(239,68,68,0.3)",
                color: "#B91C1C",
              }}
            >
              <AlertCircle className="w-3.5 h-3.5" />
              {err}
            </div>
          )}
        </section>

        {/* Analyzed voice — editable */}
        {voice && (
          <section
            className="rounded-2xl p-6 space-y-4"
            style={{
              backgroundColor: "white",
              border: `1px solid ${savedOnce ? "rgba(16,185,129,0.3)" : "rgba(139,92,246,0.3)"}`,
            }}
          >
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold" style={{ color: "var(--color-text)" }}>
                Your voice profile
              </h2>
              {savedOnce && (
                <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider" style={{ color: "#10B981" }}>
                  <Check className="w-3 h-3" />
                  Saved
                </span>
              )}
            </div>

            <TextField
              label="Tone"
              value={voice.tone}
              onChange={(v) => updateField("tone", v)}
              placeholder="e.g. warm, data-driven, slightly witty"
            />
            <TextField
              label="Vocabulary"
              value={voice.vocabulary}
              onChange={(v) => updateField("vocabulary", v)}
              placeholder="Characteristic phrases, comma-separated"
            />
            <TextArea
              label="Style rules"
              value={voice.style_guide}
              onChange={(v) => updateField("style_guide", v)}
              placeholder="e.g. short sentences, one emoji max, hashtags inline not at end"
              rows={3}
            />

            <ListField
              label="Always (DO)"
              items={voice.dos}
              onUpdate={(i, v) => updateListItem("dos", i, v)}
              onRemove={(i) => removeListItem("dos", i)}
              onAdd={() => addListItem("dos")}
              accent="#10B981"
            />
            <ListField
              label="Never (DON'T)"
              items={voice.donts}
              onUpdate={(i, v) => updateListItem("donts", i, v)}
              onRemove={(i) => removeListItem("donts", i)}
              onAdd={() => addListItem("donts")}
              accent="#EF4444"
            />

            <TextArea
              label="AI summary (used in system prompts)"
              value={voice.ai_summary}
              onChange={(v) => updateField("ai_summary", v)}
              placeholder="3-4 sentences that describe the voice"
              rows={4}
            />

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={save}
                disabled={saving}
                className="px-5 py-2.5 rounded-lg text-sm font-bold flex items-center gap-2"
                style={{
                  background: "linear-gradient(135deg, var(--color-primary), var(--color-primary-hover))",
                  color: "#1C1814",
                }}
              >
                {saving ? <Loader2 className="w-3 h-3 animate-spin" /> : <Save className="w-3 h-3" />}
                Save profile
              </button>
              {savedOnce && (
                <button
                  type="button"
                  onClick={deleteVoice}
                  className="px-4 py-2.5 rounded-lg text-xs font-bold flex items-center gap-2"
                  style={{
                    backgroundColor: "rgba(239,68,68,0.08)",
                    color: "#EF4444",
                  }}
                >
                  <Trash2 className="w-3 h-3" />
                  Delete
                </button>
              )}
            </div>
          </section>
        )}
      </main>
    </div>
  );
}

// ── Helpers ────────────────────────────────────────────────────────────

function TextField(props: { label: string; value: string; onChange: (v: string) => void; placeholder?: string }) {
  return (
    <div>
      <label className="block text-[10px] font-bold uppercase tracking-wider mb-1" style={{ color: "#78614E" }}>
        {props.label}
      </label>
      <input
        type="text"
        value={props.value}
        onChange={(e) => props.onChange(e.target.value)}
        placeholder={props.placeholder}
        className="w-full rounded-lg px-3 py-2 text-sm"
        style={{
          backgroundColor: "var(--color-bg)",
          border: "1px solid rgba(245,215,160,0.4)",
          color: "var(--color-text)",
          outline: "none",
        }}
      />
    </div>
  );
}

function TextArea(props: { label: string; value: string; onChange: (v: string) => void; placeholder?: string; rows?: number }) {
  return (
    <div>
      <label className="block text-[10px] font-bold uppercase tracking-wider mb-1" style={{ color: "#78614E" }}>
        {props.label}
      </label>
      <textarea
        value={props.value}
        onChange={(e) => props.onChange(e.target.value)}
        placeholder={props.placeholder}
        rows={props.rows ?? 3}
        className="w-full rounded-lg px-3 py-2 text-sm resize-none"
        style={{
          backgroundColor: "var(--color-bg)",
          border: "1px solid rgba(245,215,160,0.4)",
          color: "var(--color-text)",
          outline: "none",
        }}
      />
    </div>
  );
}

function ListField(props: {
  label: string;
  items: string[];
  onUpdate: (i: number, v: string) => void;
  onRemove: (i: number) => void;
  onAdd: () => void;
  accent: string;
}) {
  return (
    <div>
      <label className="block text-[10px] font-bold uppercase tracking-wider mb-1" style={{ color: "#78614E" }}>
        {props.label}
      </label>
      <div className="space-y-1.5">
        {props.items.map((item, i) => (
          <div key={i} className="flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ backgroundColor: props.accent }} />
            <input
              type="text"
              value={item}
              onChange={(e) => props.onUpdate(i, e.target.value)}
              className="flex-1 rounded-md px-2 py-1.5 text-sm"
              style={{
                backgroundColor: "var(--color-bg)",
                border: "1px solid rgba(245,215,160,0.4)",
                color: "var(--color-text)",
                outline: "none",
              }}
            />
            <button
              type="button"
              onClick={() => props.onRemove(i)}
              className="p-1 rounded"
              style={{ color: "#A8967E" }}
            >
              <X className="w-3 h-3" />
            </button>
          </div>
        ))}
      </div>
      <button
        type="button"
        onClick={props.onAdd}
        className="mt-1 text-[11px] font-bold inline-flex items-center gap-1"
        style={{ color: props.accent }}
      >
        <Plus className="w-3 h-3" />
        Add
      </button>
    </div>
  );
}
