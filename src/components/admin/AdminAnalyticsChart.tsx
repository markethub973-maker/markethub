"use client";

import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

interface AdminAnalyticsChartProps {
  data: {
    period: string;
    data: any[];
    summary: {
      total_users: number;
      total_revenue: number;
      active_subscriptions: {
        free_test: number;
        lite: number;
        pro: number;
      };
      mrr: number;
    };
  };
}

export default function AdminAnalyticsChart({ data }: AdminAnalyticsChartProps) {
  if (!data || !data.data || data.data.length === 0) {
    return (
      <div className="text-center py-8">
        <p style={{ color: "#78614E" }}>No data available</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Revenue Chart */}
      <div>
        <h3 className="font-semibold mb-4" style={{ color: "#292524" }}>
          Revenue Trend
        </h3>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={data.data}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="date" />
            <YAxis />
            <Tooltip formatter={(value) => `$${Number(value ?? 0).toFixed(2)}`} />
            <Legend />
            <Line
              type="monotone"
              dataKey="revenue"
              stroke="#F59E0B"
              strokeWidth={2}
              name="Revenue ($)"
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Signups Chart */}
      <div>
        <h3 className="font-semibold mb-4" style={{ color: "#292524" }}>
          New Signups
        </h3>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={data.data}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="date" />
            <YAxis />
            <Tooltip />
            <Legend />
            <Bar
              dataKey="new_signups"
              fill="#10B981"
              name="New Signups"
              radius={[8, 8, 0, 0]}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6 pt-6 border-t border-amber-100">
        <div>
          <p className="text-sm" style={{ color: "#78614E" }}>
            Total Revenue ({data.period})
          </p>
          <p className="text-2xl font-bold" style={{ color: "#F59E0B" }}>
            ${data.summary.total_revenue.toFixed(2)}
          </p>
        </div>
        <div>
          <p className="text-sm" style={{ color: "#78614E" }}>
            Monthly Recurring Revenue (MRR)
          </p>
          <p className="text-2xl font-bold" style={{ color: "#10B981" }}>
            ${data.summary.mrr.toFixed(2)}
          </p>
        </div>
      </div>
    </div>
  );
}
