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
}

// Quick action chips per step
const QUICK_ACTIONS: Record<number, { label: string; icon: string; q: string }[]> = {
  1: [
    { label: "Analizează oferta mea",        icon: "🔍", q: "Analizează oferta mea și spune-mi ce puncte forte și ce slăbiciuni are față de piață" },
    { label: "Găsește nișe neacoperite",     icon: "💡", q: "Care sunt nișele neacoperite în piața mea unde am putea câștiga ușor?" },
    { label: "Strategie de preț",             icon: "💰", q: "Care e cea mai bună strategie de preț pentru tipul meu de ofertă și audiență?" },
    { label: "Top 3 mesaje de vânzare",       icon: "🎯", q: "Generează top 3 mesaje de vânzare diferite (rațional, emoțional, social proof) pentru oferta mea" },
  ],
  2: [
    { label: "Profilul clientului ideal",     icon: "👤", q: "Descrie în detaliu profilul clientului ideal pentru oferta mea în această locație" },
    { label: "Unde se adună audiența",        icon: "📍", q: "Unde se adună online și offline audiența mea țintă? Ce platforme, grupuri, forumuri frecventează?" },
    { label: "Obiecții și răspunsuri",        icon: "🛡️", q: "Care sunt principalele 5 obiecții pe care le va ridica clientul și cum le răspund eficient?" },
    { label: "Sezon și timing",               icon: "📅", q: "Când e cel mai bun moment din an și din săptămână să lansez campania pentru acest tip de ofertă?" },
  ],
  3: [
    { label: "Care surse să activez",         icon: "🔌", q: "Pe care dintre sursele de research trebuie să le activez prioritar pentru tipul meu de campanie?" },
    { label: "Cuvinte cheie de căutat",       icon: "🔑", q: "Care sunt cele mai bune cuvinte cheie și interogări de search pentru a găsi potențiali clienți?" },
    { label: "Cum filtrez lead-urile",        icon: "🎯", q: "Cum recunosc un lead HOT față de unul COLD pentru oferta mea? Ce semnale să caut?" },
  ],
  4: [
    { label: "Cum să abordez lead-ul HOT",   icon: "🔥", q: "Cum să abordez un lead cu scor ridicat? Ce să spun prima dată pentru a nu fi ignorat?" },
    { label: "Template mesaj de contact",     icon: "✉️", q: "Creează un template de mesaj de contact personalizabil pentru primul outreach pe Facebook/WhatsApp" },
    { label: "Follow-up după lipsa răspuns",  icon: "🔄", q: "Ce mesaj de follow-up trimit dacă nu primesc răspuns în 48h? Fără să par insistent" },
    { label: "Cum neg și închid",             icon: "🤝", q: "Care e scriptul de negociere și închidere pentru tipul meu de produs/serviciu?" },
  ],
  5: [
    { label: "Îmbunătățește campania",        icon: "✨", q: "Analizează campania generată și propune îmbunătățiri concrete pentru fiecare canal" },
    { label: "Variante A/B de testat",        icon: "🧪", q: "Creează 2 variante alternative (A și B) pentru canalul cu cea mai mare prioritate pe care să le testez" },
    { label: "Plan de publicare 7 zile",      icon: "📅", q: "Creează un plan de publicare pe 7 zile cu ce, unde și când postez pentru maximum de impact" },
    { label: "Cum măsor rezultatele",         icon: "📊", q: "Ce KPI-uri și metrici trebuie să urmăresc pentru campania mea? Cum știu dacă merge sau nu?" },
    { label: "Scalare dacă merge",            icon: "🚀", q: "Dacă campania merge bine, cum o scalez fără să-mi explodeze costurile?" },
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
        <p className="text-xs font-bold mb-1" style={{ color: AMBER }}>💡 Insight principal</p>
        <p className="text-sm leading-relaxed" style={{ color: "#E8DDD0" }}>{s.main_insight}</p>
      </div>
      {/* Tips */}
      {s.tips && s.tips.length > 0 && (
        <div>
          <p className="text-xs font-bold mb-2" style={{ color: "#A8967E" }}>✅ Pași de acțiune</p>
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
          <p className="text-xs font-bold mb-2" style={{ color: "#A8967E" }}>🎨 Idei de conținut</p>
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
          <p className="text-xs font-bold mb-0.5" style={{ color: "#93C5FD" }}>📐 Format recomandat</p>
          <p className="text-xs" style={{ color: "#C0D8F8" }}>{s.format_tip}</p>
        </div>
      )}
      {/* Warning */}
      {s.warning && (
        <div className="rounded-lg px-3 py-2" style={{ backgroundColor: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.15)" }}>
          <p className="text-xs font-bold mb-0.5" style={{ color: "#FCA5A5" }}>⚠️ Atenție</p>
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

  // Welcome message when step changes
  useEffect(() => {
    if (messages.length === 0) {
      const welcomes: Record<number, string> = {
        1: "Bună! Sunt agentul tău de marketing MAX. Selectează tipul de ofertă și descrie ce vinzi — te ajut să construiești o campanie câștigătoare de la zero.",
        2: "Gata pentru pasul 2 — audiența. Spune-mi mai multe despre publicul tău sau folosește acțiunile rapide de mai jos pentru sfaturi personalizate.",
        3: "Sursele de research sunt activate. Te pot ajuta să prioritizezi unde să cauți și ce cuvinte cheie să folosești pentru tipul tău de campanie.",
        4: "Lead-urile sunt scorat! Acum e momentul pentru outreach. Pot genera mesaje personalizate, scripturi de vânzare și strategii de follow-up.",
        5: "Campania e generată! Pot îmbunătăți orice canal, crea variante A/B, planifica publicarea pe 7 zile sau explica cum să măsori rezultatele.",
      };
      setMessages([{
        role: "ai",
        content: welcomes[step] || welcomes[1],
        ts: Date.now(),
      }]);
    }
  }, []);

  // Update welcome when step changes (only if conversation just has welcome)
  useEffect(() => {
    if (messages.length === 1 && messages[0].role === "ai") {
      const welcomes: Record<number, string> = {
        1: "Bună! Sunt agentul tău de marketing MAX. Selectează tipul de ofertă și descrie ce vinzi — te ajut să construiești o campanie câștigătoare de la zero.",
        2: "Gata pentru pasul 2 — audiența. Spune-mi mai multe despre publicul tău sau folosește acțiunile rapide de mai jos pentru sfaturi personalizate.",
        3: "Sursele de research sunt activate. Te pot ajuta să prioritizezi unde să cauți și ce cuvinte cheie să folosești pentru tipul tău de campanie.",
        4: "Lead-urile sunt scorat! Acum e momentul pentru outreach. Pot genera mesaje personalizate, scripturi de vânzare și strategii de follow-up.",
        5: "Campania e generată! Pot îmbunătăți orice canal, crea variante A/B, planifica publicarea pe 7 zile sau explica cum să măsori rezultatele.",
      };
      setMessages([{ role: "ai", content: welcomes[step] || welcomes[1], ts: Date.now() }]);
    }
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
        }),
      });

      if (res.ok) {
        const d = await res.json();
        const aiMsg: Message = {
          role: "ai",
          content: d.main_insight || "Am analizat cererea ta.",
          structured: d,
          ts: Date.now(),
        };
        setMessages(prev => [...prev, aiMsg]);
      } else {
        setMessages(prev => [...prev, {
          role: "ai",
          content: "A apărut o eroare. Încearcă din nou.",
          ts: Date.now(),
        }]);
      }
    } catch {
      setMessages(prev => [...prev, {
        role: "ai",
        content: "Eroare de conexiune. Verifică internetul și încearcă din nou.",
        ts: Date.now(),
      }]);
    } finally {
      setLoading(false);
    }
  }, [loading, sessionId, step, offerType, offerText, audienceType, location, budgetRange, offerSummary]);

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
            <span className="text-sm font-bold" style={{ color: "#E8DDD0" }}>Agent Marketing MAX</span>
            <span className="flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ backgroundColor: GREEN }} />
              <span className="text-[10px]" style={{ color: GREEN }}>activ</span>
            </span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[10px] px-2 py-1 rounded-md font-mono"
            style={{ backgroundColor: "rgba(245,215,160,0.08)", color: "#A8967E", border: "1px solid rgba(245,215,160,0.1)" }}>
            pas {step}/5
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
                  <span className="text-xs" style={{ color: "#A8967E" }}>Agentul analizează...</span>
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
              placeholder="Întreabă orice despre campania ta... (Enter pentru trimite, Shift+Enter pentru linie nouă)"
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
              Agentul cunoaște contextul complet: oferta ta, audiența, locația, sezonul și platforma optimă chiar acum
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
