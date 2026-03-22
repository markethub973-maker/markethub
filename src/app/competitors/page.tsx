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

const COLORS = ["#F59E0B", "#D97706", "#92400E", "#78350F", "#94a3b8"];

export default function CompetitorsPage() {
  const marketShareData = competitors.map((c) => ({
    name: c.name,
    share: c.marketShare,
  }));

  const tooltipStyle = { fontSize: 12, borderRadius: 8, border: "1px solid rgba(245,215,160,0.4)", backgroundColor: "#FFFCF7", color: "#292524" };

  return (
    <div>
      <Header title="Competitor Analysis" subtitle="Benchmark against the competition" />

      <div className="p-6 space-y-6">

        {/* Disclaimer */}
        <div className="rounded-xl px-4 py-3 flex items-start gap-3" style={{ backgroundColor: "rgba(245,215,160,0.12)", border: "1px solid rgba(245,215,160,0.3)" }}>
          <span className="text-sm">📊</span>
          <p className="text-xs" style={{ color: "#78614E" }}>
            <b>Date estimate</b> — Cifrele de market share și prețuri sunt bazate pe surse publice (G2, Capterra, site-uri oficiale).
            Datele ViralStat sunt actualizate manual pe baza creșterii reale a platformei.
          </p>
        </div>

        {/* Market Share Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="rounded-xl p-5" style={{ backgroundColor: "#FFFCF7", border: "1px solid rgba(245,215,160,0.25)", boxShadow: "0 1px 3px rgba(120,97,78,0.08)" }}>
            <h3 className="font-semibold mb-1" style={{ color: "#292524" }}>Market Share</h3>
            <p className="text-xs mb-4" style={{ color: "#A8967E" }}>% of the video analytics market</p>
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={marketShareData} layout="vertical" margin={{ left: 40, right: 20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(245,215,160,0.3)" horizontal={false} />
                <XAxis type="number" tick={{ fontSize: 11, fill: "#C4AA8A" }} tickFormatter={(v) => v + "%"} />
                <YAxis type="category" dataKey="name" tick={{ fontSize: 12, fill: "#5C4A35" }} width={90} />
                <Tooltip contentStyle={tooltipStyle} formatter={(v) => [(v ?? 0) + "%", "Market Share"]} />
                <Bar dataKey="share" radius={[0, 4, 4, 0]} fill={COLORS[0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="rounded-xl p-5" style={{ backgroundColor: "#FFFCF7", border: "1px solid rgba(245,215,160,0.25)", boxShadow: "0 1px 3px rgba(120,97,78,0.08)" }}>
            <h3 className="font-semibold mb-1" style={{ color: "#292524" }}>Share Trend (6 months)</h3>
            <p className="text-xs mb-4" style={{ color: "#A8967E" }}>Monthly market share evolution</p>
            <ResponsiveContainer width="100%" height={280}>
              <LineChart data={competitorGrowth} margin={{ right: 8, left: -10 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(245,215,160,0.3)" />
                <XAxis dataKey="month" tick={{ fontSize: 11, fill: "#C4AA8A" }} />
                <YAxis tick={{ fontSize: 11, fill: "#C4AA8A" }} tickFormatter={(v) => v + "%"} />
                <Tooltip contentStyle={tooltipStyle} formatter={(v) => [(v ?? 0) + "%", ""]} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Line type="monotone" dataKey="tubular" name="Tubular" stroke="#C4AA8A" strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="socialbakers" name="Socialbakers" stroke="#A8967E" strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="brandwatch" name="Brandwatch" stroke="#78614E" strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="viralstat" name="ViralStat" stroke="#F59E0B" strokeWidth={2.5} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Feature Comparison Table */}
        <div className="rounded-xl overflow-hidden" style={{ backgroundColor: "#FFFCF7", border: "1px solid rgba(245,215,160,0.25)", boxShadow: "0 1px 3px rgba(120,97,78,0.08)" }}>
          <div className="px-5 py-4" style={{ borderBottom: "1px solid rgba(245,215,160,0.2)" }}>
            <h3 className="font-semibold" style={{ color: "#292524" }}>Feature Comparison</h3>
            <p className="text-xs mt-0.5" style={{ color: "#A8967E" }}>Side-by-side comparison of key features</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-xs uppercase tracking-wide" style={{ backgroundColor: "rgba(245,215,160,0.1)", color: "#A8967E" }}>
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
                      className="transition-colors"
                      style={{ borderTop: "1px solid rgba(245,215,160,0.15)", backgroundColor: isUs ? "rgba(245,158,11,0.06)" : "transparent" }}
                      onMouseEnter={e => { if (!isUs) e.currentTarget.style.backgroundColor = "rgba(245,215,160,0.07)"; }}
                      onMouseLeave={e => { if (!isUs) e.currentTarget.style.backgroundColor = "transparent"; }}
                    >
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-2">
                          <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                          <span className="font-semibold" style={{ color: isUs ? "#F59E0B" : "#3D2E1E" }}>
                            {c.name} {isUs && "⭐"}
                          </span>
                        </div>
                      </td>
                      <td className="px-3 py-3 text-center">
                        <span className="text-xs font-medium px-2 py-0.5 rounded" style={{ backgroundColor: "rgba(245,215,160,0.15)", color: "#78614E" }}>
                          {c.pricing}
                        </span>
                      </td>
                      <td className="px-3 py-3 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <div className="w-16 h-1.5 rounded-full overflow-hidden" style={{ backgroundColor: "rgba(245,215,160,0.2)" }}>
                            <div className="h-full rounded-full" style={{ width: c.marketShare + "%", backgroundColor: COLORS[i % COLORS.length] }} />
                          </div>
                          <span className="text-xs font-semibold" style={{ color: "#5C4A35" }}>{c.marketShare}%</span>
                        </div>
                      </td>
                      {[hasTikTok, hasYouTube, hasInstagram, hasFacebook].map((has, j) => (
                        <td key={j} className="px-3 py-3 text-center">
                          {has ? (
                            <CheckCircle className="w-4 h-4 text-emerald-500 mx-auto" />
                          ) : (
                            <XCircle className="w-4 h-4 mx-auto" style={{ color: "rgba(245,215,160,0.5)" }} />
                          )}
                        </td>
                      ))}
                      <td className="px-5 py-3 text-center">
                        <span className="text-xs font-medium px-2 py-0.5 rounded-full" style={{ backgroundColor: "rgba(245,158,11,0.12)", color: "#D97706" }}>
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
          <div className="rounded-xl p-5" style={{ backgroundColor: "#FFFCF7", border: "1px solid rgba(245,215,160,0.25)", boxShadow: "0 1px 3px rgba(120,97,78,0.08)" }}>
            <h4 className="font-semibold mb-3" style={{ color: "#292524" }}>Our Advantages</h4>
            <ul className="space-y-2 text-sm" style={{ color: "#78614E" }}>
              {["Lowest price in the market", "TikTok analytics included", "All 4 platforms tracked", "Real-time trending alerts"].map((a) => (
                <li key={a} className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                  {a}
                </li>
              ))}
            </ul>
          </div>
          <div className="rounded-xl p-5" style={{ backgroundColor: "#FFFCF7", border: "1px solid rgba(245,215,160,0.25)", boxShadow: "0 1px 3px rgba(120,97,78,0.08)" }}>
            <h4 className="font-semibold mb-3" style={{ color: "#292524" }}>Competitors Missing</h4>
            <ul className="space-y-2 text-sm" style={{ color: "#78614E" }}>
              {["Tubular: No TikTok", "Socialbakers: No YouTube", "Brandwatch: $1000/mo minimum", "Sprout: No TikTok analytics"].map((a) => (
                <li key={a} className="flex items-center gap-2">
                  <XCircle className="w-4 h-4 text-red-400 flex-shrink-0" />
                  {a}
                </li>
              ))}
            </ul>
          </div>
          <div className="rounded-xl p-5 text-white" style={{ background: "linear-gradient(135deg, #F59E0B, #92400E)", boxShadow: "0 4px 12px rgba(245,158,11,0.25)" }}>
            <h4 className="font-bold text-lg mb-2">Market Position</h4>
            <p className="text-sm mb-4" style={{ color: "rgba(255,255,255,0.8)" }}>
              ViralStat is the fastest growing video analytics platform with the best value proposition.
            </p>
            <div className="text-3xl font-black">#4</div>
            <div className="text-xs mt-0.5" style={{ color: "rgba(255,255,255,0.7)" }}>in market share</div>
            <div className="mt-3 text-sm font-semibold" style={{ color: "rgba(255,255,200,1)" }}>+40% growth YoY 🚀</div>
          </div>
        </div>
      </div>
    </div>
  );
}
