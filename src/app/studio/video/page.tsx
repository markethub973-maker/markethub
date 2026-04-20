"use client";

/**
 * AI Video Studio — generate 5-10s video clips from text prompts or images.
 * Uses Fal Seedance 2.0 (720p, ~30-90s generation time, ~$0.30/clip).
 */

import { useCallback, useEffect, useState } from "react";
import Header from "@/components/layout/Header";
import FileDropZone from "@/components/ui/FileDropZone";
import { Film, Sparkles, Loader2, Download, Clock, AlertCircle, Wand2, Image as ImageIcon } from "lucide-react";

type Aspect = "9:16" | "16:9" | "1:1";
type Mode = "text-to-video" | "image-to-video";

interface Gen {
  id: string;
  provider: string;
  mode: string;
  prompt: string | null;
  source_image_url: string | null;
  aspect_ratio: Aspect | null;
  duration_sec: number | null;
  video_url: string | null;
  thumbnail_url: string | null;
  status: string;
  cost_usd: number | null;
  duration_ms: number | null;
  created_at: string;
}

const ASPECTS: { value: Aspect; label: string }[] = [
  { value: "9:16", label: "Portrait (9:16)" },
  { value: "16:9", label: "Landscape (16:9)" },
  { value: "1:1",  label: "Square (1:1)" },
];

const STATUS_COLOR: Record<string, string> = {
  queued: "#78614E",
  running: "var(--color-primary)",
  succeeded: "#10B981",
  failed: "#EF4444",
  moderation_blocked: "#6366F1",
};

export default function AiVideoStudioPage() {
  const [mode, setMode] = useState<Mode>("text-to-video");
  const [prompt, setPrompt] = useState("");
  const [sourceImage, setSourceImage] = useState("");
  const [aspect, setAspect] = useState<Aspect>("9:16");
  const [duration, setDuration] = useState<5 | 10>(5);
  const [busy, setBusy] = useState(false);
  const [latest, setLatest] = useState<Gen | null>(null);
  const [gallery, setGallery] = useState<Gen[]>([]);
  const [err, setErr] = useState<string | null>(null);

  const loadGallery = useCallback(async () => {
    try {
      const res = await fetch("/api/studio/video", { cache: "no-store" });
      if (res.ok) {
        const d = await res.json();
        setGallery(d.generations ?? []);
      }
    } catch { /* ignore */ }
  }, []);

  useEffect(() => { loadGallery(); }, [loadGallery]);

  const generate = async () => {
    if (busy) return;
    if (mode === "text-to-video" && !prompt.trim()) return;
    if (mode === "image-to-video" && !sourceImage.trim()) return;

    setBusy(true);
    setErr(null);
    setLatest(null);
    try {
      const body: Record<string, unknown> = {
        mode,
        aspect_ratio: aspect,
        duration_sec: duration,
      };
      if (prompt.trim()) body.prompt = prompt.trim();
      if (mode === "image-to-video" && sourceImage.trim()) body.source_image_url = sourceImage.trim();

      const res = await fetch("/api/studio/video", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        setErr(data.error ?? "Generation failed");
      } else {
        setLatest({
          id: data.id,
          provider: data.provider ?? "?",
          mode,
          prompt: prompt.trim() || null,
          source_image_url: sourceImage.trim() || null,
          aspect_ratio: aspect,
          duration_sec: duration,
          video_url: data.video_url ?? null,
          thumbnail_url: data.thumbnail_url ?? null,
          status: "succeeded",
          cost_usd: data.cost_usd ?? null,
          duration_ms: data.duration_ms ?? null,
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

  return (
    <div className="min-h-screen" style={{ backgroundColor: "var(--color-bg-secondary)" }}>
      <Header title="AI Video Studio" subtitle="Generate 5-10s video clips from prompts or images" />

      <main className="max-w-6xl mx-auto px-6 py-6 space-y-6">
        {/* Generate card */}
        <div
          className="rounded-2xl p-6"
          style={{ backgroundColor: "white", border: "1px solid rgba(245,158,11,0.2)" }}
        >
          <div className="flex items-center gap-2 mb-4">
            <Wand2 className="w-5 h-5" style={{ color: "var(--color-primary)" }} />
            <h2 className="text-lg font-bold" style={{ color: "var(--color-text)" }}>
              Generate
            </h2>
          </div>

          {/* Mode toggle */}
          <div className="flex gap-2 mb-4">
            {(["text-to-video", "image-to-video"] as Mode[]).map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => setMode(m)}
                className="px-3 py-2 rounded-lg text-xs font-bold"
                style={{
                  backgroundColor: mode === m ? "var(--color-text)" : "rgba(0,0,0,0.04)",
                  color: mode === m ? "white" : "var(--color-text)",
                }}
              >
                {m === "text-to-video" ? "Text → Video" : "Image → Video"}
              </button>
            ))}
          </div>

          {/* Inputs depend on mode */}
          {mode === "image-to-video" && (
            <>
              <label className="block text-[10px] font-bold uppercase tracking-wider mb-1" style={{ color: "#78614E" }}>
                Source image
              </label>
              <FileDropZone
                accept="image/*"
                onFileUrl={(url) => setSourceImage(url)}
                currentUrl={sourceImage}
                label="Drop image here or click to upload"
                folder="video-sources"
              />
              <input
                type="url"
                value={sourceImage}
                onChange={(e) => setSourceImage(e.target.value)}
                placeholder="Or paste image URL here..."
                className="w-full rounded-lg px-3 py-2 text-sm mb-4"
                style={{
                  backgroundColor: "var(--color-bg)",
                  border: "1px solid var(--color-border)",
                  color: "var(--color-text)",
                  outline: "none",
                }}
              />
            </>
          )}

          <label className="block text-[10px] font-bold uppercase tracking-wider mb-1" style={{ color: "#78614E" }}>
            {mode === "image-to-video" ? "Motion prompt (optional)" : "Prompt"}
          </label>
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder={
              mode === "text-to-video"
                ? "A golden retriever running on a beach at sunset, slow motion, cinematic"
                : "e.g. camera slowly pans right, gentle wind moves the trees"
            }
            rows={3}
            className="w-full rounded-lg px-3 py-2 text-sm resize-none mb-4"
            style={{
              backgroundColor: "var(--color-bg)",
              border: "1px solid rgba(245,215,160,0.4)",
              color: "var(--color-text)",
              outline: "none",
            }}
          />

          {/* Aspect + duration */}
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider mb-1" style={{ color: "#78614E" }}>
                Aspect
              </label>
              <div className="flex gap-2 flex-wrap">
                {ASPECTS.map((a) => (
                  <button
                    key={a.value}
                    type="button"
                    onClick={() => setAspect(a.value)}
                    className="px-3 py-1.5 rounded-lg text-xs font-bold"
                    style={{
                      backgroundColor: aspect === a.value ? "var(--color-text)" : "rgba(0,0,0,0.04)",
                      color: aspect === a.value ? "white" : "var(--color-text)",
                    }}
                  >
                    {a.label}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider mb-1" style={{ color: "#78614E" }}>
                Duration
              </label>
              <div className="flex gap-2">
                {([5, 10] as const).map((d) => (
                  <button
                    key={d}
                    type="button"
                    onClick={() => setDuration(d)}
                    className="px-3 py-1.5 rounded-lg text-xs font-bold"
                    style={{
                      backgroundColor: duration === d ? "var(--color-text)" : "rgba(0,0,0,0.04)",
                      color: duration === d ? "white" : "var(--color-text)",
                    }}
                  >
                    {d}s
                  </button>
                ))}
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={generate}
            disabled={busy || (mode === "text-to-video" ? !prompt.trim() : !sourceImage.trim())}
            className="w-full sm:w-auto px-6 py-3 rounded-xl text-sm font-bold flex items-center justify-center gap-2 disabled:opacity-40"
            style={{
              background: "linear-gradient(135deg, var(--color-primary), var(--color-primary-hover))",
              color: "#1C1814",
            }}
          >
            {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Film className="w-4 h-4" />}
            {busy ? `Generating... (30-90s)` : "Generate video"}
          </button>

          <p className="text-[10px] mt-2" style={{ color: "#A8967E" }}>
            Cost: ~$0.30 per clip. Typical render: 30-90 seconds. Stay on this page — the video appears below when ready.
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
        {latest?.video_url && (
          <div
            className="rounded-2xl p-6"
            style={{ backgroundColor: "white", border: "1px solid rgba(16,185,129,0.3)" }}
          >
            <p className="text-[10px] font-bold uppercase tracking-wider mb-3" style={{ color: "#10B981" }}>
              Just generated
            </p>
            <video
              src={latest.video_url}
              controls
              autoPlay
              loop
              muted
              className="w-full max-h-[600px] rounded-xl"
              style={{ backgroundColor: "rgba(0,0,0,0.03)" }}
            />
            <div className="mt-3 flex items-center justify-between text-xs" style={{ color: "#78614E" }}>
              <span>
                {latest.provider} · {latest.aspect_ratio} · {latest.duration_sec}s ·{" "}
                {latest.duration_ms ? `${Math.round(latest.duration_ms / 1000)}s render` : "?"}
                {latest.cost_usd ? ` · $${latest.cost_usd.toFixed(4)}` : ""}
              </span>
              <a
                href={latest.video_url}
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
          <div className="flex items-center gap-2 mb-3">
            <Film className="w-4 h-4" style={{ color: "#78614E" }} />
            <h3 className="text-sm font-bold uppercase tracking-wider" style={{ color: "#78614E" }}>
              Recent ({gallery.length})
            </h3>
          </div>
          {gallery.length === 0 ? (
            <p className="text-xs py-6 text-center" style={{ color: "#A8967E" }}>
              No videos yet.
            </p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
              {gallery.map((g) => (
                <div
                  key={g.id}
                  className="rounded-xl overflow-hidden"
                  style={{ backgroundColor: "white", border: "1px solid rgba(0,0,0,0.06)" }}
                >
                  {g.video_url ? (
                    <video
                      src={g.video_url}
                      muted
                      loop
                      playsInline
                      preload="metadata"
                      poster={g.thumbnail_url ?? undefined}
                      onMouseEnter={(e) => (e.currentTarget as HTMLVideoElement).play().catch(() => {})}
                      onMouseLeave={(e) => {
                        const v = e.currentTarget as HTMLVideoElement;
                        v.pause();
                        v.currentTime = 0;
                      }}
                      className="w-full aspect-[9/16] object-cover"
                    />
                  ) : (
                    <div
                      className="w-full aspect-[9/16] flex items-center justify-center"
                      style={{ backgroundColor: "rgba(0,0,0,0.04)" }}
                    >
                      {g.status === "failed" ? (
                        <AlertCircle className="w-6 h-6" style={{ color: "#EF4444" }} />
                      ) : (
                        <Clock className="w-6 h-6" style={{ color: "#78614E" }} />
                      )}
                    </div>
                  )}
                  <div className="p-2">
                    <p className="text-[11px] line-clamp-2" style={{ color: "var(--color-text)", lineHeight: 1.3 }}>
                      {g.prompt ?? g.source_image_url ?? "—"}
                    </p>
                    <p className="text-[9px] mt-1" style={{ color: STATUS_COLOR[g.status] ?? "#78614E", fontWeight: 700 }}>
                      {g.status.toUpperCase()} · {g.duration_sec ?? "?"}s
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
