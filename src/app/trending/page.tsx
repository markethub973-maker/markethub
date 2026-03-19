"use client";

import { useState } from "react";
import Header from "@/components/layout/Header";
import PlatformBadge from "@/components/ui/PlatformBadge";
import { trendingTopics, type Platform } from "@/lib/mockData";
import { formatNumber } from "@/lib/utils";
import { TrendingUp, TrendingDown, Flame, Hash } from "lucide-react";

const CATEGORIES = ["All", "Technology", "Fitness", "Lifestyle", "Travel", "Food", "Education", "Fashion", "Comedy", "Sports"];

export default function TrendingPage() {
  const [platform, setPlatform] = useState<Platform | "all">("all");
  const [category, setCategory] = useState("All");

  const filtered = trendingTopics
    .filter((t) => (platform === "all" ? true : t.platform === platform))
    .filter((t) => category === "All" ? true : t.category === category)
    .sort((a, b) => b.growthPercent - a.growthPercent);

  const top3 = [...trendingTopics].sort((a, b) => b.growthPercent - a.growthPercent).slice(0, 3);

  return (
    <div>
      <Header title="Trending Discovery" subtitle="Find viral content and emerging topics before they peak" />

      <div className="p-6 space-y-6">
        {/* Hot Topics */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {top3.map((topic, i) => (
            <div
              key={topic.id}
              className={`rounded-xl p-5 border ${
                i === 0
                  ? "bg-gradient-to-br from-orange-500 to-pink-600 border-transparent text-white"
                  : "bg-white border-gray-100"
              } shadow-sm`}
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-2">
                  {i === 0 ? (
                    <Flame className="w-5 h-5 text-yellow-300" />
                  ) : (
                    <Hash className="w-4 h-4 text-gray-400" />
                  )}
                  <span className={`text-xs font-semibold ${i === 0 ? "text-white/80" : "text-gray-500"}`}>
                    #{i + 1} Trending
                  </span>
                </div>
                <PlatformBadge platform={topic.platform} />
              </div>
              <h3 className={`text-xl font-bold mb-1 ${i === 0 ? "text-white" : "text-gray-900"}`}>
                {topic.keyword}
              </h3>
              <p className={`text-sm ${i === 0 ? "text-white/70" : "text-gray-500"}`}>
                {topic.category}
              </p>
              <div className={`mt-4 pt-4 border-t ${i === 0 ? "border-white/20" : "border-gray-50"} flex justify-between text-sm`}>
                <div>
                  <p className={`text-xs ${i === 0 ? "text-white/60" : "text-gray-400"}`}>Videos</p>
                  <p className={`font-bold ${i === 0 ? "text-white" : "text-gray-900"}`}>{formatNumber(topic.videoCount)}</p>
                </div>
                <div>
                  <p className={`text-xs ${i === 0 ? "text-white/60" : "text-gray-400"}`}>Total Views</p>
                  <p className={`font-bold ${i === 0 ? "text-white" : "text-gray-900"}`}>{formatNumber(topic.totalViews)}</p>
                </div>
                <div>
                  <p className={`text-xs ${i === 0 ? "text-white/60" : "text-gray-400"}`}>Growth</p>
                  <p className={`font-bold ${i === 0 ? "text-yellow-300" : "text-emerald-600"}`}>
                    +{topic.growthPercent}%
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-3">
          {(["all", "youtube", "tiktok", "instagram", "facebook"] as const).map((p) => (
            <button
              key={p}
              onClick={() => setPlatform(p)}
              className={`px-4 py-2 text-sm font-medium rounded-lg border transition-colors ${
                platform === p
                  ? "bg-[#39D3B8] text-white border-[#39D3B8]"
                  : "bg-white text-gray-600 border-gray-200 hover:bg-gray-50"
              }`}
            >
              {p === "all" ? "All Platforms" : p.charAt(0).toUpperCase() + p.slice(1)}
            </button>
          ))}

          <div className="ml-auto flex flex-wrap gap-2">
            {CATEGORIES.map((cat) => (
              <button
                key={cat}
                onClick={() => setCategory(cat)}
                className={`px-3 py-1.5 text-xs font-medium rounded-full border transition-colors ${
                  category === cat
                    ? "bg-[#4F4DF0] text-white border-[#4F4DF0]"
                    : "bg-white text-gray-500 border-gray-200 hover:bg-gray-50"
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {/* Topics Table */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 text-xs text-gray-500 uppercase tracking-wide">
                <th className="text-left px-5 py-3">#</th>
                <th className="text-left px-3 py-3">Keyword / Topic</th>
                <th className="text-left px-3 py-3">Platform</th>
                <th className="text-left px-3 py-3">Category</th>
                <th className="text-right px-3 py-3">Videos</th>
                <th className="text-right px-3 py-3">Total Views</th>
                <th className="text-right px-5 py-3">Growth</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((t, i) => (
                <tr key={t.id} className="border-t border-gray-50 hover:bg-gray-50/50 transition-colors">
                  <td className="px-5 py-3">
                    <span className="w-6 h-6 rounded-full bg-gray-100 flex items-center justify-center text-xs font-bold text-gray-500">
                      {i + 1}
                    </span>
                  </td>
                  <td className="px-3 py-3">
                    <div className="flex items-center gap-2">
                      <Hash className="w-4 h-4 text-[#39D3B8]" />
                      <span className="font-semibold text-gray-800">{t.keyword}</span>
                    </div>
                  </td>
                  <td className="px-3 py-3"><PlatformBadge platform={t.platform} /></td>
                  <td className="px-3 py-3">
                    <span className="bg-[#4F4DF0]/10 text-[#4F4DF0] text-xs font-medium px-2 py-0.5 rounded-full">
                      {t.category}
                    </span>
                  </td>
                  <td className="px-3 py-3 text-right font-medium text-gray-700">{formatNumber(t.videoCount)}</td>
                  <td className="px-3 py-3 text-right text-gray-500">{formatNumber(t.totalViews)}</td>
                  <td className="px-5 py-3 text-right">
                    <span className={`flex items-center justify-end gap-1 font-bold text-xs ${
                      t.growthPercent >= 0 ? "text-emerald-600" : "text-red-500"
                    }`}>
                      {t.growthPercent >= 0
                        ? <TrendingUp className="w-3.5 h-3.5" />
                        : <TrendingDown className="w-3.5 h-3.5" />}
                      {t.growthPercent >= 0 ? "+" : ""}{t.growthPercent}%
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {filtered.length === 0 && (
            <div className="text-center py-12 text-gray-400 text-sm">No topics found for selected filters.</div>
          )}
        </div>
      </div>
    </div>
  );
}
