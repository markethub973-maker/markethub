"use client";

import { useState } from "react";
import Header from "@/components/layout/Header";
import PlatformBadge from "@/components/ui/PlatformBadge";
import { topVideos, type Platform } from "@/lib/mockData";
import { formatNumber, formatDate } from "@/lib/utils";
import { MessageCircle, Share2, ThumbsUp, Eye, Flame, PlayCircle } from "lucide-react";

const PLATFORMS: { label: string; value: Platform | "all" }[] = [
  { label: "All", value: "all" },
  { label: "YouTube", value: "youtube" },
  { label: "TikTok", value: "tiktok" },
  { label: "Instagram", value: "instagram" },
  { label: "Facebook", value: "facebook" },
];

const SORTS = [
  { label: "Most Views", value: "views" },
  { label: "Highest ER", value: "er" },
  { label: "Fastest Growing", value: "growth" },
  { label: "Most Liked", value: "likes" },
];

export default function VideosPage() {
  const [platform, setPlatform] = useState<Platform | "all">("all");
  const [sort, setSort] = useState("views");
  const [search, setSearch] = useState("");

  const filtered = topVideos
    .filter((v) => (platform === "all" ? true : v.platform === platform))
    .filter((v) => v.title.toLowerCase().includes(search.toLowerCase()) || v.channel.toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) => {
      if (sort === "views") return b.views - a.views;
      if (sort === "er") return b.engagementRate - a.engagementRate;
      if (sort === "growth") return b.growthPercent - a.growthPercent;
      if (sort === "likes") return b.likes - a.likes;
      return 0;
    });

  return (
    <div>
      <Header title="Top Videos" subtitle="Discover the best performing videos across platforms" />

      <div className="p-6 space-y-5">
        {/* Filters */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Platform filter */}
          <div className="flex bg-white border border-gray-200 rounded-lg overflow-hidden shadow-sm">
            {PLATFORMS.map((p) => (
              <button
                key={p.value}
                onClick={() => setPlatform(p.value)}
                className={`px-4 py-2 text-sm font-medium transition-colors ${
                  platform === p.value
                    ? "bg-[#39D3B8] text-white"
                    : "text-gray-600 hover:bg-gray-50"
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>

          {/* Sort */}
          <select
            value={sort}
            onChange={(e) => setSort(e.target.value)}
            className="px-3 py-2 text-sm border border-gray-200 rounded-lg bg-white shadow-sm focus:outline-none focus:ring-2 focus:ring-[#39D3B8]/40"
          >
            {SORTS.map((s) => (
              <option key={s.value} value={s.value}>{s.label}</option>
            ))}
          </select>

          {/* Search */}
          <input
            type="text"
            placeholder="Search videos..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="px-3 py-2 text-sm border border-gray-200 rounded-lg bg-white shadow-sm focus:outline-none focus:ring-2 focus:ring-[#39D3B8]/40 w-56"
          />

          <span className="ml-auto text-sm text-gray-400">{filtered.length} videos</span>
        </div>

        {/* Video Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map((v) => (
            <div key={v.id} className="bg-white rounded-xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow overflow-hidden group">
              {/* Thumbnail */}
              <div className="relative h-44 bg-gray-100 overflow-hidden">
                <img
                  src={v.thumbnail}
                  alt={v.title}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
                <div className="absolute bottom-2 right-2 bg-black/70 text-white text-xs px-1.5 py-0.5 rounded font-mono">
                  {v.duration}
                </div>
                {v.trending && (
                  <div className="absolute top-2 left-2 flex items-center gap-1 bg-orange-500 text-white text-xs px-2 py-0.5 rounded-full font-semibold">
                    <Flame className="w-3 h-3" /> Trending
                  </div>
                )}
              </div>

              {/* Content */}
              <div className="p-4">
                <div className="flex items-start justify-between gap-2 mb-2">
                  <PlatformBadge platform={v.platform} />
                  <span className="text-xs font-bold text-emerald-600">+{v.growthPercent}%</span>
                </div>
                <h3 className="font-semibold text-gray-900 text-sm leading-tight line-clamp-2 mb-1">
                  {v.title}
                </h3>
                <p className="text-xs text-gray-400 mb-3">{v.channel} · {formatDate(v.publishedAt)}</p>

                {/* Stats */}
                <div className="grid grid-cols-4 gap-1 pt-3 border-t border-gray-50">
                  <div className="flex flex-col items-center gap-0.5">
                    <Eye className="w-3.5 h-3.5 text-gray-400" />
                    <span className="text-xs font-semibold text-gray-700">{formatNumber(v.views)}</span>
                  </div>
                  <div className="flex flex-col items-center gap-0.5">
                    <ThumbsUp className="w-3.5 h-3.5 text-gray-400" />
                    <span className="text-xs font-semibold text-gray-700">{formatNumber(v.likes)}</span>
                  </div>
                  <div className="flex flex-col items-center gap-0.5">
                    <MessageCircle className="w-3.5 h-3.5 text-gray-400" />
                    <span className="text-xs font-semibold text-gray-700">{formatNumber(v.comments)}</span>
                  </div>
                  <div className="flex flex-col items-center gap-0.5">
                    <Share2 className="w-3.5 h-3.5 text-gray-400" />
                    <span className="text-xs font-semibold text-gray-700">{formatNumber(v.shares)}</span>
                  </div>
                </div>

                <div className="mt-3 flex items-center justify-between">
                  <span className="text-xs text-gray-500">Engagement Rate</span>
                  <span className="text-xs font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">
                    {v.engagementRate}%
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>

        {filtered.length === 0 && (
          <div className="text-center py-16 text-gray-400">
            <PlayCircle className="w-10 h-10 mx-auto mb-3 opacity-30" />
            <p>No videos found</p>
          </div>
        )}
      </div>
    </div>
  );
}
