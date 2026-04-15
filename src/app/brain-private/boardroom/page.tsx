"use client";

/**
 * Boardroom Live — virtual executive meeting.
 * Oval table, all 9 directors + Alex + Eduard around it. When Eduard asks a
 * question, relevant seats pulse + their perspective appears as a bubble.
 * Alex (head of table) synthesizes at the end and delivers to Eduard.
 */

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { ArrowLeft, Send, Loader2, Sparkles, Volume2, VolumeX, Mic, MicOff } from "lucide-react";

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

interface Contribution { agent_id: string; agent_name: string; text: string; sessionId?: string; }
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

// Default kickoff question — autonomous debate topic based on what we built
// last night. When the user opens the boardroom fresh, the team auto-starts
// a working session about it; Alex synthesizes and "calls" the user at the end.
const AUTO_KICKOFF_QUESTION = `Ieri seară am lansat împreună AI Marketing Accelerator (€499 RO / €1000 Global pe get.markethubpromo.com), am pregătit 20 domenii target, outreach engine e live, Alex poate trimite batch-uri cu dual-agent review. Suntem la 0 clienți, 0 MRR, target €3000 MRR în 60 zile.

Care este PRIMUL lucru concret pe care trebuie să-l facem azi dimineață ca să închidem primul client în 72 de ore? Fiecare spuneți din unghiul vostru.`;

export default function Boardroom() {
  const [question, setQuestion] = useState("");
  const [phase, setPhase] = useState<Phase>({ active: null, contributions: [], synthesis: null, asking: false });
  const [error, setError] = useState<string | null>(null);
  const [autoStarted, setAutoStarted] = useState(false);
  const [ambientAgent, setAmbientAgent] = useState<string | null>(null);
  const [ambientMsg, setAmbientMsg] = useState<string>("");
  const [whisper, setWhisper] = useState<{ from: string; to: string } | null>(null);
  const [liveFeed, setLiveFeed] = useState<string[]>([
    "09:12 · Nora a adăugat 8 lead-uri noi în pipeline",
    "09:04 · Marcus a generat 3 captions pentru IG",
    "08:58 · Ethan a calculat conversion rate: 2.3%",
  ]);
  const timersRef = useRef<NodeJS.Timeout[]>([]);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [voiceOn, setVoiceOn] = useState(true);
  const [recording, setRecording] = useState(false);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  // Auto-play Alex's synthesis as soon as it arrives
  useEffect(() => {
    if (!phase.synthesis || !voiceOn) return;
    (async () => {
      try {
        const res = await fetch("/api/brain/tts", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ text: phase.synthesis, voice: "onyx" }),
        });
        if (!res.ok) return;
        const blob = await res.blob();
        const url = URL.createObjectURL(blob);
        if (audioRef.current) audioRef.current.pause();
        const audio = new Audio(url);
        audioRef.current = audio;
        audio.play().catch(() => { /* autoplay blocked */ });
      } catch { /* no-op */ }
    })();
  }, [phase.synthesis, voiceOn]);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mr = new MediaRecorder(stream);
      chunksRef.current = [];
      mr.ondataavailable = (e) => { if (e.data.size) chunksRef.current.push(e.data); };
      mr.onstop = async () => {
        const blob = new Blob(chunksRef.current, { type: "audio/webm" });
        stream.getTracks().forEach((t) => t.stop());
        const fd = new FormData();
        fd.append("audio", blob, "voice.webm");
        const res = await fetch("/api/brain/stt", { method: "POST", body: fd });
        const d = await res.json();
        if (d.text) {
          setQuestion(d.text);
          // auto-send
          setTimeout(() => {
            if (!phase.asking && d.text) {
              setQuestion("");
              void askWithText(d.text);
            }
          }, 100);
        }
      };
      mr.start();
      recorderRef.current = mr;
      setRecording(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Mic error");
    }
  };
  const stopRecording = () => {
    recorderRef.current?.stop();
    setRecording(false);
  };

  const askWithText = async (q: string) => {
    setError(null);
    setPhase((p) => ({ ...p, active: "you", asking: true, synthesis: null }));
    try {
      const res = await fetch("/api/brain/boardroom", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: q }),
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error ?? "Eroare");
      const contribs: Contribution[] = d.contributions ?? [];
      contribs.forEach((c, i) => {
        const t = setTimeout(() => setPhase((p) => ({ ...p, active: c.agent_id, contributions: [...p.contributions, c] })), i * 2800);
        timersRef.current.push(t);
      });
      const finalT = setTimeout(() => setPhase((p) => ({ ...p, active: "alex", synthesis: d.alex_synthesis, asking: false })), contribs.length * 2800 + 600);
      timersRef.current.push(finalT);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Eroare");
      setPhase({ active: null, contributions: [], synthesis: null, asking: false });
    }
  };

  useEffect(() => () => timersRef.current.forEach((t) => clearTimeout(t)), []);

  // Defensive clear: every time phase.asking flips on, empty the input
  useEffect(() => {
    if (phase.asking) setQuestion("");
  }, [phase.asking]);

  // AUTONOMOUS SESSION — run once on page load. Board debates the kickoff
  // question on its own, Alex delivers the call-to-operator at the end.
  useEffect(() => {
    if (autoStarted) return;
    setAutoStarted(true);
    setQuestion(""); // force empty on mount, ignore any browser autofill
    // Small delay so user sees the calm room first (ambient activity),
    // then the discussion starts naturally — like entering a meeting
    // already in progress.
    const t = setTimeout(() => {
      // Do NOT populate the input — just dispatch the debate.
      // The input stays empty so the operator can type a different question
      // while the auto-session runs.
      void askAutoQuestion(AUTO_KICKOFF_QUESTION);
    }, 3500);
    timersRef.current.push(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const askAutoQuestion = async (q: string) => {
    setError(null);
    setPhase((p) => ({ ...p, active: "you", asking: true, synthesis: null }));
    try {
      const res = await fetch("/api/brain/boardroom", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: q }),
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error ?? "Eroare");
      const contribs: Contribution[] = d.contributions ?? [];
      const sessionId = String(Date.now());
      contribs.forEach((c, i) => {
        const t = setTimeout(() => {
          setPhase((p) => ({ ...p, active: c.agent_id, contributions: [...p.contributions, { ...c, sessionId }] }));
        }, i * 2800);
        timersRef.current.push(t);
      });
      const finalT = setTimeout(() => {
        setPhase((p) => ({ ...p, active: "alex", synthesis: d.alex_synthesis, asking: false }));
      }, contribs.length * 2800 + 600);
      timersRef.current.push(finalT);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Eroare");
      setPhase({ active: null, contributions: [], synthesis: null, asking: false });
    }
  };

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
    setQuestion("");
    // KEEP previous contributions + synthesis visible. Only flip asking flag
    // and active to "you". New contributions append as they come in.
    setPhase((p) => ({ ...p, active: "you", asking: true, synthesis: null }));
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

  // Oval geometry — wider table (conference-room shape), all agents sit
  // spread horizontally around it.
  const tableCx = 50; const tableCy = 52; const tableRx = 36; const tableRy = 13;
  // Seats further out on the horizontal axis, closer vertically
  const seatRx = 43; const seatRy = 19;

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
        <div className="flex-1">
          <p className="text-sm font-bold">🏛️ Boardroom Live · Ședință executivă</p>
          <p className="text-xs" style={{ color: "#888" }}>
            {phase.asking
              ? "Ședință în desfășurare · echipa dezbate..."
              : phase.synthesis
              ? "Alex a închis ședința · ai primit raportul"
              : autoStarted
              ? "Pregătesc ședința de dimineață..."
              : "Ai intrat în ședință"}
          </p>
        </div>
        {phase.asking && (
          <div className="flex items-center gap-2 text-xs px-3 py-1.5 rounded-md"
            style={{ backgroundColor: "rgba(245,158,11,0.15)", border: "1px solid rgba(245,158,11,0.3)", color: "#F59E0B" }}>
            <span className="inline-block w-2 h-2 rounded-full" style={{ backgroundColor: "#F59E0B", animation: "brainBreath 1.5s infinite" }} />
            LIVE
          </div>
        )}
      </header>

      {/* Room arena — DOUBLE width so agents around the table are clearly separated */}
      <div className="relative mx-auto" style={{ width: "min(98vw, 1600px)", height: "min(44vh, 380px)", perspective: "1400px" }}>
        {/* Back wall with subtle wallpaper texture */}
        <div className="absolute inset-0" style={{
          background: "linear-gradient(180deg, rgba(30,25,20,0.6) 0%, transparent 40%), repeating-linear-gradient(45deg, rgba(255,255,255,0.015) 0 2px, transparent 2px 12px)",
          pointerEvents: "none",
        }} />
        {/* Wall screen projecting current topic */}
        <div className="absolute" style={{
          left: "32%", top: "4%", width: "36%", height: "18%",
          background: "linear-gradient(180deg, #0D1117 0%, #161B22 100%)",
          border: "3px solid #2a2a2a",
          borderRadius: "6px",
          boxShadow: "0 0 40px rgba(88,166,255,0.15), inset 0 0 30px rgba(88,166,255,0.08)",
          padding: "10px 14px",
          overflow: "hidden",
          fontSize: "11px",
          color: "#c9d1d9",
          lineHeight: 1.4,
        }}>
          <div style={{ fontSize: "9px", color: "#F59E0B", fontWeight: 700, marginBottom: 4, letterSpacing: "0.15em" }}>
            AGENDA · BOARD MEETING
          </div>
          <div style={{ fontSize: "10px", color: "#8b949e", maxHeight: "70%", overflow: "hidden" }}>
            {phase.synthesis
              ? "✓ Decizia luată · Alex pregătește raportul"
              : phase.asking
              ? "▸ În dezbatere: primul client în 72h"
              : question || "Ședință · ofertă €499/€1000 lansată · target €3K MRR"}
          </div>
        </div>
        {/* Wall mini indicator lights */}
        <div className="absolute flex gap-2" style={{ left: "8%", top: "6%" }}>
          <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: "#10B981", animation: "brainBreath 2s infinite" }} />
          <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: "#F59E0B", animation: "brainBreath 2.5s infinite" }} />
          <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: "#3B82F6", animation: "brainBreath 3s infinite" }} />
        </div>

        {/* Table group — tilted for 3/4 perspective */}
        <div className="absolute inset-0" style={{ transform: "rotateX(15deg) translateY(20px)", transformStyle: "preserve-3d" }}>
          {/* Soft spot light on table */}
          <div className="absolute" style={{
            left: `${tableCx - tableRx - 8}%`,
            top: `${tableCy - tableRy - 8}%`,
            width: `${(tableRx + 8) * 2}%`,
            height: `${(tableRy + 8) * 2}%`,
            borderRadius: "50%",
            background: "radial-gradient(ellipse at center, rgba(245,158,11,0.18), transparent 60%)",
            pointerEvents: "none",
          }} />

          {/* Oval table with realistic wood */}
          <div
            className="absolute"
            style={{
              left: `${tableCx - tableRx}%`,
              top: `${tableCy - tableRy}%`,
              width: `${tableRx * 2}%`,
              height: `${tableRy * 2}%`,
              borderRadius: "50%",
              background: `
                radial-gradient(ellipse at 30% 25%, rgba(245,158,11,0.12), transparent 55%),
                repeating-linear-gradient(88deg, rgba(101,67,33,0.9) 0 2px, rgba(120,80,40,0.85) 2px 5px, rgba(85,55,25,0.88) 5px 9px),
                linear-gradient(180deg, rgba(92,55,25,1), rgba(60,35,15,1))
              `,
              border: "1px solid rgba(139,90,43,0.6)",
              boxShadow:
                "inset 0 -10px 40px rgba(0,0,0,0.6), inset 0 4px 20px rgba(245,158,11,0.06), 0 30px 60px rgba(0,0,0,0.5), 0 0 0 3px rgba(50,30,15,0.8)",
            }}
          />
          {/* Brass inlay */}
          <div className="absolute" style={{
            left: `${tableCx - tableRx + 3}%`,
            top: `${tableCy - tableRy + 3}%`,
            width: `${(tableRx - 3) * 2}%`,
            height: `${(tableRy - 3) * 2}%`,
            borderRadius: "50%",
            border: "1px solid rgba(245,158,11,0.15)",
            pointerEvents: "none",
          }} />
          {/* Table label */}
          <div
            className="absolute text-center"
            style={{
              left: "50%", top: "50%", transform: "translate(-50%, -50%)",
              color: "rgba(245,215,160,0.18)", fontSize: "0.85rem", fontWeight: 700, letterSpacing: "0.3em",
              pointerEvents: "none",
            }}
          >
            MARKETHUB PRO
          </div>
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
              {/* Avatar circle — real photo for Eduard, icon for rest */}
              <div
                className="w-14 h-14 rounded-full flex items-center justify-center text-2xl relative overflow-hidden"
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
                  backgroundImage: isYou ? "url(/avatars/eduard.jpg)" : undefined,
                  backgroundSize: "cover",
                  backgroundPosition: "center 20%",
                }}
              >
                {!isYou && s.icon}
                {isAlex && (
                  <span className="absolute -top-1 -right-1 text-xs">👑</span>
                )}
              </div>
              {/* Laptop in front of seat */}
              <div
                className="absolute mx-auto"
                style={{
                  width: 28, height: 18, top: 58, left: "50%", transform: "translateX(-50%)",
                  background: "linear-gradient(180deg, #1a1a24 0%, #0a0a10 100%)",
                  border: "1px solid rgba(120,120,140,0.35)",
                  borderRadius: "2px",
                  boxShadow: "0 2px 6px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.06)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                }}
              >
                <div className="w-full h-full" style={{
                  background: isActive || isAmbient
                    ? "linear-gradient(180deg, rgba(88,166,255,0.55), rgba(88,166,255,0.15))"
                    : "linear-gradient(180deg, rgba(255,255,255,0.04), rgba(255,255,255,0.01))",
                  borderRadius: "1px",
                }} />
              </div>
              <p className="text-xs font-bold text-center" style={{ marginTop: 56 }}>{s.name}</p>
              <p className="text-[10px] text-center" style={{ color: "#888" }}>{s.title}</p>

              {/* Speech bubble — SHOW ONLY when THIS agent is currently active
                  (one bubble at a time, prevents overlap). Full transcript
                  lives in the side panel. */}
              {isActive && contrib && (
                <div
                  className="absolute text-xs p-2.5 rounded-lg shadow-2xl"
                  style={{
                    backgroundColor: "rgba(26,26,36,0.98)",
                    border: "1px solid rgba(245,158,11,0.5)",
                    color: "#eee",
                    width: 220,
                    left: s.angle > 90 && s.angle < 270 ? "auto" : "100%",
                    right: s.angle > 90 && s.angle < 270 ? "100%" : "auto",
                    [s.angle > 90 && s.angle < 270 ? "marginRight" : "marginLeft"]: 14,
                    top: "-40%",
                    backdropFilter: "blur(12px)",
                    lineHeight: 1.5,
                    animation: "brainFadeIn 0.3s ease-out",
                    zIndex: 30,
                  }}
                >
                  <p className="font-bold text-[11px]" style={{ color: "#F59E0B" }}>{contrib.agent_name} vorbește</p>
                  <p className="mt-1.5 text-[11px]">{contrib.text.slice(0, 180)}{contrib.text.length > 180 ? "..." : ""}</p>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* When Alex synthesizes — small flash toast top-center that fades,
          signaling "Alex decided — read on the left". The full text lives
          in the left transcript panel, not blocking the table view. */}
      {phase.synthesis && (
        <div
          className="fixed z-40 pointer-events-none"
          style={{ top: 76, left: "50%", transform: "translateX(-50%)", animation: "brainFadeIn 0.4s" }}
        >
          <div
            className="flex items-center gap-2 px-4 py-2 rounded-full shadow-xl"
            style={{
              background: "linear-gradient(135deg, #F59E0B, #D97706)",
              color: "black",
              boxShadow: "0 8px 24px rgba(245,158,11,0.5)",
              fontSize: 13,
              fontWeight: 700,
            }}
          >
            <span>👔</span>
            Alex te contactează — vezi raportul stânga
          </div>
        </div>
      )}

      {/* 2×5 fixed agent grid — each agent has a permanent cell.
          Their latest contribution shows inside; empty state = "—" */}
      <div
        className="mx-auto px-4 mt-4"
        style={{ maxWidth: "100%", marginBottom: 96 }}
      >
        {/* Alex — full-width hero panel. Always visible, scrollable inside. */}
        {(() => {
          const alexSeat = SEATS.find((s) => s.id === "alex");
          const isActive = phase.active === "alex";
          return (
            <div
              className="rounded-xl p-4 mb-3"
              style={{
                background: "linear-gradient(135deg, rgba(245,158,11,0.12), rgba(245,158,11,0.02))",
                border: `1px solid ${isActive ? "rgba(245,158,11,0.65)" : "rgba(245,158,11,0.3)"}`,
                boxShadow: isActive ? "0 0 30px rgba(245,158,11,0.25)" : "0 6px 20px rgba(0,0,0,0.3)",
                minHeight: 110,
                maxHeight: 170,
                display: "flex",
                flexDirection: "column",
              }}
            >
              <div className="flex items-center gap-2 mb-2 flex-shrink-0">
                <span className="text-xl">{alexSeat?.icon ?? "👔"}</span>
                <div className="flex-1">
                  <p className="font-bold text-sm flex items-center gap-2" style={{ color: "#F59E0B" }}>
                    Alex · CEO
                    {isActive && <span className="inline-block w-2 h-2 rounded-full" style={{ backgroundColor: "#10B981", animation: "brainBreath 1.5s infinite" }} />}
                  </p>
                  <p className="text-[10px]" style={{ color: "#b88a3a" }}>
                    {phase.synthesis ? "Recomandare finală" : phase.asking ? "Ascultă echipa, pregătește sinteza..." : "Așteaptă întrebarea ta"}
                  </p>
                </div>
              </div>
              <div className="overflow-y-auto flex-1 text-sm" style={{ color: "#eee", lineHeight: 1.6 }}>
                {phase.synthesis ? (
                  <p className="whitespace-pre-wrap">{phase.synthesis}</p>
                ) : (
                  <p style={{ color: "#888", fontStyle: "italic" }}>
                    — Alex va sintetiza toate punctele de vedere ale directorilor după ce termină dezbaterea.
                  </p>
                )}
              </div>
            </div>
          );
        })()}

        {/* 9 directors — 3×3 grid, each scrollable internally */}
        <div
          className="grid gap-2"
          style={{
            gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
            gridAutoRows: "minmax(130px, 180px)",
          }}
        >
          {SEATS.filter((s) => s.kind === "agent").map((seat) => {
            const latest = [...phase.contributions].reverse().find((c) => c.agent_id === seat.id);
            const isAlex = false;
            const isActive = phase.active === seat.id;
            return (
              <div
                key={seat.id}
                className="rounded-xl p-3 flex flex-col"
                style={{
                  backgroundColor: isAlex ? "rgba(245,158,11,0.08)" : "rgba(26,26,36,0.9)",
                  border: `1px solid ${isActive ? "rgba(245,158,11,0.5)" : isAlex ? "rgba(245,158,11,0.25)" : "rgba(255,255,255,0.08)"}`,
                  transition: "all 0.3s ease",
                  boxShadow: isActive ? "0 0 20px rgba(245,158,11,0.2)" : undefined,
                }}
              >
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-lg">{seat.icon}</span>
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-xs truncate">{seat.name}</p>
                    <p className="text-[10px] truncate" style={{ color: "#888" }}>{seat.title}</p>
                  </div>
                  {isActive && (
                    <span className="inline-block w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ backgroundColor: "#10B981", animation: "brainBreath 1.5s infinite" }} />
                  )}
                </div>
                <div className="flex-1 text-[11px] overflow-y-auto" style={{ color: "#ccc", lineHeight: 1.5 }}>
                  {latest ? (
                    <p className="whitespace-pre-wrap">{latest.text}</p>
                  ) : phase.asking && isActive ? (
                    <p style={{ color: "#F59E0B", fontStyle: "italic" }}>Gândește acum...</p>
                  ) : (
                    <p style={{ color: "#555", fontStyle: "italic" }}>—</p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Input (sticky bottom) — pushed 1cm up from viewport edge */}
      <form
        onSubmit={(e) => { e.preventDefault(); if (!phase.asking) { ask(); } }}
        className="sticky mt-2 px-4 pt-4 z-30"
        style={{
          bottom: 24,
          paddingBottom: 16,
          background: "linear-gradient(180deg, transparent, rgba(10,10,16,0.95))",
          borderTop: "1px solid rgba(255,255,255,0.06)",
        }}
      >
        <div className="max-w-3xl mx-auto flex gap-2 items-center">
          <button
            type="button"
            onClick={() => setVoiceOn((v) => !v)}
            title={voiceOn ? "Voce Alex: ON (click pt mute)" : "Voce Alex: OFF (click pt pornire)"}
            className="w-11 h-11 rounded-lg inline-flex items-center justify-center flex-shrink-0"
            style={{
              backgroundColor: voiceOn ? "rgba(245,158,11,0.15)" : "rgba(255,255,255,0.05)",
              border: `1px solid ${voiceOn ? "rgba(245,158,11,0.35)" : "rgba(255,255,255,0.1)"}`,
              color: voiceOn ? "#F59E0B" : "#888",
            }}
          >
            {voiceOn ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
          </button>
          <button
            type="button"
            onClick={recording ? stopRecording : startRecording}
            disabled={phase.asking}
            title={recording ? "Oprește înregistrarea" : "Vorbește cu boardul (apasă pentru microfon)"}
            className="w-11 h-11 rounded-lg inline-flex items-center justify-center flex-shrink-0 disabled:opacity-40"
            style={{
              backgroundColor: recording ? "#EF4444" : "rgba(255,255,255,0.05)",
              border: `1px solid ${recording ? "#EF4444" : "rgba(255,255,255,0.1)"}`,
              color: recording ? "white" : "#ccc",
              animation: recording ? "brainBreath 1.3s infinite" : undefined,
            }}
          >
            {recording ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
          </button>
          <input
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            placeholder={recording ? "Ascult... vorbește în română" : (phase.asking ? "Board-ul dezbate — poți scrie următoarea întrebare..." : "Pune o întrebare boardului sau apasă mic...")}
            disabled={recording}
            autoComplete="off"
            autoCorrect="off"
            autoCapitalize="off"
            spellCheck={false}
            name={`board-q-${Date.now()}`}
            className="flex-1 rounded-lg px-4 py-3 text-sm"
            style={{
              backgroundColor: "rgba(26,26,36,0.95)", border: "1px solid rgba(255,255,255,0.1)", color: "white", outline: "none",
            }}
          />
          <button
            type="submit" disabled={phase.asking || !question}
            className="px-5 py-3 rounded-lg font-bold inline-flex items-center gap-2 disabled:opacity-50"
            style={{ backgroundColor: "#F59E0B", color: "black" }}
          >
            {phase.asking ? <><Loader2 className="w-4 h-4 animate-spin" /> Dezbat...</> : <><Sparkles className="w-4 h-4" /> Întreabă</>}
          </button>
        </div>
        {error && <p className="text-xs text-center mt-2" style={{ color: "#F87171" }}>{error}</p>}
      </form>

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

      {/* Transcript panel REMOVED — now lives in the horizontal strip below, see after the input */}

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
