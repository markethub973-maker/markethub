"use client";

import { useState, useMemo, useEffect } from "react";
import {
  Target, Plus, X, TrendingUp, DollarSign, BarChart3, Edit3, Trash2,
  ChevronDown, ChevronUp, ArrowUpRight, ArrowDownRight, Loader2,
  Instagram, Zap, RefreshCw, Heart, MessageCircle, Users, Eye, Image
} from "lucide-react";

type SocialData = {
  igFollowers?: number;
  igEngagement?: number;
  igPostsCount?: number;
  igRecentLikes?: number;
  igRecentComments?: number;
  ttFollowers?: number;
  ttLikes?: number;
  ttVideos?: number;
  lastFetched?: number;
};

type Campaign = {
  id: string;
  name: string;
  client: string;
  platform: string;
  status: "active" | "paused" | "completed" | "draft";
  budget: number;
  spent: number;
  startDate: string;
  endDate: string;
  impressions: number;
  clicks: number;
  conversions: number;
  revenue: number;
  notes: string;
  igUsername: string;
  tiktokUsername: string;
  socialData: SocialData;
};

const platformColors: Record<string, string> = {
  Instagram: "#E4405F",
  Facebook: "#1877F2",
  TikTok: "#00F2EA",
  Google: "#4285F4",
  LinkedIn: "#0A66C2",
  YouTube: "#FF0000",
  Twitter: "#1DA1F2",
  Multi: "var(--color-primary)",
};

const statusConfig: Record<string, { color: string; bg: string; label: string }> = {
  active: { color: "#10B981", bg: "rgba(16,185,129,0.1)", label: "Active" },
  paused: { color: "var(--color-primary)", bg: "rgba(245,158,11,0.1)", label: "Paused" },
  completed: { color: "#6366F1", bg: "rgba(99,102,241,0.1)", label: "Completed" },
  draft: { color: "#A8967E", bg: "rgba(168,150,126,0.1)", label: "Draft" },
};

const emptyForm: Omit<Campaign, "id"> = {
  name: "", client: "", platform: "Instagram", status: "draft",
  budget: 0, spent: 0, startDate: "", endDate: "",
  impressions: 0, clicks: 0, conversions: 0, revenue: 0, notes: "",
  igUsername: "", tiktokUsername: "", socialData: {},
};

function dbToUi(c: any): Campaign {
  return {
    id: c.id,
    name: c.name,
    client: c.client ?? "",
    platform: c.platform ?? "Instagram",
    status: c.status ?? "draft",
    budget: Number(c.budget ?? 0),
    spent: Number(c.spent ?? 0),
    startDate: c.start_date ?? "",
    endDate: c.end_date ?? "",
    impressions: Number(c.impressions ?? 0),
    clicks: Number(c.clicks ?? 0),
    conversions: Number(c.conversions ?? 0),
    revenue: Number(c.revenue ?? 0),
    notes: c.notes ?? "",
    igUsername: c.ig_username ?? "",
    tiktokUsername: c.tiktok_username ?? "",
    socialData: c.social_data ?? {},
  };
}

function proxyImg(url: string) {
  if (!url) return "";
  return `/api/image-proxy?url=${encodeURIComponent(url)}`;
}

export default function CampaignsPage() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loadingList, setLoadingList] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [filterPlatform, setFilterPlatform] = useState<string>("all");
  const [fetchingId, setFetchingId] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/campaigns")
      .then(r => r.json())
      .then(d => { if (d.campaigns) setCampaigns(d.campaigns.map(dbToUi)); })
      .finally(() => setLoadingList(false));
  }, []);

  const filtered = useMemo(() => {
    return campaigns.filter((c) => {
      if (filterStatus !== "all" && c.status !== filterStatus) return false;
      if (filterPlatform !== "all" && c.platform !== filterPlatform) return false;
      return true;
    });
  }, [campaigns, filterStatus, filterPlatform]);

  const totals = useMemo(() => {
    const active = campaigns.filter((c) => c.status === "active");
    return {
      totalBudget: campaigns.reduce((s, c) => s + c.budget, 0),
      totalSpent: campaigns.reduce((s, c) => s + c.spent, 0),
      totalRevenue: campaigns.reduce((s, c) => s + c.revenue, 0),
      totalConversions: campaigns.reduce((s, c) => s + c.conversions, 0),
      activeCampaigns: active.length,
      avgROI: campaigns.length
        ? ((campaigns.reduce((s, c) => s + c.revenue, 0) - campaigns.reduce((s, c) => s + c.spent, 0)) /
            Math.max(campaigns.reduce((s, c) => s + c.spent, 0), 1)) * 100
        : 0,
      totalIGFollowers: campaigns.reduce((s, c) => s + (c.socialData?.igFollowers || 0), 0),
      totalTTFollowers: campaigns.reduce((s, c) => s + (c.socialData?.ttFollowers || 0), 0),
    };
  }, [campaigns]);

  const openNew = () => { setForm(emptyForm); setEditId(null); setShowForm(true); };

  const openEdit = (c: Campaign) => {
    const { id, ...rest } = c;
    setForm(rest);
    setEditId(id);
    setShowForm(true);
  };

  const handleSave = async () => {
    if (!form.name.trim()) return;
    if (editId) {
      const res = await fetch("/api/campaigns", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: editId, ...form }),
      });
      const d = await res.json();
      if (d.campaign) setCampaigns(prev => prev.map(c => c.id === editId ? dbToUi(d.campaign) : c));
    } else {
      const res = await fetch("/api/campaigns", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const d = await res.json();
      if (d.campaign) setCampaigns(prev => [dbToUi(d.campaign), ...prev]);
    }
    setShowForm(false);
    setEditId(null);
  };

  const handleDelete = async (id: string) => {
    await fetch("/api/campaigns", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    setCampaigns(prev => prev.filter(c => c.id !== id));
  };

  const fetchSocialData = async (campaignId: string) => {
    const camp = campaigns.find(c => c.id === campaignId);
    if (!camp) return;
    setFetchingId(campaignId);

    const socialData: SocialData = { ...camp.socialData, lastFetched: Date.now() };

    try {
      // Fetch Instagram data
      if (camp.igUsername) {
        const igRes = await fetch(`/api/instagram-scraper?username=${encodeURIComponent(camp.igUsername.replace(/^@/, ""))}`);
        const igData = await igRes.json();
        if (!igData.error) {
          socialData.igFollowers = igData.profile.followers;
          socialData.igEngagement = igData.engagementRate;
          socialData.igPostsCount = igData.profile.postsCount;
          const totalLikes = igData.posts.reduce((s: number, p: any) => s + p.likes, 0);
          const totalComments = igData.posts.reduce((s: number, p: any) => s + p.comments, 0);
          socialData.igRecentLikes = totalLikes;
          socialData.igRecentComments = totalComments;
        }
      }

      // Fetch TikTok data
      if (camp.tiktokUsername) {
        const ttRes = await fetch(`/api/tiktok?q=${encodeURIComponent(camp.tiktokUsername.replace(/^@/, ""))}&count=5`);
        const ttData = await ttRes.json();
        if (!ttData.error && ttData.users?.length) {
          const user = ttData.users.find((u: any) =>
            u.uniqueId.toLowerCase() === camp.tiktokUsername.replace(/^@/, "").toLowerCase()
          ) || ttData.users[0];
          socialData.ttFollowers = user.followers;
          socialData.ttLikes = user.likes;
          socialData.ttVideos = user.videos;
        }
      }
    } catch { /* ignore */ }

    setCampaigns(prev => prev.map(c => c.id === campaignId ? { ...c, socialData } : c));
    // persist social data to Supabase
    fetch("/api/campaigns", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: campaignId, socialData }),
    }).catch(() => {});
    setFetchingId(null);
  };

  const fetchAllSocial = async () => {
    for (const c of campaigns) {
      if (c.igUsername || c.tiktokUsername) {
        await fetchSocialData(c.id);
      }
    }
  };

  const roi = (c: Campaign) => c.spent > 0 ? ((c.revenue - c.spent) / c.spent) * 100 : 0;
  const ctr = (c: Campaign) => c.impressions > 0 ? (c.clicks / c.impressions) * 100 : 0;
  const cpc = (c: Campaign) => c.clicks > 0 ? c.spent / c.clicks : 0;
  const cpa = (c: Campaign) => c.conversions > 0 ? c.spent / c.conversions : 0;

  const fmt = (n: number) => {
    if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + "M";
    if (n >= 1_000) return (n / 1_000).toFixed(1) + "K";
    return n.toLocaleString("en-US");
  };

  const fmtCurrency = (n: number) => "$" + n.toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 0 });

  const hasSocialLinks = campaigns.some(c => c.igUsername || c.tiktokUsername);

  return (
    <div className="min-h-screen p-6" style={{ backgroundColor: "var(--color-bg)", color: "var(--color-text)" }}>
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: "linear-gradient(135deg, #F59E0B, #EF4444)" }}>
                <Target className="w-5 h-5 text-white" />
              </div>
              Campaign Tracker
            </h1>
            <p className="text-sm mt-1" style={{ color: "#5C4A35" }}>
              Monitor campaigns with live data from Instagram and TikTok
            </p>
          </div>
          <div className="flex gap-2">
            {hasSocialLinks && (
              <button
                onClick={fetchAllSocial}
                disabled={fetchingId !== null}
                className="flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold transition-all"
                style={{ backgroundColor: "rgba(255,248,240,0.05)", border: "1px solid rgba(245,215,160,0.1)", color: "#A8967E" }}
              >
                <RefreshCw className={`w-4 h-4 ${fetchingId ? "animate-spin" : ""}`} />
                Sync date
              </button>
            )}
            <button
              onClick={openNew}
              className="flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-bold transition-all"
              style={{ background: "linear-gradient(135deg, var(--color-primary), var(--color-primary-hover))", color: "#1C1814" }}
            >
              <Plus className="w-4 h-4" />
              New Campaign
            </button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-3 mb-6">
          {[
            { label: "Active Campaigns", value: totals.activeCampaigns.toString(), icon: Target, color: "#10B981" },
            { label: "Total Budget", value: fmtCurrency(totals.totalBudget), icon: DollarSign, color: "var(--color-primary)" },
            { label: "Spent", value: fmtCurrency(totals.totalSpent), icon: DollarSign, color: "#EF4444" },
            { label: "Revenue", value: fmtCurrency(totals.totalRevenue), icon: TrendingUp, color: "#10B981" },
            { label: "Conversions", value: fmt(totals.totalConversions), icon: BarChart3, color: "#6366F1" },
            { label: "Avg ROI", value: totals.avgROI.toFixed(1) + "%", icon: TrendingUp, color: totals.avgROI >= 0 ? "#10B981" : "#EF4444" },
            { label: "IG Reach", value: fmt(totals.totalIGFollowers), icon: Instagram, color: "#E4405F" },
            { label: "TT Reach", value: fmt(totals.totalTTFollowers), icon: Zap, color: "#00F2EA" },
          ].map((s, i) => (
            <div key={i} className="rounded-xl p-4" style={{ backgroundColor: "white", border: "1px solid rgba(245,215,160,0.08)" }}>
              <div className="flex items-center gap-2 mb-2">
                <s.icon className="w-4 h-4" style={{ color: s.color }} />
                <span className="text-xs" style={{ color: "#5C4A35" }}>{s.label}</span>
              </div>
              <p className="text-lg font-bold" style={{ color: s.color }}>{s.value}</p>
            </div>
          ))}
        </div>

        {/* Filters */}
        <div className="flex gap-3 mb-4">
          <select title="Filter by status" value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}
            className="rounded-lg px-3 py-2 text-sm outline-none"
            style={{ backgroundColor: "white", border: "1px solid rgba(245,215,160,0.1)", color: "var(--color-text)" }}>
            <option value="all">All statuses</option>
            <option value="active">Active</option>
            <option value="paused">Paused</option>
            <option value="completed">Completed</option>
            <option value="draft">Draft</option>
          </select>
          <select title="Filter by platform" value={filterPlatform} onChange={(e) => setFilterPlatform(e.target.value)}
            className="rounded-lg px-3 py-2 text-sm outline-none"
            style={{ backgroundColor: "white", border: "1px solid rgba(245,215,160,0.1)", color: "var(--color-text)" }}>
            <option value="all">All platforms</option>
            {Object.keys(platformColors).map((p) => <option key={p} value={p}>{p}</option>)}
          </select>
        </div>

        {/* Campaign list */}
        <div className="space-y-3">
          {filtered.length === 0 && (
            <div className="rounded-xl p-12 flex flex-col items-center gap-4 text-center" style={{ backgroundColor: "white", border: "1px solid rgba(245,215,160,0.08)" }}>
              <Target className="w-8 h-8" style={{ color: "#A8967E" }} />
              <p className="text-sm" style={{ color: "#5C4A35" }}>
                {campaigns.length === 0 ? "No campaigns yet. Create your first campaign!" : "No campaigns found with the selected filters."}
              </p>
            </div>
          )}

          {filtered.map((c) => {
            const expanded = expandedId === c.id;
            const sc = statusConfig[c.status];
            const pc = platformColors[c.platform] || "var(--color-primary)";
            const budgetPct = c.budget > 0 ? Math.min((c.spent / c.budget) * 100, 100) : 0;
            const campaignRoi = roi(c);
            const isFetching = fetchingId === c.id;
            const hasSocial = c.igUsername || c.tiktokUsername;
            const sd = c.socialData || {};

            return (
              <div key={c.id} className="rounded-xl overflow-hidden" style={{ backgroundColor: "white", border: "1px solid rgba(245,215,160,0.08)" }}>
                {/* Campaign row */}
                <div className="flex items-center gap-4 p-4 cursor-pointer" onClick={() => setExpandedId(expanded ? null : c.id)}>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <h3 className="text-sm font-bold truncate" style={{ color: "var(--color-text)" }}>{c.name}</h3>
                      <span className="text-xs px-2 py-0.5 rounded-full shrink-0" style={{ backgroundColor: sc.bg, color: sc.color }}>{sc.label}</span>
                      <span className="text-xs px-2 py-0.5 rounded-full shrink-0" style={{ backgroundColor: `${pc}15`, color: pc }}>{c.platform}</span>
                      {c.igUsername && (
                        <span className="text-xs px-1.5 py-0.5 rounded-full flex items-center gap-0.5" style={{ backgroundColor: "rgba(228,64,95,0.1)", color: "#E4405F" }}>
                          <Instagram className="w-2.5 h-2.5" />@{c.igUsername}
                        </span>
                      )}
                      {c.tiktokUsername && (
                        <span className="text-xs px-1.5 py-0.5 rounded-full flex items-center gap-0.5" style={{ backgroundColor: "rgba(0,242,234,0.1)", color: "#00F2EA" }}>
                          <Zap className="w-2.5 h-2.5" />@{c.tiktokUsername}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-3 text-xs" style={{ color: "#5C4A35" }}>
                      {c.client && <span>{c.client}</span>}
                      <span>{c.startDate} - {c.endDate || "..."}</span>
                    </div>
                  </div>

                  <div className="hidden md:flex items-center gap-6 shrink-0">
                    <div className="text-right">
                      <p className="text-xs" style={{ color: "#5C4A35" }}>Budget</p>
                      <p className="text-sm font-bold" style={{ color: "#2D2620" }}>{fmtCurrency(c.budget)}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs" style={{ color: "#5C4A35" }}>Spent</p>
                      <p className="text-sm font-bold" style={{ color: budgetPct > 90 ? "#EF4444" : "var(--color-bg)" }}>{fmtCurrency(c.spent)}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs" style={{ color: "#5C4A35" }}>ROI</p>
                      <p className="text-sm font-bold flex items-center gap-1" style={{ color: campaignRoi >= 0 ? "#10B981" : "#EF4444" }}>
                        {campaignRoi >= 0 ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                        {campaignRoi.toFixed(1)}%
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-1 shrink-0">
                    {hasSocial && (
                      <button type="button" title="Sync social data" onClick={(e) => { e.stopPropagation(); fetchSocialData(c.id); }} disabled={isFetching}
                        className="p-2 rounded-lg" style={{ color: "#5C4A35" }}>
                        <RefreshCw className={`w-3.5 h-3.5 ${isFetching ? "animate-spin" : ""}`} />
                      </button>
                    )}
                    <button type="button" title="Edit campaign" onClick={(e) => { e.stopPropagation(); openEdit(c); }} className="p-2 rounded-lg" style={{ color: "#5C4A35" }}>
                      <Edit3 className="w-4 h-4" />
                    </button>
                    <button type="button" title="Delete campaign" onClick={(e) => { e.stopPropagation(); handleDelete(c.id); }} className="p-2 rounded-lg" style={{ color: "#EF4444" }}>
                      <Trash2 className="w-4 h-4" />
                    </button>
                    {expanded ? <ChevronUp className="w-4 h-4" style={{ color: "#A8967E" }} /> : <ChevronDown className="w-4 h-4" style={{ color: "#A8967E" }} />}
                  </div>
                </div>

                {/* Budget bar */}
                <div className="px-4 pb-2">
                  <div className="h-1.5 rounded-full overflow-hidden" style={{ backgroundColor: "rgba(255,248,240,0.05)" }}>
                    <div className="h-full rounded-full transition-all" style={{
                      width: `${budgetPct}%`,
                      background: budgetPct > 90 ? "linear-gradient(90deg, #EF4444, #DC2626)"
                        : budgetPct > 70 ? "linear-gradient(90deg, #F59E0B, #D97706)"
                        : "linear-gradient(90deg, #10B981, #059669)",
                    }} />
                  </div>
                  <div className="flex justify-between mt-1">
                    <span className="text-[10px]" style={{ color: "#6B5E50" }}>{budgetPct.toFixed(0)}% of budget</span>
                    <span className="text-[10px]" style={{ color: "#6B5E50" }}>{fmtCurrency(c.budget - c.spent)} remaining</span>
                  </div>
                </div>

                {/* Expanded details */}
                {expanded && (
                  <div className="px-4 pb-4 pt-2 space-y-4" style={{ borderTop: "1px solid rgba(245,215,160,0.06)" }}>
                    {/* Campaign metrics */}
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
                      {[
                        { label: "Impressions", value: fmt(c.impressions) },
                        { label: "Clicks", value: fmt(c.clicks) },
                        { label: "CTR", value: ctr(c).toFixed(2) + "%" },
                        { label: "CPC", value: "$" + cpc(c).toFixed(2) },
                        { label: "Conversions", value: fmt(c.conversions) },
                        { label: "CPA", value: "$" + cpa(c).toFixed(2) },
                      ].map((m, i) => (
                        <div key={i} className="rounded-lg p-3" style={{ backgroundColor: "rgba(255,248,240,0.03)" }}>
                          <p className="text-[10px] uppercase tracking-wider" style={{ color: "#6B5E50" }}>{m.label}</p>
                          <p className="text-sm font-bold mt-1" style={{ color: "var(--color-text)" }}>{m.value}</p>
                        </div>
                      ))}
                    </div>

                    {/* Social Data */}
                    {hasSocial && (sd.igFollowers || sd.ttFollowers) && (
                      <div>
                        <p className="text-xs font-semibold mb-2" style={{ color: "var(--color-primary)" }}>Live social media data</p>
                        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
                          {sd.igFollowers !== undefined && [
                            { label: "IG Followers", value: fmt(sd.igFollowers), icon: Users, color: "#E4405F" },
                            { label: "IG Engagement", value: (sd.igEngagement || 0).toFixed(2) + "%", icon: TrendingUp, color: "#10B981" },
                            { label: "IG Likes (recent)", value: fmt(sd.igRecentLikes || 0), icon: Heart, color: "#EF4444" },
                            { label: "IG Comments", value: fmt(sd.igRecentComments || 0), icon: MessageCircle, color: "#3B82F6" },
                          ].map((m, i) => (
                            <div key={i} className="rounded-lg p-3" style={{ backgroundColor: `${m.color}08`, border: `1px solid ${m.color}15` }}>
                              <div className="flex items-center gap-1 mb-1">
                                <m.icon className="w-3 h-3" style={{ color: m.color }} />
                                <p className="text-[10px] uppercase tracking-wider" style={{ color: "#5C4A35" }}>{m.label}</p>
                              </div>
                              <p className="text-sm font-bold" style={{ color: "var(--color-text)" }}>{m.value}</p>
                            </div>
                          ))}
                          {sd.ttFollowers !== undefined && [
                            { label: "TT Followers", value: fmt(sd.ttFollowers), icon: Users, color: "#00F2EA" },
                            { label: "TT Total Likes", value: fmt(sd.ttLikes || 0), icon: Heart, color: "#FF0050" },
                          ].map((m, i) => (
                            <div key={i} className="rounded-lg p-3" style={{ backgroundColor: `${m.color}08`, border: `1px solid ${m.color}15` }}>
                              <div className="flex items-center gap-1 mb-1">
                                <m.icon className="w-3 h-3" style={{ color: m.color }} />
                                <p className="text-[10px] uppercase tracking-wider" style={{ color: "#5C4A35" }}>{m.label}</p>
                              </div>
                              <p className="text-sm font-bold" style={{ color: "var(--color-text)" }}>{m.value}</p>
                            </div>
                          ))}
                        </div>
                        {sd.lastFetched && (
                          <p className="text-[10px] mt-2" style={{ color: "#6B5E50" }}>
                            Last synced: {new Date(sd.lastFetched).toLocaleString("en-US")}
                          </p>
                        )}
                      </div>
                    )}

                    {hasSocial && !sd.igFollowers && !sd.ttFollowers && (
                      <div className="rounded-lg p-4 text-center" style={{ backgroundColor: "rgba(245,158,11,0.05)", border: "1px solid rgba(245,158,11,0.15)" }}>
                        <p className="text-xs" style={{ color: "var(--color-primary)" }}>
                          Click <RefreshCw className="w-3 h-3 inline" /> to sync social media data
                        </p>
                      </div>
                    )}

                    {c.notes && (
                      <div className="rounded-lg p-3" style={{ backgroundColor: "rgba(255,248,240,0.03)" }}>
                        <p className="text-[10px] uppercase tracking-wider mb-1" style={{ color: "#6B5E50" }}>Note</p>
                        <p className="text-sm" style={{ color: "#5C4A35" }}>{c.notes}</p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Form Modal */}
        {showForm && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
            <div className="w-full max-w-2xl rounded-2xl p-6 max-h-[90vh] overflow-y-auto"
              style={{ backgroundColor: "#FFFCF7", border: "1px solid rgba(200,180,150,0.3)", boxShadow: "0 12px 40px rgba(120,97,78,0.15)" }}>
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-lg font-bold" style={{ color: "#2D2620" }}>
                  {editId ? "Edit Campaign" : "New Campaign"}
                </h2>
                <button type="button" title="Close" onClick={() => setShowForm(false)} className="p-1" style={{ color: "#78614E" }}><X className="w-5 h-5" /></button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Name */}
                <div className="md:col-span-2">
                  <label className="block text-xs font-medium mb-1" style={{ color: "#5C4A35" }}>Campaign name *</label>
                  <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })}
                    placeholder="Ex: Black Friday 2026"
                    className="w-full rounded-lg px-3 py-2.5 text-sm outline-none"
                    style={{ backgroundColor: "white", border: "1px solid rgba(200,180,150,0.25)", color: "#2D2620" }} />
                </div>

                {/* Client */}
                <div>
                  <label className="block text-xs font-medium mb-1" style={{ color: "#5C4A35" }}>Client</label>
                  <input value={form.client} onChange={(e) => setForm({ ...form, client: e.target.value })}
                    placeholder="Client name"
                    className="w-full rounded-lg px-3 py-2.5 text-sm outline-none"
                    style={{ backgroundColor: "white", border: "1px solid rgba(200,180,150,0.25)", color: "#2D2620" }} />
                </div>

                {/* Platform */}
                <div>
                  <label className="block text-xs font-medium mb-1" style={{ color: "#5C4A35" }}>Platform</label>
                  <select title="Platform" value={form.platform} onChange={(e) => setForm({ ...form, platform: e.target.value })}
                    className="w-full rounded-lg px-3 py-2.5 text-sm outline-none"
                    style={{ backgroundColor: "white", border: "1px solid rgba(200,180,150,0.25)", color: "#2D2620" }}>
                    {Object.keys(platformColors).map((p) => <option key={p} value={p}>{p}</option>)}
                  </select>
                </div>

                {/* Status */}
                <div>
                  <label className="block text-xs font-medium mb-1" style={{ color: "#5C4A35" }}>Status</label>
                  <select title="Status" value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value as Campaign["status"] })}
                    className="w-full rounded-lg px-3 py-2.5 text-sm outline-none"
                    style={{ backgroundColor: "white", border: "1px solid rgba(200,180,150,0.25)", color: "#2D2620" }}>
                    {Object.entries(statusConfig).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                  </select>
                </div>

                {/* IG Username */}
                <div>
                  <label className="flex items-center gap-1 text-xs font-medium mb-1" style={{ color: "#E4405F" }}>
                    <Instagram className="w-3 h-3" /> Username Instagram
                  </label>
                  <input value={form.igUsername} onChange={(e) => setForm({ ...form, igUsername: e.target.value })}
                    placeholder="Ex: nike"
                    className="w-full rounded-lg px-3 py-2.5 text-sm outline-none"
                    style={{ backgroundColor: "rgba(255,248,240,0.05)", border: "1px solid rgba(228,64,95,0.2)", color: "var(--color-text)" }} />
                </div>

                {/* TikTok Username */}
                <div>
                  <label className="flex items-center gap-1 text-xs font-medium mb-1" style={{ color: "#00F2EA" }}>
                    <Zap className="w-3 h-3" /> Username TikTok
                  </label>
                  <input value={form.tiktokUsername} onChange={(e) => setForm({ ...form, tiktokUsername: e.target.value })}
                    placeholder="Ex: nike"
                    className="w-full rounded-lg px-3 py-2.5 text-sm outline-none"
                    style={{ backgroundColor: "rgba(255,248,240,0.05)", border: "1px solid rgba(0,242,234,0.2)", color: "var(--color-text)" }} />
                </div>

                {/* Budget */}
                <div>
                  <label className="block text-xs font-medium mb-1" style={{ color: "#5C4A35" }}>Budget (USD)</label>
                  <input type="number" value={form.budget || ""} onChange={(e) => setForm({ ...form, budget: parseFloat(e.target.value) || 0 })}
                    placeholder="0" className="w-full rounded-lg px-3 py-2.5 text-sm outline-none"
                    style={{ backgroundColor: "white", border: "1px solid rgba(200,180,150,0.25)", color: "#2D2620" }} />
                </div>

                {/* Dates */}
                <div>
                  <label className="block text-xs font-medium mb-1" style={{ color: "#5C4A35" }}>Start date</label>
                  <input type="date" title="Start date" value={form.startDate} onChange={(e) => setForm({ ...form, startDate: e.target.value })}
                    className="w-full rounded-lg px-3 py-2.5 text-sm outline-none"
                    style={{ backgroundColor: "white", border: "1px solid rgba(200,180,150,0.25)", color: "#2D2620" }} />
                </div>
                <div>
                  <label className="block text-xs font-medium mb-1" style={{ color: "#5C4A35" }}>End date</label>
                  <input type="date" title="End date" value={form.endDate} onChange={(e) => setForm({ ...form, endDate: e.target.value })}
                    className="w-full rounded-lg px-3 py-2.5 text-sm outline-none"
                    style={{ backgroundColor: "white", border: "1px solid rgba(200,180,150,0.25)", color: "#2D2620" }} />
                </div>

                {/* Spent, Impressions, Clicks, Conversions, Revenue */}
                <div>
                  <label className="block text-xs font-medium mb-1" style={{ color: "#5C4A35" }}>Spent (USD)</label>
                  <input type="number" placeholder="0" value={form.spent || ""} onChange={(e) => setForm({ ...form, spent: parseFloat(e.target.value) || 0 })}
                    className="w-full rounded-lg px-3 py-2.5 text-sm outline-none"
                    style={{ backgroundColor: "white", border: "1px solid rgba(200,180,150,0.25)", color: "#2D2620" }} />
                </div>
                <div>
                  <label className="block text-xs font-medium mb-1" style={{ color: "#5C4A35" }}>Impressions</label>
                  <input type="number" placeholder="0" value={form.impressions || ""} onChange={(e) => setForm({ ...form, impressions: parseInt(e.target.value) || 0 })}
                    className="w-full rounded-lg px-3 py-2.5 text-sm outline-none"
                    style={{ backgroundColor: "white", border: "1px solid rgba(200,180,150,0.25)", color: "#2D2620" }} />
                </div>
                <div>
                  <label className="block text-xs font-medium mb-1" style={{ color: "#5C4A35" }}>Clicks</label>
                  <input type="number" placeholder="0" value={form.clicks || ""} onChange={(e) => setForm({ ...form, clicks: parseInt(e.target.value) || 0 })}
                    className="w-full rounded-lg px-3 py-2.5 text-sm outline-none"
                    style={{ backgroundColor: "white", border: "1px solid rgba(200,180,150,0.25)", color: "#2D2620" }} />
                </div>
                <div>
                  <label className="block text-xs font-medium mb-1" style={{ color: "#5C4A35" }}>Conversions</label>
                  <input type="number" placeholder="0" value={form.conversions || ""} onChange={(e) => setForm({ ...form, conversions: parseInt(e.target.value) || 0 })}
                    className="w-full rounded-lg px-3 py-2.5 text-sm outline-none"
                    style={{ backgroundColor: "white", border: "1px solid rgba(200,180,150,0.25)", color: "#2D2620" }} />
                </div>
                <div>
                  <label className="block text-xs font-medium mb-1" style={{ color: "#5C4A35" }}>Revenue (USD)</label>
                  <input type="number" placeholder="0" value={form.revenue || ""} onChange={(e) => setForm({ ...form, revenue: parseFloat(e.target.value) || 0 })}
                    className="w-full rounded-lg px-3 py-2.5 text-sm outline-none"
                    style={{ backgroundColor: "white", border: "1px solid rgba(200,180,150,0.25)", color: "#2D2620" }} />
                </div>

                {/* Notes */}
                <div className="md:col-span-2">
                  <label className="block text-xs font-medium mb-1" style={{ color: "#5C4A35" }}>Note</label>
                  <textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })}
                    rows={3} placeholder="Note despre campanie..."
                    className="w-full rounded-lg px-3 py-2.5 text-sm outline-none resize-none"
                    style={{ backgroundColor: "white", border: "1px solid rgba(200,180,150,0.25)", color: "#2D2620" }} />
                </div>
              </div>

              <div className="flex gap-3 mt-6">
                <button type="button" onClick={handleSave} disabled={!form.name.trim()}
                  className="flex-1 py-2.5 rounded-lg text-sm font-bold disabled:opacity-40"
                  style={{ background: "linear-gradient(135deg, var(--color-primary), var(--color-primary-hover))", color: "#1C1814" }}>
                  {editId ? "Save" : "Create campaign"}
                </button>
                <button type="button" onClick={() => setShowForm(false)}
                  className="px-6 py-2.5 rounded-lg text-sm font-medium"
                  style={{ backgroundColor: "rgba(255,248,240,0.05)", color: "#A8967E" }}>
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
