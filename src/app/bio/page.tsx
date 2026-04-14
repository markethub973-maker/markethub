"use client";

import { useState, useEffect } from "react";
import Header from "@/components/layout/Header";
import {
  Plus, Trash2, Eye, Save, Loader2, GripVertical, Check, Copy,
  ExternalLink, Zap, Link2,
} from "lucide-react";

const cardStyle = { backgroundColor: "var(--color-bg-secondary)", border: "1px solid rgba(245,215,160,0.25)", boxShadow: "0 1px 3px rgba(120,97,78,0.08)" };

interface BioItem {
  id: string;
  title: string;
  url: string;
  emoji: string;
  enabled: boolean;
  clicks: number;
}

interface Bio {
  slug: string;
  title: string;
  description: string;
  avatar_url: string;
  bg_color: string;
  accent_color: string;
  links: BioItem[];
  views: number;
}

const EMPTY_BIO: Bio = {
  slug: "",
  title: "",
  description: "",
  avatar_url: "",
  bg_color: "var(--color-bg)",
  accent_color: "var(--color-primary)",
  links: [],
  views: 0,
};

const BG_PRESETS = ["var(--color-bg)", "#F0F4FF", "#F0FFF4", "#FFF0F8", "#1C1814", "#0F172A"];
const ACCENT_PRESETS = ["var(--color-primary)", "#3B82F6", "#22C55E", "#E1306C", "#8B5CF6", "#FF0050"];

function newLink(): BioItem {
  return { id: crypto.randomUUID(), title: "", url: "", emoji: "🔗", enabled: true, clicks: 0 };
}

export default function BioPage() {
  const [bio, setBio] = useState<Bio>(EMPTY_BIO);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    fetch("/api/bio-link")
      .then(r => r.json())
      .then(d => { if (d.bio) setBio({ ...EMPTY_BIO, ...d.bio }); })
      .finally(() => setLoading(false));
  }, []);

  const handleSave = async () => {
    setError("");
    if (!bio.slug.trim()) { setError("URL slug is required"); return; }
    if (!bio.title.trim()) { setError("Name / title is required"); return; }
    setSaving(true);
    const res = await fetch("/api/bio-link", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(bio),
    });
    const data = await res.json();
    if (!res.ok) { setError(data.error || "Save failed"); setSaving(false); return; }
    setBio({ ...EMPTY_BIO, ...data.bio });
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
    setSaving(false);
  };

  const publicUrl = bio.slug ? `${typeof window !== "undefined" ? window.location.origin : ""}/l/${bio.slug}` : "";

  const copyUrl = () => {
    if (publicUrl) { navigator.clipboard.writeText(publicUrl); setCopied(true); setTimeout(() => setCopied(false), 2000); }
  };

  const addLink = () => setBio(b => ({ ...b, links: [...b.links, newLink()] }));

  const updateLink = (id: string, field: keyof BioItem, val: string | boolean) =>
    setBio(b => ({ ...b, links: b.links.map(l => l.id === id ? { ...l, [field]: val } : l) }));

  const removeLink = (id: string) => setBio(b => ({ ...b, links: b.links.filter(l => l.id !== id) }));

  const moveLink = (id: string, dir: -1 | 1) => {
    const idx = bio.links.findIndex(l => l.id === id);
    if (idx === -1) return;
    const next = idx + dir;
    if (next < 0 || next >= bio.links.length) return;
    const arr = [...bio.links];
    [arr[idx], arr[next]] = [arr[next], arr[idx]];
    setBio(b => ({ ...b, links: arr }));
  };

  if (loading) return (
    <div>
      <Header title="Link in Bio" subtitle="Manage your public bio page" />
      <div className="flex justify-center py-20"><Loader2 className="w-6 h-6 animate-spin" style={{ color: "var(--color-primary)" }} /></div>
    </div>
  );

  const darkBg = bio.bg_color === "#1C1814" || bio.bg_color === "#0F172A";

  return (
    <div>
      <Header title="Link in Bio" subtitle="One link for all your content — share it everywhere" />
      <div className="p-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

          {/* ── Editor ── */}
          <div className="space-y-4">

            {/* Slug + Live URL */}
            <div className="rounded-xl p-5 space-y-4" style={cardStyle}>
              <h3 className="text-sm font-bold" style={{ color: "var(--color-text)" }}>Your public URL</h3>
              <div className="flex items-center gap-2">
                <span className="text-sm" style={{ color: "#A8967E" }}>markethubpromo.com/l/</span>
                <input
                  value={bio.slug}
                  onChange={e => setBio(b => ({ ...b, slug: e.target.value.toLowerCase().replace(/[^a-z0-9_-]/g, "") }))}
                  placeholder="your-name"
                  className="flex-1 px-3 py-2 text-sm rounded-lg focus:outline-none font-mono"
                  style={{ border: "1px solid rgba(245,215,160,0.4)", backgroundColor: "var(--color-bg)", color: "var(--color-text)" }} />
              </div>
              {publicUrl && (
                <div className="flex items-center gap-2">
                  <span className="text-xs flex-1 truncate" style={{ color: "#78614E" }}>{publicUrl}</span>
                  <button onClick={copyUrl} className="p-1.5 rounded-lg flex items-center gap-1 text-xs font-semibold"
                    style={{ backgroundColor: copied ? "rgba(22,163,74,0.1)" : "rgba(245,158,11,0.1)", color: copied ? "#16a34a" : "var(--color-primary-hover)" }}>
                    {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                    {copied ? "Copied!" : "Copy"}
                  </button>
                  <a href={publicUrl} target="_blank" rel="noopener noreferrer"
                    className="p-1.5 rounded-lg" style={{ color: "#A8967E" }}>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                </div>
              )}
              {bio.views > 0 && (
                <p className="text-xs" style={{ color: "#A8967E" }}>{bio.views.toLocaleString()} total views</p>
              )}
            </div>

            {/* Profile */}
            <div className="rounded-xl p-5 space-y-3" style={cardStyle}>
              <h3 className="text-sm font-bold" style={{ color: "var(--color-text)" }}>Profile</h3>
              <div>
                <label className="text-xs font-semibold block mb-1" style={{ color: "#78614E" }}>Name / Title *</label>
                <input value={bio.title} onChange={e => setBio(b => ({ ...b, title: e.target.value }))}
                  placeholder="Your Name or Brand" className="w-full px-3 py-2 text-sm rounded-lg focus:outline-none"
                  style={{ border: "1px solid rgba(245,215,160,0.4)", backgroundColor: "var(--color-bg)", color: "var(--color-text)" }} />
              </div>
              <div>
                <label className="text-xs font-semibold block mb-1" style={{ color: "#78614E" }}>Bio description</label>
                <textarea value={bio.description} onChange={e => setBio(b => ({ ...b, description: e.target.value }))}
                  placeholder="Short description visible to visitors" rows={2}
                  className="w-full px-3 py-2 text-sm rounded-lg focus:outline-none resize-none"
                  style={{ border: "1px solid rgba(245,215,160,0.4)", backgroundColor: "var(--color-bg)", color: "var(--color-text)" }} />
              </div>
              <div>
                <label className="text-xs font-semibold block mb-1" style={{ color: "#78614E" }}>Avatar URL</label>
                <input value={bio.avatar_url} onChange={e => setBio(b => ({ ...b, avatar_url: e.target.value }))}
                  placeholder="https://example.com/photo.jpg" className="w-full px-3 py-2 text-sm rounded-lg focus:outline-none"
                  style={{ border: "1px solid rgba(245,215,160,0.4)", backgroundColor: "var(--color-bg)", color: "var(--color-text)" }} />
              </div>
            </div>

            {/* Theme */}
            <div className="rounded-xl p-5 space-y-3" style={cardStyle}>
              <h3 className="text-sm font-bold" style={{ color: "var(--color-text)" }}>Theme</h3>
              <div>
                <label className="text-xs font-semibold block mb-2" style={{ color: "#78614E" }}>Background</label>
                <div className="flex gap-2 flex-wrap">
                  {BG_PRESETS.map(c => (
                    <button key={c} onClick={() => setBio(b => ({ ...b, bg_color: c }))}
                      className="w-8 h-8 rounded-full border-2 transition-transform hover:scale-110"
                      style={{ backgroundColor: c, borderColor: bio.bg_color === c ? "var(--color-primary)" : "rgba(245,215,160,0.3)" }} />
                  ))}
                </div>
              </div>
              <div>
                <label className="text-xs font-semibold block mb-2" style={{ color: "#78614E" }}>Accent color</label>
                <div className="flex gap-2 flex-wrap">
                  {ACCENT_PRESETS.map(c => (
                    <button key={c} onClick={() => setBio(b => ({ ...b, accent_color: c }))}
                      className="w-8 h-8 rounded-full border-2 transition-transform hover:scale-110"
                      style={{ backgroundColor: c, borderColor: bio.accent_color === c ? "var(--color-text)" : "transparent" }} />
                  ))}
                </div>
              </div>
            </div>

            {/* Links */}
            <div className="rounded-xl p-5 space-y-3" style={cardStyle}>
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold" style={{ color: "var(--color-text)" }}>Links</h3>
                <button onClick={addLink}
                  className="flex items-center gap-1 text-xs font-bold px-3 py-1.5 rounded-lg"
                  style={{ backgroundColor: "var(--color-primary)", color: "white" }}>
                  <Plus className="w-3.5 h-3.5" />Add link
                </button>
              </div>
              {bio.links.length === 0 && (
                <div className="text-center py-6">
                  <Link2 className="w-8 h-8 mx-auto mb-2" style={{ color: "#C4AA8A" }} />
                  <p className="text-xs" style={{ color: "#A8967E" }}>No links yet. Add your first link above.</p>
                </div>
              )}
              <div className="space-y-2">
                {bio.links.map((item, idx) => (
                  <div key={item.id} className="rounded-xl p-3 space-y-2"
                    style={{ backgroundColor: item.enabled ? "var(--color-bg)" : "rgba(245,215,160,0.05)", border: "1px solid rgba(245,215,160,0.3)" }}>
                    <div className="flex items-center gap-2">
                      <div className="flex flex-col gap-0.5">
                        <button onClick={() => moveLink(item.id, -1)} disabled={idx === 0}
                          className="p-0.5 rounded disabled:opacity-20" style={{ color: "#C4AA8A" }}>
                          <GripVertical className="w-3.5 h-3.5 rotate-90" />
                        </button>
                        <button onClick={() => moveLink(item.id, 1)} disabled={idx === bio.links.length - 1}
                          className="p-0.5 rounded disabled:opacity-20" style={{ color: "#C4AA8A" }}>
                          <GripVertical className="w-3.5 h-3.5 -rotate-90" />
                        </button>
                      </div>
                      <input value={item.emoji} onChange={e => updateLink(item.id, "emoji", e.target.value)}
                        className="w-10 text-center px-1 py-1 text-lg rounded-lg focus:outline-none"
                        style={{ border: "1px solid rgba(245,215,160,0.3)", backgroundColor: "var(--color-bg-secondary)" }} maxLength={2} />
                      <input value={item.title} onChange={e => updateLink(item.id, "title", e.target.value)}
                        placeholder="Link title" className="flex-1 px-2 py-1.5 text-sm rounded-lg focus:outline-none"
                        style={{ border: "1px solid rgba(245,215,160,0.3)", backgroundColor: "var(--color-bg-secondary)", color: "var(--color-text)" }} />
                      <button onClick={() => updateLink(item.id, "enabled", !item.enabled)}
                        className="w-8 h-5 rounded-full transition-colors flex-shrink-0 relative"
                        style={{ backgroundColor: item.enabled ? bio.accent_color : "rgba(245,215,160,0.3)" }}>
                        <span className="absolute top-0.5 w-4 h-4 rounded-full bg-white transition-all"
                          style={{ left: item.enabled ? "calc(100% - 18px)" : "2px" }} />
                      </button>
                      <button onClick={() => removeLink(item.id)} className="p-1 rounded-lg"
                        style={{ color: "#EF4444" }}>
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                    <input value={item.url} onChange={e => updateLink(item.id, "url", e.target.value)}
                      placeholder="https://..." className="w-full px-2 py-1.5 text-sm rounded-lg focus:outline-none font-mono"
                      style={{ border: "1px solid rgba(245,215,160,0.3)", backgroundColor: "var(--color-bg-secondary)", color: "var(--color-text)" }} />
                    {item.clicks > 0 && (
                      <p className="text-xs" style={{ color: "#A8967E" }}>{item.clicks} clicks</p>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {error && (
              <p className="text-sm px-4 py-2 rounded-lg"
                style={{ backgroundColor: "rgba(239,68,68,0.08)", color: "#DC2626", border: "1px solid rgba(239,68,68,0.2)" }}>
                {error}
              </p>
            )}

            <button onClick={handleSave} disabled={saving}
              className="w-full py-3 rounded-xl text-sm font-bold flex items-center justify-center gap-2"
              style={{ backgroundColor: "var(--color-primary)", color: "white", opacity: saving ? 0.7 : 1 }}>
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : saved ? <Check className="w-4 h-4" /> : <Save className="w-4 h-4" />}
              {saving ? "Saving…" : saved ? "Saved!" : "Save changes"}
            </button>
          </div>

          {/* ── Preview ── */}
          <div className="lg:sticky lg:top-6">
            <div className="rounded-xl p-4" style={cardStyle}>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-bold" style={{ color: "var(--color-text)" }}>Live Preview</h3>
                {publicUrl && (
                  <a href={publicUrl} target="_blank" rel="noopener noreferrer"
                    className="flex items-center gap-1 text-xs font-semibold"
                    style={{ color: "var(--color-primary)" }}>
                    <Eye className="w-3.5 h-3.5" />Open
                  </a>
                )}
              </div>

              {/* Phone frame */}
              <div className="max-w-xs mx-auto rounded-3xl overflow-hidden shadow-xl py-10 px-5 min-h-96 text-center"
                style={{ backgroundColor: bio.bg_color }}>

                {bio.avatar_url ? (
                  <img src={bio.avatar_url} alt="" className="w-16 h-16 rounded-full mx-auto mb-3 object-cover"
                    style={{ border: `3px solid ${bio.accent_color}` }} />
                ) : (
                  <div className="w-16 h-16 rounded-full mx-auto mb-3 flex items-center justify-center text-2xl"
                    style={{ backgroundColor: `${bio.accent_color}20`, border: `3px solid ${bio.accent_color}` }}>
                    {bio.title ? bio.title[0].toUpperCase() : "M"}
                  </div>
                )}

                <p className="font-bold text-base mb-1" style={{ color: darkBg ? "var(--color-bg)" : "var(--color-text)" }}>
                  {bio.title || "Your Name"}
                </p>
                {bio.description && (
                  <p className="text-xs mb-4" style={{ color: darkBg ? "#C4AA8A" : "#78614E" }}>{bio.description}</p>
                )}
                {!bio.description && <div className="mb-4" />}

                <div className="space-y-2">
                  {bio.links.filter(l => l.enabled).map(item => (
                    <div key={item.id} className="flex items-center gap-2 px-4 py-3 rounded-2xl"
                      style={{ backgroundColor: "white", border: `1px solid ${bio.accent_color}25` }}>
                      {item.emoji && <span className="text-lg">{item.emoji}</span>}
                      <span className="text-sm font-semibold flex-1 text-left truncate" style={{ color: "var(--color-text)" }}>
                        {item.title || "Link title"}
                      </span>
                    </div>
                  ))}
                  {bio.links.filter(l => l.enabled).length === 0 && (
                    <p className="text-xs" style={{ color: darkBg ? "#C4AA8A" : "#A8967E" }}>Your links will appear here</p>
                  )}
                </div>

                <div className="mt-6 flex items-center justify-center gap-1">
                  <Zap className="w-3 h-3" style={{ color: bio.accent_color }} />
                  <span className="text-xs" style={{ color: darkBg ? "#C4AA8A" : "#A8967E" }}>MarketHub Pro</span>
                </div>
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
