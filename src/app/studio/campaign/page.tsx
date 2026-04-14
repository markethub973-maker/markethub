"use client";

/**
 * Campaign Auto-Pilot — one-brief → 5-post content plan.
 *
 * User types a campaign brief, Haiku generates 5 posts with captions +
 * image prompts + suggested times. User clicks per-post:
 *   🎨 Generate image — calls /api/studio/image with the prompt
 *   📅 Add to Calendar — schedules it on the suggested day/time
 *   ✕ Dismiss — drops this post from the plan
 */

import { useState } from "react";
import Header from "@/components/layout/Header";
import {
  Rocket, Loader2, Sparkles, CalendarPlus, X, Image as ImageIcon,
  AlertCircle, Instagram, Linkedin, Facebook, Youtube, Check,
} from "lucide-react";

type Aspect = "1:1" | "4:5" | "9:16" | "16:9";

interface PlannedPost {
  day: number;
  caption: string;
  hook: string;
  platforms: string[];
  suggested_time: string;
  image_prompt: string;
  aspect_ratio: Aspect;
  // Local-only state
  image_url?: string | null;
  image_loading?: boolean;
  scheduled?: boolean;
  scheduling?: boolean;
  dismissed?: boolean;
}

const PLATFORM_ICONS: Record<string, React.ElementType> = {
  instagram: Instagram,
  facebook: Facebook,
  linkedin: Linkedin,
  youtube: Youtube,
  tiktok: Instagram, // using Instagram icon as fallback — TikTok not in lucide
};

export default function CampaignAutoPilotPage() {
  const [brief, setBrief] = useState("");
  const [strategy, setStrategy] = useState("");
  const [posts, setPosts] = useState<PlannedPost[]>([]);
  const [planning, setPlanning] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const plan = async () => {
    if (!brief.trim() || planning) return;
    setPlanning(true);
    setErr(null);
    setPosts([]);
    setStrategy("");
    try {
      const res = await fetch("/api/studio/campaign-plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ brief: brief.trim() }),
      });
      const d = await res.json();
      if (!res.ok || !d.ok) {
        setErr(d.error ?? "Planning failed");
        return;
      }
      setStrategy(d.strategy ?? "");
      setPosts((d.posts ?? []) as PlannedPost[]);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Failed");
    } finally {
      setPlanning(false);
    }
  };

  const generateImage = async (idx: number) => {
    setPosts((p) =>
      p.map((post, i) => (i === idx ? { ...post, image_loading: true } : post)),
    );
    try {
      const post = posts[idx];
      const res = await fetch("/api/studio/image", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: post.image_prompt,
          aspect_ratio: post.aspect_ratio,
        }),
      });
      const d = await res.json();
      setPosts((p) =>
        p.map((post, i) =>
          i === idx
            ? { ...post, image_url: d.image_url ?? null, image_loading: false }
            : post,
        ),
      );
    } catch {
      setPosts((p) =>
        p.map((post, i) => (i === idx ? { ...post, image_loading: false } : post)),
      );
    }
  };

  const addToCalendar = async (idx: number) => {
    const post = posts[idx];
    setPosts((p) =>
      p.map((x, i) => (i === idx ? { ...x, scheduling: true } : x)),
    );
    const today = new Date();
    const targetDate = new Date(today);
    targetDate.setDate(today.getDate() + (post.day - 1));
    const dateStr = targetDate.toISOString().slice(0, 10);
    const payload = {
      title: post.hook.slice(0, 120),
      caption: post.caption,
      platform: post.platforms[0] ?? "instagram",
      status: "scheduled",
      date: dateStr,
      time: post.suggested_time,
      image_url: post.image_url ?? "",
      hashtags: "",
      client: "",
      first_comment: "",
    };
    try {
      const res = await fetch("/api/calendar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const d = await res.json();
      setPosts((p) =>
        p.map((x, i) =>
          i === idx
            ? { ...x, scheduling: false, scheduled: res.ok && (d.ok || d.id) }
            : x,
        ),
      );
    } catch {
      setPosts((p) =>
        p.map((x, i) => (i === idx ? { ...x, scheduling: false } : x)),
      );
    }
  };

  const dismiss = (idx: number) => {
    setPosts((p) => p.map((x, i) => (i === idx ? { ...x, dismissed: true } : x)));
  };

  // Schedule every visible post that isn't already scheduled
  const scheduleAll = async () => {
    const indexes = posts
      .map((p, i) => ({ p, i }))
      .filter(({ p }) => !p.dismissed && !p.scheduled && !p.scheduling)
      .map(({ i }) => i);
    if (indexes.length === 0) return;
    // Sequential to keep DB writes ordered + avoid /api/calendar burst
    for (const i of indexes) {
      // eslint-disable-next-line no-await-in-loop
      await addToCalendar(i);
    }
  };

  // Generate images for every visible post that doesn't have one yet
  const generateAllImages = async () => {
    const indexes = posts
      .map((p, i) => ({ p, i }))
      .filter(({ p }) => !p.dismissed && !p.image_url && !p.image_loading)
      .map(({ i }) => i);
    if (indexes.length === 0) return;
    // Parallel — Fal handles concurrency fine and image gen takes ~3s each
    await Promise.all(indexes.map((i) => generateImage(i)));
  };

  const visible = posts.filter((p) => !p.dismissed);

  return (
    <div className="min-h-screen" style={{ backgroundColor: "var(--color-bg-secondary)" }}>
      <Header title="Campaign Auto-Pilot" subtitle="Describe a goal, get a 5-post plan ready to schedule" />

      <main className="max-w-5xl mx-auto px-6 py-6 space-y-6">
        {/* Brief input */}
        <div
          className="rounded-2xl p-6"
          style={{
            background: "linear-gradient(135deg, rgba(245,158,11,0.06), rgba(139,92,246,0.06))",
            border: "1px solid rgba(245,158,11,0.2)",
          }}
        >
          <div className="flex items-center gap-2 mb-4">
            <Rocket className="w-5 h-5" style={{ color: "var(--color-primary)" }} />
            <h2 className="text-lg font-bold" style={{ color: "var(--color-text)" }}>
              What&apos;s the campaign?
            </h2>
          </div>
          <textarea
            value={brief}
            onChange={(e) => setBrief(e.target.value)}
            placeholder={`Example:
"Launch our new weekly yoga class for beginners. Tuesday evenings 7 PM. Studio in downtown Bucharest. First 20 signups get 30% off the month pass. Target: women 28-45 who want stress relief after work."`}
            rows={6}
            className="w-full rounded-lg px-3 py-2 text-sm resize-none mb-4"
            style={{
              backgroundColor: "white",
              border: "1px solid rgba(245,215,160,0.4)",
              color: "var(--color-text)",
              outline: "none",
            }}
          />
          <div className="flex items-center justify-between gap-3">
            <p className="text-[10px]" style={{ color: "#A8967E" }}>
              Brief longer = better plan. Include goal, audience, offer, dates.
            </p>
            <button
              type="button"
              onClick={plan}
              disabled={planning || brief.trim().length < 10}
              className="px-5 py-2.5 rounded-xl text-sm font-bold flex items-center gap-2 disabled:opacity-40"
              style={{
                background: "linear-gradient(135deg, var(--color-primary), var(--color-primary-hover))",
                color: "#1C1814",
              }}
            >
              {planning ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Sparkles className="w-4 h-4" />
              )}
              {planning ? "Planning..." : "Build my plan"}
            </button>
          </div>

          {err && (
            <div
              className="mt-4 rounded-lg p-3 flex items-center gap-2 text-xs"
              style={{
                backgroundColor: "rgba(239,68,68,0.08)",
                border: "1px solid rgba(239,68,68,0.3)",
                color: "#B91C1C",
              }}
            >
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              {err}
            </div>
          )}
        </div>

        {/* Strategy banner */}
        {strategy && (
          <div
            className="rounded-xl p-4"
            style={{
              backgroundColor: "rgba(139,92,246,0.06)",
              border: "1px solid rgba(139,92,246,0.25)",
            }}
          >
            <p
              className="text-[10px] font-bold uppercase tracking-wider mb-1"
              style={{ color: "#8B5CF6" }}
            >
              Strategy
            </p>
            <p className="text-sm" style={{ color: "var(--color-text)" }}>
              {strategy}
            </p>
          </div>
        )}

        {/* Bulk action bar — shows when there are visible posts */}
        {visible.length > 0 && (() => {
          const needImage = visible.filter((p) => !p.image_url).length;
          const needSchedule = visible.filter((p) => !p.scheduled).length;
          const totalCost = needImage * 0.003;
          if (needImage === 0 && needSchedule === 0) return null;
          return (
            <div
              className="rounded-xl p-4 flex items-center gap-3 flex-wrap"
              style={{
                background: "linear-gradient(135deg, rgba(245,158,11,0.06), rgba(16,185,129,0.06))",
                border: "1px solid rgba(245,158,11,0.25)",
              }}
            >
              <p className="text-xs font-bold flex-1" style={{ color: "var(--color-text)" }}>
                Bulk actions
              </p>
              {needImage > 0 && (
                <button
                  type="button"
                  onClick={generateAllImages}
                  className="px-3 py-2 rounded-lg text-xs font-bold flex items-center gap-1.5"
                  style={{
                    backgroundColor: "rgba(139,92,246,0.12)",
                    color: "#8B5CF6",
                  }}
                >
                  <ImageIcon className="w-3 h-3" />
                  Generate all {needImage} images
                  <span className="text-[10px] opacity-70">${totalCost.toFixed(3)}</span>
                </button>
              )}
              {needSchedule > 0 && (
                <button
                  type="button"
                  onClick={scheduleAll}
                  className="px-3 py-2 rounded-lg text-xs font-bold flex items-center gap-1.5"
                  style={{
                    backgroundColor: "var(--color-text)",
                    color: "white",
                  }}
                >
                  <CalendarPlus className="w-3 h-3" />
                  Schedule all {needSchedule} posts
                </button>
              )}
            </div>
          );
        })()}

        {/* 5 post cards */}
        {visible.length > 0 && (
          <div className="space-y-3">
            {visible.map((post, origIdx) => {
              // Map visible index back to original index for action handlers
              const idx = posts.findIndex((p) => p.day === post.day && p.caption === post.caption);
              return (
                <div
                  key={`${post.day}-${post.hook}`}
                  className="rounded-xl p-4 flex flex-col sm:flex-row gap-4"
                  style={{
                    backgroundColor: "white",
                    border: `1px solid ${post.scheduled ? "rgba(16,185,129,0.4)" : "rgba(0,0,0,0.06)"}`,
                  }}
                >
                  {/* Image column */}
                  <div className="flex-shrink-0 sm:w-40">
                    {post.image_url ? (
                      <img
                        src={post.image_url}
                        alt=""
                        className="w-full aspect-square object-cover rounded-lg"
                      />
                    ) : (
                      <button
                        type="button"
                        onClick={() => generateImage(idx)}
                        disabled={post.image_loading}
                        className="w-full aspect-square rounded-lg flex flex-col items-center justify-center gap-1 transition-all hover:bg-black/5 disabled:opacity-40"
                        style={{
                          backgroundColor: "rgba(0,0,0,0.03)",
                          border: "1px dashed rgba(0,0,0,0.2)",
                          color: "#78614E",
                        }}
                      >
                        {post.image_loading ? (
                          <Loader2 className="w-5 h-5 animate-spin" style={{ color: "#8B5CF6" }} />
                        ) : (
                          <>
                            <ImageIcon className="w-5 h-5" style={{ color: "#8B5CF6" }} />
                            <span className="text-[11px] font-bold" style={{ color: "#8B5CF6" }}>
                              Generate image
                            </span>
                            <span className="text-[9px]" style={{ color: "#A8967E" }}>
                              ~$0.003
                            </span>
                          </>
                        )}
                      </button>
                    )}
                  </div>

                  {/* Content column */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start gap-2 mb-2">
                      <span
                        className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-full"
                        style={{
                          backgroundColor: "rgba(245,158,11,0.15)",
                          color: "var(--color-primary-hover)",
                        }}
                      >
                        Day {post.day} · {post.suggested_time}
                      </span>
                      <div className="flex gap-1 flex-wrap">
                        {post.platforms.map((pl) => {
                          const Icon = PLATFORM_ICONS[pl] ?? Instagram;
                          return (
                            <div
                              key={pl}
                              className="w-5 h-5 rounded flex items-center justify-center"
                              style={{ backgroundColor: "rgba(0,0,0,0.06)" }}
                              title={pl}
                            >
                              <Icon className="w-3 h-3" style={{ color: "var(--color-text)" }} />
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    <p
                      className="text-sm font-bold mb-1"
                      style={{ color: "var(--color-text)" }}
                    >
                      {post.hook}
                    </p>
                    <p
                      className="text-xs whitespace-pre-wrap mb-3"
                      style={{ color: "var(--color-text)", lineHeight: 1.5 }}
                    >
                      {post.caption}
                    </p>

                    <div className="flex items-center gap-2 flex-wrap">
                      <button
                        type="button"
                        onClick={() => addToCalendar(idx)}
                        disabled={post.scheduling || post.scheduled}
                        className="inline-flex items-center gap-1 px-3 py-1.5 rounded-md text-xs font-bold disabled:opacity-70"
                        style={{
                          backgroundColor: post.scheduled
                            ? "rgba(16,185,129,0.1)"
                            : "var(--color-text)",
                          color: post.scheduled ? "#10B981" : "white",
                        }}
                      >
                        {post.scheduling ? (
                          <Loader2 className="w-3 h-3 animate-spin" />
                        ) : post.scheduled ? (
                          <Check className="w-3 h-3" />
                        ) : (
                          <CalendarPlus className="w-3 h-3" />
                        )}
                        {post.scheduled ? "Scheduled" : "Add to Calendar"}
                      </button>
                      <button
                        type="button"
                        onClick={() => dismiss(idx)}
                        className="inline-flex items-center gap-1 px-3 py-1.5 rounded-md text-xs font-bold"
                        style={{
                          backgroundColor: "rgba(0,0,0,0.04)",
                          color: "#78614E",
                        }}
                      >
                        <X className="w-3 h-3" />
                        Dismiss
                      </button>
                      <p
                        className="text-[10px] ml-2 line-clamp-1 flex-1"
                        style={{ color: "#A8967E" }}
                        title={post.image_prompt}
                      >
                        Image: {post.image_prompt.slice(0, 80)}...
                      </p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
