"use client";

import { useState, useEffect } from "react";
import Header from "@/components/layout/Header";
import { formatNumber } from "@/lib/utils";
import {
  Hash, Heart, MessageCircle, ExternalLink, AlertCircle, Search,
  TrendingUp, Image, Video, Layers, Plus, Copy, Check, Trash2,
  BookOpen, X, Loader2,
} from "lucide-react";

const cardStyle = { backgroundColor: "#FFFCF7", border: "1px solid rgba(245,215,160,0.25)", boxShadow: "0 1px 3px rgba(120,97,78,0.08)" };
const IG = "#E1306C";

const EXAMPLES = ["photography", "fashion", "travel", "food", "fitness", "marketing", "business", "startup"];
const PLATFORMS = ["instagram", "tiktok", "linkedin", "twitter", "pinterest", "youtube"];

interface HashtagSet {
  id: string;
  name: string;
  hashtags: string;
  platform: string;
  category: string;
  tags_count: number;
  created_at: string;
}

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

function SetCard({ set, onCopy, onDelete }: { set: HashtagSet; onCopy: (s: HashtagSet) => void; onDelete: (id: string) => void }) {
  const [copied, setCopied] = useState(false);
  const copy = () => {
    onCopy(set);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <div className="rounded-xl p-4 space-y-2" style={cardStyle}>
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-sm font-bold" style={{ color: "#292524" }}>{set.name}</p>
          <div className="flex items-center gap-2 mt-0.5">
            <span className="text-xs px-2 py-0.5 rounded-full font-semibold"
              style={{ backgroundColor: "rgba(225,48,108,0.08)", color: IG }}>{set.platform}</span>
            {set.category && (
              <span className="text-xs" style={{ color: "#A8967E" }}>{set.category}</span>
            )}
            <span className="text-xs" style={{ color: "#C4AA8A" }}>{set.tags_count} tags</span>
          </div>
        </div>
        <div className="flex gap-1 shrink-0">
          <button onClick={copy} title="Copy hashtags"
            className="p-1.5 rounded-lg"
            style={{ backgroundColor: copied ? "rgba(22,163,74,0.1)" : "rgba(245,158,11,0.1)", color: copied ? "#16a34a" : "#D97706" }}>
            {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
          </button>
          <button onClick={() => onDelete(set.id)} title="Delete set"
            className="p-1.5 rounded-lg" style={{ backgroundColor: "rgba(239,68,68,0.08)", color: "#EF4444" }}>
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
      <p className="text-xs leading-relaxed line-clamp-2" style={{ color: "#78614E" }}>{set.hashtags}</p>
    </div>
  );
}

export default function HashtagsPage() {
  const [query, setQuery] = useState("");
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [tab, setTab] = useState<"top" | "recent">("top");
  const [history, setHistory] = useState<string[]>([]);

  // Sets
  const [sets, setSets] = useState<HashtagSet[]>([]);
  const [setsLoading, setSetsLoading] = useState(true);
  const [showNewSet, setShowNewSet] = useState(false);
  const [newSet, setNewSet] = useState({ name: "", hashtags: "", platform: "instagram", category: "" });
  const [savingSet, setSavingSet] = useState(false);
  const [setError, setSetError] = useState("");
  const [mainTab, setMainTab] = useState<"search" | "sets">("search");

  useEffect(() => {
    fetch("/api/hashtags/sets")
      .then(r => r.json())
      .then(d => { if (d.sets) setSets(d.sets); })
      .finally(() => setSetsLoading(false));
  }, []);

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
      .catch(() => setError("Network error"))
      .finally(() => setLoading(false));
  };

  const handleSaveSet = async () => {
    setSetError("");
    if (!newSet.name.trim()) { setSetError("Name is required"); return; }
    if (!newSet.hashtags.trim()) { setSetError("Add at least one hashtag"); return; }
    setSavingSet(true);
    const res = await fetch("/api/hashtags/sets", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(newSet),
    });
    const d = await res.json();
    if (!res.ok) { setSetError(d.error || "Save failed"); setSavingSet(false); return; }
    setSets(prev => [d.set, ...prev]);
    setNewSet({ name: "", hashtags: "", platform: "instagram", category: "" });
    setShowNewSet(false);
    setSavingSet(false);
  };

  const handleDeleteSet = async (id: string) => {
    await fetch("/api/hashtags/sets", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    setSets(prev => prev.filter(s => s.id !== id));
  };

  const handleCopySet = (set: HashtagSet) => {
    navigator.clipboard.writeText(set.hashtags).catch(() => {});
  };

  // When searching a hashtag, pre-fill the set form
  const saveCurrentAsSet = () => {
    if (data?.hashtag) {
      setNewSet(n => ({ ...n, name: `#${data.hashtag}`, hashtags: `#${data.hashtag}` }));
      setMainTab("sets");
      setShowNewSet(true);
    }
  };

  const posts = tab === "top" ? data?.topPosts : data?.recentPosts;

  return (
    <div>
      <Header title="Hashtag Manager" subtitle="Research hashtags and save sets for quick reuse" />
      <div className="p-6 space-y-5">

        {/* Main tabs */}
        <div className="flex gap-2">
          {[
            { key: "search", label: "Search Hashtags", icon: <Search className="w-3.5 h-3.5" /> },
            { key: "sets", label: `My Sets (${sets.length})`, icon: <BookOpen className="w-3.5 h-3.5" /> },
          ].map(t => (
            <button key={t.key} type="button" onClick={() => setMainTab(t.key as "search" | "sets")}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold transition-all"
              style={mainTab === t.key
                ? { backgroundColor: "#F59E0B", color: "white" }
                : { backgroundColor: "#FFFCF7", color: "#A8967E", border: "1px solid rgba(245,215,160,0.3)" }}>
              {t.icon}{t.label}
            </button>
          ))}
        </div>

        {/* ── Search Tab ── */}
        {mainTab === "search" && (
          <>
            <div className="rounded-xl p-4 space-y-3" style={cardStyle}>
              <div className="flex gap-3">
                <div className="relative flex-1">
                  <Hash className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: IG }} />
                  <input type="text" placeholder="#hashtag (ex: photography, travel, food...)"
                    value={query} onChange={e => setQuery(e.target.value)}
                    onKeyDown={e => e.key === "Enter" && search()}
                    className="w-full pl-9 pr-4 py-3 text-sm rounded-xl focus:outline-none"
                    style={{ border: "1px solid rgba(225,48,108,0.3)", backgroundColor: "#FFFCF7", color: "#292524" }} />
                </div>
                <button type="button" onClick={() => search()} disabled={loading || !query.trim()}
                  className="px-6 py-3 rounded-xl text-sm font-bold"
                  style={{ backgroundColor: IG, color: "white", opacity: loading ? 0.7 : 1 }}>
                  {loading ? "..." : "Search"}
                </button>
              </div>

              <div className="flex flex-wrap gap-2 items-center">
                <span className="text-xs" style={{ color: "#C4AA8A" }}>{history.length > 0 ? "Recent:" : "Examples:"}</span>
                {(history.length > 0 ? history : EXAMPLES).map(ex => (
                  <button key={ex} type="button" onClick={() => { setQuery(ex); search(ex); }}
                    className="px-2.5 py-1 rounded-full text-xs font-semibold"
                    style={{ backgroundColor: "rgba(225,48,108,0.08)", color: IG, border: "1px solid rgba(225,48,108,0.2)" }}>
                    #{ex}
                  </button>
                ))}
              </div>
            </div>

            {error && (
              <div className="rounded-xl p-5 flex items-start gap-3" style={cardStyle}>
                <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" style={{ color: "#EF4444" }} />
                <div>
                  <p className="text-sm font-semibold" style={{ color: "#EF4444" }}>Hashtag not found</p>
                  <p className="text-sm mt-1" style={{ color: "#A8967E" }}>{error}</p>
                </div>
              </div>
            )}

            {data && (
              <div className="space-y-5">
                <div className="rounded-xl p-5" style={cardStyle}>
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ backgroundColor: "rgba(225,48,108,0.1)" }}>
                        <Hash className="w-5 h-5" style={{ color: IG }} />
                      </div>
                      <div>
                        <p className="font-bold text-lg" style={{ color: "#292524" }}>#{data.hashtag}</p>
                        <p className="text-xs" style={{ color: "#A8967E" }}>Instagram Hashtag</p>
                      </div>
                    </div>
                    <button onClick={saveCurrentAsSet}
                      className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg"
                      style={{ backgroundColor: "rgba(245,158,11,0.1)", color: "#D97706", border: "1px solid rgba(245,158,11,0.2)" }}>
                      <Plus className="w-3 h-3" />Save to sets
                    </button>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    {[
                      { label: "Top Posts", value: data.topPosts?.length || 0, color: IG },
                      { label: "Recent Posts", value: data.recentPosts?.length || 0, color: "#F59E0B" },
                      { label: "Avg Likes (top)", value: formatNumber(data.avgLikes), color: "#1DB954" },
                      { label: "Avg Comments (top)", value: formatNumber(data.avgComments), color: "#6366F1" },
                    ].map(s => (
                      <div key={s.label} className="rounded-lg p-3 text-center" style={{ backgroundColor: s.color + "08", border: `1px solid ${s.color}18` }}>
                        <p className="text-xs mb-1" style={{ color: "#A8967E" }}>{s.label}</p>
                        <p className="text-xl font-bold" style={{ color: s.color }}>{s.value}</p>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="flex gap-2">
                  {[
                    { key: "top", label: "Top Posts", icon: <TrendingUp className="w-3.5 h-3.5" /> },
                    { key: "recent", label: "Recent Posts", icon: <Search className="w-3.5 h-3.5" /> },
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

                {posts?.length > 0 ? (
                  <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4">
                    {posts.map((p: any, i: number) => <PostCard key={p.id} post={p} rank={i} />)}
                  </div>
                ) : (
                  <div className="rounded-xl p-8 text-center" style={cardStyle}>
                    <p className="text-sm" style={{ color: "#A8967E" }}>No posts available.</p>
                  </div>
                )}
              </div>
            )}

            {!data && !loading && !error && (
              <div className="rounded-xl p-12 text-center" style={cardStyle}>
                <Hash className="w-12 h-12 mx-auto mb-4" style={{ color: "rgba(225,48,108,0.3)" }} />
                <p className="font-semibold text-lg mb-2" style={{ color: "#292524" }}>Explore a hashtag</p>
                <p className="text-sm" style={{ color: "#A8967E" }}>
                  Search any hashtag and see top posts, recent posts, and average engagement.
                </p>
              </div>
            )}
          </>
        )}

        {/* ── Sets Tab ── */}
        {mainTab === "sets" && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-sm" style={{ color: "#A8967E" }}>
                Save hashtag groups for quick copy-paste into your posts.
              </p>
              <button onClick={() => setShowNewSet(!showNewSet)}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-bold"
                style={{ backgroundColor: "#F59E0B", color: "white" }}>
                {showNewSet ? <X className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
                {showNewSet ? "Cancel" : "New set"}
              </button>
            </div>

            {/* New set form */}
            {showNewSet && (
              <div className="rounded-xl p-5 space-y-3" style={{ ...cardStyle, border: "1px solid rgba(245,158,11,0.3)" }}>
                <h3 className="text-sm font-bold" style={{ color: "#292524" }}>New hashtag set</h3>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-semibold block mb-1" style={{ color: "#78614E" }}>Name *</label>
                    <input value={newSet.name} onChange={e => setNewSet(n => ({ ...n, name: e.target.value }))}
                      placeholder="Ex: Travel vibes" className="w-full px-3 py-2 text-sm rounded-lg focus:outline-none"
                      style={{ border: "1px solid rgba(245,215,160,0.4)", backgroundColor: "#FFF8F0", color: "#292524" }} />
                  </div>
                  <div>
                    <label className="text-xs font-semibold block mb-1" style={{ color: "#78614E" }}>Category</label>
                    <input value={newSet.category} onChange={e => setNewSet(n => ({ ...n, category: e.target.value }))}
                      placeholder="Ex: Niche, Brand, Event" className="w-full px-3 py-2 text-sm rounded-lg focus:outline-none"
                      style={{ border: "1px solid rgba(245,215,160,0.4)", backgroundColor: "#FFF8F0", color: "#292524" }} />
                  </div>
                </div>
                <div>
                  <label className="text-xs font-semibold block mb-1" style={{ color: "#78614E" }}>Platform</label>
                  <select value={newSet.platform} onChange={e => setNewSet(n => ({ ...n, platform: e.target.value }))}
                    aria-label="Platform"
                    className="px-3 py-2 text-sm rounded-lg focus:outline-none"
                    style={{ border: "1px solid rgba(245,215,160,0.4)", backgroundColor: "#FFF8F0", color: "#292524" }}>
                    {PLATFORMS.map(p => <option key={p} value={p}>{p.charAt(0).toUpperCase() + p.slice(1)}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-semibold block mb-1" style={{ color: "#78614E" }}>Hashtags *</label>
                  <textarea value={newSet.hashtags} onChange={e => setNewSet(n => ({ ...n, hashtags: e.target.value }))}
                    placeholder="#hashtag1 #hashtag2 #hashtag3 ..." rows={4}
                    className="w-full px-3 py-2 text-sm rounded-lg focus:outline-none resize-none font-mono"
                    style={{ border: "1px solid rgba(245,215,160,0.4)", backgroundColor: "#FFF8F0", color: "#292524" }} />
                  <p className="text-xs mt-1" style={{ color: "#C4AA8A" }}>
                    {newSet.hashtags.trim().split(/\s+/).filter(h => h.startsWith("#")).length} hashtags
                  </p>
                </div>
                {setError && (
                  <p className="text-xs px-3 py-2 rounded-lg"
                    style={{ backgroundColor: "rgba(239,68,68,0.08)", color: "#DC2626" }}>{setError}</p>
                )}
                <button onClick={handleSaveSet} disabled={savingSet}
                  className="px-5 py-2.5 rounded-lg text-sm font-bold flex items-center gap-2"
                  style={{ backgroundColor: "#F59E0B", color: "white", opacity: savingSet ? 0.7 : 1 }}>
                  {savingSet ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                  Save set
                </button>
              </div>
            )}

            {/* Sets grid */}
            {setsLoading ? (
              <div className="flex justify-center py-10">
                <Loader2 className="w-6 h-6 animate-spin" style={{ color: "#F59E0B" }} />
              </div>
            ) : sets.length === 0 ? (
              <div className="rounded-xl p-12 text-center" style={cardStyle}>
                <BookOpen className="w-12 h-12 mx-auto mb-4" style={{ color: "#C4AA8A" }} />
                <p className="font-semibold mb-1" style={{ color: "#292524" }}>No sets yet</p>
                <p className="text-sm" style={{ color: "#A8967E" }}>
                  Create your first hashtag set to quickly copy-paste into posts.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
                {sets.map(s => (
                  <SetCard key={s.id} set={s} onCopy={handleCopySet} onDelete={handleDeleteSet} />
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
