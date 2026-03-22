"use client";

import { useState, useEffect, useCallback } from "react";
import Header from "@/components/layout/Header";
import { Search, TrendingUp, BarChart2, ArrowUpRight, Plus, X, ExternalLink } from "lucide-react";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from "recharts";

const A = "#F5A623";
const COLORS = ["#F5A623", "#1DB954", "#3B82F6", "#EF4444", "#8B5CF6"];
const cardStyle = { backgroundColor: "#FFFCF7", border: "1px solid rgba(245,215,160,0.25)", boxShadow: "0 1px 3px rgba(120,97,78,0.08)" };

const COUNTRIES = [
  { code: "RO", name: "România", flag: "🇷🇴" },
  { code: "US", name: "SUA", flag: "🇺🇸" },
  { code: "GB", name: "UK", flag: "🇬🇧" },
  { code: "DE", name: "Germania", flag: "🇩🇪" },
  { code: "FR", name: "Franța", flag: "🇫🇷" },
  { code: "IT", name: "Italia", flag: "🇮🇹" },
  { code: "ES", name: "Spania", flag: "🇪🇸" },
  { code: "BR", name: "Brazilia", flag: "🇧🇷" },
];

export default function TrendsPage() {
  const [tab, setTab] = useState<"daily" | "compare" | "related">("daily");
  const [geo, setGeo] = useState("RO");

  // Daily trends state
  const [daily, setDaily] = useState<any[]>([]);
  const [dailyLoading, setDailyLoading] = useState(false);
  const [dailyError, setDailyError] = useState("");

  // Compare state
  const [kwInput, setKwInput] = useState("");
  const [keywords, setKeywords] = useState<string[]>(["marketing", "social media"]);
  const [compareData, setCompareData] = useState<any>(null);
  const [compareLoading, setCompareLoading] = useState(false);
  const [compareError, setCompareError] = useState("");

  // Related state
  const [relQuery, setRelQuery] = useState("");
  const [relData, setRelData] = useState<any>(null);
  const [relLoading, setRelLoading] = useState(false);
  const [relError, setRelError] = useState("");

  const loadDaily = useCallback((g: string) => {
    setDailyLoading(true);
    setDailyError("");
    fetch(`/api/trends?type=daily&geo=${g}`)
      .then(r => r.json())
      .then(d => {
        if (d.error) setDailyError(d.error);
        else setDaily(d.trends || []);
      })
      .catch(() => setDailyError("Eroare de rețea"))
      .finally(() => setDailyLoading(false));
  }, []);

  useEffect(() => {
    if (tab === "daily") loadDaily(geo);
  }, [tab, geo, loadDaily]);

  const addKeyword = () => {
    const kw = kwInput.trim();
    if (!kw || keywords.includes(kw) || keywords.length >= 5) return;
    setKeywords(prev => [...prev, kw]);
    setKwInput("");
  };

  const loadCompare = () => {
    if (!keywords.length) return;
    setCompareLoading(true);
    setCompareError("");
    fetch(`/api/trends?type=interest&keywords=${encodeURIComponent(keywords.join(","))}&geo=${geo}`)
      .then(r => r.json())
      .then(d => {
        if (d.error) setCompareError(d.error);
        else setCompareData(d);
      })
      .catch(() => setCompareError("Eroare de rețea"))
      .finally(() => setCompareLoading(false));
  };

  const loadRelated = () => {
    if (!relQuery.trim()) return;
    setRelLoading(true);
    setRelError("");
    fetch(`/api/trends?type=related&keyword=${encodeURIComponent(relQuery.trim())}&geo=${geo}`)
      .then(r => r.json())
      .then(d => {
        if (d.error) setRelError(d.error);
        else setRelData(d);
      })
      .catch(() => setRelError("Eroare de rețea"))
      .finally(() => setRelLoading(false));
  };

  const chartData = compareData?.timeline?.map((point: any) => {
    const obj: Record<string, any> = { date: point.date };
    compareData.keywords.forEach((kw: string, i: number) => {
      obj[kw] = point.values[i] ?? 0;
    });
    return obj;
  }) || [];

  return (
    <div>
      <Header title="Google Trends" subtitle="Trending searches, comparare keywords, queries asociate" />
      <div className="p-6 space-y-5">

        {/* Country selector */}
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs font-semibold" style={{ color: "#A8967E" }}>Țară:</span>
          {COUNTRIES.map(c => (
            <button key={c.code} type="button" onClick={() => setGeo(c.code)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all"
              style={geo === c.code
                ? { backgroundColor: A, color: "white" }
                : { backgroundColor: "rgba(245,215,160,0.1)", color: "#78614E", border: "1px solid rgba(245,215,160,0.2)" }}>
              {c.flag} {c.name}
            </button>
          ))}
        </div>

        {/* Tabs */}
        <div className="flex gap-1 p-1 rounded-xl w-fit" style={{ backgroundColor: "rgba(245,215,160,0.1)", border: "1px solid rgba(245,215,160,0.25)" }}>
          {([
            ["daily", "🔥 Trending Azi"],
            ["compare", "📈 Compară Keywords"],
            ["related", "🔍 Queries Asociate"],
          ] as const).map(([t, label]) => (
            <button key={t} type="button" onClick={() => setTab(t)}
              className="px-5 py-2 text-sm font-semibold rounded-lg transition-all"
              style={tab === t ? { backgroundColor: A, color: "white" } : { color: "#78614E" }}>
              {label}
            </button>
          ))}
        </div>

        {/* ─── DAILY TRENDS ─── */}
        {tab === "daily" && (
          <div>
            {dailyLoading && (
              <div className="flex items-center justify-center h-40 rounded-xl" style={cardStyle}>
                <p className="text-sm" style={{ color: "#C4AA8A" }}>Se încarcă trending-ul...</p>
              </div>
            )}
            {dailyError && (
              <div className="rounded-xl p-5" style={cardStyle}>
                <p className="text-sm font-semibold" style={{ color: "#dc2626" }}>Eroare: {dailyError}</p>
              </div>
            )}
            {!dailyLoading && !dailyError && (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {daily.map((trend, i) => (
                  <div key={i} className="rounded-xl p-4 space-y-2" style={cardStyle}>
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold w-5 text-center flex-shrink-0"
                          style={{ color: i < 3 ? A : "#C4AA8A" }}>{i + 1}</span>
                        <span className="text-sm font-bold" style={{ color: "#292524" }}>{trend.title}</span>
                      </div>
                      <span className="text-xs font-semibold flex-shrink-0 px-2 py-0.5 rounded-full"
                        style={{ backgroundColor: "rgba(245,166,35,0.1)", color: A }}>
                        {trend.traffic}
                      </span>
                    </div>
                    {trend.relatedQueries?.length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        {trend.relatedQueries.slice(0, 3).map((q: string, j: number) => (
                          <span key={j} className="text-xs px-2 py-0.5 rounded-full"
                            style={{ backgroundColor: "rgba(245,215,160,0.15)", color: "#78614E" }}>{q}</span>
                        ))}
                      </div>
                    )}
                    {trend.articles?.map((a: any, j: number) => (
                      <a key={j} href={a.url} target="_blank" rel="noopener noreferrer"
                        className="flex items-center gap-2 group">
                        {a.thumbnail && (
                          <img src={a.thumbnail} alt="" className="w-10 h-10 rounded object-cover flex-shrink-0" />
                        )}
                        <div className="min-w-0">
                          <p className="text-xs font-medium leading-tight line-clamp-2 group-hover:underline"
                            style={{ color: "#292524" }}>{a.title}</p>
                          <p className="text-xs mt-0.5" style={{ color: "#C4AA8A" }}>{a.source}</p>
                        </div>
                        <ExternalLink className="w-3 h-3 flex-shrink-0 opacity-0 group-hover:opacity-100" style={{ color: A }} />
                      </a>
                    ))}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ─── COMPARE KEYWORDS ─── */}
        {tab === "compare" && (
          <div className="space-y-4">
            <div className="rounded-xl p-4 space-y-3" style={cardStyle}>
              <p className="text-xs font-semibold" style={{ color: "#A8967E" }}>Keywords (max 5)</p>
              <div className="flex flex-wrap gap-2">
                {keywords.map((kw, i) => (
                  <span key={kw} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-semibold"
                    style={{ backgroundColor: COLORS[i] + "20", color: COLORS[i], border: `1px solid ${COLORS[i]}40` }}>
                    {kw}
                    <button type="button" onClick={() => setKeywords(prev => prev.filter(k => k !== kw))}>
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))}
              </div>
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="Adaugă keyword..."
                  value={kwInput}
                  onChange={e => setKwInput(e.target.value)}
                  onKeyDown={e => e.key === "Enter" && addKeyword()}
                  disabled={keywords.length >= 5}
                  className="flex-1 px-3 py-2 text-sm rounded-lg focus:outline-none"
                  style={{ border: "1px solid rgba(245,215,160,0.3)", backgroundColor: "#FFFCF7", color: "#292524" }}
                />
                <button type="button" onClick={addKeyword} disabled={keywords.length >= 5}
                  className="px-3 py-2 rounded-lg"
                  style={{ backgroundColor: "rgba(245,166,35,0.1)", color: A }}>
                  <Plus className="w-4 h-4" />
                </button>
                <button type="button" onClick={loadCompare} disabled={compareLoading || !keywords.length}
                  className="px-5 py-2 rounded-lg text-sm font-bold"
                  style={{ backgroundColor: A, color: "white" }}>
                  {compareLoading ? "..." : "Compară"}
                </button>
              </div>
            </div>

            {compareError && (
              <div className="rounded-xl p-4" style={cardStyle}>
                <p className="text-sm" style={{ color: "#dc2626" }}>Eroare: {compareError}</p>
              </div>
            )}

            {compareData && chartData.length > 0 && (
              <div className="rounded-xl p-5" style={cardStyle}>
                <p className="text-sm font-semibold mb-4" style={{ color: "#292524" }}>
                  Interest în timp — ultimele 90 zile ({COUNTRIES.find(c => c.code === geo)?.flag} {COUNTRIES.find(c => c.code === geo)?.name})
                </p>
                <ResponsiveContainer width="100%" height={320}>
                  <LineChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(245,215,160,0.2)" />
                    <XAxis dataKey="date" tick={{ fontSize: 10, fill: "#C4AA8A" }} interval="preserveStartEnd" />
                    <YAxis tick={{ fontSize: 10, fill: "#C4AA8A" }} domain={[0, 100]} />
                    <Tooltip
                      contentStyle={{ backgroundColor: "#FFFCF7", border: "1px solid rgba(245,215,160,0.3)", borderRadius: 8, fontSize: 12 }}
                    />
                    <Legend wrapperStyle={{ fontSize: 12 }} />
                    {compareData.keywords.map((kw: string, i: number) => (
                      <Line key={kw} type="monotone" dataKey={kw} stroke={COLORS[i]} strokeWidth={2} dot={false} />
                    ))}
                  </LineChart>
                </ResponsiveContainer>
              </div>
            )}

            {!compareData && !compareLoading && (
              <div className="rounded-xl p-12 text-center" style={cardStyle}>
                <BarChart2 className="w-10 h-10 mx-auto mb-3" style={{ color: "rgba(245,166,35,0.3)" }} />
                <p className="font-semibold" style={{ color: "#292524" }}>Compară până la 5 keywords</p>
                <p className="text-sm mt-1" style={{ color: "#A8967E" }}>Adaugă keywords și apasă "Compară" pentru a vedea interesul în timp</p>
              </div>
            )}
          </div>
        )}

        {/* ─── RELATED QUERIES ─── */}
        {tab === "related" && (
          <div className="space-y-4">
            <div className="flex gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: A }} />
                <input
                  type="text"
                  placeholder="Introdu un keyword (ex: marketing digital, influencer...)"
                  value={relQuery}
                  onChange={e => setRelQuery(e.target.value)}
                  onKeyDown={e => e.key === "Enter" && loadRelated()}
                  className="w-full pl-9 pr-4 py-3 text-sm rounded-xl focus:outline-none"
                  style={{ border: "1px solid rgba(245,166,35,0.3)", backgroundColor: "#FFFCF7", color: "#292524" }}
                />
              </div>
              <button type="button" onClick={loadRelated} disabled={relLoading || !relQuery.trim()}
                className="px-6 py-3 rounded-xl text-sm font-bold"
                style={{ backgroundColor: A, color: "white" }}>
                {relLoading ? "..." : "Caută"}
              </button>
            </div>

            {relError && (
              <div className="rounded-xl p-4" style={cardStyle}>
                <p className="text-sm" style={{ color: "#dc2626" }}>Eroare: {relError}</p>
              </div>
            )}

            {relData && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {/* Top Queries */}
                <div className="rounded-xl overflow-hidden" style={cardStyle}>
                  <div className="px-5 py-4" style={{ borderBottom: "1px solid rgba(245,215,160,0.2)" }}>
                    <h3 className="font-semibold" style={{ color: "#292524" }}>Top Queries</h3>
                    <p className="text-xs mt-0.5" style={{ color: "#A8967E" }}>Cele mai frecvente căutări asociate</p>
                  </div>
                  <div className="divide-y" style={{ borderColor: "rgba(245,215,160,0.1)" }}>
                    {(!relData.top || relData.top.length === 0) && (
                      <p className="px-5 py-4 text-sm" style={{ color: "#C4AA8A" }}>Nu există date — încearcă alt keyword.</p>
                    )}
                    {relData.top?.map((item: any, i: number) => (
                      <div key={i} className="flex items-center gap-3 px-5 py-3">
                        <span className="text-xs font-bold w-5 text-center" style={{ color: i < 3 ? A : "#C4AA8A" }}>{i + 1}</span>
                        <span className="flex-1 text-sm" style={{ color: "#292524" }}>{item.query}</span>
                        <div className="flex items-center gap-2">
                          <div className="w-20 h-1.5 rounded-full overflow-hidden" style={{ backgroundColor: "rgba(245,166,35,0.15)" }}>
                            <div className="h-full rounded-full" style={{ width: `${item.value}%`, backgroundColor: A }} />
                          </div>
                          <span className="text-xs w-6 text-right" style={{ color: "#C4AA8A" }}>{item.value}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Rising Queries */}
                <div className="rounded-xl overflow-hidden" style={cardStyle}>
                  <div className="px-5 py-4" style={{ borderBottom: "1px solid rgba(245,215,160,0.2)" }}>
                    <h3 className="font-semibold" style={{ color: "#292524" }}>Rising Queries</h3>
                    <p className="text-xs mt-0.5" style={{ color: "#A8967E" }}>Căutări în creștere rapidă — viitoare oportunități</p>
                  </div>
                  <div className="divide-y" style={{ borderColor: "rgba(245,215,160,0.1)" }}>
                    {(!relData.rising || relData.rising.length === 0) && (
                      <p className="px-5 py-4 text-sm" style={{ color: "#C4AA8A" }}>Nu există date — încearcă alt keyword.</p>
                    )}
                    {relData.rising?.map((item: any, i: number) => (
                      <div key={i} className="flex items-center gap-3 px-5 py-3">
                        <span className="text-xs font-bold w-5 text-center" style={{ color: "#1DB954" }}>{i + 1}</span>
                        <span className="flex-1 text-sm" style={{ color: "#292524" }}>{item.query}</span>
                        <span className="text-xs font-bold px-2 py-0.5 rounded-full"
                          style={{ backgroundColor: "rgba(29,185,84,0.1)", color: "#1DB954" }}>
                          {item.formattedValue}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {!relData && !relLoading && (
              <div className="rounded-xl p-8" style={cardStyle}>
                <div className="text-center mb-6">
                  <TrendingUp className="w-10 h-10 mx-auto mb-3" style={{ color: "rgba(245,166,35,0.3)" }} />
                  <p className="font-semibold" style={{ color: "#292524" }}>Descoperă queries asociate</p>
                  <p className="text-sm mt-1" style={{ color: "#A8967E" }}>
                    Scrie un brand, produs sau nișă și află ce caută oamenii în legătură cu el
                  </p>
                </div>
                <div className="space-y-3">
                  <p className="text-xs font-semibold text-center" style={{ color: "#C4AA8A" }}>Exemple de keywords</p>
                  <div className="flex flex-wrap justify-center gap-2">
                    {["marketing", "nike", "iphone", "vacanta", "dieta", "crypto", "influencer", "amazon"].map(kw => (
                      <button key={kw} type="button"
                        onClick={() => { setRelQuery(kw); setTimeout(loadRelated, 50); }}
                        className="px-3 py-1.5 rounded-full text-xs font-semibold transition-colors"
                        style={{ backgroundColor: "rgba(245,166,35,0.1)", color: A, border: `1px solid rgba(245,166,35,0.25)` }}>
                        {kw}
                      </button>
                    ))}
                  </div>
                  <p className="text-xs text-center mt-2" style={{ color: "#C4AA8A" }}>
                    <strong>Top Queries</strong> = ce caută oamenii alături de keyword-ul tău<br/>
                    <strong>Rising Queries</strong> = căutări în creștere rapidă = oportunități SEO / conținut
                  </p>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
