"use client";

/**
 * Publish Queue dashboard — visual week view of scheduled + published
 * posts. Spot gaps, double-bookings, platform skew at a glance.
 */

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import Header from "@/components/layout/Header";
import {
  CalendarDays, Clock, CheckCircle2, AlertCircle, Loader2, Plus,
  Instagram, Facebook, Linkedin, Youtube,
} from "lucide-react";

interface Post {
  id: string;
  title: string | null;
  caption: string;
  platforms: string[];
  media_urls: string[] | null;
  status: string;
  scheduled_for: string;
  published_at: string | null;
}

interface Stats {
  upcoming: number;
  published: number;
  failed: number;
  by_platform: Record<string, number>;
}

const PLATFORM_ICON: Record<string, React.ElementType> = {
  instagram: Instagram, facebook: Facebook, linkedin: Linkedin, youtube: Youtube,
};
const PLATFORM_COLOR: Record<string, string> = {
  instagram: "#E1306C", facebook: "#1877F2", linkedin: "#0A66C2", youtube: "#FF0000", tiktok: "#000000",
};

const STATUS_CFG: Record<string, { color: string; label: string; Icon: React.ElementType }> = {
  scheduled: { color: "#F59E0B", label: "Scheduled", Icon: Clock },
  published: { color: "#10B981", label: "Published", Icon: CheckCircle2 },
  failed:    { color: "#EF4444", label: "Failed",    Icon: AlertCircle },
  draft:     { color: "#78614E", label: "Draft",     Icon: Clock },
};

export default function QueuePage() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [byDay, setByDay] = useState<Record<string, Post[]>>({});
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [days, setDays] = useState(7);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/studio/queue?days=${days}&past=3`, { cache: "no-store" });
      if (res.ok) {
        const d = await res.json();
        setPosts(d.posts ?? []);
        setByDay(d.by_day ?? {});
        setStats(d.stats ?? null);
      }
    } finally {
      setLoading(false);
    }
  }, [days]);

  useEffect(() => { load(); }, [load]);

  const today = new Date().toISOString().slice(0, 10);
  // Build day list to render
  const dayList: string[] = [];
  for (let i = -3; i < days - 3; i++) {
    const d = new Date(Date.now() + i * 24 * 3600 * 1000);
    dayList.push(d.toISOString().slice(0, 10));
  }

  return (
    <div className="min-h-screen" style={{ backgroundColor: "#FFFCF7" }}>
      <Header title="Publish Queue" subtitle="What's about to go live across all platforms" />

      <main className="max-w-6xl mx-auto px-6 py-6 space-y-5">
        {/* Stats */}
        {stats && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <StatCard label="Upcoming"  value={stats.upcoming}  color="#F59E0B" Icon={Clock} />
            <StatCard label="Published" value={stats.published} color="#10B981" Icon={CheckCircle2} />
            <StatCard label="Failed"    value={stats.failed}    color="#EF4444" Icon={AlertCircle} />
            <StatCard label="Platforms" value={Object.keys(stats.by_platform).length} color="#8B5CF6" Icon={CalendarDays} />
          </div>
        )}

        {/* Range picker */}
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs font-bold uppercase tracking-wider" style={{ color: "#78614E" }}>
            Window:
          </span>
          {[7, 14, 30].map((d) => (
            <button
              key={d}
              type="button"
              onClick={() => setDays(d)}
              className="text-xs font-bold px-3 py-1 rounded-md"
              style={{
                backgroundColor: days === d ? "#292524" : "rgba(0,0,0,0.04)",
                color: days === d ? "white" : "#292524",
              }}
            >
              {d} days
            </button>
          ))}
          <Link
            href="/calendar"
            className="ml-auto inline-flex items-center gap-1 text-xs font-bold px-3 py-1.5 rounded-md"
            style={{
              background: "linear-gradient(135deg, #F59E0B, #D97706)",
              color: "#1C1814",
            }}
          >
            <Plus className="w-3 h-3" />
            New post
          </Link>
        </div>

        {/* Day timeline */}
        {loading ? (
          <div className="py-12 text-center">
            <Loader2 className="w-5 h-5 animate-spin inline" style={{ color: "#A8967E" }} />
          </div>
        ) : (
          <div className="space-y-3">
            {dayList.map((day) => {
              const dayPosts = byDay[day] ?? [];
              const isToday = day === today;
              const isPast = day < today;
              const dt = new Date(day + "T12:00:00");
              const dayLabel = dt.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
              return (
                <div
                  key={day}
                  className="rounded-xl overflow-hidden"
                  style={{
                    border: `1px solid ${isToday ? "#F59E0B" : "rgba(0,0,0,0.06)"}`,
                    backgroundColor: isPast && !dayPosts.length ? "rgba(0,0,0,0.02)" : "white",
                  }}
                >
                  <div
                    className="px-4 py-2 flex items-center justify-between"
                    style={{
                      backgroundColor: isToday ? "rgba(245,158,11,0.08)" : "rgba(245,215,160,0.04)",
                      borderBottom: dayPosts.length > 0 ? "1px solid rgba(0,0,0,0.06)" : "none",
                    }}
                  >
                    <p
                      className="text-sm font-bold"
                      style={{ color: isToday ? "#D97706" : "#292524" }}
                    >
                      {isToday ? "Today" : dayLabel}
                      {!isToday && <span className="ml-2 text-[10px] font-normal" style={{ color: "#A8967E" }}>{dayLabel}</span>}
                    </p>
                    <span
                      className="text-[10px] font-bold uppercase tracking-wider"
                      style={{ color: "#A8967E" }}
                    >
                      {dayPosts.length} {dayPosts.length === 1 ? "post" : "posts"}
                    </span>
                  </div>
                  {dayPosts.length === 0 ? (
                    <p className="px-4 py-2 text-[11px] italic" style={{ color: "#A8967E" }}>
                      No posts scheduled
                    </p>
                  ) : (
                    <div className="divide-y" style={{ borderColor: "rgba(0,0,0,0.04)" }}>
                      {dayPosts.map((p) => {
                        const time = new Date(p.scheduled_for).toLocaleTimeString("en-US", {
                          hour: "2-digit",
                          minute: "2-digit",
                        });
                        const sc = STATUS_CFG[p.status] ?? STATUS_CFG.draft;
                        return (
                          <div
                            key={p.id}
                            className="px-4 py-2.5 flex items-center gap-3"
                          >
                            <span
                              className="text-xs font-mono font-bold tabular-nums w-12"
                              style={{ color: "#78614E" }}
                            >
                              {time}
                            </span>
                            {p.media_urls && p.media_urls[0] && (
                              <img
                                src={p.media_urls[0]}
                                alt=""
                                className="w-10 h-10 rounded object-cover flex-shrink-0"
                              />
                            )}
                            <div className="flex-1 min-w-0">
                              <p className="text-sm line-clamp-1" style={{ color: "#292524" }}>
                                {p.title || p.caption.slice(0, 80)}
                              </p>
                              <div className="flex items-center gap-1.5 mt-0.5">
                                {(p.platforms ?? []).map((pl) => {
                                  const Icon = PLATFORM_ICON[pl];
                                  if (!Icon) return null;
                                  return (
                                    <Icon
                                      key={pl}
                                      className="w-3 h-3"
                                      style={{ color: PLATFORM_COLOR[pl] }}
                                    />
                                  );
                                })}
                              </div>
                            </div>
                            <span
                              className="inline-flex items-center gap-1 text-[10px] font-bold uppercase px-2 py-0.5 rounded-full"
                              style={{ backgroundColor: `${sc.color}1A`, color: sc.color }}
                            >
                              <sc.Icon className="w-3 h-3" />
                              {sc.label}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {!loading && posts.length === 0 && (
          <div
            className="rounded-xl py-12 text-center"
            style={{ backgroundColor: "white", border: "1px dashed rgba(0,0,0,0.1)" }}
          >
            <CalendarDays className="w-8 h-8 mx-auto mb-2" style={{ color: "#A8967E" }} />
            <p className="text-sm" style={{ color: "#78614E" }}>
              No posts in this window. Use Calendar or Campaign Auto-Pilot to schedule.
            </p>
          </div>
        )}
      </main>
    </div>
  );
}

function StatCard({
  label, value, color, Icon,
}: { label: string; value: number; color: string; Icon: React.ElementType }) {
  return (
    <div
      className="rounded-xl p-3 flex items-center gap-3"
      style={{
        backgroundColor: "white",
        border: `1px solid ${color}33`,
      }}
    >
      <div
        className="w-9 h-9 rounded-lg flex items-center justify-center"
        style={{ backgroundColor: `${color}14`, color }}
      >
        <Icon className="w-4 h-4" />
      </div>
      <div>
        <p className="text-xl font-bold" style={{ color }}>{value}</p>
        <p className="text-[10px] uppercase tracking-wider" style={{ color: "#78614E" }}>
          {label}
        </p>
      </div>
    </div>
  );
}
