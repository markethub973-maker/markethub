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
              className="rounded-xl p-5"
              style={i === 0
                ? { background: "linear-gradient(135deg, #F59E0B, #D97706)", color: "white", boxShadow: "0 4px 12px rgba(245,158,11,0.3)" }
                : { backgroundColor: "#FFFCF7", border: "1px solid rgba(245,215,160,0.25)", boxShadow: "0 1px 3px rgba(120,97,78,0.08)" }
              }
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-2">
                  {i === 0 ? (
                    <Flame className="w-5 h-5" style={{ color: "rgba(255,255,255,0.9)" }} />
                  ) : (
                    <Hash className="w-4 h-4" style={{ color: "#C4AA8A" }} />
                  )}
                  <span className="text-xs font-semibold" style={{ color: i === 0 ? "rgba(255,255,255,0.8)" : "#A8967E" }}>
                    #{i + 1} Trending
                  </span>
                </div>
                <PlatformBadge platform={topic.platform} />
              </div>
              <h3 className="text-xl font-bold mb-1" style={{ color: i === 0 ? "white" : "#292524" }}>
                {topic.keyword}
              </h3>
              <p className="text-sm" style={{ color: i === 0 ? "rgba(255,255,255,0.7)" : "#A8967E" }}>
                {topic.category}
              </p>
              <div className="mt-4 pt-4 flex justify-between text-sm" style={{ borderTop: i === 0 ? "1px solid rgba(255,255,255,0.2)" : "1px solid rgba(245,215,160,0.2)" }}>
                <div>
                  <p className="text-xs" style={{ color: i === 0 ? "rgba(255,255,255,0.6)" : "#C4AA8A" }}>Videos</p>
                  <p className="font-bold" style={{ color: i === 0 ? "white" : "#292524" }}>{formatNumber(topic.videoCount)}</p>
                </div>
                <div>
                  <p className="text-xs" style={{ color: i === 0 ? "rgba(255,255,255,0.6)" : "#C4AA8A" }}>Total Views</p>
                  <p className="font-bold" style={{ color: i === 0 ? "white" : "#292524" }}>{formatNumber(topic.totalViews)}</p>
                </div>
                <div>
                  <p className="text-xs" style={{ color: i === 0 ? "rgba(255,255,255,0.6)" : "#C4AA8A" }}>Growth</p>
                  <p className="font-bold" style={{ color: i === 0 ? "rgba(255,255,200,1)" : "#16a34a" }}>
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
              className="px-4 py-2 text-sm font-medium rounded-lg transition-colors"
              style={platform === p
                ? { backgroundColor: "#F59E0B", color: "#1C1814", border: "1px solid #F59E0B" }
                : { backgroundColor: "#FFFCF7", color: "#78614E", border: "1px solid rgba(245,215,160,0.35)" }
              }
            >
              {p === "all" ? "All Platforms" : p.charAt(0).toUpperCase() + p.slice(1)}
            </button>
          ))}

          <div className="ml-auto flex flex-wrap gap-2">
            {CATEGORIES.map((cat) => (
              <button
                key={cat}
                onClick={() => setCategory(cat)}
                className="px-3 py-1.5 text-xs font-medium rounded-full transition-colors"
                style={category === cat
                  ? { backgroundColor: "#F59E0B", color: "#1C1814", border: "1px solid #F59E0B" }
                  : { backgroundColor: "#FFFCF7", color: "#A8967E", border: "1px solid rgba(245,215,160,0.35)" }
                }
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {/* Topics Table */}
        <div className="rounded-xl overflow-hidden" style={{ backgroundColor: "#FFFCF7", border: "1px solid rgba(245,215,160,0.25)", boxShadow: "0 1px 3px rgba(120,97,78,0.08)" }}>
          <table className="w-full text-sm">
            <thead>
              <tr className="text-xs uppercase tracking-wide" style={{ backgroundColor: "rgba(245,215,160,0.1)", color: "#A8967E" }}>
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
                <tr key={t.id} className="transition-colors" style={{ borderTop: "1px solid rgba(245,215,160,0.15)" }}
                  onMouseEnter={e => (e.currentTarget.style.backgroundColor = "rgba(245,215,160,0.07)")}
                  onMouseLeave={e => (e.currentTarget.style.backgroundColor = "transparent")}
                >
                  <td className="px-5 py-3">
                    <span className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold" style={{ backgroundColor: "rgba(245,215,160,0.2)", color: "#78614E" }}>
                      {i + 1}
                    </span>
                  </td>
                  <td className="px-3 py-3">
                    <div className="flex items-center gap-2">
                      <Hash className="w-4 h-4" style={{ color: "#F59E0B" }} />
                      <span className="font-semibold" style={{ color: "#3D2E1E" }}>{t.keyword}</span>
                    </div>
                  </td>
                  <td className="px-3 py-3"><PlatformBadge platform={t.platform} /></td>
                  <td className="px-3 py-3">
                    <span className="text-xs font-medium px-2 py-0.5 rounded-full" style={{ backgroundColor: "rgba(245,158,11,0.12)", color: "#D97706" }}>
                      {t.category}
                    </span>
                  </td>
                  <td className="px-3 py-3 text-right font-medium" style={{ color: "#5C4A35" }}>{formatNumber(t.videoCount)}</td>
                  <td className="px-3 py-3 text-right" style={{ color: "#A8967E" }}>{formatNumber(t.totalViews)}</td>
                  <td className="px-5 py-3 text-right">
                    <span className={`flex items-center justify-end gap-1 font-bold text-xs ${t.growthPercent >= 0 ? "text-emerald-600" : "text-red-500"}`}>
                      {t.growthPercent >= 0 ? <TrendingUp className="w-3.5 h-3.5" /> : <TrendingDown className="w-3.5 h-3.5" />}
                      {t.growthPercent >= 0 ? "+" : ""}{t.growthPercent}%
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {filtered.length === 0 && (
            <div className="text-center py-12 text-sm" style={{ color: "#C4AA8A" }}>No topics found for selected filters.</div>
          )}
        </div>
      </div>
    </div>
  );
}
