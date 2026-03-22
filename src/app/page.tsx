"use client";

import Header from "@/components/layout/Header";
import StatCard from "@/components/ui/StatCard";
import PlatformBadge from "@/components/ui/PlatformBadge";
import ViewsChart from "@/components/charts/ViewsChart";
import EngagementChart from "@/components/charts/EngagementChart";
import PlatformShareChart from "@/components/charts/PlatformShareChart";
import { platformStats } from "@/lib/mockData";
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
  Facebook,
} from "lucide-react";

export default function DashboardPage() {
  const [igData, setIgData] = useState<any>(null);
  const [fbData, setFbData] = useState<any>(null);
  const [ytVideos, setYtVideos] = useState<any[]>([]);

  useEffect(() => {
    fetch("/api/instagram/analytics")
      .then(r => r.json())
      .then(d => { if (!d.error) setIgData(d); })
      .catch(() => {});

    fetch("/api/facebook/page")
      .then(r => r.json())
      .then(d => { if (!d.error) setFbData(d); })
      .catch(() => {});

    fetch("/api/youtube/trending?max=10")
      .then(r => r.json())
      .then(d => { if (Array.isArray(d)) setYtVideos(d); })
      .catch(() => {});
  }, []);

  const totalViews = platformStats.reduce((s, p) => s + p.totalViews, 0);
  const totalEngagement = platformStats.reduce((s, p) => s + p.totalEngagement, 0);
  const avgEngagement =
    platformStats.reduce((s, p) => s + p.avgEngagementRate, 0) / platformStats.length;
  const totalVideos = platformStats.reduce((s, p) => s + p.topVideos, 0);

  return (
    <div>
      <Header
        title="Overview"
        subtitle="Social Video Intelligence Dashboard"
      />

      <div className="p-6 space-y-6">
        {/* Stats Row */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            title="Total Views"
            value={formatNumber(totalViews)}
            change={11.8}
            accent="#39D3B8"
            icon={<Eye className="w-5 h-5" />}
          />
          <StatCard
            title="Total Engagement"
            value={formatNumber(totalEngagement)}
            change={18.4}
            accent="#4F4DF0"
            icon={<ThumbsUp className="w-5 h-5" />}
          />
          <StatCard
            title="Avg. Engagement Rate"
            value={avgEngagement.toFixed(1) + "%"}
            change={2.4}
            accent="#F9B851"
            icon={<TrendingUp className="w-5 h-5" />}
          />
          <StatCard
            title="Tracked Videos"
            value={formatNumber(totalVideos)}
            change={7.2}
            accent="#E1306C"
            icon={<PlayCircle className="w-5 h-5" />}
          />
        </div>

        {/* Platform Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {platformStats.map((p) => (
            <div
              key={p.platform}
              className="rounded-xl p-4"
              style={{ backgroundColor: "#FFFCF7", border: "1px solid rgba(245,215,160,0.25)", boxShadow: "0 1px 3px rgba(120,97,78,0.08)" }}
            >
              <div className="flex items-center justify-between mb-3">
                <PlatformBadge platform={p.platform} />
                <span
                  className={`text-xs font-bold ${p.growthPercent >= 0 ? "text-emerald-600" : "text-red-500"}`}
                >
                  {p.growthPercent >= 0 ? "+" : ""}
                  {p.growthPercent}%
                </span>
              </div>
              <p className="text-xl font-bold" style={{ color: "#292524" }}>
                {formatNumber(p.totalViews)}
              </p>
              <p className="text-xs mt-0.5" style={{ color: "#C4AA8A" }}>views</p>
              <div className="mt-3 pt-3 flex justify-between text-xs" style={{ borderTop: "1px solid rgba(245,215,160,0.2)", color: "#A8967E" }}>
                <span>ER: <b style={{ color: "#5C4A35" }}>{p.avgEngagementRate}%</b></span>
                <span>{formatNumber(p.topVideos)} videos</span>
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

        {/* Facebook Page Insights */}
        {fbData && (
          <div className="rounded-xl p-5" style={{ backgroundColor: "#FFFCF7", border: "1px solid rgba(245,215,160,0.25)", boxShadow: "0 1px 3px rgba(120,97,78,0.08)" }}>
            <div className="flex items-center gap-2 mb-4">
              <Facebook className="w-4 h-4" style={{ color: "#1877F2" }} />
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
            <h3 className="font-semibold" style={{ color: "#292524" }}>Top Videos This Week</h3>
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
                  const er = v.views > 0 ? (((v.likes + v.comments) / v.views) * 100).toFixed(1) : "0.0";
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
