"use client";

/**
 * Alex's Office — the CEO command room.
 *
 * Rich, single-screen "desk" metaphor: focus banner, live metric tiles,
 * a roster of specialist agents (click to talk), a chat panel, and
 * quick-action shortcuts. Visual theme: dark wood + amber, like a
 * real founder's late-night desk.
 */

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  Target, Users, TrendingUp, Mail, ArrowLeft, Send, Loader2,
  Sparkles, Command, BookOpen,
} from "lucide-react";
import type { AlexAgent } from "@/lib/alex-knowledge";

const AGENTS_SEED: Array<Pick<AlexAgent, "id" | "name" | "title" | "discipline" | "icon" | "example_tasks">> = [
  { id: "cmo",        name: "Vera",   title: "Director Marketing",      discipline: "Poziționare & brand",  icon: "🎯", example_tasks: ["Scrie o declarație de poziționare", "Alege segmentul-cap de pod", "Rezumă categoria într-o propoziție"] },
  { id: "content",    name: "Marcus", title: "Director Conținut",       discipline: "Articole lungi, SEO",  icon: "✍️", example_tasks: ["Schițează un articol-pilon", "30 de hook-uri LinkedIn", "Rescrie folosind PAS"] },
  { id: "sales",      name: "Sofia",  title: "Director Vânzări",        discipline: "Pipeline, obiecții",   icon: "🤝", example_tasks: ["Ce fac cu răspunsul ăsta?", "Cum răspund la 'e prea scump'", "Scorul MEDDIC pentru acest deal"] },
  { id: "analyst",    name: "Ethan",  title: "Analist Growth",          discipline: "Metrice, CAC/LTV",     icon: "📊", example_tasks: ["Unde pierdem cel mai mult în funnel?", "Calculează CAC-ul", "LinkedIn sau cold email?"] },
  { id: "researcher", name: "Nora",   title: "Cercetător Lead-uri",     discipline: "Informații cont",      icon: "🔍", example_tasks: ["Cercetează acest domeniu", "Cine e persoana potrivită la X", "Găsește semnale de cumpărare"] },
  { id: "competitive",name: "Kai",    title: "Competitive Intel",       discipline: "Concurenți, goluri",   icon: "⚔️", example_tasks: ["Ce face Buffer nou?", "Unde e oceanul nostru albastru?", "Unde-s nemulțumiți userii Later?"] },
  { id: "copywriter", name: "Iris",   title: "Copywriter Senior",       discipline: "Copy de conversie",    icon: "🎨", example_tasks: ["3 variante de subject", "Headline pentru /offer-ro", "Scoate toate 'noi', pune 'tu'"] },
  { id: "strategist", name: "Leo",    title: "Strategist",              discipline: "Pariuri pe termen lung",icon: "🧠", example_tasks: ["Suntem într-o categorie sau creăm una?", "Harta noastră Wardley", "Pariul pe 24 luni"] },
  { id: "finance",    name: "Dara",   title: "CFO",                     discipline: "Unit economics",        icon: "💰", example_tasks: ["Care e payback period-ul?", "Creștem prețul la €699?", "Scenarii revenue Q2"] },
];

interface Turn { role: "user" | "assistant"; agent?: string; text: string; }

export default function OfficePage() {
  const [selected, setSelected] = useState<typeof AGENTS_SEED[number]>(AGENTS_SEED[0]);
  const [input, setInput] = useState("");
  const [useState_, setUseState] = useState(true);
  const [sending, setSending] = useState(false);
  const [turns, setTurns] = useState<Turn[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [turns]);

  const ask = async (question: string) => {
    if (!question.trim()) return;
    setSending(true);
    setTurns((t) => [...t, { role: "user", text: question }]);
    setInput("");
    try {
      const res = await fetch("/api/brain/ask-agent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ agent_id: selected.id, question, state: useState_ }),
      });
      const d = await res.json();
      setTurns((t) => [...t, { role: "assistant", agent: selected.name, text: d.answer ?? d.error ?? "—" }]);
    } catch (e) {
      setTurns((t) => [...t, { role: "assistant", agent: selected.name, text: e instanceof Error ? e.message : "failed" }]);
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="min-h-screen" style={{
      background: "radial-gradient(1200px 600px at 20% 0%, rgba(245,158,11,0.08), transparent 60%), #0A0A0F",
      color: "white",
      fontFamily: "system-ui, -apple-system, sans-serif",
    }}>
      <header className="max-w-7xl mx-auto px-6 py-5 flex items-center gap-3">
        <Link href="/" className="text-xs inline-flex items-center gap-1 px-2 py-1 rounded-md"
          style={{ backgroundColor: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.08)", color: "#bbb" }}>
          <ArrowLeft className="w-3 h-3" /> Înapoi
        </Link>
        <div className="flex-1">
          <p className="text-sm font-semibold flex items-center gap-2">
            <Command className="w-4 h-4" style={{ color: "#F59E0B" }} />
            Biroul lui Alex · Camera de Comandă CEO
          </p>
          <p className="text-xs" style={{ color: "#888" }}>
            Vorbește cu echipa ta executivă · fiecare agent e expert în disciplina lui
          </p>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 pb-16 grid grid-cols-1 lg:grid-cols-[260px_1fr] gap-5">
        {/* LEFT RAIL — agent roster */}
        <aside className="space-y-2">
          <p className="text-xs uppercase tracking-wider font-bold px-2" style={{ color: "#888" }}>
            Echipa ta executivă
          </p>
          {AGENTS_SEED.map((a) => {
            const active = a.id === selected.id;
            return (
              <button key={a.id} onClick={() => setSelected(a)} type="button"
                className="w-full text-left p-3 rounded-xl transition-all"
                style={{
                  backgroundColor: active ? "rgba(245,158,11,0.12)" : "rgba(255,255,255,0.03)",
                  border: `1px solid ${active ? "rgba(245,158,11,0.4)" : "rgba(255,255,255,0.06)"}`,
                }}>
                <div className="flex items-center gap-2">
                  <div className="text-xl">{a.icon}</div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm truncate">{a.name}</p>
                    <p className="text-xs truncate" style={{ color: "#888" }}>{a.title}</p>
                  </div>
                </div>
              </button>
            );
          })}
        </aside>

        {/* RIGHT — chat area */}
        <section className="rounded-2xl overflow-hidden flex flex-col"
          style={{ backgroundColor: "#14141B", border: "1px solid rgba(255,255,255,0.08)", minHeight: 640 }}>
          {/* Agent header */}
          <div className="p-4 flex items-center gap-3"
            style={{ borderBottom: "1px solid rgba(255,255,255,0.08)", backgroundColor: "#1A1A24" }}>
            <div className="text-3xl">{selected.icon}</div>
            <div className="flex-1">
              <p className="font-bold">{selected.name}</p>
              <p className="text-xs" style={{ color: "#bbb" }}>{selected.title} · {selected.discipline}</p>
            </div>
            <label className="text-xs flex items-center gap-1" style={{ color: "#888" }}>
              <input type="checkbox" checked={useState_} onChange={(e) => setUseState(e.target.checked)} />
              Include starea curentă
            </label>
          </div>

          {/* Example tasks (when no chat yet) */}
          {turns.length === 0 && (
            <div className="p-5">
              <p className="text-xs uppercase tracking-wider font-bold mb-3 flex items-center gap-1" style={{ color: "#888" }}>
                <Sparkles className="w-3 h-3" /> Întreab-o pe {selected.name}
              </p>
              <div className="flex flex-wrap gap-2">
                {selected.example_tasks.map((t, i) => (
                  <button key={i} type="button" onClick={() => ask(t)}
                    className="text-xs px-3 py-2 rounded-lg text-left hover:brightness-125 transition-all"
                    style={{ backgroundColor: "rgba(245,158,11,0.08)", color: "#F59E0B", border: "1px solid rgba(245,158,11,0.2)" }}>
                    {t}
                  </button>
                ))}
              </div>
              <div className="mt-6 p-3 rounded-lg flex items-start gap-2"
                style={{ backgroundColor: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}>
                <BookOpen className="w-4 h-4 mt-0.5" style={{ color: "#888" }} />
                <p className="text-xs" style={{ color: "#999", lineHeight: 1.55 }}>
                  Fiecare agent e pre-încărcat cu framework-urile canonice de marketing —
                  Positioning (Ries & Trout), Jobs to Be Done (Christensen),
                  Crossing the Chasm (Moore), Blue Ocean (Kim), Porter 5-Forces,
                  Play Bigger, Hook Model, AIDA/PAS/FAB copy, AARRR metrics, MEDDIC sales —
                  și calibrați pe realitatea economică EU 2026.
                </p>
              </div>
            </div>
          )}

          {/* Chat turns */}
          <div ref={scrollRef} className="flex-1 overflow-auto p-5 space-y-3">
            {turns.map((t, i) => (
              <div key={i} className="flex gap-3">
                <div className="text-xl">{t.role === "user" ? "🧑‍💼" : selected.icon}</div>
                <div className="flex-1">
                  <p className="text-xs font-bold mb-1" style={{ color: t.role === "user" ? "#3B82F6" : "#F59E0B" }}>
                    {t.role === "user" ? "Eduard" : (t.agent ?? selected.name)}
                  </p>
                  <p className="text-sm whitespace-pre-wrap" style={{ color: t.role === "user" ? "#eee" : "#ddd", lineHeight: 1.6 }}>
                    {t.text}
                  </p>
                </div>
              </div>
            ))}
            {sending && (
              <div className="flex gap-3 items-center text-xs" style={{ color: "#888" }}>
                <Loader2 className="w-4 h-4 animate-spin" />
                {selected.name} gândește...
              </div>
            )}
          </div>

          {/* Input */}
          <div className="p-4" style={{ borderTop: "1px solid rgba(255,255,255,0.08)", backgroundColor: "#1A1A24" }}>
            <div className="flex gap-2">
              <input value={input} onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); ask(input); } }}
                placeholder={`Întreab-o pe ${selected.name}...`}
                className="flex-1 rounded-lg px-3 py-2 text-sm"
                style={{ backgroundColor: "#0F0F14", border: "1px solid rgba(255,255,255,0.1)", color: "white", outline: "none" }} />
              <button type="button" onClick={() => ask(input)} disabled={sending || !input}
                className="inline-flex items-center gap-1 px-4 py-2 rounded-lg font-bold text-sm disabled:opacity-50"
                style={{ backgroundColor: "#F59E0B", color: "black" }}>
                <Send className="w-4 h-4" />
              </button>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
