"use client";

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { dailyStats } from "@/lib/mockData";

const colors = {
  youtube: "#FF0000",
  tiktok: "#00b8ae",
  instagram: "#E1306C",
  facebook: "#1877F2",
};

export default function ViewsChart() {
  return (
    <div className="bg-white rounded-xl border border-gray-100 p-5 shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="font-semibold text-gray-900">Views Over Time</h3>
          <p className="text-xs text-gray-500">Daily views (millions) across platforms</p>
        </div>
        <span className="text-xs bg-[#39D3B8]/10 text-[#39D3B8] font-semibold px-2.5 py-1 rounded-full">
          Last 30 days
        </span>
      </div>
      <ResponsiveContainer width="100%" height={260}>
        <LineChart data={dailyStats} margin={{ top: 4, right: 8, bottom: 0, left: -10 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
          <XAxis dataKey="date" tick={{ fontSize: 11, fill: "#9ca3af" }} />
          <YAxis tick={{ fontSize: 11, fill: "#9ca3af" }} />
          <Tooltip
            contentStyle={{ fontSize: 12, borderRadius: 8, border: "1px solid #e5e7eb" }}
            formatter={(value) => [`${value ?? 0}M`, ""]}
          />
          <Legend wrapperStyle={{ fontSize: 12 }} />
          <Line type="monotone" dataKey="youtube" stroke={colors.youtube} strokeWidth={2} dot={false} />
          <Line type="monotone" dataKey="tiktok" stroke={colors.tiktok} strokeWidth={2} dot={false} />
          <Line type="monotone" dataKey="instagram" stroke={colors.instagram} strokeWidth={2} dot={false} />
          <Line type="monotone" dataKey="facebook" stroke={colors.facebook} strokeWidth={2} dot={false} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
