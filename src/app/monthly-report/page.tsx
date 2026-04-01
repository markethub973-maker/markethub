"use client";

import { useState } from "react";
import Header from "@/components/layout/Header";
import { exportCSV } from "@/lib/utils";

interface ReportMetrics {
  platform: string;
  period: string;
  followers: number;
  followers_growth: number;
  impressions: number;
  reach: number;
  engagement_rate: number;
  new_subscribers: number;
  revenue: number;
}

interface KPI {
  metric: string;
  value: string;
  trend: "up" | "down" | "stable";
  interpretation: string;
}

interface Recommendation {
  priority: number;
  action: string;
  expected_impact: string;
  timeframe: string;
}

interface ReportResult {
  executive_summary: string;
  performance_verdict: "excellent" | "good" | "average" | "below_average" | "poor";
  kpi_analysis: KPI[];
  wins: string[];
  concerns: string[];
  content_insights: string[];
  recommendations: Recommendation[];
  next_month_forecast: string;
  generated_at: string;
}

const VERDICT_STYLE: Record<string, { bg: string; text: string; label: string }> = {
  excellent: { bg: "bg-green-50 border-green-200", text: "text-green-700", label: "Excellent" },
  good: { bg: "bg-emerald-50 border-emerald-200", text: "text-emerald-700", label: "Good" },
  average: { bg: "bg-amber-50 border-amber-200", text: "text-amber-700", label: "Average" },
  below_average: { bg: "bg-orange-50 border-orange-200", text: "text-orange-700", label: "Below Average" },
  poor: { bg: "bg-red-50 border-red-200", text: "text-red-700", label: "Poor" },
};

const TREND_ICON: Record<string, string> = { up: "↑", down: "↓", stable: "→" };
const TREND_COLOR: Record<string, string> = { up: "text-green-600", down: "text-red-500", stable: "text-[#78614E]" };

const PLATFORMS = ["YouTube", "Instagram", "TikTok", "Facebook", "LinkedIn", "Twitter/X"];

export default function MonthlyReportPage() {
  const [metrics, setMetrics] = useState<ReportMetrics>({
    platform: "YouTube",
    period: new Date().toLocaleDateString("en-US", { month: "long", year: "numeric" }),
    followers: 0,
    followers_growth: 0,
    impressions: 0,
    reach: 0,
    engagement_rate: 0,
    new_subscribers: 0,
    revenue: 0,
  });
  const [result, setResult] = useState<ReportResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const update = (k: keyof ReportMetrics, v: string | number) =>
    setMetrics(prev => ({ ...prev, [k]: v }));

  const generate = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/ai/monthly-report", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(metrics),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.message || data.error || "Generation failed");
        return;
      }
      setResult(data);
    } catch {
      setError("Connection error");
    } finally {
      setLoading(false);
    }
  };

  const exportReport = () => {
    if (!result) return;
    exportCSV(`monthly-report-${metrics.platform}-${metrics.period}`, [
      "Section", "Content"
    ], [
      ["Platform", metrics.platform],
      ["Period", metrics.period],
      ["Performance", result.performance_verdict],
      ["Executive Summary", result.executive_summary],
      ...result.wins.map((w, i) => [`Win ${i + 1}`, w]),
      ...result.concerns.map((c, i) => [`Concern ${i + 1}`, c]),
      ...result.recommendations.map(r => [`Action (P${r.priority})`, `${r.action} — ${r.expected_impact} — ${r.timeframe}`]),
      ["Next Month Forecast", result.next_month_forecast],
      ["Generated At", result.generated_at],
    ]);
  };

  const printReport = async () => {
    if (!result) return;
    const { pdf, Document, Page, Text, View, StyleSheet } = await import("@react-pdf/renderer");
    const React = (await import("react")).default;

    const verdict = VERDICT_STYLE[result.performance_verdict] ?? VERDICT_STYLE.average;
    const verdictColors: Record<string, string> = {
      excellent: "#16A34A", good: "#059669", average: "#D97706", below_average: "#EA580C", poor: "#DC2626",
    };
    const verdictColor = verdictColors[result.performance_verdict] ?? "#D97706";

    const styles = StyleSheet.create({
      page: { padding: 40, fontFamily: "Helvetica", backgroundColor: "#FFFCF7" },
      header: { backgroundColor: "#292524", borderRadius: 8, padding: 20, marginBottom: 16 },
      headerTitle: { color: "#FFFFFF", fontSize: 18, fontWeight: "bold", marginBottom: 4 },
      headerSub: { color: "#C4AA8A", fontSize: 10 },
      sectionTitle: { fontSize: 11, fontWeight: "bold", color: "#292524", marginBottom: 6 },
      card: { backgroundColor: "#FFFFFF", borderRadius: 6, padding: 12, marginBottom: 10, border: "1 solid #E8D9C5" },
      verdict: { borderRadius: 6, padding: 12, marginBottom: 10 },
      label: { fontSize: 8, color: "#78614E", marginBottom: 2, textTransform: "uppercase" },
      body: { fontSize: 10, color: "#292524", lineHeight: 1.5 },
      small: { fontSize: 9, color: "#78614E", lineHeight: 1.5 },
      kpiRow: { flexDirection: "row", alignItems: "flex-start", padding: 6, backgroundColor: "#FFFCF7", borderRadius: 4, marginBottom: 4 },
      kpiTrend: { fontSize: 12, fontWeight: "bold", width: 14, marginRight: 8 },
      kpiMeta: { fontSize: 8, color: "#78614E", marginTop: 1 },
      bullet: { flexDirection: "row", marginBottom: 3 },
      bulletDot: { fontSize: 10, marginRight: 5 },
      recRow: { flexDirection: "row", marginBottom: 8, padding: 8, backgroundColor: "#FFFCF7", borderRadius: 4, border: "1 solid #F5D7A0" },
      badge: { width: 20, height: 20, borderRadius: 10, backgroundColor: "#F59E0B", alignItems: "center", justifyContent: "center", marginRight: 8 },
      badgeText: { color: "#FFFFFF", fontSize: 9, fontWeight: "bold" },
      forecast: { backgroundColor: "#292524", borderRadius: 6, padding: 14 },
      forecastTitle: { color: "#F5D7A0", fontSize: 11, fontWeight: "bold", marginBottom: 4 },
      forecastBody: { color: "#C4AA8A", fontSize: 10, lineHeight: 1.5 },
      footer: { marginTop: 16, borderTop: "1 solid #E8D9C5", paddingTop: 8 },
      footerText: { fontSize: 8, color: "#C4AA8A", textAlign: "right" },
    });

    const trendColor: Record<string, string> = { up: "#16A34A", down: "#DC2626", stable: "#78614E" };

    const doc = React.createElement(Document, null,
      React.createElement(Page, { size: "A4", style: styles.page },
        // Header
        React.createElement(View, { style: styles.header },
          React.createElement(Text, { style: styles.headerTitle }, `${metrics.platform} · ${metrics.period}`),
          React.createElement(Text, { style: styles.headerSub }, "Monthly Performance Report · MarketHub Pro")
        ),
        // Verdict
        React.createElement(View, { style: { ...styles.verdict, backgroundColor: "#FFFCF7", border: `1 solid ${verdictColor}40` } },
          React.createElement(Text, { style: { fontSize: 11, fontWeight: "bold", color: verdictColor, marginBottom: 4 } },
            `${verdict.label} Performance`
          ),
          React.createElement(Text, { style: styles.body }, result.executive_summary)
        ),
        // KPIs
        result.kpi_analysis?.length > 0 && React.createElement(View, { style: styles.card },
          React.createElement(Text, { style: styles.sectionTitle }, "KPI Analysis"),
          ...result.kpi_analysis.map((kpi, i) =>
            React.createElement(View, { key: i, style: styles.kpiRow },
              React.createElement(Text, { style: { ...styles.kpiTrend, color: trendColor[kpi.trend] ?? "#78614E" } },
                kpi.trend === "up" ? "↑" : kpi.trend === "down" ? "↓" : "→"
              ),
              React.createElement(View, { style: { flex: 1 } },
                React.createElement(View, { style: { flexDirection: "row", gap: 8 } },
                  React.createElement(Text, { style: { fontSize: 9, fontWeight: "bold", color: "#292524" } }, kpi.metric),
                  React.createElement(Text, { style: { fontSize: 9, color: "#F59E0B", fontWeight: "bold" } }, kpi.value)
                ),
                React.createElement(Text, { style: styles.kpiMeta }, kpi.interpretation)
              )
            )
          )
        ),
        // Wins & Concerns
        React.createElement(View, { style: { flexDirection: "row", gap: 8, marginBottom: 10 } },
          result.wins?.length > 0 && React.createElement(View, { style: { ...styles.card, flex: 1, marginBottom: 0 } },
            React.createElement(Text, { style: { ...styles.sectionTitle, color: "#16A34A" } }, "Wins"),
            ...result.wins.map((w, i) =>
              React.createElement(View, { key: i, style: styles.bullet },
                React.createElement(Text, { style: { ...styles.bulletDot, color: "#16A34A" } }, "•"),
                React.createElement(Text, { style: styles.small }, w)
              )
            )
          ),
          result.concerns?.length > 0 && React.createElement(View, { style: { ...styles.card, flex: 1, marginBottom: 0 } },
            React.createElement(Text, { style: { ...styles.sectionTitle, color: "#DC2626" } }, "Concerns"),
            ...result.concerns.map((c, i) =>
              React.createElement(View, { key: i, style: styles.bullet },
                React.createElement(Text, { style: { ...styles.bulletDot, color: "#DC2626" } }, "•"),
                React.createElement(Text, { style: styles.small }, c)
              )
            )
          )
        ),
        // Recommendations
        result.recommendations?.length > 0 && React.createElement(View, { style: styles.card },
          React.createElement(Text, { style: styles.sectionTitle }, "Strategic Recommendations"),
          ...result.recommendations.map((r, i) =>
            React.createElement(View, { key: i, style: styles.recRow },
              React.createElement(View, { style: styles.badge },
                React.createElement(Text, { style: styles.badgeText }, String(r.priority))
              ),
              React.createElement(View, { style: { flex: 1 } },
                React.createElement(Text, { style: { fontSize: 10, fontWeight: "bold", color: "#292524", marginBottom: 2 } }, r.action),
                React.createElement(Text, { style: { fontSize: 8, color: "#78614E" } },
                  `Impact: ${r.expected_impact} · Timeline: ${r.timeframe}`
                )
              )
            )
          )
        ),
        // Forecast
        result.next_month_forecast && React.createElement(View, { style: styles.forecast },
          React.createElement(Text, { style: styles.forecastTitle }, "Next Month Forecast"),
          React.createElement(Text, { style: styles.forecastBody }, result.next_month_forecast)
        ),
        // Footer
        React.createElement(View, { style: styles.footer },
          React.createElement(Text, { style: styles.footerText },
            `Generated: ${new Date(result.generated_at).toLocaleString()} · MarketHub Pro`
          )
        )
      )
    );

    const blob = await pdf(doc).toBlob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `monthly-report-${metrics.platform}-${metrics.period.replace(/\s/g, "-")}.pdf`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div>
      <Header title="Monthly Report" subtitle="AI-generated narrative analysis for any platform" />
      <div className="p-6 max-w-5xl mx-auto space-y-6">

        {/* Input card */}
        <div className="bg-white border border-[#E8D9C5] rounded-xl p-5">
          <h2 className="font-semibold text-[#292524] mb-4 flex items-center gap-2">
            <span>📊</span> Report Parameters
          </h2>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
            <div>
              <label className="text-xs text-[#78614E] block mb-1">Platform</label>
              <select
                value={metrics.platform}
                onChange={e => update("platform", e.target.value)}
                className="w-full text-sm px-3 py-2 border border-[#E8D9C5] rounded-lg focus:outline-none focus:border-[#F59E0B] bg-[#FFFCF7] text-[#292524]"
              >
                {PLATFORMS.map(p => <option key={p}>{p}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs text-[#78614E] block mb-1">Period</label>
              <input
                value={metrics.period}
                onChange={e => update("period", e.target.value)}
                placeholder="March 2026"
                className="w-full text-sm px-3 py-2 border border-[#E8D9C5] rounded-lg focus:outline-none focus:border-[#F59E0B] bg-[#FFFCF7] text-[#292524]"
              />
            </div>
            <div>
              <label className="text-xs text-[#78614E] block mb-1">Followers / Subscribers</label>
              <input type="number" value={metrics.followers || ""}
                onChange={e => update("followers", parseInt(e.target.value) || 0)}
                placeholder="10000"
                className="w-full text-sm px-3 py-2 border border-[#E8D9C5] rounded-lg focus:outline-none focus:border-[#F59E0B] bg-[#FFFCF7] text-[#292524]"
              />
            </div>
            <div>
              <label className="text-xs text-[#78614E] block mb-1">Follower Growth (%)</label>
              <input type="number" value={metrics.followers_growth || ""}
                onChange={e => update("followers_growth", parseFloat(e.target.value) || 0)}
                placeholder="5.2"
                className="w-full text-sm px-3 py-2 border border-[#E8D9C5] rounded-lg focus:outline-none focus:border-[#F59E0B] bg-[#FFFCF7] text-[#292524]"
              />
            </div>
            <div>
              <label className="text-xs text-[#78614E] block mb-1">Impressions</label>
              <input type="number" value={metrics.impressions || ""}
                onChange={e => update("impressions", parseInt(e.target.value) || 0)}
                placeholder="150000"
                className="w-full text-sm px-3 py-2 border border-[#E8D9C5] rounded-lg focus:outline-none focus:border-[#F59E0B] bg-[#FFFCF7] text-[#292524]"
              />
            </div>
            <div>
              <label className="text-xs text-[#78614E] block mb-1">Reach</label>
              <input type="number" value={metrics.reach || ""}
                onChange={e => update("reach", parseInt(e.target.value) || 0)}
                placeholder="80000"
                className="w-full text-sm px-3 py-2 border border-[#E8D9C5] rounded-lg focus:outline-none focus:border-[#F59E0B] bg-[#FFFCF7] text-[#292524]"
              />
            </div>
            <div>
              <label className="text-xs text-[#78614E] block mb-1">Engagement Rate (%)</label>
              <input type="number" value={metrics.engagement_rate || ""}
                onChange={e => update("engagement_rate", parseFloat(e.target.value) || 0)}
                placeholder="3.4"
                className="w-full text-sm px-3 py-2 border border-[#E8D9C5] rounded-lg focus:outline-none focus:border-[#F59E0B] bg-[#FFFCF7] text-[#292524]"
              />
            </div>
            <div>
              <label className="text-xs text-[#78614E] block mb-1">New Subscribers</label>
              <input type="number" value={metrics.new_subscribers || ""}
                onChange={e => update("new_subscribers", parseInt(e.target.value) || 0)}
                placeholder="450"
                className="w-full text-sm px-3 py-2 border border-[#E8D9C5] rounded-lg focus:outline-none focus:border-[#F59E0B] bg-[#FFFCF7] text-[#292524]"
              />
            </div>
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs text-[#C4AA8A]">
              <span>💡</span> Fill in your platform metrics → AI generates a full narrative business brief
            </div>
            <button
              onClick={generate}
              disabled={loading || !metrics.platform}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold bg-[#F59E0B] text-white hover:bg-[#D97706] transition-colors disabled:opacity-50"
            >
              {loading ? (
                <>
                  <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                  </svg>
                  Generating Report...
                </>
              ) : "Generate AI Report"}
            </button>
          </div>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl p-4">{error}</div>
        )}

        {/* Report output */}
        {result && (
          <div className="space-y-4" id="report-output">

            {/* Header bar */}
            <div className="flex items-center justify-between bg-[#292524] rounded-xl p-4">
              <div>
                <p className="text-xs text-[#C4AA8A] mb-0.5">Monthly Report</p>
                <h2 className="text-white font-bold">{metrics.platform} · {metrics.period}</h2>
              </div>
              <div className="flex items-center gap-2">
                <button onClick={exportReport}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-[#F5D7A0]/20 text-[#F5D7A0] hover:bg-[#F5D7A0]/30 transition-colors">
                  ↓ Export CSV
                </button>
                <button onClick={printReport}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-[#F59E0B] text-white hover:bg-[#D97706] transition-colors">
                  🖨 Print / PDF
                </button>
              </div>
            </div>

            {/* Verdict + Summary */}
            {(() => {
              const v = VERDICT_STYLE[result.performance_verdict] || VERDICT_STYLE.average;
              return (
                <div className={`border rounded-xl p-4 ${v.bg}`}>
                  <div className="flex items-center gap-2 mb-2">
                    <span className={`text-sm font-bold px-2 py-0.5 rounded-full border ${v.bg} ${v.text}`}>
                      {v.label}
                    </span>
                    <span className="text-xs text-[#78614E]">Performance Verdict</span>
                  </div>
                  <p className="text-sm text-[#292524] leading-relaxed">{result.executive_summary}</p>
                </div>
              );
            })()}

            {/* KPIs */}
            {result.kpi_analysis?.length > 0 && (
              <div className="bg-white border border-[#E8D9C5] rounded-xl p-4">
                <h3 className="font-semibold text-[#292524] text-sm mb-3">KPI Analysis</h3>
                <div className="space-y-2">
                  {result.kpi_analysis.map((kpi, i) => (
                    <div key={i} className="flex items-start gap-3 p-2.5 rounded-lg bg-[#FFFCF7]">
                      <span className={`text-sm font-bold shrink-0 ${TREND_COLOR[kpi.trend]}`}>
                        {TREND_ICON[kpi.trend]}
                      </span>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-0.5">
                          <span className="text-xs font-semibold text-[#292524]">{kpi.metric}</span>
                          <span className="text-xs text-[#F59E0B] font-medium">{kpi.value}</span>
                        </div>
                        <p className="text-xs text-[#78614E]">{kpi.interpretation}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Wins & Concerns */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {result.wins?.length > 0 && (
                <div className="bg-white border border-[#E8D9C5] rounded-xl p-4">
                  <h3 className="font-semibold text-green-700 text-sm mb-3 flex items-center gap-1.5">
                    <span>✅</span> Wins
                  </h3>
                  <ul className="space-y-1.5">
                    {result.wins.map((w, i) => (
                      <li key={i} className="text-xs text-[#78614E] flex gap-1.5">
                        <span className="text-green-500 shrink-0 mt-0.5">•</span>{w}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {result.concerns?.length > 0 && (
                <div className="bg-white border border-[#E8D9C5] rounded-xl p-4">
                  <h3 className="font-semibold text-red-600 text-sm mb-3 flex items-center gap-1.5">
                    <span>⚠️</span> Concerns
                  </h3>
                  <ul className="space-y-1.5">
                    {result.concerns.map((c, i) => (
                      <li key={i} className="text-xs text-[#78614E] flex gap-1.5">
                        <span className="text-red-400 shrink-0 mt-0.5">•</span>{c}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

            {/* Recommendations */}
            {result.recommendations?.length > 0 && (
              <div className="bg-white border border-[#E8D9C5] rounded-xl p-4">
                <h3 className="font-semibold text-[#292524] text-sm mb-3">Strategic Recommendations</h3>
                <div className="space-y-2.5">
                  {result.recommendations.map((r, i) => (
                    <div key={i} className="flex gap-3 p-3 bg-[#FFFCF7] rounded-lg border border-[#F5D7A0]/40">
                      <span className="w-6 h-6 rounded-full bg-[#F59E0B] text-white text-xs font-bold flex items-center justify-center shrink-0">
                        {r.priority}
                      </span>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-[#292524] mb-0.5">{r.action}</p>
                        <p className="text-xs text-[#78614E]">
                          Impact: <span className="font-medium">{r.expected_impact}</span> · Timeline: {r.timeframe}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Forecast */}
            {result.next_month_forecast && (
              <div className="bg-[#292524] rounded-xl p-4">
                <h3 className="text-[#F5D7A0] text-sm font-semibold mb-2">Next Month Forecast</h3>
                <p className="text-[#C4AA8A] text-sm leading-relaxed">{result.next_month_forecast}</p>
              </div>
            )}

            <p className="text-xs text-[#C4AA8A] text-right">
              Generated: {new Date(result.generated_at).toLocaleString()}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
