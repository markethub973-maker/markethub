"use client";

import { useState, useEffect } from "react";
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";

export default function PlatformShareChart() {
  const [data, setData] = useState<{ name: string; value: number; color: string }[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch("/api/youtube/trending?region=RO&max=10").then(r => r.json()).catch(() => []),
      fetch("/api/instagram/analytics").then(r => r.json()).catch(() => ({})),
      fetch("/api/facebook/page").then(r => r.json()).catch(() => ({})),
    ]).then(([ytVideos, igData, fbData]) => {
      const ytViews = Array.isArray(ytVideos)
        ? ytVideos.reduce((s: number, v: any) => s + (v.views || 0), 0)
        : 0;

      // Use reach/followers as proxy for IG and FB "views"
      const igReach = igData?.insights?.find((i: any) => i.name === "reach")
        ?.values?.reduce((s: number, v: any) => s + (v.value || 0), 0) || 0;
      const igViews = igReach || (igData?.followers_count || 0);

      const fbReach = fbData?.insights?.find((i: any) => i.name === "page_reach")
        ?.values?.reduce((s: number, v: any) => s + (v.value || 0), 0) || 0;
      const fbViews = fbReach || (fbData?.fan_count || 0);

      const total = ytViews + igViews + fbViews;
      if (total === 0) {
        setData([{ name: "YouTube", value: 100, color: "#FF0000" }]);
      } else {
        const items = [
          { name: "YouTube", value: Math.round((ytViews / total) * 1000) / 10, color: "#FF0000" },
          { name: "Instagram", value: Math.round((igViews / total) * 1000) / 10, color: "#E1306C" },
          { name: "Facebook", value: Math.round((fbViews / total) * 1000) / 10, color: "#1877F2" },
        ].filter(d => d.value > 0);
        setData(items);
      }
    }).finally(() => setLoading(false));
  }, []);

  return (
    <div className="rounded-xl p-5" style={{ backgroundColor: "#FFFCF7", border: "1px solid rgba(245,215,160,0.25)", boxShadow: "0 1px 3px rgba(120,97,78,0.08)" }}>
      <div className="mb-4">
        <h3 className="font-semibold" style={{ color: "#292524" }}>Platform Share</h3>
        <p className="text-xs" style={{ color: "#A8967E" }}>% din reach/views reale</p>
      </div>
      {loading ? (
        <div className="h-[260px] flex items-center justify-center text-xs" style={{ color: "#C4AA8A" }}>Se incarca...</div>
      ) : (
        <ResponsiveContainer width="100%" height={260}>
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="45%"
              innerRadius={65}
              outerRadius={95}
              paddingAngle={3}
              dataKey="value"
            >
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Pie>
            <Tooltip
              contentStyle={{ fontSize: 12, borderRadius: 8, border: "1px solid rgba(245,215,160,0.4)", backgroundColor: "#FFFCF7", color: "#292524" }}
              formatter={(value) => [Number(value ?? 0).toFixed(1) + "%", "Share"]}
            />
            <Legend wrapperStyle={{ fontSize: 12 }} />
          </PieChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}
