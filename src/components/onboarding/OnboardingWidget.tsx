"use client";

import { useState, useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import {
  MessageCircle, X, Send, Map, BookOpen, Loader2, ChevronDown,
} from "lucide-react";
import TourOverlay from "./TourOverlay";
import { FULL_TOUR, PAGE_GUIDES } from "@/lib/tourConfig";

const TOUR_KEY = "mh_tour_v1_done";
const TOUR_AUTO_KEY = "mh_tour_v1_auto";

interface Message {
  role: "user" | "assistant";
  text: string;
}

export default function OnboardingWidget() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [tour, setTour] = useState<"full" | "page" | null>(null);
  const [messages, setMessages] = useState<Message[]>([
    { role: "assistant", text: "Hi! 👋 I'm your MarketHub assistant. Ask me anything about the platform or use the buttons below to start a guided tour." }
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

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
    setMessages(m => [...m, { role: "user", text }]);
    setLoading(true);
    try {
      const res = await fetch("/api/onboarding/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: text, currentPage: pathname }),
      });
      const data = await res.json();
      setMessages(m => [...m, { role: "assistant", text: data.reply || "Sorry, I couldn't process the request." }]);
    } catch {
      setMessages(m => [...m, { role: "assistant", text: "Connection error. Please try again." }]);
    } finally {
      setLoading(false);
    }
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

      {/* Floating button */}
      {!open && (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="fixed bottom-24 right-6 z-50 flex items-center gap-2 px-4 py-3 rounded-2xl font-bold text-sm shadow-2xl transition-all hover:scale-105"
          style={{
            background: "linear-gradient(135deg, #F59E0B, #D97706)",
            color: "#1C1814",
          }}
        >
          <MessageCircle size={18} />
          Help & Tour
        </button>
      )}

      {/* Chat panel */}
      {open && (
        <div
          className="fixed bottom-6 right-6 z-50 flex flex-col rounded-2xl shadow-2xl overflow-hidden"
          style={{
            width: 360,
            height: 520,
            background: "#1C1814",
            border: "1px solid rgba(245,158,11,0.25)",
          }}
        >
          {/* Header */}
          <div
            className="flex items-center justify-between px-4 py-3"
            style={{ background: "linear-gradient(135deg, rgba(245,158,11,0.15), rgba(217,119,6,0.1))", borderBottom: "1px solid rgba(245,158,11,0.15)" }}
          >
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: "linear-gradient(135deg, #F59E0B, #D97706)" }}>
                <MessageCircle size={14} className="text-white" />
              </div>
              <div>
                <p className="text-sm font-bold" style={{ color: "#FFF8F0" }}>MarketHub Assistant</p>
                <p className="text-xs" style={{ color: "#A8967E" }}>AI · Instant replies</p>
              </div>
            </div>
            <button type="button" onClick={() => setOpen(false)} style={{ color: "#A8967E" }}>
              <X size={18} />
            </button>
          </div>

          {/* Tour buttons */}
          <div className="flex gap-2 px-3 py-2" style={{ borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
            <button
              type="button"
              onClick={() => { setTour("full"); setOpen(false); }}
              className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-bold transition-all hover:opacity-90"
              style={{ background: "rgba(245,158,11,0.12)", color: "#F59E0B", border: "1px solid rgba(245,158,11,0.25)" }}
            >
              <Map size={13} />
              Full Application Tour
            </button>
            <button
              type="button"
              onClick={() => { if (pageSteps.length > 0) { setTour("page"); setOpen(false); } }}
              disabled={pageSteps.length === 0}
              className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-bold transition-all hover:opacity-90 disabled:opacity-30 disabled:cursor-not-allowed"
              style={{ background: "rgba(99,102,241,0.1)", color: "#818CF8", border: "1px solid rgba(99,102,241,0.2)" }}
            >
              <BookOpen size={13} />
              Page Guide
            </button>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto px-3 py-3 space-y-3">
            {messages.map((m, i) => (
              <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
                <div
                  className="max-w-[85%] rounded-2xl px-3 py-2 text-sm leading-relaxed"
                  style={m.role === "user"
                    ? { background: "linear-gradient(135deg, #F59E0B, #D97706)", color: "#1C1814" }
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
                  <Loader2 size={14} className="animate-spin" style={{ color: "#F59E0B" }} />
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <div className="px-3 pb-3">
            <div
              className="flex items-center gap-2 rounded-xl px-3 py-2"
              style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.08)" }}
            >
              <input
                type="text"
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={e => e.key === "Enter" && sendMessage()}
                placeholder="Ask something..."
                className="flex-1 bg-transparent text-sm outline-none"
                style={{ color: "#F5F0E8" }}
              />
              <button
                type="button"
                onClick={sendMessage}
                disabled={!input.trim() || loading}
                className="flex items-center justify-center w-7 h-7 rounded-lg transition-all disabled:opacity-30"
                style={{ background: "linear-gradient(135deg, #F59E0B, #D97706)" }}
              >
                <Send size={12} className="text-white" />
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
