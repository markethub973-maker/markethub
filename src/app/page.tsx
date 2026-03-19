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
              className="bg-white rounded-xl border border-gray-100 p-4 shadow-sm"
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
              <p className="text-xl font-bold text-gray-900">
                {formatNumber(p.totalViews)}
              </p>
              <p className="text-xs text-gray-400 mt-0.5">views</p>
              <div className="mt-3 pt-3 border-t border-gray-50 flex justify-between text-xs text-gray-500">
                <span>ER: <b className="text-gray-700">{p.avgEngagementRate}%</b></span>
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
          <div className="bg-white rounded-xl border border-gray-100 p-5 shadow-sm">
            <div className="flex items-center gap-2 mb-4">
              <Flame className="w-4 h-4 text-orange-500" />
              <h3 className="font-semibold text-gray-900">Trending Now</h3>
            </div>
            <div className="space-y-3">
              {trendingVideos.map((v, i) => (
                <div key={v.id} className="flex items-start gap-3">
                  <span className="w-5 h-5 rounded-full bg-gray-100 flex items-center justify-center text-xs font-bold text-gray-500 flex-shrink-0 mt-0.5">
                    {i + 1}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-gray-800 truncate leading-tight">
                      {v.title}
                    </p>
                    <div className="flex items-center gap-2 mt-1">
                      <PlatformBadge platform={v.platform} />
                      <span className="text-xs text-gray-400">
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
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-gray-50">
            <h3 className="font-semibold text-gray-900">Top Videos This Week</h3>
            <a href="/videos" className="text-xs text-[#39D3B8] font-semibold hover:underline">
              View all →
            </a>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 text-xs text-gray-500 uppercase tracking-wide">
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
                  <tr key={v.id} className="border-t border-gray-50 hover:bg-gray-50/50 transition-colors">
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-16 h-9 rounded-md bg-gray-200 overflow-hidden flex-shrink-0">
                          <img src={v.thumbnail} alt="" className="w-full h-full object-cover" />
                        </div>
                        <div>
                          <p className="font-medium text-gray-800 text-xs leading-tight max-w-[220px] truncate">
                            {v.title}
                          </p>
                          <p className="text-xs text-gray-400 mt-0.5">{v.channel}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-3 py-3">
                      <PlatformBadge platform={v.platform} />
                    </td>
                    <td className="px-3 py-3 text-right font-medium text-gray-700 text-xs">
                      {formatNumber(v.views)}
                    </td>
                    <td className="px-3 py-3 text-right text-gray-500 text-xs">
                      {formatNumber(v.likes)}
                    </td>
                    <td className="px-3 py-3 text-right">
                      <span className="bg-emerald-50 text-emerald-600 text-xs font-semibold px-1.5 py-0.5 rounded">
                        {v.engagementRate}%
                      </span>
                    </td>
                    <td className="px-3 py-3 text-right text-xs font-bold text-emerald-600">
                      +{v.growthPercent}%
                    </td>
                    <td className="px-5 py-3 text-right text-xs text-gray-400">
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
