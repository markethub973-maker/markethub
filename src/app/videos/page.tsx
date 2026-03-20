"use client";

import { useState, useEffect, useCallback } from "react";
import Header from "@/components/layout/Header";
import PlatformBadge from "@/components/ui/PlatformBadge";
import { formatNumber, formatDate } from "@/lib/utils";
import { MessageCircle, ThumbsUp, Eye, Search, Loader2, TrendingUp } from "lucide-react";
import type { YTVideo } from "@/lib/youtube";

const REGIONS = [
  { label: "🌍 Global (US)", value: "US" },
  { label: "🇷🇴 Romania", value: "RO" },
  { label: "🇬🇧 UK", value: "GB" },
  { label: "🇩🇪 Germany", value: "DE" },
  { label: "🇫🇷 France", value: "FR" },
];

const SORTS = [
  { label: "Most Views", value: "views" },
  { label: "Most Liked", value: "likes" },
  { label: "Most Comments", value: "comments" },
  { label: "Newest", value: "date" },
];

export default function VideosPage() {
  const [videos, setVideos] = useState<YTVideo[]>([]);
  const [loading, setLoading] = useState(true);
  const [region, setRegion] = useState("US");
  const [sort, setSort] = useState("views");
  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [mode, setMode] = useState<"trending" | "search">("trending");

  const fetchTrending = useCallback(async (r: string) => {
    setLoading(true);
    setMode("trending");
    const res = await fetch(`/api/youtube/trending?region=${r}&max=12`);
    const data = await res.json();
    setVideos(data);
    setLoading(false);
  }, []);

  const fetchSearch = useCallback(async (q: string) => {
    if (!q.trim()) return;
    setLoading(true);
    setMode("search");
    setSearch(q);
    const res = await fetch(`/api/youtube/search?q=${encodeURIComponent(q)}&max=12`);
    const data = await res.json();
    setVideos(data);
    setLoading(false);
  }, []);

  useEffect(() => { fetchTrending(region); }, [region, fetchTrending]);

  const sorted = [...videos].sort((a, b) => {
    if (sort === "views") return b.views - a.views;
    if (sort === "likes") return b.likes - a.likes;
    if (sort === "comments") return b.comments - a.comments;
    if (sort === "date") return new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime();
    return 0;
  });

  const engagementRate = (v: YTVideo) =>
    v.views > 0 ? (((v.likes + v.comments) / v.views) * 100).toFixed(1) : "0.0";

  return (
    <div>
      <Header title="Top Videos" subtitle="Date reale YouTube — actualizate la fiecare ora" />

      <div className="p-6 space-y-5">
        {/* Search Bar */}
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: "#C4AA8A" }} />
            <input
              type="text"
              placeholder="Cauta videoclipuri YouTube (ex: fotbal, gaming, muzica...)"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && fetchSearch(searchInput)}
              className="w-full pl-9 pr-4 py-2.5 text-sm rounded-lg focus:outline-none"
              style={{ border: "1px solid rgba(245,215,160,0.35)", backgroundColor: "#FFFCF7", color: "#292524" }}
            />
          </div>
          <button
            onClick={() => fetchSearch(searchInput)}
            className="px-4 py-2.5 text-sm font-semibold rounded-lg transition-colors"
            style={{ backgroundColor: "#F59E0B", color: "#1C1814" }}
            type="button"
          >
            Cauta
          </button>
          {mode === "search" && (
            <button
              type="button"
              onClick={() => { setSearchInput(""); fetchTrending(region); }}
              className="px-4 py-2.5 text-sm font-semibold rounded-lg transition-colors"
              style={{ backgroundColor: "rgba(245,215,160,0.2)", color: "#78614E" }}
            >
              Trending
            </button>
          )}
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-3">
          <select
            value={region}
            onChange={(e) => { setRegion(e.target.value); }}
            className="px-3 py-2 text-sm rounded-lg focus:outline-none"
            style={{ border: "1px solid rgba(245,215,160,0.35)", backgroundColor: "#FFFCF7", color: "#5C4A35" }}
            disabled={mode === "search"}
            title="Selecteaza regiunea"
            aria-label="Selecteaza regiunea"
          >
            {REGIONS.map((r) => (
              <option key={r.value} value={r.value}>{r.label}</option>
            ))}
          </select>

          <select
            value={sort}
            onChange={(e) => setSort(e.target.value)}
            className="px-3 py-2 text-sm rounded-lg focus:outline-none"
            style={{ border: "1px solid rgba(245,215,160,0.35)", backgroundColor: "#FFFCF7", color: "#5C4A35" }}
            title="Sorteaza dupa"
            aria-label="Sorteaza dupa"
          >
            {SORTS.map((s) => (
              <option key={s.value} value={s.value}>{s.label}</option>
            ))}
          </select>

          <div className="ml-auto flex items-center gap-2">
            {mode === "trending" && (
              <span className="flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full" style={{ backgroundColor: "rgba(245,158,11,0.12)", color: "#D97706" }}>
                <TrendingUp className="w-3 h-3" /> Trending {REGIONS.find(r => r.value === region)?.label}
              </span>
            )}
            {mode === "search" && (
              <span className="text-xs font-semibold px-2.5 py-1 rounded-full" style={{ backgroundColor: "rgba(245,158,11,0.12)", color: "#D97706" }}>
                Rezultate pentru: "{search}"
              </span>
            )}
            <span className="text-sm" style={{ color: "#C4AA8A" }}>{sorted.length} videos</span>
          </div>
        </div>

        {/* Loading */}
        {loading && (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin" style={{ color: "#F59E0B" }} />
            <span className="ml-3" style={{ color: "#A8967E" }}>Se incarca datele YouTube...</span>
          </div>
        )}

        {/* Video Grid */}
        {!loading && (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {sorted.map((v, i) => (
              <a
                key={v.id}
                href={`https://youtube.com/watch?v=${v.id}`}
                target="_blank"
                rel="noopener noreferrer"
                className="rounded-xl overflow-hidden group block transition-shadow hover:shadow-md"
                style={{ backgroundColor: "#FFFCF7", border: "1px solid rgba(245,215,160,0.25)", boxShadow: "0 1px 3px rgba(120,97,78,0.08)" }}
              >
                {/* Thumbnail */}
                <div className="relative h-44 overflow-hidden" style={{ backgroundColor: "#EDE0C8" }}>
                  <img
                    src={v.thumbnail}
                    alt={v.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
                  <div className="absolute top-2 left-2 bg-black/70 text-white text-xs px-1.5 py-0.5 rounded font-bold">
                    #{i + 1}
                  </div>
                </div>

                {/* Content */}
                <div className="p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <PlatformBadge platform="youtube" />
                  </div>
                  <h3 className="font-semibold text-sm leading-tight line-clamp-2 mb-1" style={{ color: "#292524" }}>
                    {v.title}
                  </h3>
                  <p className="text-xs mb-3" style={{ color: "#C4AA8A" }}>{v.channel} · {formatDate(v.publishedAt)}</p>

                  {/* Stats */}
                  <div className="grid grid-cols-3 gap-1 pt-3" style={{ borderTop: "1px solid rgba(245,215,160,0.2)" }}>
                    <div className="flex flex-col items-center gap-0.5">
                      <Eye className="w-3.5 h-3.5" style={{ color: "#C4AA8A" }} />
                      <span className="text-xs font-semibold" style={{ color: "#5C4A35" }}>{formatNumber(v.views)}</span>
                    </div>
                    <div className="flex flex-col items-center gap-0.5">
                      <ThumbsUp className="w-3.5 h-3.5" style={{ color: "#C4AA8A" }} />
                      <span className="text-xs font-semibold" style={{ color: "#5C4A35" }}>{formatNumber(v.likes)}</span>
                    </div>
                    <div className="flex flex-col items-center gap-0.5">
                      <MessageCircle className="w-3.5 h-3.5" style={{ color: "#C4AA8A" }} />
                      <span className="text-xs font-semibold" style={{ color: "#5C4A35" }}>{formatNumber(v.comments)}</span>
                    </div>
                  </div>

                  <div className="mt-3 flex items-center justify-between">
                    <span className="text-xs" style={{ color: "#A8967E" }}>Engagement Rate</span>
                    <span className="text-xs font-bold px-2 py-0.5 rounded-full" style={{ backgroundColor: "rgba(245,158,11,0.12)", color: "#D97706" }}>
                      {engagementRate(v)}%
                    </span>
                  </div>
                </div>
              </a>
            ))}
          </div>
        )}

        {!loading && sorted.length === 0 && (
          <div className="text-center py-16" style={{ color: "#C4AA8A" }}>
            <p>Nu s-au gasit rezultate.</p>
          </div>
        )}
      </div>
    </div>
  );
}
