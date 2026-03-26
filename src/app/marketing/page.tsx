"use client";

import { useState, useEffect } from "react";
import Header from "@/components/layout/Header";
import { formatNumber } from "@/lib/utils";
import {
  Users, Eye, TrendingUp, ThumbsUp, MessageCircle, PlayCircle,
  RefreshCw, BarChart2, Clock, Star, AlertCircle, Instagram
} from "lucide-react";
import {
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  BarChart, Bar, Cell, PieChart, Pie
} from "recharts";

const cardStyle = { backgroundColor: "#FFFCF7", border: "1px solid rgba(245,215,160,0.25)", boxShadow: "0 1px 3px rgba(120,97,78,0.08)" };
const YT = "#FF0000";
const FB = "#1877F2";
const IG = "#E1306C";
const AMBER = "#F59E0B";

function StatCard({ label, value, sub, color, icon: Icon }: { label: string; value: string | number; sub?: string; color: string; icon: any }) {
  return (
    <div className="rounded-xl p-4" style={cardStyle}>
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-semibold" style={{ color: "#A8967E" }}>{label}</span>
        <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ backgroundColor: color + "18" }}>
          <Icon className="w-3.5 h-3.5" style={{ color }} />
        </div>
      </div>
      <p className="text-2xl font-bold" style={{ color: "#292524" }}>{value}</p>
      {sub && <p className="text-xs mt-1" style={{ color: "#A8967E" }}>{sub}</p>}
    </div>
  );
}

function EngBadge({ rate }: { rate: number }) {
  const color = rate >= 5 ? "#1DB954" : rate >= 2 ? AMBER : rate >= 0.5 ? "#F59E0B" : "#EF4444";
  const label = rate >= 5 ? "Excellent" : rate >= 2 ? "Good" : rate >= 0.5 ? "Average" : "Poor";
  return (
    <span className="text-xs font-bold px-2 py-0.5 rounded-full" style={{ backgroundColor: color + "18", color }}>
      {rate.toFixed(2)}% — {label}
    </span>
  );
}

function timeAgo(ts: string) {
  const diff = (Date.now() - new Date(ts).getTime()) / 1000;
  if (diff < 3600) return `${Math.floor(diff / 60)}m`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h`;
  return `${Math.floor(diff / 86400)}d`;
}

export default function MarketingPage() {
  const [ytChannel, setYtChannel] = useState<any>(null);
  const [ytTrending, setYtTrending] = useState<any[]>([]);
  const [igData, setIgData] = useState<any>(null);
  const [fbData, setFbData] = useState<any>(null);
  const [trends, setTrends] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"overview" | "youtube" | "insights">("overview");

  const load = () => {
    setLoading(true);
    Promise.all([
      fetch("/api/youtube/my-channel").then(r => r.json()).catch(() => null),
      fetch("/api/youtube/trending?region=RO&max=12").then(r => r.json()).catch(() => []),
      fetch("/api/instagram/analytics").then(r => r.json()).catch(() => null),
      fetch("/api/facebook/page").then(r => r.json()).catch(() => null),
      fetch("/api/trends").then(r => r.json()).catch(() => []),
    ]).then(([yt, trending, ig, fb, tr]) => {
      if (yt && !yt.error) setYtChannel(yt);
      if (Array.isArray(trending)) setYtTrending(trending);
      if (ig && !ig.error) setIgData(ig);
      if (fb && !fb.error) setFbData(fb);
      if (Array.isArray(tr)) setTrends(tr);
    }).finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  // YouTube metrics
  const ytVideos = ytChannel?.videos || [];
  const ytTotalViews = ytVideos.reduce((s: number, v: any) => s + v.views, 0);
  const ytTotalLikes = ytVideos.reduce((s: number, v: any) => s + v.likes, 0);
  const ytTotalComments = ytVideos.reduce((s: number, v: any) => s + v.comments, 0);
  const ytAvgER = ytVideos.length > 0
    ? ytVideos.reduce((s: number, v: any) => s + (v.views > 0 ? (v.likes + v.comments) / v.views * 100 : 0), 0) / ytVideos.length
    : 0;

  // Trending metrics
  const trendingViews = ytTrending.reduce((s, v) => s + (v.views || 0), 0);
  const trendingLikes = ytTrending.reduce((s, v) => s + (v.likes || 0), 0);

  // Chart: video performance (bar chart)
  const videoChartData = ytVideos.slice(0, 8).map((v: any) => ({
    name: v.title.length > 20 ? v.title.substring(0, 20) + "..." : v.title,
    views: v.views,
    likes: v.likes,
    er: v.views > 0 ? +((v.likes + v.comments) / v.views * 100).toFixed(2) : 0,
  }));

  // Platform distribution pie
  const platformData = [
    { name: "YouTube", value: ytChannel?.subscribers || 0, color: YT },
    ...(igData ? [{ name: "Instagram", value: igData.followers_count || 0, color: IG }] : []),
    ...(fbData ? [{ name: "Facebook", value: fbData.fan_count || fbData.followers_count || 0, color: FB }] : []),
  ].filter(d => d.value > 0);

  // Best performing video
  const bestVideo = ytVideos.length > 0
    ? [...ytVideos].sort((a: any, b: any) => b.views - a.views)[0]
    : null;

  // Day of week analysis
  const dayStats = ytVideos.reduce((acc: any, v: any) => {
    const day = new Date(v.publishedAt).toLocaleDateString("en-US", { weekday: "short" });
    if (!acc[day]) acc[day] = { views: 0, count: 0 };
    acc[day].views += v.views;
    acc[day].count += 1;
    return acc;
  }, {});
  const bestDays = Object.entries(dayStats)
    .map(([day, d]: any) => ({ day, avg: d.views / d.count }))
    .sort((a, b) => b.avg - a.avg);

  const hasAnyData = ytChannel || ytTrending.length > 0 || igData || fbData;

  if (loading) {
    return (
      <div>
        <Header title="Marketing Analytics" subtitle="YouTube · Facebook · Instagram — cross-platform data" />
        <div className="p-6 flex items-center justify-center h-64">
          <p className="text-sm" style={{ color: "#C4AA8A" }}>Loading data...</p>
        </div>
      </div>
    );
  }

  if (!hasAnyData) {
    return (
      <div>
        <Header title="Marketing Analytics" subtitle="YouTube · Facebook · Instagram — cross-platform data" />
        <div className="p-6">
          <div className="rounded-xl p-8 text-center" style={cardStyle}>
            <AlertCircle className="w-12 h-12 mx-auto mb-4" style={{ color: "rgba(239,68,68,0.4)" }} />
            <p className="font-semibold text-lg mb-2" style={{ color: "#292524" }}>No channel connected</p>
            <p className="text-sm mb-6" style={{ color: "#A8967E" }}>
              Add your YouTube Channel ID from Settings to see marketing data.
            </p>
            <a href="/settings" className="inline-flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-bold"
              style={{ backgroundColor: AMBER, color: "#1C1814" }}>
              Configure in Settings
            </a>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div>
      <Header title="Marketing Analytics" subtitle="YouTube · Facebook · Instagram — cross-platform data" />
      <div className="p-6 space-y-5">

        {/* Channel Header */}
        {ytChannel && (
          <div className="rounded-xl p-5" style={cardStyle}>
            <div className="flex items-start gap-4">
              {ytChannel.thumbnail && (
                <img src={ytChannel.thumbnail} alt="" className="w-16 h-16 rounded-full object-cover flex-shrink-0"
                  style={{ border: `3px solid ${YT}` }} />
              )}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-3 flex-wrap">
                  <a href={`https://youtube.com/channel/${ytChannel.id}`} target="_blank" rel="noopener noreferrer"
                    className="flex items-center gap-1.5 font-bold text-lg hover:underline" style={{ color: "#292524" }}>
                    <svg className="w-4 h-4" viewBox="0 0 24 24" fill={YT}><path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/></svg>
                    {ytChannel.name}
                  </a>
                  {igData && (
                    <span className="text-xs font-semibold px-2 py-1 rounded-full"
                      style={{ backgroundColor: IG + "15", color: IG }}>
                      IG: @{igData.username}
                    </span>
                  )}
                  {fbData && (
                    <span className="text-xs font-semibold px-2 py-1 rounded-full"
                      style={{ backgroundColor: FB + "15", color: FB }}>
                      FB: {fbData.name}
                    </span>
                  )}
                  <button type="button" onClick={load}
                    className="ml-auto flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold"
                    style={{ backgroundColor: "rgba(245,215,160,0.15)", color: "#78614E" }}>
                    <RefreshCw className="w-3 h-3" /> Refresh
                  </button>
                </div>
                {ytChannel.description && (
                  <p className="text-sm mt-1 line-clamp-2" style={{ color: "#78614E" }}>{ytChannel.description}</p>
                )}
                <div className="flex items-center gap-1 mt-2">
                  <EngBadge rate={ytAvgER} />
                  <span className="text-xs ml-2" style={{ color: "#A8967E" }}>average YouTube engagement rate</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Tabs */}
        <div className="flex gap-1 p-1 rounded-xl w-fit" style={{ backgroundColor: "rgba(245,215,160,0.1)", border: "1px solid rgba(245,215,160,0.25)" }}>
          {([
            ["overview", "Campaign Summary"],
            ["youtube", "YouTube Analytics"],
            ["insights", "Cross-Platform"],
          ] as const).map(([t, label]) => (
            <button key={t} type="button" onClick={() => setActiveTab(t)}
              className="px-4 py-2 text-sm font-semibold rounded-lg transition-all"
              style={activeTab === t ? { backgroundColor: AMBER, color: "#1C1814" } : { color: "#78614E" }}>
              {label}
            </button>
          ))}
        </div>

        {/* TAB: OVERVIEW */}
        {activeTab === "overview" && (
          <div className="space-y-5">
            {/* KPI Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <StatCard
                label="YouTube Subscribers"
                value={ytChannel ? formatNumber(ytChannel.subscribers) : "—"}
                sub={ytChannel ? `${formatNumber(ytChannel.videoCount)} videos` : undefined}
                color={YT} icon={Users}
              />
              <StatCard
                label="Total Channel Views"
                value={ytChannel ? formatNumber(ytChannel.totalViews) : "—"}
                sub="since channel creation"
                color={AMBER} icon={Eye}
              />
              <StatCard
                label="Recent Views"
                value={ytVideos.length > 0 ? formatNumber(ytTotalViews) : "—"}
                sub={`last ${ytVideos.length} videos`}
                color="#8B5CF6" icon={TrendingUp}
              />
              <StatCard
                label={igData ? "Followers Instagram" : fbData ? "Followers Facebook" : "Trending RO"}
                value={igData ? formatNumber(igData.followers_count) : fbData ? formatNumber(fbData.followers_count || fbData.fan_count) : formatNumber(trendingViews)}
                sub={igData ? `${igData.media_count} posts` : fbData ? fbData.name : `${ytTrending.length} trending videos`}
                color={igData ? IG : fbData ? FB : YT} icon={igData ? Instagram : Users}
              />
            </div>

            {/* Best Days + Platform Distribution */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {/* Best days to post */}
              <div className="rounded-xl p-5" style={cardStyle}>
                <div className="flex items-center gap-2 mb-4">
                  <Clock className="w-4 h-4" style={{ color: YT }} />
                  <h3 className="font-semibold" style={{ color: "#292524" }}>Best days to post</h3>
                </div>
                {bestDays.length > 0 ? (
                  <div className="space-y-2">
                    {bestDays.map((d, i) => (
                      <div key={d.day} className="flex items-center gap-3">
                        <span className="text-xs font-bold w-4" style={{ color: i === 0 ? YT : "#C4AA8A" }}>{i + 1}</span>
                        <span className="text-sm w-12" style={{ color: "#292524" }}>{d.day}</span>
                        <div className="flex-1 h-2 rounded-full overflow-hidden" style={{ backgroundColor: "rgba(255,0,0,0.1)" }}>
                          <div className="h-full rounded-full" style={{ width: `${(d.avg / bestDays[0].avg) * 100}%`, backgroundColor: YT }} />
                        </div>
                        <span className="text-xs w-20 text-right" style={{ color: "#A8967E" }}>{formatNumber(Math.round(d.avg))} views</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm" style={{ color: "#C4AA8A" }}>Insufficient data — add Channel ID from Settings.</p>
                )}
              </div>

              {/* Platform Distribution */}
              <div className="rounded-xl p-5" style={cardStyle}>
                <div className="flex items-center gap-2 mb-4">
                  <BarChart2 className="w-4 h-4" style={{ color: AMBER }} />
                  <h3 className="font-semibold" style={{ color: "#292524" }}>Follower distribution by platform</h3>
                </div>
                {platformData.length > 0 ? (
                  <div className="flex items-center gap-4">
                    <ResponsiveContainer width={120} height={120}>
                      <PieChart>
                        <Pie data={platformData} dataKey="value" innerRadius={30} outerRadius={55}>
                          {platformData.map((d, i) => <Cell key={i} fill={d.color} />)}
                        </Pie>
                      </PieChart>
                    </ResponsiveContainer>
                    <div className="space-y-2">
                      {platformData.map(d => (
                        <div key={d.name} className="flex items-center gap-2">
                          <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: d.color }} />
                          <span className="text-sm" style={{ color: "#292524" }}>{d.name}</span>
                          <span className="text-sm font-bold ml-auto" style={{ color: "#A8967E" }}>{formatNumber(d.value)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <p className="text-sm" style={{ color: "#C4AA8A" }}>Connect at least one platform.</p>
                )}
              </div>
            </div>

            {/* Campaign Recommendations */}
            <div className="rounded-xl p-5" style={cardStyle}>
              <div className="flex items-center gap-2 mb-4">
                <Star className="w-4 h-4" style={{ color: AMBER }} />
                <h3 className="font-semibold" style={{ color: "#292524" }}>Campaign recommendations</h3>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {[
                  {
                    title: "Engagement Rate",
                    text: ytAvgER >= 5
                      ? `ER of ${ytAvgER.toFixed(1)}% is excellent — the audience is very active. Ideal for sponsorships.`
                      : ytAvgER >= 2
                      ? `ER of ${ytAvgER.toFixed(1)}% is good. Increase interaction through questions and call-to-actions in your videos.`
                      : ytAvgER > 0
                      ? `ER of ${ytAvgER.toFixed(1)}% is below average. Focus on content that generates comments.`
                      : "Connect your YouTube channel from Settings.",
                    color: ytAvgER >= 5 ? "#1DB954" : ytAvgER >= 2 ? AMBER : "#EF4444",
                  },
                  {
                    title: "Posting Frequency",
                    text: ytChannel
                      ? `You have ${formatNumber(ytChannel.videoCount)} videos on your channel. ${ytChannel.videoCount < 50 ? "Increase frequency to 2-3 videos/week." : "Frequency is good — maintain consistency."}`
                      : "Connect your YouTube channel from Settings.",
                    color: YT,
                  },
                  {
                    title: "Cross-Platform",
                    text: platformData.length >= 3
                      ? "Present on 3 platforms! Make sure you repurpose YouTube content on Instagram Reels and Facebook."
                      : platformData.length === 2
                      ? "You're on 2 platforms. Add a third for maximum reach."
                      : "You're on just one platform. Expand to Instagram and Facebook for more visibility.",
                    color: "#8B5CF6",
                  },
                ].map((r, i) => (
                  <div key={i} className="rounded-lg p-3" style={{ backgroundColor: r.color + "08", border: `1px solid ${r.color}20` }}>
                    <p className="text-xs font-bold mb-1.5" style={{ color: r.color }}>{r.title}</p>
                    <p className="text-xs leading-relaxed" style={{ color: "#78614E" }}>{r.text}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* TAB: YOUTUBE ANALYTICS */}
        {activeTab === "youtube" && (
          <div className="space-y-5">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <StatCard label="Recent Views" value={formatNumber(ytTotalViews)} sub={`${ytVideos.length} videos`} color={YT} icon={Eye} />
              <StatCard label="Recent Likes" value={formatNumber(ytTotalLikes)} color={AMBER} icon={ThumbsUp} />
              <StatCard label="Comments" value={formatNumber(ytTotalComments)} color="#8B5CF6" icon={MessageCircle} />
              <StatCard label="Avg ER" value={`${ytAvgER.toFixed(2)}%`} sub="engagement rate" color="#1DB954" icon={TrendingUp} />
            </div>

            {/* Video Performance Chart */}
            {videoChartData.length > 0 && (
              <div className="rounded-xl p-5" style={cardStyle}>
                <h3 className="font-semibold mb-4" style={{ color: "#292524" }}>Video performance — views</h3>
                <ResponsiveContainer width="100%" height={250}>
                  <BarChart data={videoChartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(245,215,160,0.2)" />
                    <XAxis dataKey="name" tick={{ fontSize: 9, fill: "#C4AA8A" }} angle={-20} textAnchor="end" height={60} />
                    <YAxis tick={{ fontSize: 10, fill: "#C4AA8A" }} />
                    <Tooltip
                      contentStyle={{ backgroundColor: "#FFFCF7", border: "1px solid rgba(245,215,160,0.3)", borderRadius: 8, fontSize: 12 }}
                      formatter={(val: any) => formatNumber(val)}
                    />
                    <Bar dataKey="views" radius={[4, 4, 0, 0]}>
                      {videoChartData.map((_: any, i: number) => (
                        <Cell key={i} fill={i === 0 ? YT : AMBER} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}

            {/* Best Video */}
            {bestVideo && (
              <div className="rounded-xl p-5" style={cardStyle}>
                <h3 className="font-semibold mb-3" style={{ color: "#292524" }}>Best performing video</h3>
                <div className="flex items-start gap-4">
                  {bestVideo.thumbnail && (
                    <img src={bestVideo.thumbnail} alt="" className="w-40 h-24 rounded-lg object-cover flex-shrink-0" />
                  )}
                  <div className="flex-1 min-w-0">
                    <a href={bestVideo.permalink} target="_blank" rel="noopener noreferrer"
                      className="font-semibold text-sm hover:underline" style={{ color: "#292524" }}>
                      {bestVideo.title}
                    </a>
                    <div className="flex items-center gap-4 mt-2">
                      <span className="flex items-center gap-1 text-xs" style={{ color: YT }}>
                        <Eye className="w-3 h-3" />{formatNumber(bestVideo.views)} views
                      </span>
                      <span className="flex items-center gap-1 text-xs" style={{ color: AMBER }}>
                        <ThumbsUp className="w-3 h-3" />{formatNumber(bestVideo.likes)} likes
                      </span>
                      <span className="flex items-center gap-1 text-xs" style={{ color: "#A8967E" }}>
                        <MessageCircle className="w-3 h-3" />{formatNumber(bestVideo.comments)} comments
                      </span>
                    </div>
                    <div className="mt-2">
                      <EngBadge rate={bestVideo.views > 0 ? (bestVideo.likes + bestVideo.comments) / bestVideo.views * 100 : 0} />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* All Videos Table */}
            {ytVideos.length > 0 && (
              <div className="rounded-xl overflow-hidden" style={cardStyle}>
                <div className="px-5 py-4" style={{ borderBottom: "1px solid rgba(245,215,160,0.2)" }}>
                  <h3 className="font-semibold" style={{ color: "#292524" }}>All recent videos</h3>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr style={{ borderBottom: "1px solid rgba(245,215,160,0.15)" }}>
                        {["#", "Video", "Views", "Likes", "Comments", "ER%", "Date"].map(h => (
                          <th key={h} className="px-4 py-3 text-left font-semibold" style={{ color: "#A8967E" }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {ytVideos.map((v: any, i: number) => {
                        const er = v.views > 0 ? ((v.likes + v.comments) / v.views * 100) : 0;
                        return (
                          <tr key={v.id} style={{ borderBottom: "1px solid rgba(245,215,160,0.08)" }}
                            onMouseEnter={e => (e.currentTarget.style.backgroundColor = "rgba(245,215,160,0.05)")}
                            onMouseLeave={e => (e.currentTarget.style.backgroundColor = "transparent")}>
                            <td className="px-4 py-2.5 font-bold" style={{ color: "#C4AA8A" }}>{i + 1}</td>
                            <td className="px-4 py-2.5 max-w-xs">
                              <a href={v.permalink} target="_blank" rel="noopener noreferrer"
                                className="line-clamp-1 hover:underline font-medium" style={{ color: "#292524" }}>
                                {v.title}
                              </a>
                            </td>
                            <td className="px-4 py-2.5 font-semibold" style={{ color: YT }}>{formatNumber(v.views)}</td>
                            <td className="px-4 py-2.5" style={{ color: "#78614E" }}>{formatNumber(v.likes)}</td>
                            <td className="px-4 py-2.5" style={{ color: "#78614E" }}>{formatNumber(v.comments)}</td>
                            <td className="px-4 py-2.5"><EngBadge rate={er} /></td>
                            <td className="px-4 py-2.5" style={{ color: "#C4AA8A" }}>{timeAgo(v.publishedAt)} ago</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {ytVideos.length === 0 && (
              <div className="rounded-xl p-8 text-center" style={cardStyle}>
                <p className="text-sm" style={{ color: "#C4AA8A" }}>
                  No YouTube data. Add Channel ID from Settings.
                </p>
              </div>
            )}
          </div>
        )}

        {/* TAB: CROSS-PLATFORM INSIGHTS */}
        {activeTab === "insights" && (
          <div className="space-y-5">
            {/* Cross-platform summary */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <StatCard
                label="YouTube Subscribers"
                value={ytChannel ? formatNumber(ytChannel.subscribers) : "—"}
                color={YT} icon={Users}
              />
              <StatCard
                label="Instagram Followers"
                value={igData ? formatNumber(igData.followers_count) : "—"}
                sub={igData ? `@${igData.username}` : "not connected"}
                color={IG} icon={Users}
              />
              <StatCard
                label="Facebook Followers"
                value={fbData ? formatNumber(fbData.followers_count || fbData.fan_count) : "—"}
                sub={fbData ? fbData.name : "not connected"}
                color={FB} icon={Users}
              />
              <StatCard
                label="Total Audience"
                value={formatNumber(
                  (ytChannel?.subscribers || 0) +
                  (igData?.followers_count || 0) +
                  (fbData?.followers_count || fbData?.fan_count || 0)
                )}
                sub="cross-platform"
                color={AMBER} icon={TrendingUp}
              />
            </div>

            {/* Trending Topics from Google Trends */}
            {trends.length > 0 && (
              <div className="rounded-xl p-5" style={cardStyle}>
                <div className="flex items-center gap-2 mb-4">
                  <TrendingUp className="w-4 h-4" style={{ color: AMBER }} />
                  <h3 className="font-semibold" style={{ color: "#292524" }}>Google Trends — popular topics</h3>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  {trends.slice(0, 10).map((t: any, i: number) => (
                    <div key={i} className="flex items-center gap-3 py-2 px-3 rounded-lg"
                      style={{ backgroundColor: i < 3 ? "rgba(245,158,11,0.06)" : "transparent" }}>
                      <span className="text-xs font-bold w-5" style={{ color: i < 3 ? AMBER : "#C4AA8A" }}>
                        {i + 1}
                      </span>
                      <span className="text-sm flex-1" style={{ color: "#292524" }}>
                        {t.title || t.query || t.topic || (typeof t === "string" ? t : JSON.stringify(t))}
                      </span>
                      {t.traffic && (
                        <span className="text-xs font-semibold" style={{ color: "#A8967E" }}>{t.traffic}</span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* YouTube Trending RO */}
            {ytTrending.length > 0 && (
              <div className="rounded-xl p-5" style={cardStyle}>
                <div className="flex items-center gap-2 mb-4">
                  <PlayCircle className="w-4 h-4" style={{ color: YT }} />
                  <h3 className="font-semibold" style={{ color: "#292524" }}>YouTube Trending Romania</h3>
                </div>
                <div className="space-y-2">
                  {ytTrending.slice(0, 6).map((v, i) => (
                    <div key={v.id} className="flex items-center gap-3 py-2">
                      <span className="text-xs font-bold w-5" style={{ color: i < 3 ? YT : "#C4AA8A" }}>{i + 1}</span>
                      {v.thumbnail && (
                        <img src={v.thumbnail} alt="" className="w-14 h-8 rounded object-cover flex-shrink-0" />
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium truncate" style={{ color: "#292524" }}>{v.title}</p>
                        <p className="text-xs" style={{ color: "#C4AA8A" }}>{v.channel} · {formatNumber(v.views)} views</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Instagram media if available */}
            {igData?.media?.length > 0 && (
              <div className="rounded-xl p-5" style={cardStyle}>
                <div className="flex items-center gap-2 mb-4">
                  <Instagram className="w-4 h-4" style={{ color: IG }} />
                  <h3 className="font-semibold" style={{ color: "#292524" }}>Latest Instagram Posts</h3>
                </div>
                <div className="grid grid-cols-3 md:grid-cols-6 gap-2">
                  {igData.media.slice(0, 6).map((m: any) => (
                    <a key={m.id} href={m.permalink} target="_blank" rel="noopener noreferrer"
                      className="relative rounded-lg overflow-hidden aspect-square block group">
                      <img src={m.thumbnail_url || m.media_url} alt="" className="w-full h-full object-cover" />
                      <div className="absolute inset-0 flex items-center justify-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity"
                        style={{ backgroundColor: "rgba(0,0,0,0.5)" }}>
                        <ThumbsUp className="w-3 h-3 text-white" />
                        <span className="text-white text-xs font-bold">{formatNumber(m.like_count)}</span>
                      </div>
                    </a>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

      </div>
    </div>
  );
}
