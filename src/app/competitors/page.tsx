"use client";

import { useState, useEffect } from "react";
import Header from "@/components/layout/Header";
import {
  Plus, X, Search, Loader2, Users, TrendingUp, Heart, MessageCircle,
  Eye, Instagram, Zap, Trash2, RefreshCw, ExternalLink, BarChart3,
  ShieldCheck, Image, Video, ChevronDown, ChevronUp, ArrowUpDown, Sparkles, AlertCircle
} from "lucide-react";

const cardStyle = { backgroundColor: "var(--color-bg-secondary)", border: "1px solid rgba(245,215,160,0.25)", boxShadow: "0 1px 3px rgba(120,97,78,0.08)" };
const IG = "#E1306C";
const TT = "#00F2EA";
const TT2 = "#FF0050";

type IGProfile = {
  username: string;
  fullName: string;
  biography: string;
  avatar: string;
  followers: number;
  following: number;
  postsCount: number;
  isVerified: boolean;
  isPrivate: boolean;
  externalUrl: string | null;
  category: string | null;
};

type IGPost = {
  id: string;
  shortcode: string;
  thumbnail: string;
  isVideo: boolean;
  videoViews: number;
  likes: number;
  comments: number;
  caption: string;
  timestamp: number;
};

type TikTokUser = {
  uniqueId: string;
  nickname: string;
  avatar: string | null;
  followers: number;
  following: number;
  likes: number;
  videos: number;
  verified: boolean;
  bio: string | null;
};

type Competitor = {
  id: string;
  name: string;
  igUsername: string;
  tiktokUsername: string;
  igData: { profile: IGProfile; engagementRate: number; posts: IGPost[] } | null;
  tiktokData: TikTokUser | null;
  lastUpdated: number;
};

function formatNum(n: number) {
  if (!n) return "0";
  if (n >= 1_000_000_000) return (n / 1_000_000_000).toFixed(1) + "B";
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + "M";
  if (n >= 1_000) return (n / 1_000).toFixed(1) + "K";
  return n.toLocaleString();
}

function proxyImg(url: string) {
  if (!url) return "";
  return `/api/image-proxy?url=${encodeURIComponent(url)}`;
}

function timeAgo(ts: number) {
  const diff = Date.now() - ts;
  if (diff < 60000) return "just now";
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m`;
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}h`;
  return `${Math.floor(diff / 86400000)}d`;
}

function loadCompetitors(): Competitor[] {
  if (typeof window === "undefined") return [];
  const stored = localStorage.getItem("mhp_competitors");
  return stored ? JSON.parse(stored) : [];
}

function saveCompetitors(list: Competitor[]) {
  localStorage.setItem("mhp_competitors", JSON.stringify(list));
}

// ── Snapshot tracker (local, no DDL needed) ──────────────────────────────────
// Ring-buffer of daily stats per competitor; used to compute deltas
// (followers / posts / engagement) over the last 24h+ without a cron.
interface Snapshot {
  t: number;           // Date.now()
  igFollowers?: number;
  igPosts?: number;
  igEngage?: number;   // engagementRate percent
  ttFollowers?: number;
  ttLikes?: number;
  ttVideos?: number;
}
const SNAP_KEY = "mhp_competitor_snapshots_v1";
const SNAP_MAX = 30;  // per-competitor ring buffer size
type SnapStore = Record<string, Snapshot[]>;

export function loadSnaps(): SnapStore {
  if (typeof window === "undefined") return {};
  try {
    return JSON.parse(localStorage.getItem(SNAP_KEY) ?? "{}") as SnapStore;
  } catch { return {}; }
}
export function pushSnap(id: string, snap: Snapshot) {
  const all = loadSnaps();
  const list = all[id] ?? [];
  // Coalesce: if last snapshot is <1h old, overwrite instead of appending
  const last = list[list.length - 1];
  if (last && Date.now() - last.t < 60 * 60 * 1000) {
    list[list.length - 1] = snap;
  } else {
    list.push(snap);
    if (list.length > SNAP_MAX) list.shift();
  }
  all[id] = list;
  try { localStorage.setItem(SNAP_KEY, JSON.stringify(all)); } catch { /* storage full */ }
}
export function getBaselineSnap(id: string, minAgeMs = 24 * 60 * 60 * 1000): Snapshot | null {
  const list = loadSnaps()[id] ?? [];
  const cutoff = Date.now() - minAgeMs;
  // Most recent snapshot older than cutoff
  for (let i = list.length - 1; i >= 0; i--) {
    if (list[i].t <= cutoff) return list[i];
  }
  return null;
}
function formatDelta(n: number): { text: string; color: string } {
  if (n === 0) return { text: "0", color: "#A8967E" };
  if (n > 0) return { text: `+${n.toLocaleString()}`, color: "#10B981" };
  return { text: n.toLocaleString(), color: "#EF4444" };
}

// ── Monetization Spy Panel ────────────────────────────────────────────────────
function MonetizationSpy({ competitors }: { competitors: Competitor[] }) {
  const [selected, setSelected] = useState("");
  const [analyzing, setAnalyzing] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState("");

  const analyze = async () => {
    const comp = competitors.find(c => c.name === selected);
    if (!selected) return;
    setAnalyzing(true); setError(""); setResult(null);

    const igData = comp ? {
      username: comp.igUsername, followers: (comp as any).igData?.followers,
      engagement: (comp as any).igData?.engagement, posts: (comp as any).igData?.postsCount,
    } : null;

    const res = await fetch("/api/competitors/monetization", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ brand: selected, ig_data: igData, ads_count: "unknown" }),
    });
    const d = await res.json();
    if (d.analysis) setResult(d.analysis);
    else setError(d.error || "Analysis failed");
    setAnalyzing(false);
  };

  const THREAT_COLORS: Record<string, string> = { low: "#10B981", medium: "var(--color-primary)", high: "#EF4444" };

  return (
    <div className="rounded-2xl p-5 space-y-4" style={{ backgroundColor: "var(--color-bg-secondary)", border: "1px solid rgba(124,58,237,0.2)" }}>
      <div className="flex items-center gap-2">
        <Sparkles className="w-5 h-5" style={{ color: "#7C3AED" }} />
        <h3 className="font-bold" style={{ color: "var(--color-text)" }}>Competitor Monetization Spy</h3>
        <span className="text-xs px-2 py-0.5 rounded-full font-medium" style={{ backgroundColor: "rgba(124,58,237,0.1)", color: "#7C3AED" }}>AI</span>
      </div>

      <div className="flex gap-2">
        {competitors.length > 0 ? (
          <select value={selected} onChange={e => setSelected(e.target.value)}
            className="flex-1 rounded-xl px-3 py-2.5 text-sm outline-none"
            style={{ border: "1px solid rgba(245,215,160,0.3)", backgroundColor: "white", color: "var(--color-text)" }}>
            <option value="">Alege competitor...</option>
            {competitors.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
          </select>
        ) : (
          <input value={selected} onChange={e => setSelected(e.target.value)}
            placeholder="Type the brand name..."
            className="flex-1 rounded-xl px-3 py-2.5 text-sm outline-none"
            style={{ border: "1px solid rgba(245,215,160,0.3)", backgroundColor: "white", color: "var(--color-text)" }} />
        )}
        <button type="button" onClick={analyze} disabled={analyzing || !selected.trim()}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold disabled:opacity-40"
          style={{ backgroundColor: "#7C3AED", color: "white" }}>
          {analyzing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
          {analyzing ? "Analyzing..." : "Analyze"}
        </button>
      </div>

      {error && (
        <div className="flex items-center gap-2 text-sm" style={{ color: "#EF4444" }}>
          <AlertCircle className="w-4 h-4" /> {error}
        </div>
      )}

      {result && (
        <div className="space-y-3">
          {/* Primary monetization */}
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {[
              { label: "Primary monetization", value: result.primary_monetization, color: "#7C3AED" },
              { label: "Funnel type", value: result.funnel_type, color: "#6366F1" },
              { label: "Estimated price", value: result.price_range, color: "var(--color-primary)" },
            ].map(s => (
              <div key={s.label} className="rounded-xl p-3" style={{ backgroundColor: `${s.color}08`, border: `1px solid ${s.color}20` }}>
                <p className="text-[10px] uppercase tracking-wider mb-1" style={{ color: "#A8967E" }}>{s.label}</p>
                <p className="text-sm font-bold" style={{ color: s.color }}>{s.value}</p>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {/* Revenue streams */}
            <div className="rounded-xl p-3" style={{ backgroundColor: "rgba(16,185,129,0.05)", border: "1px solid rgba(16,185,129,0.15)" }}>
              <p className="text-xs font-semibold mb-2" style={{ color: "#10B981" }}>💰 Surse de venit</p>
              <ul className="space-y-1">
                {result.revenue_streams?.map((s: string, i: number) => (
                  <li key={i} className="text-xs flex items-center gap-1.5" style={{ color: "var(--color-text)" }}>
                    <span style={{ color: "#10B981" }}>•</span> {s}
                  </li>
                ))}
              </ul>
            </div>

            {/* Opportunities */}
            <div className="rounded-xl p-3" style={{ backgroundColor: "rgba(245,158,11,0.05)", border: "1px solid rgba(245,158,11,0.15)" }}>
              <p className="text-xs font-semibold mb-2" style={{ color: "var(--color-primary)" }}>🚀 Opportunities for you</p>
              <ul className="space-y-1">
                {result.opportunities?.map((o: string, i: number) => (
                  <li key={i} className="text-xs flex items-center gap-1.5" style={{ color: "var(--color-text)" }}>
                    <span style={{ color: "var(--color-primary)" }}>•</span> {o}
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Threat level */}
          <div className="flex items-center gap-3 rounded-xl p-3" style={{ backgroundColor: "rgba(239,68,68,0.04)", border: "1px solid rgba(239,68,68,0.1)" }}>
            <ShieldCheck className="w-5 h-5 shrink-0" style={{ color: THREAT_COLORS[result.threat_level] ?? "#A8967E" }} />
            <div>
              <span className="text-xs font-semibold" style={{ color: THREAT_COLORS[result.threat_level] }}>
                Threat level: {result.threat_level?.toUpperCase()}
              </span>
              <p className="text-xs mt-0.5" style={{ color: "#78614E" }}>{result.threat_reason}</p>
            </div>
          </div>

          <p className="text-xs" style={{ color: "#A8967E" }}>Ad strategy: {result.ad_strategy}</p>
        </div>
      )}
    </div>
  );
}

export default function CompetitorsPage() {
  const [competitors, setCompetitors] = useState<Competitor[]>(loadCompetitors);
  const [showForm, setShowForm] = useState(false);
  const [formName, setFormName] = useState("");
  const [formIG, setFormIG] = useState("");
  const [formTT, setFormTT] = useState("");
  const [adding, setAdding] = useState(false);
  const [refreshingId, setRefreshingId] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [compareMode, setCompareMode] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    saveCompetitors(competitors);
  }, [competitors]);

  const fetchIGData = async (username: string) => {
    if (!username) return null;
    const res = await fetch(`/api/instagram-scraper?username=${encodeURIComponent(username)}`);
    const data = await res.json();
    if (data.error) return null;
    return data as { profile: IGProfile; engagementRate: number; posts: IGPost[] };
  };

  const fetchTTData = async (username: string) => {
    if (!username) return null;
    const res = await fetch(`/api/tiktok?q=${encodeURIComponent(username)}&count=5`);
    const data = await res.json();
    if (data.error || !data.users?.length) return null;
    const match = data.users.find((u: TikTokUser) =>
      u.uniqueId.toLowerCase() === username.toLowerCase()
    ) || data.users[0];
    return match as TikTokUser;
  };

  const addCompetitor = async () => {
    if (!formName.trim() || (!formIG.trim() && !formTT.trim())) return;
    setAdding(true);
    setError("");

    try {
      const [igData, tiktokData] = await Promise.all([
        fetchIGData(formIG.trim().replace(/^@/, "")),
        fetchTTData(formTT.trim().replace(/^@/, "")),
      ]);

      if (!igData && !tiktokData) {
        setError("No data found for any username. Please check if they are correct.");
        setAdding(false);
        return;
      }

      const newComp: Competitor = {
        id: Date.now().toString(),
        name: formName.trim(),
        igUsername: formIG.trim().replace(/^@/, ""),
        tiktokUsername: formTT.trim().replace(/^@/, ""),
        igData,
        tiktokData,
        lastUpdated: Date.now(),
      };

      // Seed the first snapshot — deltas will start appearing after 24h
      pushSnap(newComp.id, {
        t: Date.now(),
        igFollowers: igData?.profile.followers,
        igPosts: igData?.profile.postsCount,
        igEngage: igData?.engagementRate,
        ttFollowers: tiktokData?.followers,
        ttLikes: tiktokData?.likes,
        ttVideos: tiktokData?.videos,
      });

      setCompetitors(prev => [...prev, newComp]);
      setFormName("");
      setFormIG("");
      setFormTT("");
      setShowForm(false);
    } catch {
      setError("Error fetching data");
    } finally {
      setAdding(false);
    }
  };

  const refreshCompetitor = async (id: string) => {
    setRefreshingId(id);
    const comp = competitors.find(c => c.id === id);
    if (!comp) { setRefreshingId(null); return; }

    const [igData, tiktokData] = await Promise.all([
      fetchIGData(comp.igUsername),
      fetchTTData(comp.tiktokUsername),
    ]);

    // Persist today's stats into the per-competitor ring buffer so the
    // UI can compute 24h deltas on the next load.
    pushSnap(id, {
      t: Date.now(),
      igFollowers: igData?.profile.followers,
      igPosts: igData?.profile.postsCount,
      igEngage: igData?.engagementRate,
      ttFollowers: tiktokData?.followers,
      ttLikes: tiktokData?.likes,
      ttVideos: tiktokData?.videos,
    });

    setCompetitors(prev => prev.map(c =>
      c.id === id ? { ...c, igData: igData || c.igData, tiktokData: tiktokData || c.tiktokData, lastUpdated: Date.now() } : c
    ));
    setRefreshingId(null);
  };

  const deleteCompetitor = (id: string) => {
    setCompetitors(prev => prev.filter(c => c.id !== id));
    if (expandedId === id) setExpandedId(null);
  };

  const refreshAll = async () => {
    for (const comp of competitors) {
      await refreshCompetitor(comp.id);
    }
  };

  // Sort competitors by IG followers descending
  const sorted = [...competitors].sort((a, b) =>
    (b.igData?.profile.followers || 0) - (a.igData?.profile.followers || 0)
  );

  // Totals for overview
  const totalIGFollowers = competitors.reduce((s, c) => s + (c.igData?.profile.followers || 0), 0);
  const totalTTFollowers = competitors.reduce((s, c) => s + (c.tiktokData?.followers || 0), 0);
  const avgEngagement = competitors.filter(c => c.igData).length > 0
    ? (competitors.reduce((s, c) => s + (c.igData?.engagementRate || 0), 0) / competitors.filter(c => c.igData).length).toFixed(2)
    : "0";
  const maxEngagement = competitors.reduce((max, c) => {
    const rate = c.igData?.engagementRate || 0;
    return rate > (max?.igData?.engagementRate || 0) ? c : max;
  }, competitors[0]);

  return (
    <div>
      <Header title="Competitor Analysis" subtitle="Monitor competitors in real time — Instagram and TikTok" />
      <div className="p-6 space-y-5">

        {/* Overview Stats */}
        {competitors.length > 0 && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              { label: "Competitors", value: competitors.length.toString(), icon: <Users className="w-4 h-4" />, color: "var(--color-primary)" },
              { label: "Total IG Followers", value: formatNum(totalIGFollowers), icon: <Instagram className="w-4 h-4" />, color: IG },
              { label: "Total TT Followers", value: formatNum(totalTTFollowers), icon: <Zap className="w-4 h-4" />, color: TT2 },
              { label: "Avg. IG Engagement", value: `${avgEngagement}%`, icon: <TrendingUp className="w-4 h-4" />, color: "#10B981" },
            ].map(s => (
              <div key={s.label} className="rounded-xl p-4" style={cardStyle}>
                <div className="flex items-center gap-2 mb-1" style={{ color: s.color }}>{s.icon}<span className="text-xs">{s.label}</span></div>
                <p className="text-xl font-bold" style={{ color: "var(--color-text)" }}>{s.value}</p>
              </div>
            ))}
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center gap-3 flex-wrap">
          <button
            type="button"
            onClick={() => { setShowForm(true); setError(""); }}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold"
            style={{ background: "linear-gradient(135deg, var(--color-primary), var(--color-primary-hover))", color: "#1C1814" }}
          >
            <Plus className="w-4 h-4" />
            Add Competitor
          </button>
          {competitors.length > 0 && (
            <>
              <button
                type="button"
                onClick={refreshAll}
                disabled={refreshingId !== null}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold btn-pill"
              >
                <RefreshCw className={`w-4 h-4 ${refreshingId ? "animate-spin" : ""}`} />
                Refresh All
              </button>
              <button
                type="button"
                onClick={() => setCompareMode(v => !v)}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold ${!compareMode ? "btn-pill" : ""}`}
                style={compareMode
                  ? { backgroundColor: "rgba(245,158,11,0.1)", color: "var(--color-primary)", border: "1px solid rgba(245,158,11,0.3)" }
                  : undefined
                }
              >
                <ArrowUpDown className="w-4 h-4" />
                {compareMode ? "Close Comparison" : "Compare"}
              </button>
            </>
          )}
        </div>

        {/* Add Form */}
        {showForm && (
          <div className="rounded-xl p-5" style={cardStyle}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold" style={{ color: "var(--color-text)" }}>Add New Competitor</h3>
              <button type="button" onClick={() => setShowForm(false)} style={{ color: "#A8967E" }}><X className="w-4 h-4" /></button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-semibold mb-1" style={{ color: "#78614E" }}>Competitor Name *</label>
                <input
                  type="text"
                  placeholder="Ex: Nike Romania"
                  value={formName}
                  onChange={e => setFormName(e.target.value)}
                  className="w-full px-3 py-2.5 text-sm rounded-xl focus:outline-none"
                  style={{ border: "1px solid rgba(245,215,160,0.3)", backgroundColor: "var(--color-bg)", color: "var(--color-text)" }}
                />
              </div>
              <div>
                <label className="flex items-center gap-1 text-xs font-semibold mb-1" style={{ color: IG }}>
                  <Instagram className="w-3 h-3" /> Username Instagram
                </label>
                <input
                  type="text"
                  placeholder="Ex: nike"
                  value={formIG}
                  onChange={e => setFormIG(e.target.value)}
                  className="w-full px-3 py-2.5 text-sm rounded-xl focus:outline-none"
                  style={{ border: `1px solid ${IG}30`, backgroundColor: "var(--color-bg)", color: "var(--color-text)" }}
                />
              </div>
              <div>
                <label className="flex items-center gap-1 text-xs font-semibold mb-1" style={{ color: TT2 }}>
                  <Zap className="w-3 h-3" /> Username TikTok
                </label>
                <input
                  type="text"
                  placeholder="Ex: nike"
                  value={formTT}
                  onChange={e => setFormTT(e.target.value)}
                  className="w-full px-3 py-2.5 text-sm rounded-xl focus:outline-none"
                  style={{ border: `1px solid ${TT2}30`, backgroundColor: "var(--color-bg)", color: "var(--color-text)" }}
                />
              </div>
            </div>
            {error && <p className="text-xs mt-2 font-semibold" style={{ color: "#EF4444" }}>{error}</p>}
            <div className="flex gap-3 mt-4">
              <button
                type="button"
                onClick={addCompetitor}
                disabled={adding || !formName.trim() || (!formIG.trim() && !formTT.trim())}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold disabled:opacity-40"
                style={{ background: "linear-gradient(135deg, var(--color-primary), var(--color-primary-hover))", color: "#1C1814" }}
              >
                {adding ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
                {adding ? "Searching..." : "Search & Add"}
              </button>
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="px-5 py-2.5 rounded-xl text-sm font-semibold"
                style={{ backgroundColor: "rgba(245,215,160,0.15)", color: "#78614E" }}
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* Compare View */}
        {compareMode && competitors.length >= 2 && (
          <div className="rounded-xl overflow-hidden" style={cardStyle}>
            <div className="px-5 py-4" style={{ borderBottom: "1px solid rgba(245,215,160,0.2)" }}>
              <h3 className="font-semibold" style={{ color: "var(--color-text)" }}>Competitor Comparison</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-xs uppercase tracking-wide" style={{ backgroundColor: "rgba(245,215,160,0.1)", color: "#A8967E" }}>
                    <th className="text-left px-5 py-3">Competitor</th>
                    <th className="text-center px-3 py-3">IG Followers</th>
                    <th className="text-center px-3 py-3">IG Engagement</th>
                    <th className="text-center px-3 py-3">IG Posts</th>
                    <th className="text-center px-3 py-3">TT Followers</th>
                    <th className="text-center px-3 py-3">TT Likes</th>
                    <th className="text-center px-3 py-3">TT Videos</th>
                  </tr>
                </thead>
                <tbody>
                  {sorted.map((comp, i) => {
                    const isBest = maxEngagement?.id === comp.id;
                    return (
                      <tr key={comp.id} style={{ borderTop: "1px solid rgba(245,215,160,0.15)", backgroundColor: isBest ? "rgba(245,158,11,0.06)" : "transparent" }}>
                        <td className="px-5 py-3">
                          <div className="flex items-center gap-2">
                            {comp.igData?.profile.avatar && (
                              <img src={proxyImg(comp.igData.profile.avatar)} alt="" className="w-7 h-7 rounded-full object-cover" />
                            )}
                            <div>
                              <p className="font-semibold" style={{ color: "var(--color-text)" }}>
                                {comp.name} {isBest && <span style={{ color: "var(--color-primary)" }}>★</span>}
                              </p>
                              <div className="flex gap-2">
                                {comp.igUsername && <span className="text-xs" style={{ color: IG }}>@{comp.igUsername}</span>}
                                {comp.tiktokUsername && <span className="text-xs" style={{ color: TT2 }}>@{comp.tiktokUsername}</span>}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="px-3 py-3 text-center font-bold" style={{ color: "var(--color-text)" }}>
                          {formatNum(comp.igData?.profile.followers || 0)}
                          {(() => {
                            const base = getBaselineSnap(comp.id);
                            const now = comp.igData?.profile.followers;
                            if (!base?.igFollowers || typeof now !== "number") return null;
                            const d = now - base.igFollowers;
                            const fd = formatDelta(d);
                            return (
                              <span className="block text-[10px] font-normal mt-0.5" style={{ color: fd.color }} title={`Δ since ${new Date(base.t).toLocaleDateString()}`}>
                                {fd.text}
                              </span>
                            );
                          })()}
                        </td>
                        <td className="px-3 py-3 text-center">
                          <span className="px-2 py-0.5 rounded-full text-xs font-bold"
                            style={{
                              backgroundColor: (comp.igData?.engagementRate || 0) > 3 ? "rgba(16,185,129,0.1)" : (comp.igData?.engagementRate || 0) > 1 ? "rgba(245,158,11,0.1)" : "rgba(239,68,68,0.1)",
                              color: (comp.igData?.engagementRate || 0) > 3 ? "#10B981" : (comp.igData?.engagementRate || 0) > 1 ? "var(--color-primary)" : "#EF4444",
                            }}>
                            {comp.igData?.engagementRate || 0}%
                          </span>
                        </td>
                        <td className="px-3 py-3 text-center" style={{ color: "#78614E" }}>{formatNum(comp.igData?.profile.postsCount || 0)}</td>
                        <td className="px-3 py-3 text-center font-bold" style={{ color: "var(--color-text)" }}>
                          {formatNum(comp.tiktokData?.followers || 0)}
                          {(() => {
                            const base = getBaselineSnap(comp.id);
                            const now = comp.tiktokData?.followers;
                            if (!base?.ttFollowers || typeof now !== "number") return null;
                            const d = now - base.ttFollowers;
                            const fd = formatDelta(d);
                            return (
                              <span className="block text-[10px] font-normal mt-0.5" style={{ color: fd.color }} title={`Δ since ${new Date(base.t).toLocaleDateString()}`}>
                                {fd.text}
                              </span>
                            );
                          })()}
                        </td>
                        <td className="px-3 py-3 text-center" style={{ color: "#78614E" }}>{formatNum(comp.tiktokData?.likes || 0)}</td>
                        <td className="px-3 py-3 text-center" style={{ color: "#78614E" }}>{formatNum(comp.tiktokData?.videos || 0)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Engagement bar chart */}
            <div className="px-5 py-4" style={{ borderTop: "1px solid rgba(245,215,160,0.15)" }}>
              <p className="text-xs font-semibold mb-3" style={{ color: "#A8967E" }}>Instagram Engagement Rate</p>
              <div className="space-y-2">
                {sorted.map(comp => {
                  const rate = comp.igData?.engagementRate || 0;
                  const maxRate = Math.max(...competitors.map(c => c.igData?.engagementRate || 0), 1);
                  return (
                    <div key={comp.id} className="flex items-center gap-3">
                      <span className="text-xs font-medium w-28 truncate" style={{ color: "var(--color-text)" }}>{comp.name}</span>
                      <div className="flex-1 h-5 rounded-full overflow-hidden" style={{ backgroundColor: "rgba(245,215,160,0.15)" }}>
                        <div className="h-full rounded-full flex items-center px-2 transition-all"
                          style={{ width: `${Math.max((rate / maxRate) * 100, 2)}%`, background: `linear-gradient(90deg, ${IG}, #833AB4)` }}>
                          <span className="text-[10px] font-bold text-white whitespace-nowrap">{rate}%</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* Competitor Cards */}
        {competitors.length === 0 && !showForm && (
          <div className="rounded-xl p-12 text-center" style={cardStyle}>
            <Users className="w-10 h-10 mx-auto mb-3" style={{ color: "#C4AA8A" }} />
            <p className="text-sm font-semibold mb-1" style={{ color: "var(--color-text)" }}>No competitors added</p>
            <p className="text-xs mb-4" style={{ color: "#A8967E" }}>Add your competitors to monitor their Instagram and TikTok accounts in real time</p>
            <button
              type="button"
              onClick={() => setShowForm(true)}
              className="px-5 py-2.5 rounded-xl text-sm font-bold"
              style={{ background: "linear-gradient(135deg, var(--color-primary), var(--color-primary-hover))", color: "#1C1814" }}
            >
              <Plus className="w-4 h-4 inline mr-1" />Add first competitor
            </button>
          </div>
        )}

        <div className="space-y-3">
          {sorted.map(comp => {
            const expanded = expandedId === comp.id;
            const isRefreshing = refreshingId === comp.id;

            return (
              <div key={comp.id} className="rounded-xl overflow-hidden" style={cardStyle}>
                {/* Header */}
                <div
                  className="flex items-center gap-3 px-5 py-4 cursor-pointer"
                  onClick={() => setExpandedId(expanded ? null : comp.id)}
                >
                  {/* Avatar */}
                  <div className="w-12 h-12 rounded-full overflow-hidden flex-shrink-0" style={{ backgroundColor: `${IG}10` }}>
                    {comp.igData?.profile.avatar ? (
                      <img src={proxyImg(comp.igData.profile.avatar)} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <Users className="w-5 h-5" style={{ color: IG }} />
                      </div>
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="text-sm font-bold" style={{ color: "var(--color-text)" }}>{comp.name}</h3>
                      {comp.igData?.profile.isVerified && <ShieldCheck className="w-4 h-4" style={{ color: "#3B82F6" }} />}
                    </div>
                    <div className="flex items-center gap-3">
                      {comp.igUsername && (
                        <a href={`https://instagram.com/${comp.igUsername}`} target="_blank" rel="noopener noreferrer"
                          className="text-xs hover:underline" style={{ color: IG }}
                          onClick={e => e.stopPropagation()}>
                          <Instagram className="w-3 h-3 inline mr-0.5" />@{comp.igUsername}
                        </a>
                      )}
                      {comp.tiktokUsername && (
                        <a href={`https://tiktok.com/@${comp.tiktokUsername}`} target="_blank" rel="noopener noreferrer"
                          className="text-xs hover:underline" style={{ color: TT2 }}
                          onClick={e => e.stopPropagation()}>
                          <Zap className="w-3 h-3 inline mr-0.5" />@{comp.tiktokUsername}
                        </a>
                      )}
                    </div>
                  </div>

                  {/* Quick stats */}
                  <div className="hidden md:flex items-center gap-5">
                    {comp.igData && (
                      <>
                        <div className="text-center">
                          <p className="text-xs" style={{ color: "#A8967E" }}>IG Followers</p>
                          <p className="text-sm font-bold" style={{ color: "var(--color-text)" }}>{formatNum(comp.igData.profile.followers)}</p>
                        </div>
                        <div className="text-center">
                          <p className="text-xs" style={{ color: "#A8967E" }}>Engagement</p>
                          <p className="text-sm font-bold" style={{ color: comp.igData.engagementRate > 3 ? "#10B981" : comp.igData.engagementRate > 1 ? "var(--color-primary)" : "#EF4444" }}>
                            {comp.igData.engagementRate}%
                          </p>
                        </div>
                      </>
                    )}
                    {comp.tiktokData && (
                      <div className="text-center">
                        <p className="text-xs" style={{ color: "#A8967E" }}>TT Followers</p>
                        <p className="text-sm font-bold" style={{ color: "var(--color-text)" }}>{formatNum(comp.tiktokData.followers)}</p>
                      </div>
                    )}
                  </div>

                  <div className="flex items-center gap-1 flex-shrink-0">
                    <button
                      type="button"
                      onClick={e => { e.stopPropagation(); refreshCompetitor(comp.id); }}
                      disabled={isRefreshing}
                      className="p-1.5 rounded-lg"
                      style={{ color: "#A8967E" }}
                    >
                      <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? "animate-spin" : ""}`} />
                    </button>
                    <button
                      type="button"
                      onClick={e => { e.stopPropagation(); deleteCompetitor(comp.id); }}
                      className="p-1.5 rounded-lg"
                      style={{ color: "#EF4444" }}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                    {expanded ? <ChevronUp className="w-4 h-4" style={{ color: "#A8967E" }} /> : <ChevronDown className="w-4 h-4" style={{ color: "#A8967E" }} />}
                  </div>
                </div>

                {/* Updated timestamp */}
                <div className="px-5 pb-2">
                  <span className="text-[10px]" style={{ color: "#C4AA8A" }}>Updated {timeAgo(comp.lastUpdated)} ago</span>
                </div>

                {/* Expanded Details */}
                {expanded && (
                  <div className="px-5 pb-5 space-y-4" style={{ borderTop: "1px solid rgba(245,215,160,0.15)" }}>

                    {/* Platform stats */}
                    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3 pt-3">
                      {comp.igData && [
                        { label: "IG Followers", value: formatNum(comp.igData.profile.followers), icon: <Users className="w-4 h-4" />, color: IG },
                        { label: "IG Following", value: formatNum(comp.igData.profile.following), color: IG },
                        { label: "IG Posts", value: formatNum(comp.igData.profile.postsCount), icon: <Image className="w-4 h-4" />, color: IG },
                        { label: "IG Engagement", value: `${comp.igData.engagementRate}%`, icon: <TrendingUp className="w-4 h-4" />, color: "#10B981" },
                      ].map(m => (
                        <div key={m.label} className="rounded-lg p-3" style={{ backgroundColor: `${m.color}08`, border: `1px solid ${m.color}15` }}>
                          <p className="text-[10px] uppercase tracking-wider" style={{ color: "#A8967E" }}>{m.label}</p>
                          <p className="text-lg font-bold mt-1" style={{ color: "var(--color-text)" }}>{m.value}</p>
                        </div>
                      ))}
                      {comp.tiktokData && [
                        { label: "TT Followers", value: formatNum(comp.tiktokData.followers), color: TT2 },
                        { label: "TT Total Likes", value: formatNum(comp.tiktokData.likes), color: TT2 },
                      ].map(m => (
                        <div key={m.label} className="rounded-lg p-3" style={{ backgroundColor: `${m.color}08`, border: `1px solid ${m.color}15` }}>
                          <p className="text-[10px] uppercase tracking-wider" style={{ color: "#A8967E" }}>{m.label}</p>
                          <p className="text-lg font-bold mt-1" style={{ color: "var(--color-text)" }}>{m.value}</p>
                        </div>
                      ))}
                    </div>

                    {/* Bio */}
                    {comp.igData?.profile.biography && (
                      <div className="rounded-lg p-3" style={{ backgroundColor: "rgba(245,215,160,0.06)" }}>
                        <p className="text-[10px] uppercase tracking-wider mb-1" style={{ color: "#A8967E" }}>Bio Instagram</p>
                        <p className="text-sm whitespace-pre-line" style={{ color: "#78614E" }}>{comp.igData.profile.biography}</p>
                      </div>
                    )}

                    {/* Recent IG Posts */}
                    {comp.igData && comp.igData.posts.length > 0 && (
                      <div>
                        <p className="text-xs font-semibold mb-2" style={{ color: "#A8967E" }}>Recent Instagram Posts ({comp.igData.posts.length})</p>
                        <div className="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2">
                          {comp.igData.posts.map(post => (
                            <a
                              key={post.id}
                              href={`https://instagram.com/p/${post.shortcode}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="relative aspect-square rounded-lg overflow-hidden group"
                            >
                              <img src={proxyImg(post.thumbnail)} alt="" className="w-full h-full object-cover" />
                              {post.isVideo && (
                                <div className="absolute top-1 right-1">
                                  <Video className="w-3 h-3 text-white drop-shadow" />
                                </div>
                              )}
                              <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                                <span className="flex items-center gap-0.5 text-white text-xs font-semibold">
                                  <Heart className="w-3 h-3" />{formatNum(post.likes)}
                                </span>
                                <span className="flex items-center gap-0.5 text-white text-xs font-semibold">
                                  <MessageCircle className="w-3 h-3" />{formatNum(post.comments)}
                                </span>
                              </div>
                            </a>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
        {/* Monetization Spy */}
        <MonetizationSpy competitors={competitors} />

      </div>
    </div>
  );
}
