"use client";

import { useState, useEffect } from "react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from "recharts";
import { TrendingUp, Clock, ThumbsUp, Share2, Users, ExternalLink, RefreshCw, AlertCircle } from "lucide-react";
import { formatNumber } from "@/lib/utils";

interface AnalyticsData {
  connected: boolean;
  period: { startDate: string; endDate: string };
  totals: {
    views: number;
    watchMinutes: number;
    likes: number;
    shares: number;
    subscribersGained: number;
    subscribersLost: number;
    avgViewDuration: number;
  };
  daily: Array<{ day: string; views: number; estimatedMinutesWatched: number; likes: number }>;
  traffic: Array<{ insightTrafficSourceType: string; views: number; estimatedMinutesWatched: number }>;
  demographics: Array<{ ageGroup: string; gender: string; viewerPercentage: number }>;
  topVideos: Array<{ video: string; views: number; estimatedMinutesWatched: number; averageViewPercentage: number; likes: number }>;
}

const TRAFFIC_LABELS: Record<string, string> = {
  YT_SEARCH: "YouTube Search",
  SUGGESTED_VIDEO: "Suggested Videos",
  BROWSE_FEATURES: "Browse Features",
  EXTERNAL: "External",
  NOTIFICATION: "Notifications",
  PLAYLIST: "Playlists",
  CHANNEL: "Channel Page",
  NO_LINK_EMBEDDED: "Embedded",
  NO_LINK_OTHER: "Direct / Other",
};

const CHART_COLORS = ["var(--color-primary)", "var(--color-primary-hover)", "#92400E", "#78614E", "#A8967E", "#C4AA8A"];
const PIE_COLORS = ["var(--color-primary)", "#FBBF24", "#FCD34D", "#FDE68A", "#FEF3C7", "var(--color-primary-hover)"];

function StatCard({ icon, label, value, sub }: { icon: React.ReactNode; label: string; value: string; sub?: string }) {
  return (
    <div
      className="rounded-xl p-4"
      style={{ backgroundColor: "var(--color-bg-secondary)", border: "1px solid rgba(245,215,160,0.3)" }}
    >
      <div className="flex items-center gap-2 mb-2">
        <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ backgroundColor: "rgba(245,158,11,0.1)" }}>
          {icon}
        </div>
        <span className="text-xs text-[#A8967E]">{label}</span>
      </div>
      <p className="text-xl font-bold text-[#292524]">{value}</p>
      {sub && <p className="text-xs text-[#C4AA8A] mt-0.5">{sub}</p>}
    </div>
  );
}

function formatSeconds(s: number) {
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return `${m}m ${sec}s`;
}

export default function YoutubeAnalyticsCard() {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/youtube/analytics");
      const json = await res.json();
      if (json.error === "not_connected") {
        setData(null);
      } else if (json.error) {
        setError(json.error);
      } else {
        setData(json);
      }
    } catch {
      setError("Connection error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  // NOT CONNECTED state
  if (!loading && !data && !error) {
    return (
      <div
        className="rounded-xl p-6 text-center"
        style={{ backgroundColor: "var(--color-bg-secondary)", border: "1px solid rgba(245,215,160,0.3)" }}
      >
        <div className="w-12 h-12 rounded-xl flex items-center justify-center mx-auto mb-3" style={{ backgroundColor: "rgba(245,158,11,0.1)" }}>
          <TrendingUp className="w-6 h-6" style={{ color: "var(--color-primary)" }} />
        </div>
        <h3 className="font-bold text-[#292524] mb-1">YouTube Analytics</h3>
        <p className="text-xs text-[#A8967E] mb-4 max-w-xs mx-auto">
          Connect your Google account to unlock watch retention, demographics, traffic sources and more — last 28 days.
        </p>
        <a
          href="/api/auth/youtube/connect"
          className="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-lg transition-all hover:opacity-90"
          style={{ backgroundColor: "var(--color-primary)", color: "#1C1814" }}
        >
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
          </svg>
          Connect with Google
        </a>
        <p className="text-xs text-[#C4AA8A] mt-3">
          Requires YouTube Analytics read-only permission
        </p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="space-y-3">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-24 rounded-xl animate-pulse" style={{ backgroundColor: "#F5D7A0", opacity: 0.2 }} />
          ))}
        </div>
        <div className="h-48 rounded-xl animate-pulse" style={{ backgroundColor: "#F5D7A0", opacity: 0.15 }} />
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-xl p-4 flex items-center gap-3" style={{ backgroundColor: "#FFF8ED", border: "1px solid #F5D7A0" }}>
        <AlertCircle className="w-5 h-5 text-amber-500 shrink-0" />
        <div className="flex-1">
          <p className="text-sm font-medium text-[#292524]">Analytics error</p>
          <p className="text-xs text-[#A8967E]">{error}</p>
        </div>
        <button type="button" onClick={load} aria-label="Retry" className="p-1.5 rounded-lg hover:bg-amber-50">
          <RefreshCw className="w-4 h-4 text-[#A8967E]" />
        </button>
      </div>
    );
  }

  if (!data) return null;

  const { totals, daily, traffic, demographics, topVideos, period } = data;

  // Prepare daily chart (last 28 days)
  const dailyChart = daily.map((d) => ({
    date: d.day?.slice(5) ?? "",
    views: d.views ?? 0,
    minutes: Math.round((d.estimatedMinutesWatched ?? 0) / 60),
  }));

  // Traffic source chart
  const trafficChart = traffic
    .slice(0, 6)
    .map((t) => ({
      name: TRAFFIC_LABELS[t.insightTrafficSourceType] ?? t.insightTrafficSourceType,
      views: t.views ?? 0,
    }));

  // Demographics — group by age, sum male + female
  const ageMap: Record<string, number> = {};
  demographics.forEach((d) => {
    ageMap[d.ageGroup] = (ageMap[d.ageGroup] ?? 0) + (d.viewerPercentage ?? 0);
  });
  const demoChart = Object.entries(ageMap)
    .map(([age, pct]) => ({ name: age.replace("age", ""), value: Math.round(pct * 10) / 10 }))
    .sort((a, b) => a.name.localeCompare(b.name));

  const netSubs = totals.subscribersGained - totals.subscribersLost;

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-bold text-sm text-[#292524]">YouTube Analytics</h3>
          <p className="text-xs text-[#A8967E]">
            {period.startDate} → {period.endDate} · last 28 days
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs px-2 py-1 rounded-full font-medium" style={{ backgroundColor: "rgba(34,197,94,0.1)", color: "#16A34A" }}>
            ● Connected
          </span>
          <button type="button" onClick={load} aria-label="Refresh analytics" className="p-1.5 rounded-lg hover:bg-amber-50 transition-colors">
            <RefreshCw className="w-3.5 h-3.5 text-[#A8967E]" />
          </button>
        </div>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard
          icon={<TrendingUp className="w-4 h-4" style={{ color: "var(--color-primary)" }} />}
          label="Views"
          value={formatNumber(totals.views)}
          sub="last 28 days"
        />
        <StatCard
          icon={<Clock className="w-4 h-4" style={{ color: "var(--color-primary)" }} />}
          label="Watch Time"
          value={`${formatNumber(Math.round(totals.watchMinutes / 60))}h`}
          sub={`Avg ${formatSeconds(totals.avgViewDuration)} / view`}
        />
        <StatCard
          icon={<ThumbsUp className="w-4 h-4" style={{ color: "var(--color-primary)" }} />}
          label="Likes"
          value={formatNumber(totals.likes)}
          sub={`${formatNumber(totals.shares)} shares`}
        />
        <StatCard
          icon={<Users className="w-4 h-4" style={{ color: "var(--color-primary)" }} />}
          label="Net Subscribers"
          value={(netSubs >= 0 ? "+" : "") + formatNumber(netSubs)}
          sub={`+${formatNumber(totals.subscribersGained)} / -${formatNumber(totals.subscribersLost)}`}
        />
      </div>

      {/* Daily Views Chart */}
      {dailyChart.length > 0 && (
        <div className="rounded-xl p-4" style={{ backgroundColor: "var(--color-bg-secondary)", border: "1px solid rgba(245,215,160,0.3)" }}>
          <h4 className="text-xs font-semibold text-[#78614E] mb-3 uppercase tracking-wide">Daily Views — 28 days</h4>
          <ResponsiveContainer width="100%" height={160}>
            <BarChart data={dailyChart} barSize={6}>
              <XAxis dataKey="date" tick={{ fontSize: 9, fill: "#C4AA8A" }} tickLine={false} axisLine={false} interval={3} />
              <YAxis hide />
              <Tooltip
                contentStyle={{ backgroundColor: "var(--color-bg-secondary)", border: "1px solid #F5D7A0", borderRadius: 8, fontSize: 11 }}
                formatter={(v: unknown) => [formatNumber(Number(v ?? 0)), "Views"]}
              />
              <Bar dataKey="views" radius={[3, 3, 0, 0]}>
                {dailyChart.map((_, i) => (
                  <Cell key={i} fill={i === dailyChart.length - 1 ? "var(--color-primary-hover)" : "var(--color-primary)"} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Traffic Sources + Demographics side by side */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Traffic Sources */}
        {trafficChart.length > 0 && (
          <div className="rounded-xl p-4" style={{ backgroundColor: "var(--color-bg-secondary)", border: "1px solid rgba(245,215,160,0.3)" }}>
            <h4 className="text-xs font-semibold text-[#78614E] mb-3 uppercase tracking-wide">Traffic Sources</h4>
            <div className="space-y-2">
              {trafficChart.map((t, i) => {
                const total = trafficChart.reduce((s, x) => s + x.views, 0);
                const pct = total ? Math.round((t.views / total) * 100) : 0;
                return (
                  <div key={i}>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-[#78614E] truncate">{t.name}</span>
                      <span className="font-semibold text-[#292524] ml-2">{pct}%</span>
                    </div>
                    <div className="h-1.5 rounded-full" style={{ backgroundColor: "rgba(245,215,160,0.3)" }}>
                      <div
                        className="h-1.5 rounded-full transition-all"
                        style={{ width: `${pct}%`, backgroundColor: CHART_COLORS[i % CHART_COLORS.length] }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Demographics */}
        {demoChart.length > 0 && (
          <div className="rounded-xl p-4" style={{ backgroundColor: "var(--color-bg-secondary)", border: "1px solid rgba(245,215,160,0.3)" }}>
            <h4 className="text-xs font-semibold text-[#78614E] mb-3 uppercase tracking-wide">Age Demographics</h4>
            <ResponsiveContainer width="100%" height={160}>
              <PieChart>
                <Pie
                  data={demoChart}
                  cx="50%"
                  cy="50%"
                  innerRadius={40}
                  outerRadius={65}
                  dataKey="value"
                  paddingAngle={2}
                >
                  {demoChart.map((_, i) => (
                    <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{ backgroundColor: "var(--color-bg-secondary)", border: "1px solid #F5D7A0", borderRadius: 8, fontSize: 11 }}
                  formatter={(v: unknown) => [`${Number(v ?? 0)}%`, "Viewers"]}
                />
                <Legend iconSize={8} iconType="circle" wrapperStyle={{ fontSize: 10, color: "#A8967E" }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      {/* Top Videos */}
      {topVideos.length > 0 && (
        <div className="rounded-xl p-4" style={{ backgroundColor: "var(--color-bg-secondary)", border: "1px solid rgba(245,215,160,0.3)" }}>
          <h4 className="text-xs font-semibold text-[#78614E] mb-3 uppercase tracking-wide">Top Videos — Last 28 Days</h4>
          <div className="space-y-2">
            {topVideos.slice(0, 8).map((v, i) => (
              <div key={i} className="flex items-center gap-3 py-1.5" style={{ borderBottom: i < topVideos.length - 1 ? "1px solid rgba(245,215,160,0.2)" : "none" }}>
                <span className="text-xs font-bold text-[#C4AA8A] w-5 text-center shrink-0">{i + 1}</span>
                <div className="flex-1 min-w-0">
                  <a
                    href={`https://youtube.com/watch?v=${v.video}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs font-medium text-[#292524] hover:text-[#D97706] flex items-center gap-1 truncate"
                  >
                    {v.video}
                    <ExternalLink className="w-3 h-3 shrink-0" />
                  </a>
                </div>
                <div className="text-right shrink-0 space-y-0.5">
                  <p className="text-xs font-semibold text-[#292524]">{formatNumber(v.views)} views</p>
                  <p className="text-xs text-[#C4AA8A]">{Math.round(v.averageViewPercentage ?? 0)}% retention</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Disconnect link */}
      <p className="text-xs text-[#C4AA8A] text-center">
        <a href="/api/auth/youtube/connect" className="underline hover:text-[#A8967E]">
          Reconnect Google account
        </a>
      </p>
    </div>
  );
}
