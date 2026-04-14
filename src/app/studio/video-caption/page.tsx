"use client";

/**
 * Video → Caption — paste a video URL, get a transcript + platform-ready
 * captions + hashtags in one shot.
 */

import { useState } from "react";
import Header from "@/components/layout/Header";
import {
  Mic2, Loader2, Sparkles, Copy, Check, Instagram, Linkedin, Twitter,
  Music2, Youtube, FileText,
} from "lucide-react";

type Target = "instagram" | "linkedin" | "twitter" | "tiktok" | "youtube";

const TARGETS: { id: Target; label: string; icon: React.ElementType; color: string }[] = [
  { id: "instagram", label: "Instagram", icon: Instagram, color: "#E1306C" },
  { id: "linkedin",  label: "LinkedIn",  icon: Linkedin,  color: "#0A66C2" },
  { id: "twitter",   label: "Twitter/X", icon: Twitter,   color: "#1DA1F2" },
  { id: "tiktok",    label: "TikTok",    icon: Music2,    color: "#000000" },
  { id: "youtube",   label: "YT Shorts", icon: Youtube,   color: "#FF0000" },
];

interface Result {
  transcript: string;
  captions: Partial<Record<Target, string>>;
  hashtags: string[];
}

export default function VideoCaptionPage() {
  const [videoUrl, setVideoUrl] = useState("");
  const [enabled, setEnabled] = useState<Set<Target>>(new Set(["instagram", "linkedin", "tiktok"]));
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<Result | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);

  const toggle = (id: Target) => {
    setEnabled((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const canSubmit = videoUrl.trim().length > 10 && enabled.size > 0 && !loading;

  const run = async () => {
    if (!canSubmit) return;
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const res = await fetch("/api/ai/video-caption", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          video_url: videoUrl.trim(),
          targets: Array.from(enabled),
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

  const copy = async (key: string, text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(key);
      setTimeout(() => setCopied(null), 1500);
    } catch { /* no-op */ }
  };

  return (
    <div className="min-h-screen" style={{ backgroundColor: "#FFFCF7" }}>
      <Header title="Video → Caption" subtitle="Upload audio URL, get transcript + platform-ready captions" />

      <main className="max-w-5xl mx-auto px-6 py-6 space-y-5">
        <section
          className="rounded-xl p-5 space-y-4"
          style={{ backgroundColor: "white", border: "1px solid rgba(0,0,0,0.06)" }}
        >
          <div className="flex items-center gap-2">
            <Mic2 className="w-5 h-5" style={{ color: "#F59E0B" }} />
            <h2 className="text-sm font-bold" style={{ color: "#292524" }}>
              Paste a public video or audio URL
            </h2>
          </div>

          <input
            type="url"
            value={videoUrl}
            onChange={(e) => setVideoUrl(e.target.value)}
            placeholder="https://cdn.example.com/my-reel.mp4"
            className="w-full rounded-lg px-3 py-2 text-sm"
            style={{ backgroundColor: "#FFF8F0", border: "1px solid rgba(245,215,160,0.4)", color: "#292524", outline: "none" }}
          />
          <p className="text-[11px]" style={{ color: "#A8967E" }}>
            Tip: drop it in Asset Library or Dropbox / Drive first, then paste the public URL here.
            Supports mp4, mov, webm, mp3, m4a, wav.
          </p>

          <div>
            <p className="text-xs font-semibold mb-2" style={{ color: "#78614E" }}>
              Captions for:
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
            {loading ? (<><Loader2 className="w-4 h-4 animate-spin" /> Transcribing + writing captions...</>) : (<><Sparkles className="w-4 h-4" /> Transcribe & caption</>)}
          </button>

          {error && <p className="text-xs font-semibold" style={{ color: "#B91C1C" }}>{error}</p>}
        </section>

        {result && (
          <>
            {/* Transcript */}
            <section
              className="rounded-xl p-4"
              style={{ backgroundColor: "white", border: "1px solid rgba(0,0,0,0.06)" }}
            >
              <div className="flex items-center gap-2 mb-2">
                <FileText className="w-4 h-4" style={{ color: "#78614E" }} />
                <p className="text-sm font-bold flex-1" style={{ color: "#292524" }}>
                  Transcript
                </p>
                <span className="text-[10px]" style={{ color: "#A8967E" }}>
                  {result.transcript.length} chars
                </span>
                <button
                  type="button"
                  onClick={() => copy("transcript", result.transcript)}
                  className="inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-bold"
                  style={{ backgroundColor: copied === "transcript" ? "#10B981" : "rgba(0,0,0,0.04)", color: copied === "transcript" ? "white" : "#78614E" }}
                >
                  {copied === "transcript" ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                  {copied === "transcript" ? "Copied" : "Copy"}
                </button>
              </div>
              <p className="text-xs whitespace-pre-wrap max-h-40 overflow-y-auto" style={{ color: "#292524", lineHeight: 1.5 }}>
                {result.transcript}
              </p>
            </section>

            {/* Hashtags */}
            {result.hashtags.length > 0 && (
              <section
                className="rounded-xl p-4"
                style={{ backgroundColor: "rgba(245,158,11,0.06)", border: "1px solid rgba(245,158,11,0.25)" }}
              >
                <div className="flex items-center gap-2 mb-2">
                  <Sparkles className="w-4 h-4" style={{ color: "#D97706" }} />
                  <p className="text-sm font-bold flex-1" style={{ color: "#292524" }}>
                    Suggested hashtags
                  </p>
                  <button
                    type="button"
                    onClick={() => copy("hashtags", result.hashtags.join(" "))}
                    className="inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-bold"
                    style={{ backgroundColor: copied === "hashtags" ? "#10B981" : "#D97706", color: "white" }}
                  >
                    {copied === "hashtags" ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                    {copied === "hashtags" ? "Copied" : "Copy all"}
                  </button>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {result.hashtags.map((h) => (
                    <span
                      key={h}
                      className="text-xs px-2 py-1 rounded-md"
                      style={{ backgroundColor: "white", color: "#292524", border: "1px solid rgba(245,158,11,0.3)" }}
                    >
                      {h.startsWith("#") ? h : `#${h}`}
                    </span>
                  ))}
                </div>
              </section>
            )}

            {/* Captions per platform */}
            <section className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {TARGETS.filter((t) => result.captions[t.id]).map((t) => {
                const Icon = t.icon;
                const c = result.captions[t.id]!;
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
                        {c.length} chars
                      </span>
                      <button
                        type="button"
                        onClick={() => copy(t.id, c)}
                        className="inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-bold"
                        style={{ backgroundColor: copied === t.id ? "#10B981" : "rgba(0,0,0,0.04)", color: copied === t.id ? "white" : "#78614E" }}
                      >
                        {copied === t.id ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                        {copied === t.id ? "Copied" : "Copy"}
                      </button>
                    </div>
                    <p className="text-sm whitespace-pre-wrap" style={{ color: "#292524", lineHeight: 1.5 }}>
                      {c}
                    </p>
                  </div>
                );
              })}
            </section>
          </>
        )}
      </main>
    </div>
  );
}
