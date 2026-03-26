"use client";

import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import Header from "@/components/layout/Header";
import {
  ChevronLeft, ChevronRight, Plus, X, Instagram, Facebook, Clock,
  Edit3, Trash2, Check, CalendarDays, LayoutGrid, List
} from "lucide-react";

const cardStyle = { backgroundColor: "#FFFCF7", border: "1px solid rgba(245,215,160,0.25)", boxShadow: "0 1px 3px rgba(120,97,78,0.08)" };

const PLATFORMS = [
  { id: "instagram", label: "Instagram", color: "#E1306C", icon: Instagram },
  { id: "facebook", label: "Facebook", color: "#1877F2", icon: Facebook },
  { id: "tiktok", label: "TikTok", color: "#FF0050" },
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
  date: string; // YYYY-MM-DD
  time: string; // HH:MM
  client: string;
  hashtags: string;
};

function getDaysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate();
}

function getFirstDayOfWeek(year: number, month: number) {
  const day = new Date(year, month, 1).getDay();
  return day === 0 ? 6 : day - 1; // Monday = 0
}

const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

export default function CalendarPage() {
  const searchParams = useSearchParams();
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth());
  const [posts, setPosts] = useState<Post[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editingPost, setEditingPost] = useState<Post | null>(null);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [view, setView] = useState<"month" | "list">("month");
  const [filterPlatform, setFilterPlatform] = useState<string>("all");
  const [calSearch, setCalSearch] = useState("");

  // Handle ?q= from header search → switch to list view and filter
  useEffect(() => {
    const q = searchParams.get("q");
    if (q) { setCalSearch(q.toLowerCase()); setView("list"); }
    else setCalSearch("");
  }, [searchParams]);

  const [form, setForm] = useState<Omit<Post, "id">>({
    title: "", caption: "", platform: "instagram", status: "draft",
    date: "", time: "12:00", client: "", hashtags: "",
  });

  useEffect(() => {
    const saved = localStorage.getItem("mh_calendar_posts");
    if (saved) setPosts(JSON.parse(saved));
  }, []);

  const savePosts = (p: Post[]) => {
    setPosts(p);
    localStorage.setItem("mh_calendar_posts", JSON.stringify(p));
  };

  const openNew = (date?: string) => {
    setEditingPost(null);
    setForm({
      title: "", caption: "", platform: "instagram", status: "draft",
      date: date || `${year}-${String(month + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`,
      time: "12:00", client: "", hashtags: "",
    });
    setShowForm(true);
  };

  const openEdit = (post: Post) => {
    setEditingPost(post);
    setForm({ title: post.title, caption: post.caption, platform: post.platform, status: post.status, date: post.date, time: post.time, client: post.client, hashtags: post.hashtags });
    setShowForm(true);
  };

  const handleSave = () => {
    if (!form.title.trim() || !form.date) return;
    if (editingPost) {
      savePosts(posts.map(p => p.id === editingPost.id ? { ...editingPost, ...form } : p));
    } else {
      savePosts([...posts, { id: Date.now().toString(), ...form }]);
    }
    setShowForm(false);
    setEditingPost(null);
  };

  const handleDelete = (id: string) => {
    savePosts(posts.filter(p => p.id !== id));
    setShowForm(false);
  };

  const prevMonth = () => { if (month === 0) { setMonth(11); setYear(y => y - 1); } else setMonth(m => m - 1); };
  const nextMonth = () => { if (month === 11) { setMonth(0); setYear(y => y + 1); } else setMonth(m => m + 1); };

  const daysInMonth = getDaysInMonth(year, month);
  const firstDay = getFirstDayOfWeek(year, month);
  const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;

  const getPostsForDate = (date: string) => {
    return posts.filter(p => p.date === date && (filterPlatform === "all" || p.platform === filterPlatform));
  };

  const filteredPosts = filterPlatform === "all" ? posts : posts.filter(p => p.platform === filterPlatform);
  const monthPosts = filteredPosts
    .filter(p => p.date.startsWith(`${year}-${String(month + 1).padStart(2, "0")}`))
    .filter(p => !calSearch || p.title.toLowerCase().includes(calSearch) || p.caption.toLowerCase().includes(calSearch));

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
          <div className="flex gap-2">
            {[
              { label: `${stats.total} posts`, color: "#292524" },
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
          <div className="ml-auto flex gap-2">
            {/* Platform filter */}
            <select value={filterPlatform} onChange={e => setFilterPlatform(e.target.value)}
              className="px-2 py-1.5 text-xs rounded-lg focus:outline-none"
              style={{ border: "1px solid rgba(245,215,160,0.3)", backgroundColor: "#FFF8F0", color: "#292524" }}>
              <option value="all">All platforms</option>
              {PLATFORMS.map(p => <option key={p.id} value={p.id}>{p.label}</option>)}
            </select>
            {/* View toggle */}
            <div className="flex rounded-lg overflow-hidden" style={{ border: "1px solid rgba(245,215,160,0.3)" }}>
              {[
                { key: "month" as const, icon: <LayoutGrid className="w-3.5 h-3.5" /> },
                { key: "list" as const, icon: <List className="w-3.5 h-3.5" /> },
              ].map(v => (
                <button key={v.key} type="button" onClick={() => setView(v.key)}
                  className="px-2.5 py-1.5"
                  style={{ backgroundColor: view === v.key ? "rgba(245,158,11,0.15)" : "#FFF8F0", color: view === v.key ? "#D97706" : "#A8967E" }}>
                  {v.icon}
                </button>
              ))}
            </div>
            <button type="button" onClick={() => openNew()}
              className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-sm font-bold"
              style={{ backgroundColor: "#F59E0B", color: "white" }}>
              <Plus className="w-4 h-4" />New post
            </button>
          </div>
        </div>

        {/* Month View */}
        {view === "month" && (
          <div className="rounded-xl overflow-hidden" style={cardStyle}>
            {/* Month header */}
            <div className="flex items-center justify-between px-5 py-3" style={{ borderBottom: "1px solid rgba(245,215,160,0.15)" }}>
              <button type="button" onClick={prevMonth} className="p-1 rounded-lg" style={{ color: "#78614E" }}>
                <ChevronLeft className="w-5 h-5" />
              </button>
              <h3 className="font-bold text-lg" style={{ color: "#292524" }}>{MONTHS[month]} {year}</h3>
              <button type="button" onClick={nextMonth} className="p-1 rounded-lg" style={{ color: "#78614E" }}>
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>
            {/* Day headers */}
            <div className="grid grid-cols-7">
              {DAYS.map(d => (
                <div key={d} className="px-2 py-2 text-center text-xs font-semibold" style={{ color: "#A8967E", borderBottom: "1px solid rgba(245,215,160,0.1)" }}>
                  {d}
                </div>
              ))}
            </div>
            {/* Days grid */}
            <div className="grid grid-cols-7">
              {Array.from({ length: firstDay }).map((_, i) => (
                <div key={`empty-${i}`} className="min-h-24 p-1" style={{ borderBottom: "1px solid rgba(245,215,160,0.06)", borderRight: "1px solid rgba(245,215,160,0.06)" }} />
              ))}
              {Array.from({ length: daysInMonth }).map((_, i) => {
                const day = i + 1;
                const dateStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
                const dayPosts = getPostsForDate(dateStr);
                const isToday = dateStr === today;
                const isSelected = dateStr === selectedDate;

                return (
                  <div key={day}
                    className="min-h-24 p-1 cursor-pointer transition-colors"
                    style={{
                      borderBottom: "1px solid rgba(245,215,160,0.06)",
                      borderRight: "1px solid rgba(245,215,160,0.06)",
                      backgroundColor: isSelected ? "rgba(245,158,11,0.06)" : isToday ? "rgba(245,158,11,0.03)" : "transparent",
                    }}
                    onClick={() => setSelectedDate(dateStr)}>
                    <div className="flex items-center justify-between mb-1">
                      <span className={`text-xs font-semibold w-6 h-6 flex items-center justify-center rounded-full ${isToday ? "text-white" : ""}`}
                        style={{ backgroundColor: isToday ? "#F59E0B" : "transparent", color: isToday ? "white" : "#292524" }}>
                        {day}
                      </span>
                      {dayPosts.length === 0 && (
                        <button type="button" onClick={e => { e.stopPropagation(); openNew(dateStr); }}
                          className="opacity-0 hover:opacity-100 p-0.5 rounded" style={{ color: "#C4AA8A" }}>
                          <Plus className="w-3 h-3" />
                        </button>
                      )}
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
        {view === "list" && (
          <div className="space-y-2">
            {monthPosts.length === 0 ? (
              <div className="rounded-xl p-8 text-center" style={cardStyle}>
                <CalendarDays className="w-8 h-8 mx-auto mb-3" style={{ color: "#C4AA8A" }} />
                <p className="text-sm font-semibold" style={{ color: "#292524" }}>No posts in {MONTHS[month]}</p>
                <button type="button" onClick={() => openNew()}
                  className="mt-3 px-4 py-2 rounded-lg text-xs font-bold" style={{ backgroundColor: "#F59E0B", color: "white" }}>
                  <Plus className="w-3 h-3 inline mr-1" />Add post
                </button>
              </div>
            ) : (
              monthPosts
                .sort((a, b) => a.date.localeCompare(b.date) || a.time.localeCompare(b.time))
                .map(post => {
                  const plat = PLATFORMS.find(p => p.id === post.platform);
                  const status = STATUSES.find(s => s.id === post.status);
                  return (
                    <div key={post.id} className="rounded-xl px-5 py-3 flex items-center gap-4 cursor-pointer hover:shadow-sm transition-shadow"
                      style={cardStyle} onClick={() => openEdit(post)}>
                      <div className="w-2 h-10 rounded-full" style={{ backgroundColor: plat?.color || "#A8967E" }} />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold" style={{ color: "#292524" }}>{post.title}</p>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="text-xs" style={{ color: plat?.color }}>{plat?.label}</span>
                          <span className="text-xs" style={{ color: "#C4AA8A" }}>{post.date}</span>
                          <span className="text-xs flex items-center gap-0.5" style={{ color: "#A8967E" }}><Clock className="w-3 h-3" />{post.time}</span>
                          {post.client && <span className="text-xs" style={{ color: "#A8967E" }}>| {post.client}</span>}
                        </div>
                      </div>
                      <span className="text-xs font-semibold px-2 py-0.5 rounded-full"
                        style={{ backgroundColor: `${status?.color}15`, color: status?.color }}>
                        {status?.label}
                      </span>
                    </div>
                  );
                })
            )}
          </div>
        )}

        {/* Post Form Modal */}
        {showForm && (
          <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={() => setShowForm(false)}>
            <div className="w-full max-w-lg rounded-xl p-6 space-y-4" style={{ backgroundColor: "#FFFCF7", border: "1px solid rgba(245,215,160,0.3)" }}
              onClick={e => e.stopPropagation()}>
              <div className="flex items-center justify-between">
                <h3 className="font-bold" style={{ color: "#292524" }}>{editingPost ? "Edit post" : "New post"}</h3>
                <button type="button" onClick={() => setShowForm(false)} style={{ color: "#A8967E" }}><X className="w-5 h-5" /></button>
              </div>

              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-semibold mb-1" style={{ color: "#78614E" }}>Title *</label>
                  <input type="text" placeholder="Ex: New product reel" value={form.title}
                    onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                    className="w-full px-3 py-2 text-sm rounded-lg focus:outline-none"
                    style={{ border: "1px solid rgba(245,215,160,0.3)", backgroundColor: "#FFF8F0", color: "#292524" }} />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold mb-1" style={{ color: "#78614E" }}>Date</label>
                    <input type="date" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))}
                      className="w-full px-3 py-2 text-sm rounded-lg focus:outline-none"
                      style={{ border: "1px solid rgba(245,215,160,0.3)", backgroundColor: "#FFF8F0", color: "#292524" }} />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold mb-1" style={{ color: "#78614E" }}>Time</label>
                    <input type="time" value={form.time} onChange={e => setForm(f => ({ ...f, time: e.target.value }))}
                      className="w-full px-3 py-2 text-sm rounded-lg focus:outline-none"
                      style={{ border: "1px solid rgba(245,215,160,0.3)", backgroundColor: "#FFF8F0", color: "#292524" }} />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold mb-1" style={{ color: "#78614E" }}>Platform</label>
                    <select value={form.platform} onChange={e => setForm(f => ({ ...f, platform: e.target.value }))}
                      className="w-full px-3 py-2 text-sm rounded-lg focus:outline-none"
                      style={{ border: "1px solid rgba(245,215,160,0.3)", backgroundColor: "#FFF8F0", color: "#292524" }}>
                      {PLATFORMS.map(p => <option key={p.id} value={p.id}>{p.label}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold mb-1" style={{ color: "#78614E" }}>Status</label>
                    <select value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value }))}
                      className="w-full px-3 py-2 text-sm rounded-lg focus:outline-none"
                      style={{ border: "1px solid rgba(245,215,160,0.3)", backgroundColor: "#FFF8F0", color: "#292524" }}>
                      {STATUSES.map(s => <option key={s.id} value={s.id}>{s.label}</option>)}
                    </select>
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-semibold mb-1" style={{ color: "#78614E" }}>Client (optional)</label>
                  <input type="text" placeholder="Ex: Brand XYZ" value={form.client}
                    onChange={e => setForm(f => ({ ...f, client: e.target.value }))}
                    className="w-full px-3 py-2 text-sm rounded-lg focus:outline-none"
                    style={{ border: "1px solid rgba(245,215,160,0.3)", backgroundColor: "#FFF8F0", color: "#292524" }} />
                </div>
                <div>
                  <label className="block text-xs font-semibold mb-1" style={{ color: "#78614E" }}>Caption</label>
                  <textarea placeholder="Post text..." value={form.caption}
                    onChange={e => setForm(f => ({ ...f, caption: e.target.value }))}
                    className="w-full px-3 py-2 text-sm rounded-lg focus:outline-none resize-none"
                    rows={3}
                    style={{ border: "1px solid rgba(245,215,160,0.3)", backgroundColor: "#FFF8F0", color: "#292524" }} />
                </div>
                <div>
                  <label className="block text-xs font-semibold mb-1" style={{ color: "#78614E" }}>Hashtags</label>
                  <input type="text" placeholder="#marketing #socialmedia #brand" value={form.hashtags}
                    onChange={e => setForm(f => ({ ...f, hashtags: e.target.value }))}
                    className="w-full px-3 py-2 text-sm rounded-lg focus:outline-none"
                    style={{ border: "1px solid rgba(245,215,160,0.3)", backgroundColor: "#FFF8F0", color: "#292524" }} />
                </div>
              </div>

              <div className="flex items-center gap-3 pt-2">
                <button type="button" onClick={handleSave}
                  className="flex items-center gap-1.5 px-5 py-2.5 rounded-lg text-sm font-bold"
                  style={{ backgroundColor: "#F59E0B", color: "white" }}>
                  <Check className="w-4 h-4" />{editingPost ? "Save" : "Add"}
                </button>
                {editingPost && (
                  <button type="button" onClick={() => handleDelete(editingPost.id)}
                    className="flex items-center gap-1.5 px-4 py-2.5 rounded-lg text-sm font-semibold"
                    style={{ color: "#EF4444", backgroundColor: "rgba(239,68,68,0.08)" }}>
                    <Trash2 className="w-4 h-4" />Delete
                  </button>
                )}
                <button type="button" onClick={() => setShowForm(false)}
                  className="px-4 py-2.5 rounded-lg text-sm font-semibold" style={{ color: "#A8967E" }}>
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
