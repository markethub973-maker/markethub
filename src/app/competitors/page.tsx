"use client";

import Header from "@/components/layout/Header";
import { competitors, competitorGrowth } from "@/lib/mockData";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  LineChart,
  Line,
} from "recharts";
import { CheckCircle, XCircle } from "lucide-react";

const COLORS = ["#4F4DF0", "#39D3B8", "#F9B851", "#E1306C", "#94a3b8"];

export default function CompetitorsPage() {
  const marketShareData = competitors.map((c) => ({
    name: c.name,
    share: c.marketShare,
  }));

  return (
    <div>
      <Header title="Competitor Analysis" subtitle="Benchmark against the competition" />

      <div className="p-6 space-y-6">
        {/* Market Share Chart */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="bg-white rounded-xl border border-gray-100 p-5 shadow-sm">
            <h3 className="font-semibold text-gray-900 mb-1">Market Share</h3>
            <p className="text-xs text-gray-500 mb-4">% of the video analytics market</p>
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={marketShareData} layout="vertical" margin={{ left: 40, right: 20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" horizontal={false} />
                <XAxis type="number" tick={{ fontSize: 11, fill: "#9ca3af" }} tickFormatter={(v) => v + "%"} />
                <YAxis type="category" dataKey="name" tick={{ fontSize: 12, fill: "#374151" }} width={90} />
                <Tooltip
                  contentStyle={{ fontSize: 12, borderRadius: 8 }}
                  formatter={(v) => [(v ?? 0) + "%", "Market Share"]}
                />
                <Bar dataKey="share" radius={[0, 4, 4, 0]} fill={COLORS[0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Market Share Trend */}
          <div className="bg-white rounded-xl border border-gray-100 p-5 shadow-sm">
            <h3 className="font-semibold text-gray-900 mb-1">Share Trend (6 months)</h3>
            <p className="text-xs text-gray-500 mb-4">Monthly market share evolution</p>
            <ResponsiveContainer width="100%" height={280}>
              <LineChart data={competitorGrowth} margin={{ right: 8, left: -10 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="month" tick={{ fontSize: 11, fill: "#9ca3af" }} />
                <YAxis tick={{ fontSize: 11, fill: "#9ca3af" }} tickFormatter={(v) => v + "%"} />
                <Tooltip
                  contentStyle={{ fontSize: 12, borderRadius: 8 }}
                  formatter={(v) => [(v ?? 0) + "%", ""]}
                />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Line type="monotone" dataKey="tubular" name="Tubular" stroke="#4F4DF0" strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="socialbakers" name="Socialbakers" stroke="#39D3B8" strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="brandwatch" name="Brandwatch" stroke="#F9B851" strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="viralstat" name="ViralStat" stroke="#E1306C" strokeWidth={2.5} strokeDasharray="none" dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Feature Comparison Table */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-50">
            <h3 className="font-semibold text-gray-900">Feature Comparison</h3>
            <p className="text-xs text-gray-500 mt-0.5">Side-by-side comparison of key features</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 text-xs text-gray-500 uppercase tracking-wide">
                  <th className="text-left px-5 py-3">Tool</th>
                  <th className="text-center px-3 py-3">Pricing</th>
                  <th className="text-center px-3 py-3">Market Share</th>
                  <th className="text-center px-3 py-3">TikTok</th>
                  <th className="text-center px-3 py-3">YouTube</th>
                  <th className="text-center px-3 py-3">Instagram</th>
                  <th className="text-center px-3 py-3">Facebook</th>
                  <th className="text-center px-5 py-3">Strength</th>
                </tr>
              </thead>
              <tbody>
                {competitors.map((c, i) => {
                  const hasTikTok = c.features.some((f) => f === "TikTok" || f === "All platforms");
                  const hasYouTube = c.features.some((f) => f === "YouTube" || f === "All platforms");
                  const hasInstagram = c.features.some((f) => f === "Instagram" || f === "All platforms");
                  const hasFacebook = c.features.some((f) => f === "Facebook" || f === "All platforms");
                  const isUs = c.name === "ViralStat";

                  return (
                    <tr
                      key={c.name}
                      className={`border-t border-gray-50 ${isUs ? "bg-[#39D3B8]/5" : "hover:bg-gray-50/50"} transition-colors`}
                    >
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-2">
                          <div
                            className="w-3 h-3 rounded-full"
                            style={{ backgroundColor: COLORS[i % COLORS.length] }}
                          />
                          <span className={`font-semibold ${isUs ? "text-[#39D3B8]" : "text-gray-800"}`}>
                            {c.name} {isUs && "⭐"}
                          </span>
                        </div>
                      </td>
                      <td className="px-3 py-3 text-center">
                        <span className="bg-gray-100 text-gray-700 text-xs font-medium px-2 py-0.5 rounded">
                          {c.pricing}
                        </span>
                      </td>
                      <td className="px-3 py-3 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <div className="w-16 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                            <div
                              className="h-full rounded-full"
                              style={{
                                width: c.marketShare + "%",
                                backgroundColor: COLORS[i % COLORS.length],
                              }}
                            />
                          </div>
                          <span className="text-xs font-semibold text-gray-700">{c.marketShare}%</span>
                        </div>
                      </td>
                      {[hasTikTok, hasYouTube, hasInstagram, hasFacebook].map((has, j) => (
                        <td key={j} className="px-3 py-3 text-center">
                          {has ? (
                            <CheckCircle className="w-4 h-4 text-emerald-500 mx-auto" />
                          ) : (
                            <XCircle className="w-4 h-4 text-gray-300 mx-auto" />
                          )}
                        </td>
                      ))}
                      <td className="px-5 py-3 text-center">
                        <span className="bg-[#4F4DF0]/10 text-[#4F4DF0] text-xs font-medium px-2 py-0.5 rounded-full">
                          {c.strength}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white rounded-xl border border-gray-100 p-5 shadow-sm">
            <h4 className="font-semibold text-gray-900 mb-3">Our Advantages</h4>
            <ul className="space-y-2 text-sm text-gray-600">
              {["Lowest price in the market", "TikTok analytics included", "All 4 platforms tracked", "Real-time trending alerts"].map((a) => (
                <li key={a} className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                  {a}
                </li>
              ))}
            </ul>
          </div>
          <div className="bg-white rounded-xl border border-gray-100 p-5 shadow-sm">
            <h4 className="font-semibold text-gray-900 mb-3">Competitors Missing</h4>
            <ul className="space-y-2 text-sm text-gray-600">
              {["Tubular: No TikTok", "Socialbakers: No YouTube", "Brandwatch: $1000/mo minimum", "Sprout: No TikTok analytics"].map((a) => (
                <li key={a} className="flex items-center gap-2">
                  <XCircle className="w-4 h-4 text-red-400 flex-shrink-0" />
                  {a}
                </li>
              ))}
            </ul>
          </div>
          <div className="bg-gradient-to-br from-[#4F4DF0] to-[#39D3B8] rounded-xl p-5 text-white shadow-sm">
            <h4 className="font-bold text-lg mb-2">Market Position</h4>
            <p className="text-white/80 text-sm mb-4">
              ViralStat is the fastest growing video analytics platform with the best value proposition.
            </p>
            <div className="text-3xl font-black">#4</div>
            <div className="text-white/70 text-xs mt-0.5">in market share</div>
            <div className="mt-3 text-sm font-semibold text-yellow-300">+40% growth YoY 🚀</div>
          </div>
        </div>
      </div>
    </div>
  );
}
