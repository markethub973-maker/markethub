import Header from "@/components/layout/Header";
import StatCard from "@/components/ui/StatCard";
import PlatformBadge from "@/components/ui/PlatformBadge";
import ViewsChart from "@/components/charts/ViewsChart";
import EngagementChart from "@/components/charts/EngagementChart";
import PlatformShareChart from "@/components/charts/PlatformShareChart";
import { platformStats, topVideos } from "@/lib/mockData";
import { formatNumber, formatDate } from "@/lib/utils";
import {
  Eye,
  ThumbsUp,
  MessageCircle,
  TrendingUp,
  PlayCircle,
  Flame,
} from "lucide-react";

export default function DashboardPage() {
  const totalViews = platformStats.reduce((s, p) => s + p.totalViews, 0);
  const totalEngagement = platformStats.reduce((s, p) => s + p.totalEngagement, 0);
  const avgEngagement =
    platformStats.reduce((s, p) => s + p.avgEngagementRate, 0) / platformStats.length;
  const totalVideos = platformStats.reduce((s, p) => s + p.topVideos, 0);

  const trendingVideos = topVideos.filter((v) => v.trending).slice(0, 5);

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
              {trendingVideos.map((v, i) => (
                <div key={v.id} className="flex items-start gap-3">
                  <span className="w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5" style={{ backgroundColor: "rgba(245,215,160,0.2)", color: "#78614E" }}>
                    {i + 1}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium truncate leading-tight" style={{ color: "#3D2E1E" }}>
                      {v.title}
                    </p>
                    <div className="flex items-center gap-2 mt-1">
                      <PlatformBadge platform={v.platform} />
                      <span className="text-xs" style={{ color: "#C4AA8A" }}>
                        {formatNumber(v.views)} views
                      </span>
                    </div>
                  </div>
                  <span className="text-xs font-bold text-emerald-600 flex-shrink-0">
                    +{v.growthPercent}%
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

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
                  <th className="text-right px-3 py-3">Growth</th>
                  <th className="text-right px-5 py-3">Published</th>
                </tr>
              </thead>
              <tbody>
                {topVideos.slice(0, 5).map((v) => (
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
                      <PlatformBadge platform={v.platform} />
                    </td>
                    <td className="px-3 py-3 text-right font-medium text-xs" style={{ color: "#5C4A35" }}>
                      {formatNumber(v.views)}
                    </td>
                    <td className="px-3 py-3 text-right text-xs" style={{ color: "#A8967E" }}>
                      {formatNumber(v.likes)}
                    </td>
                    <td className="px-3 py-3 text-right">
                      <span className="text-xs font-semibold px-1.5 py-0.5 rounded" style={{ backgroundColor: "rgba(245,158,11,0.12)", color: "#D97706" }}>
                        {v.engagementRate}%
                      </span>
                    </td>
                    <td className="px-3 py-3 text-right text-xs font-bold text-emerald-600">
                      +{v.growthPercent}%
                    </td>
                    <td className="px-5 py-3 text-right text-xs" style={{ color: "#C4AA8A" }}>
                      {formatDate(v.publishedAt)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
