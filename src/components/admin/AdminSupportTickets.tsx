"use client";

/**
 * Admin — Support Tickets panel (M4 Sprint 1)
 *
 * Lists tickets with filter chips, shows AI response inline, allows admin
 * to reply and change status. Escalated tickets highlighted in red.
 */

import { useEffect, useState, useCallback } from "react";
import { MessageCircle, AlertTriangle, CheckCircle2, Clock, Loader2, Send, RefreshCw } from "lucide-react";

interface Ticket {
  id: string;
  user_id: string | null;
  email: string | null;
  source: string;
  category: string | null;
  language: string | null;
  subject: string | null;
  message: string;
  page_url: string | null;
  status: string;
  ai_response: string | null;
  ai_confidence: number | null;
  escalated_at: string | null;
  resolved_at: string | null;
  created_at: string;
}

const STATUS_COLORS: Record<string, { bg: string; color: string; label: string }> = {
  new:            { bg: "rgba(59,130,246,0.12)", color: "#3B82F6", label: "New" },
  ai_responded:   { bg: "rgba(139,92,246,0.12)", color: "#8B5CF6", label: "AI Responded" },
  investigating:  { bg: "rgba(245,158,11,0.12)", color: "var(--color-primary)", label: "Investigating" },
  escalated:      { bg: "rgba(239,68,68,0.12)",  color: "#EF4444", label: "Escalated" },
  resolved:       { bg: "rgba(16,185,129,0.12)", color: "#10B981", label: "Resolved" },
  closed:         { bg: "rgba(100,116,139,0.1)", color: "#64748B", label: "Closed" },
};

const FILTERS = ["all", "new", "escalated", "ai_responded", "resolved"] as const;

export default function AdminSupportTickets() {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [filter, setFilter] = useState<typeof FILTERS[number]>("all");
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Ticket | null>(null);
  const [reply, setReply] = useState("");
  const [resolutionNote, setResolutionNote] = useState("");
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/support-tickets?status=${filter}`, { cache: "no-store" });
      if (res.ok) {
        const data = await res.json();
        setTickets(data.tickets ?? []);
        setCounts(data.counts ?? {});
      }
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => { load(); }, [load]);

  const resolve = async (ticket: Ticket) => {
    setSaving(true);
    await fetch("/api/admin/support-tickets", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ticket_id: ticket.id,
        status: "resolved",
        admin_reply: reply.trim() || undefined,
        // When a resolution_note is provided, the backend auto-saves the
        // pair (symptom, solution) into resolved_issues (M5 Learning DB) so
        // future similar tickets / consultant queries can find the answer.
        resolution_note: resolutionNote.trim() || undefined,
      }),
    });
    setReply("");
    setResolutionNote("");
    setSelected(null);
    setSaving(false);
    await load();
  };

  const investigating = async (ticket: Ticket) => {
    await fetch("/api/admin/support-tickets", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ticket_id: ticket.id, status: "investigating" }),
    });
    await load();
  };

  const total = Object.values(counts).reduce((s, n) => s + n, 0);

  return (
    <div className="space-y-4">
      {/* Header + refresh */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold" style={{ color: "var(--color-text)" }}>Support Tickets</h2>
          <p className="text-xs" style={{ color: "#78614E" }}>
            {total} total · {counts.escalated ?? 0} escalated · {counts.new ?? 0} new
          </p>
        </div>
        <button
          type="button"
          onClick={load}
          className="p-2 rounded-lg"
          style={{ backgroundColor: "rgba(245,158,11,0.1)", color: "var(--color-primary)" }}
        >
          <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
        </button>
      </div>

      {/* Filter chips */}
      <div className="flex flex-wrap gap-2">
        {FILTERS.map((f) => (
          <button
            key={f}
            type="button"
            onClick={() => setFilter(f)}
            className="px-3 py-1.5 rounded-full text-xs font-semibold transition-all"
            style={{
              backgroundColor: filter === f ? "var(--color-text)" : "rgba(120,97,78,0.1)",
              color: filter === f ? "white" : "#78614E",
            }}
          >
            {f === "all" ? `All (${total})` : `${STATUS_COLORS[f]?.label ?? f} (${counts[f] ?? 0})`}
          </button>
        ))}
      </div>

      {/* List */}
      {loading && tickets.length === 0 ? (
        <div className="flex justify-center py-12">
          <Loader2 className="w-6 h-6 animate-spin" style={{ color: "var(--color-primary)" }} />
        </div>
      ) : tickets.length === 0 ? (
        <div className="rounded-2xl p-8 text-center" style={{ backgroundColor: "rgba(120,97,78,0.04)" }}>
          <MessageCircle className="w-8 h-8 mx-auto mb-2" style={{ color: "#C4AA8A" }} />
          <p className="text-sm" style={{ color: "#78614E" }}>
            No tickets with status: <b>{filter}</b>
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {tickets.map((t) => {
            const st = STATUS_COLORS[t.status] ?? STATUS_COLORS.new;
            const isEscalated = t.status === "escalated";
            return (
              <div
                key={t.id}
                onClick={() => setSelected(selected?.id === t.id ? null : t)}
                className="rounded-xl p-3 cursor-pointer transition-all hover:shadow-md"
                style={{
                  backgroundColor: "white",
                  border: `1px solid ${isEscalated ? "rgba(239,68,68,0.3)" : "rgba(245,215,160,0.3)"}`,
                  borderLeft: `3px solid ${st.color}`,
                }}
              >
                <div className="flex items-center gap-2 mb-1.5">
                  <span
                    className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide"
                    style={{ backgroundColor: st.bg, color: st.color }}
                  >
                    {st.label}
                  </span>
                  {t.category && (
                    <span className="text-[10px]" style={{ color: "#A8967E" }}>
                      · {t.category}
                    </span>
                  )}
                  {t.language && t.language !== "en" && (
                    <span className="text-[10px] uppercase" style={{ color: "var(--color-primary)" }}>
                      · {t.language}
                    </span>
                  )}
                  {t.ai_confidence != null && (
                    <span className="text-[10px]" style={{ color: "#A8967E" }}>
                      · AI {(t.ai_confidence * 100).toFixed(0)}%
                    </span>
                  )}
                  <span className="ml-auto text-[10px]" style={{ color: "#A8967E" }}>
                    {new Date(t.created_at).toLocaleString("en-GB", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}
                  </span>
                </div>
                {t.subject && (
                  <p className="text-sm font-semibold mb-1" style={{ color: "var(--color-text)" }}>
                    {t.subject}
                  </p>
                )}
                <p className="text-xs line-clamp-2" style={{ color: "#78614E" }}>
                  {t.message}
                </p>
                <p className="text-[10px] mt-1" style={{ color: "#A8967E" }}>
                  {t.email ?? "anonymous"} · {t.page_url ? new URL(t.page_url).pathname : ""}
                </p>

                {selected?.id === t.id && (
                  <div
                    className="mt-3 pt-3 border-t space-y-3"
                    style={{ borderColor: "rgba(245,215,160,0.4)" }}
                    onClick={(e) => e.stopPropagation()}
                  >
                    {/* Full message */}
                    <div className="rounded-lg p-2.5" style={{ backgroundColor: "rgba(120,97,78,0.05)" }}>
                      <p className="text-[10px] font-bold mb-1" style={{ color: "#78614E" }}>User said:</p>
                      <p className="text-xs whitespace-pre-wrap" style={{ color: "var(--color-text)" }}>{t.message}</p>
                    </div>

                    {/* AI response */}
                    {t.ai_response && (
                      <div className="rounded-lg p-2.5" style={{ backgroundColor: "rgba(245,158,11,0.06)" }}>
                        <p className="text-[10px] font-bold mb-1" style={{ color: "var(--color-primary-hover)" }}>🤖 AI Response:</p>
                        <p className="text-xs whitespace-pre-wrap" style={{ color: "var(--color-text)" }}>{t.ai_response}</p>
                      </div>
                    )}

                    {/* Admin reply box */}
                    {t.status !== "resolved" && t.status !== "closed" && (
                      <div>
                        <label className="block text-[10px] font-bold mb-1" style={{ color: "#78614E" }}>
                          Admin Reply (optional — leave empty to just change status)
                        </label>
                        <textarea
                          value={reply}
                          onChange={(e) => setReply(e.target.value)}
                          rows={3}
                          placeholder="Your reply to the user..."
                          className="w-full rounded-lg px-3 py-2 text-xs resize-none"
                          style={{
                            backgroundColor: "white",
                            border: "1px solid rgba(245,215,160,0.4)",
                            color: "var(--color-text)",
                            outline: "none",
                          }}
                        />

                        {/* M5 Learning DB — capture resolution for future auto-answers */}
                        <label
                          className="block text-[10px] font-bold mt-2 mb-1"
                          style={{ color: "#8B5CF6" }}
                        >
                          🧠 Learning Note (optional — saves to Learning DB so AI can reuse)
                        </label>
                        <textarea
                          value={resolutionNote}
                          onChange={(e) => setResolutionNote(e.target.value)}
                          rows={2}
                          placeholder="e.g. &quot;User had expired IG token — guided them to Settings → Integrations → Reconnect. Common issue, happens every 60 days.&quot;"
                          className="w-full rounded-lg px-3 py-2 text-xs resize-none"
                          style={{
                            backgroundColor: "rgba(139,92,246,0.04)",
                            border: "1px solid rgba(139,92,246,0.25)",
                            color: "var(--color-text)",
                            outline: "none",
                          }}
                        />
                        <p className="text-[9px] mt-1" style={{ color: "#A8967E" }}>
                          Fill this only when resolving. The consultant AI will surface
                          this solution for future similar questions.
                        </p>

                        <div className="flex gap-2 mt-2">
                          {t.status === "new" && (
                            <button
                              type="button"
                              onClick={() => investigating(t)}
                              className="flex-1 py-2 rounded-lg text-xs font-bold"
                              style={{ backgroundColor: "rgba(245,158,11,0.12)", color: "var(--color-primary)" }}
                            >
                              Mark investigating
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => resolve(t)}
                            disabled={saving}
                            className="flex-1 py-2 rounded-lg text-xs font-bold flex items-center justify-center gap-1 disabled:opacity-50"
                            style={{
                              background: "linear-gradient(135deg, #10B981, #059669)",
                              color: "white",
                            }}
                          >
                            {saving ? <Loader2 className="w-3 h-3 animate-spin" /> : <CheckCircle2 className="w-3 h-3" />}
                            Resolve
                          </button>
                        </div>
                      </div>
                    )}

                    {t.resolved_at && (
                      <p className="text-[10px]" style={{ color: "#10B981" }}>
                        ✓ Resolved {new Date(t.resolved_at).toLocaleString()}
                      </p>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
