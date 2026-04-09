"use client";

import { useState } from "react";
import { Loader2, Sparkles, ChevronDown, ChevronUp, Send, Lightbulb, AlertTriangle, Clock, ImageIcon, TrendingUp, Zap } from "lucide-react";

const AMBER = "#F59E0B";
const GREEN = "#1DB954";
const RED = "#EF4444";

interface AdvisorResult {
  main_insight: string;
  tips: { title: string; body: string; icon: string }[];
  alternatives: { idea: string; why: string }[];
  timing: { best_platform: string; best_time: string; why: string };
  content_ideas: string[];
  format_tip: string;
  warning: string;
}

interface Props {
  step: number;
  offerType: string;
  offerDescription: string;
  audienceType: string;
  location: string;
  budgetRange?: string;
  context?: Record<string, unknown>;
  /** Structured market context — when provided, the API will force the
   *  output language and bias platform recommendations toward this market. */
  country?: string;
  contentLanguage?: string;
  marketScope?: string;
}

const STEP_LABELS: Record<number, string> = {
  1: "Define the offer",
  2: "Target audience",
  3: "Search sources",
  4: "Lead analysis",
  5: "Outreach & Campaign",
};

const STEP_HINTS: Record<number, string> = {
  1: "How to frame the offer to attract buyers",
  2: "Where your customers are and how to target them",
  3: "Which sources bring paying leads",
  4: "How to spot buyers in the result list",
  5: "Which channel, when to send and what format to use",
};

export default function MarketingAdvisor({ step, offerType, offerDescription, audienceType, location, budgetRange, context, country, contentLanguage, marketScope }: Props) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [advice, setAdvice] = useState<AdvisorResult | null>(null);
  const [error, setError] = useState("");
  const [question, setQuestion] = useState("");
  const [asking, setAsking] = useState(false);
  const [activeTab, setActiveTab] = useState<"tips" | "alternatives" | "content" | "timing">("tips");

  const fetchAdvice = async (q?: string) => {
    if (q) setAsking(true); else setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/find-clients/marketing-advisor", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          step,
          offer_type: offerType,
          offer_description: offerDescription,
          audience_type: audienceType,
          location,
          budget_range: budgetRange,
          context,
          question: q || undefined,
          country,
          content_language: contentLanguage,
          market_scope: marketScope,
        }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || "Error"); return; }
      setAdvice(data);
      setActiveTab("tips");
      setQuestion("");
    } catch {
      setError("Network error");
    } finally {
      setLoading(false);
      setAsking(false);
    }
  };

  const handleOpen = () => {
    setOpen(true);
    if (!advice && !loading) fetchAdvice();
  };

  return (
    <div className="rounded-2xl overflow-hidden"
      style={{ border: `1px solid ${AMBER}30`, background: "linear-gradient(135deg, rgba(245,158,11,0.04), rgba(245,215,160,0.02))" }}>

      {/* Header toggle */}
      <button type="button" onClick={() => open ? setOpen(false) : handleOpen()}
        className="w-full flex items-center justify-between px-5 py-3.5 transition-all hover:bg-amber-500/5">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
            style={{ background: "linear-gradient(135deg, #F59E0B, #D97706)" }}>
            <Sparkles className="w-4 h-4 text-white" />
          </div>
          <div className="text-left">
            <p className="text-sm font-bold" style={{ color: "#292524" }}>
              APEX — Marketing Intelligence
            </p>
            <p className="text-xs" style={{ color: "#A8967E" }}>
              {STEP_HINTS[step] || "Tips & alternatives for the current step"}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {!advice && !open && (
            <span className="text-xs px-2 py-1 rounded-full font-bold"
              style={{ backgroundColor: `${AMBER}15`, color: AMBER }}>
              Get advice
            </span>
          )}
          {open ? <ChevronUp className="w-4 h-4" style={{ color: "#A8967E" }} /> : <ChevronDown className="w-4 h-4" style={{ color: "#A8967E" }} />}
        </div>
      </button>

      {/* Content */}
      {open && (
        <div className="border-t px-5 pb-5 space-y-4" style={{ borderColor: `${AMBER}15` }}>

          {/* Loading */}
          {loading && (
            <div className="flex items-center gap-3 py-8 justify-center">
              <Loader2 className="w-5 h-5 animate-spin" style={{ color: AMBER }} />
              <p className="text-sm font-semibold" style={{ color: "#A8967E" }}>
                APEX is analyzing…
              </p>
            </div>
          )}

          {error && (
            <p className="text-sm text-center py-4" style={{ color: RED }}>{error}</p>
          )}

          {advice && !loading && (
            <>
              {/* Main insight */}
              <div className="rounded-xl p-4 mt-3"
                style={{ background: `linear-gradient(135deg, ${AMBER}10, ${AMBER}05)`, border: `1px solid ${AMBER}25` }}>
                <div className="flex gap-2">
                  <Zap className="w-4 h-4 flex-shrink-0 mt-0.5" style={{ color: AMBER }} />
                  <p className="text-sm" style={{ color: "#292524", lineHeight: 1.6 }}>{advice.main_insight}</p>
                </div>
              </div>

              {/* Tabs */}
              <div className="flex gap-1 overflow-x-auto">
                {([
                  { id: "tips",         label: "Tips",            icon: "💡" },
                  { id: "alternatives", label: "Alternatives",    icon: "🔀" },
                  { id: "content",      label: "Content",         icon: "🎯" },
                  { id: "timing",       label: "Time & Format",   icon: "⏰" },
                ] as const).map(tab => (
                  <button key={tab.id} type="button" onClick={() => setActiveTab(tab.id)}
                    className="flex-shrink-0 flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold transition-all"
                    style={activeTab === tab.id
                      ? { backgroundColor: `${AMBER}20`, color: AMBER, border: `1px solid ${AMBER}40` }
                      : { backgroundColor: "transparent", color: "#A8967E", border: "1px solid rgba(245,215,160,0.15)" }}>
                    <span>{tab.icon}</span>{tab.label}
                  </button>
                ))}
              </div>

              {/* Tab: Tips */}
              {activeTab === "tips" && (
                <div className="space-y-2">
                  {(advice.tips || []).map((tip, i) => (
                    <div key={i} className="rounded-xl px-4 py-3"
                      style={{ backgroundColor: "rgba(245,215,160,0.06)", border: "1px solid rgba(245,215,160,0.12)" }}>
                      <p className="text-xs font-bold mb-1" style={{ color: "#292524" }}>
                        {tip.icon} {tip.title}
                      </p>
                      <p className="text-xs" style={{ color: "#78614E", lineHeight: 1.6 }}>{tip.body}</p>
                    </div>
                  ))}
                  {advice.warning && (
                    <div className="rounded-xl px-4 py-3 flex gap-2"
                      style={{ backgroundColor: "rgba(239,68,68,0.06)", border: "1px solid rgba(239,68,68,0.2)" }}>
                      <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" style={{ color: RED }} />
                      <p className="text-xs" style={{ color: "#78614E", lineHeight: 1.6 }}>
                        <span className="font-bold" style={{ color: RED }}>Warning: </span>
                        {advice.warning}
                      </p>
                    </div>
                  )}
                </div>
              )}

              {/* Tab: Alternatives */}
              {activeTab === "alternatives" && (
                <div className="space-y-2">
                  {(advice.alternatives || []).map((alt, i) => (
                    <div key={i} className="rounded-xl px-4 py-3"
                      style={{ backgroundColor: "rgba(29,185,84,0.04)", border: "1px solid rgba(29,185,84,0.15)" }}>
                      <p className="text-xs font-bold mb-1" style={{ color: "#292524" }}>
                        🔀 {alt.idea}
                      </p>
                      <p className="text-xs" style={{ color: "#78614E", lineHeight: 1.6 }}>
                        <span style={{ color: GREEN }}>Why it works: </span>{alt.why}
                      </p>
                    </div>
                  ))}
                </div>
              )}

              {/* Tab: Content ideas */}
              {activeTab === "content" && (
                <div className="space-y-2">
                  {(advice.content_ideas || []).map((idea, i) => (
                    <div key={i} className="rounded-xl px-4 py-3 flex gap-2"
                      style={{ backgroundColor: "rgba(245,215,160,0.06)", border: "1px solid rgba(245,215,160,0.12)" }}>
                      <span className="text-sm flex-shrink-0 font-bold" style={{ color: AMBER }}>{i + 1}.</span>
                      <p className="text-xs" style={{ color: "#292524", lineHeight: 1.6 }}>{idea}</p>
                    </div>
                  ))}
                </div>
              )}

              {/* Tab: Timing & Format */}
              {activeTab === "timing" && (
                <div className="space-y-3">
                  {advice.timing && (
                    <div className="rounded-xl px-4 py-3"
                      style={{ backgroundColor: `${AMBER}08`, border: `1px solid ${AMBER}25` }}>
                      <div className="flex items-center gap-2 mb-2">
                        <Clock className="w-4 h-4" style={{ color: AMBER }} />
                        <p className="text-xs font-bold" style={{ color: "#292524" }}>Best posting time</p>
                      </div>
                      <p className="text-xs font-bold" style={{ color: AMBER }}>
                        {advice.timing.best_platform} — {advice.timing.best_time}
                      </p>
                      <p className="text-xs mt-1" style={{ color: "#78614E", lineHeight: 1.6 }}>{advice.timing.why}</p>
                    </div>
                  )}
                  {advice.format_tip && (
                    <div className="rounded-xl px-4 py-3"
                      style={{ backgroundColor: "rgba(245,215,160,0.06)", border: "1px solid rgba(245,215,160,0.15)" }}>
                      <div className="flex items-center gap-2 mb-2">
                        <ImageIcon className="w-4 h-4" style={{ color: "#78614E" }} />
                        <p className="text-xs font-bold" style={{ color: "#292524" }}>Recommended format</p>
                      </div>
                      <p className="text-xs" style={{ color: "#78614E", lineHeight: 1.6 }}>{advice.format_tip}</p>
                    </div>
                  )}

                  {/* Posting times reference */}
                  <div className="rounded-xl px-4 py-3 space-y-2"
                    style={{ backgroundColor: "rgba(245,215,160,0.04)", border: "1px solid rgba(245,215,160,0.1)" }}>
                    <p className="text-xs font-bold" style={{ color: "#78614E" }}>📅 Best times reference / platform</p>
                    {[
                      { platform: "Facebook", time: "Wed 11am, Thu 12-1pm, Fri 9-10am" },
                      { platform: "Instagram Feed", time: "Mon & Wed 11am, Fri 10-11am" },
                      { platform: "Instagram Reels", time: "Tue-Fri 6-9am, Wed 9-11am" },
                      { platform: "TikTok", time: "Tue & Thu 7-9pm, Fri 5-6pm" },
                      { platform: "WhatsApp", time: "Tue-Thu 10am-12pm, 7-8pm" },
                      { platform: "Email", time: "Tue 10am, Thu 9am" },
                      { platform: "Pinterest", time: "Sat 8-11pm, Fri 3-5pm" },
                    ].map(({ platform, time }) => (
                      <div key={platform} className="flex justify-between items-center">
                        <span className="text-xs font-semibold" style={{ color: "#A8967E" }}>{platform}</span>
                        <span className="text-xs" style={{ color: "#292524" }}>{time}</span>
                      </div>
                    ))}
                  </div>

                  {/* Format specs reference */}
                  <div className="rounded-xl px-4 py-3 space-y-2"
                    style={{ backgroundColor: "rgba(245,215,160,0.04)", border: "1px solid rgba(245,215,160,0.1)" }}>
                    <p className="text-xs font-bold" style={{ color: "#78614E" }}>📐 Image/video formats</p>
                    {[
                      { platform: "IG Feed", spec: "1080×1080 (1:1) or 1080×1350 (4:5)" },
                      { platform: "IG/FB Story", spec: "1080×1920 (9:16)" },
                      { platform: "IG Reel / TikTok", spec: "1080×1920 (9:16), 15-60 sec" },
                      { platform: "FB Feed", spec: "1200×630 or 1200×1200" },
                      { platform: "YouTube Thumb", spec: "1280×720 (16:9)" },
                      { platform: "Pinterest Pin", spec: "1000×1500 (2:3) — tall" },
                      { platform: "Email header", spec: "600px width, max 200px height" },
                    ].map(({ platform, spec }) => (
                      <div key={platform} className="flex justify-between items-start gap-2">
                        <span className="text-xs font-semibold flex-shrink-0" style={{ color: "#A8967E" }}>{platform}</span>
                        <span className="text-xs text-right" style={{ color: "#292524" }}>{spec}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Refresh button */}
              <button type="button" onClick={() => fetchAdvice()}
                disabled={loading}
                className="flex items-center gap-1.5 text-xs font-semibold"
                style={{ color: "#A8967E" }}>
                <TrendingUp className="w-3.5 h-3.5" /> Generate more ideas
              </button>
            </>
          )}

          {/* Chat / Ask a question */}
          <div className="rounded-xl overflow-hidden" style={{ border: `1px solid ${AMBER}20` }}>
            <div className="flex items-center gap-2 px-3 py-2"
              style={{ backgroundColor: `${AMBER}08`, borderBottom: `1px solid ${AMBER}15` }}>
              <Lightbulb className="w-3.5 h-3.5" style={{ color: AMBER }} />
              <p className="text-xs font-bold" style={{ color: "#78614E" }}>Ask the expert</p>
            </div>
            <div className="flex gap-2 p-3">
              <input
                type="text"
                value={question}
                onChange={e => setQuestion(e.target.value)}
                onKeyDown={e => e.key === "Enter" && question.trim() && fetchAdvice(question.trim())}
                placeholder="e.g. What type of photos work best for weddings on Instagram?"
                className="flex-1 text-xs px-3 py-2 rounded-lg focus:outline-none"
                style={{ border: `1px solid ${AMBER}20`, backgroundColor: "#FFFDF9", color: "#292524" }}
              />
              <button
                type="button"
                onClick={() => question.trim() && fetchAdvice(question.trim())}
                disabled={asking || !question.trim()}
                className="px-3 py-2 rounded-lg transition-all disabled:opacity-50"
                style={{ backgroundColor: AMBER, color: "#1C1814" }}>
                {asking ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
