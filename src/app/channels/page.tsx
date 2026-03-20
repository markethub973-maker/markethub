"use client";

import { useState } from "react";
import Header from "@/components/layout/Header";
import PlatformBadge from "@/components/ui/PlatformBadge";
import ChannelAnalyticsModal from "@/components/ui/ChannelAnalyticsModal";
import CompareModal from "@/components/ui/CompareModal";
import { topChannels, type Platform, type Channel } from "@/lib/mockData";
import { formatNumber } from "@/lib/utils";
import { Users, TrendingUp, TrendingDown, PlayCircle, Eye, Search, Download, ArrowLeftRight } from "lucide-react";

const PLATFORMS: { label: string; value: Platform | "all" }[] = [
  { label: "All", value: "all" },
  { label: "YouTube", value: "youtube" },
  { label: "TikTok", value: "tiktok" },
  { label: "Instagram", value: "instagram" },
  { label: "Facebook", value: "facebook" },
];

function exportCSV(channels: Channel[]) {
  const headers = ["Name", "Platform", "Category", "Subscribers", "Total Views", "Avg Views", "Engagement %", "Growth %", "Videos"];
  const rows = channels.map(c => [
    c.name, c.platform, c.category,
    c.subscribers, c.totalViews, c.avgViews,
    c.engagementRate, c.growthPercent, c.videoCount,
  ]);
  const csv = [headers, ...rows].map(r => r.join(",")).join("\n");
  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "markethub-channels.csv";
  a.click();
  URL.revokeObjectURL(url);
}

export default function ChannelsPage() {
  const [platform, setPlatform] = useState<Platform | "all">("all");
  const [sort, setSort] = useState("subscribers");
  const [search, setSearch] = useState("");
  const [analyticsChannel, setAnalyticsChannel] = useState<Channel | null>(null);
  const [compareList, setCompareList] = useState<Channel[]>([]);
  const [showCompare, setShowCompare] = useState(false);

  const filtered = topChannels
    .filter((c) => (platform === "all" ? true : c.platform === platform))
    .filter((c) => search.trim() === "" ? true : c.name.toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) => {
      if (sort === "subscribers") return b.subscribers - a.subscribers;
      if (sort === "views") return b.totalViews - a.totalViews;
      if (sort === "er") return b.engagementRate - a.engagementRate;
      if (sort === "growth") return b.growthPercent - a.growthPercent;
      return 0;
    });

  const toggleCompare = (ch: Channel) => {
    if (compareList.find(c => c.id === ch.id)) {
      setCompareList(compareList.filter(c => c.id !== ch.id));
    } else if (compareList.length < 2) {
      setCompareList([...compareList, ch]);
    }
  };

  return (
    <div>
      <Header title="Channels" subtitle="Track top creators across all platforms" />

      {analyticsChannel && (
        <ChannelAnalyticsModal channel={analyticsChannel} onClose={() => setAnalyticsChannel(null)} />
      )}
      {showCompare && compareList.length === 2 && (
        <CompareModal channels={compareList} onClose={() => { setShowCompare(false); setCompareList([]); }} />
      )}

      <div className="p-6 space-y-5">
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: "#C4AA8A" }} />
          <input
            type="text"
            placeholder="Cauta canal (ex: MrBeast, cristiano, MKBHD...)"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 text-sm rounded-lg focus:outline-none"
            style={{ border: "1px solid rgba(245,215,160,0.35)", backgroundColor: "#FFFCF7", color: "#292524" }}
          />
        </div>

        {/* Filters + Actions */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex rounded-lg overflow-hidden" style={{ border: "1px solid rgba(245,215,160,0.35)", backgroundColor: "#FFFCF7" }}>
            {PLATFORMS.map((p) => (
              <button
                key={p.value}
                type="button"
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
            title="Sorteaza canale"
            aria-label="Sorteaza canale"
            className="px-3 py-2 text-sm rounded-lg focus:outline-none"
            style={{ border: "1px solid rgba(245,215,160,0.35)", backgroundColor: "#FFFCF7", color: "#5C4A35" }}
          >
            <option value="subscribers">Most Subscribers</option>
            <option value="views">Most Views</option>
            <option value="er">Highest ER</option>
            <option value="growth">Fastest Growing</option>
          </select>

          <div className="ml-auto flex items-center gap-2">
            {/* Compare button */}
            {compareList.length > 0 && (
              <button
                type="button"
                onClick={() => compareList.length === 2 ? setShowCompare(true) : null}
                className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-semibold transition-colors"
                style={compareList.length === 2
                  ? { backgroundColor: "#F59E0B", color: "#1C1814" }
                  : { backgroundColor: "rgba(245,158,11,0.12)", color: "#D97706", border: "1px solid rgba(245,158,11,0.25)" }}
              >
                <ArrowLeftRight className="w-4 h-4" />
                {compareList.length === 2 ? "Compara acum!" : `Selectat ${compareList.length}/2`}
              </button>
            )}

            {/* Export CSV */}
            <button
              type="button"
              onClick={() => exportCSV(filtered)}
              className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-semibold transition-colors"
              style={{ backgroundColor: "rgba(245,215,160,0.15)", color: "#78614E", border: "1px solid rgba(245,215,160,0.35)" }}
              onMouseEnter={e => (e.currentTarget.style.backgroundColor = "rgba(245,215,160,0.25)")}
              onMouseLeave={e => (e.currentTarget.style.backgroundColor = "rgba(245,215,160,0.15)")}
            >
              <Download className="w-4 h-4" />
              Export CSV
            </button>
          </div>
        </div>

        {compareList.length > 0 && compareList.length < 2 && (
          <p className="text-xs" style={{ color: "#F59E0B" }}>
            ✓ <b>{compareList[0].name}</b> selectat — alege inca un canal pentru comparatie
          </p>
        )}

        {/* Channels Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map((ch, i) => {
            const isSelected = compareList.some(c => c.id === ch.id);
            return (
              <div key={ch.id} className="rounded-xl p-5 transition-shadow hover:shadow-md"
                style={{
                  backgroundColor: "#FFFCF7",
                  border: isSelected ? "2px solid #F59E0B" : "1px solid rgba(245,215,160,0.25)",
                  boxShadow: "0 1px 3px rgba(120,97,78,0.08)"
                }}
              >
                {/* Header */}
                <div className="flex items-start gap-4">
                  <div className="relative">
                    <img src={ch.avatar} alt={ch.name} className="w-14 h-14 rounded-full" style={{ border: "2px solid rgba(245,215,160,0.4)" }} />
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
                  {[
                    { icon: <Users className="w-3 h-3" />, label: "Subscribers", val: formatNumber(ch.subscribers) },
                    { icon: <Eye className="w-3 h-3" />, label: "Total Views", val: formatNumber(ch.totalViews) },
                    { icon: <PlayCircle className="w-3 h-3" />, label: "Avg. Views", val: formatNumber(ch.avgViews) },
                    { icon: <TrendingUp className="w-3 h-3" />, label: "Engagement", val: ch.engagementRate + "%" },
                  ].map(s => (
                    <div key={s.label} className="rounded-lg p-3" style={{ backgroundColor: "rgba(245,215,160,0.1)" }}>
                      <div className="flex items-center gap-1.5 text-xs mb-1" style={{ color: "#C4AA8A" }}>
                        {s.icon}{s.label}
                      </div>
                      <p className="text-base font-bold" style={{ color: s.label === "Engagement" ? "#16a34a" : "#292524" }}>{s.val}</p>
                    </div>
                  ))}
                </div>

                {/* Actions */}
                <div className="mt-3 flex items-center justify-between text-xs" style={{ color: "#C4AA8A" }}>
                  <span>{formatNumber(ch.videoCount)} videos published</span>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => toggleCompare(ch)}
                      className="font-semibold transition-colors px-2 py-1 rounded"
                      style={isSelected
                        ? { color: "#F59E0B", backgroundColor: "rgba(245,158,11,0.1)" }
                        : { color: "#A8967E" }
                      }
                      onMouseEnter={e => { if (!isSelected) e.currentTarget.style.color = "#F59E0B"; }}
                      onMouseLeave={e => { if (!isSelected) e.currentTarget.style.color = "#A8967E"; }}
                    >
                      {isSelected ? "✓ Selectat" : "Compara"}
                    </button>
                    <button
                      type="button"
                      onClick={() => setAnalyticsChannel(ch)}
                      className="font-semibold hover:underline"
                      style={{ color: "#F59E0B" }}
                    >
                      View Analytics →
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
