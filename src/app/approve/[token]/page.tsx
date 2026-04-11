"use client";

/**
 * Client approval page — Wave 1 rewrite.
 *
 * The client lands here from an email link. They see:
 *   - The post preview (caption, image, platform, scheduled date/time)
 *   - The full comment thread with the agency (public-visible comments only)
 *   - A comment box to leave feedback without approving/rejecting
 *   - Approve / Reject buttons with an optional final note
 *
 * Uses the approval_token as the sole auth — no login required.
 */

import { useState, useEffect, useCallback } from "react";
import { useParams, useSearchParams } from "next/navigation";
import { CheckCircle, XCircle, Loader2, Clock, MessageSquare, Send, User } from "lucide-react";

interface Post {
  id: string;
  caption: string | null;
  platform: string | null;
  date: string | null;
  time: string | null;
  approval_status: "pending" | "approved" | "rejected" | null;
  approval_note: string | null;
  approval_responses: Record<string, { status: string; comment: string; at: string }> | null;
  revision_count: number | null;
  image_url: string | null;
  client_email: string | null;
}

interface Comment {
  id: string;
  client_email: string | null;
  client_name: string | null;
  comment: string;
  is_internal: boolean;
  created_at: string;
}

export default function ApprovalPage() {
  const { token } = useParams() as { token: string };
  const searchParams = useSearchParams();
  const actionParam = searchParams.get("action");

  const [post, setPost] = useState<Post | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState(false);
  const [done, setDone] = useState<"approved" | "rejected" | null>(null);
  const [note, setNote] = useState("");
  const [commentInput, setCommentInput] = useState("");
  const [commentBusy, setCommentBusy] = useState(false);
  const [clientName, setClientName] = useState("");
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    try {
      const res = await fetch(`/api/calendar/approval?token=${token}`, { cache: "no-store" });
      const d = await res.json();
      if (d.post) {
        setPost(d.post);
        setComments(d.comments ?? []);
      } else {
        setError("Link invalid sau expirat.");
      }
    } catch {
      setError("Eroare de rețea.");
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (actionParam && post && !done && post.approval_status === "pending") {
      void handleAction(actionParam as "approve" | "reject");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [actionParam, post]);

  async function handleAction(action: "approve" | "reject") {
    setActing(true);
    try {
      const res = await fetch("/api/calendar/approval", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, action, note, client_name: clientName }),
      });
      const d = await res.json();
      if (d.ok) {
        setDone(action === "approve" ? "approved" : "rejected");
        await load();
      } else {
        setError(d.error || "Eroare");
      }
    } catch {
      setError("Eroare de rețea.");
    } finally {
      setActing(false);
    }
  }

  async function handleComment() {
    if (!commentInput.trim() || commentBusy) return;
    setCommentBusy(true);
    try {
      const res = await fetch("/api/calendar/approval", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          token,
          comment: commentInput.trim(),
          client_name: clientName,
        }),
      });
      const d = await res.json();
      if (d.ok) {
        setCommentInput("");
        await load();
      } else {
        setError(d.error || "Nu am putut salva comentariul");
      }
    } catch {
      setError("Eroare de rețea.");
    } finally {
      setCommentBusy(false);
    }
  }

  if (loading) {
    return (
      <div
        className="min-h-screen flex items-center justify-center"
        style={{ backgroundColor: "#FAFAF8" }}
      >
        <Loader2 className="w-8 h-8 animate-spin" style={{ color: "#F59E0B" }} />
      </div>
    );
  }

  if (error && !post) {
    return (
      <div
        className="min-h-screen flex items-center justify-center"
        style={{ backgroundColor: "#FAFAF8" }}
      >
        <div className="text-center p-8">
          <XCircle className="w-12 h-12 mx-auto mb-4" style={{ color: "#EF4444" }} />
          <p className="font-bold text-lg" style={{ color: "#292524" }}>
            {error}
          </p>
        </div>
      </div>
    );
  }

  const isAlreadyActed =
    post?.approval_status === "approved" || post?.approval_status === "rejected";
  const finalStatus = done ?? (isAlreadyActed ? post?.approval_status : null);

  return (
    <div
      className="min-h-screen p-4 py-8"
      style={{ backgroundColor: "#FAFAF8" }}
    >
      <div className="w-full max-w-xl mx-auto">
        {/* Header */}
        <div className="text-center mb-6">
          <div
            className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-3"
            style={{ background: "linear-gradient(135deg,#F59E0B,#D97706)" }}
          >
            <span className="text-white font-bold text-xl">M</span>
          </div>
          <h1 className="font-bold text-xl" style={{ color: "#292524" }}>
            MarketHub Pro
          </h1>
          <p className="text-sm mt-1" style={{ color: "#A8967E" }}>
            Aprobare conținut
          </p>
        </div>

        {/* Post preview */}
        {post && (
          <div
            className="rounded-2xl overflow-hidden mb-4"
            style={{
              backgroundColor: "#FFFCF7",
              border: "1px solid rgba(245,215,160,0.3)",
            }}
          >
            <div
              className="px-5 py-4"
              style={{ borderBottom: "1px solid rgba(245,215,160,0.2)" }}
            >
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4" style={{ color: "#F59E0B" }} />
                <span
                  className="text-sm font-medium"
                  style={{ color: "#292524" }}
                >
                  {post.platform ?? "—"} ·{" "}
                  {post.date
                    ? new Date(post.date).toLocaleDateString("ro-RO", {
                        weekday: "long",
                        day: "numeric",
                        month: "long",
                      })
                    : "Draft"}
                  {post.time ? ` · ${post.time.slice(0, 5)}` : ""}
                </span>
              </div>
            </div>

            {post.image_url && (
              <img
                src={post.image_url}
                alt=""
                className="w-full"
                style={{ maxHeight: 360, objectFit: "cover" }}
              />
            )}

            <div className="p-5">
              <p
                className="text-sm leading-relaxed whitespace-pre-wrap"
                style={{ color: "#292524" }}
              >
                {post.caption ?? <em style={{ color: "#A8967E" }}>(fără caption)</em>}
              </p>
            </div>
          </div>
        )}

        {/* Verdict banner */}
        {finalStatus && (
          <div
            className="rounded-2xl p-6 text-center mb-4"
            style={{
              backgroundColor: "#FFFCF7",
              border: "1px solid rgba(245,215,160,0.3)",
            }}
          >
            {finalStatus === "approved" ? (
              <>
                <CheckCircle
                  className="w-12 h-12 mx-auto mb-3"
                  style={{ color: "#10B981" }}
                />
                <h2
                  className="text-lg font-bold mb-1"
                  style={{ color: "#10B981" }}
                >
                  Conținut aprobat
                </h2>
                <p className="text-xs" style={{ color: "#78614E" }}>
                  Va fi publicat conform planificării.
                </p>
              </>
            ) : (
              <>
                <XCircle
                  className="w-12 h-12 mx-auto mb-3"
                  style={{ color: "#EF4444" }}
                />
                <h2
                  className="text-lg font-bold mb-1"
                  style={{ color: "#EF4444" }}
                >
                  Conținut respins
                </h2>
                <p className="text-xs" style={{ color: "#78614E" }}>
                  Echipa va reveni cu o variantă nouă.
                </p>
              </>
            )}
          </div>
        )}

        {/* Comments thread */}
        {comments.length > 0 && (
          <div
            className="rounded-2xl mb-4 p-4"
            style={{
              backgroundColor: "#FFFCF7",
              border: "1px solid rgba(245,215,160,0.3)",
            }}
          >
            <div className="flex items-center gap-2 mb-3">
              <MessageSquare
                className="w-4 h-4"
                style={{ color: "#F59E0B" }}
              />
              <span
                className="text-xs font-bold uppercase tracking-wider"
                style={{ color: "#78614E" }}
              >
                Discuție ({comments.length})
              </span>
            </div>
            <div className="space-y-3">
              {comments.map((c) => (
                <div
                  key={c.id}
                  className="flex gap-2"
                  style={{
                    paddingBottom: 10,
                    borderBottom: "1px solid rgba(245,215,160,0.15)",
                  }}
                >
                  <div
                    className="w-7 h-7 rounded-full flex items-center justify-center shrink-0"
                    style={{ background: "rgba(245,158,11,0.12)" }}
                  >
                    <User className="w-3.5 h-3.5" style={{ color: "#F59E0B" }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div
                      className="text-xs font-semibold mb-0.5"
                      style={{ color: "#292524" }}
                    >
                      {c.client_name || c.client_email || "Client"}
                      <span
                        className="font-normal ml-2"
                        style={{ color: "#A8967E" }}
                      >
                        {new Date(c.created_at).toLocaleString("ro-RO", {
                          day: "numeric",
                          month: "short",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>
                    </div>
                    <p
                      className="text-sm whitespace-pre-wrap"
                      style={{ color: "#292524" }}
                    >
                      {c.comment}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Comment input (only if not already final) */}
        {!finalStatus && post && (
          <div
            className="rounded-2xl p-4 mb-4"
            style={{
              backgroundColor: "#FFFCF7",
              border: "1px solid rgba(245,215,160,0.3)",
            }}
          >
            <label
              className="text-xs font-semibold uppercase tracking-wider block mb-2"
              style={{ color: "#78614E" }}
            >
              Numele tău (opțional)
            </label>
            <input
              value={clientName}
              onChange={(e) => setClientName(e.target.value)}
              placeholder="Nume client"
              className="w-full rounded-xl px-3 py-2 text-sm outline-none mb-3"
              style={{
                border: "1px solid rgba(245,215,160,0.3)",
                backgroundColor: "white",
                color: "#292524",
              }}
            />
            <label
              className="text-xs font-semibold uppercase tracking-wider block mb-2"
              style={{ color: "#78614E" }}
            >
              Lasă un comentariu
            </label>
            <textarea
              value={commentInput}
              onChange={(e) => setCommentInput(e.target.value)}
              placeholder="Ex: 'Poți schimba cuvântul X?' sau 'Imaginea mai luminoasă, te rog'"
              rows={3}
              className="w-full rounded-xl px-3 py-2.5 text-sm outline-none resize-none"
              style={{
                border: "1px solid rgba(245,215,160,0.3)",
                backgroundColor: "white",
                color: "#292524",
              }}
            />
            <button
              type="button"
              onClick={handleComment}
              disabled={commentBusy || !commentInput.trim()}
              className="w-full mt-3 flex items-center justify-center gap-2 py-2.5 rounded-xl font-semibold text-sm disabled:opacity-40"
              style={{
                backgroundColor: "rgba(245,158,11,0.1)",
                color: "#F59E0B",
                border: "1px solid rgba(245,158,11,0.3)",
              }}
            >
              {commentBusy ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Send className="w-4 h-4" />
              )}
              Trimite comentariu
            </button>
          </div>
        )}

        {/* Approve / Reject buttons (only if not already final) */}
        {!finalStatus && post && (
          <div
            className="rounded-2xl p-4"
            style={{
              backgroundColor: "#FFFCF7",
              border: "1px solid rgba(245,215,160,0.3)",
            }}
          >
            <label
              className="text-xs font-semibold uppercase tracking-wider block mb-2"
              style={{ color: "#78614E" }}
            >
              Notă finală (opțional)
            </label>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Adaugă o notă care va însoți verdictul..."
              rows={2}
              className="w-full rounded-xl px-3 py-2.5 text-sm outline-none resize-none mb-3"
              style={{
                border: "1px solid rgba(245,215,160,0.3)",
                backgroundColor: "white",
                color: "#292524",
              }}
            />
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => handleAction("approve")}
                disabled={acting}
                className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl font-bold text-sm disabled:opacity-50"
                style={{ backgroundColor: "#10B981", color: "white" }}
              >
                {acting ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <CheckCircle className="w-4 h-4" />
                )}
                Aprobă
              </button>
              <button
                type="button"
                onClick={() => handleAction("reject")}
                disabled={acting}
                className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl font-bold text-sm disabled:opacity-50"
                style={{ backgroundColor: "#EF4444", color: "white" }}
              >
                {acting ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <XCircle className="w-4 h-4" />
                )}
                Respinge
              </button>
            </div>
          </div>
        )}

        {/* Inline error below content */}
        {error && post && (
          <div
            className="mt-4 p-3 rounded-xl text-sm text-center"
            style={{
              backgroundColor: "rgba(239,68,68,0.08)",
              color: "#B91C1C",
              border: "1px solid rgba(239,68,68,0.2)",
            }}
          >
            {error}
          </div>
        )}
      </div>
    </div>
  );
}
