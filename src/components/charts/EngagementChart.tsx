"use client";

import { useState, useEffect } from "react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell,
} from "recharts";

export default function EngagementChart() {
  const [data, setData] = useState<{ name: string; er: number }[]>([]);
  const [avg, setAvg] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/youtube/trending?region=RO&max=10")
      .then((r) => r.json())
      .then((d) => {
        if (Array.isArray(d)) {
          const mapped = d
            .filter((v) => v.views > 0)
            .map((v) => ({
              name: v.title.length > 22 ? v.title.slice(0, 20) + "…" : v.title,
              er: Math.round(((v.likes + v.comments) / v.views) * 10000) / 100,
            }))
            .sort((a, b) => b.er - a.er);
          setData(mapped);
          if (mapped.length) setAvg(Math.round((mapped.reduce((s, v) => s + v.er, 0) / mapped.length) * 10) / 10);
        }
      })
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="rounded-xl p-5" style={{ backgroundColor: "#FFFCF7", border: "1px solid rgba(245,215,160,0.25)", boxShadow: "0 1px 3px rgba(120,97,78,0.08)" }}>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="font-semibold" style={{ color: "#292524" }}>Engagement Rate — Trending RO</h3>
          <p className="text-xs" style={{ color: "#A8967E" }}>(likes + comentarii) / views × 100</p>
        </div>
        {avg > 0 && (
          <span className="text-xs font-semibold px-2.5 py-1 rounded-full" style={{ backgroundColor: "rgba(245,158,11,0.12)", color: "#D97706" }}>
            avg {avg}%
          </span>
        )}
      </div>
      {loading ? (
        <div className="h-[260px] flex items-center justify-center text-xs" style={{ color: "#C4AA8A" }}>Se încarcă...</div>
      ) : (
        <ResponsiveContainer width="100%" height={260}>
          <BarChart data={data} layout="vertical" margin={{ top: 4, right: 20, bottom: 0, left: 8 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(245,215,160,0.3)" horizontal={false} />
            <XAxis type="number" tick={{ fontSize: 10, fill: "#C4AA8A" }} tickFormatter={(v) => v + "%"} />
            <YAxis type="category" dataKey="name" tick={{ fontSize: 10, fill: "#5C4A35" }} width={140} />
            <Tooltip
              contentStyle={{ fontSize: 11, borderRadius: 8, border: "1px solid rgba(245,215,160,0.4)", backgroundColor: "#FFFCF7", color: "#292524" }}
              formatter={(v) => [`${v}%`, "Engagement Rate"]}
            />
            <Bar dataKey="er" radius={[0, 4, 4, 0]}>
              {data.map((d, i) => (
                <Cell key={i} fill={d.er > 1 ? "#F59E0B" : d.er > 0.5 ? "#D97706" : "rgba(245,158,11,0.4)"} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}
