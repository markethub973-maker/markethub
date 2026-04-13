"use client";

/**
 * Reviews — Google Business / Facebook review management page.
 *
 * Top: summary bar with total count + average rating + sentiment split.
 * Mid: filters (status, platform, min rating).
 * Left/Main: review list (rating stars, snippet, reply prompt).
 * Right: selected review detail with:
 *   - Original content + existing owner reply (if any)
 *   - Composer for our reply (persisted locally)
 *   - Mark as acknowledged / escalated / hidden actions
 * Footer of the top bar: "Sincronizează Google" input to fetch a new place.
 */

import { useCallback, useEffect, useState } from "react";
import {
  Star,
  RefreshCw,
  ArrowLeft,
  Loader2,
  Send,
  ExternalLink,
  AlertCircle,
  CheckCircle2,
  Flag,
  EyeOff,
  Sparkles,
} from "lucide-react";
import Link from "next/link";

// ── Types ──────────────────────────────────────────────────────────────────

interface Review {
  id: string;
  business_id: string | null;
  platform: "google_business" | "facebook" | "trustpilot" | "yelp";
  place_id: string | null;
  place_name: string | null;
  place_url: string | null;
  external_id: string;
  reviewer_name: string | null;
  reviewer_handle: string | null;
  reviewer_avatar_url: string | null;
  reviewer_reviews_count: number | null;
  rating: number;
  title: string | null;
  content: string | null;
  language: string | null;
  sentiment: "positive" | "negative" | "neutral" | null;
  sentiment_score: number | null;
  owner_reply: string | null;
  reply_text: string | null;
  replied_at: string | null;
  status: "new" | "acknowledged" | "replied" | "escalated" | "hidden";
  priority: "low" | "normal" | "high" | "urgent";
  tags: string[];
  likes_count: number;
  published_at: string | null;
  ingested_at: string;
}

interface ReviewsResponse {
  reviews: Review[];
  total: number;
  counts: {
    by_status: Record<string, number>;
    by_platform: Record<string, number>;
    by_rating: Record<string, number>;
    total: number;
    avg_rating: number;
  };
}

type StatusFilter = "new" | "acknowledged" | "replied" | "escalated" | "all";

// ── Helpers ─────────────────────────────────────────────────────────────────

const PLATFORM_ICONS: Record<string, string> = {
  google_business: "🔴",
  facebook: "📘",
  trustpilot: "🟢",
  yelp: "🟡",
};

function Stars({ rating, size = 14 }: { rating: number; size?: number }) {
  return (
    <span style={{ display: "inline-flex", gap: 1 }}>
      {[1, 2, 3, 4, 5].map((i) => (
        <Star
          key={i}
          size={size}
          fill={i <= Math.round(rating) ? "#F59E0B" : "transparent"}
          stroke={i <= Math.round(rating) ? "#F59E0B" : "#C4AA8A"}
          strokeWidth={2}
        />
      ))}
    </span>
  );
}

// ── Component ───────────────────────────────────────────────────────────────

export default function ReviewsPage() {
  const [data, setData] = useState<ReviewsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("new");
  const [minRating, setMinRating] = useState<number>(0);

  const [selected, setSelected] = useState<Review | null>(null);
  const [replyText, setReplyText] = useState("");
  const [replying, setReplying] = useState(false);
  const [replyError, setReplyError] = useState<string | null>(null);
  const [drafting, setDrafting] = useState(false);
  const [draftError, setDraftError] = useState<string | null>(null);

  // Sync state
  const [syncUrl, setSyncUrl] = useState("");
  const [syncing, setSyncing] = useState(false);
  const [syncMsg, setSyncMsg] = useState<string | null>(null);
  const [syncError, setSyncError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (statusFilter !== "all") params.set("status", statusFilter);
      if (minRating > 0) params.set("max_rating", String(minRating));
      params.set("limit", "100");
      const res = await fetch(`/api/reviews?${params}`, { cache: "no-store" });
      if (!res.ok) return;
      setData((await res.json()) as ReviewsResponse);
    } finally {
      setLoading(false);
    }
  }, [statusFilter, minRating]);

  useEffect(() => {
    void load();
  }, [load]);

  async function syncPlace() {
    if (!syncUrl.trim() || syncing) return;
    setSyncing(true);
    setSyncError(null);
    setSyncMsg(null);
    try {
      const res = await fetch("/api/reviews/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          placeUrl: syncUrl.startsWith("http") ? syncUrl : undefined,
          placeName: syncUrl.startsWith("http") ? undefined : syncUrl,
          maxReviews: 50,
        }),
      });
      const d = await res.json();
      if (!res.ok) {
        setSyncError(d.error || "Sync failed");
      } else {
        setSyncMsg(
          `${d.new ?? 0} review-uri noi (${d.total_scanned ?? 0} scanate) — ${d.place_name ?? "unknown place"}`,
        );
        setSyncUrl("");
        await load();
      }
    } catch (e) {
      setSyncError(e instanceof Error ? e.message : "Network error");
    } finally {
      setSyncing(false);
    }
  }

  async function updateStatus(id: string, status: Review["status"]) {
    await fetch("/api/reviews", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, status }),
    });
    if (selected?.id === id) {
      setSelected({ ...selected, status });
    }
    void load();
  }

  async function draftReply() {
    if (!selected || drafting) return;
    setDrafting(true);
    setDraftError(null);
    try {
      const res = await fetch("/api/reviews/draft-reply", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: selected.id }),
      });
      const d = await res.json();
      if (!res.ok) {
        setDraftError(d.error || "Draft failed");
      } else if (d.draft) {
        setReplyText(d.draft);
      }
    } catch (e) {
      setDraftError(e instanceof Error ? e.message : "Network error");
    } finally {
      setDrafting(false);
    }
  }

  async function sendReply() {
    if (!selected || !replyText.trim() || replying) return;
    setReplying(true);
    setReplyError(null);
    try {
      const res = await fetch("/api/reviews/reply", {
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
        if (data) {
          const refreshed = data.reviews.find((r) => r.id === selected.id);
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
  const reviews = data?.reviews ?? [];

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
          <h1 style={{ fontSize: 20, fontWeight: 800, margin: 0 }}>Review Management</h1>
        </div>
        {counts && counts.total > 0 && (
          <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
            <div style={{ textAlign: "right" }}>
              <div style={{ fontSize: 11, color: "#A8967E", letterSpacing: 1, textTransform: "uppercase" }}>
                Average
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <Stars rating={counts.avg_rating} />
                <span style={{ fontSize: 18, fontWeight: 800, color: "#292524" }}>
                  {counts.avg_rating.toFixed(1)}
                </span>
              </div>
            </div>
            <div style={{ textAlign: "right" }}>
              <div style={{ fontSize: 11, color: "#A8967E", letterSpacing: 1, textTransform: "uppercase" }}>
                Total
              </div>
              <div style={{ fontSize: 18, fontWeight: 800 }}>{counts.total}</div>
            </div>
          </div>
        )}
      </div>

      {/* Sync bar */}
      <div
        style={{
          display: "flex",
          gap: 8,
          padding: "12px 24px",
          borderBottom: "1px solid rgba(245,215,160,0.2)",
          background: "#FFFCF7",
        }}
      >
        <input
          value={syncUrl}
          onChange={(e) => setSyncUrl(e.target.value)}
          placeholder="Google Maps URL or location name (e.g. 'MarketHub NYC')"
          onKeyDown={(e) => e.key === "Enter" && syncPlace()}
          disabled={syncing}
          style={{
            flex: 1,
            padding: "8px 12px",
            border: "1px solid rgba(245,215,160,0.3)",
            borderRadius: 8,
            fontSize: 13,
            outline: "none",
            background: "white",
            color: "#292524",
          }}
        />
        <button
          onClick={syncPlace}
          disabled={syncing || !syncUrl.trim()}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 6,
            padding: "8px 16px",
            background: syncing || !syncUrl.trim() ? "#C4AA8A" : "#F59E0B",
            color: "#1C1814",
            border: "none",
            borderRadius: 8,
            fontSize: 13,
            fontWeight: 700,
            cursor: syncing || !syncUrl.trim() ? "not-allowed" : "pointer",
          }}
        >
          {syncing ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />}
          Sync
        </button>
      </div>
      {syncError && (
        <div
          style={{
            padding: "10px 24px",
            background: "rgba(239,68,68,0.08)",
            color: "#B91C1C",
            fontSize: 12,
          }}
        >
          ⚠ {syncError}
        </div>
      )}
      {syncMsg && (
        <div
          style={{
            padding: "10px 24px",
            background: "rgba(16,185,129,0.08)",
            color: "#065F46",
            fontSize: 12,
          }}
        >
          ✓ {syncMsg}
        </div>
      )}

      {/* Filter bar */}
      <div
        style={{
          display: "flex",
          gap: 16,
          padding: "12px 24px",
          borderBottom: "1px solid rgba(245,215,160,0.2)",
          background: "#FFFCF7",
          alignItems: "center",
          flexWrap: "wrap",
        }}
      >
        <div style={{ display: "flex", gap: 4 }}>
          {(["new", "acknowledged", "replied", "escalated", "all"] as StatusFilter[]).map((s) => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              style={{
                padding: "6px 12px",
                background: statusFilter === s ? "#F59E0B" : "rgba(245,158,11,0.08)",
                color: statusFilter === s ? "#1C1814" : "#F59E0B",
                border: "none",
                borderRadius: 6,
                fontSize: 12,
                fontWeight: 700,
                cursor: "pointer",
                textTransform: "capitalize",
              }}
            >
              {s === "all" ? "All" : s}
              {counts && s !== "all" && counts.by_status[s] > 0 && (
                <span style={{ marginLeft: 6, fontSize: 10, opacity: 0.8 }}>
                  {counts.by_status[s]}
                </span>
              )}
            </button>
          ))}
        </div>
        <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 6 }}>
          <span style={{ fontSize: 11, color: "#A8967E", letterSpacing: 1, textTransform: "uppercase" }}>
            Max rating
          </span>
          {[0, 5, 4, 3, 2, 1].map((r) => (
            <button
              key={r}
              onClick={() => setMinRating(r)}
              style={{
                padding: "4px 8px",
                background: minRating === r ? "#F59E0B" : "transparent",
                color: minRating === r ? "#1C1814" : "#78614E",
                border: "1px solid rgba(245,158,11,0.25)",
                borderRadius: 4,
                fontSize: 11,
                cursor: "pointer",
              }}
            >
              {r === 0 ? "All" : `≤${r}★`}
            </button>
          ))}
        </div>
      </div>

      {/* Main 2-col */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          minHeight: "calc(100vh - 200px)",
        }}
      >
        {/* Left — review list */}
        <div
          style={{
            borderRight: "1px solid rgba(245,215,160,0.2)",
            background: "#FFFCF7",
            overflowY: "auto",
            maxHeight: "calc(100vh - 200px)",
          }}
        >
          {loading && !data && (
            <div style={{ padding: 30, textAlign: "center", color: "#A8967E" }}>
              <Loader2 size={20} className="animate-spin" style={{ margin: "0 auto 8px" }} />
              Loading...
            </div>
          )}
          {!loading && reviews.length === 0 && (
            <div style={{ padding: 40, textAlign: "center", color: "#A8967E" }}>
              <Star size={36} style={{ margin: "0 auto 12px", opacity: 0.3 }} />
              <div style={{ fontWeight: 600, color: "#78614E", marginBottom: 4 }}>
                No reviews found
              </div>
              <div style={{ fontSize: 12 }}>
                Sync a Google Business location above to get started.
              </div>
            </div>
          )}
          {reviews.map((r) => {
            const isSel = selected?.id === r.id;
            const sevColor =
              r.priority === "urgent"
                ? "#DC2626"
                : r.priority === "high"
                  ? "#F97316"
                  : r.priority === "normal"
                    ? "#A8967E"
                    : "#64748B";
            return (
              <button
                key={r.id}
                onClick={() => {
                  setSelected(r);
                  setReplyText("");
                  setReplyError(null);
                }}
                style={{
                  display: "block",
                  width: "100%",
                  padding: "14px 16px",
                  borderBottom: "1px solid rgba(245,215,160,0.15)",
                  background: isSel ? "rgba(245,158,11,0.08)" : "transparent",
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
                  }}
                >
                  <Stars rating={r.rating} size={13} />
                  <span
                    style={{
                      fontSize: 10,
                      padding: "1px 7px",
                      borderRadius: 10,
                      background: `${sevColor}18`,
                      color: sevColor,
                      fontWeight: 700,
                      textTransform: "uppercase",
                    }}
                  >
                    {PLATFORM_ICONS[r.platform]} {r.platform.replace("_", " ")}
                  </span>
                  <span style={{ marginLeft: "auto", fontSize: 10, color: "#C4AA8A" }}>
                    {r.published_at
                      ? new Date(r.published_at).toLocaleDateString("ro-RO", {
                          day: "numeric",
                          month: "short",
                        })
                      : ""}
                  </span>
                </div>
                <div style={{ fontSize: 12, fontWeight: 700, color: "#292524", marginBottom: 2 }}>
                  {r.reviewer_name || "Anonymous"}
                  {r.place_name && (
                    <span style={{ fontWeight: 500, color: "#A8967E", marginLeft: 6, fontSize: 10 }}>
                      @ {r.place_name}
                    </span>
                  )}
                </div>
                <div
                  style={{
                    fontSize: 12,
                    color: "#78614E",
                    lineHeight: 1.4,
                    display: "-webkit-box",
                    WebkitLineClamp: 2,
                    WebkitBoxOrient: "vertical",
                    overflow: "hidden",
                  }}
                >
                  {r.content || <em>(no text)</em>}
                </div>
                {r.status === "replied" && (
                  <div
                    style={{
                      marginTop: 6,
                      fontSize: 10,
                      color: "#10B981",
                      display: "flex",
                      alignItems: "center",
                      gap: 4,
                    }}
                  >
                    <CheckCircle2 size={10} /> Reply sent
                  </div>
                )}
              </button>
            );
          })}
        </div>

        {/* Right — detail */}
        <div style={{ padding: 24, overflowY: "auto", maxHeight: "calc(100vh - 200px)" }}>
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
              <Star size={40} style={{ marginBottom: 12, opacity: 0.3 }} />
              <div style={{ fontWeight: 600, color: "#78614E", marginBottom: 4 }}>
                Select a review
              </div>
              <div style={{ fontSize: 12 }}>
                Choose one from the list to see details and reply
              </div>
            </div>
          )}
          {selected && (
            <div>
              {/* Header */}
              <div style={{ marginBottom: 16 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
                  <Stars rating={selected.rating} size={18} />
                  <span style={{ fontSize: 16, fontWeight: 800 }}>
                    {selected.rating.toFixed(1)}
                  </span>
                  <span
                    style={{
                      fontSize: 10,
                      padding: "2px 8px",
                      borderRadius: 10,
                      background:
                        selected.sentiment === "positive"
                          ? "#10B98118"
                          : selected.sentiment === "negative"
                            ? "#EF444418"
                            : "#64748B18",
                      color:
                        selected.sentiment === "positive"
                          ? "#10B981"
                          : selected.sentiment === "negative"
                            ? "#EF4444"
                            : "#64748B",
                      fontWeight: 700,
                      textTransform: "uppercase",
                    }}
                  >
                    {selected.sentiment || "—"}
                  </span>
                </div>
                <div
                  style={{
                    fontSize: 14,
                    fontWeight: 700,
                    color: "#292524",
                    marginBottom: 4,
                  }}
                >
                  {selected.reviewer_name || "Anonymous"}
                  {selected.reviewer_reviews_count != null && (
                    <span
                      style={{
                        fontSize: 10,
                        color: "#A8967E",
                        fontWeight: 500,
                        marginLeft: 6,
                      }}
                    >
                      · {selected.reviewer_reviews_count} reviews total
                    </span>
                  )}
                </div>
                <div style={{ fontSize: 11, color: "#A8967E" }}>
                  {selected.place_name && (
                    <>
                      {PLATFORM_ICONS[selected.platform]} {selected.place_name}
                      {" · "}
                    </>
                  )}
                  {selected.published_at
                    ? new Date(selected.published_at).toLocaleString("ro-RO", {
                        day: "numeric",
                        month: "long",
                        year: "numeric",
                      })
                    : ""}
                </div>
                {selected.place_url && (
                  <a
                    href={selected.place_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 4,
                      marginTop: 6,
                      fontSize: 11,
                      color: "#F59E0B",
                      textDecoration: "none",
                    }}
                  >
                    <ExternalLink size={10} /> Deschide pe Google Maps
                  </a>
                )}
              </div>

              {/* Review content */}
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
                  {selected.content || <em style={{ color: "#A8967E" }}>(no text)</em>}
                </p>
              </div>

              {/* Existing owner reply on-platform */}
              {selected.owner_reply && (
                <div
                  style={{
                    padding: 12,
                    background: "rgba(100,116,139,0.06)",
                    border: "1px solid rgba(100,116,139,0.2)",
                    borderRadius: 10,
                    marginBottom: 16,
                  }}
                >
                  <div
                    style={{
                      fontSize: 10,
                      color: "#64748B",
                      textTransform: "uppercase",
                      letterSpacing: 1,
                      fontWeight: 700,
                      marginBottom: 4,
                    }}
                  >
                    Existing reply on platform
                  </div>
                  <p style={{ fontSize: 13, color: "#292524", margin: 0, whiteSpace: "pre-wrap" }}>
                    {selected.owner_reply}
                  </p>
                </div>
              )}

              {/* Our reply */}
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
                    Your draft ·{" "}
                    {selected.replied_at
                      ? new Date(selected.replied_at).toLocaleString("ro-RO")
                      : ""}
                  </div>
                  <p style={{ fontSize: 13, color: "#292524", margin: 0, whiteSpace: "pre-wrap" }}>
                    {selected.reply_text}
                  </p>
                  {selected.tags.includes("pending_platform_send") && (
                    <div
                      style={{
                        marginTop: 8,
                        fontSize: 10,
                        color: "#A8967E",
                        fontStyle: "italic",
                      }}
                    >
                      ℹ Requires copy-paste into Google Business Profile to publish
                      (API reply requires separate GBP OAuth).
                    </div>
                  )}
                </div>
              )}

              {/* Reply composer */}
              {selected.status !== "replied" && (
                <div
                  style={{
                    padding: 16,
                    background: "#FFFCF7",
                    border: "1px solid rgba(245,215,160,0.3)",
                    borderRadius: 10,
                    marginBottom: 16,
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      marginBottom: 8,
                    }}
                  >
                    <div
                      style={{
                        fontSize: 10,
                        color: "#A8967E",
                        letterSpacing: 1,
                        textTransform: "uppercase",
                        fontWeight: 700,
                      }}
                    >
                      Your reply
                    </div>
                    <button
                      onClick={draftReply}
                      disabled={drafting}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 5,
                        padding: "4px 10px",
                        background: drafting
                          ? "rgba(139,92,246,0.1)"
                          : "linear-gradient(135deg, #8B5CF6, #6366F1)",
                        color: drafting ? "#8B5CF6" : "white",
                        border: "1px solid rgba(139,92,246,0.3)",
                        borderRadius: 6,
                        fontSize: 10,
                        fontWeight: 700,
                        cursor: drafting ? "not-allowed" : "pointer",
                        letterSpacing: 0.5,
                        textTransform: "uppercase",
                      }}
                    >
                      {drafting ? (
                        <Loader2 size={10} className="animate-spin" />
                      ) : (
                        <Sparkles size={10} />
                      )}
                      {drafting ? "Generating..." : "AI Draft"}
                    </button>
                  </div>
                  {draftError && (
                    <div
                      style={{
                        marginBottom: 8,
                        padding: 6,
                        background: "rgba(239,68,68,0.08)",
                        borderRadius: 6,
                        fontSize: 10,
                        color: "#B91C1C",
                      }}
                    >
                      ⚠ {draftError}
                    </div>
                  )}
                  <textarea
                    value={replyText}
                    onChange={(e) => setReplyText(e.target.value)}
                    placeholder={`Reply to ${selected.reviewer_name || "user"}... or use "AI Draft" for an AI-generated response`}
                    rows={6}
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
                    {replying ? <Loader2 size={12} className="animate-spin" /> : <Send size={12} />}
                    {replying ? "Saving..." : "Save reply"}
                  </button>
                </div>
              )}

              {/* Workflow actions */}
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                {selected.status !== "acknowledged" && selected.status !== "replied" && (
                  <button
                    onClick={() => updateStatus(selected.id, "acknowledged")}
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
                    <AlertCircle size={12} /> Acknowledge
                  </button>
                )}
                <button
                  onClick={() => updateStatus(selected.id, "escalated")}
                  style={{
                    padding: "6px 12px",
                    background: "rgba(239,68,68,0.08)",
                    color: "#B91C1C",
                    border: "1px solid rgba(239,68,68,0.2)",
                    borderRadius: 6,
                    fontSize: 11,
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    gap: 4,
                  }}
                >
                  <Flag size={12} /> Escalate
                </button>
                <button
                  onClick={() => updateStatus(selected.id, "hidden")}
                  style={{
                    padding: "6px 12px",
                    background: "rgba(100,116,139,0.08)",
                    color: "#475569",
                    border: "1px solid rgba(100,116,139,0.2)",
                    borderRadius: 6,
                    fontSize: 11,
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    gap: 4,
                  }}
                >
                  <EyeOff size={12} /> Hide
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
