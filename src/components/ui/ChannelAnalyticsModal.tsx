"use client";

import { useEffect, useState } from "react";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, RadarChart, Radar, PolarGrid, PolarAngleAxis,
} from "recharts";
import { X, Users, Eye, PlayCircle, TrendingUp, Globe, User2 } from "lucide-react";
import type { Channel } from "@/lib/mockData";
import { formatNumber } from "@/lib/utils";

// YouTube channel ID mapping for mock channels
const YT_CHANNEL_IDS: Record<string, string> = {
  "MrBeast": "UCX6OQ3DkcsbYNE6H8uQQuVA",
  "MKBHD": "UCBJycsmduvYEL83R_U4JriQ",
};

// Generate deterministic demographics based on category
function getDemographics(channel: Channel) {
  const cat = channel.category.toLowerCase();

  const ageData = cat.includes("tech") || cat.includes("gaming")
    ? [{ age: "13-17", pct: 12 }, { age: "18-24", pct: 34 }, { age: "25-34", pct: 30 }, { age: "35-44", pct: 14 }, { age: "45+", pct: 10 }]
    : cat.includes("sport") || cat.includes("fitness")
    ? [{ age: "13-17", pct: 8 }, { age: "18-24", pct: 28 }, { age: "25-34", pct: 35 }, { age: "35-44", pct: 20 }, { age: "45+", pct: 9 }]
    : cat.includes("food") || cat.includes("lifestyle")
    ? [{ age: "13-17", pct: 6 }, { age: "18-24", pct: 22 }, { age: "25-34", pct: 32 }, { age: "35-44", pct: 24 }, { age: "45+", pct: 16 }]
    : cat.includes("dance") || cat.includes("comedy")
    ? [{ age: "13-17", pct: 22 }, { age: "18-24", pct: 38 }, { age: "25-34", pct: 24 }, { age: "35-44", pct: 10 }, { age: "45+", pct: 6 }]
    : [{ age: "13-17", pct: 10 }, { age: "18-24", pct: 28 }, { age: "25-34", pct: 32 }, { age: "35-44", pct: 18 }, { age: "45+", pct: 12 }];

  const maleShare = cat.includes("tech") ? 78 : cat.includes("sport") ? 72 : cat.includes("dance") ? 38 : cat.includes("food") ? 45 : 52;
  const genderData = [
    { name: "Masculin", value: maleShare, color: "#F59E0B" },
    { name: "Feminin", value: 100 - maleShare, color: "#D97706" },
  ];

  const countriesBase = channel.platform === "youtube"
    ? [{ country: "🇺🇸 SUA", pct: 28 }, { country: "🇮🇳 India", pct: 18 }, { country: "🇧🇷 Brazilia", pct: 9 }, { country: "🇬🇧 UK", pct: 7 }, { country: "🇷🇴 Romania", pct: 3 }]
    : channel.platform === "tiktok"
    ? [{ country: "🇺🇸 SUA", pct: 24 }, { country: "🇮🇩 Indonesia", pct: 14 }, { country: "🇧🇷 Brazilia", pct: 11 }, { country: "🇲🇽 Mexic", pct: 8 }, { country: "🇷🇴 Romania", pct: 2 }]
    : [{ country: "🇺🇸 SUA", pct: 31 }, { country: "🇧🇷 Brazilia", pct: 12 }, { country: "🇬🇧 UK", pct: 8 }, { country: "🇫🇷 Franta", pct: 6 }, { country: "🇷🇴 Romania", pct: 4 }];

  return { ageData, genderData, countriesBase };
}

interface Props {
  channel: Channel;
  onClose: () => void;
}

export default function ChannelAnalyticsModal({ channel, onClose }: Props) {
  const [recentVideos, setRecentVideos] = useState<any[]>([]);
  const [loadingVideos, setLoadingVideos] = useState(false);
  const { ageData, genderData, countriesBase } = getDemographics(channel);

  useEffect(() => {
    const ytId = YT_CHANNEL_IDS[channel.name];
    if (ytId) {
      setLoadingVideos(true);
      fetch(`/api/youtube/channel-videos?id=${ytId}`)
        .then(r => r.json())
        .then(data => { setRecentVideos(data); setLoadingVideos(false); })
        .catch(() => setLoadingVideos(false));
    }
  }, [channel.name]);

  // Fallback mock chart data if no real data
  const chartData = recentVideos.length > 0
    ? recentVideos.slice(0, 8).map((v, i) => ({
        name: `V${i + 1}`,
        views: Math.round(v.views / 1_000_000 * 10) / 10,
        label: v.title.slice(0, 20) + "...",
      }))
    : Array.from({ length: 8 }, (_, i) => ({
        name: `V${i + 1}`,
        views: Math.round((channel.avgViews / 1_000_000) * (0.6 + Math.sin(i) * 0.4 + Math.random() * 0.3) * 10) / 10,
        label: `Video ${i + 1}`,
      }));

  const tooltipStyle = { fontSize: 11, borderRadius: 8, border: "1px solid rgba(245,215,160,0.4)", backgroundColor: "#FFFCF7", color: "#292524" };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ backgroundColor: "rgba(28,24,20,0.7)" }}>
      <div
        className="w-full max-w-3xl max-h-[90vh] overflow-y-auto rounded-2xl"
        style={{ backgroundColor: "#FFFCF7", border: "1px solid rgba(245,215,160,0.3)", boxShadow: "0 24px 60px rgba(28,24,20,0.3)" }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 sticky top-0 z-10" style={{ backgroundColor: "#FFFCF7", borderBottom: "1px solid rgba(245,215,160,0.2)" }}>
          <div className="flex items-center gap-3">
            <img src={channel.avatar} alt={channel.name} className="w-10 h-10 rounded-full" />
            <div>
              <h2 className="font-bold text-lg" style={{ color: "#292524" }}>{channel.name}</h2>
              <p className="text-xs" style={{ color: "#A8967E" }}>{channel.platform} · {channel.category}</p>
            </div>
          </div>
          <button type="button" onClick={onClose} className="p-2 rounded-lg transition-colors" style={{ color: "#A8967E" }}
            onMouseEnter={e => (e.currentTarget.style.backgroundColor = "rgba(245,215,160,0.15)")}
            onMouseLeave={e => (e.currentTarget.style.backgroundColor = "transparent")}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Stats Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              { icon: <Users className="w-4 h-4" />, label: "Subscribers", value: formatNumber(channel.subscribers) },
              { icon: <Eye className="w-4 h-4" />, label: "Total Views", value: formatNumber(channel.totalViews) },
              { icon: <PlayCircle className="w-4 h-4" />, label: "Avg. Views", value: formatNumber(channel.avgViews) },
              { icon: <TrendingUp className="w-4 h-4" />, label: "Engagement", value: channel.engagementRate + "%" },
            ].map(s => (
              <div key={s.label} className="rounded-xl p-4 text-center" style={{ backgroundColor: "rgba(245,215,160,0.1)", border: "1px solid rgba(245,215,160,0.2)" }}>
                <div className="flex justify-center mb-1" style={{ color: "#F59E0B" }}>{s.icon}</div>
                <p className="text-xs mb-1" style={{ color: "#A8967E" }}>{s.label}</p>
                <p className="text-lg font-bold" style={{ color: "#292524" }}>{s.value}</p>
              </div>
            ))}
          </div>

          {/* Recent Videos Chart */}
          <div>
            <h3 className="font-semibold mb-1" style={{ color: "#292524" }}>
              {recentVideos.length > 0 ? "Ultimele videoclipuri (date reale)" : "Performanta videoclipuri (estimata)"}
            </h3>
            <p className="text-xs mb-3" style={{ color: "#A8967E" }}>Vizualizari per video (milioane)</p>
            {loadingVideos ? (
              <div className="h-48 flex items-center justify-center" style={{ color: "#C4AA8A" }}>Se incarca...</div>
            ) : (
              <ResponsiveContainer width="100%" height={180}>
                <BarChart data={chartData} margin={{ left: -20, right: 8 }}>
                  <XAxis dataKey="name" tick={{ fontSize: 10, fill: "#C4AA8A" }} />
                  <YAxis tick={{ fontSize: 10, fill: "#C4AA8A" }} />
                  <Tooltip contentStyle={tooltipStyle} formatter={(v: any) => [v + "M vizualizari", ""]} />
                  <Bar dataKey="views" fill="#F59E0B" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>

          {/* Demographics */}
          <div>
            <h3 className="font-semibold mb-4 flex items-center gap-2" style={{ color: "#292524" }}>
              <User2 className="w-4 h-4" style={{ color: "#F59E0B" }} />
              Audienta Demographics
              <span className="text-xs font-normal px-2 py-0.5 rounded-full" style={{ backgroundColor: "rgba(245,158,11,0.12)", color: "#D97706" }}>estimata</span>
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Age */}
              <div>
                <p className="text-xs font-semibold mb-3" style={{ color: "#78614E" }}>Varsta</p>
                <div className="space-y-2">
                  {ageData.map(d => (
                    <div key={d.age} className="flex items-center gap-2">
                      <span className="text-xs w-12 flex-shrink-0" style={{ color: "#A8967E" }}>{d.age}</span>
                      <div className="flex-1 h-2 rounded-full overflow-hidden" style={{ backgroundColor: "rgba(245,215,160,0.2)" }}>
                        <div className="h-full rounded-full transition-all" style={{ width: d.pct + "%", background: "linear-gradient(90deg, #F59E0B, #D97706)" }} />
                      </div>
                      <span className="text-xs w-8 text-right font-semibold" style={{ color: "#5C4A35" }}>{d.pct}%</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Gender */}
              <div>
                <p className="text-xs font-semibold mb-3" style={{ color: "#78614E" }}>Gen</p>
                <ResponsiveContainer width="100%" height={120}>
                  <PieChart>
                    <Pie data={genderData} cx="50%" cy="50%" innerRadius={30} outerRadius={50} dataKey="value" paddingAngle={3}>
                      {genderData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                    </Pie>
                    <Tooltip contentStyle={tooltipStyle} formatter={(v: any) => [v + "%", ""]} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="flex justify-center gap-4 mt-1">
                  {genderData.map(g => (
                    <div key={g.name} className="flex items-center gap-1.5 text-xs">
                      <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: g.color }} />
                      <span style={{ color: "#78614E" }}>{g.name} {g.value}%</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Countries */}
              <div>
                <p className="text-xs font-semibold mb-3 flex items-center gap-1" style={{ color: "#78614E" }}>
                  <Globe className="w-3 h-3" /> Top Tari
                </p>
                <div className="space-y-2">
                  {countriesBase.map(c => (
                    <div key={c.country} className="flex items-center gap-2">
                      <span className="text-xs flex-1" style={{ color: "#5C4A35" }}>{c.country}</span>
                      <div className="w-20 h-2 rounded-full overflow-hidden" style={{ backgroundColor: "rgba(245,215,160,0.2)" }}>
                        <div className="h-full rounded-full" style={{ width: c.pct + "%", backgroundColor: "#F59E0B" }} />
                      </div>
                      <span className="text-xs w-8 text-right font-semibold" style={{ color: "#5C4A35" }}>{c.pct}%</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Growth */}
          <div className="rounded-xl p-4 flex items-center justify-between" style={{ backgroundColor: channel.growthPercent >= 0 ? "rgba(16,185,129,0.06)" : "rgba(239,68,68,0.06)", border: `1px solid ${channel.growthPercent >= 0 ? "rgba(16,185,129,0.2)" : "rgba(239,68,68,0.2)"}` }}>
            <div>
              <p className="text-sm font-semibold" style={{ color: "#292524" }}>Crestere lunara</p>
              <p className="text-xs mt-0.5" style={{ color: "#A8967E" }}>Fata de luna precedenta</p>
            </div>
            <span className={`text-2xl font-black ${channel.growthPercent >= 0 ? "text-emerald-600" : "text-red-500"}`}>
              {channel.growthPercent >= 0 ? "+" : ""}{channel.growthPercent}%
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
