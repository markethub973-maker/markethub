"use client";

import { useState } from "react";
import Header from "@/components/layout/Header";
import {
  Search, Instagram, Facebook, Globe, Loader2,
  ExternalLink, ThumbsUp, MessageCircle, Share2,
  Eye, Play, Hash, User, TrendingUp, AlertCircle,
  Youtube, MessageSquare, Star, MapPin, ChevronDown,
  ChevronUp, Phone, FileText,
} from "lucide-react";

const card = { backgroundColor: "#FFFCF7", border: "1px solid rgba(245,215,160,0.25)", boxShadow: "0 1px 3px rgba(120,97,78,0.08)" };
const AMBER = "#F59E0B";
const IG = "#E1306C";
const FB = "#1877F2";
const TT = "#010101";
const YT = "#FF0000";
const RD = "#FF4500";
const GREEN = "#1DB954";

type Tab = "google" | "instagram" | "tiktok" | "facebook" | "youtube" | "reddit" | "website" | "reviews";

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

const TABS: { id: Tab; label: string; icon: React.ElementType; color: string; group: string }[] = [
  { id: "google",   label: "Google",    icon: Search,        color: AMBER, group: "Search" },
  { id: "youtube",  label: "YouTube",   icon: Play,          color: YT,    group: "Search" },
  { id: "website",  label: "Website",   icon: Globe,         color: "#6366F1", group: "Search" },
  { id: "instagram",label: "Instagram", icon: Instagram,     color: IG,    group: "Social" },
  { id: "tiktok",   label: "TikTok",    icon: Play,          color: TT,    group: "Social" },
  { id: "facebook", label: "Facebook",  icon: Facebook,      color: FB,    group: "Social" },
  { id: "reddit",   label: "Reddit",    icon: MessageSquare, color: RD,    group: "Social" },
  { id: "reviews",  label: "Reviews",   icon: Star,          color: GREEN, group: "Local" },
];

export default function ResearchPage() {
  const [tab, setTab] = useState<Tab>("google");
  const [query, setQuery] = useState("");
  const [mode, setMode] = useState<"username" | "hashtag" | "channel" | "keyword" | "url" | "subreddit">("username");
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<any>(null);
  const [error, setError] = useState("");
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({});

  const toggleSection = (key: string) => setExpandedSections(s => ({ ...s, [key]: !s[key] }));

  const tabColor = TABS.find(t => t.id === tab)?.color || AMBER;

  const getPlaceholder = () => {
    switch (tab) {
      case "google": return "Keyword (ex: DJ evenimente București)";
      case "youtube": return mode === "channel" ? "@channel (ex: @KoalaProdMusic)" : "Keyword (ex: muzica nunta)";
      case "website": return "URL (ex: competitor.ro)";
      case "instagram": return mode === "username" ? "@username (ex: djmania.ro)" : "#hashtag (ex: djromania)";
      case "tiktok": return mode === "username" ? "@username (ex: djsandu)" : "#hashtag (ex: muzicabuna)";
      case "facebook": return "Pagina (ex: DJManiaBucuresti)";
      case "reddit": return mode === "subreddit" ? "subreddit (ex: Romania)" : "Keyword (ex: wedding DJ Romania)";
      case "reviews": return "Nume loc sau URL Google Maps";
      default: return "Search...";
    }
  };

  const getModes = (): { id: string; label: string; icon: React.ElementType }[] => {
    switch (tab) {
      case "instagram":
      case "tiktok":
        return [
          { id: "username", label: "Profil", icon: User },
          { id: "hashtag", label: "Hashtag", icon: Hash },
        ];
      case "youtube":
        return [
          { id: "channel", label: "Canal", icon: Play },
          { id: "keyword", label: "Căutare", icon: Search },
        ];
      case "reddit":
        return [
          { id: "keyword", label: "Căutare", icon: Search },
          { id: "subreddit", label: "Subreddit", icon: Hash },
        ];
      default: return [];
    }
  };

  const handleSearch = async () => {
    if (!query.trim()) return;
    setLoading(true);
    setError("");
    setResults(null);

    try {
      let endpoint = "";
      let body: Record<string, unknown> = {};

      switch (tab) {
        case "google":
          endpoint = "/api/research/google";
          body = { query: query.trim(), country: "ro", language: "ro" };
          break;
        case "youtube":
          endpoint = "/api/research/youtube";
          body = mode === "channel"
            ? { channel: query.trim(), limit: 15 }
            : { keyword: query.trim(), limit: 15 };
          break;
        case "website":
          endpoint = "/api/research/website";
          body = { url: query.trim(), maxPages: 5 };
          break;
        case "instagram":
          endpoint = "/api/research/instagram";
          body = mode === "username"
            ? { username: query.trim(), limit: 12 }
            : { hashtag: query.trim(), limit: 20 };
          break;
        case "tiktok":
          endpoint = "/api/research/tiktok";
          body = mode === "username"
            ? { username: query.trim(), limit: 15 }
            : { hashtag: query.trim(), limit: 20 };
          break;
        case "facebook":
          endpoint = "/api/research/facebook";
          body = { page: query.trim(), limit: 10 };
          break;
        case "reddit":
          endpoint = "/api/research/reddit";
          body = mode === "subreddit"
            ? { subreddit: query.trim(), limit: 20 }
            : { query: query.trim(), limit: 20 };
          break;
        case "reviews":
          endpoint = "/api/research/maps-reviews";
          body = query.startsWith("http")
            ? { placeUrl: query.trim(), maxReviews: 50 }
            : { placeName: query.trim(), maxReviews: 50 };
          break;
      }

      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) setError(data.error || "Search failed");
      else setResults(data);
    } catch {
      setError("Network error");
    }
    setLoading(false);
  };

  const modes = getModes();
  const currentTab = TABS.find(t => t.id === tab)!;

  const groups = ["Search", "Social", "Local"];

  return (
    <div>
      <Header title="Research Hub" subtitle="Google · YouTube · Instagram · TikTok · Facebook · Reddit · Website · Reviews" />
      <div className="p-6 space-y-5">

        {/* Tab selector grouped */}
        <div className="rounded-2xl p-5 space-y-4" style={card}>
          <div className="space-y-2">
            {groups.map(group => {
              const groupTabs = TABS.filter(t => t.group === group);
              return (
                <div key={group} className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs font-bold w-12 flex-shrink-0" style={{ color: "#C4AA8A" }}>{group}</span>
                  {groupTabs.map(({ id, label, icon: Icon, color }) => (
                    <button key={id} type="button"
                      onClick={() => { setTab(id); setResults(null); setError(""); setQuery(""); setMode("username"); }}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all"
                      style={tab === id
                        ? { backgroundColor: color, color: id === "tiktok" ? "#FFF8F0" : "white", boxShadow: `0 2px 8px ${color}40` }
                        : { backgroundColor: "rgba(245,215,160,0.1)", color: "#78614E", border: "1px solid rgba(245,215,160,0.2)" }}>
                      <Icon className="w-3.5 h-3.5" />
                      {label}
                    </button>
                  ))}
                </div>
              );
            })}
          </div>

          {/* Mode toggle */}
          {modes.length > 0 && (
            <div className="flex gap-2">
              {modes.map(m => (
                <button key={m.id} type="button"
                  onClick={() => setMode(m.id as any)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all"
                  style={mode === m.id
                    ? { backgroundColor: tabColor + "20", color: tabColor, border: `1px solid ${tabColor}40` }
                    : { color: "#A8967E", border: "1px solid rgba(245,215,160,0.2)" }}>
                  <m.icon className="w-3 h-3" />{m.label}
                </button>
              ))}
            </div>
          )}

          {/* Search bar */}
          <div className="flex gap-2">
            <div className="flex-1 flex items-center gap-2 px-3 py-2.5 rounded-xl"
              style={{ border: `1px solid ${tabColor}40`, backgroundColor: "#FFFDF9" }}>
              <Search className="w-4 h-4 flex-shrink-0" style={{ color: tabColor }} />
              <input type="text" value={query}
                onChange={e => setQuery(e.target.value)}
                onKeyDown={e => e.key === "Enter" && handleSearch()}
                placeholder={getPlaceholder()}
                className="flex-1 text-sm bg-transparent focus:outline-none"
                style={{ color: "#292524" }} />
            </div>
            <button type="button" onClick={handleSearch}
              disabled={loading || !query.trim()}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold disabled:opacity-50 transition-all"
              style={{ backgroundColor: tabColor, color: tab === "tiktok" ? "#FFF8F0" : "white" }}>
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
              {loading ? "Se caută…" : "Search"}
            </button>
          </div>

          <p className="text-xs" style={{ color: "#C4AA8A" }}>
            {tab === "website" && "Extrage conținut, prețuri și structură de pe orice site competitor. 15–60s."}
            {tab === "youtube" && "Scrape canal YouTube: videos, views, likes, comentarii."}
            {tab === "reddit" && "Caută discuții, feedback și opinii reale despre orice subiect."}
            {tab === "reviews" && "Analizează recenziile Google Maps — sentiment pozitiv/negativ, tendințe."}
            {(tab === "google" || tab === "instagram" || tab === "tiktok" || tab === "facebook") && "Powered by Apify — date publice. 15–45s."}
          </p>
        </div>

        {/* Error */}
        {error && (
          <div className="flex items-center gap-2 px-4 py-3 rounded-xl text-sm font-semibold"
            style={{ backgroundColor: "rgba(239,68,68,0.08)", color: "#DC2626", border: "1px solid rgba(239,68,68,0.15)" }}>
            <AlertCircle className="w-4 h-4 flex-shrink-0" />{error}
          </div>
        )}

        {/* Loading */}
        {loading && (
          <div className="rounded-2xl p-12 flex flex-col items-center gap-3" style={card}>
            <Loader2 className="w-8 h-8 animate-spin" style={{ color: tabColor }} />
            <p className="text-sm font-semibold" style={{ color: "#78614E" }}>
              Apify procesează cererea…
            </p>
          </div>
        )}

        {/* ── GOOGLE ── */}
        {!loading && results && tab === "google" && (
          <div className="space-y-4">
            <p className="text-xs font-semibold" style={{ color: "#A8967E" }}>{results.total} rezultate pentru "{results.query}"</p>
            {["ad", "organic", "paa", "related"].map(type => {
              const items = results.results?.filter((r: any) => r.type === type) || [];
              if (!items.length) return null;
              const labels: Record<string, string> = { ad: "Reclame active", organic: "Rezultate organice", paa: "People Also Ask", related: "Căutări similare" };
              return (
                <div key={type}>
                  <p className="text-xs font-bold uppercase tracking-wide mb-2"
                    style={{ color: type === "ad" ? "#DC2626" : "#78614E" }}>{labels[type]}</p>
                  {type === "related" ? (
                    <div className="flex flex-wrap gap-2">
                      {items.map((r: any, i: number) => (
                        <button key={i} type="button" onClick={() => setQuery(r.query)}
                          className="px-3 py-1.5 rounded-full text-xs font-medium"
                          style={{ backgroundColor: "rgba(245,215,160,0.15)", color: "#78614E", border: "1px solid rgba(245,215,160,0.3)" }}>
                          <TrendingUp className="w-3 h-3 inline mr-1" />{r.query}
                        </button>
                      ))}
                    </div>
                  ) : type === "paa" ? (
                    <div className="rounded-xl overflow-hidden" style={card}>
                      {items.map((r: any, i: number) => (
                        <div key={i} className="px-4 py-3" style={{ borderBottom: "1px solid rgba(245,215,160,0.15)" }}>
                          <p className="text-sm font-semibold" style={{ color: "#292524" }}>{r.question}</p>
                          {r.answer && <p className="text-xs mt-1 line-clamp-2" style={{ color: "#78614E" }}>{r.answer}</p>}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {items.map((r: any, i: number) => (
                        <div key={i} className="rounded-xl p-4 flex items-start justify-between gap-2" style={card}>
                          <div className="flex-1 min-w-0">
                            {r.position && <span className="text-xs font-bold px-1.5 py-0.5 rounded mr-2"
                              style={{ backgroundColor: `${AMBER}15`, color: AMBER }}>#{r.position}</span>}
                            <a href={r.url} target="_blank" rel="noopener noreferrer"
                              className="text-sm font-semibold hover:underline" style={{ color: "#292524" }}>
                              {r.title}
                            </a>
                            <p className="text-xs mt-0.5" style={{ color: "#C4AA8A" }}>{r.displayedUrl}</p>
                            {r.description && <p className="text-xs mt-1 line-clamp-2" style={{ color: "#78614E" }}>{r.description}</p>}
                          </div>
                          <a href={r.url} target="_blank" rel="noopener noreferrer">
                            <ExternalLink className="w-3.5 h-3.5 flex-shrink-0" style={{ color: "#C4AA8A" }} />
                          </a>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* ── YOUTUBE ── */}
        {!loading && results && tab === "youtube" && (
          <div className="space-y-4">
            {results.channelInfo && (
              <div className="rounded-xl p-4 flex items-center gap-3" style={{ ...card, borderColor: `${YT}30` }}>
                <Play className="w-8 h-8" style={{ color: YT }} />
                <div>
                  <p className="font-bold" style={{ color: "#292524" }}>{results.channelInfo.name}</p>
                  {results.channelInfo.subscribers > 0 && (
                    <p className="text-xs font-semibold" style={{ color: YT }}>{fmtNum(results.channelInfo.subscribers)} abonați</p>
                  )}
                </div>
              </div>
            )}
            <p className="text-xs font-semibold" style={{ color: "#A8967E" }}>{results.total} videos</p>
            <div className="space-y-3">
              {results.videos.map((v: any, i: number) => (
                <a key={i} href={v.url} target="_blank" rel="noopener noreferrer"
                  className="flex gap-4 rounded-xl p-4 hover:opacity-90 transition-opacity" style={card}>
                  {v.thumbnail && <img src={v.thumbnail} alt="" className="w-32 h-20 rounded-lg object-cover flex-shrink-0" />}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold line-clamp-2" style={{ color: "#292524" }}>{v.title}</p>
                    <p className="text-xs mt-1" style={{ color: "#A8967E" }}>{v.channel}</p>
                    <div className="flex gap-4 mt-2">
                      <span className="flex items-center gap-1 text-xs font-semibold" style={{ color: YT }}>
                        <Eye className="w-3 h-3" />{fmtNum(v.views)}
                      </span>
                      <span className="flex items-center gap-1 text-xs" style={{ color: "#A8967E" }}>
                        <ThumbsUp className="w-3 h-3" />{fmtNum(v.likes)}
                      </span>
                      <span className="flex items-center gap-1 text-xs" style={{ color: "#A8967E" }}>
                        <MessageCircle className="w-3 h-3" />{fmtNum(v.comments)}
                      </span>
                      {v.publishedAt && (
                        <span className="text-xs ml-auto" style={{ color: "#C4AA8A" }}>{timeAgo(v.publishedAt)}</span>
                      )}
                    </div>
                  </div>
                </a>
              ))}
            </div>
          </div>
        )}

        {/* ── WEBSITE ── */}
        {!loading && results && tab === "website" && (
          <div className="space-y-4">
            <div className="rounded-xl p-4" style={{ ...card, borderColor: "rgba(99,102,241,0.3)" }}>
              <p className="font-bold" style={{ color: "#292524" }}>{results.domain}</p>
              {results.home_title && <p className="text-sm mt-0.5" style={{ color: "#78614E" }}>{results.home_title}</p>}
              {results.home_description && <p className="text-xs mt-1" style={{ color: "#A8967E" }}>{results.home_description}</p>}
              <p className="text-xs mt-2 font-semibold" style={{ color: "#6366F1" }}>{results.total} pagini crawlate</p>
            </div>
            {results.pages.map((p: any, i: number) => (
              <div key={i} className="rounded-xl p-4 space-y-2" style={card}>
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <a href={p.url} target="_blank" rel="noopener noreferrer"
                      className="text-sm font-semibold hover:underline" style={{ color: "#292524" }}>{p.title || p.url}</a>
                    <p className="text-xs mt-0.5 truncate" style={{ color: "#C4AA8A" }}>{p.url}</p>
                  </div>
                  <span className="text-xs flex-shrink-0 px-2 py-0.5 rounded-full"
                    style={{ backgroundColor: "rgba(99,102,241,0.08)", color: "#6366F1" }}>
                    {p.wordCount} words
                  </span>
                </div>
                {p.text && (
                  <div>
                    <button type="button" onClick={() => toggleSection(`web-${i}`)}
                      className="flex items-center gap-1 text-xs font-semibold" style={{ color: AMBER }}>
                      {expandedSections[`web-${i}`] ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                      {expandedSections[`web-${i}`] ? "Ascunde conținut" : "Vezi conținut extras"}
                    </button>
                    {expandedSections[`web-${i}`] && (
                      <p className="text-xs mt-2 leading-relaxed whitespace-pre-line"
                        style={{ color: "#78614E", maxHeight: 200, overflow: "auto" }}>{p.text}</p>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* ── INSTAGRAM ── */}
        {!loading && results && tab === "instagram" && (
          <div className="space-y-4">
            {results.profile && (
              <div className="rounded-xl p-4 flex items-center gap-4" style={{ ...card, borderColor: `${IG}30` }}>
                {results.profile.profilePic && (
                  <img src={results.profile.profilePic} alt="" className="w-14 h-14 rounded-full object-cover"
                    style={{ border: `2px solid ${IG}` }} />
                )}
                <div>
                  <p className="font-bold" style={{ color: "#292524" }}>@{results.profile.username}</p>
                  {results.profile.fullName && <p className="text-sm" style={{ color: "#78614E" }}>{results.profile.fullName}</p>}
                  {results.profile.followers > 0 && <p className="text-xs mt-0.5 font-semibold" style={{ color: IG }}>{fmtNum(results.profile.followers)} followers</p>}
                </div>
              </div>
            )}
            <p className="text-xs font-semibold" style={{ color: "#A8967E" }}>{results.total} posts</p>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {results.posts.map((p: any, i: number) => (
                <a key={i} href={p.url || `https://www.instagram.com/p/${p.shortCode}/`}
                  target="_blank" rel="noopener noreferrer" className="rounded-xl overflow-hidden group" style={card}>
                  <div className="relative aspect-square bg-gray-100">
                    {p.thumbnail
                      ? <img src={p.thumbnail} alt="" className="w-full h-full object-cover" />
                      : <div className="w-full h-full flex items-center justify-center">
                          <Instagram className="w-8 h-8" style={{ color: "#C4AA8A" }} />
                        </div>}
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
                      {p.engRate != null && (
                        <span className="text-xs font-bold" style={{ color: p.engRate >= 3 ? GREEN : AMBER }}>
                          {p.engRate}% ER
                        </span>
                      )}
                    </div>
                  </div>
                </a>
              ))}
            </div>
          </div>
        )}

        {/* ── TIKTOK ── */}
        {!loading && results && tab === "tiktok" && (
          <div className="space-y-3">
            <p className="text-xs font-semibold" style={{ color: "#A8967E" }}>{results.total} videos</p>
            {results.videos.map((v: any, i: number) => (
              <div key={i} className="rounded-xl p-4 flex gap-4" style={card}>
                {v.cover && <img src={v.cover} alt="" className="w-20 h-28 rounded-lg object-cover flex-shrink-0" />}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold" style={{ color: "#292524" }}>@{v.author}</p>
                  {v.authorFollowers > 0 && <p className="text-xs" style={{ color: "#A8967E" }}>{fmtNum(v.authorFollowers)} followers</p>}
                  {v.description && <p className="text-xs mt-1 line-clamp-2" style={{ color: "#78614E" }}>{v.description}</p>}
                  <div className="flex gap-4 mt-2">
                    <span className="flex items-center gap-1 text-xs font-semibold" style={{ color: "#292524" }}>
                      <Eye className="w-3 h-3" />{fmtNum(v.plays)}
                    </span>
                    <span className="flex items-center gap-1 text-xs" style={{ color: "#A8967E" }}>
                      <ThumbsUp className="w-3 h-3" />{fmtNum(v.likes)}
                    </span>
                    <span className="flex items-center gap-1 text-xs" style={{ color: "#A8967E" }}>
                      <Share2 className="w-3 h-3" />{fmtNum(v.shares)}
                    </span>
                  </div>
                  {v.music && <p className="text-xs mt-1" style={{ color: "#A8967E" }}>♪ {v.music.name} — {v.music.author}</p>}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ── FACEBOOK ── */}
        {!loading && results && tab === "facebook" && (
          <div className="space-y-4">
            {results.pageInfo && (
              <div className="rounded-xl p-4" style={{ ...card, borderColor: `${FB}30` }}>
                <p className="font-bold" style={{ color: "#292524" }}>{results.pageInfo.name}</p>
                {results.pageInfo.followers > 0 && <p className="text-xs font-semibold mt-0.5" style={{ color: FB }}>{fmtNum(results.pageInfo.followers)} followers</p>}
              </div>
            )}
            <div className="space-y-3">
              {results.posts.map((p: any, i: number) => (
                <div key={i} className="rounded-xl p-4" style={card}>
                  <div className="flex gap-4">
                    {p.media && <img src={p.media} alt="" className="w-20 h-16 rounded-lg object-cover flex-shrink-0" />}
                    <div className="flex-1 min-w-0">
                      {p.text && <p className="text-sm line-clamp-3" style={{ color: "#292524" }}>{p.text}</p>}
                      <div className="flex gap-4 mt-2">
                        <span className="flex items-center gap-1 text-xs font-semibold" style={{ color: FB }}>
                          <ThumbsUp className="w-3 h-3" />{fmtNum(p.likes)}
                        </span>
                        <span className="flex items-center gap-1 text-xs" style={{ color: "#A8967E" }}>
                          <MessageCircle className="w-3 h-3" />{fmtNum(p.comments)}
                        </span>
                        <span className="flex items-center gap-1 text-xs" style={{ color: "#A8967E" }}>
                          <Share2 className="w-3 h-3" />{fmtNum(p.shares)}
                        </span>
                        {p.url && (
                          <a href={p.url} target="_blank" rel="noopener noreferrer"
                            className="ml-auto flex items-center gap-1 text-xs font-semibold" style={{ color: FB }}>
                            <ExternalLink className="w-3 h-3" />View
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

        {/* ── REDDIT ── */}
        {!loading && results && tab === "reddit" && (
          <div className="space-y-3">
            <p className="text-xs font-semibold" style={{ color: "#A8967E" }}>{results.total} posts</p>
            {results.posts.map((p: any, i: number) => (
              <div key={i} className="rounded-xl p-4" style={card}>
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs font-bold px-2 py-0.5 rounded-full"
                        style={{ backgroundColor: `${RD}15`, color: RD }}>r/{p.subreddit}</span>
                      {p.flair && <span className="text-xs px-1.5 py-0.5 rounded"
                        style={{ backgroundColor: "rgba(245,215,160,0.15)", color: "#A8967E" }}>{p.flair}</span>}
                    </div>
                    <a href={p.permalink} target="_blank" rel="noopener noreferrer"
                      className="text-sm font-semibold hover:underline" style={{ color: "#292524" }}>{p.title}</a>
                    {p.text && <p className="text-xs mt-1 line-clamp-3" style={{ color: "#78614E" }}>{p.text}</p>}
                    <div className="flex gap-4 mt-2">
                      <span className="flex items-center gap-1 text-xs font-semibold" style={{ color: RD }}>
                        <ThumbsUp className="w-3 h-3" />{fmtNum(p.score)}
                      </span>
                      <span className="flex items-center gap-1 text-xs" style={{ color: "#A8967E" }}>
                        <MessageCircle className="w-3 h-3" />{p.numComments} comentarii
                      </span>
                      {p.createdAt && <span className="text-xs" style={{ color: "#C4AA8A" }}>{timeAgo(p.createdAt)}</span>}
                    </div>
                    {p.topComments?.length > 0 && (
                      <div className="mt-2 space-y-1">
                        {p.topComments.map((c: any, j: number) => (
                          <div key={j} className="px-3 py-2 rounded-lg text-xs" style={{ backgroundColor: "rgba(255,69,0,0.04)", borderLeft: `2px solid ${RD}30` }}>
                            <span className="font-bold" style={{ color: RD }}>u/{c.author}: </span>
                            <span style={{ color: "#78614E" }}>{c.text}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ── REVIEWS ── */}
        {!loading && results && tab === "reviews" && (
          <div className="space-y-4">
            {/* Sentiment summary */}
            <div className="rounded-xl p-4" style={{ ...card, borderColor: `${GREEN}30` }}>
              <div className="flex items-center gap-4 flex-wrap">
                <div className="text-center">
                  <p className="text-2xl font-bold" style={{ color: AMBER }}>{results.avg_rating}</p>
                  <p className="text-xs" style={{ color: "#A8967E" }}>rating mediu</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold" style={{ color: GREEN }}>{results.sentiment?.positive}</p>
                  <p className="text-xs" style={{ color: "#A8967E" }}>pozitive (4-5★)</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold" style={{ color: "#EF4444" }}>{results.sentiment?.negative}</p>
                  <p className="text-xs" style={{ color: "#A8967E" }}>negative (1-2★)</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold" style={{ color: "#A8967E" }}>{results.total}</p>
                  <p className="text-xs" style={{ color: "#A8967E" }}>total recenzii</p>
                </div>
              </div>
            </div>

            <div className="space-y-3">
              {results.reviews.map((r: any, i: number) => {
                const rColor = r.rating >= 4 ? GREEN : r.rating <= 2 ? "#EF4444" : AMBER;
                return (
                  <div key={i} className="rounded-xl p-4" style={card}>
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-sm font-bold" style={{ color: "#292524" }}>{r.reviewer}</span>
                          <div className="flex gap-0.5">
                            {[1,2,3,4,5].map(s => (
                              <Star key={s} className="w-3 h-3" fill={s <= r.rating ? rColor : "none"}
                                style={{ color: rColor }} />
                            ))}
                          </div>
                          {r.publishedAt && <span className="text-xs" style={{ color: "#C4AA8A" }}>{timeAgo(r.publishedAt)}</span>}
                        </div>
                        {r.text && <p className="text-sm" style={{ color: "#78614E" }}>{r.text}</p>}
                        {r.ownerResponse && (
                          <div className="mt-2 px-3 py-2 rounded-lg text-xs" style={{ backgroundColor: "rgba(245,158,11,0.06)", borderLeft: `2px solid ${AMBER}` }}>
                            <span className="font-bold" style={{ color: AMBER }}>Răspuns proprietar: </span>
                            <span style={{ color: "#78614E" }}>{r.ownerResponse}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Empty state */}
        {!loading && !results && !error && (
          <div className="rounded-2xl p-10 text-center" style={card}>
            <Search className="w-10 h-10 mx-auto mb-3" style={{ color: "rgba(196,170,138,0.4)" }} />
            <p className="font-semibold" style={{ color: "#78614E" }}>8 surse de date disponibile</p>
            <p className="text-sm mt-1" style={{ color: "#C4AA8A" }}>
              Google · YouTube · Website · Instagram · TikTok · Facebook · Reddit · Reviews
            </p>
          </div>
        )}

      </div>
    </div>
  );
}
