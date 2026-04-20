"use client";

/**
 * Unified Help widget (bottom-right).
 *
 * Replaces the former split between OnboardingWidget + ReportIssueButton.
 * Three tabs inside one launcher:
 *   - Chat → /api/onboarding/chat (quick product Q&A, tour controls)
 *   - Tour → full app tour / page guide via TourOverlay
 *   - Report → persistent support ticket via /api/support/tickets
 *
 * Bottom-LEFT widget (AskConsultant) stays separate — strategic advice,
 * different purpose.
 */

import { useState, useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import {
  MessageCircle, X, Send, Map, BookOpen, Loader2, AlertCircle,
  CheckCircle2, LifeBuoy,
} from "lucide-react";
import TourOverlay from "./TourOverlay";
import { FULL_TOUR, PAGE_GUIDES } from "@/lib/tourConfig";

const TOUR_KEY = "mh_tour_v1_done";
const TOUR_AUTO_KEY = "mh_tour_v1_auto";

type Tab = "chat" | "tour" | "report";

interface Message {
  role: "user" | "assistant";
  text: string;
}

interface TicketResult {
  ok: boolean;
  ticket_id?: string;
  ai_response?: string;
  escalated?: boolean;
  error?: string;
}

export default function OnboardingWidget() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  // Listen for Header help button click
  useEffect(() => {
    const handler = () => setOpen(prev => !prev);
    window.addEventListener("toggle-help-widget", handler);
    return () => window.removeEventListener("toggle-help-widget", handler);
  }, []);
  const [tab, setTab] = useState<Tab>("chat");
  const [tour, setTour] = useState<"full" | "page" | null>(null);

  // Chat state
  const [messages, setMessages] = useState<Message[]>([
    { role: "assistant", text: "Hi! 👋 I'm your MarketHub assistant. Ask me anything about the platform, take a guided tour, or report an issue." },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Report state
  const [ticketSubject, setTicketSubject] = useState("");
  const [ticketMessage, setTicketMessage] = useState("");
  const [ticketEmail, setTicketEmail] = useState("");
  const [ticketSubmitting, setTicketSubmitting] = useState(false);
  const [ticketResult, setTicketResult] = useState<TicketResult | null>(null);

  // Auto-start tour on first visit
  useEffect(() => {
    if (!localStorage.getItem(TOUR_AUTO_KEY)) {
      localStorage.setItem(TOUR_AUTO_KEY, "1");
      setTimeout(() => setTour("full"), 1500);
    }
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const sendMessage = async () => {
    const text = input.trim();
    if (!text || loading) return;
    setInput("");
    setMessages((m) => [...m, { role: "user", text }]);
    setLoading(true);
    try {
      const res = await fetch("/api/onboarding/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: text, currentPage: pathname }),
      });
      const data = await res.json();
      setMessages((m) => [...m, { role: "assistant", text: data.reply || "Sorry, I couldn't process the request." }]);
    } catch {
      setMessages((m) => [...m, { role: "assistant", text: "Connection error. Please try again." }]);
    } finally {
      setLoading(false);
    }
  };

  const submitTicket = async () => {
    if (ticketMessage.trim().length < 10 || ticketSubmitting) return;
    setTicketSubmitting(true);
    setTicketResult(null);
    try {
      const res = await fetch("/api/support/tickets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          subject: ticketSubject.trim() || undefined,
          message: ticketMessage.trim(),
          email: ticketEmail.trim() || undefined,
          page_url: typeof window !== "undefined" ? window.location.href : "",
          browser_info: typeof navigator !== "undefined"
            ? `${navigator.userAgent} · ${window.innerWidth}x${window.innerHeight}`
            : "",
        }),
      });
      const data = (await res.json()) as TicketResult;
      setTicketResult(data);
    } catch (e) {
      setTicketResult({ ok: false, error: e instanceof Error ? e.message : "Network error" });
    } finally {
      setTicketSubmitting(false);
    }
  };

  const resetTicket = () => {
    setTicketSubject("");
    setTicketMessage("");
    setTicketResult(null);
  };

  const pageSteps = PAGE_GUIDES[pathname] || [];

  return (
    <>
      {/* Tour overlay */}
      {tour === "full" && (
        <TourOverlay
          steps={FULL_TOUR}
          onComplete={() => { setTour(null); localStorage.setItem(TOUR_KEY, "1"); }}
          onClose={() => setTour(null)}
        />
      )}
      {tour === "page" && pageSteps.length > 0 && (
        <TourOverlay
          steps={pageSteps}
          onComplete={() => setTour(null)}
          onClose={() => setTour(null)}
        />
      )}

      {/* Floating button removed — Help is now in header next to bell icon */}

      {/* Panel */}
      {open && (
        <div
          className="fixed bottom-6 right-6 z-[70] flex flex-col rounded-2xl shadow-2xl overflow-hidden"
          style={{
            width: 380,
            height: 560,
            maxHeight: "90dvh",
            background: "#FFFCF7",
            border: "1px solid rgba(200,180,150,0.3)",
            boxShadow: "0 12px 40px rgba(120,97,78,0.15)",
          }}
        >
          {/* Header */}
          <div
            className="flex items-center justify-between px-4 py-3"
            style={{ background: "linear-gradient(135deg, rgba(245,158,11,0.15), rgba(217,119,6,0.1))", borderBottom: "1px solid rgba(245,158,11,0.15)" }}
          >
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: "linear-gradient(135deg, var(--color-primary), var(--color-primary-hover))" }}>
                <LifeBuoy size={14} className="text-white" />
              </div>
              <div>
                <p className="text-sm font-bold" style={{ color: "#2D2620" }}>Help Center</p>
                <p className="text-xs" style={{ color: "#A8967E" }}>Chat · Tour · Report</p>
              </div>
            </div>
            <button type="button" onClick={() => setOpen(false)} style={{ color: "#A8967E" }} aria-label="Close">
              <X size={18} />
            </button>
          </div>

          {/* Tabs */}
          <div className="flex" style={{ borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
            {([
              { id: "chat" as Tab, label: "Chat", icon: MessageCircle },
              { id: "tour" as Tab, label: "Tour", icon: Map },
              { id: "report" as Tab, label: "Report", icon: AlertCircle },
            ]).map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                type="button"
                onClick={() => setTab(id)}
                className="flex-1 flex items-center justify-center gap-1.5 py-2.5 text-xs font-bold transition-all"
                style={{
                  color: tab === id ? "var(--color-primary)" : "#A8967E",
                  background: tab === id ? "rgba(245,158,11,0.08)" : "transparent",
                  borderBottom: tab === id ? "2px solid #F59E0B" : "2px solid transparent",
                }}
              >
                <Icon size={13} />
                {label}
              </button>
            ))}
          </div>

          {/* Tab content */}
          {tab === "chat" && (
            <>
              <div className="flex-1 overflow-y-auto px-3 py-3 space-y-3">
                {messages.map((m, i) => (
                  <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
                    <div
                      className="max-w-[85%] rounded-2xl px-3 py-2 text-sm leading-relaxed"
                      style={m.role === "user"
                        ? { background: "linear-gradient(135deg, var(--color-primary), var(--color-primary-hover))", color: "#1C1814" }
                        : { background: "rgba(255,255,255,0.06)", color: "#F5F0E8" }
                      }
                    >
                      {m.text}
                    </div>
                  </div>
                ))}
                {loading && (
                  <div className="flex justify-start">
                    <div className="rounded-2xl px-3 py-2" style={{ background: "rgba(255,255,255,0.06)" }}>
                      <Loader2 size={14} className="animate-spin" style={{ color: "var(--color-primary)" }} />
                    </div>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>
              <div className="px-3 pb-3">
                <div
                  className="flex items-center gap-2 rounded-xl px-3 py-2"
                  style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.08)" }}
                >
                  <input
                    type="text"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && sendMessage()}
                    placeholder="Ask something..."
                    className="flex-1 bg-transparent text-sm outline-none"
                    style={{ color: "#F5F0E8" }}
                  />
                  <button
                    type="button"
                    onClick={sendMessage}
                    disabled={!input.trim() || loading}
                    className="flex items-center justify-center w-7 h-7 rounded-lg transition-all disabled:opacity-30"
                    style={{ background: "linear-gradient(135deg, var(--color-primary), var(--color-primary-hover))" }}
                    aria-label="Send"
                  >
                    <Send size={12} className="text-white" />
                  </button>
                </div>
              </div>
            </>
          )}

          {tab === "tour" && (
            <div className="flex-1 p-4 space-y-3 overflow-y-auto">
              <p className="text-xs" style={{ color: "#A8967E" }}>
                Take a guided walkthrough of the app, or get a page-specific hint for where you are now.
              </p>
              <button
                type="button"
                onClick={() => { setTour("full"); setOpen(false); }}
                className="w-full flex items-center gap-2 py-3 px-3 rounded-xl text-sm font-bold transition-all hover:opacity-90"
                style={{ background: "rgba(245,158,11,0.12)", color: "var(--color-primary)", border: "1px solid rgba(245,158,11,0.25)" }}
              >
                <Map size={15} />
                Full Application Tour
              </button>
              <button
                type="button"
                onClick={() => { if (pageSteps.length > 0) { setTour("page"); setOpen(false); } }}
                disabled={pageSteps.length === 0}
                className="w-full flex items-center gap-2 py-3 px-3 rounded-xl text-sm font-bold transition-all hover:opacity-90 disabled:opacity-30 disabled:cursor-not-allowed"
                style={{ background: "rgba(99,102,241,0.1)", color: "#818CF8", border: "1px solid rgba(99,102,241,0.2)" }}
              >
                <BookOpen size={15} />
                Page Guide {pageSteps.length === 0 && "(none for this page)"}
              </button>
            </div>
          )}

          {tab === "report" && (
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {!ticketResult ? (
                <>
                  <p className="text-xs" style={{ color: "#A8967E" }}>
                    Describe your issue — our AI replies in your language within seconds and a human steps in for complex cases.
                  </p>
                  <input
                    type="text"
                    value={ticketSubject}
                    onChange={(e) => setTicketSubject(e.target.value)}
                    placeholder="Subject (optional)"
                    className="w-full rounded-lg px-3 py-2 text-sm"
                    style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.08)", color: "#F5F0E8", outline: "none" }}
                  />
                  <textarea
                    value={ticketMessage}
                    onChange={(e) => setTicketMessage(e.target.value)}
                    rows={5}
                    placeholder="Describe what you're experiencing, what you expected, and any error messages you saw..."
                    className="w-full rounded-lg px-3 py-2 text-sm resize-none"
                    style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.08)", color: "#F5F0E8", outline: "none" }}
                  />
                  <input
                    type="email"
                    value={ticketEmail}
                    onChange={(e) => setTicketEmail(e.target.value)}
                    placeholder="Your email (optional)"
                    className="w-full rounded-lg px-3 py-2 text-sm"
                    style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.08)", color: "#F5F0E8", outline: "none" }}
                  />
                  <button
                    type="button"
                    onClick={submitTicket}
                    disabled={ticketMessage.trim().length < 10 || ticketSubmitting}
                    className="w-full py-3 rounded-xl text-sm font-bold disabled:opacity-40 flex items-center justify-center gap-2"
                    style={{ background: "linear-gradient(135deg, var(--color-primary), var(--color-primary-hover))", color: "#1C1814" }}
                  >
                    {ticketSubmitting ? (<><Loader2 size={14} className="animate-spin" /> Sending...</>) : (<><Send size={14} /> Send</>)}
                  </button>
                </>
              ) : ticketResult.ok ? (
                <>
                  <div className="rounded-lg p-3 flex items-start gap-2" style={{ background: "rgba(16,185,129,0.08)", border: "1px solid rgba(16,185,129,0.3)" }}>
                    <CheckCircle2 size={14} style={{ color: "#10B981" }} className="mt-0.5 flex-shrink-0" />
                    <div className="flex-1">
                      <p className="text-sm font-bold" style={{ color: "#A7F3D0" }}>Ticket received</p>
                      <p className="text-xs mt-0.5" style={{ color: "#A8967E" }}>
                        Ticket #{ticketResult.ticket_id?.slice(0, 8)} · {ticketResult.escalated ? "Escalated to team" : "AI responded"}
                      </p>
                    </div>
                  </div>
                  {ticketResult.ai_response && (
                    <div className="rounded-lg p-3" style={{ background: "rgba(245,158,11,0.06)", border: "1px solid rgba(245,158,11,0.2)" }}>
                      <p className="text-xs font-bold mb-1" style={{ color: "var(--color-primary)" }}>AI Assistant</p>
                      <p className="text-sm whitespace-pre-wrap" style={{ color: "#F5F0E8", lineHeight: 1.5 }}>{ticketResult.ai_response}</p>
                    </div>
                  )}
                  {ticketResult.escalated && (
                    <p className="text-xs italic" style={{ color: "#A8967E" }}>A team member will follow up personally within a few hours.</p>
                  )}
                  <button
                    type="button"
                    onClick={resetTicket}
                    className="w-full py-2.5 rounded-xl text-sm font-semibold"
                    style={{ background: "rgba(245,158,11,0.12)", color: "var(--color-primary)" }}
                  >
                    Send another
                  </button>
                </>
              ) : (
                <>
                  <div className="rounded-lg p-3 flex items-start gap-2" style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.3)" }}>
                    <AlertCircle size={14} style={{ color: "#EF4444" }} className="mt-0.5 flex-shrink-0" />
                    <div className="flex-1">
                      <p className="text-sm font-bold" style={{ color: "#FCA5A5" }}>Could not send</p>
                      <p className="text-xs mt-0.5" style={{ color: "#A8967E" }}>{ticketResult.error ?? "Please try again."}</p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={resetTicket}
                    className="w-full py-2.5 rounded-xl text-sm font-semibold"
                    style={{ background: "linear-gradient(135deg, var(--color-primary), var(--color-primary-hover))", color: "#1C1814" }}
                  >
                    Try again
                  </button>
                </>
              )}
            </div>
          )}
        </div>
      )}
    </>
  );
}
