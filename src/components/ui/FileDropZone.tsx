"use client";

import { useCallback, useRef, useState } from "react";
import { Upload, X } from "lucide-react";

interface FileDropZoneProps {
  accept?: string; // "image/*" | "video/*" | "image/*,video/*"
  onFileUrl: (url: string) => void;
  currentUrl?: string;
  label?: string;
  folder?: string; // Supabase storage folder
}

export default function FileDropZone({
  accept = "image/*,video/*",
  onFileUrl,
  currentUrl,
  label = "Drop file here or click to upload",
  folder = "uploads",
}: FileDropZoneProps) {
  const [dragging, setDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [preview, setPreview] = useState<string | null>(currentUrl || null);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const uploadFile = useCallback(async (file: File) => {
    setError(null);
    setUploading(true);

    if (file.size > 50 * 1024 * 1024) {
      setError("File too large (max 50MB)");
      setUploading(false);
      return;
    }

    const formData = new FormData();
    formData.append("file", file);
    formData.append("folder", folder);

    try {
      const res = await fetch("/api/upload", { method: "POST", body: formData });
      const data = await res.json();
      if (!res.ok || !data.url) {
        setError(data.error || "Upload failed");
        setUploading(false);
        return;
      }
      setPreview(data.url);
      onFileUrl(data.url);
    } catch (err) {
      setError(`Upload error: ${String(err).slice(0, 60)}`);
    }
    setUploading(false);
  }, [folder, onFileUrl]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) uploadFile(file);
  }, [uploadFile]);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) uploadFile(file);
  }, [uploadFile]);

  const isVideo = preview?.match(/\.(mp4|mov|webm|avi)(\?|$)/i);

  return (
    <div className="mb-4">
      <div
        onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={handleDrop}
        onClick={() => inputRef.current?.click()}
        className="rounded-xl cursor-pointer transition-all"
        style={{
          border: dragging ? "2px dashed var(--color-primary)" : "2px dashed var(--color-border)",
          backgroundColor: dragging ? "rgba(245,158,11,0.05)" : "transparent",
          padding: preview ? 8 : 32,
          textAlign: "center",
        }}
      >
        {uploading ? (
          <div className="flex flex-col items-center gap-2 py-4">
            <div className="w-6 h-6 border-2 border-t-transparent rounded-full animate-spin" style={{ borderColor: "var(--color-primary)", borderTopColor: "transparent" }} />
            <span className="text-xs" style={{ color: "var(--color-text-muted)" }}>Uploading...</span>
          </div>
        ) : preview ? (
          <div className="relative">
            {isVideo ? (
              <video src={preview} className="w-full rounded-lg max-h-48 object-cover" controls />
            ) : (
              <img src={preview} alt="Preview" className="w-full rounded-lg max-h-48 object-cover" />
            )}
            <button
              onClick={(e) => { e.stopPropagation(); setPreview(null); onFileUrl(""); }}
              className="absolute top-2 right-2 w-6 h-6 rounded-full flex items-center justify-center"
              style={{ background: "rgba(0,0,0,0.6)", color: "white" }}
            >
              <X className="w-3 h-3" />
            </button>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-2">
            <Upload className="w-8 h-8" style={{ color: "var(--color-text-muted)" }} />
            <span className="text-sm" style={{ color: "var(--color-text-secondary)" }}>{label}</span>
            <span className="text-xs" style={{ color: "var(--color-text-muted)" }}>or paste URL below</span>
          </div>
        )}
      </div>

      {error && <p className="text-xs mt-1" style={{ color: "var(--color-danger, #EF4444)" }}>{error}</p>}

      <input
        ref={inputRef}
        type="file"
        accept={accept}
        onChange={handleFileSelect}
        className="hidden"
      />
    </div>
  );
}
