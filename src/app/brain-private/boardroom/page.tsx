"use client";

/**
 * Boardroom Live — virtual executive meeting.
 * Oval table, all 9 directors + Alex + Eduard around it. When Eduard asks a
 * question, relevant seats pulse + their perspective appears as a bubble.
 * Alex (head of table) synthesizes at the end and delivers to Eduard.
 */

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { ArrowLeft, Send, Loader2, Sparkles } from "lucide-react";

interface Seat {
  id: string;
  name: string;
  title: string;
  icon: string;
  angle: number; // degrees around the oval (0 = 3 o'clock, 90 = 12, etc.)
  kind: "alex" | "agent" | "you";
}

const SEATS: Seat[] = [
  { id: "alex",       name: "Alex",   title: "CEO",                  icon: "👔", angle: 270, kind: "alex" },   // head
  { id: "cmo",        name: "Vera",   title: "Dir. Marketing",       icon: "🎯", angle: 305, kind: "agent" },
  { id: "content",    name: "Marcus", title: "Dir. Conținut",        icon: "✍️", angle: 340, kind: "agent" },
  { id: "sales",      name: "Sofia",  title: "Dir. Vânzări",         icon: "🤝", angle: 15,  kind: "agent" },
  { id: "analyst",    name: "Ethan",  title: "Analist Growth",       icon: "📊", angle: 50,  kind: "agent" },
  { id: "researcher", name: "Nora",   title: "Cercetător",           icon: "🔍", angle: 85,  kind: "agent" },
  { id: "you",        name: "Eduard", title: "Founder (tu)",         icon: "🧑‍💼", angle: 120, kind: "you" },   // opposite of Alex
  { id: "competitive",name: "Kai",    title: "Competitive",          icon: "⚔️", angle: 155, kind: "agent" },
  { id: "copywriter", name: "Iris",   title: "Copywriter",           icon: "🎨", angle: 190, kind: "agent" },
  { id: "strategist", name: "Leo",    title: "Strategist",           icon: "🧠", angle: 220, kind: "agent" },
  { id: "finance",    name: "Dara",   title: "CFO",                  icon: "💰", angle: 250, kind: "agent" },
];

interface Contribution { agent_id: string; agent_name: string; text: string; }
interface Phase { active: string | null; contributions: Contribution[]; synthesis: string | null; asking: boolean; }

// Ambient board activities — rotate randomly to feel alive even when idle
const AMBIENT_FEED = [
  { agent: "cmo",        msg: "Revizuiesc poziționarea competitorilor" },
  { agent: "content",    msg: "Scriu 3 hook-uri LinkedIn pentru mâine" },
  { agent: "sales",      msg: "Fac research pe 2 lead-uri calde" },
  { agent: "analyst",    msg: "Calculez CAC-ul pe canalele active" },
  { agent: "researcher", msg: "Scanez 15 domenii noi din Cluj" },
  { agent: "competitive",msg: "Urmăresc ultimul update Buffer" },
  { agent: "copywriter", msg: "Testez 3 variante subject line" },
  { agent: "strategist", msg: "Mapez Wardley pe următoarele 6 luni" },
  { agent: "finance",    msg: "Rulez scenariul de preț €699" },
  { agent: "alex",       msg: "Ascult echipa" },
  { agent: "alex",       msg: "Gândesc la ce e prioritate azi" },
  { agent: "content",    msg: "Optimizez 2 articole pentru SEO" },
  { agent: "sales",      msg: "Pregătesc ofertă customizată" },
];

export default function Boardroom() {
  const [question, setQuestion] = useState("");
  const [phase, setPhase] = useState<Phase>({ active: null, contributions: [], synthesis: null, asking: false });
  const [error, setError] = useState<string | null>(null);
  const [ambientAgent, setAmbientAgent] = useState<string | null>(null);
  const [ambientMsg, setAmbientMsg] = useState<string>("");
  const [whisper, setWhisper] = useState<{ from: string; to: string } | null>(null);
  const [liveFeed, setLiveFeed] = useState<string[]>([
    "09:12 · Nora a adăugat 8 lead-uri noi în pipeline",
    "09:04 · Marcus a generat 3 captions pentru IG",
    "08:58 · Ethan a calculat conversion rate: 2.3%",
  ]);
  const timersRef = useRef<NodeJS.Timeout[]>([]);

  useEffect(() => () => timersRef.current.forEach((t) => clearTimeout(t)), []);

  // Autonomous life: random agent "pulse" every 5-9 seconds — makes board feel alive
  useEffect(() => {
    if (phase.asking) return;
    const tick = () => {
      const item = AMBIENT_FEED[Math.floor(Math.random() * AMBIENT_FEED.length)];
      setAmbientAgent(item.agent);
      setAmbientMsg(item.msg);
      const off = setTimeout(() => setAmbientAgent(null), 2800);
      timersRef.current.push(off);
    };
    tick();
    const iv = setInterval(tick, 4500 + Math.random() * 3500);
    return () => clearInterval(iv);
  }, [phase.asking]);

  // Autonomous whisper — random pair of agents "whisper" every 10-18s
  useEffect(() => {
    if (phase.asking) return;
    const ids = SEATS.filter((s) => s.kind === "agent").map((s) => s.id);
    const tick = () => {
      const a = ids[Math.floor(Math.random() * ids.length)];
      let b = ids[Math.floor(Math.random() * ids.length)];
      while (b === a) b = ids[Math.floor(Math.random() * ids.length)];
      setWhisper({ from: a, to: b });
      const off = setTimeout(() => setWhisper(null), 2200);
      timersRef.current.push(off);
    };
    const iv = setInterval(tick, 8000 + Math.random() * 8000);
    return () => clearInterval(iv);
  }, [phase.asking]);

  // Live feed — add synthetic "activity logs" every 12-20s
  useEffect(() => {
    if (phase.asking) return;
    const activities = [
      "Vera a revizuit declarația de poziționare",
      "Sofia a răspuns la 2 obiecții de preț",
      "Marcus a publicat 1 LinkedIn post",
      "Ethan a updatat dashboard CAC",
      "Iris a rescris 3 subject lines",
      "Kai a detectat un feature nou la Later",
      "Leo a propus un experiment pe pricing",
      "Dara a verificat payback period",
      "Nora a validat 12 domenii RO",
      "Alex a aprobat outreach batch",
    ];
    const iv = setInterval(() => {
      const now = new Date();
      const hh = String(now.getHours()).padStart(2, "0");
      const mm = String(now.getMinutes()).padStart(2, "0");
      const a = activities[Math.floor(Math.random() * activities.length)];
      setLiveFeed((prev) => [`${hh}:${mm} · ${a}`, ...prev].slice(0, 6));
    }, 10000 + Math.random() * 10000);
    return () => clearInterval(iv);
  }, [phase.asking]);

  const ask = async () => {
    const q = question.trim();
    if (!q) return;
    setError(null);
    setPhase({ active: "you", contributions: [], synthesis: null, asking: true });
    try {
      const res = await fetch("/api/brain/boardroom", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: q }),
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error ?? "Eroare");

      const contribs: Contribution[] = d.contributions ?? [];
      // Animate contributions sequentially — each pulses their seat for ~1.8s before next
      contribs.forEach((c, i) => {
        const t = setTimeout(() => {
          setPhase((p) => ({
            ...p,
            active: c.agent_id,
            contributions: [...p.contributions, c],
          }));
        }, i * 1400);
        timersRef.current.push(t);
      });
      // Finally, Alex synthesis
      const finalT = setTimeout(() => {
        setPhase((p) => ({ ...p, active: "alex", synthesis: d.alex_synthesis, asking: false }));
      }, contribs.length * 1400 + 300);
      timersRef.current.push(finalT);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Eroare");
      setPhase({ active: null, contributions: [], synthesis: null, asking: false });
    }
  };

  // Oval geometry — cx, cy center, rx horizontal radius, ry vertical radius
  const tableCx = 50; const tableCy = 50; const tableRx = 38; const tableRy = 32;
  // Seats on a slightly larger oval so they appear around the table
  const seatRx = 46; const seatRy = 42;

  const seatPos = (angle: number) => ({
    left: `${tableCx + seatRx * Math.cos((angle * Math.PI) / 180)}%`,
    top: `${tableCy + seatRy * Math.sin((angle * Math.PI) / 180)}%`,
  });

  const activeContribs = new Map(phase.contributions.map((c) => [c.agent_id, c]));

  return (
    <div
      className="min-h-screen overflow-hidden relative"
      style={{
        background:
          "radial-gradient(800px 500px at 50% 20%, rgba(245,158,11,0.12), transparent 60%), linear-gradient(180deg, #0A0A10, #14141B 70%, #1A1A24 100%)",
        color: "white",
        fontFamily: "system-ui, sans-serif",
      }}
    >
      <header className="max-w-7xl mx-auto px-6 py-5 flex items-center gap-3 relative z-20">
        <Link href="/" className="text-xs inline-flex items-center gap-1 px-2 py-1 rounded-md"
          style={{ backgroundColor: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.08)", color: "#bbb" }}>
          <ArrowLeft className="w-3 h-3" /> Înapoi
        </Link>
        <div>
          <p className="text-sm font-bold">🏛️ Boardroom Live · Ședință executivă</p>
          <p className="text-xs" style={{ color: "#888" }}>
            Pune o întrebare · directorii dezbat · Alex sintetizează
          </p>
        </div>
      </header>

      {/* Table + seats arena */}
      <div className="relative mx-auto" style={{ width: "min(100vw, 1100px)", height: "min(70vh, 640px)" }}>
        {/* Oval table */}
        <div
          className="absolute"
          style={{
            left: `${tableCx - tableRx}%`,
            top: `${tableCy - tableRy}%`,
            width: `${tableRx * 2}%`,
            height: `${tableRy * 2}%`,
            borderRadius: "50%",
            background:
              "radial-gradient(ellipse at 30% 30%, rgba(245,158,11,0.08), rgba(139,69,19,0.25) 60%, rgba(60,30,10,0.55) 100%)",
            border: "1px solid rgba(245,158,11,0.25)",
            boxShadow:
              "inset 0 0 80px rgba(0,0,0,0.5), 0 20px 80px rgba(245,158,11,0.1), 0 0 0 2px rgba(255,255,255,0.03)",
            backdropFilter: "blur(10px)",
          }}
        />
        {/* Table label */}
        <div
          className="absolute text-center"
          style={{
            left: "50%", top: "50%", transform: "translate(-50%, -50%)",
            color: "rgba(245,158,11,0.25)", fontSize: "1.1rem", fontWeight: 700, letterSpacing: "0.2em",
          }}
        >
          MARKETHUB PRO
        </div>

        {/* Whisper line between two agents */}
        {whisper && (() => {
          const from = SEATS.find((s) => s.id === whisper.from);
          const to = SEATS.find((s) => s.id === whisper.to);
          if (!from || !to) return null;
          const f = seatPos(from.angle);
          const t = seatPos(to.angle);
          return (
            <svg className="absolute inset-0 pointer-events-none" style={{ width: "100%", height: "100%" }}>
              <line
                x1={f.left as string} y1={f.top as string}
                x2={t.left as string} y2={t.top as string}
                stroke="rgba(168,85,247,0.5)" strokeWidth="1.5" strokeDasharray="4 4"
                style={{ animation: "brainWhisper 2s ease-out" }}
              />
            </svg>
          );
        })()}

        {/* Seats */}
        {SEATS.map((s) => {
          const pos = seatPos(s.angle);
          const isActive = phase.active === s.id;
          const isAmbient = ambientAgent === s.id && !phase.asking;
          const contrib = activeContribs.get(s.id);
          const isAlex = s.kind === "alex";
          const isYou = s.kind === "you";
          return (
            <div key={s.id} className="absolute" style={{ left: pos.left, top: pos.top, transform: "translate(-50%, -50%)", zIndex: 10 }}>
              {/* Pulse ring when active (loud) or ambient (soft) */}
              {(isActive || isAmbient) && (
                <span
                  className="absolute inset-0 rounded-full"
                  style={{
                    animation: isActive ? "brainPulse 1.4s ease-out infinite" : "brainPulseSoft 2.4s ease-out infinite",
                    backgroundColor: isActive
                      ? (isAlex ? "rgba(245,158,11,0.5)" : "rgba(59,130,246,0.4)")
                      : (isAlex ? "rgba(245,158,11,0.25)" : "rgba(16,185,129,0.3)"),
                    width: 72, height: 72, left: -8, top: -8,
                  }}
                />
              )}
              {/* Ambient whisper bubble */}
              {isAmbient && ambientMsg && (
                <div className="absolute text-[10px] px-2 py-1 rounded-md whitespace-nowrap"
                  style={{
                    backgroundColor: "rgba(16,185,129,0.15)",
                    border: "1px solid rgba(16,185,129,0.35)",
                    color: "#86efac",
                    top: "-32px", left: "50%", transform: "translateX(-50%)",
                    animation: "brainFadeIn 0.3s ease-out",
                  }}>
                  {ambientMsg}
                </div>
              )}
              {/* Status dot — always on, breathing */}
              <span className="absolute bottom-2 right-0 w-2.5 h-2.5 rounded-full"
                style={{
                  backgroundColor: isActive ? "#F59E0B" : isAmbient ? "#10B981" : "#3B82F6",
                  boxShadow: `0 0 8px ${isActive ? "#F59E0B" : isAmbient ? "#10B981" : "#3B82F6"}`,
                  animation: "brainBreath 3s ease-in-out infinite",
                }}
              />
              {/* Avatar circle */}
              <div
                className="w-14 h-14 rounded-full flex items-center justify-center text-2xl relative"
                style={{
                  backgroundColor: isAlex
                    ? "rgba(245,158,11,0.25)"
                    : isYou
                    ? "rgba(59,130,246,0.25)"
                    : "rgba(255,255,255,0.06)",
                  border: `2px solid ${isAlex ? "#F59E0B" : isYou ? "#3B82F6" : "rgba(255,255,255,0.12)"}`,
                  boxShadow: isActive
                    ? `0 0 24px ${isAlex ? "rgba(245,158,11,0.6)" : "rgba(59,130,246,0.5)"}`
                    : "0 4px 12px rgba(0,0,0,0.4)",
                  transition: "all 0.3s ease",
                }}
              >
                {s.icon}
                {isAlex && (
                  <span className="absolute -top-1 -right-1 text-xs">👑</span>
                )}
              </div>
              <p className="text-xs font-bold text-center mt-1">{s.name}</p>
              <p className="text-[10px] text-center" style={{ color: "#888" }}>{s.title}</p>

              {/* Speech bubble */}
              {contrib && (
                <div
                  className="absolute text-xs p-2 rounded-lg shadow-xl"
                  style={{
                    backgroundColor: "rgba(26,26,36,0.95)",
                    border: "1px solid rgba(245,158,11,0.3)",
                    color: "#ddd",
                    width: 240,
                    left: s.angle > 90 && s.angle < 270 ? "auto" : "100%",
                    right: s.angle > 90 && s.angle < 270 ? "100%" : "auto",
                    [s.angle > 90 && s.angle < 270 ? "marginRight" : "marginLeft"]: 12,
                    top: "-20%",
                    backdropFilter: "blur(10px)",
                    lineHeight: 1.45,
                    animation: "brainFadeIn 0.3s ease-out",
                  }}
                >
                  <p className="font-bold" style={{ color: "#F59E0B" }}>{contrib.agent_name}</p>
                  <p className="mt-1">{contrib.text.slice(0, 280)}{contrib.text.length > 280 ? "..." : ""}</p>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Synthesis panel (bottom) */}
      {phase.synthesis && (
        <div
          className="mx-auto p-5 rounded-2xl relative z-20 mt-4"
          style={{
            maxWidth: 720,
            background: "linear-gradient(135deg, rgba(42,31,15,0.95) 0%, rgba(26,26,36,0.95) 100%)",
            border: "1px solid rgba(245,158,11,0.4)",
            boxShadow: "0 20px 60px rgba(245,158,11,0.2)",
          }}
        >
          <div className="flex items-center gap-2 mb-2">
            <span className="text-2xl">👔</span>
            <p className="text-sm font-bold">Alex sintetizează pentru tine</p>
          </div>
          <p className="text-sm whitespace-pre-wrap" style={{ color: "#eee", lineHeight: 1.6 }}>
            {phase.synthesis}
          </p>
        </div>
      )}

      {/* Input (sticky bottom) */}
      <div
        className="sticky bottom-0 mt-6 p-4 z-30"
        style={{
          background: "linear-gradient(180deg, transparent, rgba(10,10,16,0.95))",
          borderTop: "1px solid rgba(255,255,255,0.06)",
        }}
      >
        <div className="max-w-3xl mx-auto flex gap-2">
          <input
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter" && !phase.asking) { ask(); } }}
            placeholder="Pune o întrebare boardului... (ex: Cum abordez primul client pe piața din Cluj?)"
            disabled={phase.asking}
            className="flex-1 rounded-lg px-4 py-3 text-sm"
            style={{
              backgroundColor: "rgba(26,26,36,0.95)", border: "1px solid rgba(255,255,255,0.1)", color: "white", outline: "none",
            }}
          />
          <button
            type="button" onClick={ask} disabled={phase.asking || !question}
            className="px-5 py-3 rounded-lg font-bold inline-flex items-center gap-2 disabled:opacity-50"
            style={{ backgroundColor: "#F59E0B", color: "black" }}
          >
            {phase.asking ? <><Loader2 className="w-4 h-4 animate-spin" /> Dezbat...</> : <><Sparkles className="w-4 h-4" /> Întreabă boardul</>}
          </button>
        </div>
        {error && <p className="text-xs text-center mt-2" style={{ color: "#F87171" }}>{error}</p>}
      </div>

      <style jsx global>{`
        @keyframes brainPulse {
          0% { transform: scale(0.95); opacity: 0.8; }
          70% { transform: scale(1.25); opacity: 0; }
          100% { opacity: 0; }
        }
        @keyframes brainPulseSoft {
          0% { transform: scale(0.98); opacity: 0.35; }
          60% { transform: scale(1.12); opacity: 0; }
          100% { opacity: 0; }
        }
        @keyframes brainBreath {
          0%, 100% { opacity: 0.6; transform: scale(1); }
          50% { opacity: 1; transform: scale(1.15); }
        }
        @keyframes brainFadeIn {
          from { opacity: 0; transform: translateY(6px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes brainWhisper {
          0% { opacity: 0; stroke-dashoffset: 0; }
          30% { opacity: 1; }
          100% { opacity: 0; stroke-dashoffset: 40; }
        }
      `}</style>

      {/* Live activity feed — fixed right side */}
      <div className="fixed right-4 top-24 w-64 p-3 rounded-xl hidden lg:block z-20"
        style={{
          backgroundColor: "rgba(10,10,16,0.8)",
          border: "1px solid rgba(16,185,129,0.2)",
          backdropFilter: "blur(12px)",
        }}>
        <p className="text-[10px] uppercase tracking-wider font-bold mb-2 flex items-center gap-1" style={{ color: "#10B981" }}>
          <span className="inline-block w-1.5 h-1.5 rounded-full" style={{ backgroundColor: "#10B981", animation: "brainBreath 2s infinite" }} />
          Activitate live
        </p>
        <ul className="space-y-1">
          {liveFeed.map((line, i) => (
            <li key={i} className="text-[11px]" style={{ color: "#aaa", lineHeight: 1.35, opacity: 1 - i * 0.1 }}>
              {line}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
