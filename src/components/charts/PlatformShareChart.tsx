"use client";

import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";

const data = [
  { name: "TikTok", value: 48.3, color: "#00b8ae" },
  { name: "YouTube", value: 28.0, color: "#FF0000" },
  { name: "Instagram", value: 12.5, color: "#E1306C" },
  { name: "Facebook", value: 11.2, color: "#1877F2" },
];

export default function PlatformShareChart() {
  return (
    <div className="rounded-xl p-5" style={{ backgroundColor: "#FFFCF7", border: "1px solid rgba(245,215,160,0.25)", boxShadow: "0 1px 3px rgba(120,97,78,0.08)" }}>
      <div className="mb-4">
        <h3 className="font-semibold" style={{ color: "#292524" }}>Platform Share</h3>
        <p className="text-xs" style={{ color: "#A8967E" }}>% of total views</p>
      </div>
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
    </div>
  );
}
