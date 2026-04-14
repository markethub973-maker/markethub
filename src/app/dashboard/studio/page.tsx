"use client";

/**
 * Content Studio — Wave 6 dashboard page.
 *
 * Two tabs:
 *   1. VISUALS — paste an image URL or upload a file, pick N target
 *      formats, and get a gallery of cropped outputs. Powered by
 *      server-side sharp via /api/visuals/crop.
 *
 *   2. YOUTUBE — draft video metadata, click "AI Suggestions" to call
 *      Haiku for titles/tags/description, then upload to YouTube via
 *      /api/youtube/upload.
 *
 * Auth: relies on Supabase user session (redirects to /login if missing).
 */

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Image as ImageIcon,
  Youtube,
  Loader2,
  Download,
  Sparkles,
  Upload,
  Copy,
  CheckCircle2,
  ExternalLink,
  X,
} from "lucide-react";
import { CROP_PRESETS, type CropFormat } from "@/lib/cropPresets";

// ── Types ──────────────────────────────────────────────────────────────────

interface CropResult {
  format: CropFormat;
  label: string;
  status: "pending" | "processing" | "ready" | "failed";
  output_url?: string;
  error?: string;
  cached?: boolean;
}

interface SeoSuggestions {
  alt_titles: string[];
  tags: string[];
  description: string;
  category_id: number;
  rationale: string;
}

type Tab = "visuals" | "youtube";

// ── Page ────────────────────────────────────────────────────────────────────

export default function StudioPage() {
  const [tab, setTab] = useState<Tab>("visuals");

  return (
    <div style={{ minHeight: "100vh", background: "#FAFAF8", color: "#292524" }}>
      {/* Top bar */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 16,
          padding: "16px 24px",
          borderBottom: "1px solid rgba(245,215,160,0.25)",
          background: "#FFFCF7",
        }}
      >
        <Link
          href="/dashboard"
          style={{
            display: "flex",
            alignItems: "center",
            gap: 6,
            padding: "6px 12px",
            background: "rgba(245,158,11,0.08)",
            borderRadius: 6,
            color: "#F59E0B",
            textDecoration: "none",
            fontSize: 12,
          }}
        >
          <ArrowLeft size={14} /> Dashboard
        </Link>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 11, color: "#A8967E", letterSpacing: 1.5, textTransform: "uppercase" }}>
            Content Studio
          </div>
          <h1 style={{ fontSize: 20, fontWeight: 800, margin: 0 }}>
            AI Visuals + YouTube Publishing
          </h1>
        </div>
      </div>

      {/* Tabs */}
      <div
        style={{
          display: "flex",
          gap: 4,
          padding: "12px 24px",
          borderBottom: "1px solid rgba(245,215,160,0.2)",
          background: "#FFFCF7",
        }}
      >
        <TabButton active={tab === "visuals"} onClick={() => setTab("visuals")}>
          <ImageIcon size={14} /> Visuals Auto-crop
        </TabButton>
        <TabButton active={tab === "youtube"} onClick={() => setTab("youtube")}>
          <Youtube size={14} /> YouTube Publishing
        </TabButton>
      </div>

      {/* Content */}
      <div style={{ padding: 24 }}>
        {tab === "visuals" && <VisualsTab />}
        {tab === "youtube" && <YouTubeTab />}
      </div>
    </div>
  );
}

function TabButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      style={{
        display: "flex",
        alignItems: "center",
        gap: 6,
        padding: "10px 18px",
        background: active ? "#F59E0B" : "transparent",
        color: active ? "#1C1814" : "#78614E",
        border: "none",
        borderRadius: 8,
        fontSize: 13,
        fontWeight: 700,
        cursor: "pointer",
      }}
    >
      {children}
    </button>
  );
}

// ── Visuals Tab ─────────────────────────────────────────────────────────────

function VisualsTab() {
  const [sourceUrl, setSourceUrl] = useState("");
  const [selected, setSelected] = useState<Set<CropFormat>>(
    new Set(["square", "post", "story", "thumbnail"] as CropFormat[]),
  );
  const [results, setResults] = useState<Record<string, CropResult>>({});
  const [processing, setProcessing] = useState(false);
  const [globalError, setGlobalError] = useState<string | null>(null);

  function toggle(format: CropFormat) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(format)) next.delete(format);
      else next.add(format);
      return next;
    });
  }

  async function runAll() {
    if (!sourceUrl.trim() || selected.size === 0 || processing) return;
    setProcessing(true);
    setGlobalError(null);
    setResults({});

    // Mark all as pending
    const initial: Record<string, CropResult> = {};
    for (const f of selected) {
      const preset = CROP_PRESETS.find((p) => p.format === f)!;
      initial[f] = { format: f, label: preset.label, status: "pending" };
    }
    setResults({ ...initial });

    // Process each format (sequential to stay within limits)
    for (const f of selected) {
      try {
        const res = await fetch("/api/visuals/crop", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ source_url: sourceUrl.trim(), format: f }),
        });
        const d = await res.json();
        const preset = CROP_PRESETS.find((p) => p.format === f)!;
        setResults((prev) => ({
          ...prev,
          [f]: {
            format: f,
            label: preset.label,
            status: res.ok ? "ready" : "failed",
            output_url: d.output_url,
            error: res.ok ? undefined : d.error,
            cached: d.cached,
          },
        }));
      } catch (e) {
        const preset = CROP_PRESETS.find((p) => p.format === f)!;
        setResults((prev) => ({
          ...prev,
          [f]: {
            format: f,
            label: preset.label,
            status: "failed",
            error: e instanceof Error ? e.message : "Network error",
          },
        }));
      }
    }

    setProcessing(false);
  }

  return (
    <div>
      <div
        style={{
          padding: 16,
          background: "#FFFCF7",
          border: "1px solid rgba(245,215,160,0.3)",
          borderRadius: 12,
          marginBottom: 16,
        }}
      >
        <label
          style={{
            display: "block",
            fontSize: 10,
            color: "#A8967E",
            letterSpacing: 1,
            textTransform: "uppercase",
            fontWeight: 700,
            marginBottom: 6,
          }}
        >
          Source image URL
        </label>
        <input
          value={sourceUrl}
          onChange={(e) => setSourceUrl(e.target.value)}
          placeholder="https://example.com/image.jpg (sau URL din Supabase Storage)"
          style={{
            width: "100%",
            padding: "10px 12px",
            border: "1px solid rgba(245,215,160,0.3)",
            borderRadius: 8,
            fontSize: 13,
            outline: "none",
            background: "white",
            color: "#292524",
            marginBottom: 12,
          }}
        />

        <div style={{ fontSize: 10, color: "#A8967E", letterSpacing: 1, textTransform: "uppercase", fontWeight: 700, marginBottom: 8 }}>
          Alege formate ({selected.size} selectate)
        </div>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))",
            gap: 6,
            marginBottom: 14,
          }}
        >
          {CROP_PRESETS.map((p) => {
            const isSel = selected.has(p.format);
            return (
              <button
                key={p.format}
                onClick={() => toggle(p.format)}
                style={{
                  padding: 10,
                  background: isSel ? "rgba(245,158,11,0.12)" : "white",
                  border: `1px solid ${isSel ? "#F59E0B" : "rgba(245,215,160,0.3)"}`,
                  borderRadius: 8,
                  textAlign: "left",
                  cursor: "pointer",
                }}
              >
                <div
                  style={{
                    fontSize: 12,
                    fontWeight: 700,
                    color: isSel ? "#F59E0B" : "#292524",
                    marginBottom: 2,
                  }}
                >
                  {p.icon} {p.label}
                </div>
                <div style={{ fontSize: 10, color: "#A8967E" }}>
                  {p.width}×{p.height} · {p.usedFor}
                </div>
              </button>
            );
          })}
        </div>

        <button
          onClick={runAll}
          disabled={processing || !sourceUrl.trim() || selected.size === 0}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 6,
            padding: "10px 18px",
            background: processing || !sourceUrl.trim() || selected.size === 0 ? "#C4AA8A" : "#F59E0B",
            color: "#1C1814",
            border: "none",
            borderRadius: 8,
            fontWeight: 700,
            fontSize: 13,
            cursor: processing || !sourceUrl.trim() || selected.size === 0 ? "not-allowed" : "pointer",
          }}
        >
          {processing ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}
          {processing ? "Processing..." : `Crop ${selected.size} formats`}
        </button>

        {globalError && (
          <div
            style={{
              marginTop: 10,
              padding: 10,
              background: "rgba(239,68,68,0.08)",
              borderRadius: 6,
              fontSize: 11,
              color: "#B91C1C",
            }}
          >
            ⚠ {globalError}
          </div>
        )}
      </div>

      {/* Results gallery */}
      {Object.keys(results).length > 0 && (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))",
            gap: 14,
          }}
        >
          {Object.values(results).map((r) => {
            const preset = CROP_PRESETS.find((p) => p.format === r.format)!;
            return (
              <div
                key={r.format}
                style={{
                  background: "#FFFCF7",
                  border: "1px solid rgba(245,215,160,0.3)",
                  borderRadius: 10,
                  overflow: "hidden",
                }}
              >
                <div
                  style={{
                    background: "#F5EFE4",
                    padding: 14,
                    minHeight: 180,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  {r.status === "pending" && <Loader2 size={20} className="animate-spin" style={{ color: "#F59E0B" }} />}
                  {r.status === "failed" && (
                    <div style={{ textAlign: "center", padding: 10 }}>
                      <X size={20} style={{ color: "#EF4444", margin: "0 auto 4px" }} />
                      <div style={{ fontSize: 10, color: "#B91C1C" }}>{r.error}</div>
                    </div>
                  )}
                  {r.status === "ready" && r.output_url && (
                    <img
                      src={`/api/image-proxy?url=${encodeURIComponent(r.output_url)}`}
                      alt={r.label}
                      style={{
                        maxWidth: "100%",
                        maxHeight: 200,
                        borderRadius: 6,
                      }}
                    />
                  )}
                </div>
                <div style={{ padding: 12 }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: "#292524", marginBottom: 2 }}>
                    {preset.icon} {r.label}
                  </div>
                  <div style={{ fontSize: 10, color: "#A8967E" }}>
                    {preset.width}×{preset.height} · {preset.aspect}
                    {r.cached && <span style={{ marginLeft: 6, color: "#10B981" }}>cached</span>}
                  </div>
                  {r.status === "ready" && r.output_url && (
                    <div style={{ display: "flex", gap: 6, marginTop: 8 }}>
                      <a
                        href={r.output_url}
                        download
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{
                          flex: 1,
                          padding: "6px 10px",
                          background: "#F59E0B",
                          color: "#1C1814",
                          borderRadius: 6,
                          fontSize: 10,
                          fontWeight: 700,
                          textDecoration: "none",
                          textAlign: "center",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          gap: 4,
                        }}
                      >
                        <Download size={10} /> Download
                      </a>
                      <button
                        onClick={() => navigator.clipboard.writeText(r.output_url!)}
                        style={{
                          padding: "6px 10px",
                          background: "rgba(168,150,126,0.1)",
                          color: "#78614E",
                          border: "1px solid rgba(168,150,126,0.2)",
                          borderRadius: 6,
                          fontSize: 10,
                          fontWeight: 700,
                          cursor: "pointer",
                        }}
                      >
                        <Copy size={10} />
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ── YouTube Tab ─────────────────────────────────────────────────────────────

function YouTubeTab() {
  const [topic, setTopic] = useState("");
  const [draftDescription, setDraftDescription] = useState("");
  const [niche, setNiche] = useState("");
  const [suggestions, setSuggestions] = useState<SeoSuggestions | null>(null);
  const [suggesting, setSuggesting] = useState(false);
  const [suggestError, setSuggestError] = useState<string | null>(null);

  // Upload form
  const [videoUrl, setVideoUrl] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [tags, setTags] = useState("");
  const [privacy, setPrivacy] = useState<"public" | "unlisted" | "private">("private");
  const [categoryId, setCategoryId] = useState<number>(22);
  const [uploading, setUploading] = useState(false);
  const [uploadResult, setUploadResult] = useState<{ video_url?: string; error?: string } | null>(null);

  // Upload history
  const [uploads, setUploads] = useState<Array<{
    id: string;
    title: string;
    youtube_video_id: string | null;
    upload_status: string;
    created_at: string;
    privacy: string;
  }>>([]);

  const loadUploads = useCallback(async () => {
    try {
      const res = await fetch("/api/youtube/upload", { cache: "no-store" });
      if (res.ok) {
        const d = await res.json();
        setUploads(d.uploads ?? []);
      }
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    void loadUploads();
  }, [loadUploads]);

  async function getSuggestions() {
    if (!topic.trim() || suggesting) return;
    setSuggesting(true);
    setSuggestError(null);
    try {
      const res = await fetch("/api/youtube/seo-suggestions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          topic: topic.trim(),
          description: draftDescription.trim() || undefined,
          niche: niche.trim() || undefined,
        }),
      });
      const d = await res.json();
      if (!res.ok) {
        setSuggestError(d.error || "Failed");
      } else {
        setSuggestions(d.suggestions);
        // Auto-fill upload form
        if (!title) setTitle(d.suggestions.alt_titles[0] ?? "");
        if (!description) setDescription(d.suggestions.description ?? "");
        if (!tags) setTags(d.suggestions.tags.join(", "));
        setCategoryId(d.suggestions.category_id ?? 22);
      }
    } catch (e) {
      setSuggestError(e instanceof Error ? e.message : "Network error");
    } finally {
      setSuggesting(false);
    }
  }

  async function uploadVideo() {
    if (!videoUrl.trim() || !title.trim() || uploading) return;
    setUploading(true);
    setUploadResult(null);
    try {
      const res = await fetch("/api/youtube/upload", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          video_url: videoUrl.trim(),
          title: title.trim(),
          description: description.trim() || undefined,
          tags: tags
            .split(",")
            .map((t) => t.trim())
            .filter(Boolean),
          privacy,
          category_id: categoryId,
        }),
      });
      const d = await res.json();
      setUploadResult({
        video_url: d.video_url,
        error: res.ok ? undefined : d.error || "Upload failed",
      });
      if (res.ok) {
        await loadUploads();
      }
    } catch (e) {
      setUploadResult({ error: e instanceof Error ? e.message : "Network error" });
    } finally {
      setUploading(false);
    }
  }

  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
      {/* Left column: SEO suggestions + form */}
      <div>
        <div
          style={{
            padding: 16,
            background: "#FFFCF7",
            border: "1px solid rgba(245,215,160,0.3)",
            borderRadius: 12,
            marginBottom: 14,
          }}
        >
          <div
            style={{
              fontSize: 10,
              color: "#A8967E",
              letterSpacing: 1,
              textTransform: "uppercase",
              fontWeight: 700,
              marginBottom: 10,
            }}
          >
            <Sparkles size={11} style={{ display: "inline", marginRight: 4, verticalAlign: "middle" }} />
            AI SEO Suggestions
          </div>
          <Field label="What is the video about">
            <input
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              placeholder="e.g. 5 common mistakes with Instagram posts"
              style={inputStyle}
            />
          </Field>
          <Field label="Draft description (optional)">
            <textarea
              value={draftDescription}
              onChange={(e) => setDraftDescription(e.target.value)}
              rows={3}
              style={{ ...inputStyle, resize: "vertical" }}
            />
          </Field>
          <Field label="Niche (optional)">
            <input
              value={niche}
              onChange={(e) => setNiche(e.target.value)}
              placeholder="e.g. digital marketing for restaurants"
              style={inputStyle}
            />
          </Field>
          <button
            onClick={getSuggestions}
            disabled={suggesting || !topic.trim()}
            style={{
              width: "100%",
              padding: 10,
              background: suggesting || !topic.trim() ? "#C4AA8A" : "linear-gradient(135deg, #8B5CF6, #6366F1)",
              color: "white",
              border: "none",
              borderRadius: 8,
              fontWeight: 700,
              fontSize: 12,
              cursor: suggesting || !topic.trim() ? "not-allowed" : "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 6,
            }}
          >
            {suggesting ? <Loader2 size={12} className="animate-spin" /> : <Sparkles size={12} />}
            {suggesting ? "Generating..." : "Generate SEO suggestions"}
          </button>
          {suggestError && (
            <div
              style={{
                marginTop: 8,
                padding: 8,
                background: "rgba(239,68,68,0.08)",
                borderRadius: 6,
                fontSize: 10,
                color: "#B91C1C",
              }}
            >
              ⚠ {suggestError}
            </div>
          )}
        </div>

        {/* Suggestions display */}
        {suggestions && (
          <div
            style={{
              padding: 14,
              background: "rgba(139,92,246,0.04)",
              border: "1px solid rgba(139,92,246,0.2)",
              borderRadius: 12,
              marginBottom: 14,
            }}
          >
            <div
              style={{
                fontSize: 10,
                color: "#8B5CF6",
                letterSpacing: 1,
                textTransform: "uppercase",
                fontWeight: 700,
                marginBottom: 8,
              }}
            >
              Sugestii generate
            </div>
            <div style={{ fontSize: 11, marginBottom: 8 }}>
              <strong>5 variante titlu:</strong>
              <ul style={{ margin: "4px 0 0 18px", padding: 0, fontSize: 11, color: "#292524" }}>
                {suggestions.alt_titles.map((t, i) => (
                  <li
                    key={i}
                    onClick={() => setTitle(t)}
                    style={{ cursor: "pointer", padding: "2px 0" }}
                    title="Click pentru a folosi"
                  >
                    {t}
                  </li>
                ))}
              </ul>
            </div>
            <div style={{ fontSize: 11, color: "#78614E" }}>
              <strong>{suggestions.tags.length} tags</strong> + category_id{" "}
              <code>{suggestions.category_id}</code>
            </div>
            <div style={{ fontSize: 10, fontStyle: "italic", color: "#A8967E", marginTop: 6 }}>
              {suggestions.rationale}
            </div>
          </div>
        )}
      </div>

      {/* Right column: Upload form */}
      <div>
        <div
          style={{
            padding: 16,
            background: "#FFFCF7",
            border: "1px solid rgba(245,215,160,0.3)",
            borderRadius: 12,
          }}
        >
          <div
            style={{
              fontSize: 10,
              color: "#A8967E",
              letterSpacing: 1,
              textTransform: "uppercase",
              fontWeight: 700,
              marginBottom: 10,
            }}
          >
            <Upload size={11} style={{ display: "inline", marginRight: 4, verticalAlign: "middle" }} />
            Upload to YouTube
          </div>
          <Field label="Video URL (Supabase Storage or public)">
            <input
              value={videoUrl}
              onChange={(e) => setVideoUrl(e.target.value)}
              placeholder="https://..."
              style={inputStyle}
            />
          </Field>
          <Field label="Title (max 100 chars)">
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value.slice(0, 100))}
              style={inputStyle}
            />
          </Field>
          <Field label="Description">
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={4}
              style={{ ...inputStyle, resize: "vertical" }}
            />
          </Field>
          <Field label="Tags (comma-separated)">
            <input value={tags} onChange={(e) => setTags(e.target.value)} style={inputStyle} />
          </Field>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
            <Field label="Category">
              <select
                value={categoryId}
                onChange={(e) => setCategoryId(Number(e.target.value))}
                style={inputStyle}
              >
                <option value={10}>10 — Music</option>
                <option value={17}>17 — Sports</option>
                <option value={19}>19 — Travel</option>
                <option value={20}>20 — Gaming</option>
                <option value={22}>22 — People & Blogs</option>
                <option value={23}>23 — Comedy</option>
                <option value={24}>24 — Entertainment</option>
                <option value={25}>25 — News</option>
                <option value={26}>26 — Howto & Style</option>
                <option value={27}>27 — Education</option>
                <option value={28}>28 — Science & Tech</option>
              </select>
            </Field>
            <Field label="Visibility">
              <select
                value={privacy}
                onChange={(e) => setPrivacy(e.target.value as "public" | "unlisted" | "private")}
                style={inputStyle}
              >
                <option value="private">Private</option>
                <option value="unlisted">Unlisted</option>
                <option value="public">Public</option>
              </select>
            </Field>
          </div>
          <button
            onClick={uploadVideo}
            disabled={uploading || !videoUrl.trim() || !title.trim()}
            style={{
              width: "100%",
              marginTop: 10,
              padding: 12,
              background: uploading || !videoUrl.trim() || !title.trim() ? "#C4AA8A" : "#FF0000",
              color: "white",
              border: "none",
              borderRadius: 8,
              fontWeight: 700,
              fontSize: 13,
              cursor: uploading || !videoUrl.trim() || !title.trim() ? "not-allowed" : "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 6,
            }}
          >
            {uploading ? <Loader2 size={14} className="animate-spin" /> : <Youtube size={14} />}
            {uploading ? "Loading..." : "Upload to YouTube"}
          </button>
          {uploadResult?.error && (
            <div
              style={{
                marginTop: 10,
                padding: 10,
                background: "rgba(239,68,68,0.08)",
                borderRadius: 6,
                fontSize: 11,
                color: "#B91C1C",
              }}
            >
              ⚠ {uploadResult.error}
            </div>
          )}
          {uploadResult?.video_url && (
            <div
              style={{
                marginTop: 10,
                padding: 10,
                background: "rgba(16,185,129,0.08)",
                borderRadius: 6,
                fontSize: 11,
                color: "#065F46",
              }}
            >
              <CheckCircle2 size={11} style={{ display: "inline", marginRight: 4, verticalAlign: "middle" }} />
              Video uploaded:{" "}
              <a href={uploadResult.video_url} target="_blank" rel="noopener noreferrer" style={{ color: "#065F46", textDecoration: "underline" }}>
                {uploadResult.video_url}
              </a>
            </div>
          )}
        </div>

        {/* Recent uploads */}
        {uploads.length > 0 && (
          <div
            style={{
              marginTop: 14,
              padding: 14,
              background: "#FFFCF7",
              border: "1px solid rgba(245,215,160,0.3)",
              borderRadius: 12,
            }}
          >
            <div
              style={{
                fontSize: 10,
                color: "#A8967E",
                letterSpacing: 1,
                textTransform: "uppercase",
                fontWeight: 700,
                marginBottom: 8,
              }}
            >
              Upload-uri recente
            </div>
            {uploads.map((u) => (
              <div
                key={u.id}
                style={{
                  padding: 8,
                  borderBottom: "1px solid rgba(245,215,160,0.15)",
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  fontSize: 11,
                }}
              >
                <div style={{ flex: 1, color: "#292524", fontWeight: 600 }}>{u.title}</div>
                <span
                  style={{
                    padding: "2px 6px",
                    borderRadius: 10,
                    background:
                      u.upload_status === "published"
                        ? "rgba(16,185,129,0.15)"
                        : u.upload_status === "failed"
                          ? "rgba(239,68,68,0.15)"
                          : "rgba(245,158,11,0.15)",
                    color:
                      u.upload_status === "published"
                        ? "#10B981"
                        : u.upload_status === "failed"
                          ? "#EF4444"
                          : "#F59E0B",
                    fontWeight: 700,
                    fontSize: 9,
                    textTransform: "uppercase",
                  }}
                >
                  {u.upload_status}
                </span>
                {u.youtube_video_id && (
                  <a
                    href={`https://www.youtube.com/watch?v=${u.youtube_video_id}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{ color: "#F59E0B" }}
                  >
                    <ExternalLink size={11} />
                  </a>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "8px 10px",
  border: "1px solid rgba(245,215,160,0.3)",
  borderRadius: 6,
  fontSize: 12,
  outline: "none",
  fontFamily: "inherit",
  background: "white",
  color: "#292524",
  marginBottom: 6,
};

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 8 }}>
      <label
        style={{
          display: "block",
          fontSize: 9,
          color: "#78614E",
          letterSpacing: 1,
          textTransform: "uppercase",
          fontWeight: 700,
          marginBottom: 4,
        }}
      >
        {label}
      </label>
      {children}
    </div>
  );
}
