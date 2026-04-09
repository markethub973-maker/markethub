"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { Send, Sparkles, RefreshCw, Lightbulb, GitBranch, Target, Maximize2, Minimize2, Bot } from "lucide-react";

const AMBER = "#F59E0B";
const GREEN = "#1DB954";
const BG_SCREEN = "#0F0D0B";
const BG_MSG_AI = "#1C1814";
const BG_MSG_USER = "rgba(245,158,11,0.12)";

// ── Types ─────────────────────────────────────────────────────────────────────
interface Message {
  role: "user" | "ai";
  content: string;
  structured?: {
    main_insight?: string;
    tips?: string[];
    alternatives?: string[];
    timing?: string;
    content_ideas?: string[];
    format_tip?: string;
    warning?: string;
  };
  ts: number;
}

interface Props {
  sessionId: string;
  step: number;
  offerType: string;
  offerText: string;
  audienceType: string;
  location: string;
  budgetRange: string;
  offerSummary?: string;
  activeLead?: { title?: string; score?: number; label?: string };
  campaignDone?: boolean;
  /** Structured target market — when provided, every APEX call is forced
   *  into the matching language and biased toward this market's channels. */
  country?: string;
  contentLanguage?: string;
  marketScope?: string;
  /** Called when the API returns 402 LIMIT_REACHED so the parent page
   *  can render a single, shared UpgradePromptModal. */
  onLimitReached?: (payload: { current: number; limit: number; resetDate: string }) => void;
  /** Called with the latest remaining count after a successful Premium
   *  AI Action so the parent page can render the credits banner. */
  onPremiumActionConsumed?: (remaining: number) => void;
}

// Quick action chips per step
const QUICK_ACTIONS: Record<number, { label: string; icon: string; q: string }[]> = {
  1: [
    { label: "Analyze my offer",              icon: "🔍", q: "Analyze my offer and tell me its strengths and weaknesses against the market" },
    { label: "Find untapped niches",          icon: "💡", q: "What are the untapped niches in my market where I could win easily?" },
    { label: "Pricing strategy",              icon: "💰", q: "What's the best pricing strategy for my type of offer and audience?" },
    { label: "Top 3 sales messages",          icon: "🎯", q: "Generate 3 different top sales messages (rational, emotional, social proof) for my offer" },
  ],
  2: [
    { label: "Ideal customer profile",        icon: "👤", q: "Describe in detail the ideal customer profile for my offer in this location" },
    { label: "Where the audience hangs out",  icon: "📍", q: "Where does my target audience hang out online and offline? Which platforms, groups, forums?" },
    { label: "Objections and answers",        icon: "🛡️", q: "What are the top 5 objections the customer will raise and how do I answer them effectively?" },
    { label: "Season and timing",             icon: "📅", q: "When is the best time of year and week to launch the campaign for this type of offer?" },
  ],
  3: [
    { label: "Which sources to activate",     icon: "🔌", q: "Which research sources should I activate as priority for my type of campaign?" },
    { label: "Keywords to search",            icon: "🔑", q: "What are the best keywords and search queries to find potential clients?" },
    { label: "How to filter leads",           icon: "🎯", q: "How do I recognize a HOT lead vs a COLD one for my offer? What signals should I look for?" },
  ],
  4: [
    { label: "How to approach a HOT lead",    icon: "🔥", q: "How do I approach a high-score lead? What to say first so I'm not ignored?" },
    { label: "Outreach message template",     icon: "✉️", q: "Create a customizable outreach message template for first contact on Facebook/WhatsApp" },
    { label: "Follow-up after no reply",      icon: "🔄", q: "What follow-up message should I send if I get no reply in 48h? Without sounding pushy" },
    { label: "How to negotiate and close",    icon: "🤝", q: "What's the negotiation and closing script for my type of product/service?" },
  ],
  5: [
    { label: "Improve the campaign",          icon: "✨", q: "Analyze the generated campaign and suggest concrete improvements for each channel" },
    { label: "A/B variants to test",          icon: "🧪", q: "Create 2 alternative variants (A and B) for the highest-priority channel for me to test" },
    { label: "7-day publishing plan",         icon: "📅", q: "Create a 7-day publishing plan with what, where and when to post for maximum impact" },
    { label: "How to measure results",        icon: "📊", q: "Which KPIs and metrics should I track for my campaign? How do I know if it's working?" },
    { label: "Scaling if it works",           icon: "🚀", q: "If the campaign works well, how do I scale it without blowing up costs?" },
  ],
};

// ── Sub: structured AI response renderer ─────────────────────────────────────
function AIResponseCard({ msg }: { msg: Message }) {
  const s = msg.structured;
  if (!s || !s.main_insight) {
    return (
      <div className="text-sm leading-relaxed whitespace-pre-wrap" style={{ color: "#E8DDD0" }}>
        {msg.content}
      </div>
    );
  }
  return (
    <div className="space-y-3">
      {/* Main insight */}
      <div className="rounded-xl p-3" style={{ backgroundColor: `${AMBER}12`, border: `1px solid ${AMBER}25` }}>
        <p className="text-xs font-bold mb-1" style={{ color: AMBER }}>💡 Main insight</p>
        <p className="text-sm leading-relaxed" style={{ color: "#E8DDD0" }}>{s.main_insight}</p>
      </div>
      {/* Tips */}
      {s.tips && s.tips.length > 0 && (
        <div>
          <p className="text-xs font-bold mb-2" style={{ color: "#A8967E" }}>✅ Action steps</p>
          <ul className="space-y-1.5">
            {s.tips.map((t, i) => (
              <li key={i} className="flex gap-2 text-sm" style={{ color: "#C8B898" }}>
                <span style={{ color: GREEN, flexShrink: 0 }}>→</span>
                <span>{t}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
      {/* Alternatives */}
      {s.alternatives && s.alternatives.length > 0 && (
        <div>
          <p className="text-xs font-bold mb-2" style={{ color: "#A8967E" }}>🔀 Alternative</p>
          <ul className="space-y-1.5">
            {s.alternatives.map((a, i) => (
              <li key={i} className="flex gap-2 text-sm" style={{ color: "#C8B898" }}>
                <span style={{ color: "#8B5CF6", flexShrink: 0 }}>◆</span>
                <span>{a}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
      {/* Content ideas */}
      {s.content_ideas && s.content_ideas.length > 0 && (
        <div>
          <p className="text-xs font-bold mb-2" style={{ color: "#A8967E" }}>🎨 Content ideas</p>
          <div className="flex flex-wrap gap-1.5">
            {s.content_ideas.map((idea, i) => (
              <span key={i} className="px-2 py-1 rounded-lg text-xs"
                style={{ backgroundColor: "rgba(139,92,246,0.12)", color: "#C4B5FD", border: "1px solid rgba(139,92,246,0.2)" }}>
                {idea}
              </span>
            ))}
          </div>
        </div>
      )}
      {/* Timing */}
      {s.timing && (
        <div className="rounded-lg px-3 py-2 flex items-center gap-2"
          style={{ backgroundColor: "rgba(29,185,84,0.08)", border: "1px solid rgba(29,185,84,0.15)" }}>
          <span style={{ color: GREEN }}>🕐</span>
          <p className="text-xs" style={{ color: "#A8E6B8" }}>{s.timing}</p>
        </div>
      )}
      {/* Format tip */}
      {s.format_tip && (
        <div className="rounded-lg px-3 py-2" style={{ backgroundColor: "rgba(59,130,246,0.08)", border: "1px solid rgba(59,130,246,0.15)" }}>
          <p className="text-xs font-bold mb-0.5" style={{ color: "#93C5FD" }}>📐 Recommended format</p>
          <p className="text-xs" style={{ color: "#C0D8F8" }}>{s.format_tip}</p>
        </div>
      )}
      {/* Warning */}
      {s.warning && (
        <div className="rounded-lg px-3 py-2" style={{ backgroundColor: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.15)" }}>
          <p className="text-xs font-bold mb-0.5" style={{ color: "#FCA5A5" }}>⚠️ Warning</p>
          <p className="text-xs" style={{ color: "#FCA5A5" }}>{s.warning}</p>
        </div>
      )}
    </div>
  );
}

// ── Main ─────────────────────────────────────────────────────────────────────
export default function CampaignStudio({
  sessionId, step, offerType, offerText, audienceType, location, budgetRange,
  offerSummary, activeLead, campaignDone,
  country, contentLanguage, marketScope,
  onLimitReached, onPremiumActionConsumed,
}: Props) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const textRef = useRef<HTMLTextAreaElement>(null);

  // Auto-scroll to bottom
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  // Welcome message — neutral, short, language-agnostic (user types first → APEX detects language)
  const WELCOME = "APEX online — your Growth Partner. What's the product, who's the audience, and which competitor do we defeat today?";

  useEffect(() => {
    if (messages.length === 0) {
      setMessages([{ role: "ai", content: WELCOME, ts: Date.now() }]);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Update welcome when step changes (only if conversation just has welcome)
  useEffect(() => {
    if (messages.length === 1 && messages[0].role === "ai") {
      setMessages([{ role: "ai", content: WELCOME, ts: Date.now() }]);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step]);

  const sendMessage = useCallback(async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || loading) return;

    const userMsg: Message = { role: "user", content: trimmed, ts: Date.now() };
    setMessages(prev => [...prev, userMsg]);
    setInput("");
    setLoading(true);

    try {
      const res = await fetch("/api/find-clients/marketing-advisor", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-cost-session": sessionId,
        },
        body: JSON.stringify({
          step,
          offer_type: offerType,
          offer_description: offerText,
          audience_type: audienceType,
          location,
          budget_range: budgetRange,
          context: offerSummary || "",
          question: trimmed,
          country,
          content_language: contentLanguage,
          market_scope: marketScope,
        }),
      });

      const d = await res.json();
      if (res.status === 402 && d?.error === "LIMIT_REACHED") {
        onLimitReached?.({ current: d.current, limit: d.limit, resetDate: d.resetDate });
        setMessages(prev => [...prev, {
          role: "ai",
          content: "You've reached your monthly Premium AI Actions limit. See the upgrade options.",
          ts: Date.now(),
        }]);
      } else if (res.ok) {
        if (d.meta?.premium_action_consumed) {
          onPremiumActionConsumed?.(d.meta.remaining);
        }
        const aiMsg: Message = {
          role: "ai",
          content: d.main_insight || "I've analyzed your request.",
          structured: d,
          ts: Date.now(),
        };
        setMessages(prev => [...prev, aiMsg]);
      } else {
        setMessages(prev => [...prev, {
          role: "ai",
          content: "An error occurred. Please try again.",
          ts: Date.now(),
        }]);
      }
    } catch {
      setMessages(prev => [...prev, {
        role: "ai",
        content: "Connection error. Check your internet and try again.",
        ts: Date.now(),
      }]);
    } finally {
      setLoading(false);
    }
  }, [loading, sessionId, step, offerType, offerText, audienceType, location, budgetRange, offerSummary, country, contentLanguage, marketScope, onLimitReached, onPremiumActionConsumed]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage(input);
    }
  };

  const quickActions = QUICK_ACTIONS[step] ?? QUICK_ACTIONS[1];
  const screenHeight = expanded ? "600px" : "400px";

  return (
    <div className="rounded-2xl overflow-hidden transition-all duration-300"
      style={{ border: `1px solid ${AMBER}30`, boxShadow: `0 0 30px ${AMBER}08` }}>

      {/* ── Header bar ─────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between px-4 py-3"
        style={{ backgroundColor: BG_SCREEN, borderBottom: "1px solid rgba(245,215,160,0.1)" }}>
        <div className="flex items-center gap-3">
          {/* Traffic lights */}
          <div className="flex gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: "#FF5F57" }} />
            <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: "#FFBD2E" }} />
            <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: "#28C840" }} />
          </div>
          <div className="flex items-center gap-2">
            <Bot className="w-4 h-4" style={{ color: AMBER }} />
            <span className="text-sm font-bold" style={{ color: "#E8DDD0" }}>APEX — Marketing Intelligence</span>
            <span className="flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ backgroundColor: GREEN }} />
              <span className="text-[10px]" style={{ color: GREEN }}>active</span>
            </span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[10px] px-2 py-1 rounded-md font-mono"
            style={{ backgroundColor: "rgba(245,215,160,0.08)", color: "#A8967E", border: "1px solid rgba(245,215,160,0.1)" }}>
            step {step}/5
          </span>
          <button type="button" onClick={() => setExpanded(v => !v)}
            className="p-1.5 rounded-lg transition-all hover:bg-amber-500/10"
            style={{ color: "#A8967E" }}>
            {expanded ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>

      {/* ── Screen body ────────────────────────────────────────────────────── */}
      <div style={{ backgroundColor: BG_SCREEN }}>

        {/* Message history */}
        <div ref={scrollRef} className="overflow-y-auto px-4 py-4 space-y-4"
          style={{ height: screenHeight, scrollBehavior: "smooth" }}>
          {messages.map((msg, i) => (
            <div key={i} className={`flex gap-3 ${msg.role === "user" ? "flex-row-reverse" : ""}`}>
              {/* Avatar */}
              <div className="flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center text-sm"
                style={{
                  backgroundColor: msg.role === "ai" ? `${AMBER}20` : "rgba(245,215,160,0.08)",
                  border: `1px solid ${msg.role === "ai" ? AMBER + "40" : "rgba(245,215,160,0.15)"}`,
                }}>
                {msg.role === "ai" ? "🤖" : "👤"}
              </div>
              {/* Bubble */}
              <div className="max-w-[85%] rounded-xl p-3"
                style={{
                  backgroundColor: msg.role === "ai" ? BG_MSG_AI : BG_MSG_USER,
                  border: `1px solid ${msg.role === "ai" ? "rgba(245,215,160,0.1)" : `${AMBER}25`}`,
                }}>
                {msg.role === "ai" ? (
                  <AIResponseCard msg={msg} />
                ) : (
                  <p className="text-sm" style={{ color: "#E8DDD0" }}>{msg.content}</p>
                )}
              </div>
            </div>
          ))}

          {/* Loading indicator */}
          {loading && (
            <div className="flex gap-3">
              <div className="w-7 h-7 rounded-full flex items-center justify-center text-sm flex-shrink-0"
                style={{ backgroundColor: `${AMBER}20`, border: `1px solid ${AMBER}40` }}>
                🤖
              </div>
              <div className="px-4 py-3 rounded-xl"
                style={{ backgroundColor: BG_MSG_AI, border: "1px solid rgba(245,215,160,0.1)" }}>
                <div className="flex gap-1.5 items-center">
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" style={{ color: AMBER }} />
                  <span className="text-xs" style={{ color: "#A8967E" }}>APEX analyzing…</span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* ── Quick actions ───────────────────────────────────────────────── */}
        <div className="px-4 py-2 flex gap-1.5 flex-wrap"
          style={{ borderTop: "1px solid rgba(245,215,160,0.06)" }}>
          {quickActions.map(qa => (
            <button key={qa.label} type="button"
              onClick={() => sendMessage(qa.q)}
              disabled={loading}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all hover:scale-[1.02] disabled:opacity-50"
              style={{
                backgroundColor: "rgba(245,215,160,0.06)",
                color: "#A8967E",
                border: "1px solid rgba(245,215,160,0.12)",
              }}>
              <span>{qa.icon}</span>
              <span>{qa.label}</span>
            </button>
          ))}
        </div>

        {/* ── Input bar ───────────────────────────────────────────────────── */}
        <div className="px-4 pb-4 pt-2" style={{ borderTop: "1px solid rgba(245,215,160,0.08)" }}>
          <div className="flex gap-2 items-end">
            <textarea
              ref={textRef}
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask anything about your campaign... (Enter to send, Shift+Enter for newline)"
              rows={2}
              disabled={loading}
              className="flex-1 resize-none rounded-xl px-4 py-3 text-sm focus:outline-none transition-all"
              style={{
                backgroundColor: "#1C1814",
                border: `1px solid ${input ? AMBER + "40" : "rgba(245,215,160,0.12)"}`,
                color: "#E8DDD0",
                caretColor: AMBER,
              }}
            />
            <button type="button"
              onClick={() => sendMessage(input)}
              disabled={loading || !input.trim()}
              className="flex-shrink-0 w-11 h-11 rounded-xl flex items-center justify-center transition-all hover:scale-105 disabled:opacity-40"
              style={{ backgroundColor: AMBER, color: "#1C1814" }}>
              {loading
                ? <RefreshCw className="w-4 h-4 animate-spin" />
                : <Send className="w-4 h-4" />}
            </button>
          </div>
          <div className="flex items-center gap-3 mt-2 px-1">
            <Sparkles className="w-3 h-3" style={{ color: "#A8967E" }} />
            <p className="text-[10px]" style={{ color: "#6B5744" }}>
              APEX · Live web search · YouTube transcripts · Global market intelligence · Responds in your language
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
