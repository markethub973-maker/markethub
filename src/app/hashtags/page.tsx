"use client";

import { useState } from "react";
import Header from "@/components/layout/Header";
import { formatNumber } from "@/lib/utils";
import { Hash, Heart, MessageCircle, ExternalLink, AlertCircle, Search, TrendingUp, Image, Video, Layers } from "lucide-react";

const cardStyle = { backgroundColor: "#FFFCF7", border: "1px solid rgba(245,215,160,0.25)", boxShadow: "0 1px 3px rgba(120,97,78,0.08)" };
const IG = "#E1306C";

const EXAMPLES = ["fotografie", "fashion", "travel", "food", "fitness", "romania", "bucuresti", "startup"];

function mediaIcon(type: string) {
  if (type === "VIDEO") return <Video className="w-3 h-3" />;
  if (type === "CAROUSEL_ALBUM") return <Layers className="w-3 h-3" />;
  return <Image className="w-3 h-3" />;
}

function PostCard({ post, rank }: { post: any; rank?: number }) {
  return (
    <a href={post.permalink} target="_blank" rel="noopener noreferrer"
      className="rounded-xl overflow-hidden group transition-all hover:shadow-md" style={cardStyle}>
      <div className="relative bg-gray-100" style={{ height: 140 }}>
        {post.thumbnail ? (
          <img src={post.thumbnail} alt="" className="w-full h-full object-cover"
            onError={e => { (e.target as HTMLImageElement).style.display = "none"; }} />
        ) : (
          <div className="w-full h-full flex items-center justify-center" style={{ backgroundColor: "rgba(225,48,108,0.05)" }}>
            <Hash className="w-8 h-8" style={{ color: "rgba(225,48,108,0.3)" }} />
          </div>
        )}
        <div className="absolute top-2 left-2 flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold"
          style={{ backgroundColor: "rgba(0,0,0,0.6)", color: "white" }}>
          {mediaIcon(post.mediaType)} {rank !== undefined ? `#${rank + 1}` : ""}
        </div>
      </div>
      <div className="p-3">
        {post.caption && <p className="text-xs line-clamp-2 mb-2" style={{ color: "#78614E" }}>{post.caption}</p>}
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1 text-xs font-semibold" style={{ color: IG }}>
            <Heart className="w-3 h-3" />{formatNumber(post.likes)}
          </span>
          <span className="flex items-center gap-1 text-xs" style={{ color: "#A8967E" }}>
            <MessageCircle className="w-3 h-3" />{formatNumber(post.comments)}
          </span>
          <ExternalLink className="w-3 h-3 ml-auto opacity-30 group-hover:opacity-70 transition-opacity" style={{ color: "#78614E" }} />
        </div>
      </div>
    </a>
  );
}

export default function HashtagsPage() {
  const [query, setQuery] = useState("");
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [tab, setTab] = useState<"top" | "recent">("top");
  const [history, setHistory] = useState<string[]>([]);

  const search = (q?: string) => {
    const term = (q || query).trim().replace(/#/g, "");
    if (!term) return;
    setLoading(true);
    setError("");
    setData(null);
    fetch(`/api/instagram/hashtags?q=${encodeURIComponent(term)}`)
      .then(r => r.json())
      .then(d => {
        if (d.error) { setError(d.error); return; }
        setData(d);
        setHistory(prev => [term, ...prev.filter(x => x !== term)].slice(0, 6));
      })
      .catch(() => setError("Eroare de rețea"))
      .finally(() => setLoading(false));
  };

  const posts = tab === "top" ? data?.topPosts : data?.recentPosts;

  return (
    <div>
      <Header title="Hashtag Tracker" subtitle="Explorează orice hashtag Instagram — top postări și tendințe" />
      <div className="p-6 space-y-5">

        {/* Search */}
        <div className="rounded-xl p-4 space-y-3" style={cardStyle}>
          <div className="flex gap-3">
            <div className="relative flex-1">
              <Hash className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: IG }} />
              <input type="text" placeholder="#hashtag (ex: fotografie, travel, food...)"
                value={query} onChange={e => setQuery(e.target.value)}
                onKeyDown={e => e.key === "Enter" && search()}
                className="w-full pl-9 pr-4 py-3 text-sm rounded-xl focus:outline-none"
                style={{ border: "1px solid rgba(225,48,108,0.3)", backgroundColor: "#FFFCF7", color: "#292524" }} />
            </div>
            <button type="button" onClick={() => search()} disabled={loading || !query.trim()}
              className="px-6 py-3 rounded-xl text-sm font-bold"
              style={{ backgroundColor: IG, color: "white", opacity: loading ? 0.7 : 1 }}>
              {loading ? "..." : "Caută"}
            </button>
          </div>

          {/* Examples / history */}
          <div className="flex flex-wrap gap-2 items-center">
            <span className="text-xs" style={{ color: "#C4AA8A" }}>{history.length > 0 ? "Recente:" : "Exemple:"}</span>
            {(history.length > 0 ? history : EXAMPLES).map(ex => (
              <button key={ex} type="button" onClick={() => { setQuery(ex); search(ex); }}
                className="px-2.5 py-1 rounded-full text-xs font-semibold"
                style={{ backgroundColor: "rgba(225,48,108,0.08)", color: IG, border: "1px solid rgba(225,48,108,0.2)" }}>
                #{ex}
              </button>
            ))}
          </div>
        </div>

        {/* Error */}
        {error && (
          <div className="rounded-xl p-5 flex items-start gap-3" style={cardStyle}>
            <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" style={{ color: "#EF4444" }} />
            <div>
              <p className="text-sm font-semibold" style={{ color: "#EF4444" }}>Hashtag negăsit</p>
              <p className="text-sm mt-1" style={{ color: "#A8967E" }}>{error}</p>
            </div>
          </div>
        )}

        {/* Results */}
        {data && (
          <div className="space-y-5">
            {/* Stats */}
            <div className="rounded-xl p-5" style={cardStyle}>
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ backgroundColor: "rgba(225,48,108,0.1)" }}>
                  <Hash className="w-5 h-5" style={{ color: IG }} />
                </div>
                <div>
                  <p className="font-bold text-lg" style={{ color: "#292524" }}>#{data.hashtag}</p>
                  <p className="text-xs" style={{ color: "#A8967E" }}>Hashtag Instagram</p>
                </div>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {[
                  { label: "Top Postări", value: data.topPosts?.length || 0, color: IG },
                  { label: "Postări Recente", value: data.recentPosts?.length || 0, color: "#F59E0B" },
                  { label: "Likes mediu (top)", value: formatNumber(data.avgLikes), color: "#1DB954" },
                  { label: "Comentarii mediu (top)", value: formatNumber(data.avgComments), color: "#6366F1" },
                ].map(s => (
                  <div key={s.label} className="rounded-lg p-3 text-center" style={{ backgroundColor: s.color + "08", border: `1px solid ${s.color}18` }}>
                    <p className="text-xs mb-1" style={{ color: "#A8967E" }}>{s.label}</p>
                    <p className="text-xl font-bold" style={{ color: s.color }}>{s.value}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Tab selector */}
            <div className="flex gap-2">
              {[
                { key: "top", label: "Top Postări", icon: <TrendingUp className="w-3.5 h-3.5" /> },
                { key: "recent", label: "Postări Recente", icon: <Search className="w-3.5 h-3.5" /> },
              ].map(t => (
                <button key={t.key} type="button" onClick={() => setTab(t.key as "top" | "recent")}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold transition-all"
                  style={tab === t.key
                    ? { backgroundColor: "rgba(225,48,108,0.12)", color: IG, border: "1px solid rgba(225,48,108,0.25)" }
                    : { backgroundColor: "transparent", color: "#A8967E", border: "1px solid rgba(245,215,160,0.2)" }}>
                  {t.icon}{t.label}
                </button>
              ))}
            </div>

            {/* Posts grid */}
            {posts?.length > 0 ? (
              <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4">
                {posts.map((p: any, i: number) => <PostCard key={p.id} post={p} rank={i} />)}
              </div>
            ) : (
              <div className="rounded-xl p-8 text-center" style={cardStyle}>
                <p className="text-sm" style={{ color: "#A8967E" }}>Nu există postări disponibile pentru acest hashtag.</p>
              </div>
            )}
          </div>
        )}

        {/* Empty state */}
        {!data && !loading && !error && (
          <div className="rounded-xl p-12 text-center" style={cardStyle}>
            <Hash className="w-12 h-12 mx-auto mb-4" style={{ color: "rgba(225,48,108,0.3)" }} />
            <p className="font-semibold text-lg mb-2" style={{ color: "#292524" }}>Explorează un hashtag</p>
            <p className="text-sm" style={{ color: "#A8967E" }}>
              Caută orice hashtag și vezi top postări, postări recente și engagement mediu.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
