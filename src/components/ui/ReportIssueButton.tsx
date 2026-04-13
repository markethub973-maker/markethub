"use client";

/**
 * Report Issue Button — M4 Sprint 1
 *
 * Floating button (bottom-right) visible on every page. Opens a modal where
 * the user can describe an issue / ask a question. Submits to
 * /api/support/tickets which creates a ticket + triggers AI auto-response
 * (Haiku 4.5, multilingual — RO/EN/FR/DE/ES/IT/PT/PL/NL).
 *
 * If AI confidence is low or the category is sensitive (billing, legal,
 * security), the ticket is auto-escalated to admin via Telegram + email.
 */

import { useState } from "react";
import { MessageCircle, X, Send, CheckCircle2, Loader2, AlertCircle } from "lucide-react";

interface ApiResult {
  ok: boolean;
  ticket_id?: string;
  ai_response?: string;
  language?: string;
  escalated?: boolean;
  error?: string;
}

export default function ReportIssueButton() {
  const [open, setOpen] = useState(false);
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<ApiResult | null>(null);

  const canSubmit = message.trim().length >= 10 && !submitting;

  const submit = async () => {
    if (!canSubmit) return;
    setSubmitting(true);
    setResult(null);
    try {
      const res = await fetch("/api/support/tickets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          subject: subject.trim() || undefined,
          message: message.trim(),
          email: email.trim() || undefined,
          page_url: typeof window !== "undefined" ? window.location.href : "",
          browser_info: typeof navigator !== "undefined"
            ? `${navigator.userAgent} · ${window.innerWidth}x${window.innerHeight}`
            : "",
        }),
      });
      const data = (await res.json()) as ApiResult;
      setResult(data);
    } catch (e) {
      setResult({ ok: false, error: e instanceof Error ? e.message : "Network error" });
    } finally {
      setSubmitting(false);
    }
  };

  const reset = () => {
    setSubject("");
    setMessage("");
    setResult(null);
  };

  const closeModal = () => {
    setOpen(false);
    // Keep result visible in case user re-opens (can reset via "Send another")
  };

  return (
    <>
      {/* Floating trigger */}
      {!open && (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="fixed bottom-4 right-4 z-[60] rounded-full shadow-lg transition-all hover:scale-105 flex items-center gap-2 px-4 py-3"
          style={{
            background: "linear-gradient(135deg, #F59E0B, #D97706)",
            color: "#1C1814",
            boxShadow: "0 4px 20px rgba(245,158,11,0.4)",
          }}
          aria-label="Report an issue or ask a question"
        >
          <MessageCircle className="w-4 h-4" />
          <span className="text-sm font-bold hidden sm:inline">Need help?</span>
        </button>
      )}

      {/* Modal overlay */}
      {open && (
        <div
          className="fixed inset-0 z-[70] flex items-end sm:items-center justify-center p-0 sm:p-4"
          style={{ backgroundColor: "rgba(0,0,0,0.5)" }}
          onClick={(e) => { if (e.target === e.currentTarget) closeModal(); }}
        >
          <div
            className="w-full sm:max-w-md rounded-t-2xl sm:rounded-2xl overflow-hidden flex flex-col"
            style={{ backgroundColor: "#FFFCF7", maxHeight: "90dvh" }}
          >
            {/* Header */}
            <div
              className="flex items-center gap-3 px-4 py-3 border-b"
              style={{ borderColor: "rgba(245,215,160,0.3)", backgroundColor: "#FFF8F0" }}
            >
              <MessageCircle className="w-5 h-5" style={{ color: "#F59E0B" }} />
              <p className="font-bold text-sm flex-1" style={{ color: "#292524" }}>
                Need help?
              </p>
              <button
                type="button"
                onClick={closeModal}
                className="p-1 rounded"
                style={{ color: "#78614E" }}
                aria-label="Close"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Body */}
            <div className="p-4 space-y-3 overflow-y-auto flex-1">
              {!result ? (
                <>
                  <p className="text-xs" style={{ color: "#78614E" }}>
                    Describe your issue or question. Our AI assistant replies in your language
                    within seconds. Complex cases are escalated to a human.
                  </p>

                  <div>
                    <label className="block text-xs font-semibold mb-1" style={{ color: "#78614E" }}>
                      Subject <span style={{ color: "#C4AA8A" }}>(optional)</span>
                    </label>
                    <input
                      type="text"
                      value={subject}
                      onChange={(e) => setSubject(e.target.value)}
                      placeholder="e.g. Cannot connect Instagram"
                      className="w-full rounded-lg px-3 py-2 text-sm"
                      style={{
                        backgroundColor: "white",
                        border: "1px solid rgba(245,215,160,0.4)",
                        color: "#292524",
                        outline: "none",
                      }}
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold mb-1" style={{ color: "#78614E" }}>
                      Message <span style={{ color: "#EF4444" }}>*</span>
                    </label>
                    <textarea
                      value={message}
                      onChange={(e) => setMessage(e.target.value)}
                      rows={5}
                      placeholder="Describe what you're experiencing, what you expected, and any error messages you saw..."
                      className="w-full rounded-lg px-3 py-2 text-sm resize-none"
                      style={{
                        backgroundColor: "white",
                        border: "1px solid rgba(245,215,160,0.4)",
                        color: "#292524",
                        outline: "none",
                      }}
                    />
                    <p className="text-[10px] mt-1" style={{ color: "#A8967E" }}>
                      Write in any language — the AI detects it automatically.
                    </p>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold mb-1" style={{ color: "#78614E" }}>
                      Your email <span style={{ color: "#C4AA8A" }}>(for follow-up, optional)</span>
                    </label>
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="you@example.com"
                      className="w-full rounded-lg px-3 py-2 text-sm"
                      style={{
                        backgroundColor: "white",
                        border: "1px solid rgba(245,215,160,0.4)",
                        color: "#292524",
                        outline: "none",
                      }}
                    />
                  </div>

                  <button
                    type="button"
                    onClick={submit}
                    disabled={!canSubmit}
                    className="w-full py-3 rounded-xl text-sm font-bold transition-all disabled:opacity-40 flex items-center justify-center gap-2"
                    style={{
                      background: "linear-gradient(135deg, #F59E0B, #D97706)",
                      color: "#1C1814",
                    }}
                  >
                    {submitting ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" /> Sending...
                      </>
                    ) : (
                      <>
                        <Send className="w-4 h-4" /> Send
                      </>
                    )}
                  </button>
                </>
              ) : result.ok ? (
                <>
                  <div
                    className="rounded-lg p-3 flex items-start gap-2"
                    style={{ backgroundColor: "rgba(16,185,129,0.08)", border: "1px solid rgba(16,185,129,0.3)" }}
                  >
                    <CheckCircle2 className="w-4 h-4 mt-0.5 flex-shrink-0" style={{ color: "#10B981" }} />
                    <div className="flex-1">
                      <p className="text-sm font-bold" style={{ color: "#065F46" }}>
                        Ticket received
                      </p>
                      <p className="text-xs mt-0.5" style={{ color: "#78614E" }}>
                        Ticket #{result.ticket_id?.slice(0, 8)} ·{" "}
                        {result.escalated ? "Escalated to team" : "AI responded"}
                      </p>
                    </div>
                  </div>

                  {result.ai_response && (
                    <div
                      className="rounded-lg p-3"
                      style={{ backgroundColor: "rgba(245,158,11,0.06)", border: "1px solid rgba(245,158,11,0.2)" }}
                    >
                      <p className="text-xs font-bold mb-1" style={{ color: "#D97706" }}>
                        AI Assistant
                      </p>
                      <p className="text-sm whitespace-pre-wrap" style={{ color: "#292524", lineHeight: 1.5 }}>
                        {result.ai_response}
                      </p>
                    </div>
                  )}

                  {result.escalated && (
                    <p className="text-xs italic" style={{ color: "#78614E" }}>
                      A team member will follow up personally within a few hours.
                    </p>
                  )}

                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={reset}
                      className="flex-1 py-2.5 rounded-xl text-sm font-semibold"
                      style={{
                        backgroundColor: "rgba(245,158,11,0.1)",
                        color: "#D97706",
                      }}
                    >
                      Send another
                    </button>
                    <button
                      type="button"
                      onClick={closeModal}
                      className="flex-1 py-2.5 rounded-xl text-sm font-semibold"
                      style={{
                        backgroundColor: "#292524",
                        color: "white",
                      }}
                    >
                      Close
                    </button>
                  </div>
                </>
              ) : (
                <>
                  <div
                    className="rounded-lg p-3 flex items-start gap-2"
                    style={{ backgroundColor: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.3)" }}
                  >
                    <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" style={{ color: "#EF4444" }} />
                    <div className="flex-1">
                      <p className="text-sm font-bold" style={{ color: "#B91C1C" }}>
                        Could not send
                      </p>
                      <p className="text-xs mt-0.5" style={{ color: "#78614E" }}>
                        {result.error ?? "Please try again."}
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={reset}
                    className="w-full py-2.5 rounded-xl text-sm font-semibold"
                    style={{
                      background: "linear-gradient(135deg, #F59E0B, #D97706)",
                      color: "#1C1814",
                    }}
                  >
                    Try again
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
