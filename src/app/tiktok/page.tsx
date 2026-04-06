"use client";

import { useState, useEffect } from "react";
import Header from "@/components/layout/Header";
import TrendingSoundsCard from "@/components/ui/TrendingSoundsCard";
import GlobalTrendingPanel from "@/components/ui/GlobalTrendingPanel";
import {
  Search, ExternalLink, Clock, TrendingUp, Heart, MessageCircle, Share2,
  Play, Eye, User, Hash, Loader2, Bookmark, BookmarkCheck, X
} from "lucide-react";

const cardStyle = { backgroundColor: "#FFFCF7", border: "1px solid rgba(245,215,160,0.25)", boxShadow: "0 1px 3px rgba(120,97,78,0.08)" };
const TT = "#00F2EA";
const TT2 = "#FF0050";

const TRENDING_SEARCHES = [
  "marketing", "social media", "brand", "viral", "trending",
  "ecommerce", "creator", "influencer", "startup", "content",
  "fashion", "fitness", "food", "travel", "tech",
  "london", "newyork",
];

type Video = {
  id: string; url: string; cover: string | null; author: string;
  desc: string | null; plays: number; likes: number; comments: number;
  shares: number; duration: number; createTime: string | null;
};
type TikTokUser = {
  uniqueId: string; nickname: string; avatar: string | null;
  followers: number; following: number; likes: number; videos: number;
  verified: boolean; bio: string | null;
};
type Hashtag = { name: string; views: number; videos: number };
type SearchEntry = { query: string; timestamp: number };

function formatNum(n: number) {
  if (!n) return "0";
  if (n >= 1_000_000_000) return (n / 1_000_000_000).toFixed(1) + "B";
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + "M";
  if (n >= 1_000) return (n / 1_000).toFixed(1) + "K";
  return n.toLocaleString();
}

export default function TikTokPage() {
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [videos, setVideos] = useState<Video[]>([]);
  const [users, setUsers] = useState<TikTokUser[]>([]);
  const [hashtags, setHashtags] = useState<Hashtag[]>([]);
  const [searched, setSearched] = useState(false);
  const [history, setHistory] = useState<SearchEntry[]>([]);
  const [savedUsers, setSavedUsers] = useState<string[]>([]);
  const [activeTab, setActiveTab] = useState<"videos" | "creators" | "hashtags">("videos");

  useEffect(() => {
    const h = localStorage.getItem("mh_tt_history");
    if (h) setHistory(JSON.parse(h));
    const s = localStorage.getItem("mh_tt_saved");
    if (s) setSavedUsers(JSON.parse(s));
  }, []);

  const saveHistory = (entries: SearchEntry[]) => {
    setHistory(entries);
    localStorage.setItem("mh_tt_history", JSON.stringify(entries));
  };

  const toggleSaveUser = (uid: string) => {
    const next = savedUsers.includes(uid) ? savedUsers.filter(u => u !== uid) : [...savedUsers, uid];
    setSavedUsers(next);
    localStorage.setItem("mh_tt_saved", JSON.stringify(next));
  };

  const search = async (q?: string) => {
    const term = (q || query).trim();
    if (!term) return;

    setQuery(term);
    const entry: SearchEntry = { query: term, timestamp: Date.now() };
    saveHistory([entry, ...history.filter(h => h.query !== term).slice(0, 19)]);

    setLoading(true);
    setError(null);
    setSearched(true);

    try {
      const res = await fetch(`/api/tiktok?q=${encodeURIComponent(term)}&count=20`);
      const data = await res.json();
      if (data.error) {
        setError(data.error);
        setVideos([]);
        setUsers([]);
        setHashtags([]);
      } else {
        setVideos(data.videos || []);
        setUsers(data.users || []);
        setHashtags(data.hashtags || []);
        if (data.videos?.length > 0) setActiveTab("videos");
        else if (data.users?.length > 0) setActiveTab("creators");
        else if (data.hashtags?.length > 0) setActiveTab("hashtags");
      }
    } catch {
      setError("Connection error");
    } finally {
      setLoading(false);
    }
  };

  const clearHistory = () => { setHistory([]); localStorage.removeItem("mh_tt_history"); };

  return (
    <div>
      <Header title="TikTok Analytics" subtitle="Search creators, videos and TikTok trends in real time" />
      <div className="p-6 space-y-5">

        {/* Search */}
        <div className="rounded-xl p-5" style={cardStyle}>
          <div className="flex gap-3 flex-wrap">
            <div className="relative flex-1 min-w-52">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: TT2 }} />
              <input type="text" placeholder="Search creator, hashtag, brand or trend..."
                value={query} onChange={e => setQuery(e.target.value)}
                onKeyDown={e => e.key === "Enter" && search()}
                className="w-full pl-9 pr-4 py-3 text-sm rounded-xl focus:outline-none"
                style={{ border: `1px solid ${TT2}30`, backgroundColor: "#FFF8F0", color: "#292524" }}
                onFocus={e => (e.currentTarget.style.borderColor = TT2)}
                onBlur={e => (e.currentTarget.style.borderColor = `${TT2}30`)}
              />
            </div>
            <button type="button" onClick={() => search()} disabled={!query.trim() || loading}
              className="px-6 py-3 rounded-xl text-sm font-bold flex items-center gap-2 transition-opacity"
              style={{ background: `linear-gradient(135deg, ${TT}, ${TT2})`, color: "white", opacity: query.trim() && !loading ? 1 : 0.5 }}>
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
              Search
            </button>
          </div>
        </div>

        {/* Loading */}
        {loading && (
          <div className="flex items-center justify-center h-40">
            <Loader2 className="w-6 h-6 animate-spin" style={{ color: TT2 }} />
            <span className="ml-3 text-sm" style={{ color: "#A8967E" }}>Searching TikTok...</span>
          </div>
        )}

        {/* Error */}
        {error && !loading && (
          <div className="rounded-xl p-5" style={cardStyle}>
            <p className="text-sm" style={{ color: "#EF4444" }}>Error: {error}</p>
          </div>
        )}

        {/* Results */}
        {!loading && !error && searched && (
          <>
            {/* Tabs */}
            <div className="flex gap-2">
              {[
                { key: "videos" as const, label: `Videos (${videos.length})`, icon: <Play className="w-3.5 h-3.5" /> },
                { key: "creators" as const, label: `Creators (${users.length})`, icon: <User className="w-3.5 h-3.5" /> },
                { key: "hashtags" as const, label: `Hashtags (${hashtags.length})`, icon: <Hash className="w-3.5 h-3.5" /> },
              ].map(tab => (
                <button key={tab.key} type="button" onClick={() => setActiveTab(tab.key)}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold transition-all"
                  style={activeTab === tab.key ? {
                    background: `linear-gradient(135deg, ${TT}20, ${TT2}20)`, color: TT2, border: `1px solid ${TT2}40`,
                  } : {
                    backgroundColor: "#FFFCF7", color: "#78614E", border: "1px solid rgba(245,215,160,0.25)",
                  }}>
                  {tab.icon}{tab.label}
                </button>
              ))}
            </div>

            {/* Videos */}
            {activeTab === "videos" && videos.length > 0 && (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                {videos.map(video => (
                  <a key={video.id} href={video.url} target="_blank" rel="noopener noreferrer"
                    className="rounded-xl overflow-hidden group transition-all hover:shadow-lg" style={cardStyle}>
                    <div className="relative" style={{ aspectRatio: "9/12" }}>
                      {video.cover ? (
                        <img src={video.cover} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center" style={{ backgroundColor: "#1C1814" }}>
                          <Play className="w-8 h-8" style={{ color: TT }} />
                        </div>
                      )}
                      <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                      <div className="absolute bottom-0 left-0 right-0 p-3 opacity-0 group-hover:opacity-100 transition-opacity">
                        <div className="flex items-center gap-3 text-white text-xs">
                          {video.plays > 0 && <span className="flex items-center gap-0.5"><Eye className="w-3 h-3" />{formatNum(video.plays)}</span>}
                          <span className="flex items-center gap-0.5"><Heart className="w-3 h-3" />{formatNum(video.likes)}</span>
                          <span className="flex items-center gap-0.5"><MessageCircle className="w-3 h-3" />{formatNum(video.comments)}</span>
                        </div>
                      </div>
                      <div className="absolute top-2 right-2">
                        <ExternalLink className="w-3.5 h-3.5 text-white opacity-0 group-hover:opacity-80 transition-opacity" />
                      </div>
                    </div>
                    <div className="p-3">
                      <p className="text-xs font-semibold truncate" style={{ color: "#292524" }}>@{video.author}</p>
                      {video.desc && (
                        <p className="text-xs mt-0.5 line-clamp-2" style={{ color: "#A8967E" }}>{video.desc}</p>
                      )}
                    </div>
                  </a>
                ))}
              </div>
            )}

            {/* Creators */}
            {activeTab === "creators" && users.length > 0 && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {users.map(user => (
                  <div key={user.uniqueId} className="rounded-xl p-4 flex items-start gap-3" style={cardStyle}>
                    <div className="w-12 h-12 rounded-full overflow-hidden flex-shrink-0" style={{ backgroundColor: `${TT2}15` }}>
                      {user.avatar ? (
                        <img src={user.avatar} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <User className="w-5 h-5" style={{ color: TT2 }} />
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <p className="text-sm font-bold truncate" style={{ color: "#292524" }}>
                          {user.nickname || user.uniqueId}
                        </p>
                        {user.verified && (
                          <span className="text-xs px-1.5 py-0.5 rounded-full" style={{ background: `linear-gradient(135deg, ${TT}, ${TT2})`, color: "white" }}>V</span>
                        )}
                      </div>
                      <a href={`https://tiktok.com/@${user.uniqueId}`} target="_blank" rel="noopener noreferrer"
                        className="text-xs hover:underline" style={{ color: TT2 }}>
                        @{user.uniqueId}
                      </a>
                      {user.bio && <p className="text-xs mt-1 line-clamp-2" style={{ color: "#A8967E" }}>{user.bio}</p>}
                      <div className="flex items-center gap-3 mt-2">
                        {user.followers > 0 && (
                          <span className="text-xs" style={{ color: "#78614E" }}>
                            <strong style={{ color: "#292524" }}>{formatNum(user.followers)}</strong> followers
                          </span>
                        )}
                        {user.likes > 0 && (
                          <span className="text-xs" style={{ color: "#78614E" }}>
                            <strong style={{ color: "#292524" }}>{formatNum(user.likes)}</strong> likes
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex flex-col gap-1">
                      <button type="button" onClick={() => toggleSaveUser(user.uniqueId)}
                        className="p-1.5 rounded-lg" style={{ color: savedUsers.includes(user.uniqueId) ? "#F59E0B" : "#C4AA8A" }}>
                        {savedUsers.includes(user.uniqueId) ? <BookmarkCheck className="w-4 h-4" /> : <Bookmark className="w-4 h-4" />}
                      </button>
                      <a href={`https://tiktok.com/@${user.uniqueId}`} target="_blank" rel="noopener noreferrer"
                        className="p-1.5 rounded-lg" style={{ color: TT2 }}>
                        <ExternalLink className="w-4 h-4" />
                      </a>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Hashtags */}
            {activeTab === "hashtags" && hashtags.length > 0 && (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                {hashtags.map(tag => (
                  <a key={tag.name} href={`https://tiktok.com/tag/${tag.name}`} target="_blank" rel="noopener noreferrer"
                    className="rounded-xl p-4 transition-all hover:scale-[1.02]" style={cardStyle}>
                    <div className="flex items-center gap-2 mb-2">
                      <Hash className="w-4 h-4" style={{ color: TT2 }} />
                      <p className="text-sm font-bold" style={{ color: "#292524" }}>#{tag.name}</p>
                    </div>
                    {tag.views > 0 && (
                      <p className="text-xs" style={{ color: "#A8967E" }}>
                        <strong style={{ color: "#292524" }}>{formatNum(tag.views)}</strong> views
                      </p>
                    )}
                    {tag.videos > 0 && (
                      <p className="text-xs" style={{ color: "#A8967E" }}>
                        <strong style={{ color: "#292524" }}>{formatNum(tag.videos)}</strong> videos
                      </p>
                    )}
                  </a>
                ))}
              </div>
            )}

            {/* No results */}
            {videos.length === 0 && users.length === 0 && hashtags.length === 0 && (
              <div className="rounded-xl p-8 text-center" style={cardStyle}>
                <Search className="w-8 h-8 mx-auto mb-3" style={{ color: "#C4AA8A" }} />
                <p className="text-sm font-semibold" style={{ color: "#292524" }}>No results found</p>
                <p className="text-xs mt-1" style={{ color: "#A8967E" }}>Try a different search term</p>
              </div>
            )}
          </>
        )}

        {/* Trending searches (before first search) */}
        {!searched && (
          <div className="rounded-xl p-5" style={cardStyle}>
            <div className="flex items-center gap-2 mb-4">
              <TrendingUp className="w-4 h-4" style={{ color: TT2 }} />
              <h3 className="font-semibold" style={{ color: "#292524" }}>Popular Searches</h3>
            </div>
            <div className="flex flex-wrap gap-2">
              {TRENDING_SEARCHES.map(term => (
                <button key={term} type="button" onClick={() => { setQuery(term); search(term); }}
                  className="px-3 py-1.5 rounded-full text-sm font-medium transition-all hover:scale-105"
                  style={{ background: `linear-gradient(135deg, ${TT}10, ${TT2}10)`, color: "#292524", border: `1px solid ${TT2}20` }}
                  onMouseEnter={e => { e.currentTarget.style.background = `linear-gradient(135deg, ${TT}25, ${TT2}25)`; e.currentTarget.style.borderColor = TT2; }}
                  onMouseLeave={e => { e.currentTarget.style.background = `linear-gradient(135deg, ${TT}10, ${TT2}10)`; e.currentTarget.style.borderColor = `${TT2}20`; }}>
                  {term}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Search History */}
        {history.length > 0 && (
          <div className="rounded-xl p-5" style={cardStyle}>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4" style={{ color: "#F59E0B" }} />
                <h3 className="font-semibold" style={{ color: "#292524" }}>Recent Searches</h3>
              </div>
              <button type="button" onClick={clearHistory}
                className="text-xs font-semibold px-2 py-1 rounded-lg"
                style={{ color: "#A8967E", backgroundColor: "rgba(245,215,160,0.1)" }}>
                Clear all
              </button>
            </div>
            <div className="flex flex-wrap gap-2">
              {history.slice(0, 15).map(h => (
                <button key={h.query + h.timestamp} type="button" onClick={() => { setQuery(h.query); search(h.query); }}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm transition-colors"
                  style={{ backgroundColor: `${TT2}08`, color: "#292524", border: `1px solid ${TT2}15` }}
                  onMouseEnter={e => { e.currentTarget.style.backgroundColor = `${TT2}18`; e.currentTarget.style.borderColor = TT2; }}
                  onMouseLeave={e => { e.currentTarget.style.backgroundColor = `${TT2}08`; e.currentTarget.style.borderColor = `${TT2}15`; }}>
                  <span className="font-medium">{h.query}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Saved Creators */}
        {savedUsers.length > 0 && (
          <div className="rounded-xl p-5" style={cardStyle}>
            <div className="flex items-center gap-2 mb-3">
              <Bookmark className="w-4 h-4" style={{ color: "#F59E0B" }} />
              <h3 className="font-semibold" style={{ color: "#292524" }}>Saved Creators ({savedUsers.length})</h3>
            </div>
            <div className="flex flex-wrap gap-2">
              {savedUsers.map(uid => (
                <div key={uid} className="flex items-center gap-1 group">
                  <a href={`https://tiktok.com/@${uid}`} target="_blank" rel="noopener noreferrer"
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium"
                    style={{ background: `linear-gradient(135deg, ${TT}10, ${TT2}10)`, color: TT2, border: `1px solid ${TT2}20` }}>
                    @{uid}
                    <ExternalLink className="w-3 h-3" />
                  </a>
                  <button type="button" onClick={() => toggleSaveUser(uid)}
                    className="opacity-0 group-hover:opacity-100 p-0.5 rounded transition-opacity" style={{ color: "#EF4444" }}>
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Trending Sounds */}
        <TrendingSoundsCard />

        {/* Global Trending — YouTube + Google Trends by country */}
        <GlobalTrendingPanel />

      </div>
    </div>
  );
}
