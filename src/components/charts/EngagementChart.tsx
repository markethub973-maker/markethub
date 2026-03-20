"use client";

import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { engagementData } from "@/lib/mockData";

export default function EngagementChart() {
  return (
    <div className="rounded-xl p-5" style={{ backgroundColor: "#FFFCF7", border: "1px solid rgba(245,215,160,0.25)", boxShadow: "0 1px 3px rgba(120,97,78,0.08)" }}>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="font-semibold" style={{ color: "#292524" }}>Engagement Rate Trend</h3>
          <p className="text-xs" style={{ color: "#A8967E" }}>Average across all platforms</p>
        </div>
        <span className="text-xs font-semibold px-2.5 py-1 rounded-full" style={{ backgroundColor: "rgba(245,158,11,0.12)", color: "#D97706" }}>
          +2.4% avg
        </span>
      </div>
      <ResponsiveContainer width="100%" height={260}>
        <AreaChart data={engagementData} margin={{ top: 4, right: 8, bottom: 0, left: -10 }}>
          <defs>
            <linearGradient id="engGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#F59E0B" stopOpacity={0.3} />
              <stop offset="95%" stopColor="#F59E0B" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(245,215,160,0.3)" />
          <XAxis dataKey="date" tick={{ fontSize: 11, fill: "#C4AA8A" }} />
          <YAxis tick={{ fontSize: 11, fill: "#C4AA8A" }} tickFormatter={(v) => v + "%"} />
          <Tooltip
            contentStyle={{ fontSize: 12, borderRadius: 8, border: "1px solid rgba(245,215,160,0.4)", backgroundColor: "#FFFCF7", color: "#292524" }}
            formatter={(value) => [Number(value ?? 0).toFixed(1) + "%", "Engagement"]}
          />
          <Area type="monotone" dataKey="rate" stroke="#F59E0B" strokeWidth={2.5} fill="url(#engGrad)" />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
