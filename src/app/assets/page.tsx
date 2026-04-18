"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import Header from "@/components/layout/Header";
import {
  Upload, Link2, Trash2, Download, ExternalLink, X, Plus,
  FolderOpen, Image, Film, FileText, Archive, BarChart3,
  Loader2, Search, Tag, Copy, Check, RefreshCw,
} from "lucide-react";
import { useSearchParams } from "next/navigation";

// ── Types ──────────────────────────────────────────────────────────────────────

type Category = "brand_kit" | "raw_footage" | "production" | "deliverables" | "reports";

interface Asset {
  id: string;
  name: string;
  category: Category;
  file_url: string | null;
  external_url: string | null;
  file_size: number;
  mime_type: string | null;
  client: string;
  tags: string[];
  notes: string;
  created_at: string;
}

// ── Config ─────────────────────────────────────────────────────────────────────

const CATEGORIES: { id: Category; label: string; icon: React.ElementType; color: string; bg: string; desc: string }[] = [
  { id: "brand_kit",    label: "Brand Kit",     icon: Image,    color: "#E4405F", bg: "rgba(228,64,95,0.1)",   desc: "Logos, fonts, guidelines, templates" },
  { id: "raw_footage",  label: "Raw Footage",   icon: Film,     color: "#6366F1", bg: "rgba(99,102,241,0.1)",  desc: "Raw video material, B-Roll" },
  { id: "production",   label: "Production",    icon: FileText, color: "var(--color-primary)", bg: "rgba(245,158,11,0.1)",  desc: "Scripts, voiceover, music, AI prompts" },
  { id: "deliverables", label: "Deliverables",  icon: Archive,  color: "#10B981", bg: "rgba(16,185,129,0.1)",  desc: "Final content delivered to client" },
  { id: "reports",      label: "Reports",       icon: BarChart3,color: "#8B5CF6", bg: "rgba(139,92,246,0.1)",  desc: "Analytics screenshots, report PDFs" },
];

const card = { backgroundColor: "var(--color-bg-secondary)", border: "1px solid rgba(245,215,160,0.25)", boxShadow: "0 1px 3px rgba(120,97,78,0.06)" };

function fmtSize(bytes: number) {
  if (!bytes) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}

function isImage(mime: string | null) { return mime?.startsWith("image/") ?? false; }
function isVideo(mime: string | null) { return mime?.startsWith("video/") ?? false; }

// ── Add Asset Modal ────────────────────────────────────────────────────────────

function AddAssetModal({
  defaultCategory,
  onClose,
  onAdded,
}: {
  defaultCategory: Category;
  onClose: () => void;
  onAdded: (asset: Asset) => void;
}) {
  const [mode, setMode] = useState<"upload" | "link">("upload");
  const [category, setCategory] = useState(defaultCategory);
  const [client, setClient] = useState("");
  const [notes, setNotes] = useState("");
  const [externalUrl, setExternalUrl] = useState("");
  const [externalName, setExternalName] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [onClose]);

  const handleUpload = async () => {
    if (!file) return;
    setLoading(true); setError("");
    const fd = new FormData();
    fd.append("file", file);
    fd.append("category", category);
    fd.append("client", client);
    fd.append("notes", notes);
    const res = await fetch("/api/assets/upload", { method: "POST", body: fd });
    const d = await res.json();
    if (!res.ok) { setError(d.error || "Upload failed"); setLoading(false); return; }
    onAdded(d.asset);
    onClose();
  };

  const handleLink = async () => {
    if (!externalUrl.trim()) return;
    setLoading(true); setError("");
    const res = await fetch("/api/assets", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: externalName.trim() || externalUrl.split("/").pop() || "Link",
        category, client, notes,
        external_url: externalUrl.trim(),
      }),
    });
    const d = await res.json();
    if (!res.ok) { setError(d.error || "Save failed"); setLoading(false); return; }
    onAdded(d.asset);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center p-0 md:p-4"
      style={{ backgroundColor: "rgba(0,0,0,0.6)" }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="w-full md:max-w-lg rounded-t-2xl md:rounded-2xl overflow-hidden"
        style={{ backgroundColor: "var(--color-bg-secondary)", maxHeight: "92dvh" }}>

        {/* Header */}
        <div className="flex items-center gap-3 px-4 py-3 shrink-0"
          style={{ borderBottom: "1px solid rgba(245,215,160,0.3)", backgroundColor: "var(--color-bg)" }}>
          <Plus className="w-4 h-4" style={{ color: "var(--color-primary)" }} />
          <p className="font-bold text-sm flex-1" style={{ color: "var(--color-text)" }}>Add Asset</p>
          <button type="button" onClick={onClose} className="p-1" style={{ color: "#78614E" }}>
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="overflow-y-auto p-4 space-y-4" style={{ maxHeight: "calc(92dvh - 56px)" }}>
          {/* Mode toggle */}
          <div className="flex rounded-xl overflow-hidden" style={{ border: "1px solid rgba(245,215,160,0.3)" }}>
            {(["upload", "link"] as const).map(m => (
              <button key={m} type="button" onClick={() => setMode(m)}
                className="flex-1 flex items-center justify-center gap-2 py-2.5 text-sm font-semibold transition-all"
                style={mode === m
                  ? { backgroundColor: "var(--color-primary)", color: "#1C1814" }
                  : { backgroundColor: "transparent", color: "#78614E" }}>
                {m === "upload" ? <Upload className="w-3.5 h-3.5" /> : <Link2 className="w-3.5 h-3.5" />}
                {m === "upload" ? "Upload file" : "External link"}
              </button>
            ))}
          </div>

          {/* Category */}
          <div>
            <label className="block text-xs font-medium mb-1.5" style={{ color: "#78614E" }}>Category</label>
            <div className="grid grid-cols-2 gap-2">
              {CATEGORIES.map(cat => {
                const Icon = cat.icon;
                return (
                  <button key={cat.id} type="button" onClick={() => setCategory(cat.id)}
                    className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium transition-all text-left"
                    style={category === cat.id
                      ? { backgroundColor: cat.bg, color: cat.color, border: `1px solid ${cat.color}40` }
                      : { backgroundColor: "rgba(245,215,160,0.1)", color: "#78614E", border: "1px solid rgba(245,215,160,0.2)" }}>
                    <Icon className="w-3.5 h-3.5 shrink-0" />
                    {cat.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Upload zone with drag & drop */}
          {mode === "upload" && (
            <div
              onDragOver={e => { e.preventDefault(); e.currentTarget.style.borderColor = "var(--color-primary)"; e.currentTarget.style.backgroundColor = "rgba(245,158,11,0.05)"; }}
              onDragLeave={e => { e.currentTarget.style.borderColor = "rgba(245,215,160,0.4)"; e.currentTarget.style.backgroundColor = "transparent"; }}
              onDrop={e => { e.preventDefault(); e.currentTarget.style.borderColor = "rgba(245,215,160,0.4)"; e.currentTarget.style.backgroundColor = "transparent"; const f = e.dataTransfer.files[0]; if (f) setFile(f); }}
            >
              <input ref={fileRef} type="file" className="hidden"
                accept="image/*,video/*,application/pdf,text/*,application/zip"
                onChange={e => setFile(e.target.files?.[0] ?? null)} />
              <button type="button" onClick={() => fileRef.current?.click()}
                className="w-full rounded-xl p-6 flex flex-col items-center gap-2 transition-all"
                style={{ border: `2px dashed ${file ? "var(--color-primary)" : "rgba(245,215,160,0.4)"}`, backgroundColor: file ? "rgba(245,158,11,0.05)" : "transparent" }}>
                {file ? (
                  <>
                    <Upload className="w-6 h-6" style={{ color: "var(--color-primary)" }} />
                    <p className="text-sm font-semibold" style={{ color: "var(--color-text)" }}>{file.name}</p>
                    <p className="text-xs" style={{ color: "#A8967E" }}>{fmtSize(file.size)}</p>
                  </>
                ) : (
                  <>
                    <Upload className="w-6 h-6" style={{ color: "#C4AA8A" }} />
                    <p className="text-sm" style={{ color: "#78614E" }}>Drop file here or tap to select</p>
                    <p className="text-xs" style={{ color: "#A8967E" }}>Max 50 MB — image, video, PDF, ZIP</p>
                  </>
                )}
              </button>
            </div>
          )}

          {/* Link zone */}
          {mode === "link" && (
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium mb-1" style={{ color: "#78614E" }}>URL (Drive, Dropbox, etc.)</label>
                <input value={externalUrl} onChange={e => setExternalUrl(e.target.value)}
                  placeholder="https://drive.google.com/..."
                  className="w-full rounded-lg px-3 py-2.5 text-sm outline-none"
                  style={{ border: "1px solid rgba(245,215,160,0.3)", backgroundColor: "white", color: "var(--color-text)" }} />
              </div>
              <div>
                <label className="block text-xs font-medium mb-1" style={{ color: "#78614E" }}>Name (optional)</label>
                <input value={externalName} onChange={e => setExternalName(e.target.value)}
                  placeholder="e.g. Logo Nike final v3"
                  className="w-full rounded-lg px-3 py-2.5 text-sm outline-none"
                  style={{ border: "1px solid rgba(245,215,160,0.3)", backgroundColor: "white", color: "var(--color-text)" }} />
              </div>
            </div>
          )}

          {/* Client + Notes */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium mb-1" style={{ color: "#78614E" }}>Client</label>
              <input value={client} onChange={e => setClient(e.target.value)}
                placeholder="e.g. Nike"
                className="w-full rounded-lg px-3 py-2.5 text-sm outline-none"
                style={{ border: "1px solid rgba(245,215,160,0.3)", backgroundColor: "white", color: "var(--color-text)" }} />
            </div>
            <div>
              <label className="block text-xs font-medium mb-1" style={{ color: "#78614E" }}>Notes</label>
              <input value={notes} onChange={e => setNotes(e.target.value)}
                placeholder="e.g. Final version"
                className="w-full rounded-lg px-3 py-2.5 text-sm outline-none"
                style={{ border: "1px solid rgba(245,215,160,0.3)", backgroundColor: "white", color: "var(--color-text)" }} />
            </div>
          </div>

          {error && <p className="text-xs text-red-500 px-1">{error}</p>}

          <button type="button"
            onClick={mode === "upload" ? handleUpload : handleLink}
            disabled={loading || (mode === "upload" ? !file : !externalUrl.trim())}
            className="w-full py-3 rounded-xl text-sm font-bold transition-all disabled:opacity-40 flex items-center justify-center gap-2"
            style={{ background: "linear-gradient(135deg, var(--color-primary), var(--color-primary-hover))", color: "#1C1814" }}>
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : (mode === "upload" ? <Upload className="w-4 h-4" /> : <Link2 className="w-4 h-4" />)}
            {loading ? "Saving..." : "Save"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Asset Card ─────────────────────────────────────────────────────────────────

function AssetCard({ asset, onDelete }: { asset: Asset; onDelete: (id: string) => void }) {
  const [copied, setCopied] = useState(false);
  const url = asset.file_url ?? asset.external_url ?? null;
  const cat = CATEGORIES.find(c => c.id === asset.category)!;
  const Icon = cat.icon;

  const copy = () => {
    if (!url) return;
    navigator.clipboard.writeText(url).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDelete = async () => {
    if (!confirm(`Delete "${asset.name}"?`)) return;
    await fetch("/api/assets", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: asset.id }),
    });
    onDelete(asset.id);
  };

  return (
    <div className="rounded-xl p-3 flex flex-col gap-2" style={card}>
      {/* Preview / icon */}
      <div className="w-full rounded-lg overflow-hidden flex items-center justify-center"
        style={{ height: 80, backgroundColor: cat.bg }}>
        {url && isImage(asset.mime_type) ? (
          <img src={url} alt={asset.name} className="w-full h-full object-cover" />
        ) : (
          <Icon className="w-7 h-7" style={{ color: cat.color }} />
        )}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <p className="text-xs font-semibold truncate" style={{ color: "var(--color-text)" }}>{asset.name}</p>
        {asset.client && (
          <p className="text-[10px] mt-0.5 truncate" style={{ color: "#A8967E" }}>{asset.client}</p>
        )}
        <div className="flex items-center gap-2 mt-1 flex-wrap">
          {asset.file_size > 0 && (
            <span className="text-[10px]" style={{ color: "#C4AA8A" }}>{fmtSize(asset.file_size)}</span>
          )}
          <span className="text-[10px]" style={{ color: "#C4AA8A" }}>{fmtDate(asset.created_at)}</span>
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-1">
        {url && (
          <>
            <button type="button" onClick={copy} title="Copy link"
              className="flex-1 flex items-center justify-center gap-1 py-1.5 rounded-lg text-[10px] font-medium transition-all"
              style={{ backgroundColor: copied ? "rgba(16,185,129,0.1)" : "rgba(245,158,11,0.1)", color: copied ? "#10B981" : "var(--color-primary-hover)" }}>
              {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
              {copied ? "Copied" : "Link"}
            </button>
            <a href={url} target="_blank" rel="noopener noreferrer"
              className="p-1.5 rounded-lg" style={{ backgroundColor: "rgba(99,102,241,0.08)", color: "#6366F1" }}>
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          </>
        )}
        <button type="button" onClick={handleDelete}
          className="p-1.5 rounded-lg" style={{ backgroundColor: "rgba(239,68,68,0.08)", color: "#EF4444" }}>
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}

// ── Main page ──────────────────────────────────────────────────────────────────

function DriveSync() {
  const [folderId, setFolderId] = useState("");
  const [files, setFiles] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [importing, setImporting] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [category, setCategory] = useState<Category>("production");
  const [status, setStatus] = useState<string | null>(null);

  const listFiles = async () => {
    if (!folderId.trim()) return;
    setLoading(true); setStatus(null);
    const res = await fetch(`/api/assets/drive?folder_id=${encodeURIComponent(folderId.trim())}`);
    const d = await res.json();
    if (d.needs_auth) { window.location.href = "/api/auth/gdrive/connect"; return; }
    if (d.error) { setStatus(d.error); setLoading(false); return; }
    setFiles(d.files ?? []);
    setLoading(false);
  };

  const importSelected = async () => {
    const toImport = files.filter(f => selected.has(f.id));
    if (!toImport.length) return;
    setImporting(true);
    const res = await fetch("/api/assets/drive", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ files: toImport, category }),
    });
    const d = await res.json();
    setStatus(`✅ ${d.imported} files imported into ${category}`);
    setSelected(new Set()); setImporting(false);
  };

  return (
    <div className="rounded-2xl p-4 space-y-3" style={{ ...card, border: "1px solid rgba(99,102,241,0.2)" }}>
      <div className="flex items-center gap-2">
        <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ backgroundColor: "rgba(99,102,241,0.1)" }}>
          <RefreshCw className="w-4 h-4" style={{ color: "#6366F1" }} />
        </div>
        <p className="font-bold text-sm" style={{ color: "var(--color-text)" }}>Google Drive Sync</p>
      </div>
      <p className="text-xs" style={{ color: "#A8967E" }}>Paste the Drive folder ID (from the URL: drive.google.com/drive/folders/<strong>FOLDER_ID</strong>)</p>
      <div className="flex gap-2">
        <input value={folderId} onChange={e => setFolderId(e.target.value)}
          placeholder="1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgVE2upms"
          className="flex-1 rounded-lg px-3 py-2 text-xs outline-none"
          style={{ border: "1px solid rgba(245,215,160,0.3)", backgroundColor: "white", color: "var(--color-text)" }} />
        <button type="button" onClick={listFiles} disabled={loading || !folderId.trim()}
          className="px-3 py-2 rounded-lg text-xs font-bold disabled:opacity-40"
          style={{ backgroundColor: "#6366F1", color: "white" }}>
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "List"}
        </button>
      </div>
      {status && <p className="text-xs" style={{ color: status.startsWith("✅") ? "#10B981" : "#EF4444" }}>{status}</p>}
      {files.length > 0 && (
        <>
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold" style={{ color: "#78614E" }}>{files.length} files found</p>
            <div className="flex items-center gap-2">
              <select value={category} onChange={e => setCategory(e.target.value as Category)}
                className="text-xs rounded-lg px-2 py-1 outline-none"
                style={{ border: "1px solid rgba(245,215,160,0.3)", color: "var(--color-text)" }}>
                {CATEGORIES.map(c => <option key={c.id} value={c.id}>{c.label}</option>)}
              </select>
              <button type="button" onClick={importSelected} disabled={importing || selected.size === 0}
                className="px-3 py-1.5 rounded-lg text-xs font-bold disabled:opacity-40"
                style={{ backgroundColor: "#10B981", color: "white" }}>
                {importing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : `Import (${selected.size})`}
              </button>
            </div>
          </div>
          <div className="max-h-48 overflow-y-auto space-y-1">
            {files.map((f: any) => (
              <label key={f.id} className="flex items-center gap-2 px-2 py-1.5 rounded-lg cursor-pointer hover:bg-amber-50/50">
                <input type="checkbox" checked={selected.has(f.id)}
                  onChange={e => setSelected(prev => { const n = new Set(prev); e.target.checked ? n.add(f.id) : n.delete(f.id); return n; })} />
                <span className="text-xs flex-1 truncate" style={{ color: "var(--color-text)" }}>{f.name}</span>
                <span className="text-[10px] shrink-0" style={{ color: "#A8967E" }}>{f.size ? `${(f.size/1024).toFixed(0)} KB` : ""}</span>
              </label>
            ))}
          </div>
          <button type="button" onClick={() => setSelected(new Set(files.map((f: any) => f.id)))}
            className="text-xs" style={{ color: "#6366F1" }}>
            Select all
          </button>
        </>
      )}
    </div>
  );
}

export default function AssetsPage() {
  const searchParams = useSearchParams();
  const [assets, setAssets] = useState<Asset[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState<Category | "all">("all");
  const [search, setSearch] = useState("");
  const [showAdd, setShowAdd] = useState(false);
  const [showDrive, setShowDrive] = useState(false);
  const [driveConnected, setDriveConnected] = useState<boolean | null>(null);

  const load = useCallback(() => {
    setLoading(true);
    fetch("/api/assets")
      .then(r => r.json())
      .then(d => { if (d.assets) setAssets(d.assets); })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    if (searchParams.get("gdrive") === "connected") setDriveConnected(true);
  }, [searchParams]);

  const filtered = assets.filter(a => {
    if (activeCategory !== "all" && a.category !== activeCategory) return false;
    if (search && !a.name.toLowerCase().includes(search.toLowerCase()) &&
        !a.client.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const countFor = (cat: Category) => assets.filter(a => a.category === cat).length;

  return (
    <div className="min-h-screen" style={{ backgroundColor: "#FAFAF8" }}>
      <Header title="Assets & Storage" subtitle="Files, links and materials organized by category" />

      <div className="p-4 max-w-5xl mx-auto space-y-4">

        {/* Category tabs — scrollabile pe mobile */}
        <div className="flex gap-2 overflow-x-auto pb-1 -mx-4 px-4" style={{ scrollbarWidth: "none" }}>
          <button type="button" onClick={() => setActiveCategory("all")}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold shrink-0 transition-all"
            style={activeCategory === "all"
              ? { backgroundColor: "var(--color-text)", color: "var(--color-bg)" }
              : { ...card, color: "#78614E" }}>
            <FolderOpen className="w-3.5 h-3.5" />
            All
            <span className="px-1.5 py-0.5 rounded-full text-[10px]"
              style={{ backgroundColor: "rgba(255,255,255,0.2)" }}>{assets.length}</span>
          </button>
          {CATEGORIES.map(cat => {
            const Icon = cat.icon;
            const count = countFor(cat.id);
            return (
              <button key={cat.id} type="button" onClick={() => setActiveCategory(cat.id)}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold shrink-0 transition-all"
                style={activeCategory === cat.id
                  ? { backgroundColor: cat.color, color: "white" }
                  : { ...card, color: "#78614E" }}>
                <Icon className="w-3.5 h-3.5" />
                {cat.label}
                {count > 0 && (
                  <span className="px-1.5 py-0.5 rounded-full text-[10px]"
                    style={{ backgroundColor: activeCategory === cat.id ? "rgba(255,255,255,0.25)" : cat.bg, color: activeCategory === cat.id ? "white" : cat.color }}>
                    {count}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Drive connected banner */}
        {driveConnected && (
          <div className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-medium"
            style={{ backgroundColor: "rgba(16,185,129,0.1)", color: "#10B981", border: "1px solid rgba(16,185,129,0.2)" }}>
            <Check className="w-4 h-4" /> Google Drive connected successfully!
            <button type="button" onClick={() => setDriveConnected(null)} className="ml-auto"><X className="w-3.5 h-3.5" /></button>
          </div>
        )}

        {/* Drive sync panel */}
        {showDrive && <DriveSync />}

        {/* Search + Add */}
        <div className="flex gap-2">
          <div className="flex-1 flex items-center gap-2 rounded-xl px-3"
            style={{ ...card, border: "1px solid rgba(245,215,160,0.3)" }}>
            <Search className="w-4 h-4 shrink-0" style={{ color: "#C4AA8A" }} />
            <input value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Search by name or client..."
              className="flex-1 py-2.5 text-sm bg-transparent outline-none"
              style={{ color: "var(--color-text)" }} />
            {search && (
              <button type="button" onClick={() => setSearch("")} style={{ color: "#C4AA8A" }}>
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
          <button type="button" onClick={() => setShowDrive(v => !v)}
            className="flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm font-bold shrink-0"
            style={{ backgroundColor: showDrive ? "rgba(99,102,241,0.15)" : "rgba(99,102,241,0.08)", color: "#6366F1", border: "1px solid rgba(99,102,241,0.2)" }}>
            <RefreshCw className="w-4 h-4" />
            <span className="hidden sm:inline">Drive</span>
          </button>
          <button type="button" onClick={() => setShowAdd(true)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold shrink-0"
            style={{ background: "linear-gradient(135deg, var(--color-primary), var(--color-primary-hover))", color: "#1C1814" }}>
            <Plus className="w-4 h-4" />
            <span className="hidden sm:inline">Add Asset</span>
          </button>
        </div>

        {/* Category description */}
        {activeCategory !== "all" && (
          <p className="text-xs px-1" style={{ color: "#A8967E" }}>
            {CATEGORIES.find(c => c.id === activeCategory)?.desc}
          </p>
        )}

        {/* Grid */}
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="w-6 h-6 animate-spin" style={{ color: "var(--color-primary)" }} />
          </div>
        ) : filtered.length === 0 ? (
          <div className="rounded-2xl p-12 flex flex-col items-center gap-3 text-center" style={card}>
            <FolderOpen className="w-8 h-8" style={{ color: "#C4AA8A" }} />
            <p className="text-sm font-medium" style={{ color: "#78614E" }}>
              {assets.length === 0 ? "No assets added yet" : "No results for selected filters"}
            </p>
            {assets.length === 0 && (
              <button type="button" onClick={() => setShowAdd(true)}
                className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold mt-1"
                style={{ background: "linear-gradient(135deg, var(--color-primary), var(--color-primary-hover))", color: "#1C1814" }}>
                <Plus className="w-4 h-4" />
                Add your first asset
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
            {filtered.map(asset => (
              <AssetCard key={asset.id} asset={asset}
                onDelete={id => setAssets(prev => prev.filter(a => a.id !== id))} />
            ))}
          </div>
        )}
      </div>

      {/* Add modal */}
      {showAdd && (
        <AddAssetModal
          defaultCategory={activeCategory === "all" ? "production" : activeCategory}
          onClose={() => setShowAdd(false)}
          onAdded={asset => setAssets(prev => [asset, ...prev])}
        />
      )}
    </div>
  );
}
