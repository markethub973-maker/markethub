"use client";

import { useState, useEffect } from "react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell,
} from "recharts";

export default function ViewsChart() {
  const [data, setData] = useState<{ name: string; views: number }[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/youtube/trending?region=RO&max=10")
      .then((r) => r.json())
      .then((d) => {
        if (Array.isArray(d)) {
          setData(
            d.map((v) => ({
              name: v.title.length > 30 ? v.title.slice(0, 28) + "…" : v.title,
              views: Math.round((v.views / 1_000_000) * 10) / 10,
            }))
          );
        }
      })
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="rounded-xl p-5" style={{ backgroundColor: "#FFFCF7", border: "1px solid rgba(245,215,160,0.25)", boxShadow: "0 1px 3px rgba(120,97,78,0.08)" }}>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="font-semibold" style={{ color: "#292524" }}>YouTube Trending RO — Views</h3>
          <p className="text-xs" style={{ color: "#A8967E" }}>Top 10 trending videos right now (millions)</p>
        </div>
        <span className="text-xs font-semibold px-2.5 py-1 rounded-full" style={{ backgroundColor: "rgba(255,0,0,0.08)", color: "#cc0000" }}>
          Live
        </span>
      </div>
      {loading ? (
        <div className="h-[260px] flex items-center justify-center text-xs" style={{ color: "#C4AA8A" }}>Loading...</div>
      ) : (
        <ResponsiveContainer width="100%" height={260}>
          <BarChart data={data} layout="vertical" margin={{ top: 4, right: 20, bottom: 0, left: 8 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(245,215,160,0.3)" horizontal={false} />
            <XAxis type="number" tick={{ fontSize: 10, fill: "#C4AA8A" }} tickFormatter={(v) => v + "M"} />
            <YAxis type="category" dataKey="name" tick={{ fontSize: 10, fill: "#5C4A35" }} width={160} />
            <Tooltip
              contentStyle={{ fontSize: 11, borderRadius: 8, border: "1px solid rgba(245,215,160,0.4)", backgroundColor: "#FFFCF7", color: "#292524" }}
              formatter={(v) => [`${v}M views`, "Views"]}
            />
            <Bar dataKey="views" radius={[0, 4, 4, 0]}>
              {data.map((_, i) => (
                <Cell key={i} fill={i === 0 ? "#FF0000" : i < 3 ? "#F59E0B" : "rgba(245,158,11,0.4)"} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}
