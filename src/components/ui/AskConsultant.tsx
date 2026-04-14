"use client";

/**
 * Ask Consultant — M9 Sprint 1
 *
 * Floating button (bottom-left) that opens a conversational AI consultant.
 * 4 intelligence levels (explanation / alternatives / contextual / strategic)
 * picked automatically by the model based on the question. Context-aware:
 * sends current page URL + form state when opened. Multilingual.
 *
 * Distinct from ReportIssueButton (bottom-right, support tickets):
 *  - ReportIssue  → persistent tickets, human escalation
 *  - AskConsultant → live chat, strategic/in-product guidance
 */

import { useEffect, useRef, useState } from "react";
import { Sparkles, X, Send, Loader2, ExternalLink } from "lucide-react";

interface Turn {
  role: "user" | "assistant";
  text: string;
  level?: number;
  action?: { label: string; url: string } | null;
}

interface ApiResp {
  ok: boolean;
  session_id?: string;
  level?: number;
  language?: string;
  response?: string;
  suggested_action?: { label: string; url: string } | null;
  error?: string;
}

const LEVEL_LABEL: Record<number, string> = {
  1: "Explanation",
  2: "Alternatives",
  3: "Contextual",
  4: "Strategic",
};

export default function AskConsultant() {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [turns, setTurns] = useState<Turn[]>([]);
  const [sending, setSending] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement | null>(null);

  // Hide on prospect-facing public pages — confusing for someone who has
  // never logged in and would expose an admin-looking chat in a sales context.
  const [hideOnPublic, setHideOnPublic] = useState(false);
  useEffect(() => {
    if (typeof window === "undefined") return;
    const p = window.location.pathname;
    if (p.startsWith("/offer") || p === "/promo" || p === "/pricing" || p === "/") {
      setHideOnPublic(true);
    }
  }, []);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [turns, sending]);

  const send = async () => {
    const msg = input.trim();
    if (!msg || sending) return;
    setSending(true);
    setTurns((prev) => [...prev, { role: "user", text: msg }]);
    setInput("");
    try {
      const res = await fetch("/api/consultant/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: msg,
          session_id: sessionId ?? undefined,
          page_url: typeof window !== "undefined" ? window.location.href : "",
        }),
      });
      const data = (await res.json()) as ApiResp;
      if (data.ok && data.response) {
        if (!sessionId && data.session_id) setSessionId(data.session_id);
        setTurns((prev) => [
          ...prev,
          {
            role: "assistant",
            text: data.response!,
            level: data.level,
            action: data.suggested_action ?? null,
          },
        ]);
      } else {
        setTurns((prev) => [
          ...prev,
          { role: "assistant", text: data.error ?? "Something went wrong." },
        ]);
      }
    } catch (e) {
      setTurns((prev) => [
        ...prev,
        {
          role: "assistant",
          text: e instanceof Error ? e.message : "Network error",
        },
      ]);
    } finally {
      setSending(false);
    }
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  };

  if (hideOnPublic) return null;

  return (
    <>
      {!open && (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="fixed bottom-4 left-4 z-[60] rounded-full shadow-lg transition-all hover:scale-105 flex items-center gap-2 px-4 py-3"
          style={{
            background: "linear-gradient(135deg, #8B5CF6, #6D28D9)",
            color: "white",
            boxShadow: "0 4px 20px rgba(139,92,246,0.4)",
          }}
          aria-label="Ask the consultant"
        >
          <Sparkles className="w-4 h-4" />
          <span className="text-sm font-bold hidden sm:inline">Ask consultant</span>
        </button>
      )}

      {open && (
        <div
          className="fixed inset-0 z-[70] flex items-end sm:items-center sm:justify-start p-0 sm:p-4"
          style={{ backgroundColor: "rgba(0,0,0,0.5)" }}
          onClick={(e) => {
            if (e.target === e.currentTarget) setOpen(false);
          }}
        >
          <div
            className="w-full sm:max-w-md sm:ml-4 rounded-t-2xl sm:rounded-2xl overflow-hidden flex flex-col"
            style={{ backgroundColor: "var(--color-bg-secondary)", maxHeight: "90dvh", height: "600px" }}
          >
            <div
              className="flex items-center gap-3 px-4 py-3 border-b"
              style={{
                borderColor: "rgba(139,92,246,0.2)",
                background: "linear-gradient(135deg, rgba(139,92,246,0.08), rgba(109,40,217,0.08))",
              }}
            >
              <Sparkles className="w-5 h-5" style={{ color: "#8B5CF6" }} />
              <div className="flex-1">
                <p className="font-bold text-sm" style={{ color: "var(--color-text)" }}>
                  Consultant
                </p>
                <p className="text-[10px]" style={{ color: "#78614E" }}>
                  Strategic advice · any language · context-aware
                </p>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="p-1 rounded"
                style={{ color: "#78614E" }}
                aria-label="Close"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-3">
              {turns.length === 0 && (
                <div
                  className="rounded-lg p-3 text-xs"
                  style={{
                    backgroundColor: "rgba(139,92,246,0.06)",
                    border: "1px solid rgba(139,92,246,0.2)",
                    color: "#5B21B6",
                  }}
                >
                  <p className="font-semibold mb-1">Hi 👋 I'm your consultant.</p>
                  <p>Ask me:</p>
                  <ul className="mt-1 space-y-0.5 pl-3 list-disc">
                    <li>"What does this feature do?"</li>
                    <li>"How do I post to multiple platforms at once?"</li>
                    <li>"Which plan fits a 3-person agency?"</li>
                    <li>"Why are my Reels not getting reach?"</li>
                  </ul>
                </div>
              )}

              {turns.map((t, i) => (
                <div
                  key={i}
                  className={`flex ${t.role === "user" ? "justify-end" : "justify-start"}`}
                >
                  <div
                    className="max-w-[85%] rounded-2xl px-3 py-2"
                    style={{
                      backgroundColor:
                        t.role === "user" ? "var(--color-text)" : "rgba(139,92,246,0.08)",
                      color: t.role === "user" ? "white" : "var(--color-text)",
                      border:
                        t.role === "assistant"
                          ? "1px solid rgba(139,92,246,0.2)"
                          : "none",
                    }}
                  >
                    {t.role === "assistant" && t.level && (
                      <p
                        className="text-[9px] font-bold uppercase tracking-wide mb-1"
                        style={{ color: "#8B5CF6" }}
                      >
                        {LEVEL_LABEL[t.level] ?? "Reply"}
                      </p>
                    )}
                    <p className="text-sm whitespace-pre-wrap" style={{ lineHeight: 1.5 }}>
                      {t.text}
                    </p>
                    {t.action && (
                      <a
                        href={t.action.url}
                        className="mt-2 inline-flex items-center gap-1 text-xs font-semibold rounded-md px-2 py-1"
                        style={{
                          backgroundColor: "#8B5CF6",
                          color: "white",
                        }}
                      >
                        {t.action.label}
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    )}
                  </div>
                </div>
              ))}

              {sending && (
                <div className="flex justify-start">
                  <div
                    className="rounded-2xl px-3 py-2 flex items-center gap-2"
                    style={{
                      backgroundColor: "rgba(139,92,246,0.08)",
                      border: "1px solid rgba(139,92,246,0.2)",
                      color: "#78614E",
                    }}
                  >
                    <Loader2 className="w-3 h-3 animate-spin" />
                    <span className="text-xs">Thinking...</span>
                  </div>
                </div>
              )}
            </div>

            <div
              className="p-3 border-t"
              style={{
                borderColor: "rgba(139,92,246,0.15)",
                backgroundColor: "var(--color-bg)",
              }}
            >
              <div className="flex gap-2 items-end">
                <textarea
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={onKeyDown}
                  rows={1}
                  placeholder="Ask anything — in any language..."
                  className="flex-1 rounded-lg px-3 py-2 text-sm resize-none"
                  style={{
                    backgroundColor: "white",
                    border: "1px solid rgba(139,92,246,0.25)",
                    color: "var(--color-text)",
                    outline: "none",
                    maxHeight: "120px",
                  }}
                />
                <button
                  type="button"
                  onClick={send}
                  disabled={!input.trim() || sending}
                  className="p-2 rounded-lg disabled:opacity-40 flex-shrink-0"
                  style={{
                    background: "linear-gradient(135deg, #8B5CF6, #6D28D9)",
                    color: "white",
                  }}
                  aria-label="Send"
                >
                  <Send className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
