"use client";

/**
 * Reels / TikTok Script Studio.
 * Topic + duration → hook + scenes + caption + music style →
 * each scene has Generate-image button (Fal) and Generate-voiceover (TTS).
 */

import { useState } from "react";
import Header from "@/components/layout/Header";
import {
  Film, Loader2, Sparkles, Mic, Image as ImageIcon, AlertCircle,
  Music, Copy, Check, Wand2,
} from "lucide-react";

interface Scene {
  time_sec: string;
  voiceover: string;
  on_screen_text: string;
  image_prompt: string;
  b_roll_idea: string;
  // Local
  image_url?: string | null;
  image_loading?: boolean;
  voiceover_url?: string | null;
  voiceover_loading?: boolean;
}

interface ReelPlan {
  hook: string;
  scenes: Scene[];
  caption: string;
  hashtags: string[];
  music_style: string;
}

export default function ReelsStudioPage() {
  const [topic, setTopic] = useState("");
  const [duration, setDuration] = useState(30);
  const [hookStyle, setHookStyle] = useState("");
  const [planning, setPlanning] = useState(false);
  const [plan, setPlan] = useState<ReelPlan | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);

  const generate = async () => {
    if (!topic.trim() || planning) return;
    setPlanning(true);
    setErr(null);
    setPlan(null);
    try {
      const res = await fetch("/api/studio/reels-script", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ topic: topic.trim(), duration_sec: duration, hook_style: hookStyle.trim() || undefined }),
      });
      const d = await res.json();
      if (!res.ok || !d.ok) {
        setErr(d.error ?? "Failed");
        return;
      }
      setPlan({ hook: d.hook, scenes: d.scenes, caption: d.caption, hashtags: d.hashtags, music_style: d.music_style });
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Failed");
    } finally {
      setPlanning(false);
    }
  };

  const generateImage = async (idx: number) => {
    if (!plan) return;
    setPlan((p) => p && {
      ...p,
      scenes: p.scenes.map((s, i) => i === idx ? { ...s, image_loading: true } : s),
    });
    try {
      const scene = plan.scenes[idx];
      const res = await fetch("/api/studio/image", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: scene.image_prompt, aspect_ratio: "9:16" }),
      });
      const d = await res.json();
      setPlan((p) => p && {
        ...p,
        scenes: p.scenes.map((s, i) => i === idx ? { ...s, image_url: d.image_url ?? null, image_loading: false } : s),
      });
    } catch {
      setPlan((p) => p && {
        ...p,
        scenes: p.scenes.map((s, i) => i === idx ? { ...s, image_loading: false } : s),
      });
    }
  };

  const generateVoiceover = async (idx: number) => {
    if (!plan) return;
    setPlan((p) => p && {
      ...p,
      scenes: p.scenes.map((s, i) => i === idx ? { ...s, voiceover_loading: true } : s),
    });
    try {
      const scene = plan.scenes[idx];
      const res = await fetch("/api/studio/audio", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode: "tts", prompt: scene.voiceover, voice: "af_heart" }),
      });
      const d = await res.json();
      setPlan((p) => p && {
        ...p,
        scenes: p.scenes.map((s, i) => i === idx ? { ...s, voiceover_url: d.audio_url ?? null, voiceover_loading: false } : s),
      });
    } catch {
      setPlan((p) => p && {
        ...p,
        scenes: p.scenes.map((s, i) => i === idx ? { ...s, voiceover_loading: false } : s),
      });
    }
  };

  const generateMusic = async () => {
    if (!plan?.music_style) return;
    try {
      await fetch("/api/studio/audio", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode: "music", prompt: plan.music_style, duration_sec: duration }),
      });
      // Music will appear in /studio/audio gallery + /studio/assets
      alert("Music generation started. Check /studio/audio in 30s.");
    } catch {
      /* no-op */
    }
  };

  const copy = async (text: string, key: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(key);
      setTimeout(() => setCopied(null), 1500);
    } catch { /* no-op */ }
  };

  return (
    <div className="min-h-screen" style={{ backgroundColor: "#FFFCF7" }}>
      <Header title="Reels / TikTok Studio" subtitle="From topic to shoot-ready package in one click" />

      <main className="max-w-5xl mx-auto px-6 py-6 space-y-6">
        {/* Brief input */}
        <div
          className="rounded-2xl p-6"
          style={{
            background: "linear-gradient(135deg, rgba(245,158,11,0.06), rgba(236,72,153,0.06))",
            border: "1px solid rgba(245,158,11,0.2)",
          }}
        >
          <div className="flex items-center gap-2 mb-4">
            <Film className="w-5 h-5" style={{ color: "#F59E0B" }} />
            <h2 className="text-lg font-bold" style={{ color: "#292524" }}>
              What's the Reel about?
            </h2>
          </div>
          <textarea
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            placeholder='e.g. "Why most coffee shops fail in their first 2 years (and what I did differently)"'
            rows={3}
            className="w-full rounded-lg px-3 py-2 text-sm resize-none mb-4"
            style={{
              backgroundColor: "white",
              border: "1px solid rgba(245,215,160,0.4)",
              color: "#292524",
              outline: "none",
            }}
          />
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider mb-1" style={{ color: "#78614E" }}>
                Duration: {duration}s
              </label>
              <input
                type="range" min={10} max={90} step={5}
                value={duration}
                onChange={(e) => setDuration(parseInt(e.target.value))}
                className="w-full"
              />
            </div>
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider mb-1" style={{ color: "#78614E" }}>
                Hook style (optional)
              </label>
              <input
                type="text"
                value={hookStyle}
                onChange={(e) => setHookStyle(e.target.value)}
                placeholder="e.g. controversial / data-driven / funny"
                className="w-full rounded-lg px-3 py-2 text-sm"
                style={{
                  backgroundColor: "white",
                  border: "1px solid rgba(245,215,160,0.4)",
                  color: "#292524",
                  outline: "none",
                }}
              />
            </div>
          </div>
          <button
            type="button"
            onClick={generate}
            disabled={planning || topic.trim().length < 5}
            className="px-5 py-2.5 rounded-xl text-sm font-bold flex items-center gap-2 disabled:opacity-40"
            style={{
              background: "linear-gradient(135deg, #F59E0B, #D97706)",
              color: "#1C1814",
            }}
          >
            {planning ? <Loader2 className="w-4 h-4 animate-spin" /> : <Wand2 className="w-4 h-4" />}
            {planning ? "Building..." : "Build Reel script"}
          </button>
          {err && (
            <div className="mt-4 rounded-lg p-3 flex items-center gap-2 text-xs" style={{ backgroundColor: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.3)", color: "#B91C1C" }}>
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              {err}
            </div>
          )}
        </div>

        {/* Plan */}
        {plan && (
          <>
            {/* Hook banner */}
            <div
              className="rounded-xl p-5"
              style={{ backgroundColor: "white", border: "2px solid #F59E0B" }}
            >
              <div className="flex items-center gap-2 mb-2">
                <Sparkles className="w-4 h-4" style={{ color: "#F59E0B" }} />
                <p className="text-[10px] font-bold uppercase tracking-wider" style={{ color: "#D97706" }}>
                  Hook (first 2 seconds)
                </p>
              </div>
              <p className="text-xl font-bold" style={{ color: "#292524", lineHeight: 1.3 }}>
                {plan.hook}
              </p>
            </div>

            {/* Scenes */}
            <div className="space-y-3">
              {plan.scenes.map((scene, idx) => (
                <div
                  key={idx}
                  className="rounded-xl p-4 flex flex-col sm:flex-row gap-4"
                  style={{ backgroundColor: "white", border: "1px solid rgba(0,0,0,0.06)" }}
                >
                  {/* Image column */}
                  <div className="flex-shrink-0 sm:w-32">
                    {scene.image_url ? (
                      <img src={scene.image_url} alt="" className="w-full aspect-[9/16] object-cover rounded-lg" />
                    ) : (
                      <button
                        type="button"
                        onClick={() => generateImage(idx)}
                        disabled={scene.image_loading}
                        className="w-full aspect-[9/16] rounded-lg flex flex-col items-center justify-center gap-1 disabled:opacity-40"
                        style={{ backgroundColor: "rgba(0,0,0,0.03)", border: "1px dashed rgba(0,0,0,0.2)", color: "#8B5CF6" }}
                      >
                        {scene.image_loading ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <>
                            <ImageIcon className="w-4 h-4" />
                            <span className="text-[10px] font-bold">Image</span>
                          </>
                        )}
                      </button>
                    )}
                  </div>

                  {/* Content column */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-full"
                        style={{ backgroundColor: "rgba(245,158,11,0.15)", color: "#D97706" }}>
                        {scene.time_sec}s
                      </span>
                      <span className="text-[10px] font-bold uppercase" style={{ color: "#A8967E" }}>
                        Scene {idx + 1}
                      </span>
                    </div>

                    <p className="text-[10px] font-bold uppercase tracking-wider mt-2" style={{ color: "#78614E" }}>
                      Voiceover
                    </p>
                    <div className="flex items-start gap-2">
                      <p className="text-sm flex-1" style={{ color: "#292524" }}>
                        {scene.voiceover}
                      </p>
                      <button
                        type="button"
                        onClick={() => generateVoiceover(idx)}
                        disabled={scene.voiceover_loading}
                        className="p-1.5 rounded-md flex-shrink-0"
                        style={{ backgroundColor: "rgba(16,185,129,0.1)", color: "#10B981" }}
                        title="Generate TTS"
                      >
                        {scene.voiceover_loading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Mic className="w-3 h-3" />}
                      </button>
                    </div>
                    {scene.voiceover_url && (
                      <audio src={scene.voiceover_url} controls className="w-full mt-1" style={{ height: 28 }} />
                    )}

                    <p className="text-[10px] font-bold uppercase tracking-wider mt-2" style={{ color: "#78614E" }}>
                      On-screen text
                    </p>
                    <p className="text-sm font-bold" style={{ color: "#292524" }}>
                      {scene.on_screen_text}
                    </p>

                    <details className="mt-2">
                      <summary className="text-[10px] font-bold uppercase tracking-wider cursor-pointer" style={{ color: "#A8967E" }}>
                        Image prompt + b-roll idea
                      </summary>
                      <div className="mt-1.5 space-y-1.5">
                        <p className="text-[11px] italic" style={{ color: "#78614E" }}>
                          🎨 {scene.image_prompt}
                        </p>
                        <p className="text-[11px]" style={{ color: "#78614E" }}>
                          📹 {scene.b_roll_idea}
                        </p>
                      </div>
                    </details>
                  </div>
                </div>
              ))}
            </div>

            {/* Caption + hashtags + music */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="rounded-xl p-4" style={{ backgroundColor: "white", border: "1px solid rgba(0,0,0,0.06)" }}>
                <div className="flex items-center justify-between mb-2">
                  <p className="text-[10px] font-bold uppercase tracking-wider" style={{ color: "#78614E" }}>
                    Caption
                  </p>
                  <button type="button" onClick={() => copy(plan.caption, "caption")}
                    className="text-[10px] font-bold flex items-center gap-1"
                    style={{ color: copied === "caption" ? "#10B981" : "#8B5CF6" }}>
                    {copied === "caption" ? <Check className="w-2.5 h-2.5" /> : <Copy className="w-2.5 h-2.5" />}
                    {copied === "caption" ? "Copied" : "Copy"}
                  </button>
                </div>
                <p className="text-xs whitespace-pre-wrap" style={{ color: "#292524" }}>
                  {plan.caption}
                </p>
              </div>

              <div className="rounded-xl p-4" style={{ backgroundColor: "white", border: "1px solid rgba(0,0,0,0.06)" }}>
                <div className="flex items-center justify-between mb-2">
                  <p className="text-[10px] font-bold uppercase tracking-wider" style={{ color: "#78614E" }}>
                    Hashtags
                  </p>
                  <button type="button" onClick={() => copy(plan.hashtags.join(" "), "tags")}
                    className="text-[10px] font-bold flex items-center gap-1"
                    style={{ color: copied === "tags" ? "#10B981" : "#8B5CF6" }}>
                    {copied === "tags" ? <Check className="w-2.5 h-2.5" /> : <Copy className="w-2.5 h-2.5" />}
                    {copied === "tags" ? "Copied" : "Copy"}
                  </button>
                </div>
                <div className="flex flex-wrap gap-1">
                  {plan.hashtags.map((tag) => (
                    <code key={tag} className="text-[11px] font-mono px-1.5 py-0.5 rounded"
                      style={{ backgroundColor: "rgba(139,92,246,0.1)", color: "#8B5CF6" }}>
                      {tag}
                    </code>
                  ))}
                </div>
              </div>
            </div>

            {/* Music CTA */}
            <div className="rounded-xl p-4 flex items-center gap-3"
              style={{
                background: "linear-gradient(135deg, rgba(16,185,129,0.06), rgba(245,158,11,0.04))",
                border: "1px solid rgba(16,185,129,0.25)",
              }}>
              <Music className="w-5 h-5 flex-shrink-0" style={{ color: "#10B981" }} />
              <div className="flex-1 min-w-0">
                <p className="text-[10px] font-bold uppercase tracking-wider" style={{ color: "#10B981" }}>
                  Suggested music
                </p>
                <p className="text-xs italic" style={{ color: "#292524" }}>
                  {plan.music_style}
                </p>
              </div>
              <button type="button" onClick={generateMusic}
                className="px-3 py-2 rounded-md text-xs font-bold flex items-center gap-1"
                style={{ backgroundColor: "#10B981", color: "white" }}>
                <Sparkles className="w-3 h-3" />
                Generate music
              </button>
            </div>
          </>
        )}
      </main>
    </div>
  );
}
