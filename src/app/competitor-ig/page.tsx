"use client";

import { useState } from "react";
import Header from "@/components/layout/Header";
import { formatNumber } from "@/lib/utils";
import { Search, Users, Heart, MessageCircle, ExternalLink, AlertCircle, Instagram, Image, Video, Layers, TrendingUp } from "lucide-react";

const cardStyle = { backgroundColor: "var(--color-bg-secondary)", border: "1px solid rgba(245,215,160,0.25)", boxShadow: "0 1px 3px rgba(120,97,78,0.08)" };
const IG = "#E1306C";

const EXAMPLES = ["nike", "redbull", "zara", "loreal", "cocacola", "nationalgeographic"];

function EngBadge({ rate }: { rate: number }) {
  const color = rate >= 5 ? "#1DB954" : rate >= 2 ? "var(--color-primary)" : rate >= 0.5 ? "var(--color-primary)" : "#EF4444";
  const label = rate >= 5 ? "Excellent" : rate >= 2 ? "Good" : rate >= 0.5 ? "Fair" : "Poor";
  return (
    <span className="text-xs font-bold px-2 py-0.5 rounded-full" style={{ backgroundColor: color + "18", color }}>
      {rate.toFixed(2)}% — {label}
    </span>
  );
}

function mediaIcon(type: string) {
  if (type === "VIDEO") return <Video className="w-3 h-3" />;
  if (type === "CAROUSEL_ALBUM") return <Layers className="w-3 h-3" />;
  return <Image className="w-3 h-3" />;
}

export default function CompetitorIGPage() {
  const [query, setQuery] = useState("");
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [history, setHistory] = useState<string[]>([]);

  const search = (username?: string) => {
    const q = (username || query).trim().replace("@", "");
    if (!q) return;
    setLoading(true);
    setError("");
    setData(null);
    fetch(`/api/instagram/competitor?username=${encodeURIComponent(q)}`)
      .then(r => r.json())
      .then(d => {
        if (d.error) { setError(d.error); return; }
        setData(d);
        setHistory(prev => [q, ...prev.filter(x => x !== q)].slice(0, 6));
      })
      .catch(() => setError("Network error"))
      .finally(() => setLoading(false));
  };

  const myFollowers = data?.followers || 1;

  return (
    <div>
      <Header title="Competitor Instagram" subtitle="Analyze any Instagram Business account - real data" />
      <div className="p-6 space-y-5">

        {/* Search */}
        <div className="rounded-xl p-4 space-y-3" style={cardStyle}>
          <div className="flex gap-3">
            <div className="relative flex-1">
              <Instagram className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: IG }} />
              <input type="text" placeholder="@username (ex: nike, zara, loreal...)"
                value={query} onChange={e => setQuery(e.target.value)}
                onKeyDown={e => e.key === "Enter" && search()}
                className="w-full pl-9 pr-4 py-3 text-sm rounded-xl focus:outline-none"
                style={{ border: "1px solid rgba(225,48,108,0.3)", backgroundColor: "var(--color-bg-secondary)", color: "var(--color-text)" }} />
            </div>
            <button type="button" onClick={() => search()} disabled={loading || !query.trim()}
              className="px-6 py-3 rounded-xl text-sm font-bold"
              style={{ backgroundColor: IG, color: "white", opacity: loading ? 0.7 : 1 }}>
              {loading ? "..." : "Analyze"}
            </button>
          </div>

          {/* Examples + History */}
          <div className="flex flex-wrap gap-2 items-center">
            <span className="text-xs" style={{ color: "#C4AA8A" }}>Examples:</span>
            {(history.length > 0 ? history : EXAMPLES).map(ex => (
              <button key={ex} type="button" onClick={() => { setQuery(ex); search(ex); }}
                className="px-2.5 py-1 rounded-full text-xs font-semibold"
                style={{ backgroundColor: "rgba(225,48,108,0.08)", color: IG, border: "1px solid rgba(225,48,108,0.2)" }}>
                @{ex}
              </button>
            ))}
          </div>
          <p className="text-xs" style={{ color: "#C4AA8A" }}>
            Works only with <strong>Instagram Business or Creator</strong> accounts (not personal accounts).
          </p>
        </div>

        {/* Error */}
        {error && (
          <div className="rounded-xl p-5 flex items-start gap-3" style={cardStyle}>
            <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" style={{ color: "#EF4444" }} />
            <div>
              <p className="text-sm font-semibold" style={{ color: "#EF4444" }}>Account not found</p>
              <p className="text-sm mt-1" style={{ color: "#A8967E" }}>{error}</p>
            </div>
          </div>
        )}

        {/* Results */}
        {data && (
          <div className="space-y-5">
            {/* Profile Header */}
            <div className="rounded-xl p-5" style={cardStyle}>
              <div className="flex items-start gap-4">
                {data.profilePicture && (
                  <img src={data.profilePicture} alt="" className="w-16 h-16 rounded-full object-cover flex-shrink-0"
                    style={{ border: `3px solid ${IG}` }} />
                )}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3 flex-wrap">
                    <a href={`https://instagram.com/${data.username}`} target="_blank" rel="noopener noreferrer"
                      className="flex items-center gap-1.5 font-bold text-lg hover:underline" style={{ color: "var(--color-text)" }}>
                      <Instagram className="w-4 h-4" style={{ color: IG }} />
                      @{data.username}
                      <ExternalLink className="w-3.5 h-3.5 opacity-50" />
                    </a>
                    {data.name && <span className="text-sm" style={{ color: "#78614E" }}>{data.name}</span>}
                  </div>
                  {data.biography && <p className="text-sm mt-1 line-clamp-2" style={{ color: "#78614E" }}>{data.biography}</p>}
                  <div className="flex items-center gap-1 mt-2">
                    <EngBadge rate={data.avgEngRate} />
                    <span className="text-xs ml-2" style={{ color: "#A8967E" }}>average engagement rate</span>
                  </div>
                </div>
              </div>

              {/* Stats row */}
              <div className="grid grid-cols-3 gap-3 mt-4">
                {[
                  { label: "Followers", value: formatNumber(data.followers), color: IG },
                  { label: "Posts", value: data.mediaCount, color: "var(--color-primary)" },
                  { label: "Eng. Rate", value: data.avgEngRate.toFixed(2) + "%", color: data.avgEngRate >= 3 ? "#1DB954" : "var(--color-primary)" },
                ].map(s => (
                  <div key={s.label} className="rounded-lg p-3 text-center" style={{ backgroundColor: s.color + "08", border: `1px solid ${s.color}18` }}>
                    <p className="text-xs mb-1" style={{ color: "#A8967E" }}>{s.label}</p>
                    <p className="text-xl font-bold" style={{ color: s.color }}>{s.value}</p>
                  </div>
                ))}
              </div>

              {/* Content mix */}
              {data.contentMix?.length > 0 && (
                <div className="flex items-center gap-3 mt-3 flex-wrap">
                  <span className="text-xs" style={{ color: "#C4AA8A" }}>Content mix:</span>
                  {data.contentMix.map((c: any) => (
                    <span key={c.type} className="flex items-center gap-1 text-xs px-2 py-1 rounded-full"
                      style={{ backgroundColor: "rgba(245,215,160,0.15)", color: "#78614E" }}>
                      {c.type === "Video" ? <Video className="w-3 h-3" /> : c.type === "Carousel" ? <Layers className="w-3 h-3" /> : <Image className="w-3 h-3" />}
                      {c.type}: {c.count}
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* Top Posts */}
            <div>
              <h3 className="text-sm font-semibold mb-3" style={{ color: "var(--color-text)" }}>Top posts by engagement</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {data.topPosts?.map((p: any, i: number) => (
                  <a key={p.id} href={p.permalink} target="_blank" rel="noopener noreferrer"
                    className="rounded-xl overflow-hidden group transition-all hover:shadow-md" style={cardStyle}>
                    <div className="relative bg-gray-100" style={{ height: 160 }}>
                      {p.thumbnail ? (
                        <img src={p.thumbnail} alt="" className="w-full h-full object-cover"
                          onError={e => { (e.target as HTMLImageElement).style.display = "none"; }} />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center" style={{ backgroundColor: "rgba(225,48,108,0.05)" }}>
                          <Instagram className="w-8 h-8" style={{ color: "rgba(225,48,108,0.3)" }} />
                        </div>
                      )}
                      <div className="absolute top-2 left-2 flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold"
                        style={{ backgroundColor: "rgba(0,0,0,0.6)", color: "white" }}>
                        {mediaIcon(p.mediaType)} #{i + 1}
                      </div>
                    </div>
                    <div className="p-3">
                      {p.caption && <p className="text-xs line-clamp-2 mb-2" style={{ color: "#78614E" }}>{p.caption}</p>}
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <span className="flex items-center gap-1 text-xs font-semibold" style={{ color: IG }}>
                            <Heart className="w-3 h-3" />{formatNumber(p.likes)}
                          </span>
                          <span className="flex items-center gap-1 text-xs" style={{ color: "#A8967E" }}>
                            <MessageCircle className="w-3 h-3" />{formatNumber(p.comments)}
                          </span>
                        </div>
                        <EngBadge rate={p.engRate} />
                      </div>
                    </div>
                  </a>
                ))}
              </div>
            </div>

            {/* Comparison insight */}
            <div className="rounded-xl p-5" style={cardStyle}>
              <div className="flex items-center gap-2 mb-4">
                <TrendingUp className="w-4 h-4" style={{ color: IG }} />
                <h3 className="font-semibold" style={{ color: "var(--color-text)" }}>Competitive Insight</h3>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="rounded-lg p-3" style={{ backgroundColor: "rgba(225,48,108,0.05)", border: "1px solid rgba(225,48,108,0.15)" }}>
                  <p className="text-xs font-bold mb-2" style={{ color: IG }}>Engagement Rate</p>
                  <p className="text-xs leading-relaxed" style={{ color: "#78614E" }}>
                    {data.avgEngRate >= 3
                      ? `@${data.username} has an ER of ${data.avgEngRate.toFixed(2)}% — active account with engaged audience. They're a strong competitor in this niche.`
                      : `@${data.username} has an ER of ${data.avgEngRate.toFixed(2)}% — below the 3% average. You can compete directly with more interactive content.`}
                  </p>
                </div>
                <div className="rounded-lg p-3" style={{ backgroundColor: "rgba(245,215,160,0.1)", border: "1px solid rgba(245,215,160,0.25)" }}>
                  <p className="text-xs font-bold mb-2" style={{ color: "var(--color-primary)" }}>Content Volume</p>
                  <p className="text-xs leading-relaxed" style={{ color: "#78614E" }}>
                    {data.mediaCount > 500
                      ? `With ${data.mediaCount} posts, @${data.username} has an established presence. Posting frequency matters — analyze their active days.`
                      : `@${data.username} has ${data.mediaCount} posts. If you post more consistently, you can gain visibility in the same niche.`}
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Empty state */}
        {!data && !loading && !error && (
          <div className="rounded-xl p-12 text-center" style={cardStyle}>
            <Users className="w-12 h-12 mx-auto mb-4" style={{ color: "rgba(225,48,108,0.3)" }} />
            <p className="font-semibold text-lg mb-2" style={{ color: "var(--color-text)" }}>Analyze a competitor</p>
            <p className="text-sm" style={{ color: "#A8967E" }}>
              Enter the username of any Instagram Business account and see followers, engagement rate, top posts, and competitive insights.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
