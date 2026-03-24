"use client";

import { useState, useEffect } from "react";
import Header from "@/components/layout/Header";
import { Newspaper, Globe, ExternalLink, Clock, Download } from "lucide-react";
import { exportCSV, exportJSON } from "@/lib/utils";

const cardStyle = { backgroundColor: "#FFFCF7", border: "1px solid rgba(245,215,160,0.25)", boxShadow: "0 1px 3px rgba(120,97,78,0.08)" };

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const h = Math.floor(diff / 3600000);
  const m = Math.floor(diff / 60000);
  if (h >= 24) return `${Math.floor(h / 24)}z`;
  if (h >= 1) return `${h}h`;
  return `${m}m`;
}

type Country = { code: string; name: string; flag: string };
type Article = { title: string; description: string; url: string; thumbnail: string | null; source: string; publishedAt: string };

export default function NewsPage() {
  const [data, setData] = useState<{ country: Country; countries: Country[]; headlines: Article[]; social: Article[] } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedCountry, setSelectedCountry] = useState("ro");

  useEffect(() => {
    setLoading(true);
    setError(null);
    fetch(`/api/news?country=${selectedCountry}`)
      .then(r => r.json())
      .then(d => { if (d.error) setError(d.error); else setData(d); })
      .catch(() => setError("Eroare de conexiune"))
      .finally(() => setLoading(false));
  }, [selectedCountry]);

  return (
    <div>
      <Header title="News" subtitle="Știri din toată lumea + Creator Economy — fiecare țară în limba ei" />
      <div className="p-6 space-y-6">

        {/* Country selector */}
        {data?.countries && (
          <div className="flex flex-wrap gap-2">
            {data.countries.map(c => (
              <button
                key={c.code}
                type="button"
                onClick={() => setSelectedCountry(c.code)}
                className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-all"
                style={selectedCountry === c.code ? {
                  backgroundColor: "rgba(245,158,11,0.15)",
                  color: "#F59E0B",
                  border: "1px solid rgba(245,158,11,0.3)",
                } : {
                  backgroundColor: "#FFFCF7",
                  color: "#78614E",
                  border: "1px solid rgba(245,215,160,0.25)",
                }}
                onMouseEnter={e => {
                  if (selectedCountry !== c.code) {
                    e.currentTarget.style.backgroundColor = "rgba(245,215,160,0.15)";
                  }
                }}
                onMouseLeave={e => {
                  if (selectedCountry !== c.code) {
                    e.currentTarget.style.backgroundColor = "#FFFCF7";
                  }
                }}
              >
                <span>{c.flag}</span>
                <span>{c.name}</span>
              </button>
            ))}
          </div>
        )}

        {/* Export buttons */}
        {data && (
          <div className="flex items-center justify-end gap-2">
            <button type="button" onClick={() => exportCSV(`news-${selectedCountry}`, ["Titlu", "Sursa", "Data", "URL"],
              (data.headlines || []).map(a => [a.title, a.source, a.publishedAt, a.url])
            )} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold"
              style={{ backgroundColor: "rgba(245,215,160,0.15)", color: "#78614E", border: "1px solid rgba(245,215,160,0.35)" }}>
              <Download className="w-3 h-3" />CSV {data.country.name}
            </button>
            <button type="button" onClick={() => exportCSV("news-creator", ["Titlu", "Sursa", "Data", "URL"],
              (data.social || []).map(a => [a.title, a.source, a.publishedAt, a.url])
            )} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold"
              style={{ backgroundColor: "rgba(245,215,160,0.15)", color: "#78614E", border: "1px solid rgba(245,215,160,0.35)" }}>
              <Download className="w-3 h-3" />CSV Creator Economy
            </button>
            <button type="button" onClick={() => exportJSON("news-all", { exportedAt: new Date().toISOString(), ...data })}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold"
              style={{ backgroundColor: "rgba(245,215,160,0.15)", color: "#78614E", border: "1px solid rgba(245,215,160,0.35)" }}>
              <Download className="w-3 h-3" />JSON Complet
            </button>
          </div>
        )}

        {loading && (
          <div className="flex items-center justify-center h-40">
            <p style={{ color: "#C4AA8A" }}>Se încarcă știrile...</p>
          </div>
        )}

        {error && (
          <div className="rounded-xl p-5" style={cardStyle}>
            <p className="text-sm" style={{ color: "#dc2626" }}>Eroare: {error}</p>
          </div>
        )}

        {data && !loading && (
          <>
            {/* Country Headlines */}
            {data.headlines?.length > 0 && (
              <div className="rounded-xl overflow-hidden" style={cardStyle}>
                <div className="flex items-center gap-2 px-5 py-4" style={{ borderBottom: "1px solid rgba(245,215,160,0.2)" }}>
                  <span className="text-base">{data.country.flag}</span>
                  <h3 className="font-semibold" style={{ color: "#292524" }}>Top Headlines — {data.country.name}</h3>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-0 divide-y md:divide-y-0 md:divide-x" style={{ borderColor: "rgba(245,215,160,0.15)" }}>
                  {data.headlines.map((a, i) => (
                    <a key={i} href={a.url} target="_blank" rel="noopener noreferrer"
                      className="flex flex-col p-5 transition-colors group"
                      onMouseEnter={e => (e.currentTarget.style.backgroundColor = "rgba(245,215,160,0.07)")}
                      onMouseLeave={e => (e.currentTarget.style.backgroundColor = "transparent")}>
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-xs font-semibold px-2 py-0.5 rounded-full" style={{ backgroundColor: "rgba(245,158,11,0.12)", color: "#D97706" }}>
                          {a.source}
                        </span>
                        <span className="flex items-center gap-1 text-xs" style={{ color: "#C4AA8A" }}>
                          <Clock className="w-3 h-3" />{timeAgo(a.publishedAt)}
                        </span>
                      </div>
                      <p className="text-sm font-semibold leading-snug group-hover:underline line-clamp-3" style={{ color: "#292524" }}>{a.title}</p>
                      {a.description && (
                        <p className="text-xs mt-2 line-clamp-2" style={{ color: "#A8967E" }}>{a.description}</p>
                      )}
                    </a>
                  ))}
                </div>
              </div>
            )}

            {/* Creator Economy / Social Media News */}
            {data.social?.length > 0 && (
              <div className="rounded-xl overflow-hidden" style={cardStyle}>
                <div className="flex items-center gap-2 px-5 py-4" style={{ borderBottom: "1px solid rgba(245,215,160,0.2)" }}>
                  <Globe className="w-4 h-4" style={{ color: "#F59E0B" }} />
                  <h3 className="font-semibold" style={{ color: "#292524" }}>Creator Economy & Social Media — Global</h3>
                </div>
                <div className="divide-y" style={{ borderColor: "rgba(245,215,160,0.1)" }}>
                  {data.social.map((a, i) => (
                    <a key={i} href={a.url} target="_blank" rel="noopener noreferrer"
                      className="flex items-start gap-4 px-5 py-4 transition-colors group"
                      onMouseEnter={e => (e.currentTarget.style.backgroundColor = "rgba(245,215,160,0.07)")}
                      onMouseLeave={e => (e.currentTarget.style.backgroundColor = "transparent")}>
                      <div className="w-20 h-14 rounded-lg flex-shrink-0 flex items-center justify-center" style={{ backgroundColor: "rgba(245,215,160,0.1)" }}>
                        <Newspaper className="w-5 h-5" style={{ color: "#C4AA8A" }} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-xs font-semibold px-2 py-0.5 rounded-full" style={{ backgroundColor: "rgba(245,158,11,0.12)", color: "#D97706" }}>
                            {a.source}
                          </span>
                          <span className="flex items-center gap-1 text-xs" style={{ color: "#C4AA8A" }}>
                            <Clock className="w-3 h-3" />{timeAgo(a.publishedAt)}
                          </span>
                        </div>
                        <p className="text-sm font-semibold leading-snug group-hover:underline line-clamp-2" style={{ color: "#292524" }}>{a.title}</p>
                        {a.description && (
                          <p className="text-xs mt-1 line-clamp-1" style={{ color: "#A8967E" }}>{a.description}</p>
                        )}
                      </div>
                      <ExternalLink className="w-4 h-4 flex-shrink-0 mt-1 opacity-0 group-hover:opacity-100 transition-opacity" style={{ color: "#C4AA8A" }} />
                    </a>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
