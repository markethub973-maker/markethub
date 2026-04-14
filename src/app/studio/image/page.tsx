"use client";

/**
 * AI Image Studio — generate images from prompts + gallery view.
 *
 * Uses the session cookie for auth (not API token) so the UI feels
 * seamless for logged-in users. Behind the scenes the /api/v1/images
 * endpoint will accept either. For UI simplicity we call a sibling
 * session-auth endpoint; if we haven't shipped one, we fall back to
 * the token flow via /api/user/api-tokens → call /api/v1/images.
 *
 * For v1 this page calls POST /api/studio/image (session auth) which
 * wraps the same generateImage() lib. Simpler for users.
 */

import { useCallback, useEffect, useState } from "react";
import Header from "@/components/layout/Header";
import Link from "next/link";
import { Image as ImageIcon, Sparkles, Loader2, Download, Clock, AlertCircle, Wand2, Film, Check } from "lucide-react";

type Aspect = "1:1" | "16:9" | "9:16" | "4:5";

interface Gen {
  id: string;
  provider: string;
  prompt: string;
  aspect_ratio: Aspect | null;
  image_url: string | null;
  status: string;
  cost_usd: number | null;
  duration_ms: number | null;
  created_at: string;
}

const ASPECTS: { value: Aspect; label: string; dim: string }[] = [
  { value: "1:1", label: "Square", dim: "1024×1024" },
  { value: "16:9", label: "Landscape", dim: "1344×768" },
  { value: "9:16", label: "Portrait / Story", dim: "768×1344" },
  { value: "4:5", label: "Feed post", dim: "896×1152" },
];

const STATUS_COLOR: Record<string, string> = {
  queued: "#78614E",
  running: "var(--color-primary)",
  succeeded: "#10B981",
  failed: "#EF4444",
  moderation_blocked: "#6366F1",
};

export default function AiImageStudioPage() {
  const [prompt, setPrompt] = useState("");
  const [aspect, setAspect] = useState<Aspect>("1:1");
  const [busy, setBusy] = useState(false);
  const [latest, setLatest] = useState<Gen | null>(null);
  const [gallery, setGallery] = useState<Gen[]>([]);
  const [err, setErr] = useState<string | null>(null);
  // Animate (image-to-video) state for the "Just generated" card
  const [animating, setAnimating] = useState(false);
  const [animateResult, setAnimateResult] = useState<{ ok: boolean; video_url?: string; error?: string } | null>(null);

  const loadGallery = useCallback(async () => {
    try {
      const res = await fetch("/api/studio/image", { cache: "no-store" });
      if (res.ok) {
        const d = await res.json();
        setGallery(d.generations ?? []);
      }
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    loadGallery();
  }, [loadGallery]);

  const generate = async () => {
    if (!prompt.trim() || busy) return;
    setBusy(true);
    setErr(null);
    setLatest(null);
    try {
      const res = await fetch("/api/studio/image", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: prompt.trim(), aspect_ratio: aspect }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        setErr(data.error ?? "Generation failed");
      } else {
        setLatest({
          id: data.id,
          provider: data.provider ?? "?",
          prompt: prompt.trim(),
          aspect_ratio: aspect,
          image_url: data.image_url ?? null,
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

  const animateLatest = async () => {
    if (!latest?.image_url || animating) return;
    setAnimating(true);
    setAnimateResult(null);
    try {
      // Map image aspect to video aspect (1:1 → 1:1 etc.)
      const videoAspect =
        latest.aspect_ratio === "9:16" ? "9:16" :
        latest.aspect_ratio === "16:9" ? "16:9" : "1:1";
      const res = await fetch("/api/studio/video", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode: "image-to-video",
          source_image_url: latest.image_url,
          prompt: "Subtle motion, gentle camera drift, cinematic feel",
          aspect_ratio: videoAspect,
          duration_sec: 5,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        setAnimateResult({ ok: false, error: data.error ?? "Failed" });
      } else {
        setAnimateResult({ ok: true, video_url: data.video_url });
      }
    } catch (e) {
      setAnimateResult({ ok: false, error: e instanceof Error ? e.message : "Failed" });
    } finally {
      setAnimating(false);
    }
  };

  return (
    <div className="min-h-screen" style={{ backgroundColor: "var(--color-bg-secondary)" }}>
      <Header title="AI Image Studio" subtitle="Generate branded visuals from text prompts" />

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

          <label
            className="block text-[10px] font-bold uppercase tracking-wider mb-1"
            style={{ color: "#78614E" }}
          >
            Prompt
          </label>
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder='A golden retriever wearing sunglasses on a tropical beach at sunset, cinematic lighting, 35mm film'
            rows={3}
            className="w-full rounded-lg px-3 py-2 text-sm resize-none mb-4"
            style={{
              backgroundColor: "var(--color-bg)",
              border: "1px solid rgba(245,215,160,0.4)",
              color: "var(--color-text)",
              outline: "none",
            }}
          />

          <label
            className="block text-[10px] font-bold uppercase tracking-wider mb-2"
            style={{ color: "#78614E" }}
          >
            Aspect ratio
          </label>
          <div className="flex gap-2 flex-wrap mb-4">
            {ASPECTS.map((a) => (
              <button
                key={a.value}
                type="button"
                onClick={() => setAspect(a.value)}
                className="px-3 py-2 rounded-lg text-xs font-bold transition-all"
                style={{
                  backgroundColor: aspect === a.value ? "var(--color-text)" : "rgba(0,0,0,0.04)",
                  color: aspect === a.value ? "white" : "var(--color-text)",
                }}
              >
                {a.label} <span className="opacity-60">({a.value})</span>
              </button>
            ))}
          </div>

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
            {busy ? "Generating..." : "Generate image"}
          </button>

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
        {latest?.image_url && (
          <div
            className="rounded-2xl p-6"
            style={{ backgroundColor: "white", border: "1px solid rgba(16,185,129,0.3)" }}
          >
            <p
              className="text-[10px] font-bold uppercase tracking-wider mb-3"
              style={{ color: "#10B981" }}
            >
              Just generated
            </p>
            <img
              src={latest.image_url}
              alt="Just generated"
              className="w-full max-h-[520px] object-contain rounded-xl"
              style={{ backgroundColor: "rgba(0,0,0,0.03)" }}
            />
            <div className="mt-3 flex items-center justify-between text-xs gap-3 flex-wrap" style={{ color: "#78614E" }}>
              <span>
                {latest.provider} · {latest.aspect_ratio} ·{" "}
                {latest.duration_ms ? `${latest.duration_ms}ms` : "?"}
                {latest.cost_usd ? ` · $${latest.cost_usd.toFixed(4)}` : ""}
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={animateLatest}
                  disabled={animating || Boolean(animateResult?.ok)}
                  className="inline-flex items-center gap-1 px-3 py-1.5 rounded-md text-xs font-bold disabled:opacity-50"
                  style={{
                    background: "linear-gradient(135deg, #EC4899, #BE185D)",
                    color: "white",
                  }}
                >
                  {animating ? <Loader2 className="w-3 h-3 animate-spin" /> : <Film className="w-3 h-3" />}
                  {animating ? "Animating... (30-90s)" : animateResult?.ok ? "Animated" : "Animate (~$0.30)"}
                </button>
                <a
                  href={latest.image_url}
                  download
                  className="inline-flex items-center gap-1 font-bold"
                  style={{ color: "var(--color-primary-hover)" }}
                >
                  <Download className="w-3 h-3" />
                  Download
                </a>
              </div>
            </div>

            {animateResult?.ok && animateResult.video_url && (
              <div
                className="mt-4 rounded-xl p-3"
                style={{
                  backgroundColor: "rgba(236,72,153,0.06)",
                  border: "1px solid rgba(236,72,153,0.3)",
                }}
              >
                <p className="text-[10px] font-bold uppercase tracking-wider mb-2" style={{ color: "#BE185D" }}>
                  <Check className="w-3 h-3 inline mr-1" />
                  Video generated from this image
                </p>
                <video
                  src={animateResult.video_url}
                  controls
                  autoPlay
                  loop
                  muted
                  className="w-full max-h-[400px] rounded-lg"
                />
                <div className="mt-2 flex items-center justify-between text-xs">
                  <Link
                    href="/studio/video"
                    className="font-bold"
                    style={{ color: "#BE185D" }}
                  >
                    See in Video Studio →
                  </Link>
                  <a
                    href={animateResult.video_url}
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

            {animateResult && !animateResult.ok && (
              <p
                className="mt-3 text-xs flex items-center gap-1"
                style={{ color: "#EF4444" }}
              >
                <AlertCircle className="w-3 h-3" />
                Animate failed: {animateResult.error}
              </p>
            )}
          </div>
        )}

        {/* Gallery */}
        <div>
          <div className="flex items-center gap-2 mb-3">
            <ImageIcon className="w-4 h-4" style={{ color: "#78614E" }} />
            <h3
              className="text-sm font-bold uppercase tracking-wider"
              style={{ color: "#78614E" }}
            >
              Recent ({gallery.length})
            </h3>
          </div>
          {gallery.length === 0 ? (
            <p className="text-xs py-6 text-center" style={{ color: "#A8967E" }}>
              No generations yet.
            </p>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
              {gallery.map((g) => (
                <div
                  key={g.id}
                  className="rounded-xl overflow-hidden"
                  style={{ backgroundColor: "white", border: "1px solid rgba(0,0,0,0.06)" }}
                >
                  {g.image_url ? (
                    <img
                      src={g.image_url}
                      alt={g.prompt}
                      className="w-full aspect-square object-cover"
                      loading="lazy"
                    />
                  ) : (
                    <div
                      className="w-full aspect-square flex items-center justify-center"
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
                    <p
                      className="text-[11px] line-clamp-2"
                      style={{ color: "var(--color-text)", lineHeight: 1.3 }}
                    >
                      {g.prompt}
                    </p>
                    <p className="text-[9px] mt-1" style={{ color: STATUS_COLOR[g.status] ?? "#78614E", fontWeight: 700 }}>
                      {g.status.toUpperCase()}
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
