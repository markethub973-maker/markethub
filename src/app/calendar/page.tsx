"use client";

import { useState, useEffect, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import Header from "@/components/layout/Header";
import AiImageQuickGen from "@/components/calendar/AiImageQuickGen";
import AssetPicker from "@/components/calendar/AssetPicker";
import HashtagSuggester from "@/components/calendar/HashtagSuggester";
import CaptionVariants from "@/components/calendar/CaptionVariants";
import AltTextButton from "@/components/calendar/AltTextButton";
import FileDropZone from "@/components/ui/FileDropZone";
import EngagementPredictor from "@/components/calendar/EngagementPredictor";
import {
  ChevronLeft, ChevronRight, Plus, X, Instagram, Facebook, Clock,
  Edit3, Trash2, Check, CalendarDays, LayoutGrid, List, Loader2, RefreshCw, Zap, Send,
} from "lucide-react";

const cardStyle = { backgroundColor: "var(--color-bg-secondary)", border: "1px solid rgba(245,215,160,0.25)", boxShadow: "0 1px 3px rgba(120,97,78,0.08)" };

const PLATFORMS = [
  { id: "instagram", label: "Instagram", color: "#E1306C", icon: Instagram },
  { id: "facebook", label: "Facebook", color: "#1877F2", icon: Facebook },
  { id: "tiktok", label: "TikTok", color: "#FF0050" },
  { id: "linkedin", label: "LinkedIn", color: "#0A66C2" },
  { id: "youtube", label: "YouTube", color: "#FF0000" },
  { id: "twitter", label: "X / Twitter", color: "#000000" },
  { id: "pinterest", label: "Pinterest", color: "#E60023" },
  { id: "threads", label: "Threads", color: "#101010" },
];

const STATUSES = [
  { id: "draft", label: "Draft", color: "#A8967E" },
  { id: "scheduled", label: "Scheduled", color: "#3B82F6" },
  { id: "published", label: "Published", color: "#22C55E" },
];

type Post = {
  id: string;
  title: string;
  caption: string;
  platform: string;
  status: string;
  date: string;
  time: string;
  client: string;
  hashtags: string;
  image_url: string;
  first_comment: string;
};

function getDaysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate();
}
function getFirstDayOfWeek(year: number, month: number) {
  const day = new Date(year, month, 1).getDay();
  return day === 0 ? 6 : day - 1;
}

const MONTHS = ["January","February","March","April","May","June","July","August","September","October","November","December"];
const DAYS = ["Mon","Tue","Wed","Thu","Fri","Sat","Sun"];

const EMPTY_FORM = { title: "", caption: "", platform: "instagram", status: "scheduled", date: "", time: "12:00", client: "", hashtags: "", image_url: "", first_comment: "" };

export default function CalendarPage() {
  const searchParams = useSearchParams();
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth());
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [publishResult, setPublishResult] = useState<{ ok: boolean; msg: string } | null>(null);
  const [error, setError] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editingPost, setEditingPost] = useState<Post | null>(null);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [view, setView] = useState<"month" | "list">("month");
  const [filterPlatform, setFilterPlatform] = useState("all");
  const [calSearch, setCalSearch] = useState("");
  const [form, setForm] = useState(EMPTY_FORM);
  const [bestTime, setBestTime] = useState<{ topSlots: { dayName: string; label: string; score: number }[]; hasRealData: boolean } | null>(null);

  useEffect(() => {
    const q = searchParams.get("q");
    if (q) { setCalSearch(q.toLowerCase()); setView("list"); }
    else setCalSearch("");
  }, [searchParams]);

  const monthKey = `${year}-${String(month + 1).padStart(2, "0")}`;

  const fetchPosts = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`/api/calendar?month=${monthKey}`);
      if (res.status === 401) { setError("Please log in to view your calendar."); setLoading(false); return; }
      const data = await res.json();
      if (data.error) { setError(data.error); } else { setPosts(data.posts || []); }
    } catch {
      setError("Failed to load posts");
    }
    setLoading(false);
  }, [monthKey]);

  useEffect(() => { fetchPosts(); }, [fetchPosts]);

  useEffect(() => {
    fetch(`/api/analytics/best-time?platform=${filterPlatform === "all" ? "instagram" : filterPlatform}`)
      .then(r => r.json()).then(d => { if (d.topSlots) setBestTime(d); }).catch(() => {});
  }, [filterPlatform]);

  const openNew = (date?: string) => {
    setEditingPost(null);
    setForm({
      ...EMPTY_FORM,
      date: date || `${year}-${String(month + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`,
    });
    setShowForm(true);
    setError("");
  };

  const openEdit = (post: Post) => {
    setEditingPost(post);
    setForm({ title: post.title, caption: post.caption, platform: post.platform, status: post.status, date: post.date, time: post.time, client: post.client, hashtags: post.hashtags, image_url: post.image_url || "", first_comment: post.first_comment || "" });
    setShowForm(true);
    setError("");
  };

  const handleSave = async () => {
    if (!form.title.trim() || !form.date) return;
    setSaving(true);
    setError("");
    try {
      if (editingPost) {
        const res = await fetch(`/api/calendar/${editingPost.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(form),
        });
        const data = await res.json();
        if (data.error) { setError(data.error); setSaving(false); return; }
        setPosts(prev => prev.map(p => p.id === editingPost.id ? data.post : p));
      } else {
        const res = await fetch("/api/calendar", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(form),
        });
        const data = await res.json();
        if (data.error) { setError(data.error); setSaving(false); return; }
        // Only add to current list if same month
        if (form.date.startsWith(monthKey)) {
          setPosts(prev => [...prev, data.post]);
        }
      }
      setShowForm(false);
      setEditingPost(null);
    } catch {
      setError("Failed to save post");
    }
    setSaving(false);
  };

  const handlePublishNow = async (id: string) => {
    setPublishing(true);
    setPublishResult(null);
    try {
      const res = await fetch("/api/calendar/publish", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ post_id: id }),
      });
      const data = await res.json();
      if (data.error) {
        setPublishResult({ ok: false, msg: data.error });
      } else {
        setPublishResult({ ok: true, msg: `Published! ID: ${data.externalId || "ok"}` });
        setPosts(prev => prev.map(p => p.id === id ? { ...p, status: "published" } : p));
      }
    } catch {
      setPublishResult({ ok: false, msg: "Network error — try again" });
    }
    setPublishing(false);
  };

  const handleDelete = async (id: string) => {
    setSaving(true);
    try {
      const res = await fetch(`/api/calendar/${id}`, { method: "DELETE" });
      const data = await res.json();
      if (data.error) { setError(data.error); setSaving(false); return; }
      setPosts(prev => prev.filter(p => p.id !== id));
      setShowForm(false);
      setEditingPost(null);
    } catch {
      setError("Failed to delete post");
    }
    setSaving(false);
  };

  // Quick status change without opening form
  const cycleStatus = async (post: Post, e: React.MouseEvent) => {
    e.stopPropagation();
    const order: Post["status"][] = ["draft", "scheduled", "published"];
    const next = order[(order.indexOf(post.status) + 1) % order.length];
    const res = await fetch(`/api/calendar/${post.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: next }),
    });
    const data = await res.json();
    if (!data.error) setPosts(prev => prev.map(p => p.id === post.id ? { ...p, status: next } : p));
  };

  const prevMonth = () => { if (month === 0) { setMonth(11); setYear(y => y - 1); } else setMonth(m => m - 1); };
  const nextMonth = () => { if (month === 11) { setMonth(0); setYear(y => y + 1); } else setMonth(m => m + 1); };

  const daysInMonth = getDaysInMonth(year, month);
  const firstDay = getFirstDayOfWeek(year, month);
  const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;

  const getPostsForDate = (date: string) =>
    posts.filter(p => p.date === date && (filterPlatform === "all" || p.platform === filterPlatform));

  const filteredPosts = filterPlatform === "all" ? posts : posts.filter(p => p.platform === filterPlatform);
  const monthPosts = filteredPosts.filter(p =>
    !calSearch || p.title.toLowerCase().includes(calSearch) || p.caption.toLowerCase().includes(calSearch)
  );

  const stats = {
    total: monthPosts.length,
    draft: monthPosts.filter(p => p.status === "draft").length,
    scheduled: monthPosts.filter(p => p.status === "scheduled").length,
    published: monthPosts.filter(p => p.status === "published").length,
  };

  return (
    <div>
      <Header title="Content Calendar" subtitle="Plan and organize content for all platforms" />
      <div className="p-6 space-y-5">

        {/* Stats + Actions */}
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex gap-2 flex-wrap">
            {[
              { label: `${stats.total} posts`, color: "var(--color-text)" },
              { label: `${stats.draft} draft`, color: "#A8967E" },
              { label: `${stats.scheduled} scheduled`, color: "#3B82F6" },
              { label: `${stats.published} published`, color: "#22C55E" },
            ].map((s, i) => (
              <span key={i} className="text-xs font-semibold px-2 py-1 rounded-lg"
                style={{ backgroundColor: `${s.color}10`, color: s.color, border: `1px solid ${s.color}20` }}>
                {s.label}
              </span>
            ))}
          </div>
          <div className="ml-auto flex gap-2 items-center">
            <button type="button" onClick={fetchPosts} disabled={loading}
              className="p-1.5 rounded-lg" style={{ color: "#A8967E" }} title="Refresh">
              <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
            </button>
            <select value={filterPlatform} onChange={e => setFilterPlatform(e.target.value)}
              aria-label="Filter by platform"
              className="px-2 py-1.5 text-xs rounded-lg focus:outline-none"
              style={{ border: "1px solid rgba(200,180,150,0.35)", backgroundColor: "white", color: "#2D2620" }}>
              <option value="all">All platforms</option>
              {PLATFORMS.map(p => <option key={p.id} value={p.id}>{p.label}</option>)}
            </select>
            <div className="flex rounded-lg overflow-hidden" style={{ border: "1px solid rgba(245,215,160,0.3)" }}>
              {([{ key: "month", icon: <LayoutGrid className="w-3.5 h-3.5" /> }, { key: "list", icon: <List className="w-3.5 h-3.5" /> }] as const).map(v => (
                <button key={v.key} type="button" onClick={() => setView(v.key)}
                  className={`px-2.5 py-1.5 ${view !== v.key ? "btn-pill" : ""}`}
                  style={view === v.key ? { backgroundColor: "rgba(245,158,11,0.15)", color: "var(--color-primary-hover)" } : undefined}>
                  {v.icon}
                </button>
              ))}
            </div>
            <button type="button" onClick={() => openNew()}
              className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-sm font-bold"
              style={{ backgroundColor: "var(--color-primary)", color: "white" }}>
              <Plus className="w-4 h-4" />New post
            </button>
          </div>
        </div>

        {/* Error / auth notice */}
        {error && !showForm && (
          <div className="rounded-xl px-4 py-3 text-sm" style={{ backgroundColor: "rgba(239,68,68,0.08)", color: "#DC2626", border: "1px solid rgba(239,68,68,0.2)" }}>
            {error}
          </div>
        )}

        {/* Loading skeleton */}
        {loading && (
          <div className="flex justify-center py-12">
            <Loader2 className="w-6 h-6 animate-spin" style={{ color: "var(--color-primary)" }} />
          </div>
        )}

        {/* Best Time to Post widget */}
        {bestTime && bestTime.topSlots.length > 0 && (
          <div className="rounded-xl px-5 py-3 flex items-center gap-4 flex-wrap"
            style={{ backgroundColor: "rgba(245,158,11,0.06)", border: "1px solid rgba(245,158,11,0.15)" }}>
            <div className="flex items-center gap-1.5 shrink-0">
              <Zap className="w-3.5 h-3.5" style={{ color: "var(--color-primary)" }} />
              <span className="text-xs font-bold" style={{ color: "var(--color-primary-hover)" }}>
                Best time to post {filterPlatform !== "all" ? `(${PLATFORMS.find(p => p.id === filterPlatform)?.label})` : "(Instagram)"}
                {!bestTime.hasRealData && <span className="font-normal ml-1" style={{ color: "#A8967E" }}>· industry avg</span>}
              </span>
            </div>
            <div className="flex gap-2 flex-wrap">
              {bestTime.topSlots.map((s, i) => (
                <span key={i} className="text-xs px-2.5 py-1 rounded-full font-semibold"
                  style={{ backgroundColor: i === 0 ? "var(--color-primary)" : "rgba(245,158,11,0.12)", color: i === 0 ? "white" : "var(--color-primary-hover)" }}>
                  {s.dayName.slice(0, 3)} {s.label}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Month View */}
        {!loading && view === "month" && (
          <div className="rounded-xl overflow-hidden" style={cardStyle}>
            <div className="flex items-center justify-between px-5 py-3" style={{ borderBottom: "1px solid rgba(245,215,160,0.15)" }}>
              <button type="button" onClick={prevMonth} className="p-1 rounded-lg" style={{ color: "#78614E" }}>
                <ChevronLeft className="w-5 h-5" />
              </button>
              <h3 className="font-bold text-lg" style={{ color: "var(--color-text)" }}>{MONTHS[month]} {year}</h3>
              <button type="button" onClick={nextMonth} className="p-1 rounded-lg" style={{ color: "#78614E" }}>
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>
            <div className="grid grid-cols-7">
              {DAYS.map(d => (
                <div key={d} className="px-2 py-2 text-center text-xs font-semibold"
                  style={{ color: "#A8967E", borderBottom: "1px solid rgba(245,215,160,0.1)" }}>{d}</div>
              ))}
            </div>
            <div className="grid grid-cols-7">
              {Array.from({ length: firstDay }).map((_, i) => (
                <div key={`e-${i}`} className="min-h-24 p-1"
                  style={{ borderBottom: "1px solid rgba(200,180,150,0.2)", borderRight: "1px solid rgba(200,180,150,0.2)" }} />
              ))}
              {Array.from({ length: daysInMonth }).map((_, i) => {
                const day = i + 1;
                const dateStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
                const dayPosts = getPostsForDate(dateStr);
                const isToday = dateStr === today;
                const isSelected = dateStr === selectedDate;
                return (
                  <div key={day} className="min-h-24 p-1 cursor-pointer transition-colors"
                    style={{
                      borderBottom: "1px solid rgba(200,180,150,0.2)",
                      borderRight: "1px solid rgba(200,180,150,0.2)",
                      backgroundColor: isSelected ? "rgba(245,158,11,0.12)" : isToday ? "rgba(245,158,11,0.06)" : "transparent",
                    }}
                    onClick={() => setSelectedDate(dateStr)}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-semibold w-6 h-6 flex items-center justify-center rounded-full"
                        style={{ backgroundColor: isToday ? "var(--color-primary)" : "transparent", color: isToday ? "white" : "var(--color-text)" }}>
                        {day}
                      </span>
                      <button type="button" onClick={e => { e.stopPropagation(); openNew(dateStr); }}
                        className="opacity-0 hover:opacity-100 p-0.5 rounded" style={{ color: "#C4AA8A" }}
                        title="Add post">
                        <Plus className="w-3 h-3" />
                      </button>
                    </div>
                    <div className="space-y-0.5">
                      {dayPosts.slice(0, 3).map(post => {
                        const plat = PLATFORMS.find(p => p.id === post.platform);
                        const status = STATUSES.find(s => s.id === post.status);
                        return (
                          <div key={post.id}
                            className="text-xs px-1.5 py-0.5 rounded truncate cursor-pointer"
                            style={{ backgroundColor: `${plat?.color || "#A8967E"}15`, color: plat?.color || "#A8967E", borderLeft: `2px solid ${status?.color || "#A8967E"}` }}
                            onClick={e => { e.stopPropagation(); openEdit(post); }}>
                            {post.title}
                          </div>
                        );
                      })}
                      {dayPosts.length > 3 && (
                        <p className="text-xs text-center" style={{ color: "#C4AA8A" }}>+{dayPosts.length - 3}</p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* List View */}
        {!loading && view === "list" && (
          <div className="space-y-2">
            {monthPosts.length === 0 ? (
              <div className="rounded-xl p-8 text-center" style={cardStyle}>
                <CalendarDays className="w-8 h-8 mx-auto mb-3" style={{ color: "#C4AA8A" }} />
                <p className="text-sm font-semibold" style={{ color: "var(--color-text)" }}>No posts in {MONTHS[month]}</p>
                <button type="button" onClick={() => openNew()}
                  className="mt-3 px-4 py-2 rounded-lg text-xs font-bold" style={{ backgroundColor: "var(--color-primary)", color: "white" }}>
                  <Plus className="w-3 h-3 inline mr-1" />Add post
                </button>
              </div>
            ) : (
              [...monthPosts]
                .sort((a, b) => a.date.localeCompare(b.date) || a.time.localeCompare(b.time))
                .map(post => {
                  const plat = PLATFORMS.find(p => p.id === post.platform);
                  const status = STATUSES.find(s => s.id === post.status);
                  return (
                    <div key={post.id} className="rounded-xl px-5 py-3 flex items-center gap-4 cursor-pointer hover:shadow-sm transition-shadow"
                      style={cardStyle} onClick={() => openEdit(post)}>
                      <div className="w-2 h-10 rounded-full" style={{ backgroundColor: plat?.color || "#A8967E" }} />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold" style={{ color: "var(--color-text)" }}>{post.title}</p>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="text-xs" style={{ color: plat?.color }}>{plat?.label}</span>
                          <span className="text-xs" style={{ color: "#C4AA8A" }}>{post.date}</span>
                          <span className="text-xs flex items-center gap-0.5" style={{ color: "#A8967E" }}>
                            <Clock className="w-3 h-3" />{post.time}
                          </span>
                          {post.client && <span className="text-xs" style={{ color: "#A8967E" }}>| {post.client}</span>}
                        </div>
                      </div>
                      {/* Click badge to cycle status */}
                      <button type="button" onClick={e => cycleStatus(post, e)}
                        title="Click to change status"
                        className="text-xs font-semibold px-2 py-0.5 rounded-full transition-opacity hover:opacity-70"
                        style={{ backgroundColor: `${status?.color}15`, color: status?.color }}>
                        {status?.label}
                      </button>
                      <Edit3 className="w-3.5 h-3.5 shrink-0" style={{ color: "#C4AA8A" }} />
                    </div>
                  );
                })
            )}
          </div>
        )}

        {/* Post Form Modal */}
        {showForm && (
          <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4"
            onClick={() => { setShowForm(false); setError(""); }}>
            <div className="w-full max-w-lg rounded-xl p-6 space-y-4 max-h-[90vh] overflow-y-auto"
              style={{ backgroundColor: "#FFFFFF", border: "2px solid #D4A574", boxShadow: "0 8px 32px rgba(0,0,0,0.2)" }}
              onClick={e => e.stopPropagation()}>
              <div className="flex items-center justify-between">
                <h3 className="font-bold" style={{ color: "var(--color-text)" }}>{editingPost ? "Edit post" : "New post"}</h3>
                <button type="button" onClick={() => { setShowForm(false); setError(""); }} style={{ color: "#A8967E" }}>
                  <X className="w-5 h-5" />
                </button>
              </div>

              {error && (
                <p className="text-xs font-semibold px-3 py-2 rounded-lg"
                  style={{ backgroundColor: "rgba(239,68,68,0.08)", color: "#DC2626" }}>{error}</p>
              )}

              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-semibold mb-1" style={{ color: "#78614E" }}>Title *</label>
                  <input type="text" placeholder="Ex: New product reel" value={form.title}
                    onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                    className="w-full px-3 py-2 text-sm rounded-lg focus:outline-none"
                    style={{ border: "1px solid rgba(200,180,150,0.35)", backgroundColor: "white", color: "#2D2620" }} />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold mb-1" style={{ color: "#78614E" }}>Date</label>
                    <input type="date" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))}
                      className="w-full px-3 py-2 text-sm rounded-lg focus:outline-none"
                      style={{ border: "1px solid rgba(200,180,150,0.35)", backgroundColor: "white", color: "#2D2620" }} />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold mb-1" style={{ color: "#78614E" }}>Time</label>
                    <input type="time" value={form.time} onChange={e => setForm(f => ({ ...f, time: e.target.value }))}
                      className="w-full px-3 py-2 text-sm rounded-lg focus:outline-none"
                      style={{ border: "1px solid rgba(200,180,150,0.35)", backgroundColor: "white", color: "#2D2620" }} />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold mb-1" style={{ color: "#78614E" }}>Platform</label>
                    <select value={form.platform} onChange={e => setForm(f => ({ ...f, platform: e.target.value }))}
                      aria-label="Platform"
                      className="w-full px-3 py-2 text-sm rounded-lg focus:outline-none"
                      style={{ border: "1px solid rgba(200,180,150,0.35)", backgroundColor: "white", color: "#2D2620" }}>
                      {PLATFORMS.map(p => <option key={p.id} value={p.id}>{p.label}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold mb-1" style={{ color: "#78614E" }}>
                      Status <span style={{ color: "#C4AA8A", fontWeight: 400 }}>— Scheduled = auto-publish at date/time</span>
                    </label>
                    <select value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value }))}
                      aria-label="Status"
                      className="w-full px-3 py-2 text-sm rounded-lg focus:outline-none"
                      style={{ border: "1px solid rgba(200,180,150,0.35)", backgroundColor: "white", color: "#2D2620" }}>
                      {STATUSES.map(s => <option key={s.id} value={s.id}>{s.label}</option>)}
                    </select>
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-semibold mb-1" style={{ color: "#78614E" }}>Client (optional)</label>
                  <input type="text" placeholder="Ex: Brand XYZ" value={form.client}
                    onChange={e => setForm(f => ({ ...f, client: e.target.value }))}
                    className="w-full px-3 py-2 text-sm rounded-lg focus:outline-none"
                    style={{ border: "1px solid rgba(200,180,150,0.35)", backgroundColor: "white", color: "#2D2620" }} />
                </div>
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-xs font-semibold" style={{ color: "#78614E" }}>Caption</label>
                    <CaptionVariants
                      caption={form.caption}
                      platform={form.platform}
                      onPick={(c) => setForm(f => ({ ...f, caption: c }))}
                    />
                  </div>
                  <textarea placeholder="Post text..." value={form.caption}
                    onChange={e => setForm(f => ({ ...f, caption: e.target.value }))}
                    className="w-full px-3 py-2 text-sm rounded-lg focus:outline-none resize-none" rows={3}
                    style={{ border: "1px solid rgba(200,180,150,0.35)", backgroundColor: "white", color: "#2D2620" }} />
                </div>
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-xs font-semibold" style={{ color: "#78614E" }}>Hashtags</label>
                    <HashtagSuggester
                      caption={form.caption}
                      platform={form.platform}
                      currentHashtags={form.hashtags}
                      onAdd={(tags) => setForm(f => ({ ...f, hashtags: tags }))}
                    />
                  </div>
                  <input type="text" placeholder="#marketing #socialmedia #brand" value={form.hashtags}
                    onChange={e => setForm(f => ({ ...f, hashtags: e.target.value }))}
                    className="w-full px-3 py-2 text-sm rounded-lg focus:outline-none"
                    style={{ border: "1px solid rgba(200,180,150,0.35)", backgroundColor: "white", color: "#2D2620" }} />
                </div>
                <div>
                  <label className="block text-xs font-semibold mb-1" style={{ color: "#78614E" }}>
                    First comment <span style={{ color: "#C4AA8A", fontWeight: 400 }}>— posted automatically after publish (IG)</span>
                  </label>
                  <textarea placeholder="Paste your hashtags here to keep caption clean..." value={form.first_comment}
                    onChange={e => setForm(f => ({ ...f, first_comment: e.target.value }))}
                    className="w-full px-3 py-2 text-sm rounded-lg focus:outline-none resize-none" rows={2}
                    style={{ border: "1px solid rgba(200,180,150,0.35)", backgroundColor: "white", color: "#2D2620" }} />
                </div>
                <div className="md:col-span-2">
                  <div className="flex items-center justify-between mb-1 gap-2 flex-wrap">
                    <label className="block text-xs font-semibold" style={{ color: "#78614E" }}>
                      Image URL <span style={{ color: "#C4AA8A", fontWeight: 400 }}>— required for auto-posting to Instagram</span>
                    </label>
                    <div className="flex items-center gap-1.5">
                      <AssetPicker onSelect={(url) => setForm(f => ({ ...f, image_url: url }))} />
                      <AiImageQuickGen
                        caption={form.caption}
                        onGenerated={(url) => setForm(f => ({ ...f, image_url: url }))}
                      />
                    </div>
                  </div>
                  <FileDropZone
                    accept="image/*,video/*"
                    onFileUrl={(url) => setForm(f => ({ ...f, image_url: url }))}
                    currentUrl={form.image_url}
                    label="Drop image/video or click to upload"
                    folder="calendar-media"
                  />
                  <input type="url" placeholder="Or paste URL..." value={form.image_url}
                    onChange={e => setForm(f => ({ ...f, image_url: e.target.value }))}
                    className="w-full px-3 py-2 text-sm rounded-lg focus:outline-none"
                    style={{ border: "1px solid var(--color-border)", backgroundColor: "var(--color-bg)", color: "var(--color-text)" }} />
                  {form.image_url && (
                    <div className="mt-2 flex items-start gap-2">
                      <img src={form.image_url} alt="Preview" className="rounded-lg max-h-32 object-cover"
                        style={{ border: "1px solid rgba(245,215,160,0.3)" }}
                        onError={e => { (e.target as HTMLImageElement).style.display = "none"; }} />
                      <AltTextButton imageUrl={form.image_url} caption={form.caption} />
                    </div>
                  )}
                </div>
              </div>

              <div className="pt-2">
                <EngagementPredictor
                  caption={form.caption}
                  platform={form.platform}
                  hashtags={form.hashtags}
                  hasImage={Boolean(form.image_url)}
                  scheduledFor={form.date && form.time ? `${form.date}T${form.time}:00Z` : undefined}
                />
              </div>

              <div className="flex items-center gap-3 pt-2">
                <button type="button" onClick={handleSave}
                  disabled={saving || !form.title.trim() || !form.date}
                  className="flex items-center gap-1.5 px-5 py-2.5 rounded-lg text-sm font-bold disabled:opacity-50"
                  style={{ backgroundColor: "var(--color-primary)", color: "white" }}>
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                  {editingPost ? "Save" : "Add"}
                </button>
                {editingPost && (
                  <button type="button" onClick={() => handlePublishNow(editingPost.id)} disabled={publishing || saving}
                    className="flex items-center gap-1.5 px-5 py-2.5 rounded-lg text-sm font-bold disabled:opacity-50"
                    style={{ backgroundColor: "#16A34A", color: "white" }}>
                    {publishing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                    Publish Now
                  </button>
                )}
                {editingPost && (
                  <button type="button" onClick={() => handleDelete(editingPost.id)} disabled={saving}
                    className="flex items-center gap-1.5 px-4 py-2.5 rounded-lg text-sm font-semibold disabled:opacity-50"
                    style={{ color: "#EF4444", backgroundColor: "rgba(239,68,68,0.08)" }}>
                    <Trash2 className="w-4 h-4" />Delete
                  </button>
                )}
                <button type="button" onClick={() => { setShowForm(false); setError(""); setPublishResult(null); }}
                  className="px-4 py-2.5 rounded-lg text-sm font-semibold" style={{ color: "#A8967E" }}>
                  Cancel
                </button>
              </div>

              {publishResult && (
                <div className="flex items-center gap-2 p-3 rounded-lg mt-2"
                  style={{
                    backgroundColor: publishResult.ok ? "rgba(22,163,74,0.08)" : "rgba(239,68,68,0.06)",
                    border: `1px solid ${publishResult.ok ? "rgba(22,163,74,0.2)" : "rgba(239,68,68,0.2)"}`,
                  }}>
                  {publishResult.ok
                    ? <Check className="w-4 h-4 flex-shrink-0" style={{ color: "#16A34A" }} />
                    : <X className="w-4 h-4 flex-shrink-0" style={{ color: "#EF4444" }} />}
                  <p className="text-sm" style={{ color: publishResult.ok ? "#16A34A" : "#EF4444" }}>
                    {publishResult.msg}
                  </p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Empty state for calendar */}
        {!loading && !error && posts.length === 0 && (
          <div className="rounded-xl px-4 py-3 text-sm text-center" style={{ backgroundColor: "rgba(99,102,241,0.06)", color: "#6366F1", border: "1px solid rgba(99,102,241,0.15)" }}>
            No scheduled posts yet. Click any day on the calendar above to create your first post.
          </div>
        )}
      </div>
    </div>
  );
}
