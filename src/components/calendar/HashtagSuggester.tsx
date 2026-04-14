"use client";

/**
 * Inline hashtag suggester — lives next to the hashtags field in the
 * Calendar form. User clicks "Suggest", gets 15 platform-aware
 * hashtags, clicks to add to the form.
 */

import { useState } from "react";
import { Hash, Sparkles, Loader2, Plus, X, Check } from "lucide-react";

interface Props {
  caption: string;
  platform: string;
  currentHashtags: string;
  onAdd: (hashtagsString: string) => void;
}

export default function HashtagSuggester({ caption, platform, currentHashtags, onAdd }: Props) {
  const [open, setOpen] = useState(false);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [picked, setPicked] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const fetchSuggestions = async () => {
    if (!caption.trim() || caption.trim().length < 5) {
      setErr("Write a caption first (min 5 chars)");
      setOpen(true);
      return;
    }
    setOpen(true);
    setLoading(true);
    setErr(null);
    setSuggestions([]);
    setPicked(new Set());
    try {
      const res = await fetch("/api/ai/hashtags", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ caption, platform }),
      });
      const d = await res.json();
      if (!res.ok || !d.ok) {
        setErr(d.error ?? "Failed");
      } else {
        setSuggestions(d.hashtags ?? []);
        // Pre-select all
        setPicked(new Set(d.hashtags ?? []));
      }
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Failed");
    } finally {
      setLoading(false);
    }
  };

  const toggle = (tag: string) => {
    setPicked((p) => {
      const next = new Set(p);
      if (next.has(tag)) next.delete(tag);
      else next.add(tag);
      return next;
    });
  };

  const applyPicked = () => {
    const toAdd = suggestions.filter((t) => picked.has(t));
    // Merge with existing (avoid duplicates)
    const existing = new Set(
      currentHashtags
        .split(/[\s,]+/)
        .filter((t) => t.startsWith("#"))
        .map((t) => t.toLowerCase()),
    );
    const merged = [
      ...currentHashtags.split(/[\s,]+/).filter((t) => t.startsWith("#")),
      ...toAdd.filter((t) => !existing.has(t.toLowerCase())),
    ];
    onAdd(merged.join(" "));
    setOpen(false);
  };

  return (
    <>
      <button
        type="button"
        onClick={fetchSuggestions}
        className="inline-flex items-center gap-1 text-xs font-bold px-2.5 py-1 rounded-md"
        style={{
          backgroundColor: "rgba(139,92,246,0.12)",
          color: "#8B5CF6",
        }}
        title="Suggest hashtags with AI"
      >
        <Sparkles className="w-3 h-3" />
        Suggest
      </button>

      {open && (
        <div
          className="fixed inset-0 z-[90] flex items-center justify-center p-4"
          style={{ backgroundColor: "rgba(0,0,0,0.5)" }}
          onClick={(e) => {
            if (e.target === e.currentTarget) setOpen(false);
          }}
        >
          <div
            className="w-full max-w-lg rounded-2xl overflow-hidden flex flex-col"
            style={{ backgroundColor: "#FFFCF7", maxHeight: "85dvh" }}
          >
            <div
              className="flex items-center gap-3 px-5 py-3 border-b"
              style={{
                borderColor: "rgba(139,92,246,0.2)",
                background: "linear-gradient(135deg, rgba(139,92,246,0.06), rgba(245,158,11,0.06))",
              }}
            >
              <Hash className="w-5 h-5" style={{ color: "#8B5CF6" }} />
              <p className="flex-1 text-sm font-bold" style={{ color: "#292524" }}>
                Hashtag suggestions ({platform})
              </p>
              <button type="button" onClick={() => setOpen(false)} style={{ color: "#78614E" }}>
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 overflow-y-auto flex-1">
              {loading && (
                <div className="py-6 text-center">
                  <Loader2 className="w-5 h-5 animate-spin inline" style={{ color: "#8B5CF6" }} />
                  <p className="text-xs mt-2" style={{ color: "#78614E" }}>
                    Analyzing caption...
                  </p>
                </div>
              )}

              {err && (
                <div
                  className="rounded-lg p-3 text-xs"
                  style={{
                    backgroundColor: "rgba(239,68,68,0.08)",
                    border: "1px solid rgba(239,68,68,0.3)",
                    color: "#B91C1C",
                  }}
                >
                  {err}
                </div>
              )}

              {suggestions.length > 0 && (
                <>
                  <p className="text-xs mb-3" style={{ color: "#78614E" }}>
                    {picked.size} of {suggestions.length} selected. Click to toggle.
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {suggestions.map((tag) => {
                      const on = picked.has(tag);
                      return (
                        <button
                          key={tag}
                          type="button"
                          onClick={() => toggle(tag)}
                          className="text-xs font-semibold px-2.5 py-1.5 rounded-md transition-all"
                          style={{
                            backgroundColor: on ? "#8B5CF6" : "rgba(139,92,246,0.08)",
                            color: on ? "white" : "#8B5CF6",
                          }}
                        >
                          {on && <Check className="w-3 h-3 inline mr-1" />}
                          {tag}
                        </button>
                      );
                    })}
                  </div>
                </>
              )}
            </div>

            {suggestions.length > 0 && (
              <div
                className="px-5 py-3 border-t flex items-center justify-between gap-3"
                style={{ borderColor: "rgba(245,215,160,0.3)", backgroundColor: "#FFF8F0" }}
              >
                <button
                  type="button"
                  onClick={() => setPicked(new Set(picked.size === suggestions.length ? [] : suggestions))}
                  className="text-[11px] font-bold"
                  style={{ color: "#78614E" }}
                >
                  {picked.size === suggestions.length ? "Deselect all" : "Select all"}
                </button>
                <button
                  type="button"
                  onClick={applyPicked}
                  disabled={picked.size === 0}
                  className="px-4 py-2 rounded-lg text-xs font-bold flex items-center gap-2 disabled:opacity-40"
                  style={{
                    background: "linear-gradient(135deg, #8B5CF6, #6D28D9)",
                    color: "white",
                  }}
                >
                  <Plus className="w-3 h-3" />
                  Add {picked.size} to post
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
