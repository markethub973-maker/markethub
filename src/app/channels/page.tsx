"use client";

import { useState } from "react";
import Header from "@/components/layout/Header";
import PlatformBadge from "@/components/ui/PlatformBadge";
import { topChannels, type Platform } from "@/lib/mockData";
import { formatNumber } from "@/lib/utils";
import { Users, TrendingUp, TrendingDown, PlayCircle, Eye } from "lucide-react";

const PLATFORMS: { label: string; value: Platform | "all" }[] = [
  { label: "All", value: "all" },
  { label: "YouTube", value: "youtube" },
  { label: "TikTok", value: "tiktok" },
  { label: "Instagram", value: "instagram" },
  { label: "Facebook", value: "facebook" },
];

export default function ChannelsPage() {
  const [platform, setPlatform] = useState<Platform | "all">("all");
  const [sort, setSort] = useState("subscribers");

  const filtered = topChannels
    .filter((c) => (platform === "all" ? true : c.platform === platform))
    .sort((a, b) => {
      if (sort === "subscribers") return b.subscribers - a.subscribers;
      if (sort === "views") return b.totalViews - a.totalViews;
      if (sort === "er") return b.engagementRate - a.engagementRate;
      if (sort === "growth") return b.growthPercent - a.growthPercent;
      return 0;
    });

  return (
    <div>
      <Header title="Channels" subtitle="Track top creators across all platforms" />

      <div className="p-6 space-y-5">
        {/* Filters */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex rounded-lg overflow-hidden" style={{ border: "1px solid rgba(245,215,160,0.35)", backgroundColor: "#FFFCF7" }}>
            {PLATFORMS.map((p) => (
              <button
                key={p.value}
                onClick={() => setPlatform(p.value)}
                className="px-4 py-2 text-sm font-medium transition-colors"
                style={platform === p.value
                  ? { backgroundColor: "#F59E0B", color: "#1C1814" }
                  : { color: "#78614E" }}
                onMouseEnter={e => { if (platform !== p.value) e.currentTarget.style.backgroundColor = "rgba(245,215,160,0.15)"; }}
                onMouseLeave={e => { if (platform !== p.value) e.currentTarget.style.backgroundColor = "transparent"; }}
              >
                {p.label}
              </button>
            ))}
          </div>

          <select
            value={sort}
            onChange={(e) => setSort(e.target.value)}
            className="px-3 py-2 text-sm rounded-lg focus:outline-none"
            style={{ border: "1px solid rgba(245,215,160,0.35)", backgroundColor: "#FFFCF7", color: "#5C4A35" }}
          >
            <option value="subscribers">Most Subscribers</option>
            <option value="views">Most Views</option>
            <option value="er">Highest ER</option>
            <option value="growth">Fastest Growing</option>
          </select>
        </div>

        {/* Channels Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map((ch, i) => (
            <div key={ch.id} className="rounded-xl p-5 transition-shadow hover:shadow-md" style={{ backgroundColor: "#FFFCF7", border: "1px solid rgba(245,215,160,0.25)", boxShadow: "0 1px 3px rgba(120,97,78,0.08)" }}>
              {/* Header */}
              <div className="flex items-start gap-4">
                <div className="relative">
                  <img
                    src={ch.avatar}
                    alt={ch.name}
                    className="w-14 h-14 rounded-full"
                    style={{ border: "2px solid rgba(245,215,160,0.4)" }}
                  />
                  <span className="absolute -top-1 -left-1 w-5 h-5 text-white text-xs font-bold rounded-full flex items-center justify-center" style={{ backgroundColor: "#3D2E1E" }}>
                    {i + 1}
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <h3 className="font-bold truncate" style={{ color: "#292524" }}>{ch.name}</h3>
                    <span className={`text-xs font-bold flex-shrink-0 ${ch.growthPercent >= 0 ? "text-emerald-600" : "text-red-500"}`}>
                      {ch.growthPercent >= 0 ? <TrendingUp className="inline w-3 h-3" /> : <TrendingDown className="inline w-3 h-3" />}
                      {" "}{ch.growthPercent >= 0 ? "+" : ""}{ch.growthPercent}%
                    </span>
                  </div>
                  <div className="flex items-center gap-2 mt-1">
                    <PlatformBadge platform={ch.platform} />
                    <span className="text-xs" style={{ color: "#C4AA8A" }}>{ch.category}</span>
                  </div>
                </div>
              </div>

              {/* Stats Grid */}
              <div className="grid grid-cols-2 gap-3 mt-4 pt-4" style={{ borderTop: "1px solid rgba(245,215,160,0.2)" }}>
                <div className="rounded-lg p-3" style={{ backgroundColor: "rgba(245,215,160,0.1)" }}>
                  <div className="flex items-center gap-1.5 text-xs mb-1" style={{ color: "#C4AA8A" }}>
                    <Users className="w-3 h-3" />
                    Subscribers
                  </div>
                  <p className="text-base font-bold" style={{ color: "#292524" }}>{formatNumber(ch.subscribers)}</p>
                </div>
                <div className="rounded-lg p-3" style={{ backgroundColor: "rgba(245,215,160,0.1)" }}>
                  <div className="flex items-center gap-1.5 text-xs mb-1" style={{ color: "#C4AA8A" }}>
                    <Eye className="w-3 h-3" />
                    Total Views
                  </div>
                  <p className="text-base font-bold" style={{ color: "#292524" }}>{formatNumber(ch.totalViews)}</p>
                </div>
                <div className="rounded-lg p-3" style={{ backgroundColor: "rgba(245,215,160,0.1)" }}>
                  <div className="flex items-center gap-1.5 text-xs mb-1" style={{ color: "#C4AA8A" }}>
                    <PlayCircle className="w-3 h-3" />
                    Avg. Views
                  </div>
                  <p className="text-base font-bold" style={{ color: "#292524" }}>{formatNumber(ch.avgViews)}</p>
                </div>
                <div className="rounded-lg p-3" style={{ backgroundColor: "rgba(245,215,160,0.1)" }}>
                  <div className="flex items-center gap-1.5 text-xs mb-1" style={{ color: "#C4AA8A" }}>
                    <TrendingUp className="w-3 h-3" />
                    Engagement
                  </div>
                  <p className="text-base font-bold text-emerald-600">{ch.engagementRate}%</p>
                </div>
              </div>

              {/* Videos Count */}
              <div className="mt-3 flex items-center justify-between text-xs" style={{ color: "#C4AA8A" }}>
                <span>{formatNumber(ch.videoCount)} videos published</span>
                <button className="font-semibold hover:underline" style={{ color: "#F59E0B" }}>
                  View Analytics →
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
