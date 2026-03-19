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
    <div className="bg-white rounded-xl border border-gray-100 p-5 shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="font-semibold text-gray-900">Engagement Rate Trend</h3>
          <p className="text-xs text-gray-500">Average across all platforms</p>
        </div>
        <span className="text-xs bg-[#F9B851]/10 text-[#d4992a] font-semibold px-2.5 py-1 rounded-full">
          +2.4% avg
        </span>
      </div>
      <ResponsiveContainer width="100%" height={260}>
        <AreaChart data={engagementData} margin={{ top: 4, right: 8, bottom: 0, left: -10 }}>
          <defs>
            <linearGradient id="engGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#39D3B8" stopOpacity={0.3} />
              <stop offset="95%" stopColor="#39D3B8" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
          <XAxis dataKey="date" tick={{ fontSize: 11, fill: "#9ca3af" }} />
          <YAxis tick={{ fontSize: 11, fill: "#9ca3af" }} tickFormatter={(v) => v + "%"} />
          <Tooltip
            contentStyle={{ fontSize: 12, borderRadius: 8, border: "1px solid #e5e7eb" }}
            formatter={(value) => [Number(value ?? 0).toFixed(1) + "%", "Engagement"]}
          />
          <Area type="monotone" dataKey="rate" stroke="#39D3B8" strokeWidth={2.5} fill="url(#engGrad)" />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
