"use client";

import Header from "@/components/layout/Header";
import OnboardingChecklist from "@/components/ui/OnboardingChecklist";
import WhatsNewModal from "@/components/ui/WhatsNewModal";
import ProfitStatsCard from "@/components/ui/ProfitStatsCard";
import StatCard from "@/components/ui/StatCard";
import PlatformBadge from "@/components/ui/PlatformBadge";
import GlassCard from "@/components/ui/GlassCard";
import GlassButton from "@/components/ui/GlassButton";
import ViewsChart from "@/components/charts/ViewsChart";
import EngagementChart from "@/components/charts/EngagementChart";
import PlatformShareChart from "@/components/charts/PlatformShareChart";
import { formatNumber, formatDate } from "@/lib/utils";
import { useState, useEffect } from "react";
import {
  Eye,
  ThumbsUp,
  MessageCircle,
  TrendingUp,
  PlayCircle,
  Flame,
  Instagram,
  Users,
  Heart,
} from "lucide-react";

const FbIcon = () => (
  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="#1877F2"><path d="M24 12.073C24 5.405 18.627 0 12 0S0 5.405 0 12.073C0 18.1 4.388 23.094 10.125 24v-8.437H7.078v-3.49h3.047V9.41c0-3.025 1.792-4.697 4.533-4.697 1.312 0 2.686.236 2.686.236v2.97h-1.513c-1.491 0-1.956.93-1.956 1.886v2.267h3.328l-.532 3.49h-2.796V24C19.612 23.094 24 18.1 24 12.073z"/></svg>
);

export default function DashboardPage() {
  const [igData, setIgData] = useState<any>(null);
  const [igError, setIgError] = useState<string | null>(null);
  const [fbData, setFbData] = useState<any>(null);
  const [fbError, setFbError] = useState<string | null>(null);
  const [ytVideos, setYtVideos] = useState<any[]>([]);
  const [premiumActionsUsed, setPremiumActionsUsed] = useState(0);
  const [sortCol, setSortCol] = useState<"views" | "likes" | "er" | "publishedAt">("views");
  const [sortDir, setSortDir] = useState<"desc" | "asc">("desc");

  const toggleSort = (col: "views" | "likes" | "er" | "publishedAt") => {
    if (sortCol === col) setSortDir(d => d === "desc" ? "asc" : "desc");
    else { setSortCol(col); setSortDir("desc"); }
  };

  const sortedVideos = [...ytVideos].sort((a, b) => {
    let av: number, bv: number;
    if (sortCol === "er") {
      av = a.views > 0 ? ((a.likes + a.comments) / a.views) * 100 : 0;
      bv = b.views > 0 ? ((b.likes + b.comments) / b.views) * 100 : 0;
    } else if (sortCol === "publishedAt") {
      av = new Date(a.publishedAt).getTime();
      bv = new Date(b.publishedAt).getTime();
    } else {
      av = a[sortCol]; bv = b[sortCol];
    }
    return sortDir === "desc" ? bv - av : av - bv;
  });

  useEffect(() => {
    fetch("/api/instagram/analytics")
      .then(r => r.json())
      .then(d => {
        if (!d.error) setIgData(d);
        else if (d.error !== "Unauthorized" && d.error !== "Instagram not connected") setIgError(d.error);
      })
      .catch(() => {});

    fetch("/api/facebook/page")
      .then(r => r.json())
      .then(d => {
        if (!d.error) setFbData(d);
        else if (d.error !== "Unauthorized" && d.error !== "Meta not connected" && d.error !== "No Facebook page found") setFbError(d.error);
      })
      .catch(() => {});

    fetch("/api/youtube/trending?region=RO&max=12")
      .then(r => r.json())
      .then(d => { if (Array.isArray(d)) setYtVideos(d); })
      .catch(() => {});

    fetch("/api/profile/stats")
      .then(r => r.json())
      .then(d => { if (d.premium_actions_used != null) setPremiumActionsUsed(d.premium_actions_used); })
      .catch(() => {});
  }, []);

  // Compute real stats from YouTube trending
  const ytTotalViews = ytVideos.reduce((s, v) => s + v.views, 0);
  const ytTotalLikes = ytVideos.reduce((s, v) => s + v.likes, 0);
  const ytTotalComments = ytVideos.reduce((s, v) => s + v.comments, 0);
  const ytAvgER = ytVideos.length > 0
    ? ytVideos.reduce((s, v) => s + (v.views > 0 ? (v.likes + v.comments) / v.views * 100 : 0), 0) / ytVideos.length
    : 0;

  // Platform cards: YouTube real + Instagram real (if available) + Facebook real (if available)
  const platformCards = [
    {
      platform: "youtube" as const,
      label: "YouTube Trending",
      views: ytTotalViews,
      er: Math.round(ytAvgER * 10) / 10,
      count: ytVideos.length,
      countLabel: "trending videos",
      growth: null,
      color: "#FF0000",
    },
    igData ? {
      platform: "instagram" as const,
      label: "Instagram",
      views: igData.followers_count || 0,
      er: null,
      count: igData.media_count || 0,
      countLabel: "posts",
      growth: null,
      color: "#E1306C",
      isFollowers: true,
    } : null,
    fbData ? {
      platform: "facebook" as const,
      label: "Facebook",
      views: fbData.fan_count || 0,
      er: null,
      count: fbData.followers_count || 0,
      countLabel: "followers",
      growth: null,
      color: "#1877F2",
      isFollowers: true,
    } : null,
  ].filter(Boolean) as any[];

  return (
    <div>
      <Header
        title="Overview"
        subtitle="Social Video Intelligence Dashboard"
      />

      <div className="p-6 space-y-6">
        <WhatsNewModal />
        <OnboardingChecklist />
        <ProfitStatsCard actionsCount={premiumActionsUsed} />
        {/* Stats Row — computed from YouTube trending data */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            title="Views (Trending)"
            value={ytVideos.length > 0 ? formatNumber(ytTotalViews) : "—"}
            change={undefined}
            accent="#FF0000"
            icon={<Eye className="w-5 h-5" />}
          />
          <StatCard
            title="Likes (Trending)"
            value={ytVideos.length > 0 ? formatNumber(ytTotalLikes) : "—"}
            change={undefined}
            accent="#4F4DF0"
            icon={<ThumbsUp className="w-5 h-5" />}
          />
          <StatCard
            title="Avg. Engagement Rate"
            value={ytVideos.length > 0 ? ytAvgER.toFixed(2) + "%" : "—"}
            change={undefined}
            accent="#F9B851"
            icon={<TrendingUp className="w-5 h-5" />}
          />
          <StatCard
            title="Comments (Trending)"
            value={ytVideos.length > 0 ? formatNumber(ytTotalComments) : "—"}
            change={undefined}
            accent="#E1306C"
            icon={<MessageCircle className="w-5 h-5" />}
          />
        </div>

        {/* Platform Cards — real data */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {platformCards.map((p) => (
            <GlassCard key={p.platform} padding="p-4" rounded="rounded-xl">
              <div className="flex items-center justify-between mb-3">
                <PlatformBadge platform={p.platform} />
                <span className="text-xs font-medium px-2 py-0.5 rounded-full" style={{ backgroundColor: "rgba(245,158,11,0.1)", color: "var(--color-primary-hover)" }}>
                  Live
                </span>
              </div>
              <p className="text-xl font-bold text-glass-primary">
                {formatNumber(p.views)}
              </p>
              <p className="text-xs mt-0.5 text-glass-muted">
                {p.isFollowers ? "followers" : "views"}
              </p>
              <div className="mt-3 pt-3 flex justify-between text-xs text-glass-secondary" style={{ borderTop: "1px solid rgba(245,215,160,0.2)" }}>
                {p.er !== null && (
                  <span>ER: <b className="text-glass-primary">{p.er}%</b></span>
                )}
                <span>{formatNumber(p.count)} {p.countLabel}</span>
              </div>
            </GlassCard>
          ))}
        </div>

        {/* Charts Row */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="lg:col-span-2">
            <ViewsChart />
          </div>
          <PlatformShareChart />
        </div>

        {/* Second Charts Row */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="lg:col-span-2">
            <EngagementChart />
          </div>

          {/* Trending Now */}
          <GlassCard padding="p-5" rounded="rounded-xl">
            <div className="flex items-center gap-2 mb-4">
              <Flame className="w-4 h-4" style={{ color: "var(--color-primary)" }} />
              <h3 className="font-semibold text-glass-primary">Trending Now</h3>
            </div>
            <div className="space-y-3">
              {ytVideos.slice(0, 5).map((v, i) => (
                <div key={v.id} className="flex items-start gap-3">
                  <span className="w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5" style={{ backgroundColor: "rgba(245,215,160,0.2)", color: "#78614E" }}>
                    {i + 1}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium truncate leading-tight text-glass-primary">
                      {v.title}
                    </p>
                    <div className="flex items-center gap-2 mt-1">
                      <PlatformBadge platform="youtube" />
                      <span className="text-xs text-glass-muted">
                        {formatNumber(v.views)} views
                      </span>
                    </div>
                  </div>
                </div>
              ))}
              {ytVideos.length === 0 && (
                <p className="text-xs text-glass-muted">Loading...</p>
              )}
            </div>
          </GlassCard>
        </div>

        {/* Instagram connection issue */}
        {igError && !igData && (
          <div className="rounded-xl p-4 flex items-center justify-between" style={{ backgroundColor: "rgba(225,48,108,0.06)", border: "1px solid rgba(225,48,108,0.2)" }}>
            <div className="flex items-center gap-3">
              <Instagram className="w-4 h-4" style={{ color: "#E1306C" }} />
              <div>
                <p className="text-sm font-semibold" style={{ color: "var(--color-text)" }}>
                  {igError.toLowerCase().includes("token") || igError.toLowerCase().includes("expired") || igError.toLowerCase().includes("session")
                    ? "Expired Instagram token"
                    : "Instagram — connection error"}
                </p>
                <p className="text-xs" style={{ color: "#A8967E" }}>Reconnect your account in Settings or check permissions</p>
              </div>
            </div>
            <GlassButton variant="primary" size="sm">
              <a href="/settings">Reconnect →</a>
            </GlassButton>
          </div>
        )}

        {/* Instagram Insights */}
        {igData && (
          <GlassCard padding="p-5" rounded="rounded-xl">
            <div className="flex items-center gap-2 mb-4">
              <Instagram className="w-4 h-4" style={{ color: "#E1306C" }} />
              <h3 className="font-semibold text-glass-primary">Instagram — @{igData.username}</h3>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
              {[
                { icon: <Users className="w-3 h-3" />, label: "Followers", val: formatNumber(igData.followers_count) },
                { icon: <PlayCircle className="w-3 h-3" />, label: "Posts", val: formatNumber(igData.media_count) },
                { icon: <Eye className="w-3 h-3" />, label: "Reach (30d)", val: (() => { const v = igData.insights?.find((i: any) => i.name === "reach")?.values?.slice(-1)[0]?.value; return v ? formatNumber(v) : "—"; })() },
                { icon: <TrendingUp className="w-3 h-3" />, label: "Profile Views", val: (() => { const v = igData.insights?.find((i: any) => i.name === "profile_views")?.values?.slice(-1)[0]?.value; return v ? formatNumber(v) : "—"; })() },
              ].map(s => (
                <div key={s.label} className="rounded-lg p-3" style={{ backgroundColor: "rgba(225,48,108,0.06)" }}>
                  <div className="flex items-center gap-1.5 text-xs mb-1" style={{ color: "#C4AA8A" }}>{s.icon}{s.label}</div>
                  <p className="text-base font-bold" style={{ color: "var(--color-text)" }}>{s.val}</p>
                </div>
              ))}
            </div>
            {igData.media?.length > 0 && (
              <div className="grid grid-cols-4 md:grid-cols-6 gap-2">
                {igData.media.slice(0, 6).map((m: any) => (
                  <a key={m.id} href={m.permalink} target="_blank" rel="noopener noreferrer" className="relative rounded-lg overflow-hidden aspect-square block group">
                    <img src={m.thumbnail_url || m.media_url} alt="" className="w-full h-full object-cover" />
                    <div className="absolute inset-0 flex items-center justify-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity" style={{ backgroundColor: "rgba(0,0,0,0.5)" }}>
                      <Heart className="w-3 h-3 text-white" />
                      <span className="text-white text-xs font-bold">{formatNumber(m.like_count)}</span>
                    </div>
                  </a>
                ))}
              </div>
            )}
          </GlassCard>
        )}

        {/* Facebook token expired */}
        {fbError && !fbData && (
          <div className="rounded-xl p-4 flex items-center justify-between" style={{ backgroundColor: "rgba(24,119,242,0.06)", border: "1px solid rgba(24,119,242,0.2)" }}>
            <div className="flex items-center gap-3">
              <FbIcon />
              <div>
                <p className="text-sm font-semibold" style={{ color: "var(--color-text)" }}>Facebook token expired</p>
                <p className="text-xs" style={{ color: "#A8967E" }}>Reconnect your Instagram account in Settings to restore access</p>
              </div>
            </div>
            <GlassButton variant="primary" size="sm">
              <a href="/settings">Reconnect →</a>
            </GlassButton>
          </div>
        )}

        {/* Facebook Page Insights */}
        {fbData && (
          <GlassCard padding="p-5" rounded="rounded-xl">
            <div className="flex items-center gap-2 mb-4">
              <FbIcon />
              <h3 className="font-semibold text-glass-primary">Facebook — {fbData.name}</h3>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {[
                { icon: <Users className="w-3 h-3" />, label: "Page Likes", val: formatNumber(fbData.fan_count) },
                { icon: <Heart className="w-3 h-3" />, label: "Followers", val: formatNumber(fbData.followers_count) },
                { icon: <Eye className="w-3 h-3" />, label: "Reach (30d)", val: (() => { const m = fbData.insights?.find((i: any) => i.name === "page_impressions_unique"); const v = m?.values?.slice(-1)[0]?.value; return v ? formatNumber(v) : "—"; })() },
                { icon: <TrendingUp className="w-3 h-3" />, label: "Page Views (30d)", val: (() => { const m = fbData.insights?.find((i: any) => i.name === "page_views_total"); const v = m?.values?.slice(-1)[0]?.value; return v ? formatNumber(v) : "—"; })() },
              ].map(s => (
                <div key={s.label} className="rounded-lg p-3" style={{ backgroundColor: "rgba(24,119,242,0.06)" }}>
                  <div className="flex items-center gap-1.5 text-xs mb-1 text-glass-muted">{s.icon}{s.label}</div>
                  <p className="text-base font-bold text-glass-primary">{s.val}</p>
                </div>
              ))}
            </div>
          </GlassCard>
        )}

        {/* Top Videos Table */}
        <GlassCard padding="p-0" rounded="rounded-xl">
          <div className="flex items-center justify-between px-5 py-4" style={{ borderBottom: "1px solid rgba(245,215,160,0.2)" }}>
            <h3 className="font-semibold text-glass-primary">Top Videos Trending RO</h3>
            <a href="/videos" className="text-xs font-semibold hover:underline" style={{ color: "var(--color-primary)" }}>
              View all →
            </a>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm glass-table">
              <thead>
                <tr className="text-xs uppercase tracking-wide" style={{ backgroundColor: "rgba(245,215,160,0.1)", color: "#A8967E" }}>
                  <th className="text-left px-5 py-3">Video</th>
                  <th className="text-left px-3 py-3">Platform</th>
                  {(["views", "likes", "er", "publishedAt"] as const).map(col => (
                    <th key={col} className="text-right px-3 py-3 last:px-5">
                      <button type="button" onClick={() => toggleSort(col)}
                        className="inline-flex items-center gap-1 hover:text-[#F59E0B] transition-colors cursor-pointer"
                        style={{ color: sortCol === col ? "var(--color-primary)" : "#A8967E", fontWeight: sortCol === col ? 700 : 500 }}>
                        {col === "publishedAt" ? "Published" : col === "er" ? "ER" : col.charAt(0).toUpperCase() + col.slice(1)}
                        <span className="text-xs">{sortCol === col ? (sortDir === "desc" ? "↓" : "↑") : "↕"}</span>
                      </button>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {sortedVideos.slice(0, 8).map((v) => {
                  const er = v.views > 0 ? (((v.likes + v.comments) / v.views) * 100).toFixed(2) : "0.00";
                  return (
                    <tr key={v.id} className="transition-colors" style={{ borderTop: "1px solid rgba(245,215,160,0.15)" }}
                      onMouseEnter={e => (e.currentTarget.style.backgroundColor = "rgba(245,215,160,0.07)")}
                      onMouseLeave={e => (e.currentTarget.style.backgroundColor = "transparent")}
                    >
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-3">
                          <div className="w-16 h-9 rounded-md overflow-hidden flex-shrink-0" style={{ backgroundColor: "#EDE0C8" }}>
                            <img src={v.thumbnail} alt="" className="w-full h-full object-cover" />
                          </div>
                          <div>
                            <p className="font-medium text-xs leading-tight max-w-[220px] truncate" style={{ color: "#3D2E1E" }}>
                              {v.title}
                            </p>
                            <p className="text-xs mt-0.5" style={{ color: "#C4AA8A" }}>{v.channel}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-3 py-3">
                        <PlatformBadge platform="youtube" />
                      </td>
                      <td className="px-3 py-3 text-right font-medium text-xs" style={{ color: "#5C4A35" }}>
                        {formatNumber(v.views)}
                      </td>
                      <td className="px-3 py-3 text-right text-xs" style={{ color: "#A8967E" }}>
                        {formatNumber(v.likes)}
                      </td>
                      <td className="px-3 py-3 text-right">
                        <span className="text-xs font-semibold px-1.5 py-0.5 rounded" style={{ backgroundColor: "rgba(245,158,11,0.12)", color: "var(--color-primary-hover)" }}>
                          {er}%
                        </span>
                      </td>
                      <td className="px-5 py-3 text-right text-xs" style={{ color: "#C4AA8A" }}>
                        {formatDate(v.publishedAt)}
                      </td>
                    </tr>
                  );
                })}
                {ytVideos.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-5 py-8 text-center text-xs" style={{ color: "#C4AA8A" }}>
                      Loading YouTube data...
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </GlassCard>
      </div>
    </div>
  );
}
