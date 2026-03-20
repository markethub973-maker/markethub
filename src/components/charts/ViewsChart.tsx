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
    <div className="rounded-xl p-5" style={{ backgroundColor: "#FFFCF7", border: "1px solid rgba(245,215,160,0.25)", boxShadow: "0 1px 3px rgba(120,97,78,0.08)" }}>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="font-semibold" style={{ color: "#292524" }}>Views Over Time</h3>
          <p className="text-xs" style={{ color: "#A8967E" }}>Daily views (millions) across platforms</p>
        </div>
        <span className="text-xs font-semibold px-2.5 py-1 rounded-full" style={{ backgroundColor: "rgba(245,158,11,0.12)", color: "#D97706" }}>
          Last 30 days
        </span>
      </div>
      <ResponsiveContainer width="100%" height={260}>
        <LineChart data={dailyStats} margin={{ top: 4, right: 8, bottom: 0, left: -10 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(245,215,160,0.3)" />
          <XAxis dataKey="date" tick={{ fontSize: 11, fill: "#C4AA8A" }} />
          <YAxis tick={{ fontSize: 11, fill: "#C4AA8A" }} />
          <Tooltip
            contentStyle={{ fontSize: 12, borderRadius: 8, border: "1px solid rgba(245,215,160,0.4)", backgroundColor: "#FFFCF7", color: "#292524" }}
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
