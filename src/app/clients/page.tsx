"use client";

import { useState, useEffect } from "react";
import Header from "@/components/layout/Header";
import WeeklyDigestPanel from "@/components/ui/WeeklyDigestPanel";
import {
  Users, Plus, Trash2, Instagram, ChevronDown, ChevronUp,
  BarChart3, TrendingUp, Heart, MessageCircle, Eye, Video,
  ArrowUpDown, ExternalLink, Loader2, X, RefreshCw,
  ShieldCheck, Image, Bookmark, BookmarkCheck, Zap, Lock
} from "lucide-react";

const cardStyle = { backgroundColor: "#FFFCF7", border: "1px solid rgba(245,215,160,0.25)", boxShadow: "0 1px 3px rgba(120,97,78,0.08)" };
const IG = "#E1306C";
const TT = "#FF0050";

type IGProfile = {
  username: string; fullName: string; biography: string; avatar: string;
  followers: number; following: number; postsCount: number;
  isVerified: boolean; isPrivate: boolean; externalUrl: string | null; category: string | null;
};

type IGPost = {
  id: string; shortcode: string; thumbnail: string; isVideo: boolean;
  videoViews: number; likes: number; comments: number; caption: string; timestamp: number;
};

type TikTokUser = {
  uniqueId: string; nickname: string; avatar: string | null;
  followers: number; following: number; likes: number; videos: number;
  verified: boolean; bio: string | null;
};

type Client = {
  id: string;
  name: string;
  igUsername: string;
  tiktokUsername: string;
  notes: string;
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

function loadClients(): Client[] {
  if (typeof window === "undefined") return [];
  const stored = localStorage.getItem("mhp_clients_v2");
  return stored ? JSON.parse(stored) : [];
}

function saveClients(list: Client[]) {
  localStorage.setItem("mhp_clients_v2", JSON.stringify(list));
}

export default function ClientsPage() {
  const [clients, setClients] = useState<Client[]>(loadClients);
  const [showForm, setShowForm] = useState(false);
  const [formName, setFormName] = useState("");
  const [formIG, setFormIG] = useState("");
  const [formTT, setFormTT] = useState("");
  const [formNotes, setFormNotes] = useState("");
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState("");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [refreshingId, setRefreshingId] = useState<string | null>(null);
  const [compareMode, setCompareMode] = useState(false);
  const [compareIds, setCompareIds] = useState<string[]>([]);
  const [activeTab, setActiveTab] = useState<"list" | "compare" | "digest">("list");
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const copyShareLink = (client: Client) => {
    const payload = {
      v: 1,
      n: client.name,
      ig: client.igUsername || "",
      tt: client.tiktokUsername || "",
      notes: client.notes || "",
      f: client.igData?.profile.followers || 0,
      fw: client.igData?.profile.following || 0,
      p: client.igData?.profile.postsCount || 0,
      e: client.igData?.engagementRate || 0,
      bio: client.igData?.profile.biography?.substring(0, 120) || "",
      av: client.igData?.profile.avatar || "",
      ver: client.igData?.profile.isVerified || false,
      tf: client.tiktokData?.followers || 0,
      tl: client.tiktokData?.likes || 0,
      tv: client.tiktokData?.videos || 0,
      posts: (client.igData?.posts || []).slice(0, 6).map(post => ({
        s: post.shortcode,
        l: post.likes,
        c: post.comments,
        v: post.isVideo ? 1 : 0,
        vv: post.videoViews || 0,
        t: post.timestamp,
        th: post.thumbnail || "",
      })),
      ts: client.lastUpdated,
    };
    const token = btoa(unescape(encodeURIComponent(JSON.stringify(payload))))
      .replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
    const url = `${window.location.origin}/report/${token}`;
    navigator.clipboard.writeText(url).then(() => {
      setCopiedId(client.id);
      setTimeout(() => setCopiedId(null), 2500);
    });
  };

  useEffect(() => {
    saveClients(clients);
  }, [clients]);

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
    return (data.users.find((u: TikTokUser) => u.uniqueId.toLowerCase() === username.toLowerCase()) || data.users[0]) as TikTokUser;
  };

  const addClient = async () => {
    if (!formName.trim() || (!formIG.trim() && !formTT.trim())) return;
    setAdding(true);
    setError("");

    try {
      const [igData, tiktokData] = await Promise.all([
        fetchIGData(formIG.trim().replace(/^@/, "")),
        fetchTTData(formTT.trim().replace(/^@/, "")),
      ]);

      if (!igData && !tiktokData) {
        setError("No data found. Please check the usernames.");
        setAdding(false);
        return;
      }

      const newClient: Client = {
        id: Date.now().toString(),
        name: formName.trim(),
        igUsername: formIG.trim().replace(/^@/, ""),
        tiktokUsername: formTT.trim().replace(/^@/, ""),
        notes: formNotes.trim(),
        igData,
        tiktokData,
        lastUpdated: Date.now(),
      };

      setClients(prev => [...prev, newClient]);
      setFormName(""); setFormIG(""); setFormTT(""); setFormNotes("");
      setShowForm(false);
    } catch {
      setError("Error fetching data");
    } finally {
      setAdding(false);
    }
  };

  const refreshClient = async (id: string) => {
    setRefreshingId(id);
    const client = clients.find(c => c.id === id);
    if (!client) { setRefreshingId(null); return; }

    const [igData, tiktokData] = await Promise.all([
      fetchIGData(client.igUsername),
      fetchTTData(client.tiktokUsername),
    ]);

    setClients(prev => prev.map(c =>
      c.id === id ? { ...c, igData: igData || c.igData, tiktokData: tiktokData || c.tiktokData, lastUpdated: Date.now() } : c
    ));
    setRefreshingId(null);
  };

  const deleteClient = (id: string) => {
    setClients(prev => prev.filter(c => c.id !== id));
    setCompareIds(prev => prev.filter(cid => cid !== id));
    if (expandedId === id) setExpandedId(null);
  };

  const refreshAll = async () => {
    for (const c of clients) { await refreshClient(c.id); }
  };

  const toggleCompare = (id: string) => {
    setCompareIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : prev.length < 3 ? [...prev, id] : prev);
  };

  const sorted = [...clients].sort((a, b) => (b.igData?.profile.followers || 0) - (a.igData?.profile.followers || 0));

  const totalFollowers = clients.reduce((s, c) => s + (c.igData?.profile.followers || 0), 0);
  const avgEngagement = clients.filter(c => c.igData).length > 0
    ? (clients.reduce((s, c) => s + (c.igData?.engagementRate || 0), 0) / clients.filter(c => c.igData).length).toFixed(2)
    : "0";

  return (
    <div>
      <Header title="Client Multi-Account" subtitle="Monitor client accounts — username only, no token required" />
      <div className="p-6 space-y-5">

        {/* Stats */}
        {clients.length > 0 && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              { label: "Total Clients", value: clients.length.toString(), icon: <Users className="w-4 h-4" />, color: "#F59E0B" },
              { label: "IG Followers total", value: formatNum(totalFollowers), icon: <Instagram className="w-4 h-4" />, color: IG },
              { label: "Avg. Engagement", value: `${avgEngagement}%`, icon: <TrendingUp className="w-4 h-4" />, color: "#10B981" },
              { label: "TT Followers total", value: formatNum(clients.reduce((s, c) => s + (c.tiktokData?.followers || 0), 0)), icon: <Zap className="w-4 h-4" />, color: TT },
            ].map(s => (
              <div key={s.label} className="rounded-xl p-4" style={cardStyle}>
                <div className="flex items-center gap-2 mb-1" style={{ color: s.color }}>{s.icon}<span className="text-xs">{s.label}</span></div>
                <p className="text-xl font-bold" style={{ color: "#292524" }}>{s.value}</p>
              </div>
            ))}
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex gap-2">
            {[
              { key: "list" as const, label: `Clients (${clients.length})`, icon: <Users className="w-3.5 h-3.5" /> },
              { key: "compare" as const, label: "Comparison", icon: <ArrowUpDown className="w-3.5 h-3.5" /> },
              { key: "digest" as const, label: "Weekly Digest", icon: <Zap className="w-3.5 h-3.5" /> },
            ].map(tab => (
              <button key={tab.key} type="button" onClick={() => setActiveTab(tab.key)}
                className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold"
                style={activeTab === tab.key
                  ? { backgroundColor: "rgba(225,48,108,0.1)", color: IG, border: `1px solid rgba(225,48,108,0.3)` }
                  : { ...cardStyle, color: "#78614E" }
                }>
                {tab.icon}{tab.label}
              </button>
            ))}
          </div>
          <div className="ml-auto flex gap-2">
            {clients.length > 0 && (
              <button type="button" onClick={refreshAll} disabled={refreshingId !== null}
                className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-semibold" style={{ ...cardStyle, color: "#78614E" }}>
                <RefreshCw className={`w-3.5 h-3.5 ${refreshingId ? "animate-spin" : ""}`} />
                Refresh All
              </button>
            )}
            <button type="button" onClick={() => { setShowForm(true); setError(""); }}
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold"
              style={{ backgroundColor: IG, color: "white" }}>
              <Plus className="w-4 h-4" />Add Client
            </button>
          </div>
        </div>

        {/* Add Form */}
        {showForm && (
          <div className="rounded-xl p-5" style={cardStyle}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold" style={{ color: "#292524" }}>Add New Client</h3>
              <button type="button" onClick={() => setShowForm(false)} style={{ color: "#A8967E" }}><X className="w-4 h-4" /></button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold mb-1" style={{ color: "#78614E" }}>Client Name *</label>
                <input type="text" placeholder="Ex: Brand XYZ SRL" value={formName} onChange={e => setFormName(e.target.value)}
                  className="w-full px-3 py-2.5 text-sm rounded-xl focus:outline-none"
                  style={{ border: "1px solid rgba(245,215,160,0.3)", backgroundColor: "#FFF8F0", color: "#292524" }} />
              </div>
              <div>
                <label className="flex items-center gap-1 text-xs font-semibold mb-1" style={{ color: IG }}>
                  <Instagram className="w-3 h-3" /> Username Instagram
                </label>
                <input type="text" placeholder="Ex: brandxyz" value={formIG} onChange={e => setFormIG(e.target.value)}
                  className="w-full px-3 py-2.5 text-sm rounded-xl focus:outline-none"
                  style={{ border: `1px solid ${IG}30`, backgroundColor: "#FFF8F0", color: "#292524" }} />
              </div>
              <div>
                <label className="flex items-center gap-1 text-xs font-semibold mb-1" style={{ color: TT }}>
                  <Zap className="w-3 h-3" /> Username TikTok
                </label>
                <input type="text" placeholder="Ex: brandxyz" value={formTT} onChange={e => setFormTT(e.target.value)}
                  className="w-full px-3 py-2.5 text-sm rounded-xl focus:outline-none"
                  style={{ border: `1px solid ${TT}30`, backgroundColor: "#FFF8F0", color: "#292524" }} />
              </div>
              <div>
                <label className="block text-xs font-semibold mb-1" style={{ color: "#78614E" }}>Note</label>
                <input type="text" placeholder="Ex: contract 2026, social media management" value={formNotes} onChange={e => setFormNotes(e.target.value)}
                  className="w-full px-3 py-2.5 text-sm rounded-xl focus:outline-none"
                  style={{ border: "1px solid rgba(245,215,160,0.3)", backgroundColor: "#FFF8F0", color: "#292524" }} />
              </div>
            </div>
            {error && <p className="text-xs mt-2 font-semibold" style={{ color: "#EF4444" }}>{error}</p>}
            <div className="flex gap-3 mt-4">
              <button type="button" onClick={addClient} disabled={adding || !formName.trim() || (!formIG.trim() && !formTT.trim())}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold disabled:opacity-40"
                style={{ backgroundColor: IG, color: "white" }}>
                {adding ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                {adding ? "Searching..." : "Add"}
              </button>
              <button type="button" onClick={() => setShowForm(false)}
                className="px-5 py-2.5 rounded-xl text-sm font-semibold"
                style={{ backgroundColor: "rgba(245,215,160,0.15)", color: "#78614E" }}>
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* Compare Tab */}
        {activeTab === "compare" && clients.length >= 2 && (
          <div className="rounded-xl overflow-hidden" style={cardStyle}>
            <div className="px-5 py-4" style={{ borderBottom: "1px solid rgba(245,215,160,0.2)" }}>
              <h3 className="font-semibold" style={{ color: "#292524" }}>Client Comparison</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-xs uppercase tracking-wide" style={{ backgroundColor: "rgba(245,215,160,0.1)", color: "#A8967E" }}>
                    <th className="text-left px-5 py-3">Client</th>
                    <th className="text-center px-3 py-3">IG Followers</th>
                    <th className="text-center px-3 py-3">IG Engagement</th>
                    <th className="text-center px-3 py-3">IG Posts</th>
                    <th className="text-center px-3 py-3">TT Followers</th>
                    <th className="text-center px-3 py-3">TT Likes</th>
                  </tr>
                </thead>
                <tbody>
                  {sorted.map(client => (
                    <tr key={client.id} style={{ borderTop: "1px solid rgba(245,215,160,0.15)" }}>
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-2">
                          {client.igData?.profile.avatar && (
                            <img src={proxyImg(client.igData.profile.avatar)} alt="" className="w-7 h-7 rounded-full object-cover" />
                          )}
                          <div>
                            <p className="font-semibold" style={{ color: "#292524" }}>{client.name}</p>
                            <div className="flex gap-2">
                              {client.igUsername && <span className="text-xs" style={{ color: IG }}>@{client.igUsername}</span>}
                              {client.tiktokUsername && <span className="text-xs" style={{ color: TT }}>@{client.tiktokUsername}</span>}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-3 py-3 text-center font-bold" style={{ color: "#292524" }}>{formatNum(client.igData?.profile.followers || 0)}</td>
                      <td className="px-3 py-3 text-center">
                        <span className="px-2 py-0.5 rounded-full text-xs font-bold"
                          style={{
                            backgroundColor: (client.igData?.engagementRate || 0) > 3 ? "rgba(16,185,129,0.1)" : "rgba(245,158,11,0.1)",
                            color: (client.igData?.engagementRate || 0) > 3 ? "#10B981" : "#F59E0B",
                          }}>{client.igData?.engagementRate || 0}%</span>
                      </td>
                      <td className="px-3 py-3 text-center" style={{ color: "#78614E" }}>{formatNum(client.igData?.profile.postsCount || 0)}</td>
                      <td className="px-3 py-3 text-center font-bold" style={{ color: "#292524" }}>{formatNum(client.tiktokData?.followers || 0)}</td>
                      <td className="px-3 py-3 text-center" style={{ color: "#78614E" }}>{formatNum(client.tiktokData?.likes || 0)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Weekly Digest Tab */}
        {activeTab === "digest" && (
          <WeeklyDigestPanel clients={clients} />
        )}

        {/* Client List */}
        {activeTab === "list" && (
          <>
            {clients.length === 0 && !showForm && (
              <div className="rounded-xl p-12 text-center" style={cardStyle}>
                <Users className="w-10 h-10 mx-auto mb-3" style={{ color: "#C4AA8A" }} />
                <p className="text-sm font-semibold mb-1" style={{ color: "#292524" }}>No clients added</p>
                <p className="text-xs mb-4" style={{ color: "#A8967E" }}>Add agency clients — username only, no OAuth token required</p>
                <button type="button" onClick={() => setShowForm(true)}
                  className="px-5 py-2.5 rounded-xl text-sm font-bold" style={{ backgroundColor: IG, color: "white" }}>
                  <Plus className="w-4 h-4 inline mr-1" />Add first client
                </button>
              </div>
            )}

            <div className="space-y-3">
              {sorted.map(client => {
                const expanded = expandedId === client.id;
                const isRefreshing = refreshingId === client.id;

                return (
                  <div key={client.id} className="rounded-xl overflow-hidden" style={cardStyle}>
                    {/* Header */}
                    <div className="flex items-center gap-3 px-5 py-4 cursor-pointer"
                      onClick={() => setExpandedId(expanded ? null : client.id)}>
                      <div className="w-12 h-12 rounded-full overflow-hidden flex-shrink-0" style={{ backgroundColor: `${IG}10` }}>
                        {client.igData?.profile.avatar ? (
                          <img src={proxyImg(client.igData.profile.avatar)} alt="" className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center"><Instagram className="w-5 h-5" style={{ color: IG }} /></div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <h3 className="text-sm font-bold" style={{ color: "#292524" }}>{client.name}</h3>
                          {client.igData?.profile.isVerified && <ShieldCheck className="w-4 h-4" style={{ color: "#3B82F6" }} />}
                        </div>
                        <div className="flex items-center gap-3">
                          {client.igUsername && <span className="text-xs" style={{ color: IG }}>@{client.igUsername}</span>}
                          {client.tiktokUsername && <span className="text-xs" style={{ color: TT }}>@{client.tiktokUsername}</span>}
                          {client.notes && <span className="text-xs" style={{ color: "#C4AA8A" }}>{client.notes}</span>}
                        </div>
                      </div>

                      <div className="hidden md:flex items-center gap-5">
                        {client.igData && (
                          <>
                            <div className="text-center">
                              <p className="text-xs" style={{ color: "#A8967E" }}>IG Followers</p>
                              <p className="text-sm font-bold" style={{ color: "#292524" }}>{formatNum(client.igData.profile.followers)}</p>
                            </div>
                            <div className="text-center">
                              <p className="text-xs" style={{ color: "#A8967E" }}>Engagement</p>
                              <p className="text-sm font-bold" style={{ color: client.igData.engagementRate > 3 ? "#10B981" : "#F59E0B" }}>
                                {client.igData.engagementRate}%
                              </p>
                            </div>
                          </>
                        )}
                        {client.tiktokData && (
                          <div className="text-center">
                            <p className="text-xs" style={{ color: "#A8967E" }}>TT Followers</p>
                            <p className="text-sm font-bold" style={{ color: "#292524" }}>{formatNum(client.tiktokData.followers)}</p>
                          </div>
                        )}
                      </div>

                      <div className="flex items-center gap-1 flex-shrink-0">
                        <button type="button"
                          onClick={e => { e.stopPropagation(); copyShareLink(client); }}
                          className="flex items-center gap-1 px-2 py-1.5 rounded-lg text-xs font-semibold transition-colors"
                          style={copiedId === client.id
                            ? { backgroundColor: "rgba(16,185,129,0.12)", color: "#10B981" }
                            : { backgroundColor: "rgba(245,215,160,0.15)", color: "#78614E" }
                          }
                          title="Copy share link">
                          <ExternalLink className="w-3 h-3" />
                          <span className="hidden sm:inline">{copiedId === client.id ? "Copied!" : "Share"}</span>
                        </button>
                        <button type="button" onClick={e => { e.stopPropagation(); refreshClient(client.id); }}
                          disabled={isRefreshing} className="p-1.5 rounded-lg" style={{ color: "#A8967E" }}>
                          <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? "animate-spin" : ""}`} />
                        </button>
                        <button type="button" onClick={e => { e.stopPropagation(); deleteClient(client.id); }}
                          className="p-1.5 rounded-lg" style={{ color: "#EF4444" }}>
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                        {expanded ? <ChevronUp className="w-4 h-4" style={{ color: "#A8967E" }} /> : <ChevronDown className="w-4 h-4" style={{ color: "#A8967E" }} />}
                      </div>
                    </div>

                    {/* Expanded */}
                    {expanded && (
                      <div className="px-5 pb-5 space-y-4" style={{ borderTop: "1px solid rgba(245,215,160,0.15)" }}>
                        {/* Stats */}
                        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3 pt-3">
                          {client.igData && [
                            { label: "IG Followers", value: formatNum(client.igData.profile.followers), color: IG },
                            { label: "IG Following", value: formatNum(client.igData.profile.following), color: IG },
                            { label: "IG Posts", value: formatNum(client.igData.profile.postsCount), color: IG },
                            { label: "IG Engagement", value: `${client.igData.engagementRate}%`, color: "#10B981" },
                          ].map(m => (
                            <div key={m.label} className="rounded-lg p-3" style={{ backgroundColor: `${m.color}08`, border: `1px solid ${m.color}15` }}>
                              <p className="text-[10px] uppercase tracking-wider" style={{ color: "#A8967E" }}>{m.label}</p>
                              <p className="text-lg font-bold mt-1" style={{ color: "#292524" }}>{m.value}</p>
                            </div>
                          ))}
                          {client.tiktokData && [
                            { label: "TT Followers", value: formatNum(client.tiktokData.followers), color: TT },
                            { label: "TT Total Likes", value: formatNum(client.tiktokData.likes), color: TT },
                          ].map(m => (
                            <div key={m.label} className="rounded-lg p-3" style={{ backgroundColor: `${m.color}08`, border: `1px solid ${m.color}15` }}>
                              <p className="text-[10px] uppercase tracking-wider" style={{ color: "#A8967E" }}>{m.label}</p>
                              <p className="text-lg font-bold mt-1" style={{ color: "#292524" }}>{m.value}</p>
                            </div>
                          ))}
                        </div>

                        {/* Bio */}
                        {client.igData?.profile.biography && (
                          <div className="rounded-lg p-3" style={{ backgroundColor: "rgba(245,215,160,0.06)" }}>
                            <p className="text-[10px] uppercase tracking-wider mb-1" style={{ color: "#A8967E" }}>Bio</p>
                            <p className="text-sm whitespace-pre-line" style={{ color: "#78614E" }}>{client.igData.profile.biography}</p>
                          </div>
                        )}

                        {/* Posts */}
                        {client.igData && client.igData.posts.length > 0 && (
                          <div>
                            <p className="text-xs font-semibold mb-2" style={{ color: "#A8967E" }}>Recent Posts ({client.igData.posts.length})</p>
                            <div className="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2">
                              {client.igData.posts.map(post => (
                                <a key={post.id} href={`https://instagram.com/p/${post.shortcode}`}
                                  target="_blank" rel="noopener noreferrer"
                                  className="relative aspect-square rounded-lg overflow-hidden group">
                                  <img src={proxyImg(post.thumbnail)} alt="" className="w-full h-full object-cover" />
                                  {post.isVideo && <div className="absolute top-1 right-1"><Video className="w-3 h-3 text-white drop-shadow" /></div>}
                                  <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                                    <span className="flex items-center gap-0.5 text-white text-xs font-semibold"><Heart className="w-3 h-3" />{formatNum(post.likes)}</span>
                                    <span className="flex items-center gap-0.5 text-white text-xs font-semibold"><MessageCircle className="w-3 h-3" />{formatNum(post.comments)}</span>
                                  </div>
                                </a>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Last updated */}
                        <p className="text-[10px]" style={{ color: "#C4AA8A" }}>
                          Last updated: {new Date(client.lastUpdated).toLocaleString("en-US")}
                        </p>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
