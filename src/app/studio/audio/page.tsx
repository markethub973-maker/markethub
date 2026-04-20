"use client";

/**
 * AI Audio Studio — TTS / music / SFX. All via Fal.ai (same FAL_API_KEY).
 */

import { useCallback, useEffect, useState } from "react";
import Header from "@/components/layout/Header";
import { Music, Mic, Volume2, Loader2, Download, Play, Pause, Sparkles, AlertCircle, Wand2, UserCheck } from "lucide-react";

type Mode = "tts" | "music" | "sfx" | "clone";

interface Gen {
  id: string;
  mode: string;
  prompt: string;
  voice: string | null;
  duration_sec: number | null;
  audio_url: string | null;
  status: string;
  cost_usd: number | null;
  duration_ms: number | null;
  created_at: string;
}

const MODES: { value: Mode; label: string; icon: React.ElementType; desc: string; placeholder: string }[] = [
  { value: "tts",   label: "Text → Speech", icon: Mic,       desc: "Natural voiceover from text",       placeholder: "Welcome to MarketHub Pro. The all-in-one social media platform for agencies." },
  { value: "music", label: "Music",         icon: Music,     desc: "Background track for video",        placeholder: "Upbeat tropical house, summer vibes, no vocals" },
  { value: "sfx",   label: "Sound Effects", icon: Volume2,   desc: "One-shot sounds (whoosh, etc.)",    placeholder: "Camera shutter click followed by short whoosh" },
  { value: "clone", label: "Your Voice",    icon: UserCheck, desc: "Clone your own voice (zero-shot)",  placeholder: "Hey everyone, welcome back to the channel — today we're diving into..." },
];

const TTS_VOICES = [
  { value: "af_heart", label: "Heart (warm female)" },
  { value: "af_bella", label: "Bella (clear female)" },
  { value: "am_adam",  label: "Adam (deep male)" },
  { value: "am_michael", label: "Michael (mid male)" },
];

export default function AiAudioStudioPage() {
  const [mode, setMode] = useState<Mode>("tts");
  const [prompt, setPrompt] = useState("");
  const [voice, setVoice] = useState(TTS_VOICES[0].value);
  const [duration, setDuration] = useState(10);
  // Voice cloning (mode = "clone")
  const [refAudioUrl, setRefAudioUrl] = useState(() =>
    typeof window === "undefined" ? "" : localStorage.getItem("mh_ref_audio_url") ?? ""
  );
  const [refText, setRefText] = useState(() =>
    typeof window === "undefined" ? "" : localStorage.getItem("mh_ref_text") ?? ""
  );
  const [busy, setBusy] = useState(false);
  const [latest, setLatest] = useState<Gen | null>(null);
  const [gallery, setGallery] = useState<Gen[]>([]);
  const [err, setErr] = useState<string | null>(null);
  const [playing, setPlaying] = useState<string | null>(null);

  const loadGallery = useCallback(async () => {
    try {
      const res = await fetch("/api/studio/audio", { cache: "no-store" });
      if (res.ok) {
        const d = await res.json();
        setGallery(d.generations ?? []);
      }
    } catch { /* ignore */ }
  }, []);

  useEffect(() => { loadGallery(); }, [loadGallery]);

  const generate = async () => {
    if (!prompt.trim() || busy) return;
    setBusy(true);
    setErr(null);
    setLatest(null);
    try {
      const body: Record<string, unknown> = { mode, prompt: prompt.trim() };
      if (mode === "tts") body.voice = voice;
      if (mode === "music" || mode === "sfx") body.duration_sec = duration;
      if (mode === "clone") {
        if (!refAudioUrl.trim() || !refText.trim()) {
          setErr("For voice cloning, paste a sample URL and the exact transcript first.");
          setBusy(false);
          return;
        }
        body.ref_audio_url = refAudioUrl.trim();
        body.ref_text = refText.trim();
        // Persist for next session — user's reference clip rarely changes
        try {
          localStorage.setItem("mh_ref_audio_url", refAudioUrl.trim());
          localStorage.setItem("mh_ref_text", refText.trim());
        } catch { /* no-op */ }
      }
      const res = await fetch("/api/studio/audio", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const d = await res.json();
      if (!res.ok || !d.ok) {
        setErr(d.error ?? "Generation failed");
      } else {
        setLatest({
          id: d.id,
          mode,
          prompt: prompt.trim(),
          voice: mode === "tts" ? voice : null,
          duration_sec: d.duration_sec ?? null,
          audio_url: d.audio_url ?? null,
          status: "succeeded",
          cost_usd: d.cost_usd ?? null,
          duration_ms: d.duration_ms ?? null,
          created_at: new Date().toISOString(),
        });
        await loadGallery();
      }
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Failed");
    } finally {
      setBusy(false);
    }
  };

  const togglePlay = (id: string, audioEl: HTMLAudioElement | null) => {
    if (!audioEl) return;
    if (playing === id) {
      audioEl.pause();
      setPlaying(null);
    } else {
      // Pause any other playing
      document.querySelectorAll("audio").forEach((a) => a.pause());
      audioEl.play().catch(() => {});
      setPlaying(id);
    }
  };

  const currentMode = MODES.find((m) => m.value === mode)!;

  return (
    <div className="min-h-screen" style={{ backgroundColor: "var(--color-bg-secondary)" }}>
      <Header title="AI Audio Studio" subtitle="Voiceovers, music tracks, and sound effects" />

      <main className="max-w-4xl mx-auto px-6 py-6 space-y-6">
        {/* Mode picker */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
          {MODES.map((m) => (
            <button
              key={m.value}
              type="button"
              onClick={() => setMode(m.value)}
              className="rounded-xl p-3 text-left transition-all"
              style={{
                backgroundColor: mode === m.value ? "var(--color-text)" : "white",
                color: mode === m.value ? "white" : "var(--color-text)",
                border: `1px solid ${mode === m.value ? "var(--color-text)" : "rgba(0,0,0,0.06)"}`,
              }}
            >
              <m.icon className="w-5 h-5 mb-2" style={{ color: mode === m.value ? "var(--color-primary)" : "#78614E" }} />
              <p className="text-sm font-bold">{m.label}</p>
              <p className="text-[10px]" style={{ color: mode === m.value ? "#A8967E" : "#78614E" }}>
                {m.desc}
              </p>
            </button>
          ))}
        </div>

        {/* Generate card */}
        <div
          className="rounded-2xl p-6"
          style={{ backgroundColor: "white", border: "1px solid rgba(245,158,11,0.2)" }}
        >
          <div className="flex items-center gap-2 mb-4">
            <Wand2 className="w-5 h-5" style={{ color: "var(--color-primary)" }} />
            <h2 className="text-lg font-bold" style={{ color: "var(--color-text)" }}>
              {currentMode.label}
            </h2>
          </div>

          <label className="block text-[10px] font-bold uppercase tracking-wider mb-1" style={{ color: "#78614E" }}>
            {mode === "tts" || mode === "clone" ? "Script (max 2000 chars)" : "Prompt"}
          </label>
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder={currentMode.placeholder}
            rows={mode === "tts" ? 5 : 3}
            maxLength={2000}
            className="w-full rounded-lg px-3 py-2 text-sm resize-none mb-4"
            style={{
              backgroundColor: "var(--color-bg)",
              border: "1px solid rgba(245,215,160,0.4)",
              color: "var(--color-text)",
              outline: "none",
            }}
          />

          {mode === "tts" && (
            <div className="mb-4">
              <label className="block text-[10px] font-bold uppercase tracking-wider mb-1" style={{ color: "#78614E" }}>
                Voice
              </label>
              <div className="flex gap-2 flex-wrap">
                {TTS_VOICES.map((v) => (
                  <button
                    key={v.value}
                    type="button"
                    onClick={() => setVoice(v.value)}
                    className="px-3 py-1.5 rounded-md text-xs font-bold"
                    style={{
                      backgroundColor: voice === v.value ? "var(--color-text)" : "rgba(0,0,0,0.04)",
                      color: voice === v.value ? "white" : "var(--color-text)",
                    }}
                  >
                    {v.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {(mode === "music" || mode === "sfx") && (
            <div className="mb-4">
              <label className="block text-[10px] font-bold uppercase tracking-wider mb-1" style={{ color: "#78614E" }}>
                Duration: {duration}s
              </label>
              <input
                type="range"
                min={mode === "sfx" ? 1 : 5}
                max={mode === "sfx" ? 22 : 30}
                value={duration}
                onChange={(e) => setDuration(parseInt(e.target.value))}
                className="w-full"
              />
            </div>
          )}

          {mode === "clone" && (
            <div className="mb-4 space-y-3 rounded-lg p-3" style={{ backgroundColor: "rgba(139,92,246,0.06)", border: "1px solid rgba(139,92,246,0.2)" }}>
              <div className="flex items-center gap-2">
                <UserCheck className="w-4 h-4" style={{ color: "#8B5CF6" }} />
                <p className="text-xs font-bold" style={{ color: "#5B21B6" }}>Your reference voice</p>
                <span className="ml-auto text-[10px]" style={{ color: "#A8967E" }}>saved locally</span>
              </div>
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider mb-1" style={{ color: "#78614E" }}>
                  Reference audio URL (5-15s of you talking, any public https)
                </label>
                <input
                  type="url"
                  value={refAudioUrl}
                  onChange={(e) => setRefAudioUrl(e.target.value)}
                  placeholder="https://.../my-voice-sample.mp3"
                  className="w-full rounded-md px-3 py-2 text-sm"
                  style={{ backgroundColor: "white", border: "1px solid rgba(139,92,246,0.25)", color: "var(--color-text)", outline: "none" }}
                />
                <p className="text-[10px] mt-1" style={{ color: "#78614E" }}>
                  Tip: record a short clean clip, upload to Dropbox / Google Drive (public link) or use an Asset Library audio URL.
                </p>
              </div>
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider mb-1" style={{ color: "#78614E" }}>
                  Exact transcript of the reference clip
                </label>
                <textarea
                  value={refText}
                  onChange={(e) => setRefText(e.target.value)}
                  rows={2}
                  maxLength={1000}
                  placeholder="Write EXACTLY what you say in the reference clip, word for word."
                  className="w-full rounded-md px-3 py-2 text-sm resize-none"
                  style={{ backgroundColor: "white", border: "1px solid rgba(139,92,246,0.25)", color: "var(--color-text)", outline: "none" }}
                />
              </div>
            </div>
          )}

          <button
            type="button"
            onClick={generate}
            disabled={busy || !prompt.trim()}
            className="w-full sm:w-auto px-6 py-3 rounded-xl text-sm font-bold flex items-center justify-center gap-2 disabled:opacity-40"
            style={{
              background: "linear-gradient(135deg, var(--color-primary), var(--color-primary-hover))",
              color: "#1C1814",
            }}
          >
            {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
            {busy ? "Generating..." : "Generate audio"}
          </button>

          <p className="text-[10px] mt-2" style={{ color: "#A8967E" }}>
            {mode === "tts" && "~$0.001 per second of speech · 5-15s render"}
            {mode === "music" && "~$0.002 per second · 15-30s render"}
            {mode === "sfx" && "~$0.01 per second · 5-10s render"}
            {mode === "clone" && "Zero-shot voice cloning · included in plan"}
          </p>

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

        {/* Latest result */}
        {latest?.audio_url && (
          <div
            className="rounded-2xl p-5"
            style={{ backgroundColor: "white", border: "1px solid rgba(16,185,129,0.3)" }}
          >
            <p className="text-[10px] font-bold uppercase tracking-wider mb-3" style={{ color: "#10B981" }}>
              Just generated · {latest.mode.toUpperCase()}
            </p>
            <audio src={latest.audio_url} controls className="w-full" autoPlay />
            <div className="mt-3 flex items-center justify-between text-xs" style={{ color: "#78614E" }}>
              <span>
                {latest.duration_sec ? `${latest.duration_sec.toFixed(1)}s` : "?"} ·{" "}
                {latest.duration_ms ? `${Math.round(latest.duration_ms / 1000)}s render` : ""}
                {latest.cost_usd ? ` · $${latest.cost_usd.toFixed(4)}` : ""}
              </span>
              <a
                href={latest.audio_url}
                download
                className="inline-flex items-center gap-1 font-bold"
                style={{ color: "var(--color-primary-hover)" }}
              >
                <Download className="w-3 h-3" />
                Download
              </a>
            </div>
          </div>
        )}

        {/* Gallery */}
        <div>
          <h3 className="text-sm font-bold uppercase tracking-wider mb-3" style={{ color: "#78614E" }}>
            Recent ({gallery.length})
          </h3>
          {gallery.length === 0 ? (
            <p className="text-xs py-6 text-center" style={{ color: "#A8967E" }}>
              No audio yet.
            </p>
          ) : (
            <div className="space-y-2">
              {gallery.map((g) => (
                <div
                  key={g.id}
                  className="rounded-xl p-3 flex items-center gap-3"
                  style={{ backgroundColor: "white", border: "1px solid rgba(0,0,0,0.06)" }}
                >
                  <button
                    type="button"
                    onClick={(e) => {
                      const audio = (e.currentTarget.parentElement?.querySelector("audio")) as HTMLAudioElement | null;
                      togglePlay(g.id, audio);
                    }}
                    disabled={!g.audio_url}
                    className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 disabled:opacity-30"
                    style={{
                      backgroundColor: "var(--color-primary)",
                      color: "#1C1814",
                    }}
                  >
                    {playing === g.id ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 ml-0.5" />}
                  </button>
                  {g.audio_url && (
                    <audio
                      src={g.audio_url}
                      preload="none"
                      onEnded={() => setPlaying(null)}
                      style={{ display: "none" }}
                    />
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold line-clamp-1" style={{ color: "var(--color-text)" }}>
                      <span
                        className="text-[9px] font-bold uppercase mr-1.5 px-1.5 py-0.5 rounded"
                        style={{ backgroundColor: "rgba(0,0,0,0.06)", color: "#78614E" }}
                      >
                        {g.mode}
                      </span>
                      {g.prompt}
                    </p>
                    <p className="text-[10px] mt-0.5" style={{ color: "#78614E" }}>
                      {g.duration_sec ? `${g.duration_sec.toFixed(1)}s` : "?"} ·{" "}
                      {g.cost_usd ? `$${g.cost_usd.toFixed(4)}` : "?"}
                    </p>
                  </div>
                  {g.audio_url && (
                    <a
                      href={g.audio_url}
                      download
                      className="p-2 rounded-lg"
                      style={{ color: "#78614E" }}
                    >
                      <Download className="w-3.5 h-3.5" />
                    </a>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
