"use client";

/**
 * Asset Picker — modal that lists user's AI-generated images for reuse
 * in the Calendar post form. Click an image → its URL is set as the
 * post's image_url.
 *
 * Companion to AiImageQuickGen ("generate new") — this one is "use one
 * I already made". Most users will mix both.
 */

import { useEffect, useState } from "react";
import { Layers, Loader2, Search, X, Check } from "lucide-react";

interface Asset {
  id: string;
  type: string;
  url: string | null;
  prompt: string;
  aspect_ratio: string | null;
  created_at: string;
}

interface Props {
  /** Called with the chosen image URL */
  onSelect: (url: string) => void;
}

export default function AssetPicker({ onSelect }: Props) {
  const [open, setOpen] = useState(false);
  const [assets, setAssets] = useState<Asset[]>([]);
  const [loading, setLoading] = useState(false);
  const [q, setQ] = useState("");
  const [pickedId, setPickedId] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setLoading(true);
    const params = new URLSearchParams({ type: "image", limit: "60" });
    if (q.trim()) params.set("q", q.trim());
    const t = setTimeout(() => {
      fetch(`/api/studio/assets?${params}`, { cache: "no-store" })
        .then((r) => r.json())
        .then((d) => {
          if (cancelled) return;
          setAssets(d.assets ?? []);
        })
        .finally(() => !cancelled && setLoading(false));
    }, q ? 300 : 0);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [open, q]);

  const pick = (a: Asset) => {
    if (!a.url) return;
    setPickedId(a.id);
    onSelect(a.url);
    setTimeout(() => {
      setOpen(false);
      setPickedId(null);
    }, 600);
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-1 text-xs font-bold px-2.5 py-1 rounded-md"
        style={{
          backgroundColor: "rgba(99,102,241,0.12)",
          color: "#6366F1",
        }}
        title="Pick from existing AI assets"
      >
        <Layers className="w-3 h-3" />
        Library
      </button>

      {open && (
        <div
          className="fixed inset-0 z-[90] flex items-center justify-center p-4"
          style={{ backgroundColor: "rgba(0,0,0,0.55)" }}
          onClick={(e) => {
            if (e.target === e.currentTarget) setOpen(false);
          }}
        >
          <div
            className="w-full max-w-3xl rounded-2xl overflow-hidden flex flex-col"
            style={{ backgroundColor: "#FFFCF7", maxHeight: "85dvh" }}
          >
            <div
              className="flex items-center gap-3 px-5 py-3 border-b"
              style={{
                borderColor: "rgba(99,102,241,0.2)",
                background: "linear-gradient(135deg, rgba(99,102,241,0.06), rgba(245,158,11,0.04))",
              }}
            >
              <Layers className="w-5 h-5" style={{ color: "#6366F1" }} />
              <p className="flex-1 text-sm font-bold" style={{ color: "#292524" }}>
                Pick from your library
              </p>
              <button type="button" onClick={() => setOpen(false)} style={{ color: "#78614E" }}>
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="px-5 py-3 border-b" style={{ borderColor: "rgba(0,0,0,0.06)" }}>
              <div className="relative">
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
            </div>

            <div className="p-5 overflow-y-auto flex-1">
              {loading && (
                <div className="py-8 text-center">
                  <Loader2 className="w-5 h-5 animate-spin inline" style={{ color: "#A8967E" }} />
                </div>
              )}
              {!loading && assets.length === 0 && (
                <p className="text-center py-8 text-sm" style={{ color: "#A8967E" }}>
                  No images in your library yet. Generate some in /studio/image first.
                </p>
              )}
              {!loading && assets.length > 0 && (
                <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2">
                  {assets.map((a) => (
                    <button
                      key={a.id}
                      type="button"
                      onClick={() => pick(a)}
                      className="rounded-lg overflow-hidden relative transition-all hover:scale-105"
                      style={{
                        border: pickedId === a.id ? "2px solid #10B981" : "1px solid rgba(0,0,0,0.06)",
                        aspectRatio: "1 / 1",
                      }}
                      title={a.prompt}
                    >
                      {a.url ? (
                        <img
                          src={a.url}
                          alt={a.prompt}
                          loading="lazy"
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full bg-black/5" />
                      )}
                      {pickedId === a.id && (
                        <div
                          className="absolute inset-0 flex items-center justify-center"
                          style={{ backgroundColor: "rgba(16,185,129,0.6)" }}
                        >
                          <Check className="w-8 h-8 text-white" />
                        </div>
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
