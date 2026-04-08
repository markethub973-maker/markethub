"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import Header from "@/components/layout/Header";
import {
  Link2, Copy, Trash2, RefreshCw, Calendar, Eye, Loader2,
  Palette, ChevronLeft, ExternalLink, Check, X, Edit3, Plus,
} from "lucide-react";

const cardStyle = {
  backgroundColor: "#FFFCF7",
  border: "1px solid rgba(245,215,160,0.25)",
  boxShadow: "0 1px 3px rgba(120,97,78,0.08)",
};

type PortalLink = {
  id: string;
  token: string;
  client_name: string;
  ig_username: string;
  tt_username: string;
  view_count: number;
  expires_at: string | null;
  created_at: string;
  updated_at: string;
  agency_name: string | null;
  agency_logo_url: string | null;
  accent_color: string | null;
};

function timeUntil(iso: string | null): { label: string; color: string } {
  if (!iso) return { label: "Never", color: "#16A34A" };
  const ms = new Date(iso).getTime() - Date.now();
  if (ms < 0) return { label: "Expired", color: "#DC2626" };
  const days = Math.floor(ms / 86400000);
  if (days < 1) return { label: `${Math.floor(ms / 3600000)}h left`, color: "#DC2626" };
  if (days < 7) return { label: `${days}d left`, color: "#F59E0B" };
  return { label: `${days}d left`, color: "#16A34A" };
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short", day: "numeric", year: "numeric",
  });
}

export default function ShareLinksPage() {
  const [links, setLinks] = useState<PortalLink[]>([]);
  const [loading, setLoading] = useState(true);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState("");

  // White-label edit form state
  const [formAgencyName, setFormAgencyName] = useState("");
  const [formLogoUrl, setFormLogoUrl] = useState("");
  const [formAccent, setFormAccent] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/client-portal");
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to load links");
      setLinks(json.links || []);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const copyUrl = (token: string, id: string) => {
    const url = `${window.location.origin}/portal/${token}`;
    navigator.clipboard.writeText(url).then(() => {
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
    });
  };

  const extendLink = async (id: string, days: number) => {
    setBusyId(id);
    try {
      const res = await fetch("/api/client-portal", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, extend_days: days }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed");
      setLinks(prev => prev.map(l => (l.id === id ? json.link : l)));
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusyId(null);
    }
  };

  const deleteLink = async (id: string) => {
    if (!confirm("Delete this share link? The client will lose access immediately.")) return;
    setBusyId(id);
    try {
      const res = await fetch("/api/client-portal", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed");
      setLinks(prev => prev.filter(l => l.id !== id));
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusyId(null);
    }
  };

  const openEdit = (link: PortalLink) => {
    setEditingId(link.id);
    setFormAgencyName(link.agency_name || "");
    setFormLogoUrl(link.agency_logo_url || "");
    setFormAccent(link.accent_color || "");
  };

  const saveEdit = async (id: string) => {
    setBusyId(id);
    try {
      const res = await fetch("/api/client-portal", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id,
          agency_name: formAgencyName.trim() || null,
          agency_logo_url: formLogoUrl.trim() || null,
          accent_color: formAccent.trim() || null,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed");
      setLinks(prev => prev.map(l => (l.id === id ? json.link : l)));
      setEditingId(null);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div>
      <Header title="Share Links" subtitle="Manage white-label client report links" />
      <div className="p-6 space-y-5">

        {/* Top bar */}
        <div className="flex items-center gap-3">
          <Link href="/clients"
            className="flex items-center gap-1 text-xs font-semibold px-3 py-2 rounded-lg"
            style={{ ...cardStyle, color: "#78614E" }}>
            <ChevronLeft className="w-3.5 h-3.5" />
            Back to Clients
          </Link>
          <div className="ml-auto flex items-center gap-2">
            <span className="text-xs" style={{ color: "#A8967E" }}>
              {links.length} link{links.length === 1 ? "" : "s"} total
            </span>
            <button type="button" onClick={load} disabled={loading}
              className="flex items-center gap-1 px-3 py-2 rounded-lg text-xs font-semibold"
              style={{ ...cardStyle, color: "#78614E" }}>
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
              Refresh
            </button>
          </div>
        </div>

        {error && (
          <div className="rounded-lg p-3 text-sm font-semibold"
            style={{ backgroundColor: "rgba(220,38,38,0.08)", color: "#DC2626", border: "1px solid rgba(220,38,38,0.2)" }}>
            {error}
          </div>
        )}

        {/* Empty state */}
        {!loading && links.length === 0 && (
          <div className="rounded-xl p-12 text-center" style={cardStyle}>
            <Link2 className="w-10 h-10 mx-auto mb-3" style={{ color: "#C4AA8A" }} />
            <p className="text-sm font-semibold mb-1" style={{ color: "#292524" }}>No share links yet</p>
            <p className="text-xs mb-4" style={{ color: "#A8967E" }}>
              Go to Clients and click <strong>Live Link</strong> next to any client to generate one.
            </p>
            <Link href="/clients"
              className="inline-flex items-center gap-1 px-5 py-2.5 rounded-xl text-sm font-bold"
              style={{ backgroundColor: "#F59E0B", color: "white" }}>
              <Plus className="w-4 h-4" />
              Go to Clients
            </Link>
          </div>
        )}

        {/* Loading state */}
        {loading && (
          <div className="rounded-xl p-12 text-center" style={cardStyle}>
            <Loader2 className="w-6 h-6 mx-auto animate-spin" style={{ color: "#F59E0B" }} />
          </div>
        )}

        {/* Links list */}
        <div className="space-y-3">
          {links.map(link => {
            const expiry = timeUntil(link.expires_at);
            const url = typeof window !== "undefined" ? `${window.location.origin}/portal/${link.token}` : "";
            const isEditing = editingId === link.id;
            const isBusy = busyId === link.id;
            const accent = link.accent_color || "#F59E0B";

            return (
              <div key={link.id} className="rounded-xl overflow-hidden" style={cardStyle}>
                {/* Main row */}
                <div className="px-5 py-4 flex items-start gap-4 flex-wrap md:flex-nowrap">
                  {/* Brand swatch */}
                  <div className="w-12 h-12 rounded-lg flex items-center justify-center font-bold text-lg shrink-0"
                    style={{ backgroundColor: `${accent}20`, color: accent }}>
                    {(link.agency_name || link.client_name).charAt(0).toUpperCase()}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="text-sm font-bold" style={{ color: "#292524" }}>{link.client_name}</h3>
                      {link.agency_name && (
                        <span className="text-xs px-2 py-0.5 rounded-full font-semibold"
                          style={{ backgroundColor: `${accent}15`, color: accent }}>
                          {link.agency_name}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-3 mt-1 flex-wrap">
                      {link.ig_username && <span className="text-xs" style={{ color: "#E1306C" }}>@{link.ig_username}</span>}
                      {link.tt_username && <span className="text-xs" style={{ color: "#FF0050" }}>@{link.tt_username}</span>}
                      <span className="text-xs" style={{ color: "#C4AA8A" }}>
                        Created {formatDate(link.created_at)}
                      </span>
                    </div>
                  </div>

                  {/* Stats */}
                  <div className="flex items-center gap-5 shrink-0">
                    <div className="text-center">
                      <div className="flex items-center gap-1 text-xs" style={{ color: "#A8967E" }}>
                        <Eye className="w-3 h-3" /> Views
                      </div>
                      <p className="text-sm font-bold mt-0.5" style={{ color: "#292524" }}>{link.view_count}</p>
                    </div>
                    <div className="text-center">
                      <div className="flex items-center gap-1 text-xs" style={{ color: "#A8967E" }}>
                        <Calendar className="w-3 h-3" /> Expiry
                      </div>
                      <p className="text-sm font-bold mt-0.5" style={{ color: expiry.color }}>{expiry.label}</p>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1 shrink-0">
                    <button type="button" onClick={() => copyUrl(link.token, link.id)}
                      className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold"
                      style={copiedId === link.id
                        ? { backgroundColor: "rgba(22,163,74,0.12)", color: "#16A34A" }
                        : { backgroundColor: "rgba(59,130,246,0.1)", color: "#3B82F6" }}>
                      {copiedId === link.id ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                      <span className="hidden sm:inline">{copiedId === link.id ? "Copied" : "Copy"}</span>
                    </button>
                    <a href={url} target="_blank" rel="noopener noreferrer"
                      className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold"
                      style={{ backgroundColor: "rgba(245,215,160,0.15)", color: "#78614E" }}>
                      <ExternalLink className="w-3 h-3" />
                      <span className="hidden sm:inline">Open</span>
                    </a>
                    <button type="button" onClick={() => extendLink(link.id, 30)} disabled={isBusy}
                      title="Extend +30 days"
                      className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold"
                      style={{ backgroundColor: "rgba(245,158,11,0.1)", color: "#F59E0B" }}>
                      {isBusy ? <Loader2 className="w-3 h-3 animate-spin" /> : <Calendar className="w-3 h-3" />}
                      <span className="hidden sm:inline">+30d</span>
                    </button>
                    <button type="button" onClick={() => openEdit(link)}
                      title="Edit white-label"
                      className="p-1.5 rounded-lg" style={{ color: "#A8967E" }}>
                      <Palette className="w-3.5 h-3.5" />
                    </button>
                    <button type="button" onClick={() => deleteLink(link.id)} disabled={isBusy}
                      className="p-1.5 rounded-lg" style={{ color: "#EF4444" }}>
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Edit panel */}
                {isEditing && (
                  <div className="px-5 py-4 space-y-3"
                    style={{ borderTop: "1px solid rgba(245,215,160,0.2)", backgroundColor: "rgba(245,215,160,0.04)" }}>
                    <div className="flex items-center gap-2 mb-2">
                      <Edit3 className="w-3.5 h-3.5" style={{ color: "#78614E" }} />
                      <h4 className="text-xs font-bold uppercase tracking-wider" style={{ color: "#78614E" }}>White-label settings</h4>
                      <button type="button" onClick={() => setEditingId(null)}
                        className="ml-auto p-1 rounded" style={{ color: "#A8967E" }}>
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                      <div>
                        <label className="block text-xs font-semibold mb-1" style={{ color: "#78614E" }}>Agency name</label>
                        <input type="text" placeholder="Your agency name" value={formAgencyName}
                          onChange={e => setFormAgencyName(e.target.value)}
                          className="w-full px-3 py-2 text-sm rounded-lg focus:outline-none"
                          style={{ border: "1px solid rgba(245,215,160,0.4)", backgroundColor: "#FFF8F0", color: "#292524" }} />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold mb-1" style={{ color: "#78614E" }}>Logo URL</label>
                        <input type="url" placeholder="https://..." value={formLogoUrl}
                          onChange={e => setFormLogoUrl(e.target.value)}
                          className="w-full px-3 py-2 text-sm rounded-lg focus:outline-none"
                          style={{ border: "1px solid rgba(245,215,160,0.4)", backgroundColor: "#FFF8F0", color: "#292524" }} />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold mb-1" style={{ color: "#78614E" }}>Accent color</label>
                        <div className="flex gap-2">
                          <input type="color" value={formAccent || "#F59E0B"}
                            onChange={e => setFormAccent(e.target.value)}
                            className="w-10 h-9 rounded cursor-pointer"
                            style={{ border: "1px solid rgba(245,215,160,0.4)" }} />
                          <input type="text" placeholder="#F59E0B" value={formAccent}
                            onChange={e => setFormAccent(e.target.value)}
                            className="flex-1 px-3 py-2 text-sm rounded-lg focus:outline-none"
                            style={{ border: "1px solid rgba(245,215,160,0.4)", backgroundColor: "#FFF8F0", color: "#292524" }} />
                        </div>
                      </div>
                    </div>
                    <p className="text-xs" style={{ color: "#A8967E" }}>
                      Leave any field empty to use the default MarketHub Pro branding.
                    </p>
                    <div className="flex gap-2">
                      <button type="button" onClick={() => saveEdit(link.id)} disabled={isBusy}
                        className="flex items-center gap-1 px-4 py-2 rounded-lg text-xs font-bold disabled:opacity-50"
                        style={{ backgroundColor: "#F59E0B", color: "white" }}>
                        {isBusy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                        Save
                      </button>
                      <button type="button" onClick={() => setEditingId(null)}
                        className="px-4 py-2 rounded-lg text-xs font-semibold"
                        style={{ backgroundColor: "rgba(245,215,160,0.15)", color: "#78614E" }}>
                        Cancel
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
