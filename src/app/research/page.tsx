"use client";

import { useState } from "react";
import Header from "@/components/layout/Header";
import {
  Search, Instagram, Facebook, Globe, Loader2,
  ExternalLink, ThumbsUp, MessageCircle, Share2,
  Eye, Play, Hash, User, TrendingUp, AlertCircle,
} from "lucide-react";

const card = { backgroundColor: "#FFFCF7", border: "1px solid rgba(245,215,160,0.25)", boxShadow: "0 1px 3px rgba(120,97,78,0.08)" };
const AMBER = "#F59E0B";
const IG = "#E1306C";
const FB = "#1877F2";
const TT = "#010101";

type Tab = "google" | "instagram" | "tiktok" | "facebook";

function fmtNum(n: number) {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + "M";
  if (n >= 1_000) return (n / 1_000).toFixed(1) + "K";
  return String(Math.round(n));
}

function timeAgo(ts: string | number) {
  if (!ts) return "";
  const d = typeof ts === "number" ? new Date(ts * 1000) : new Date(ts);
  const diff = (Date.now() - d.getTime()) / 1000;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

export default function ResearchPage() {
  const [tab, setTab] = useState<Tab>("google");
  const [query, setQuery] = useState("");
  const [mode, setMode] = useState<"username" | "hashtag">("username");
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<any>(null);
  const [error, setError] = useState("");

  const placeholder: Record<Tab, string> = {
    google: "Search query (ex: pantofi sport ieftini)",
    instagram: mode === "username" ? "@username (ex: nikeromania)" : "#hashtag (ex: fitness)",
    tiktok: mode === "username" ? "@username (ex: lidlromania)" : "#hashtag (ex: bucatarie)",
    facebook: "Page name or URL (ex: nikeromaniaofficialpage)",
  };

  const tabColor: Record<Tab, string> = {
    google: AMBER,
    instagram: IG,
    tiktok: TT,
    facebook: FB,
  };

  const handleSearch = async () => {
    if (!query.trim()) return;
    setLoading(true);
    setError("");
    setResults(null);

    try {
      let endpoint = `/api/research/${tab}`;
      let body: Record<string, unknown> = {};

      if (tab === "google") {
        body = { query: query.trim(), country: "ro", language: "ro" };
      } else if (tab === "instagram") {
        body = mode === "username"
          ? { username: query.trim(), limit: 12 }
          : { hashtag: query.trim(), limit: 20 };
      } else if (tab === "tiktok") {
        body = mode === "username"
          ? { username: query.trim(), limit: 15 }
          : { hashtag: query.trim(), limit: 20 };
      } else if (tab === "facebook") {
        body = { page: query.trim(), limit: 10 };
      }

      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Search failed");
      } else {
        setResults(data);
      }
    } catch {
      setError("Network error");
    }
    setLoading(false);
  };

  const tabs: { id: Tab; label: string; icon: React.ElementType; color: string }[] = [
    { id: "google", label: "Google", icon: Globe, color: AMBER },
    { id: "instagram", label: "Instagram", icon: Instagram, color: IG },
    { id: "tiktok", label: "TikTok", icon: Play, color: TT },
    { id: "facebook", label: "Facebook", icon: Facebook, color: FB },
  ];

  return (
    <div>
      <Header title="Market Research" subtitle="Search Google, Instagram, TikTok & Facebook via Apify" />
      <div className="p-6 space-y-5">

        {/* Tab selector */}
        <div className="rounded-2xl p-5 space-y-4" style={card}>
          <div className="flex gap-2 flex-wrap">
            {tabs.map(({ id, label, icon: Icon, color }) => (
              <button
                key={id}
                type="button"
                onClick={() => { setTab(id); setResults(null); setError(""); setQuery(""); }}
                className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all"
                style={tab === id
                  ? { backgroundColor: color, color: id === "tiktok" ? "#FFF8F0" : "white", boxShadow: `0 2px 8px ${color}40` }
                  : { backgroundColor: "rgba(245,215,160,0.1)", color: "#78614E", border: "1px solid rgba(245,215,160,0.2)" }}
              >
                <Icon className="w-4 h-4" />
                {label}
              </button>
            ))}
          </div>

          {/* Mode toggle — IG & TikTok */}
          {(tab === "instagram" || tab === "tiktok") && (
            <div className="flex gap-2">
              {(["username", "hashtag"] as const).map(m => (
                <button
                  key={m}
                  type="button"
                  onClick={() => setMode(m)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all"
                  style={mode === m
                    ? { backgroundColor: tabColor[tab] + "20", color: tabColor[tab], border: `1px solid ${tabColor[tab]}40` }
                    : { color: "#A8967E", border: "1px solid rgba(245,215,160,0.2)" }}
                >
                  {m === "username" ? <User className="w-3 h-3" /> : <Hash className="w-3 h-3" />}
                  {m === "username" ? "Profile" : "Hashtag"}
                </button>
              ))}
            </div>
          )}

          {/* Search bar */}
          <div className="flex gap-2">
            <div className="flex-1 flex items-center gap-2 px-3 py-2.5 rounded-xl"
              style={{ border: `1px solid ${tabColor[tab]}40`, backgroundColor: "#FFFDF9" }}>
              <Search className="w-4 h-4 flex-shrink-0" style={{ color: tabColor[tab] }} />
              <input
                type="text"
                value={query}
                onChange={e => setQuery(e.target.value)}
                onKeyDown={e => e.key === "Enter" && handleSearch()}
                placeholder={placeholder[tab]}
                className="flex-1 text-sm bg-transparent focus:outline-none"
                style={{ color: "#292524" }}
              />
            </div>
            <button
              type="button"
              onClick={handleSearch}
              disabled={loading || !query.trim()}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold disabled:opacity-50 transition-all"
              style={{ backgroundColor: tabColor[tab], color: tab === "tiktok" ? "#FFF8F0" : "white" }}
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
              {loading ? "Searching…" : "Search"}
            </button>
          </div>

          {tab === "google" && (
            <p className="text-xs" style={{ color: "#C4AA8A" }}>
              Returns organic results, ads, People Also Ask, and related queries from Google Romania.
            </p>
          )}
          {(tab === "instagram" || tab === "tiktok") && (
            <p className="text-xs" style={{ color: "#C4AA8A" }}>
              Powered by Apify — scrapes public data. Takes 15–30 seconds.
            </p>
          )}
        </div>

        {/* Error */}
        {error && (
          <div className="flex items-center gap-2 px-4 py-3 rounded-xl text-sm font-semibold"
            style={{ backgroundColor: "rgba(239,68,68,0.08)", color: "#DC2626", border: "1px solid rgba(239,68,68,0.15)" }}>
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            {error}
          </div>
        )}

        {/* Loading state */}
        {loading && (
          <div className="rounded-2xl p-12 flex flex-col items-center justify-center gap-3" style={card}>
            <Loader2 className="w-8 h-8 animate-spin" style={{ color: tabColor[tab] }} />
            <p className="text-sm font-semibold" style={{ color: "#78614E" }}>
              Apify is running… this takes 15–60 seconds
            </p>
            <p className="text-xs" style={{ color: "#C4AA8A" }}>
              {tab === "google" ? "Fetching Google search results" : "Scraping public social media data"}
            </p>
          </div>
        )}

        {/* ─── GOOGLE RESULTS ─── */}
        {!loading && results && tab === "google" && (
          <div className="space-y-4">
            <p className="text-xs font-semibold" style={{ color: "#A8967E" }}>
              {results.total} results for "{results.query}"
            </p>

            {/* Ads */}
            {results.results.filter((r: any) => r.type === "ad").length > 0 && (
              <div className="space-y-2">
                <p className="text-xs font-bold uppercase tracking-wide" style={{ color: AMBER }}>Sponsored</p>
                {results.results.filter((r: any) => r.type === "ad").map((r: any, i: number) => (
                  <div key={i} className="rounded-xl p-4" style={{ ...card, borderColor: `${AMBER}30` }}>
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <a href={r.url} target="_blank" rel="noopener noreferrer"
                          className="text-sm font-bold hover:underline" style={{ color: AMBER }}>
                          {r.title}
                        </a>
                        <p className="text-xs mt-0.5" style={{ color: "#78614E" }}>{r.displayedUrl}</p>
                        {r.description && <p className="text-xs mt-1 leading-relaxed" style={{ color: "#A8967E" }}>{r.description}</p>}
                      </div>
                      <a href={r.url} target="_blank" rel="noopener noreferrer">
                        <ExternalLink className="w-3.5 h-3.5 flex-shrink-0" style={{ color: "#C4AA8A" }} />
                      </a>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Organic */}
            {results.results.filter((r: any) => r.type === "organic").length > 0 && (
              <div className="space-y-2">
                <p className="text-xs font-bold uppercase tracking-wide" style={{ color: "#78614E" }}>Organic Results</p>
                {results.results.filter((r: any) => r.type === "organic").map((r: any, i: number) => (
                  <div key={i} className="rounded-xl p-4" style={card}>
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-xs font-bold px-1.5 py-0.5 rounded"
                            style={{ backgroundColor: "rgba(245,158,11,0.1)", color: AMBER }}>#{r.position}</span>
                          <span className="text-xs truncate" style={{ color: "#C4AA8A" }}>{r.displayedUrl}</span>
                        </div>
                        <a href={r.url} target="_blank" rel="noopener noreferrer"
                          className="text-sm font-semibold hover:underline line-clamp-1" style={{ color: "#292524" }}>
                          {r.title}
                        </a>
                        {r.description && (
                          <p className="text-xs mt-1 line-clamp-2 leading-relaxed" style={{ color: "#78614E" }}>
                            {r.description}
                          </p>
                        )}
                      </div>
                      <a href={r.url} target="_blank" rel="noopener noreferrer" className="flex-shrink-0">
                        <ExternalLink className="w-3.5 h-3.5" style={{ color: "#C4AA8A" }} />
                      </a>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* People Also Ask */}
            {results.results.filter((r: any) => r.type === "paa").length > 0 && (
              <div className="space-y-2">
                <p className="text-xs font-bold uppercase tracking-wide" style={{ color: "#78614E" }}>People Also Ask</p>
                <div className="rounded-xl overflow-hidden" style={card}>
                  {results.results.filter((r: any) => r.type === "paa").map((r: any, i: number) => (
                    <div key={i} className="px-4 py-3" style={{ borderBottom: "1px solid rgba(245,215,160,0.15)" }}>
                      <p className="text-sm font-semibold" style={{ color: "#292524" }}>{r.question}</p>
                      {r.answer && <p className="text-xs mt-1 line-clamp-2 leading-relaxed" style={{ color: "#78614E" }}>{r.answer}</p>}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Related */}
            {results.results.filter((r: any) => r.type === "related").length > 0 && (
              <div>
                <p className="text-xs font-bold uppercase tracking-wide mb-2" style={{ color: "#78614E" }}>Related Searches</p>
                <div className="flex flex-wrap gap-2">
                  {results.results.filter((r: any) => r.type === "related").map((r: any, i: number) => (
                    <button key={i} type="button"
                      onClick={() => { setQuery(r.query); }}
                      className="px-3 py-1.5 rounded-full text-xs font-medium transition-all hover:opacity-80"
                      style={{ backgroundColor: "rgba(245,215,160,0.15)", color: "#78614E", border: "1px solid rgba(245,215,160,0.3)" }}>
                      <TrendingUp className="w-3 h-3 inline mr-1" />
                      {r.query}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ─── INSTAGRAM RESULTS ─── */}
        {!loading && results && tab === "instagram" && (
          <div className="space-y-4">
            {results.profile && (
              <div className="rounded-xl p-4 flex items-center gap-4" style={{ ...card, borderColor: `${IG}30` }}>
                {results.profile.profilePic && (
                  <img src={results.profile.profilePic} alt="" className="w-14 h-14 rounded-full object-cover flex-shrink-0"
                    style={{ border: `2px solid ${IG}` }} />
                )}
                <div>
                  <p className="font-bold" style={{ color: "#292524" }}>@{results.profile.username}</p>
                  {results.profile.fullName && <p className="text-sm" style={{ color: "#78614E" }}>{results.profile.fullName}</p>}
                  {results.profile.followers > 0 && (
                    <p className="text-xs mt-1 font-semibold" style={{ color: IG }}>
                      {fmtNum(results.profile.followers)} followers
                    </p>
                  )}
                </div>
              </div>
            )}

            <p className="text-xs font-semibold" style={{ color: "#A8967E" }}>
              {results.total} {results.type === "hashtag" ? `posts for #${results.hashtag}` : "recent posts"}
            </p>

            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {results.posts.map((p: any, i: number) => (
                <a key={i} href={p.url || `https://www.instagram.com/p/${p.shortCode}/`}
                  target="_blank" rel="noopener noreferrer"
                  className="rounded-xl overflow-hidden group" style={card}>
                  <div className="relative aspect-square bg-gray-100">
                    {p.thumbnail
                      ? <img src={p.thumbnail} alt="" className="w-full h-full object-cover" />
                      : <div className="w-full h-full flex items-center justify-center">
                          <Instagram className="w-8 h-8" style={{ color: "#C4AA8A" }} />
                        </div>
                    }
                    <div className="absolute inset-0 flex items-end opacity-0 group-hover:opacity-100 transition-opacity"
                      style={{ background: "linear-gradient(transparent, rgba(0,0,0,0.7))" }}>
                      <div className="p-2 flex gap-3 w-full">
                        <span className="flex items-center gap-1 text-white text-xs font-bold">
                          <ThumbsUp className="w-3 h-3" />{fmtNum(p.likes)}
                        </span>
                        <span className="flex items-center gap-1 text-white text-xs font-bold">
                          <MessageCircle className="w-3 h-3" />{fmtNum(p.comments)}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="p-2.5">
                    {p.ownerUsername && <p className="text-xs font-semibold" style={{ color: IG }}>@{p.ownerUsername}</p>}
                    {p.caption && <p className="text-xs mt-1 line-clamp-2" style={{ color: "#78614E" }}>{p.caption}</p>}
                    <div className="flex items-center justify-between mt-2">
                      <div className="flex gap-2">
                        <span className="flex items-center gap-0.5 text-xs" style={{ color: "#A8967E" }}>
                          <ThumbsUp className="w-3 h-3" />{fmtNum(p.likes)}
                        </span>
                        <span className="flex items-center gap-0.5 text-xs" style={{ color: "#A8967E" }}>
                          <MessageCircle className="w-3 h-3" />{fmtNum(p.comments)}
                        </span>
                      </div>
                      {p.engRate !== null && p.engRate !== undefined && (
                        <span className="text-xs font-bold" style={{ color: p.engRate >= 3 ? "#1DB954" : AMBER }}>
                          {p.engRate}% ER
                        </span>
                      )}
                    </div>
                    {p.timestamp && <p className="text-xs mt-1" style={{ color: "#C4AA8A" }}>{timeAgo(p.timestamp)}</p>}
                  </div>
                </a>
              ))}
            </div>
          </div>
        )}

        {/* ─── TIKTOK RESULTS ─── */}
        {!loading && results && tab === "tiktok" && (
          <div className="space-y-4">
            <p className="text-xs font-semibold" style={{ color: "#A8967E" }}>
              {results.total} videos • {results.mode === "hashtag" ? "hashtag search" : "profile"}
            </p>
            <div className="space-y-3">
              {results.videos.map((v: any, i: number) => (
                <div key={i} className="rounded-xl p-4 flex gap-4" style={card}>
                  {v.cover && (
                    <img src={v.cover} alt="" className="w-20 h-28 rounded-lg object-cover flex-shrink-0" />
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="text-sm font-bold" style={{ color: "#292524" }}>
                          @{v.author}
                          {v.authorVerified && <span className="ml-1 text-xs" style={{ color: "#1877F2" }}>✓</span>}
                        </p>
                        {v.authorFollowers > 0 && (
                          <p className="text-xs" style={{ color: "#A8967E" }}>{fmtNum(v.authorFollowers)} followers</p>
                        )}
                      </div>
                      {v.createTime && (
                        <p className="text-xs flex-shrink-0" style={{ color: "#C4AA8A" }}>{timeAgo(v.createTime)}</p>
                      )}
                    </div>
                    {v.description && (
                      <p className="text-xs mt-2 line-clamp-2 leading-relaxed" style={{ color: "#78614E" }}>{v.description}</p>
                    )}
                    <div className="flex gap-4 mt-3">
                      <span className="flex items-center gap-1 text-xs font-semibold" style={{ color: "#292524" }}>
                        <Eye className="w-3 h-3" style={{ color: TT }} />{fmtNum(v.plays)}
                      </span>
                      <span className="flex items-center gap-1 text-xs" style={{ color: "#A8967E" }}>
                        <ThumbsUp className="w-3 h-3" />{fmtNum(v.likes)}
                      </span>
                      <span className="flex items-center gap-1 text-xs" style={{ color: "#A8967E" }}>
                        <MessageCircle className="w-3 h-3" />{fmtNum(v.comments)}
                      </span>
                      <span className="flex items-center gap-1 text-xs" style={{ color: "#A8967E" }}>
                        <Share2 className="w-3 h-3" />{fmtNum(v.shares)}
                      </span>
                    </div>
                    {v.music && (
                      <p className="text-xs mt-2" style={{ color: "#A8967E" }}>
                        ♪ {v.music.name} — {v.music.author}
                      </p>
                    )}
                    {v.hashtags?.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-2">
                        {v.hashtags.map((h: string, j: number) => (
                          <span key={j} className="text-xs px-1.5 py-0.5 rounded-full"
                            style={{ backgroundColor: "rgba(1,1,1,0.06)", color: "#78614E" }}>
                            #{h}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ─── FACEBOOK RESULTS ─── */}
        {!loading && results && tab === "facebook" && (
          <div className="space-y-4">
            {results.pageInfo && (
              <div className="rounded-xl p-4" style={{ ...card, borderColor: `${FB}30` }}>
                <p className="font-bold" style={{ color: "#292524" }}>{results.pageInfo.name}</p>
                {results.pageInfo.category && (
                  <p className="text-xs mt-0.5" style={{ color: "#A8967E" }}>{results.pageInfo.category}</p>
                )}
                {results.pageInfo.followers > 0 && (
                  <p className="text-xs mt-1 font-semibold" style={{ color: FB }}>
                    {fmtNum(results.pageInfo.followers)} followers
                  </p>
                )}
              </div>
            )}

            <p className="text-xs font-semibold" style={{ color: "#A8967E" }}>
              {results.total} posts
            </p>

            <div className="space-y-3">
              {results.posts.map((p: any, i: number) => (
                <div key={i} className="rounded-xl p-4" style={card}>
                  <div className="flex gap-4">
                    {p.media && (
                      <img src={p.media} alt="" className="w-24 h-20 rounded-lg object-cover flex-shrink-0" />
                    )}
                    <div className="flex-1 min-w-0">
                      {p.text && (
                        <p className="text-sm line-clamp-3 leading-relaxed" style={{ color: "#292524" }}>{p.text}</p>
                      )}
                      <div className="flex gap-4 mt-3">
                        <span className="flex items-center gap-1 text-xs font-semibold" style={{ color: FB }}>
                          <ThumbsUp className="w-3 h-3" />{fmtNum(p.likes)}
                        </span>
                        <span className="flex items-center gap-1 text-xs" style={{ color: "#A8967E" }}>
                          <MessageCircle className="w-3 h-3" />{fmtNum(p.comments)}
                        </span>
                        <span className="flex items-center gap-1 text-xs" style={{ color: "#A8967E" }}>
                          <Share2 className="w-3 h-3" />{fmtNum(p.shares)}
                        </span>
                      </div>
                      <div className="flex items-center justify-between mt-2">
                        {p.time && <p className="text-xs" style={{ color: "#C4AA8A" }}>{timeAgo(p.time)}</p>}
                        {p.url && (
                          <a href={p.url} target="_blank" rel="noopener noreferrer"
                            className="flex items-center gap-1 text-xs font-semibold" style={{ color: FB }}>
                            <ExternalLink className="w-3 h-3" />View post
                          </a>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Empty state */}
        {!loading && !results && !error && (
          <div className="rounded-2xl p-10 text-center" style={card}>
            <Search className="w-10 h-10 mx-auto mb-3" style={{ color: "rgba(196,170,138,0.4)" }} />
            <p className="font-semibold" style={{ color: "#78614E" }}>Ready to search</p>
            <p className="text-sm mt-1" style={{ color: "#C4AA8A" }}>
              Select a platform and enter a keyword, @username, or #hashtag
            </p>
          </div>
        )}

      </div>
    </div>
  );
}
