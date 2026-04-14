"use client";

/**
 * AI Asset Library — unified gallery of every AI asset the user
 * has generated. Filter by type, search by prompt, copy URL, download.
 */

import { useCallback, useEffect, useState } from "react";
import Header from "@/components/layout/Header";
import { Image as ImageIcon, Film, Music, Search, Copy, Check, Download, Loader2, Layers, ExternalLink } from "lucide-react";
import Link from "next/link";

type Type = "image" | "video" | "audio";
type Filter = "all" | Type;

interface Asset {
  id: string;
  type: Type;
  url: string | null;
  prompt: string;
  aspect_ratio: string | null;
  duration_sec: number | null;
  status: string;
  cost_usd: number | null;
  source_context: string | null;
  created_at: string;
}

const TYPE_CONFIG: Record<Type, { icon: React.ElementType; color: string; label: string }> = {
  image: { icon: ImageIcon, color: "#8B5CF6", label: "Images" },
  video: { icon: Film,      color: "#EC4899", label: "Videos" },
  audio: { icon: Music,     color: "#10B981", label: "Audio" },
};

export default function AssetLibraryPage() {
  const [filter, setFilter] = useState<Filter>("all");
  const [q, setQ] = useState("");
  const [assets, setAssets] = useState<Asset[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ limit: "60" });
      if (filter !== "all") params.set("type", filter);
      if (q.trim()) params.set("q", q.trim());
      const res = await fetch(`/api/studio/assets?${params}`, { cache: "no-store" });
      if (res.ok) {
        const d = await res.json();
        setAssets(d.assets ?? []);
        setTotal(d.total ?? 0);
      }
    } finally {
      setLoading(false);
    }
  }, [filter, q]);

  useEffect(() => {
    const t = setTimeout(load, q ? 400 : 0); // debounce search
    return () => clearTimeout(t);
  }, [load, q]);

  const copyUrl = async (id: string, url: string | null) => {
    if (!url) return;
    try {
      await navigator.clipboard.writeText(url);
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 1500);
    } catch { /* no-op */ }
  };

  const counts = {
    all: assets.length,
    image: assets.filter((a) => a.type === "image").length,
    video: assets.filter((a) => a.type === "video").length,
    audio: assets.filter((a) => a.type === "audio").length,
  };

  return (
    <div className="min-h-screen" style={{ backgroundColor: "#FFFCF7" }}>
      <Header title="Asset Library" subtitle="Every AI asset you've generated, in one place" />

      <main className="max-w-6xl mx-auto px-6 py-6 space-y-5">
        {/* Filter + search */}
        <div
          className="rounded-xl p-4 flex items-center gap-3 flex-wrap"
          style={{ backgroundColor: "white", border: "1px solid rgba(0,0,0,0.06)" }}
        >
          <Layers className="w-5 h-5" style={{ color: "#F59E0B" }} />
          <div className="flex gap-1">
            {(["all", "image", "video", "audio"] as Filter[]).map((f) => {
              const cfg = f === "all" ? null : TYPE_CONFIG[f as Type];
              return (
                <button
                  key={f}
                  type="button"
                  onClick={() => setFilter(f)}
                  className="px-3 py-1.5 rounded-md text-xs font-bold capitalize"
                  style={{
                    backgroundColor: filter === f ? "#292524" : "rgba(0,0,0,0.04)",
                    color: filter === f ? "white" : cfg?.color ?? "#292524",
                  }}
                >
                  {f}
                </button>
              );
            })}
          </div>
          <div className="flex-1 min-w-[200px] relative">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2" style={{ color: "#A8967E" }} />
            <input
              type="text"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search prompts..."
              className="w-full rounded-md pl-9 pr-3 py-1.5 text-sm"
              style={{
                backgroundColor: "#FFF8F0",
                border: "1px solid rgba(245,215,160,0.4)",
                color: "#292524",
                outline: "none",
              }}
            />
          </div>
          <p className="text-xs" style={{ color: "#78614E" }}>
            {total} total · showing {assets.length}
          </p>
        </div>

        {/* Quick links to studios */}
        <div className="flex gap-2">
          <Link
            href="/studio/image"
            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-md text-xs font-bold"
            style={{ backgroundColor: "rgba(139,92,246,0.12)", color: "#8B5CF6" }}
          >
            <ImageIcon className="w-3 h-3" />
            New image →
          </Link>
          <Link
            href="/studio/video"
            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-md text-xs font-bold"
            style={{ backgroundColor: "rgba(236,72,153,0.12)", color: "#EC4899" }}
          >
            <Film className="w-3 h-3" />
            New video →
          </Link>
          <Link
            href="/studio/audio"
            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-md text-xs font-bold"
            style={{ backgroundColor: "rgba(16,185,129,0.12)", color: "#10B981" }}
          >
            <Music className="w-3 h-3" />
            New audio →
          </Link>
        </div>

        {/* Grid */}
        {loading && assets.length === 0 ? (
          <div className="py-12 text-center">
            <Loader2 className="w-5 h-5 animate-spin inline" style={{ color: "#A8967E" }} />
          </div>
        ) : assets.length === 0 ? (
          <div
            className="rounded-xl py-12 text-center"
            style={{
              backgroundColor: "white",
              border: "1px dashed rgba(0,0,0,0.1)",
            }}
          >
            <p className="text-sm" style={{ color: "#78614E" }}>
              {q ? "No assets match your search." : "No assets yet. Generate your first one in a studio above."}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
            {assets.map((a) => {
              const cfg = TYPE_CONFIG[a.type];
              const Icon = cfg.icon;
              return (
                <div
                  key={`${a.type}-${a.id}`}
                  className="rounded-xl overflow-hidden flex flex-col"
                  style={{ backgroundColor: "white", border: "1px solid rgba(0,0,0,0.06)" }}
                >
                  {/* Preview */}
                  <div className="aspect-square relative" style={{ backgroundColor: "rgba(0,0,0,0.03)" }}>
                    {a.type === "image" && a.url && (
                      <img
                        src={a.url}
                        alt={a.prompt}
                        className="w-full h-full object-cover"
                        loading="lazy"
                      />
                    )}
                    {a.type === "video" && a.url && (
                      <video
                        src={a.url}
                        muted
                        loop
                        playsInline
                        onMouseEnter={(e) => (e.currentTarget as HTMLVideoElement).play()}
                        onMouseLeave={(e) => {
                          const v = e.currentTarget as HTMLVideoElement;
                          v.pause();
                          v.currentTime = 0;
                        }}
                        className="w-full h-full object-cover"
                      />
                    )}
                    {a.type === "audio" && (
                      <div className="w-full h-full flex flex-col items-center justify-center p-3">
                        <Music className="w-8 h-8 mb-2" style={{ color: "#10B981" }} />
                        <audio
                          src={a.url ?? ""}
                          controls
                          className="w-full"
                          style={{ height: 32 }}
                        />
                      </div>
                    )}
                    {/* Type badge */}
                    <span
                      className="absolute top-2 left-2 text-[9px] font-bold uppercase px-1.5 py-0.5 rounded"
                      style={{
                        backgroundColor: `${cfg.color}DD`,
                        color: "white",
                      }}
                    >
                      <Icon className="w-2.5 h-2.5 inline mr-0.5" />
                      {a.type}
                    </span>
                  </div>

                  {/* Body */}
                  <div className="p-2 flex-1 flex flex-col gap-1">
                    <p
                      className="text-[11px] line-clamp-2"
                      style={{ color: "#292524", lineHeight: 1.3 }}
                      title={a.prompt}
                    >
                      {a.prompt}
                    </p>
                    <p className="text-[9px]" style={{ color: "#A8967E" }}>
                      {a.cost_usd ? `$${a.cost_usd.toFixed(4)}` : ""}
                      {a.aspect_ratio ? ` · ${a.aspect_ratio}` : ""}
                      {a.duration_sec ? ` · ${a.duration_sec}s` : ""}
                    </p>
                  </div>

                  {/* Actions */}
                  <div className="flex border-t" style={{ borderColor: "rgba(0,0,0,0.06)" }}>
                    <button
                      type="button"
                      onClick={() => copyUrl(a.id, a.url)}
                      className="flex-1 py-1.5 text-[10px] font-bold flex items-center justify-center gap-1 transition-all hover:bg-black/5"
                      style={{ color: copiedId === a.id ? "#10B981" : "#78614E" }}
                    >
                      {copiedId === a.id ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                      {copiedId === a.id ? "Copied" : "Copy URL"}
                    </button>
                    {a.url && (
                      <a
                        href={a.url}
                        download
                        className="flex-1 py-1.5 text-[10px] font-bold flex items-center justify-center gap-1 transition-all hover:bg-black/5"
                        style={{ color: "#78614E", borderLeft: "1px solid rgba(0,0,0,0.06)" }}
                      >
                        <Download className="w-3 h-3" />
                        Save
                      </a>
                    )}
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
