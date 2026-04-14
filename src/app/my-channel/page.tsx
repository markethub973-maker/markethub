"use client";

import { useState, useEffect, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import Header from "@/components/layout/Header";
import ABTitlesGenerator from "@/components/ui/ABTitlesGenerator";
import SentimentAnalysisCard from "@/components/ui/SentimentAnalysisCard";
import CommentFAQCard from "@/components/ui/CommentFAQCard";
import CategoryComparisonCard from "@/components/ui/CategoryComparisonCard";
import PlaylistStrategyCard from "@/components/ui/PlaylistStrategyCard";
import YoutubeAnalyticsCard from "@/components/ui/YoutubeAnalyticsCard";
import ExportButtons from "@/components/ui/ExportButtons";
import { formatNumber, formatDate, exportCSV, exportJSON } from "@/lib/utils";
import { Users, Eye, PlayCircle, ThumbsUp, MessageCircle, TrendingUp, Youtube, ChevronUp, ChevronDown, Search, Clock, Flame, Download } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from "recharts";

const cardStyle = { backgroundColor: "var(--color-bg-secondary)", border: "1px solid rgba(245,215,160,0.25)", boxShadow: "0 1px 3px rgba(120,97,78,0.08)" };

type Tab = "recent" | "popular" | "search";

export default function MyChannelPage() {
  const searchParams = useSearchParams();
  const [data, setData] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<Tab>("recent");
  const [searchQ, setSearchQ] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [sortKey, setSortKey] = useState<string>("publishedAt");
  const [expandedVideo, setExpandedVideo] = useState<string | null>(null);
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");

  const fetchData = useCallback((order: string, q?: string) => {
    setLoading(true);
    const params = new URLSearchParams({ order });
    if (q) params.set("q", q);
    fetch(`/api/youtube/my-channel?${params}`)
      .then(r => r.json())
      .then(d => { if (d.error) setError(d.error); else { setData(d); setError(null); } })
      .catch(() => setError("Connection error"))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { fetchData("date"); }, [fetchData]);

  // Handle ?q= from header search
  useEffect(() => {
    const q = searchParams.get("q");
    if (q) {
      setTab("search");
      setSearchInput(q);
      setSearchQ(q);
      fetchData("relevance", q);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  const switchTab = (t: Tab) => {
    setTab(t);
    setSortKey(t === "popular" ? "views" : "publishedAt");
    setSortDir("desc");
    if (t === "recent") fetchData("date");
    else if (t === "popular") fetchData("viewCount");
    else if (t === "search") fetchData("date");
  };

  const handleSearch = () => {
    setSearchQ(searchInput);
    fetchData("relevance", searchInput);
  };

  const handleSort = (key: string) => {
    if (sortKey === key) setSortDir(d => d === "asc" ? "desc" : "asc");
    else { setSortKey(key); setSortDir("desc"); }
  };

  const SortIcon = ({ col }: { col: string }) => {
    if (sortKey !== col) return <ChevronUp className="w-3 h-3 opacity-20" />;
    return sortDir === "asc" ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />;
  };

  if (error === "No channel connected") {
    return (
      <div>
        <Header title="My Channel" subtitle="YouTube channel statistics" />
        <div className="p-6">
          <div className="rounded-xl p-8 text-center" style={cardStyle}>
            <Youtube className="w-12 h-12 mx-auto mb-4" style={{ color: "#FF0000" }} />
            <h3 className="font-bold text-lg mb-2" style={{ color: "var(--color-text)" }}>Channel not connected</h3>
            <p className="text-sm mb-4" style={{ color: "#A8967E" }}>Go to Settings and add your YouTube Channel ID.</p>
            <a href="/settings" className="inline-flex px-5 py-2.5 rounded-lg text-sm font-bold" style={{ backgroundColor: "#FF0000", color: "white" }}>
              Go to Settings →
            </a>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div>
        <Header title="My Channel" subtitle="YouTube channel statistics" />
        <div className="p-6">
          <div className="rounded-xl p-6" style={cardStyle}>
            <p className="text-sm" style={{ color: "#dc2626" }}>Error: {error}</p>
          </div>
        </div>
      </div>
    );
  }

  const statCards = data ? [
    { icon: <Users className="w-4 h-4" />, label: "Subscribers", val: formatNumber(data.subscribers), color: "#FF0000" },
    { icon: <Eye className="w-4 h-4" />, label: "Total Views", val: formatNumber(data.totalViews), color: "var(--color-primary)" },
    { icon: <PlayCircle className="w-4 h-4" />, label: "Videos", val: formatNumber(data.videoCount), color: "#39D3B8" },
    { icon: <TrendingUp className="w-4 h-4" />, label: "Avg Views/Video", val: data.videoCount > 0 ? formatNumber(Math.round(data.totalViews / data.videoCount)) : "—", color: "#4F4DF0" },
  ] : [];

  const sortedVideos = data?.videos ? [...data.videos]
    .map((v: any) => ({ ...v, _er: v.views > 0 ? ((v.likes + v.comments) / v.views) * 100 : 0 }))
    .sort((a: any, b: any) => {
      const val = (x: any) => sortKey === "er" ? x._er : sortKey === "publishedAt" ? new Date(x.publishedAt).getTime() : x[sortKey];
      return sortDir === "asc" ? val(a) - val(b) : val(b) - val(a);
    }) : [];

  const chartData = data?.videos
    ? [...data.videos].sort((a: any, b: any) => b.views - a.views).slice(0, 8).map((v: any) => ({
        name: v.title.length > 20 ? v.title.slice(0, 20) + "…" : v.title,
        views: v.views,
      }))
    : [];

  const tabs: { key: Tab; label: string; icon: React.ReactNode }[] = [
    { key: "recent", label: "Recent", icon: <Clock className="w-3.5 h-3.5" /> },
    { key: "popular", label: "Most Viewed", icon: <Flame className="w-3.5 h-3.5" /> },
    { key: "search", label: "Search", icon: <Search className="w-3.5 h-3.5" /> },
  ];

  return (
    <div>
      <Header title="My Channel" subtitle="YouTube channel statistics" />
      <div className="p-6 space-y-6">

        {/* Channel Header */}
        {data && (
          <div className="rounded-xl p-5 flex items-center gap-4" style={cardStyle}>
            {data.thumbnail && <img src={data.thumbnail} alt="" className="w-16 h-16 rounded-full object-cover flex-shrink-0" />}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <Youtube className="w-4 h-4 flex-shrink-0" style={{ color: "#FF0000" }} />
                <h2 className="font-bold text-lg truncate" style={{ color: "var(--color-text)" }}>{data.name}</h2>
              </div>
              {data.description && <p className="text-xs line-clamp-2" style={{ color: "#A8967E" }}>{data.description}</p>}
              <p className="text-xs mt-1" style={{ color: "#C4AA8A" }}>
                On YouTube since {formatDate(data.publishedAt)}{data.country ? ` · ${data.country}` : ""}
              </p>
            </div>
            <a href={`https://www.youtube.com/channel/${data.id}`} target="_blank" rel="noopener noreferrer"
              className="px-4 py-2 rounded-lg text-xs font-bold flex-shrink-0" style={{ backgroundColor: "#FF0000", color: "white" }}>
              View Channel →
            </a>
          </div>
        )}

        {/* Stats */}
        {data && (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {statCards.map(s => (
              <div key={s.label} className="rounded-xl p-4" style={cardStyle}>
                <div className="flex items-center gap-2 mb-2" style={{ color: s.color }}>
                  {s.icon}
                  <span className="text-xs font-semibold" style={{ color: "#A8967E" }}>{s.label}</span>
                </div>
                <p className="text-2xl font-bold" style={{ color: "var(--color-text)" }}>{s.val}</p>
              </div>
            ))}
          </div>
        )}

        {/* Views Chart */}
        {chartData.length > 0 && (
          <div className="rounded-xl p-5" style={cardStyle}>
            <h3 className="font-semibold mb-4" style={{ color: "var(--color-text)" }}>Views per video (top 8)</h3>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={chartData} margin={{ top: 0, right: 0, left: 0, bottom: 40 }}>
                <XAxis dataKey="name" tick={{ fontSize: 10, fill: "#A8967E" }} angle={-30} textAnchor="end" interval={0} />
                <YAxis tick={{ fontSize: 10, fill: "#A8967E" }} tickFormatter={(v) => formatNumber(v)} />
                <Tooltip
                  formatter={(v: any) => [formatNumber(v), "Views"]}
                  contentStyle={{ backgroundColor: "var(--color-bg-secondary)", border: "1px solid rgba(245,215,160,0.35)", borderRadius: 8, fontSize: 12 }}
                />
                <Bar dataKey="views" radius={[4, 4, 0, 0]}>
                  {chartData.map((_: any, i: number) => (
                    <Cell key={i} fill={i === 0 ? "#FF0000" : i === 1 ? "var(--color-primary)" : "#E8C87A"} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Tabs + Videos */}
        <div className="rounded-xl overflow-hidden" style={cardStyle}>
          {/* Tab bar */}
          <div className="flex items-center gap-1 px-4 pt-4 pb-0" style={{ borderBottom: "1px solid rgba(245,215,160,0.2)" }}>
            {tabs.map(t => (
              <button key={t.key} type="button" onClick={() => switchTab(t.key)}
                className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-t-lg transition-colors"
                style={tab === t.key
                  ? { backgroundColor: "var(--color-bg-secondary)", color: "#FF0000", borderBottom: "2px solid #FF0000" }
                  : { color: "#A8967E" }}>
                {t.icon}{t.label}
              </button>
            ))}
            {sortedVideos.length > 0 && (
              <div className="ml-auto flex items-center gap-1 pr-2">
                <button type="button" onClick={() => exportCSV(
                  `my-channel-videos`,
                  ["#", "Titlu", "Views", "Likes", "Comentarii", "ER%", "Publicat", "URL"],
                  sortedVideos.map((v: any, i: number) => [i + 1, v.title, v.views, v.likes, v.comments, v._er?.toFixed(2), v.publishedAt, `https://youtube.com/watch?v=${v.id}`])
                )} className="flex items-center gap-1 px-2.5 py-1.5 rounded text-xs font-semibold"
                  style={{ backgroundColor: "rgba(255,0,0,0.08)", color: "#FF0000" }}>
                  <Download className="w-3 h-3" />CSV
                </button>
                <button type="button" onClick={() => exportJSON(`my-channel-videos`, { channel: data?.name, exportedAt: new Date().toISOString(), videos: sortedVideos })}
                  className="flex items-center gap-1 px-2.5 py-1.5 rounded text-xs font-semibold"
                  style={{ backgroundColor: "rgba(255,0,0,0.08)", color: "#FF0000" }}>
                  <Download className="w-3 h-3" />JSON
                </button>
              </div>
            )}
          </div>

          {/* Search input */}
          {tab === "search" && (
            <div className="px-5 py-3 flex gap-2" style={{ borderBottom: "1px solid rgba(245,215,160,0.15)" }}>
              <input
                type="text"
                value={searchInput}
                onChange={e => setSearchInput(e.target.value)}
                onKeyDown={e => e.key === "Enter" && handleSearch()}
                placeholder="Search your channel..."
                className="flex-1 px-3 py-2 text-sm rounded-lg focus:outline-none"
                style={{ border: "1px solid rgba(245,215,160,0.35)", backgroundColor: "var(--color-bg)", color: "var(--color-text)" }}
              />
              <button type="button" onClick={handleSearch}
                className="px-4 py-2 rounded-lg text-sm font-bold"
                style={{ backgroundColor: "#FF0000", color: "white" }}>
                Search
              </button>
            </div>
          )}

          {loading ? (
            <div className="px-5 py-10 text-center text-xs" style={{ color: "#C4AA8A" }}>Loading...</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-xs uppercase tracking-wide" style={{ backgroundColor: "rgba(245,215,160,0.1)", color: "#A8967E" }}>
                    <th className="text-left px-5 py-3">Video</th>
                    {[
                      { key: "views", label: "Views" },
                      { key: "likes", label: "Likes" },
                      { key: "comments", label: "Comments" },
                      { key: "er", label: "ER" },
                      { key: "publishedAt", label: "Published" },
                    ].map(col => (
                      <th key={col.key} className="text-right px-3 py-3 cursor-pointer select-none" onClick={() => handleSort(col.key)}>
                        <div className="flex items-center justify-end gap-1">{col.label}<SortIcon col={col.key} /></div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {sortedVideos.length === 0 ? (
                    <tr><td colSpan={6} className="px-5 py-8 text-center text-xs" style={{ color: "#C4AA8A" }}>No results</td></tr>
                  ) : sortedVideos.map((v: any) => {
                    const er = v._er.toFixed(1);
                    const isExpanded = expandedVideo === v.id;
                    return (
                      <>
                        <tr key={v.id} className="transition-colors cursor-pointer" style={{ borderTop: "1px solid rgba(245,215,160,0.15)" }}
                          onClick={() => setExpandedVideo(isExpanded ? null : v.id)}
                          onMouseEnter={e => (e.currentTarget.style.backgroundColor = "rgba(245,215,160,0.07)")}
                          onMouseLeave={e => (e.currentTarget.style.backgroundColor = isExpanded ? "rgba(245,215,160,0.10)" : "transparent")}>
                          <td className="px-5 py-3">
                            <div className="flex items-center gap-3">
                              <div className="relative w-20 h-11 rounded-md overflow-hidden flex-shrink-0" style={{ backgroundColor: "#EDE0C8" }}>
                                <img src={v.thumbnail} alt="" className="w-full h-full object-cover" />
                              </div>
                              <div className="min-w-0">
                                <p className="font-medium text-xs leading-tight max-w-[260px] truncate" style={{ color: "#3D2E1E" }}>{v.title}</p>
                                <p className="text-xs mt-0.5" style={{ color: "#C4AA8A" }}>Click to expand AI tools</p>
                              </div>
                            </div>
                          </td>
                          <td className="px-3 py-3 text-right font-medium text-xs" style={{ color: "#5C4A35" }}>{formatNumber(v.views)}</td>
                          <td className="px-3 py-3 text-right text-xs" style={{ color: "#A8967E" }}>
                            <div className="flex items-center justify-end gap-1"><ThumbsUp className="w-3 h-3" />{formatNumber(v.likes)}</div>
                          </td>
                          <td className="px-3 py-3 text-right text-xs" style={{ color: "#A8967E" }}>
                            <div className="flex items-center justify-end gap-1"><MessageCircle className="w-3 h-3" />{formatNumber(v.comments)}</div>
                          </td>
                          <td className="px-3 py-3 text-right">
                            <span className="text-xs font-semibold px-1.5 py-0.5 rounded" style={{ backgroundColor: "rgba(245,158,11,0.12)", color: "var(--color-primary-hover)" }}>{er}%</span>
                          </td>
                          <td className="px-5 py-3 text-right text-xs" style={{ color: "#C4AA8A" }}>{formatDate(v.publishedAt)}</td>
                        </tr>
                        {isExpanded && (
                          <tr key={`${v.id}-expanded`} style={{ backgroundColor: "rgba(245,215,160,0.05)", borderTop: "1px solid rgba(245,215,160,0.15)" }}>
                            <td colSpan={6} className="px-5 py-4">
                              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                                {/* Sentiment Analysis */}
                                <SentimentAnalysisCard
                                  youtubeVideoId={v.id}
                                  platform="YouTube"
                                  contentTitle={v.title}
                                />
                                {/* A/B Title Generator */}
                                <ABTitlesGenerator
                                  platform="YouTube"
                                  defaultTitle={v.title}
                                  defaultNiche="YouTube"
                                />
                                {/* Comment FAQ Extractor */}
                                <div className="lg:col-span-2">
                                  <CommentFAQCard
                                    youtubeVideoId={v.id}
                                    videoTitle={v.title}
                                  />
                                </div>
                              </div>
                            </td>
                          </tr>
                        )}
                      </>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* A/B Title Generator */}
          <div className="mt-6">
            <ABTitlesGenerator platform="YouTube" defaultNiche="YouTube channel" />
          </div>

          {/* Export top videos */}
          {sortedVideos.length > 0 && (
            <div className="flex justify-end mt-4">
              <ExportButtons
                filename="my-channel-videos"
                sheets={[{
                  name: "Top Videos",
                  headers: ["Title", "Views", "Likes", "Comments", "Published Date"],
                  rows: sortedVideos.map((v: { title: string; views: number; likes: number; comments: number; publishedAt: string }) => [v.title, v.views, v.likes, v.comments, v.publishedAt]),
                }]}
              />
            </div>
          )}

        </div>

        {/* YouTube Analytics */}
        <div
          className="rounded-xl p-5"
          style={{ backgroundColor: "var(--color-bg-secondary)", border: "1px solid rgba(245,215,160,0.25)", boxShadow: "0 1px 3px rgba(120,97,78,0.08)" }}
        >
          <YoutubeAnalyticsCard />
        </div>

        {/* Category Comparison + Playlist Strategy */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <CategoryComparisonCard channelId={data?.id} niche="" />
          <PlaylistStrategyCard channelId={data?.id} />
        </div>

      </div>
    </div>
  );
}
