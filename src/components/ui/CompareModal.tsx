"use client";

import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend,
} from "recharts";
import { X, ArrowLeftRight } from "lucide-react";
import type { Channel } from "@/lib/mockData";
import { formatNumber } from "@/lib/utils";

interface Props {
  channels: Channel[];
  onClose: () => void;
}

export default function CompareModal({ channels, onClose }: Props) {
  if (channels.length < 2) return null;
  const [a, b] = channels;

  const metrics = [
    { key: "subscribers", label: "Subscribers" },
    { key: "avgViews", label: "Avg. Views" },
    { key: "engagementRate", label: "Engagement %" },
    { key: "growthPercent", label: "Growth %" },
    { key: "videoCount", label: "Videos" },
  ];

  const chartData = [
    { metric: "Avg Views (M)", [a.name]: Math.round(a.avgViews / 1_000_000), [b.name]: Math.round(b.avgViews / 1_000_000) },
    { metric: "ER %", [a.name]: a.engagementRate, [b.name]: b.engagementRate },
    { metric: "Growth %", [a.name]: Math.max(0, a.growthPercent), [b.name]: Math.max(0, b.growthPercent) },
  ];

  const tooltipStyle = { fontSize: 11, borderRadius: 8, border: "1px solid rgba(245,215,160,0.4)", backgroundColor: "#FFFCF7", color: "#292524" };

  const winner = (aVal: number, bVal: number) => aVal > bVal ? "a" : bVal > aVal ? "b" : "tie";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ backgroundColor: "rgba(28,24,20,0.7)" }}>
      <div
        className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl"
        style={{ backgroundColor: "#FFFCF7", border: "1px solid rgba(245,215,160,0.3)", boxShadow: "0 24px 60px rgba(28,24,20,0.3)" }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 sticky top-0 z-10" style={{ backgroundColor: "#FFFCF7", borderBottom: "1px solid rgba(245,215,160,0.2)" }}>
          <div className="flex items-center gap-2">
            <ArrowLeftRight className="w-5 h-5" style={{ color: "#F59E0B" }} />
            <h2 className="font-bold text-lg" style={{ color: "#292524" }}>Comparatie Canale</h2>
          </div>
          <button type="button" onClick={onClose} className="p-2 rounded-lg" style={{ color: "#A8967E" }}
            onMouseEnter={e => (e.currentTarget.style.backgroundColor = "rgba(245,215,160,0.15)")}
            onMouseLeave={e => (e.currentTarget.style.backgroundColor = "transparent")}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Channel headers */}
          <div className="grid grid-cols-2 gap-4">
            {[a, b].map((ch, i) => (
              <div key={ch.id} className="rounded-xl p-4 flex items-center gap-3" style={{ backgroundColor: i === 0 ? "rgba(245,158,11,0.08)" : "rgba(120,97,78,0.08)", border: `1px solid ${i === 0 ? "rgba(245,158,11,0.25)" : "rgba(120,97,78,0.2)"}` }}>
                <img src={ch.avatar} alt={ch.name} className="w-10 h-10 rounded-full" />
                <div>
                  <p className="font-bold text-sm" style={{ color: "#292524" }}>{ch.name}</p>
                  <p className="text-xs" style={{ color: "#A8967E" }}>{ch.platform} · {ch.category}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Metrics comparison */}
          <div className="space-y-2">
            {metrics.map(m => {
              const aVal = (a as any)[m.key];
              const bVal = (b as any)[m.key];
              const w = winner(aVal, bVal);
              return (
                <div key={m.key} className="rounded-xl p-3" style={{ backgroundColor: "rgba(245,215,160,0.07)", border: "1px solid rgba(245,215,160,0.15)" }}>
                  <p className="text-xs font-semibold mb-2 text-center" style={{ color: "#A8967E" }}>{m.label}</p>
                  <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3">
                    <div className={`text-right font-bold text-sm ${w === "a" ? "text-emerald-600" : ""}`} style={{ color: w === "a" ? undefined : "#5C4A35" }}>
                      {m.key === "subscribers" || m.key === "avgViews" || m.key === "videoCount"
                        ? formatNumber(aVal)
                        : aVal + "%"}
                      {w === "a" && <span className="ml-1 text-emerald-500">▲</span>}
                    </div>
                    <div className="text-xs text-center font-bold" style={{ color: "#C4AA8A" }}>VS</div>
                    <div className={`text-left font-bold text-sm ${w === "b" ? "text-emerald-600" : ""}`} style={{ color: w === "b" ? undefined : "#5C4A35" }}>
                      {w === "b" && <span className="mr-1 text-emerald-500">▲</span>}
                      {m.key === "subscribers" || m.key === "avgViews" || m.key === "videoCount"
                        ? formatNumber(bVal)
                        : bVal + "%"}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Chart */}
          <div>
            <h3 className="font-semibold mb-3" style={{ color: "#292524" }}>Comparatie vizuala</h3>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={chartData} margin={{ left: -10, right: 8 }}>
                <XAxis dataKey="metric" tick={{ fontSize: 10, fill: "#C4AA8A" }} />
                <YAxis tick={{ fontSize: 10, fill: "#C4AA8A" }} />
                <Tooltip contentStyle={tooltipStyle} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Bar dataKey={a.name} fill="#F59E0B" radius={[4, 4, 0, 0]} />
                <Bar dataKey={b.name} fill="#92400E" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Verdict */}
          <div className="rounded-xl p-4" style={{ background: "linear-gradient(135deg, #F59E0B22, #D9770622)", border: "1px solid rgba(245,158,11,0.25)" }}>
            <p className="text-sm font-semibold mb-1" style={{ color: "#292524" }}>Verdict</p>
            <p className="text-sm" style={{ color: "#78614E" }}>
              <b style={{ color: a.engagementRate > b.engagementRate ? "#16a34a" : "#5C4A35" }}>{a.name}</b>
              {a.engagementRate > b.engagementRate
                ? ` are engagement mai bun (${a.engagementRate}% vs ${b.engagementRate}%). `
                : ` are engagement mai slab (${a.engagementRate}% vs ${b.engagementRate}%). `}
              <b style={{ color: a.subscribers > b.subscribers ? "#16a34a" : "#5C4A35" }}>{a.subscribers > b.subscribers ? a.name : b.name}</b>
              {" "}are mai multi abonati ({formatNumber(Math.max(a.subscribers, b.subscribers))}).
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
