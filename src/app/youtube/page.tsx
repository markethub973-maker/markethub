"use client";

import { useEffect, useState } from "react";
import { Loader2, Youtube, Plus, Star, Trash2, BarChart2, TrendingUp, Eye, Users, Video, RefreshCw, X, ChevronDown, ChevronUp } from "lucide-react";

const RED    = "#EF4444";
const AMBER  = "var(--color-primary)";
const GREEN  = "#1DB954";
const YT_RED = "#FF0000";

interface Account {
  channel_id:      string;
  channel_name:    string;
  channel_handle:  string | null;
  thumbnail_url:   string | null;
  account_label:   string | null;
  is_primary:      boolean;
  connected_at:    string;
}

interface RecentVideo {
  id: string; title: string; thumbnail: string;
  views: number; likes: number; comments: number; published: string;
}

interface ChannelStats {
  channel_id:      string;
  channel_name:    string;
  channel_handle:  string | null;
  thumbnail_url:   string | null;
  account_label:   string | null;
  is_primary:      boolean;
  subscribers:     number;
  total_views:     number;
  video_count:     number;
  avg_views:       number;
  recent_videos:   RecentVideo[];
  engagement_rate: number;
}

interface CompareData {
  channels: ChannelStats[];
  winners:  Record<string, string | null>;
}

function fmt(n: number): string {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + "M";
  if (n >= 1_000)     return (n / 1_000).toFixed(1)     + "K";
  return String(n);
}

function fmtDate(iso: string): string {
  return new Date(iso).toLocaleDateString("ro-RO", { day: "2-digit", month: "short", year: "numeric" });
}

function WinnerBadge() {
  return (
    <span className="text-xs px-1.5 py-0.5 rounded-full font-bold"
      style={{ backgroundColor: `${AMBER}25`, color: AMBER }}>
      ★ Top
    </span>
  );
}

function StatCard({ label, value, winner }: { label: string; value: string; winner: boolean }) {
  return (
    <div className="rounded-xl px-4 py-3 text-center"
      style={{ backgroundColor: winner ? `${AMBER}10` : "rgba(255,255,255,0.03)", border: `1px solid ${winner ? AMBER + "40" : "rgba(255,255,255,0.08)"}` }}>
      <p className="text-xs mb-1" style={{ color: "#A8967E" }}>{label}</p>
      <p className="text-base font-bold" style={{ color: winner ? AMBER : "#fff" }}>{value}</p>
      {winner && <WinnerBadge />}
    </div>
  );
}

export default function YouTubePage() {
  const [accounts,     setAccounts]     = useState<Account[]>([]);
  const [compareData,  setCompareData]  = useState<CompareData | null>(null);
  const [loading,      setLoading]      = useState(true);
  const [comparing,    setComparing]    = useState(false);
  const [activeTab,    setActiveTab]    = useState<"channels" | "compare">("channels");
  const [expandedCh,   setExpandedCh]   = useState<string | null>(null);
  const [extraInput,   setExtraInput]   = useState("");
  const [extraIds,     setExtraIds]     = useState<string[]>([]);
  const [notice,       setNotice]       = useState("");

  const searchParams = typeof window !== "undefined" ? new URLSearchParams(window.location.search) : null;
  const justConnected = searchParams?.get("connected") === "1";
  const connectError  = searchParams?.get("error");

  useEffect(() => {
    fetchAccounts();
    if (justConnected) setNotice("Canal YouTube conectat cu succes!");
    if (connectError)  setNotice(`Connection error: ${connectError}`);
  }, []);

  const fetchAccounts = async () => {
    setLoading(true);
    const res  = await fetch("/api/youtube/accounts");
    const data = await res.json();
    setAccounts(data.accounts ?? []);
    setLoading(false);
  };

  const accountAction = async (channel_id: string, action: string, extra?: object) => {
    await fetch("/api/youtube/accounts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ channel_id, action, ...extra }),
    });
    fetchAccounts();
  };

  const runCompare = async () => {
    setComparing(true);
    setActiveTab("compare");
    const params = extraIds.length ? `?channels=${extraIds.join(",")}` : "";
    const res  = await fetch(`/api/youtube/compare${params}`);
    const data = await res.json();
    setCompareData(data);
    setComparing(false);
  };

  const addExtra = () => {
    const id = extraInput.trim();
    if (!id || extraIds.includes(id)) return;
    setExtraIds(prev => [...prev, id]);
    setExtraInput("");
  };

  const hasGoogle = true; // Google OAuth is always configured if GOOGLE_CLIENT_ID is set

  return (
    <div className="min-h-screen p-4 md:p-6" style={{ backgroundColor: "#1C1814", color: "var(--color-text)" }}>
      <div className="max-w-5xl mx-auto space-y-5">

        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center"
              style={{ backgroundColor: `${YT_RED}15`, border: `1px solid ${YT_RED}30` }}>
              <Youtube className="w-5 h-5" style={{ color: YT_RED }} />
            </div>
            <div>
              <h1 className="text-xl font-bold text-white">YouTube</h1>
              <p className="text-xs" style={{ color: "#A8967E" }}>Connect channels and compare performance</p>
            </div>
          </div>
          <a href="/api/auth/youtube/connect"
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all"
            style={{ backgroundColor: YT_RED, color: "#fff" }}>
            <Plus className="w-4 h-4" /> Add channel
          </a>
        </div>

        {/* Notice */}
        {notice && (
          <div className="flex items-center justify-between px-4 py-3 rounded-xl"
            style={{ backgroundColor: justConnected ? `${GREEN}15` : `${RED}15`, border: `1px solid ${justConnected ? GREEN : RED}30` }}>
            <p className="text-sm font-semibold" style={{ color: justConnected ? GREEN : RED }}>{notice}</p>
            <button onClick={() => setNotice("")}><X className="w-4 h-4" style={{ color: "#A8967E" }} /></button>
          </div>
        )}

        {/* Tabs */}
        <div className="flex gap-1 bg-white/5 rounded-xl p-1 w-fit">
          {(["channels", "compare"] as const).map(tab => (
            <button key={tab} type="button" onClick={() => setActiveTab(tab)}
              className="px-4 py-1.5 rounded-lg text-sm font-medium transition-all"
              style={activeTab === tab
                ? { background: `${YT_RED}25`, color: YT_RED }
                : { color: "#6b7280" }}>
              {tab === "channels" ? "📺 Channels" : "📊 Compare"}
            </button>
          ))}
        </div>

        {/* ── TAB: CHANNELS ─────────────────────────────────────────────────── */}
        {activeTab === "channels" && (
          <div className="space-y-4">
            {loading ? (
              <div className="flex justify-center py-16">
                <Loader2 className="w-6 h-6 animate-spin" style={{ color: YT_RED }} />
              </div>
            ) : accounts.length === 0 ? (
              <div className="rounded-2xl p-12 flex flex-col items-center gap-4 text-center"
                style={{ backgroundColor: "rgba(255,255,255,0.03)", border: "1px dashed rgba(255,255,255,0.1)" }}>
                <Youtube className="w-10 h-10" style={{ color: "#4B5563" }} />
                <div>
                  <p className="font-semibold text-white">No channels connected</p>
                  <p className="text-sm mt-1" style={{ color: "#6b7280" }}>
                    Click "Add channel" to connect your YouTube channel via Google OAuth.
                  </p>
                </div>
                <a href="/api/auth/youtube/connect"
                  className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold"
                  style={{ backgroundColor: YT_RED, color: "#fff" }}>
                  <Plus className="w-4 h-4" /> Connect first channel
                </a>
              </div>
            ) : (
              <>
                {accounts.map(acc => (
                  <div key={acc.channel_id} className="rounded-2xl overflow-hidden"
                    style={{ backgroundColor: "rgba(255,255,255,0.03)", border: `1px solid ${acc.is_primary ? YT_RED + "40" : "rgba(255,255,255,0.08)"}` }}>

                    {/* Account header */}
                    <div className="flex items-center gap-4 p-4">
                      {acc.thumbnail_url ? (
                        <img src={acc.thumbnail_url} alt={acc.channel_name}
                          className="w-12 h-12 rounded-full flex-shrink-0" />
                      ) : (
                        <div className="w-12 h-12 rounded-full flex-shrink-0 flex items-center justify-center"
                          style={{ backgroundColor: `${YT_RED}20` }}>
                          <Youtube className="w-6 h-6" style={{ color: YT_RED }} />
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="font-bold text-white truncate">{acc.account_label || acc.channel_name}</p>
                          {acc.is_primary && (
                            <span className="text-xs px-2 py-0.5 rounded-full font-bold flex-shrink-0"
                              style={{ backgroundColor: `${YT_RED}20`, color: YT_RED }}>Primary</span>
                          )}
                        </div>
                        {acc.channel_handle && (
                          <p className="text-xs" style={{ color: "#6b7280" }}>@{acc.channel_handle.replace("@","")}</p>
                        )}
                        <p className="text-xs" style={{ color: "#4B5563" }}>ID: {acc.channel_id}</p>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        {!acc.is_primary && (
                          <button onClick={() => accountAction(acc.channel_id, "set_primary")}
                            className="p-1.5 rounded-lg transition-all hover:bg-white/10" title="Set as primary">
                            <Star className="w-4 h-4" style={{ color: "#6b7280" }} />
                          </button>
                        )}
                        <button onClick={() => accountAction(acc.channel_id, "disconnect")}
                          className="p-1.5 rounded-lg transition-all hover:bg-red-500/10" title="Disconnect">
                          <Trash2 className="w-4 h-4" style={{ color: RED }} />
                        </button>
                        <button onClick={() => setExpandedCh(expandedCh === acc.channel_id ? null : acc.channel_id)}
                          className="p-1.5 rounded-lg transition-all hover:bg-white/10">
                          {expandedCh === acc.channel_id
                            ? <ChevronUp className="w-4 h-4" style={{ color: "#6b7280" }} />
                            : <ChevronDown className="w-4 h-4" style={{ color: "#6b7280" }} />}
                        </button>
                      </div>
                    </div>

                    {/* Expanded: rename */}
                    {expandedCh === acc.channel_id && (
                      <div className="px-4 pb-4 border-t" style={{ borderColor: "rgba(255,255,255,0.06)" }}>
                        <p className="text-xs font-semibold mt-3 mb-2" style={{ color: "#A8967E" }}>Custom label</p>
                        <div className="flex gap-2">
                          <input
                            defaultValue={acc.account_label ?? ""}
                            placeholder={acc.channel_name}
                            className="flex-1 px-3 py-1.5 rounded-lg text-sm focus:outline-none"
                            style={{ backgroundColor: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", color: "#fff" }}
                            id={`label-${acc.channel_id}`}
                          />
                          <button
                            onClick={() => {
                              const el = document.getElementById(`label-${acc.channel_id}`) as HTMLInputElement;
                              accountAction(acc.channel_id, "rename", { label: el.value });
                            }}
                            className="px-3 py-1.5 rounded-lg text-sm font-bold"
                            style={{ backgroundColor: `${YT_RED}20`, color: YT_RED }}>
                            Save
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                ))}

                {/* Compare button */}
                <button onClick={runCompare} disabled={comparing}
                  className="w-full flex items-center justify-center gap-2 py-3 rounded-xl font-bold transition-all disabled:opacity-60"
                  style={{ backgroundColor: `${YT_RED}15`, color: YT_RED, border: `1px solid ${YT_RED}30` }}>
                  {comparing ? <Loader2 className="w-4 h-4 animate-spin" /> : <BarChart2 className="w-4 h-4" />}
                  Compare all channels
                </button>
              </>
            )}
          </div>
        )}

        {/* ── TAB: COMPARE ──────────────────────────────────────────────────── */}
        {activeTab === "compare" && (
          <div className="space-y-5">

            {/* Add public channel */}
            <div className="rounded-2xl p-4 space-y-3"
              style={{ backgroundColor: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)" }}>
              <p className="text-sm font-bold text-white">Add competitor channel (public ID)</p>
              <p className="text-xs" style={{ color: "#6b7280" }}>
                Find the Channel ID on the channel's YouTube page → About → Scroll down → Share channel → Copy channel ID
              </p>
              <div className="flex gap-2">
                <input value={extraInput} onChange={e => setExtraInput(e.target.value)}
                  onKeyDown={e => e.key === "Enter" && addExtra()}
                  placeholder="ex: UCxxxxxxxxxxxxxxxxxxxxxx"
                  className="flex-1 px-3 py-2 rounded-lg text-sm focus:outline-none"
                  style={{ backgroundColor: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", color: "#fff" }} />
                <button onClick={addExtra}
                  className="px-4 py-2 rounded-lg text-sm font-bold"
                  style={{ backgroundColor: `${YT_RED}20`, color: YT_RED }}>
                  <Plus className="w-4 h-4" />
                </button>
              </div>
              {extraIds.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {extraIds.map(id => (
                    <span key={id} className="flex items-center gap-1 text-xs px-2 py-1 rounded-full"
                      style={{ backgroundColor: "rgba(255,255,255,0.08)", color: "#A8967E" }}>
                      {id.slice(0, 16)}...
                      <button onClick={() => setExtraIds(prev => prev.filter(x => x !== id))}>
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  ))}
                </div>
              )}
              <button onClick={runCompare} disabled={comparing || accounts.length === 0}
                className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl font-bold text-sm disabled:opacity-50"
                style={{ backgroundColor: YT_RED, color: "#fff" }}>
                {comparing ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
                {comparing ? "Loading..." : "Run comparison"}
              </button>
            </div>

            {/* Compare results */}
            {comparing && (
              <div className="flex justify-center py-12">
                <Loader2 className="w-8 h-8 animate-spin" style={{ color: YT_RED }} />
              </div>
            )}

            {compareData && !comparing && (
              <>
                {compareData.channels.length === 0 ? (
                  <p className="text-center py-8 text-sm" style={{ color: "#6b7280" }}>
                    No channels to compare. Connect at least one channel.
                  </p>
                ) : (
                  <div className="space-y-6">
                    {/* Winner summary */}
                    <div className="rounded-2xl p-4"
                      style={{ backgroundColor: `${AMBER}08`, border: `1px solid ${AMBER}25` }}>
                      <p className="text-sm font-bold mb-3" style={{ color: AMBER }}>★ Winners per category</p>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                        {[
                          { key: "subscribers",     label: "Subscribers",      icon: <Users className="w-3.5 h-3.5" /> },
                          { key: "avg_views",       label: "Avg. Views",       icon: <Eye className="w-3.5 h-3.5" /> },
                          { key: "engagement_rate", label: "Engagement",       icon: <TrendingUp className="w-3.5 h-3.5" /> },
                          { key: "total_views",     label: "Total views",      icon: <Video className="w-3.5 h-3.5" /> },
                        ].map(({ key, label, icon }) => {
                          const winnerId = compareData.winners[key];
                          const winner   = compareData.channels.find(c => c.channel_id === winnerId);
                          return (
                            <div key={key} className="rounded-xl p-3"
                              style={{ backgroundColor: "rgba(245,158,11,0.08)", border: "1px solid rgba(245,158,11,0.15)" }}>
                              <div className="flex items-center gap-1 mb-1" style={{ color: AMBER }}>
                                {icon}
                                <span className="text-xs font-semibold">{label}</span>
                              </div>
                              {winner ? (
                                <div className="flex items-center gap-2">
                                  {winner.thumbnail_url && (
                                    <img src={winner.thumbnail_url} className="w-6 h-6 rounded-full" alt="" />
                                  )}
                                  <p className="text-xs font-bold text-white truncate">
                                    {winner.account_label || winner.channel_name}
                                  </p>
                                </div>
                              ) : <p className="text-xs" style={{ color: "#6b7280" }}>—</p>}
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* Per-channel cards */}
                    {compareData.channels.map(ch => (
                      <div key={ch.channel_id} className="rounded-2xl overflow-hidden"
                        style={{ backgroundColor: "rgba(255,255,255,0.03)", border: `1px solid ${ch.is_primary ? YT_RED + "35" : "rgba(255,255,255,0.08)"}` }}>

                        {/* Channel header */}
                        <div className="flex items-center gap-3 p-4">
                          {ch.thumbnail_url
                            ? <img src={ch.thumbnail_url} alt={ch.channel_name} className="w-10 h-10 rounded-full flex-shrink-0" />
                            : <div className="w-10 h-10 rounded-full flex-shrink-0 flex items-center justify-center" style={{ backgroundColor: `${YT_RED}20` }}><Youtube className="w-5 h-5" style={{ color: YT_RED }} /></div>
                          }
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <p className="font-bold text-white truncate">{ch.account_label || ch.channel_name}</p>
                              {ch.is_primary && <span className="text-xs px-1.5 py-0.5 rounded-full flex-shrink-0" style={{ backgroundColor: `${YT_RED}20`, color: YT_RED }}>Primary</span>}
                            </div>
                            {ch.channel_handle && <p className="text-xs" style={{ color: "#6b7280" }}>@{ch.channel_handle.replace("@","")}</p>}
                          </div>
                        </div>

                        {/* Stats grid */}
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 px-4 pb-4">
                          <StatCard label="Subscribers"     value={fmt(ch.subscribers)}            winner={compareData.winners.subscribers === ch.channel_id} />
                          <StatCard label="Avg. Views"      value={fmt(ch.avg_views)}              winner={compareData.winners.avg_views === ch.channel_id} />
                          <StatCard label="Engagement"      value={ch.engagement_rate.toFixed(2) + "%"} winner={compareData.winners.engagement_rate === ch.channel_id} />
                          <StatCard label="Total views"     value={fmt(ch.total_views)}            winner={compareData.winners.total_views === ch.channel_id} />
                        </div>

                        {/* Recent videos */}
                        {ch.recent_videos.length > 0 && (
                          <div className="px-4 pb-4 border-t" style={{ borderColor: "rgba(255,255,255,0.06)" }}>
                            <p className="text-xs font-bold mt-3 mb-2" style={{ color: "#A8967E" }}>Recent videos</p>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                              {ch.recent_videos.slice(0, 4).map(v => (
                                <a key={v.id} href={`https://youtube.com/watch?v=${v.id}`} target="_blank" rel="noopener noreferrer"
                                  className="flex items-center gap-2 rounded-lg p-2 transition-all hover:bg-white/5">
                                  <img src={v.thumbnail} alt={v.title} className="w-16 h-9 rounded object-cover flex-shrink-0" />
                                  <div className="min-w-0">
                                    <p className="text-xs font-medium text-white truncate">{v.title}</p>
                                    <p className="text-xs" style={{ color: "#6b7280" }}>
                                      {fmt(v.views)} views · {fmt(v.likes)} likes · {fmtDate(v.published)}
                                    </p>
                                  </div>
                                </a>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
