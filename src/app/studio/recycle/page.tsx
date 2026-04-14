"use client";

/**
 * Evergreen Post Recycler — browse your published posts, pick one,
 * get 3 refreshed angles (seasonal / counterexample / specific-story)
 * ready to drop back on the calendar.
 */

import { useCallback, useEffect, useState } from "react";
import Header from "@/components/layout/Header";
import {
  Recycle, Loader2, Sparkles, Copy, Check, Calendar as CalIcon,
  ChevronRight, Clock,
} from "lucide-react";

interface Post {
  id: string;
  title: string | null;
  caption: string;
  platforms: string[] | null;
  status: string;
  scheduled_for: string;
  published_at: string | null;
  created_at: string;
}

interface Variant {
  angle: string;
  caption: string;
}

const ANGLE_META: Record<string, { label: string; color: string; desc: string }> = {
  "seasonal":        { label: "Seasonal",        color: "var(--color-primary)", desc: "Tied to the current moment" },
  "counterexample":  { label: "Counterexample",  color: "#8B5CF6", desc: "Flipped framing, same lesson" },
  "specific-story":  { label: "Specific Story",  color: "#10B981", desc: "Concrete anchor / stat" },
};

export default function RecyclePage() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [loadingPosts, setLoadingPosts] = useState(true);
  const [picked, setPicked] = useState<Post | null>(null);
  const [loading, setLoading] = useState(false);
  const [variants, setVariants] = useState<Variant[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState<number | null>(null);

  const loadPosts = useCallback(async () => {
    setLoadingPosts(true);
    try {
      const res = await fetch("/api/studio/queue?status=published&limit=30", { cache: "no-store" });
      if (res.ok) {
        const d = await res.json();
        setPosts(d.posts ?? []);
      }
    } finally {
      setLoadingPosts(false);
    }
  }, []);

  useEffect(() => { loadPosts(); }, [loadPosts]);

  const recycle = async (p: Post) => {
    setPicked(p);
    setLoading(true);
    setError(null);
    setVariants([]);
    try {
      const res = await fetch("/api/ai/recycle", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          caption: p.caption,
          platform: p.platforms?.[0] ?? "instagram",
          original_date: p.published_at ?? p.created_at,
        }),
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error ?? "Failed");
      setVariants(d.variants ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed");
    } finally {
      setLoading(false);
    }
  };

  const copy = async (idx: number, text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(idx);
      setTimeout(() => setCopied(null), 1500);
    } catch { /* no-op */ }
  };

  const scheduleOnCalendar = (caption: string) => {
    // The calendar form reads a ?caption= param to preload the caption.
    const url = `/calendar?caption=${encodeURIComponent(caption)}`;
    window.open(url, "_blank");
  };

  return (
    <div className="min-h-screen" style={{ backgroundColor: "var(--color-bg-secondary)" }}>
      <Header title="Evergreen Post Recycler" subtitle="Turn past hits into fresh posts — 3 angles per click" />

      <main className="max-w-6xl mx-auto px-6 py-6 grid grid-cols-1 lg:grid-cols-5 gap-5">
        {/* Left: published posts list */}
        <section className="lg:col-span-2 space-y-3">
          <div
            className="rounded-xl p-4"
            style={{ backgroundColor: "white", border: "1px solid rgba(0,0,0,0.06)" }}
          >
            <div className="flex items-center gap-2 mb-2">
              <Recycle className="w-4 h-4" style={{ color: "#10B981" }} />
              <h2 className="text-sm font-bold flex-1" style={{ color: "var(--color-text)" }}>
                Your published posts
              </h2>
              <span className="text-[10px]" style={{ color: "#A8967E" }}>
                {posts.length}
              </span>
            </div>
            {loadingPosts ? (
              <div className="py-6 text-center">
                <Loader2 className="w-4 h-4 animate-spin inline" style={{ color: "#A8967E" }} />
              </div>
            ) : posts.length === 0 ? (
              <p className="text-xs py-4 text-center" style={{ color: "#A8967E" }}>
                No published posts yet. After you publish a few, they'll show up here so you can recycle them.
              </p>
            ) : (
              <div className="space-y-1 max-h-[70vh] overflow-y-auto">
                {posts.map((p) => {
                  const active = picked?.id === p.id;
                  return (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => recycle(p)}
                      className="w-full text-left rounded-lg p-2.5 transition-all flex items-start gap-2"
                      style={{
                        backgroundColor: active ? "rgba(16,185,129,0.1)" : "transparent",
                        border: `1px solid ${active ? "rgba(16,185,129,0.3)" : "rgba(0,0,0,0.04)"}`,
                      }}
                    >
                      <div className="flex-1 min-w-0">
                        {p.title && (
                          <p className="text-xs font-bold truncate" style={{ color: "var(--color-text)" }}>
                            {p.title}
                          </p>
                        )}
                        <p className="text-[11px] line-clamp-2 mt-0.5" style={{ color: "#78614E", lineHeight: 1.35 }}>
                          {p.caption}
                        </p>
                        <div className="flex items-center gap-2 mt-1">
                          <Clock className="w-2.5 h-2.5" style={{ color: "#A8967E" }} />
                          <span className="text-[9px]" style={{ color: "#A8967E" }}>
                            {new Date(p.published_at ?? p.created_at).toLocaleDateString()}
                          </span>
                          {p.platforms?.slice(0, 3).map((pl) => (
                            <span
                              key={pl}
                              className="text-[9px] px-1.5 py-0.5 rounded uppercase font-bold"
                              style={{ backgroundColor: "rgba(0,0,0,0.04)", color: "#78614E" }}
                            >
                              {pl}
                            </span>
                          ))}
                        </div>
                      </div>
                      <ChevronRight className="w-3.5 h-3.5 flex-shrink-0 mt-1" style={{ color: active ? "#10B981" : "#C4AA8A" }} />
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </section>

        {/* Right: variants */}
        <section className="lg:col-span-3 space-y-3">
          {!picked && !loading && (
            <div
              className="rounded-xl p-8 text-center"
              style={{ backgroundColor: "white", border: "1px dashed rgba(0,0,0,0.1)" }}
            >
              <Recycle className="w-8 h-8 mx-auto mb-2" style={{ color: "#A8967E" }} />
              <p className="text-sm font-bold" style={{ color: "var(--color-text)" }}>
                Pick a published post to recycle
              </p>
              <p className="text-xs mt-1" style={{ color: "#78614E" }}>
                AI will generate 3 fresh angles (seasonal · counterexample · specific story) — you keep what works and drop it back on the calendar.
              </p>
            </div>
          )}

          {picked && (
            <>
              <div
                className="rounded-xl p-4"
                style={{ backgroundColor: "rgba(16,185,129,0.04)", border: "1px solid rgba(16,185,129,0.2)" }}
              >
                <p className="text-[10px] font-bold uppercase mb-1" style={{ color: "#059669" }}>
                  Original
                </p>
                <p className="text-xs" style={{ color: "var(--color-text)", lineHeight: 1.5 }}>
                  {picked.caption}
                </p>
              </div>

              {loading && (
                <div className="py-8 text-center">
                  <Loader2 className="w-5 h-5 animate-spin inline" style={{ color: "#10B981" }} />
                  <p className="text-xs mt-2" style={{ color: "#78614E" }}>
                    Recycling with 3 angles...
                  </p>
                </div>
              )}

              {error && (
                <p className="text-xs font-semibold" style={{ color: "#B91C1C" }}>
                  {error}
                </p>
              )}

              {variants.map((v, i) => {
                const meta = ANGLE_META[v.angle] ?? { label: v.angle, color: "#78614E", desc: "" };
                return (
                  <div
                    key={i}
                    className="rounded-xl p-4 space-y-2"
                    style={{ backgroundColor: "white", border: `1px solid ${meta.color}33` }}
                  >
                    <div className="flex items-center gap-2">
                      <Sparkles className="w-4 h-4" style={{ color: meta.color }} />
                      <p className="text-sm font-bold" style={{ color: "var(--color-text)" }}>
                        {meta.label}
                      </p>
                      <p className="text-[10px] flex-1" style={{ color: "#A8967E" }}>
                        {meta.desc}
                      </p>
                      <button
                        type="button"
                        onClick={() => copy(i, v.caption)}
                        className="inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-bold"
                        style={{ backgroundColor: copied === i ? "#10B981" : "rgba(0,0,0,0.04)", color: copied === i ? "white" : "#78614E" }}
                      >
                        {copied === i ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                        {copied === i ? "Copied" : "Copy"}
                      </button>
                      <button
                        type="button"
                        onClick={() => scheduleOnCalendar(v.caption)}
                        className="inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-bold"
                        style={{ backgroundColor: meta.color, color: "white" }}
                      >
                        <CalIcon className="w-3 h-3" />
                        Schedule
                      </button>
                    </div>
                    <p className="text-sm whitespace-pre-wrap" style={{ color: "var(--color-text)", lineHeight: 1.5 }}>
                      {v.caption}
                    </p>
                  </div>
                );
              })}
            </>
          )}
        </section>
      </main>
    </div>
  );
}
