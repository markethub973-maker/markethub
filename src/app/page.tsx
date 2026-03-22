"use client";

import Header from "@/components/layout/Header";
import StatCard from "@/components/ui/StatCard";
import PlatformBadge from "@/components/ui/PlatformBadge";
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
      label: "YouTube Trending RO",
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
        {/* Stats Row — computed from YouTube trending data */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            title="Views (Trending RO)"
            value={ytVideos.length > 0 ? formatNumber(ytTotalViews) : "—"}
            change={undefined}
            accent="#FF0000"
            icon={<Eye className="w-5 h-5" />}
          />
          <StatCard
            title="Likes (Trending RO)"
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
            title="Comentarii (Trending)"
            value={ytVideos.length > 0 ? formatNumber(ytTotalComments) : "—"}
            change={undefined}
            accent="#E1306C"
            icon={<MessageCircle className="w-5 h-5" />}
          />
        </div>

        {/* Platform Cards — real data */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {platformCards.map((p) => (
            <div
              key={p.platform}
              className="rounded-xl p-4"
              style={{ backgroundColor: "#FFFCF7", border: "1px solid rgba(245,215,160,0.25)", boxShadow: "0 1px 3px rgba(120,97,78,0.08)" }}
            >
              <div className="flex items-center justify-between mb-3">
                <PlatformBadge platform={p.platform} />
                <span className="text-xs font-medium px-2 py-0.5 rounded-full" style={{ backgroundColor: "rgba(245,158,11,0.1)", color: "#D97706" }}>
                  Live
                </span>
              </div>
              <p className="text-xl font-bold" style={{ color: "#292524" }}>
                {formatNumber(p.views)}
              </p>
              <p className="text-xs mt-0.5" style={{ color: "#C4AA8A" }}>
                {p.isFollowers ? "followers" : "views"}
              </p>
              <div className="mt-3 pt-3 flex justify-between text-xs" style={{ borderTop: "1px solid rgba(245,215,160,0.2)", color: "#A8967E" }}>
                {p.er !== null && (
                  <span>ER: <b style={{ color: "#5C4A35" }}>{p.er}%</b></span>
                )}
                <span>{formatNumber(p.count)} {p.countLabel}</span>
              </div>
            </div>
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
          <div className="rounded-xl p-5" style={{ backgroundColor: "#FFFCF7", border: "1px solid rgba(245,215,160,0.25)", boxShadow: "0 1px 3px rgba(120,97,78,0.08)" }}>
            <div className="flex items-center gap-2 mb-4">
              <Flame className="w-4 h-4" style={{ color: "#F59E0B" }} />
              <h3 className="font-semibold" style={{ color: "#292524" }}>Trending Now</h3>
            </div>
            <div className="space-y-3">
              {ytVideos.slice(0, 5).map((v, i) => (
                <div key={v.id} className="flex items-start gap-3">
                  <span className="w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5" style={{ backgroundColor: "rgba(245,215,160,0.2)", color: "#78614E" }}>
                    {i + 1}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium truncate leading-tight" style={{ color: "#3D2E1E" }}>
                      {v.title}
                    </p>
                    <div className="flex items-center gap-2 mt-1">
                      <PlatformBadge platform="youtube" />
                      <span className="text-xs" style={{ color: "#C4AA8A" }}>
                        {formatNumber(v.views)} views
                      </span>
                    </div>
                  </div>
                </div>
              ))}
              {ytVideos.length === 0 && (
                <p className="text-xs" style={{ color: "#C4AA8A" }}>Se incarca...</p>
              )}
            </div>
          </div>
        </div>

        {/* Instagram token expired */}
        {igError && !igData && (
          <div className="rounded-xl p-4 flex items-center justify-between" style={{ backgroundColor: "rgba(225,48,108,0.06)", border: "1px solid rgba(225,48,108,0.2)" }}>
            <div className="flex items-center gap-3">
              <Instagram className="w-4 h-4" style={{ color: "#E1306C" }} />
              <div>
                <p className="text-sm font-semibold" style={{ color: "#292524" }}>Token Instagram expirat</p>
                <p className="text-xs" style={{ color: "#A8967E" }}>Reconectează contul pentru a vedea datele</p>
              </div>
            </div>
            <a href="/settings" className="px-4 py-2 rounded-lg text-sm font-bold flex-shrink-0" style={{ backgroundColor: "#E1306C", color: "white" }}>
              Reconectează →
            </a>
          </div>
        )}

        {/* Instagram Insights */}
        {igData && (
          <div className="rounded-xl p-5" style={{ backgroundColor: "#FFFCF7", border: "1px solid rgba(245,215,160,0.25)", boxShadow: "0 1px 3px rgba(120,97,78,0.08)" }}>
            <div className="flex items-center gap-2 mb-4">
              <Instagram className="w-4 h-4" style={{ color: "#E1306C" }} />
              <h3 className="font-semibold" style={{ color: "#292524" }}>Instagram — @{igData.username}</h3>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
              {[
                { icon: <Users className="w-3 h-3" />, label: "Followers", val: formatNumber(igData.followers_count) },
                { icon: <PlayCircle className="w-3 h-3" />, label: "Posts", val: formatNumber(igData.media_count) },
                { icon: <Eye className="w-3 h-3" />, label: "Reach (30z)", val: igData.insights?.find((i: any) => i.name === "reach")?.values?.slice(-1)[0]?.value ? formatNumber(igData.insights.find((i: any) => i.name === "reach").values.slice(-1)[0].value) : "—" },
                { icon: <TrendingUp className="w-3 h-3" />, label: "Profile Views", val: igData.insights?.find((i: any) => i.name === "profile_views")?.values?.slice(-1)[0]?.value ? formatNumber(igData.insights.find((i: any) => i.name === "profile_views").values.slice(-1)[0].value) : "—" },
              ].map(s => (
                <div key={s.label} className="rounded-lg p-3" style={{ backgroundColor: "rgba(225,48,108,0.06)" }}>
                  <div className="flex items-center gap-1.5 text-xs mb-1" style={{ color: "#C4AA8A" }}>{s.icon}{s.label}</div>
                  <p className="text-base font-bold" style={{ color: "#292524" }}>{s.val}</p>
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
          </div>
        )}

        {/* Facebook token expired */}
        {fbError && !fbData && (
          <div className="rounded-xl p-4 flex items-center justify-between" style={{ backgroundColor: "rgba(24,119,242,0.06)", border: "1px solid rgba(24,119,242,0.2)" }}>
            <div className="flex items-center gap-3">
              <FbIcon />
              <div>
                <p className="text-sm font-semibold" style={{ color: "#292524" }}>Token Facebook expirat</p>
                <p className="text-xs" style={{ color: "#A8967E" }}>Reconectează contul Instagram din Settings pentru a restabili accesul</p>
              </div>
            </div>
            <a href="/settings" className="px-4 py-2 rounded-lg text-sm font-bold flex-shrink-0" style={{ backgroundColor: "#1877F2", color: "white" }}>
              Reconectează →
            </a>
          </div>
        )}

        {/* Facebook Page Insights */}
        {fbData && (
          <div className="rounded-xl p-5" style={{ backgroundColor: "#FFFCF7", border: "1px solid rgba(245,215,160,0.25)", boxShadow: "0 1px 3px rgba(120,97,78,0.08)" }}>
            <div className="flex items-center gap-2 mb-4">
              <FbIcon />
              <h3 className="font-semibold" style={{ color: "#292524" }}>Facebook — {fbData.name}</h3>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {[
                { icon: <Users className="w-3 h-3" />, label: "Page Likes", val: formatNumber(fbData.fan_count) },
                { icon: <Heart className="w-3 h-3" />, label: "Followers", val: formatNumber(fbData.followers_count) },
                { icon: <Eye className="w-3 h-3" />, label: "Reach (30z)", val: (() => { const m = fbData.insights?.find((i: any) => i.name === "page_reach"); const v = m?.values?.slice(-1)[0]?.value; return v ? formatNumber(v) : "—"; })() },
                { icon: <TrendingUp className="w-3 h-3" />, label: "Impressions (30z)", val: (() => { const m = fbData.insights?.find((i: any) => i.name === "page_impressions_unique"); const v = m?.values?.slice(-1)[0]?.value; return v ? formatNumber(v) : "—"; })() },
              ].map(s => (
                <div key={s.label} className="rounded-lg p-3" style={{ backgroundColor: "rgba(24,119,242,0.06)" }}>
                  <div className="flex items-center gap-1.5 text-xs mb-1" style={{ color: "#C4AA8A" }}>{s.icon}{s.label}</div>
                  <p className="text-base font-bold" style={{ color: "#292524" }}>{s.val}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Top Videos Table */}
        <div className="rounded-xl overflow-hidden" style={{ backgroundColor: "#FFFCF7", border: "1px solid rgba(245,215,160,0.25)", boxShadow: "0 1px 3px rgba(120,97,78,0.08)" }}>
          <div className="flex items-center justify-between px-5 py-4" style={{ borderBottom: "1px solid rgba(245,215,160,0.2)" }}>
            <h3 className="font-semibold" style={{ color: "#292524" }}>Top Videos Trending RO</h3>
            <a href="/videos" className="text-xs font-semibold hover:underline" style={{ color: "#F59E0B" }}>
              View all →
            </a>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-xs uppercase tracking-wide" style={{ backgroundColor: "rgba(245,215,160,0.1)", color: "#A8967E" }}>
                  <th className="text-left px-5 py-3">Video</th>
                  <th className="text-left px-3 py-3">Platform</th>
                  <th className="text-right px-3 py-3">Views</th>
                  <th className="text-right px-3 py-3">Likes</th>
                  <th className="text-right px-3 py-3">ER</th>
                  <th className="text-right px-5 py-3">Published</th>
                </tr>
              </thead>
              <tbody>
                {ytVideos.slice(0, 8).map((v) => {
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
                        <span className="text-xs font-semibold px-1.5 py-0.5 rounded" style={{ backgroundColor: "rgba(245,158,11,0.12)", color: "#D97706" }}>
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
                      Se incarca datele YouTube...
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
