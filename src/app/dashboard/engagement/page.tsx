"use client";

/**
 * Engagement — Unified Inbox page.
 *
 * Three-column layout:
 *   Left  — filter rail (platforms, status, priority, sentiment) + counts
 *   Mid   — message list (most recent first), selectable
 *   Right — message detail with reply box + metadata actions
 *
 * Realtime: subscribes to social_messages INSERT via Supabase Realtime
 * so new comments appear live in the list. Falls back to a 30s polling
 * refresh if Realtime is unavailable.
 *
 * Mobile: collapses to list view when no message selected, detail view
 * when one is selected.
 */

import { useCallback, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  RefreshCw,
  Send,
  Archive,
  CheckCircle2,
  AlertCircle,
  Inbox,
  Tag,
  ArrowLeft,
  Loader2,
  MessageCircle,
} from "lucide-react";
import Link from "next/link";

// ── Types ──────────────────────────────────────────────────────────────────

interface Message {
  id: string;
  platform: "instagram" | "facebook" | "linkedin" | "tiktok" | "youtube" | "twitter";
  kind: "dm" | "comment" | "mention" | "reply";
  external_id: string;
  thread_id: string | null;
  parent_external_id: string | null;
  media_external_id: string | null;
  media_permalink: string | null;
  media_thumbnail_url: string | null;
  author_name: string | null;
  author_handle: string | null;
  author_avatar_url: string | null;
  content: string;
  sentiment: "positive" | "negative" | "neutral" | null;
  priority: "low" | "normal" | "high" | "urgent";
  status: "unread" | "read" | "replied" | "archived" | "spam";
  tags: string[];
  reply_text: string | null;
  replied_at: string | null;
  external_created_at: string | null;
  received_at: string;
}

interface InboxResponse {
  messages: Message[];
  total: number;
  offset: number;
  limit: number;
  counts: {
    by_status: Record<string, number>;
    by_platform: Record<string, number>;
    total: number;
  };
}

type StatusFilter = "unread" | "read" | "replied" | "archived" | "all";
type PlatformFilter = "all" | "instagram" | "facebook" | "linkedin" | "tiktok" | "youtube";

// ── Style helpers ───────────────────────────────────────────────────────────

const PLATFORM_COLORS: Record<string, string> = {
  instagram: "#E1306C",
  facebook: "#1877F2",
  linkedin: "#0A66C2",
  tiktok: "#FF0050",
  youtube: "#FF0000",
  twitter: "#1DA1F2",
};

const PLATFORM_ICONS: Record<string, string> = {
  instagram: "📸",
  facebook: "📘",
  linkedin: "💼",
  tiktok: "🎵",
  youtube: "▶",
  twitter: "🐦",
};

const PRIORITY_COLORS: Record<string, string> = {
  urgent: "#DC2626",
  high: "#F97316",
  normal: "#A8967E",
  low: "#64748B",
};

// ── Component ───────────────────────────────────────────────────────────────

export default function EngagementPage() {
  const [data, setData] = useState<InboxResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [syncError, setSyncError] = useState<string | null>(null);
  const [syncResult, setSyncResult] = useState<string | null>(null);

  const [statusFilter, setStatusFilter] = useState<StatusFilter>("unread");
  const [platformFilter, setPlatformFilter] = useState<PlatformFilter>("all");

  const [selected, setSelected] = useState<Message | null>(null);
  const [replyText, setReplyText] = useState("");
  const [replying, setReplying] = useState(false);
  const [replyError, setReplyError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (statusFilter !== "all") params.set("status", statusFilter);
      if (platformFilter !== "all") params.set("platform", platformFilter);
      params.set("limit", "100");
      const res = await fetch(`/api/engagement/messages?${params}`, { cache: "no-store" });
      if (!res.ok) return;
      setData((await res.json()) as InboxResponse);
    } finally {
      setLoading(false);
    }
  }, [statusFilter, platformFilter]);

  useEffect(() => {
    void load();
  }, [load]);

  // Realtime subscription — refetch on any INSERT / UPDATE to social_messages
  useEffect(() => {
    let channel: ReturnType<ReturnType<typeof createClient>["channel"]> | null = null;
    try {
      const supabase = createClient();
      channel = supabase
        .channel("engagement-inbox")
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table: "social_messages" },
          () => void load(),
        )
        .subscribe();
    } catch {
      /* realtime not available — 30s polling fallback */
    }
    const pollId = setInterval(() => void load(), 30_000);
    return () => {
      clearInterval(pollId);
      try {
        channel?.unsubscribe();
      } catch {
        /* ignore */
      }
    };
  }, [load]);

  async function sync() {
    setSyncing(true);
    setSyncError(null);
    setSyncResult(null);
    try {
      const res = await fetch("/api/engagement/sync", { method: "POST" });
      const d = await res.json();
      if (!res.ok) {
        setSyncError(d.error || "Sync failed");
      } else {
        setSyncResult(
          `${d.comments_new ?? 0} comentarii noi (${d.comments_fetched ?? 0} total scanat) — ${d.platform}`,
        );
        await load();
      }
    } catch (e) {
      setSyncError(e instanceof Error ? e.message : "Network error");
    } finally {
      setSyncing(false);
    }
  }

  async function markRead(msg: Message) {
    if (msg.status === "unread") {
      await fetch("/api/engagement/messages", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: msg.id, status: "read" }),
      });
      void load();
    }
  }

  async function archiveMsg(id: string) {
    await fetch("/api/engagement/messages", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, status: "archived" }),
    });
    if (selected?.id === id) setSelected(null);
    void load();
  }

  async function sendReply() {
    if (!selected || !replyText.trim() || replying) return;
    setReplying(true);
    setReplyError(null);
    try {
      const res = await fetch("/api/engagement/reply", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: selected.id, reply_text: replyText.trim() }),
      });
      const d = await res.json();
      if (!res.ok) {
        setReplyError(d.error || "Reply failed");
      } else {
        setReplyText("");
        await load();
        // Refetch selected to see the updated replied status
        if (data) {
          const refreshed = data.messages.find((m) => m.id === selected.id);
          if (refreshed) setSelected(refreshed);
        }
      }
    } catch (e) {
      setReplyError(e instanceof Error ? e.message : "Network error");
    } finally {
      setReplying(false);
    }
  }

  const counts = data?.counts;
  const messages = data?.messages ?? [];

  return (
    <div style={{ minHeight: "100vh", background: "#FAFAF8", color: "#292524" }}>
      {/* Top bar */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 16,
          padding: "16px 24px",
          borderBottom: "1px solid rgba(245,215,160,0.25)",
          background: "#FFFCF7",
        }}
      >
        <Link
          href="/dashboard"
          style={{
            display: "flex",
            alignItems: "center",
            gap: 6,
            padding: "6px 12px",
            background: "rgba(245,158,11,0.08)",
            borderRadius: 6,
            color: "#F59E0B",
            textDecoration: "none",
            fontSize: 12,
          }}
        >
          <ArrowLeft size={14} /> Dashboard
        </Link>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 11, color: "#A8967E", letterSpacing: 1.5, textTransform: "uppercase" }}>
            Community Hub
          </div>
          <h1 style={{ fontSize: 20, fontWeight: 800, margin: 0 }}>Unified Inbox</h1>
        </div>
        <button
          onClick={sync}
          disabled={syncing}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 6,
            padding: "8px 16px",
            background: "#F59E0B",
            color: "#1C1814",
            border: "none",
            borderRadius: 8,
            fontSize: 13,
            fontWeight: 700,
            cursor: syncing ? "not-allowed" : "pointer",
          }}
        >
          {syncing ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />}
          {syncing ? "Sincronizare..." : "Sincronizează Instagram"}
        </button>
      </div>

      {/* Sync status banner */}
      {syncError && (
        <div
          style={{
            padding: "10px 24px",
            background: "rgba(239,68,68,0.08)",
            borderBottom: "1px solid rgba(239,68,68,0.2)",
            color: "#B91C1C",
            fontSize: 12,
          }}
        >
          ⚠ {syncError}
        </div>
      )}
      {syncResult && (
        <div
          style={{
            padding: "10px 24px",
            background: "rgba(16,185,129,0.08)",
            borderBottom: "1px solid rgba(16,185,129,0.2)",
            color: "#065F46",
            fontSize: 12,
          }}
        >
          ✓ {syncResult}
        </div>
      )}

      {/* Main 3-col layout */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "220px 1fr 1fr",
          minHeight: "calc(100vh - 73px)",
        }}
      >
        {/* Left — filter rail */}
        <aside
          style={{
            background: "#FFFCF7",
            borderRight: "1px solid rgba(245,215,160,0.2)",
            padding: "20px 16px",
          }}
        >
          <div
            style={{
              fontSize: 10,
              color: "#A8967E",
              letterSpacing: 1.5,
              textTransform: "uppercase",
              marginBottom: 10,
            }}
          >
            Status
          </div>
          {(["unread", "read", "replied", "archived", "all"] as StatusFilter[]).map((s) => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                width: "100%",
                padding: "8px 10px",
                marginBottom: 3,
                background: statusFilter === s ? "rgba(245,158,11,0.12)" : "transparent",
                color: statusFilter === s ? "#F59E0B" : "#292524",
                border: "none",
                borderRadius: 6,
                fontSize: 13,
                fontWeight: statusFilter === s ? 700 : 500,
                cursor: "pointer",
                textAlign: "left",
              }}
            >
              <span style={{ textTransform: "capitalize" }}>{s === "all" ? "Toate" : s}</span>
              {counts && s !== "all" && counts.by_status[s] > 0 && (
                <span
                  style={{
                    fontSize: 11,
                    padding: "1px 8px",
                    borderRadius: 10,
                    background: statusFilter === s ? "#F59E0B" : "rgba(168,150,126,0.15)",
                    color: statusFilter === s ? "#1C1814" : "#78614E",
                    fontWeight: 700,
                  }}
                >
                  {counts.by_status[s]}
                </span>
              )}
            </button>
          ))}

          <div
            style={{
              fontSize: 10,
              color: "#A8967E",
              letterSpacing: 1.5,
              textTransform: "uppercase",
              marginTop: 20,
              marginBottom: 10,
            }}
          >
            Platformă
          </div>
          {(["all", "instagram", "facebook", "linkedin", "tiktok", "youtube"] as PlatformFilter[]).map(
            (p) => (
              <button
                key={p}
                onClick={() => setPlatformFilter(p)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  width: "100%",
                  padding: "8px 10px",
                  marginBottom: 3,
                  background: platformFilter === p ? "rgba(245,158,11,0.12)" : "transparent",
                  color: platformFilter === p ? "#F59E0B" : "#292524",
                  border: "none",
                  borderRadius: 6,
                  fontSize: 13,
                  fontWeight: platformFilter === p ? 700 : 500,
                  cursor: "pointer",
                  textAlign: "left",
                }}
              >
                <span style={{ textTransform: "capitalize" }}>
                  {p !== "all" ? PLATFORM_ICONS[p] + " " : ""}
                  {p === "all" ? "Toate" : p}
                </span>
                {counts && p !== "all" && counts.by_platform[p] > 0 && (
                  <span
                    style={{
                      fontSize: 11,
                      padding: "1px 8px",
                      borderRadius: 10,
                      background:
                        platformFilter === p ? "#F59E0B" : "rgba(168,150,126,0.15)",
                      color: platformFilter === p ? "#1C1814" : "#78614E",
                      fontWeight: 700,
                    }}
                  >
                    {counts.by_platform[p]}
                  </span>
                )}
              </button>
            ),
          )}
        </aside>

        {/* Mid — message list */}
        <div
          style={{
            borderRight: "1px solid rgba(245,215,160,0.2)",
            background: "#FFFCF7",
            overflowY: "auto",
            maxHeight: "calc(100vh - 73px)",
          }}
        >
          {loading && !data && (
            <div style={{ padding: 30, textAlign: "center", color: "#A8967E" }}>
              <Loader2 size={20} className="animate-spin" style={{ margin: "0 auto 8px" }} />
              Se încarcă...
            </div>
          )}
          {!loading && messages.length === 0 && (
            <div style={{ padding: 40, textAlign: "center", color: "#A8967E" }}>
              <Inbox size={36} style={{ margin: "0 auto 12px" }} />
              <div style={{ fontWeight: 600, color: "#78614E", marginBottom: 4 }}>
                Nimic în inbox
              </div>
              <div style={{ fontSize: 12 }}>
                Click pe &quot;Sincronizează Instagram&quot; pentru a aduce comentariile noi.
              </div>
            </div>
          )}
          {messages.map((m) => {
            const isSel = selected?.id === m.id;
            return (
              <button
                key={m.id}
                onClick={() => {
                  setSelected(m);
                  setReplyText("");
                  setReplyError(null);
                  void markRead(m);
                }}
                style={{
                  display: "block",
                  width: "100%",
                  padding: "14px 16px",
                  borderBottom: "1px solid rgba(245,215,160,0.15)",
                  background: isSel
                    ? "rgba(245,158,11,0.08)"
                    : m.status === "unread"
                      ? "rgba(245,158,11,0.03)"
                      : "transparent",
                  border: "none",
                  borderLeft: isSel ? "3px solid #F59E0B" : "3px solid transparent",
                  cursor: "pointer",
                  textAlign: "left",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    marginBottom: 6,
                    fontSize: 11,
                  }}
                >
                  <span
                    style={{
                      padding: "1px 7px",
                      borderRadius: 10,
                      background: `${PLATFORM_COLORS[m.platform] ?? "#888"}15`,
                      color: PLATFORM_COLORS[m.platform] ?? "#888",
                      fontWeight: 700,
                      textTransform: "uppercase",
                      fontSize: 9,
                      letterSpacing: 0.8,
                    }}
                  >
                    {PLATFORM_ICONS[m.platform]} {m.platform}
                  </span>
                  <span style={{ color: "#A8967E" }}>·</span>
                  <span style={{ color: "#A8967E", fontSize: 10 }}>{m.kind}</span>
                  {m.status === "unread" && (
                    <span
                      style={{
                        marginLeft: "auto",
                        width: 8,
                        height: 8,
                        borderRadius: "50%",
                        background: "#F59E0B",
                      }}
                    />
                  )}
                  {m.status === "replied" && (
                    <CheckCircle2
                      size={12}
                      style={{ marginLeft: "auto", color: "#10B981" }}
                    />
                  )}
                </div>
                <div
                  style={{
                    fontSize: 12,
                    fontWeight: m.status === "unread" ? 700 : 500,
                    color: "#292524",
                    marginBottom: 4,
                  }}
                >
                  {m.author_name || m.author_handle || "Anonymous"}
                </div>
                <div
                  style={{
                    fontSize: 12,
                    color: "#78614E",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    display: "-webkit-box",
                    WebkitLineClamp: 2,
                    WebkitBoxOrient: "vertical",
                    lineHeight: 1.4,
                  }}
                >
                  {m.content}
                </div>
                <div
                  style={{ fontSize: 10, color: "#C4AA8A", marginTop: 4 }}
                >
                  {m.external_created_at
                    ? new Date(m.external_created_at).toLocaleString("ro-RO", {
                        day: "numeric",
                        month: "short",
                        hour: "2-digit",
                        minute: "2-digit",
                      })
                    : new Date(m.received_at).toLocaleString("ro-RO")}
                </div>
              </button>
            );
          })}
        </div>

        {/* Right — message detail */}
        <div style={{ padding: 24, overflowY: "auto", maxHeight: "calc(100vh - 73px)" }}>
          {!selected && (
            <div
              style={{
                height: "100%",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                color: "#A8967E",
                textAlign: "center",
                padding: 40,
              }}
            >
              <MessageCircle size={40} style={{ marginBottom: 12 }} />
              <div style={{ fontWeight: 600, color: "#78614E", marginBottom: 4 }}>
                Selectează un mesaj
              </div>
              <div style={{ fontSize: 12 }}>
                Alege unul din listă pentru a vedea detalii și a răspunde
              </div>
            </div>
          )}
          {selected && (
            <div>
              {/* Header */}
              <div style={{ display: "flex", alignItems: "flex-start", gap: 12, marginBottom: 20 }}>
                {selected.media_thumbnail_url ? (
                  <img
                    src={`/api/image-proxy?url=${encodeURIComponent(selected.media_thumbnail_url)}`}
                    alt=""
                    style={{
                      width: 56,
                      height: 56,
                      borderRadius: 10,
                      objectFit: "cover",
                    }}
                  />
                ) : (
                  <div
                    style={{
                      width: 56,
                      height: 56,
                      borderRadius: 10,
                      background: "rgba(245,158,11,0.08)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: 22,
                    }}
                  >
                    {PLATFORM_ICONS[selected.platform]}
                  </div>
                )}
                <div style={{ flex: 1 }}>
                  <div
                    style={{
                      fontSize: 11,
                      color: "#A8967E",
                      letterSpacing: 1,
                      textTransform: "uppercase",
                    }}
                  >
                    {selected.platform} · {selected.kind}
                  </div>
                  <h2 style={{ fontSize: 18, fontWeight: 800, margin: "4px 0" }}>
                    {selected.author_name || selected.author_handle || "Anonymous"}
                  </h2>
                  <div style={{ fontSize: 11, color: "#A8967E" }}>
                    {selected.external_created_at
                      ? new Date(selected.external_created_at).toLocaleString("ro-RO", {
                          day: "numeric",
                          month: "long",
                          year: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })
                      : new Date(selected.received_at).toLocaleString("ro-RO")}
                  </div>
                </div>
                <div style={{ display: "flex", gap: 6 }}>
                  <button
                    onClick={() => archiveMsg(selected.id)}
                    style={{
                      padding: "6px 12px",
                      background: "rgba(168,150,126,0.1)",
                      color: "#78614E",
                      border: "1px solid rgba(168,150,126,0.2)",
                      borderRadius: 6,
                      fontSize: 11,
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      gap: 4,
                    }}
                  >
                    <Archive size={12} /> Archive
                  </button>
                </div>
              </div>

              {/* Message body */}
              <div
                style={{
                  padding: 16,
                  background: "#FFFCF7",
                  border: "1px solid rgba(245,215,160,0.3)",
                  borderRadius: 10,
                  marginBottom: 16,
                }}
              >
                <p
                  style={{
                    fontSize: 14,
                    lineHeight: 1.6,
                    color: "#292524",
                    whiteSpace: "pre-wrap",
                    margin: 0,
                  }}
                >
                  {selected.content}
                </p>
                {selected.media_permalink && (
                  <a
                    href={selected.media_permalink}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      display: "inline-block",
                      marginTop: 12,
                      fontSize: 11,
                      color: "#F59E0B",
                      textDecoration: "none",
                    }}
                  >
                    → Deschide postul original
                  </a>
                )}
              </div>

              {/* Metadata */}
              <div
                style={{
                  display: "flex",
                  gap: 8,
                  marginBottom: 20,
                  fontSize: 11,
                  color: "#78614E",
                  flexWrap: "wrap",
                }}
              >
                <span
                  style={{
                    padding: "3px 10px",
                    borderRadius: 10,
                    background: `${PRIORITY_COLORS[selected.priority] ?? "#888"}15`,
                    color: PRIORITY_COLORS[selected.priority] ?? "#888",
                    fontWeight: 700,
                  }}
                >
                  <AlertCircle size={10} style={{ display: "inline", marginRight: 3 }} />
                  {selected.priority}
                </span>
                {selected.sentiment && (
                  <span
                    style={{
                      padding: "3px 10px",
                      borderRadius: 10,
                      background:
                        selected.sentiment === "positive"
                          ? "#10B98115"
                          : selected.sentiment === "negative"
                            ? "#EF444415"
                            : "#64748B15",
                      color:
                        selected.sentiment === "positive"
                          ? "#10B981"
                          : selected.sentiment === "negative"
                            ? "#EF4444"
                            : "#64748B",
                      fontWeight: 700,
                    }}
                  >
                    {selected.sentiment}
                  </span>
                )}
                {selected.tags.map((t) => (
                  <span
                    key={t}
                    style={{
                      padding: "3px 10px",
                      borderRadius: 10,
                      background: "rgba(245,158,11,0.1)",
                      color: "#F59E0B",
                      fontWeight: 700,
                    }}
                  >
                    <Tag size={9} style={{ display: "inline", marginRight: 3 }} />
                    {t}
                  </span>
                ))}
              </div>

              {/* Previous reply */}
              {selected.reply_text && (
                <div
                  style={{
                    padding: 16,
                    background: "rgba(16,185,129,0.05)",
                    border: "1px solid rgba(16,185,129,0.2)",
                    borderRadius: 10,
                    marginBottom: 16,
                  }}
                >
                  <div
                    style={{
                      fontSize: 10,
                      color: "#10B981",
                      textTransform: "uppercase",
                      letterSpacing: 1,
                      fontWeight: 700,
                      marginBottom: 6,
                    }}
                  >
                    <CheckCircle2 size={10} style={{ display: "inline", marginRight: 3 }} />
                    Răspunsul tău ·{" "}
                    {selected.replied_at
                      ? new Date(selected.replied_at).toLocaleString("ro-RO")
                      : ""}
                  </div>
                  <p
                    style={{
                      fontSize: 13,
                      color: "#292524",
                      margin: 0,
                      whiteSpace: "pre-wrap",
                    }}
                  >
                    {selected.reply_text}
                  </p>
                </div>
              )}

              {/* Reply box */}
              {selected.status !== "replied" && (
                <div
                  style={{
                    padding: 16,
                    background: "#FFFCF7",
                    border: "1px solid rgba(245,215,160,0.3)",
                    borderRadius: 10,
                  }}
                >
                  <div
                    style={{
                      fontSize: 10,
                      color: "#A8967E",
                      letterSpacing: 1,
                      textTransform: "uppercase",
                      marginBottom: 8,
                      fontWeight: 700,
                    }}
                  >
                    Răspunde
                  </div>
                  <textarea
                    value={replyText}
                    onChange={(e) => setReplyText(e.target.value)}
                    placeholder={`Răspunde la comentariul lui ${selected.author_name || "user"}...`}
                    rows={3}
                    style={{
                      width: "100%",
                      padding: 10,
                      border: "1px solid rgba(245,215,160,0.3)",
                      borderRadius: 8,
                      fontSize: 13,
                      outline: "none",
                      resize: "vertical",
                      fontFamily: "inherit",
                      color: "#292524",
                      background: "white",
                    }}
                  />
                  {replyError && (
                    <div
                      style={{
                        marginTop: 8,
                        padding: 8,
                        background: "rgba(239,68,68,0.08)",
                        borderRadius: 6,
                        fontSize: 11,
                        color: "#B91C1C",
                      }}
                    >
                      ⚠ {replyError}
                    </div>
                  )}
                  <button
                    onClick={sendReply}
                    disabled={replying || !replyText.trim()}
                    style={{
                      marginTop: 10,
                      padding: "10px 20px",
                      background: replying || !replyText.trim() ? "#C4AA8A" : "#F59E0B",
                      color: "#1C1814",
                      border: "none",
                      borderRadius: 8,
                      fontWeight: 700,
                      fontSize: 12,
                      cursor: replying || !replyText.trim() ? "not-allowed" : "pointer",
                      display: "flex",
                      alignItems: "center",
                      gap: 6,
                    }}
                  >
                    {replying ? (
                      <Loader2 size={12} className="animate-spin" />
                    ) : (
                      <Send size={12} />
                    )}
                    {replying ? "Se trimite..." : "Trimite răspunsul"}
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
