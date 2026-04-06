"use client";
import { useState } from "react";
import { BarChart3, Sparkles } from "lucide-react";
import { formatNumber } from "@/lib/utils";

interface CategoryData {
  id: string;
  name: string;
  videoCount: number;
  avgViews: number;
  avgLikes: number;
  avgComments: number;
}

interface AnalysisResult {
  top_performing: string;
  worst_performing: string;
  recommendations: Array<{ priority: number; action: string; expected_impact: string }>;
  niche_fit: { best_category: string; reason: string };
  gaps: string[];
  executive_summary: string;
}

interface Props {
  channelId?: string;
  niche?: string;
}

const REGION_OPTIONS = [
  // Americas
  { code: "US", name: "🇺🇸 USA" },
  { code: "CA", name: "🇨🇦 Canada" },
  { code: "BR", name: "🇧🇷 Brazil" },
  { code: "MX", name: "🇲🇽 Mexico" },
  { code: "AR", name: "🇦🇷 Argentina" },
  { code: "CO", name: "🇨🇴 Colombia" },
  { code: "CL", name: "🇨🇱 Chile" },
  { code: "PE", name: "🇵🇪 Peru" },
  // Europe
  { code: "RO", name: "🇷🇴 Romania" },
  { code: "GB", name: "🇬🇧 UK" },
  { code: "DE", name: "🇩🇪 Germany" },
  { code: "FR", name: "🇫🇷 France" },
  { code: "IT", name: "🇮🇹 Italy" },
  { code: "ES", name: "🇪🇸 Spain" },
  { code: "NL", name: "🇳🇱 Netherlands" },
  { code: "PL", name: "🇵🇱 Poland" },
  { code: "SE", name: "🇸🇪 Sweden" },
  { code: "PT", name: "🇵🇹 Portugal" },
  { code: "GR", name: "🇬🇷 Greece" },
  { code: "AT", name: "🇦🇹 Austria" },
  { code: "BE", name: "🇧🇪 Belgium" },
  { code: "CH", name: "🇨🇭 Switzerland" },
  { code: "HU", name: "🇭🇺 Hungary" },
  { code: "CZ", name: "🇨🇿 Czech Republic" },
  { code: "BG", name: "🇧🇬 Bulgaria" },
  { code: "HR", name: "🇭🇷 Croatia" },
  { code: "UA", name: "🇺🇦 Ukraine" },
  // Asia & Pacific
  { code: "JP", name: "🇯🇵 Japan" },
  { code: "KR", name: "🇰🇷 South Korea" },
  { code: "IN", name: "🇮🇳 India" },
  { code: "PH", name: "🇵🇭 Philippines" },
  { code: "TH", name: "🇹🇭 Thailand" },
  { code: "SG", name: "🇸🇬 Singapore" },
  { code: "ID", name: "🇮🇩 Indonesia" },
  { code: "MY", name: "🇲🇾 Malaysia" },
  { code: "VN", name: "🇻🇳 Vietnam" },
  { code: "AU", name: "🇦🇺 Australia" },
  { code: "NZ", name: "🇳🇿 New Zealand" },
  // Middle East
  { code: "SA", name: "🇸🇦 Saudi Arabia" },
  { code: "AE", name: "🇦🇪 UAE" },
  { code: "EG", name: "🇪🇬 Egypt" },
  { code: "TR", name: "🇹🇷 Turkey" },
  { code: "IL", name: "🇮🇱 Israel" },
  { code: "KW", name: "🇰🇼 Kuwait" },
  { code: "QA", name: "🇶🇦 Qatar" },
  { code: "MA", name: "🇲🇦 Morocco" },
  { code: "DZ", name: "🇩🇿 Algeria" },
  // Africa
  { code: "NG", name: "🇳🇬 Nigeria" },
  { code: "ZA", name: "🇿🇦 South Africa" },
  { code: "GH", name: "🇬🇭 Ghana" },
  { code: "KE", name: "🇰🇪 Kenya" },
  // CIS
  { code: "RU", name: "🇷🇺 Russia" },
  { code: "KZ", name: "🇰🇿 Kazakhstan" },
  { code: "BY", name: "🇧🇾 Belarus" },
  { code: "UZ", name: "🇺🇿 Uzbekistan" },
];

export default function CategoryComparisonCard({ channelId, niche }: Props) {
  const [categories, setCategories] = useState<CategoryData[]>([]);
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null);
  const [loadingData, setLoadingData] = useState(false);
  const [loadingAI, setLoadingAI] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [region, setRegion] = useState("US");
  const [nicheName, setNicheName] = useState(niche || "");

  const fetchCategories = async () => {
    setLoadingData(true);
    setError(null);
    setAnalysis(null);
    try {
      const params = new URLSearchParams({ regionCode: region });
      if (channelId) params.set("channelId", channelId);
      const res = await fetch(`/api/youtube/categories?${params}`);
      const data = await res.json();
      if (data.error) { setError(data.error); return; }
      setCategories(data.categories || []);
    } catch {
      setError("Failed to load categories");
    } finally {
      setLoadingData(false);
    }
  };

  const runAIAnalysis = async () => {
    if (!categories.length) return;
    setLoadingAI(true);
    setError(null);
    try {
      const res = await fetch("/api/ai/category-analysis", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ categories, niche: nicheName || "general" }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.message || data.error || "AI analysis failed"); return; }
      setAnalysis(data);
    } catch {
      setError("Connection error");
    } finally {
      setLoadingAI(false);
    }
  };

  const maxViews = categories.length ? Math.max(...categories.map(c => c.avgViews)) : 1;

  return (
    <div className="bg-white border border-[#E8D9C5] rounded-xl p-5 space-y-4">
      <div className="flex items-center gap-2">
        <BarChart3 className="w-4 h-4 text-[#F59E0B]" />
        <h3 className="font-semibold text-[#292524]">Category Comparison</h3>
      </div>

      {/* Controls */}
      <div className="flex flex-wrap items-end gap-3">
        <div>
          <label className="text-xs text-[#78614E] block mb-1">Region</label>
          <select value={region} onChange={e => setRegion(e.target.value)}
            className="text-sm px-3 py-1.5 border border-[#E8D9C5] rounded-lg focus:outline-none focus:border-[#F59E0B] bg-[#FFFCF7] text-[#292524]">
            {REGION_OPTIONS.map(r => <option key={r.code} value={r.code}>{r.name}</option>)}
          </select>
        </div>
        <div className="flex-1 min-w-[140px]">
          <label className="text-xs text-[#78614E] block mb-1">Your niche (for AI)</label>
          <input value={nicheName} onChange={e => setNicheName(e.target.value)}
            placeholder="e.g. tech, cooking, fitness"
            className="w-full text-sm px-3 py-1.5 border border-[#E8D9C5] rounded-lg focus:outline-none focus:border-[#F59E0B] bg-[#FFFCF7] text-[#292524] placeholder:text-[#C4AA8A]"
          />
        </div>
        <button onClick={fetchCategories} disabled={loadingData}
          className="px-4 py-1.5 rounded-lg text-sm font-bold bg-[#292524] text-white hover:bg-[#3D2E1E] disabled:opacity-50 transition-colors">
          {loadingData ? "Loading..." : "Load Data"}
        </button>
      </div>

      {error && <div className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg p-2">{error}</div>}

      {/* Category bars */}
      {categories.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold text-[#292524]">Avg Views by Category ({categories.length} categories)</p>
            <button onClick={runAIAnalysis} disabled={loadingAI}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-[#F59E0B] text-white hover:bg-[#D97706] disabled:opacity-50 transition-colors">
              <Sparkles className="w-3 h-3" />
              {loadingAI ? "Analyzing..." : "AI Analysis"}
            </button>
          </div>
          {categories.slice(0, 10).map(cat => (
            <div key={cat.id} className="space-y-0.5">
              <div className="flex items-center justify-between text-xs">
                <span className="text-[#292524] font-medium truncate max-w-[180px]">{cat.name}</span>
                <div className="flex items-center gap-3 text-[#A8967E] shrink-0">
                  <span>{formatNumber(cat.avgViews)} views</span>
                  <span className="text-[#C4AA8A]">{cat.videoCount} videos</span>
                </div>
              </div>
              <div className="h-1.5 bg-[#F5EDE0] rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all"
                  style={{
                    width: `${Math.round((cat.avgViews / maxViews) * 100)}%`,
                    background: "linear-gradient(90deg, #F59E0B, #D97706)"
                  }}
                />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* AI Analysis */}
      {analysis && (
        <div className="bg-[#FFFCF7] border border-[#F5D7A0]/50 rounded-xl p-4 space-y-3">
          <p className="text-sm text-[#292524] leading-relaxed">{analysis.executive_summary}</p>

          <div className="grid grid-cols-2 gap-3">
            <div className="bg-green-50 border border-green-200 rounded-lg p-2.5">
              <p className="text-xs font-semibold text-green-700 mb-0.5">Top Performing</p>
              <p className="text-xs text-[#292524]">{analysis.top_performing}</p>
            </div>
            <div className="bg-red-50 border border-red-200 rounded-lg p-2.5">
              <p className="text-xs font-semibold text-red-600 mb-0.5">Needs Work</p>
              <p className="text-xs text-[#292524]">{analysis.worst_performing}</p>
            </div>
          </div>

          {analysis.niche_fit && (
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-2.5">
              <p className="text-xs font-semibold text-[#D97706] mb-0.5">Best niche fit: {analysis.niche_fit.best_category}</p>
              <p className="text-xs text-[#78614E]">{analysis.niche_fit.reason}</p>
            </div>
          )}

          {analysis.recommendations?.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-[#292524] mb-1.5">Recommendations</p>
              {analysis.recommendations.map((r, i) => (
                <div key={i} className="flex gap-2 mb-1.5">
                  <span className="w-4 h-4 rounded-full bg-[#F59E0B] text-white text-xs font-bold flex items-center justify-center shrink-0">{r.priority}</span>
                  <div>
                    <p className="text-xs text-[#292524]">{r.action}</p>
                    <p className="text-xs text-[#A8967E]">{r.expected_impact}</p>
                  </div>
                </div>
              ))}
            </div>
          )}

          {analysis.gaps?.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-[#292524] mb-1">Content Gaps</p>
              <ul className="space-y-0.5">
                {analysis.gaps.map((g, i) => (
                  <li key={i} className="text-xs text-[#78614E] flex gap-1.5">
                    <span className="text-[#F59E0B] shrink-0">→</span>{g}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
