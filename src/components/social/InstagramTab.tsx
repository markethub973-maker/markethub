"use client";

import { useState, useEffect } from "react";
import {
  Search, ExternalLink, Heart, MessageCircle, Eye, Loader2,
  Users, Image, UserCheck, Clock, TrendingUp, ShieldCheck, Lock, X,
  Bookmark, BookmarkCheck, Video
} from "lucide-react";

const cardStyle = { backgroundColor: "var(--color-bg-secondary)", border: "1px solid rgba(245,215,160,0.25)", boxShadow: "0 1px 3px rgba(120,97,78,0.08)" };
const IG = "#E1306C";
const IG2 = "#833AB4";
const IG3 = "#F77737";

type Profile = {
  username: string; fullName: string; biography: string; avatar: string;
  followers: number; following: number; postsCount: number;
  isVerified: boolean; isPrivate: boolean; externalUrl: string | null; category: string | null;
};
type Post = {
  id: string; shortcode: string; thumbnail: string; isVideo: boolean;
  videoViews: number; likes: number; comments: number; caption: string; timestamp: number;
};
type SearchResult = { profile: Profile; engagementRate: number; posts: Post[] };
type SearchEntry = { query: string; timestamp: number };

const POPULAR_ACCOUNTS = [
  "cristiano", "instagram", "kyliejenner", "leomessi", "selenagomez",
  "therock", "kimkardashian", "beyonce", "nike", "natgeo",
  "neymarjr", "justinbieber", "taylorswift", "kendalljenner", "vifrancotv",
];

function formatNum(n: number) {
  if (!n) return "0";
  if (n >= 1_000_000_000) return (n / 1_000_000_000).toFixed(1) + "B";
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + "M";
  if (n >= 1_000) return (n / 1_000).toFixed(1) + "K";
  return n.toLocaleString();
}
function proxyImg(url: string) { return url ? `/api/image-proxy?url=${encodeURIComponent(url)}` : ""; }
function timeAgo(ts: number) {
  const diff = Math.floor(Date.now() / 1000) - ts;
  if (diff < 3600) return `${Math.floor(diff / 60)}m`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h`;
  if (diff < 2592000) return `${Math.floor(diff / 86400)}d`;
  return `${Math.floor(diff / 2592000)}mo`;
}

export default function InstagramTab() {
  const [username, setUsername] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<SearchResult | null>(null);
  const [searched, setSearched] = useState(false);
  const [history, setHistory] = useState<SearchEntry[]>([]);
  const [savedAccounts, setSavedAccounts] = useState<string[]>([]);

  useEffect(() => {
    const h = localStorage.getItem("mhp_ig_history"); if (h) setHistory(JSON.parse(h));
    const s = localStorage.getItem("mhp_ig_saved"); if (s) setSavedAccounts(JSON.parse(s));
  }, []);

  const saveHistory = (entries: SearchEntry[]) => { setHistory(entries); localStorage.setItem("mhp_ig_history", JSON.stringify(entries)); };
  const toggleSave = (u: string) => {
    const next = savedAccounts.includes(u) ? savedAccounts.filter(a => a !== u) : [...savedAccounts, u];
    setSavedAccounts(next); localStorage.setItem("mhp_ig_saved", JSON.stringify(next));
  };

  const searchUser = async (q?: string) => {
    const term = (q || username).trim().replace(/^@/, ""); if (!term) return;
    setUsername(term);
    saveHistory([{ query: term, timestamp: Date.now() }, ...history.filter(h => h.query !== term).slice(0, 19)]);
    setLoading(true); setError(null); setSearched(true);
    try {
      const res = await fetch(`/api/instagram-scraper?username=${encodeURIComponent(term)}`);
      const data = await res.json();
      if (data.error) { setError(data.error); setResult(null); } else { setResult(data); }
    } catch { setError("Connection error"); } finally { setLoading(false); }
  };
  const clearHistory = () => { setHistory([]); localStorage.removeItem("mhp_ig_history"); };

  return (
    <div className="space-y-5">
      {/* Search */}
      <div className="rounded-xl p-5" style={cardStyle}>
        <div className="flex gap-3 flex-wrap">
          <div className="relative flex-1 min-w-52">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: IG }} />
            <input type="text" placeholder="Enter Instagram username (ex: cristiano)..."
              value={username} onChange={e => setUsername(e.target.value)}
              onKeyDown={e => e.key === "Enter" && searchUser()}
              className="w-full pl-9 pr-4 py-3 text-sm rounded-xl focus:outline-none"
              style={{ border: `1px solid ${IG}30`, backgroundColor: "var(--color-bg)", color: "var(--color-text)" }}
              onFocus={e => (e.currentTarget.style.borderColor = IG)}
              onBlur={e => (e.currentTarget.style.borderColor = `${IG}30`)} />
          </div>
          <button type="button" onClick={() => searchUser()} disabled={!username.trim() || loading}
            className="px-6 py-3 rounded-xl text-sm font-bold flex items-center gap-2 transition-opacity"
            style={{ background: `linear-gradient(135deg, ${IG3}, ${IG}, ${IG2})`, color: "white", opacity: username.trim() && !loading ? 1 : 0.5 }}>
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />} Search
          </button>
        </div>
      </div>

      {loading && (
        <div className="flex items-center justify-center h-40">
          <Loader2 className="w-6 h-6 animate-spin" style={{ color: IG }} />
          <span className="ml-3 text-sm" style={{ color: "#A8967E" }}>Searching Instagram...</span>
        </div>
      )}
      {error && !loading && (
        <div className="rounded-xl p-5" style={cardStyle}><p className="text-sm" style={{ color: "#EF4444" }}>Error: {error}</p></div>
      )}

      {!loading && !error && result && (
        <>
          <div className="rounded-xl overflow-hidden" style={cardStyle}>
            <div className="h-24 relative" style={{ background: `linear-gradient(135deg, ${IG3}, ${IG}, ${IG2})` }}>
              <div className="absolute -bottom-10 left-6">
                <div className="w-20 h-20 rounded-full border-4 overflow-hidden" style={{ borderColor: "var(--color-bg-secondary)" }}>
                  {result.profile.avatar ? <img src={proxyImg(result.profile.avatar)} alt={result.profile.username} className="w-full h-full object-cover" />
                    : <div className="w-full h-full flex items-center justify-center" style={{ backgroundColor: `${IG}20` }}><Users className="w-8 h-8" style={{ color: IG }} /></div>}
                </div>
              </div>
            </div>
            <div className="pt-12 px-6 pb-5">
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-lg font-bold" style={{ color: "var(--color-text)" }}>{result.profile.fullName || result.profile.username}</h2>
                    {result.profile.isVerified && <ShieldCheck className="w-5 h-5" style={{ color: "#3B82F6" }} />}
                    {result.profile.isPrivate && <Lock className="w-4 h-4" style={{ color: "#A8967E" }} />}
                  </div>
                  <a href={`https://instagram.com/${result.profile.username}`} target="_blank" rel="noopener noreferrer" className="text-sm hover:underline" style={{ color: IG }}>@{result.profile.username}</a>
                  {result.profile.category && <p className="text-xs mt-1" style={{ color: "#A8967E" }}>{result.profile.category}</p>}
                </div>
                <div className="flex gap-2">
                  <button type="button" onClick={() => toggleSave(result.profile.username)} className="p-2 rounded-lg" style={{ color: savedAccounts.includes(result.profile.username) ? "var(--color-primary)" : "#C4AA8A" }}>
                    {savedAccounts.includes(result.profile.username) ? <BookmarkCheck className="w-5 h-5" /> : <Bookmark className="w-5 h-5" />}
                  </button>
                  <a href={`https://instagram.com/${result.profile.username}`} target="_blank" rel="noopener noreferrer" className="p-2 rounded-lg" style={{ color: IG }}><ExternalLink className="w-5 h-5" /></a>
                </div>
              </div>
              {result.profile.biography && <p className="text-sm mt-3 whitespace-pre-line" style={{ color: "#78614E" }}>{result.profile.biography}</p>}
              {result.profile.externalUrl && <a href={result.profile.externalUrl} target="_blank" rel="noopener noreferrer" className="text-xs mt-1 inline-block hover:underline" style={{ color: IG2 }}>{result.profile.externalUrl}</a>}
              <div className="grid grid-cols-4 gap-4 mt-5">
                {[
                  { label: "Followers", value: formatNum(result.profile.followers), icon: <Users className="w-4 h-4" /> },
                  { label: "Following", value: formatNum(result.profile.following), icon: <UserCheck className="w-4 h-4" /> },
                  { label: "Posts", value: formatNum(result.profile.postsCount), icon: <Image className="w-4 h-4" /> },
                  { label: "Engagement", value: `${result.engagementRate}%`, icon: <TrendingUp className="w-4 h-4" /> },
                ].map(stat => (
                  <div key={stat.label} className="text-center p-3 rounded-lg" style={{ background: `linear-gradient(135deg, ${IG}08, ${IG2}08)`, border: `1px solid ${IG}15` }}>
                    <div className="flex justify-center mb-1" style={{ color: IG }}>{stat.icon}</div>
                    <p className="text-lg font-bold" style={{ color: "var(--color-text)" }}>{stat.value}</p>
                    <p className="text-xs" style={{ color: "#A8967E" }}>{stat.label}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {result.posts.length > 0 && (
            <div className="rounded-xl p-5" style={cardStyle}>
              <div className="flex items-center gap-2 mb-4"><Image className="w-4 h-4" style={{ color: IG }} /><h3 className="font-semibold" style={{ color: "var(--color-text)" }}>Recent Posts ({result.posts.length})</h3></div>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                {result.posts.map(post => (
                  <a key={post.id} href={`https://instagram.com/p/${post.shortcode}`} target="_blank" rel="noopener noreferrer"
                    className="rounded-xl overflow-hidden group transition-all hover:shadow-lg" style={{ ...cardStyle, border: `1px solid ${IG}15` }}>
                    <div className="relative aspect-square">
                      <img src={proxyImg(post.thumbnail)} alt="" className="w-full h-full object-cover" />
                      {post.isVideo && <div className="absolute top-2 right-2"><Video className="w-4 h-4 text-white drop-shadow-md" /></div>}
                      <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-4">
                        <span className="flex items-center gap-1 text-white text-sm font-semibold"><Heart className="w-4 h-4" />{formatNum(post.likes)}</span>
                        <span className="flex items-center gap-1 text-white text-sm font-semibold"><MessageCircle className="w-4 h-4" />{formatNum(post.comments)}</span>
                        {post.isVideo && post.videoViews > 0 && <span className="flex items-center gap-1 text-white text-sm font-semibold"><Eye className="w-4 h-4" />{formatNum(post.videoViews)}</span>}
                      </div>
                    </div>
                    <div className="p-2.5">
                      <p className="text-xs line-clamp-2" style={{ color: "#78614E" }}>{post.caption || "No description"}</p>
                      <p className="text-xs mt-1" style={{ color: "#C4AA8A" }}>{timeAgo(post.timestamp)} ago</p>
                    </div>
                  </a>
                ))}
              </div>
            </div>
          )}
          {result.profile.isPrivate && result.posts.length === 0 && (
            <div className="rounded-xl p-8 text-center" style={cardStyle}>
              <Lock className="w-8 h-8 mx-auto mb-3" style={{ color: "#C4AA8A" }} />
              <p className="text-sm font-semibold" style={{ color: "var(--color-text)" }}>Private account</p>
              <p className="text-xs mt-1" style={{ color: "#A8967E" }}>Posts are not available for private accounts</p>
            </div>
          )}
        </>
      )}

      {!searched && (
        <div className="rounded-xl p-5" style={cardStyle}>
          <div className="flex items-center gap-2 mb-4"><TrendingUp className="w-4 h-4" style={{ color: IG }} /><h3 className="font-semibold" style={{ color: "var(--color-text)" }}>Popular Accounts</h3></div>
          <div className="flex flex-wrap gap-2">
            {POPULAR_ACCOUNTS.map(acc => (
              <button key={acc} type="button" onClick={() => { setUsername(acc); searchUser(acc); }}
                className="px-3 py-1.5 rounded-full text-sm font-medium transition-all hover:scale-105"
                style={{ background: `linear-gradient(135deg, ${IG}10, ${IG2}10)`, color: "var(--color-text)", border: `1px solid ${IG}20` }}
                onMouseEnter={e => { e.currentTarget.style.background = `linear-gradient(135deg, ${IG}25, ${IG2}25)`; e.currentTarget.style.borderColor = IG; }}
                onMouseLeave={e => { e.currentTarget.style.background = `linear-gradient(135deg, ${IG}10, ${IG2}10)`; e.currentTarget.style.borderColor = `${IG}20`; }}>
                @{acc}
              </button>
            ))}
          </div>
        </div>
      )}

      {history.length > 0 && (
        <div className="rounded-xl p-5" style={cardStyle}>
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2"><Clock className="w-4 h-4" style={{ color: "var(--color-primary)" }} /><h3 className="font-semibold" style={{ color: "var(--color-text)" }}>Recent Searches</h3></div>
            <button type="button" onClick={clearHistory} className="text-xs font-semibold px-2 py-1 rounded-lg" style={{ color: "#A8967E", backgroundColor: "rgba(245,215,160,0.1)" }}>Clear all</button>
          </div>
          <div className="flex flex-wrap gap-2">
            {history.slice(0, 15).map(h => (
              <button key={h.query + h.timestamp} type="button" onClick={() => { setUsername(h.query); searchUser(h.query); }}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm transition-colors"
                style={{ backgroundColor: `${IG}08`, color: "var(--color-text)", border: `1px solid ${IG}15` }}
                onMouseEnter={e => { e.currentTarget.style.backgroundColor = `${IG}18`; e.currentTarget.style.borderColor = IG; }}
                onMouseLeave={e => { e.currentTarget.style.backgroundColor = `${IG}08`; e.currentTarget.style.borderColor = `${IG}15`; }}>
                <span className="font-medium">@{h.query}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {savedAccounts.length > 0 && (
        <div className="rounded-xl p-5" style={cardStyle}>
          <div className="flex items-center gap-2 mb-3"><Bookmark className="w-4 h-4" style={{ color: "var(--color-primary)" }} /><h3 className="font-semibold" style={{ color: "var(--color-text)" }}>Saved Accounts ({savedAccounts.length})</h3></div>
          <div className="flex flex-wrap gap-2">
            {savedAccounts.map(acc => (
              <div key={acc} className="flex items-center gap-1 group">
                <button type="button" onClick={() => { setUsername(acc); searchUser(acc); }}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium"
                  style={{ background: `linear-gradient(135deg, ${IG}10, ${IG2}10)`, color: IG, border: `1px solid ${IG}20` }}>@{acc}</button>
                <button type="button" onClick={() => toggleSave(acc)} className="opacity-0 group-hover:opacity-100 p-0.5 rounded transition-opacity" style={{ color: "#EF4444" }}><X className="w-3 h-3" /></button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
