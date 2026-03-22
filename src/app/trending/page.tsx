"use client";

import { useState, useEffect } from "react";
import Header from "@/components/layout/Header";
import PlatformBadge from "@/components/ui/PlatformBadge";
import { formatNumber } from "@/lib/utils";
import { TrendingUp, Flame, Globe } from "lucide-react";

const REGIONS = [
  { code: "RO", label: "🇷🇴 Romania" },
  { code: "US", label: "🌍 Global (US)" },
  { code: "GB", label: "🇬🇧 UK" },
  { code: "DE", label: "🇩🇪 Germany" },
];

export default function TrendingPage() {
  const [region, setRegion] = useState("RO");
  const [ytVideos, setYtVideos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/youtube/trending?region=${region}&max=12`)
      .then(r => r.json())
      .then(d => { if (Array.isArray(d)) setYtVideos(d); else setYtVideos([]); })
      .finally(() => setLoading(false));
  }, [region]);

  const top3 = ytVideos.slice(0, 3);

  return (
    <div>
      <Header title="Trending Discovery" subtitle="Cele mai vizionate videoclipuri în timp real, pe regiuni" />

      <div className="p-6 space-y-6">

        {/* Region Selector */}
        <div className="flex items-center gap-3">
          <Globe className="w-4 h-4" style={{ color: "#A8967E" }} />
          <div className="flex rounded-lg overflow-hidden" style={{ border: "1px solid rgba(245,215,160,0.35)" }}>
            {REGIONS.map(r => (
              <button key={r.code} type="button" onClick={() => setRegion(r.code)}
                className="px-4 py-2 text-sm font-medium transition-colors"
                style={region === r.code ? { backgroundColor: "#FF0000", color: "white" } : { color: "#78614E", backgroundColor: "#FFFCF7" }}>
                {r.label}
              </button>
            ))}
          </div>
        </div>

        {/* Hot Topics — Top 3 real videos */}
        {!loading && top3.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {top3.map((v, i) => {
              const er = v.views > 0 ? Math.round(((v.likes + v.comments) / v.views) * 10000) / 100 : 0;
              return (
                <a
                  key={v.id}
                  href={`https://www.youtube.com/watch?v=${v.id}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="rounded-xl p-5 block hover:opacity-90 transition-opacity"
                  style={i === 0
                    ? { background: "linear-gradient(135deg, #FF0000, #cc0000)", color: "white", boxShadow: "0 4px 12px rgba(255,0,0,0.25)" }
                    : { backgroundColor: "#FFFCF7", border: "1px solid rgba(245,215,160,0.25)", boxShadow: "0 1px 3px rgba(120,97,78,0.08)" }
                  }
                >
                  <div className="flex items-center gap-2 mb-3">
                    {i === 0 ? (
                      <Flame className="w-5 h-5" style={{ color: "rgba(255,255,255,0.9)" }} />
                    ) : (
                      <TrendingUp className="w-4 h-4" style={{ color: "#C4AA8A" }} />
                    )}
                    <span className="text-xs font-semibold" style={{ color: i === 0 ? "rgba(255,255,255,0.8)" : "#A8967E" }}>
                      #{i + 1} Trending {REGIONS.find(r => r.code === region)?.label}
                    </span>
                    <div className="ml-auto">
                      <PlatformBadge platform="youtube" />
                    </div>
                  </div>
                  <div className="mb-3">
                    <img src={v.thumbnail} alt="" className="w-full rounded-lg object-cover" style={{ aspectRatio: "16/9" }} />
                  </div>
                  <h3 className="text-sm font-bold leading-tight line-clamp-2 mb-1" style={{ color: i === 0 ? "white" : "#292524" }}>
                    {v.title}
                  </h3>
                  <p className="text-xs mb-3" style={{ color: i === 0 ? "rgba(255,255,255,0.7)" : "#A8967E" }}>
                    {v.channel}
                  </p>
                  <div className="flex justify-between text-sm" style={{ borderTop: i === 0 ? "1px solid rgba(255,255,255,0.2)" : "1px solid rgba(245,215,160,0.2)", paddingTop: "12px" }}>
                    <div>
                      <p className="text-xs" style={{ color: i === 0 ? "rgba(255,255,255,0.6)" : "#C4AA8A" }}>Views</p>
                      <p className="font-bold" style={{ color: i === 0 ? "white" : "#292524" }}>{formatNumber(v.views)}</p>
                    </div>
                    <div>
                      <p className="text-xs" style={{ color: i === 0 ? "rgba(255,255,255,0.6)" : "#C4AA8A" }}>Likes</p>
                      <p className="font-bold" style={{ color: i === 0 ? "white" : "#292524" }}>{formatNumber(v.likes)}</p>
                    </div>
                    <div>
                      <p className="text-xs" style={{ color: i === 0 ? "rgba(255,255,255,0.6)" : "#C4AA8A" }}>ER</p>
                      <p className="font-bold" style={{ color: i === 0 ? "rgba(255,255,200,1)" : "#16a34a" }}>
                        {er}%
                      </p>
                    </div>
                  </div>
                </a>
              );
            })}
          </div>
        )}

        {/* Videos Table */}
        <div className="rounded-xl overflow-hidden" style={{ backgroundColor: "#FFFCF7", border: "1px solid rgba(245,215,160,0.25)", boxShadow: "0 1px 3px rgba(120,97,78,0.08)" }}>
          <div className="px-5 py-4" style={{ borderBottom: "1px solid rgba(245,215,160,0.2)" }}>
            <h3 className="font-semibold" style={{ color: "#292524" }}>
              Top Trending YouTube — {REGIONS.find(r => r.code === region)?.label}
            </h3>
            <p className="text-xs mt-0.5" style={{ color: "#A8967E" }}>Date reale din YouTube Data API</p>
          </div>

          {loading ? (
            <div className="py-12 text-center text-sm" style={{ color: "#C4AA8A" }}>Se încarcă...</div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="text-xs uppercase tracking-wide" style={{ backgroundColor: "rgba(245,215,160,0.1)", color: "#A8967E" }}>
                  <th className="text-left px-5 py-3">#</th>
                  <th className="text-left px-3 py-3">Video / Canal</th>
                  <th className="text-left px-3 py-3">Platform</th>
                  <th className="text-right px-3 py-3">Views</th>
                  <th className="text-right px-3 py-3">Likes</th>
                  <th className="text-right px-3 py-3">Comentarii</th>
                  <th className="text-right px-5 py-3">ER</th>
                </tr>
              </thead>
              <tbody>
                {ytVideos.map((v, i) => {
                  const er = v.views > 0
                    ? Math.round(((v.likes + v.comments) / v.views) * 10000) / 100
                    : 0;
                  return (
                    <tr key={v.id} className="transition-colors" style={{ borderTop: "1px solid rgba(245,215,160,0.15)" }}
                      onMouseEnter={e => (e.currentTarget.style.backgroundColor = "rgba(245,215,160,0.07)")}
                      onMouseLeave={e => (e.currentTarget.style.backgroundColor = "transparent")}
                    >
                      <td className="px-5 py-3">
                        <span className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold" style={{ backgroundColor: i < 3 ? "rgba(255,0,0,0.1)" : "rgba(245,215,160,0.2)", color: i < 3 ? "#cc0000" : "#78614E" }}>
                          {i + 1}
                        </span>
                      </td>
                      <td className="px-3 py-3">
                        <a href={`https://www.youtube.com/watch?v=${v.id}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 group">
                          <img src={v.thumbnail} alt="" className="w-16 h-9 rounded object-cover flex-shrink-0" />
                          <div className="min-w-0">
                            <p className="text-xs font-semibold truncate max-w-[200px] group-hover:underline" style={{ color: "#3D2E1E" }}>{v.title}</p>
                            <p className="text-xs" style={{ color: "#C4AA8A" }}>{v.channel}</p>
                          </div>
                        </a>
                      </td>
                      <td className="px-3 py-3"><PlatformBadge platform="youtube" /></td>
                      <td className="px-3 py-3 text-right font-medium text-xs" style={{ color: "#5C4A35" }}>{formatNumber(v.views)}</td>
                      <td className="px-3 py-3 text-right text-xs" style={{ color: "#A8967E" }}>{formatNumber(v.likes)}</td>
                      <td className="px-3 py-3 text-right text-xs" style={{ color: "#A8967E" }}>{formatNumber(v.comments)}</td>
                      <td className="px-5 py-3 text-right">
                        <span className="text-xs font-semibold px-1.5 py-0.5 rounded" style={{ backgroundColor: "rgba(245,158,11,0.12)", color: "#D97706" }}>
                          {er}%
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}

          {!loading && ytVideos.length === 0 && (
            <div className="text-center py-12 text-sm" style={{ color: "#C4AA8A" }}>
              Nu s-au găsit videoclipuri trending pentru această regiune.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
