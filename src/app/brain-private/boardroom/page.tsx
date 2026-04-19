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
  color: string; // accent color for seat border
  angle: number; // kept for compatibility with speech bubble positioning
  kind: "alex" | "agent" | "you";
  side: "top" | "bottom"; // top row or bottom row (CFO)
}

// Layout: top row has 11 seats (5 left + Alex center + 5 right), bottom has Dara (CFO)
const TOP_LEFT: Seat[] = [
  { id: "cmo",        name: "Vera",   title: "Dir. Marketing",  icon: "🎯", color: "#3498db", angle: 300, kind: "agent", side: "top" },
  { id: "content",    name: "Marcus", title: "Dir. Content",     icon: "✍️", color: "#9b59b6", angle: 330, kind: "agent", side: "top" },
  { id: "sales",      name: "Sofia",  title: "Dir. Sales",       icon: "🤝", color: "#e67e22", angle: 0,   kind: "agent", side: "top" },
  { id: "analyst",    name: "Ethan",  title: "Growth Analyst",   icon: "📊", color: "#1abc9c", angle: 30,  kind: "agent", side: "top" },
  { id: "finance",    name: "Dara",   title: "CFO",              icon: "💰", color: "#f1c40f", angle: 60,  kind: "agent", side: "top" },
];
const CENTER_SEAT: Seat = { id: "alex", name: "Alex", title: "CEO", icon: "👔", color: "#2ecc71", angle: 270, kind: "alex", side: "top" };
const TOP_RIGHT: Seat[] = [
  { id: "legal",      name: "Theo",   title: "Chief Legal",      icon: "⚖️", color: "#e74c3c", angle: 90,  kind: "agent", side: "top" },
  { id: "researcher", name: "Nora",   title: "Researcher",       icon: "🔍", color: "#34495e", angle: 120, kind: "agent", side: "top" },
  { id: "competitive",name: "Kai",    title: "Competitive",      icon: "⚔️", color: "#95a5a6", angle: 150, kind: "agent", side: "top" },
  { id: "copywriter", name: "Iris",   title: "Copywriter",       icon: "🎨", color: "#d35400", angle: 180, kind: "agent", side: "top" },
  { id: "strategist", name: "Leo",    title: "Strategist",       icon: "🧠", color: "#8e44ad", angle: 210, kind: "agent", side: "top" },
];
const BOTTOM_SEAT: Seat = { id: "you", name: "Eduard", title: "Founder", icon: "🧑‍💼", color: "#e91e63", angle: 240, kind: "you", side: "bottom" };

const SEATS: Seat[] = [...TOP_LEFT, CENTER_SEAT, ...TOP_RIGHT, BOTTOM_SEAT];

interface Contribution { agent_id: string; agent_name: string; text: string; sessionId?: string; round?: 1 | 2; responds_to?: string | null; }

// ProxyDrawer — collapsed floating pill bottom-left + expand-on-click drawer.
// Replaces the fixed full-height panel that was covering the oval table.
function ProxyDrawer({ approvals }: { approvals: Array<{ ts: string; question: string; synthesis: string; proxy_response: string }> }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      {/* Always-visible compact pill (bottom-left, above everything). Click → drawer. */}
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="fixed bottom-3 left-3 z-30 inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-full text-[10px] font-bold shadow-lg"
        style={{
          backgroundColor: "rgba(20,15,30,0.95)",
          border: "1px solid rgba(139,92,246,0.55)",
          color: "#a78bfa",
          backdropFilter: "blur(8px)",
        }}
        title={open ? "Închide proxy log" : "Deschide proxy log"}
      >
        🛡️ Proxy · {approvals.length}
        <span style={{ opacity: 0.5 }}>{open ? "▼" : "▲"}</span>
      </button>
      {open && (
        <div
          className="fixed bottom-14 left-3 w-72 max-h-[60vh] overflow-y-auto p-3 rounded-xl z-30"
          style={{
            backgroundColor: "rgba(20,15,30,0.97)",
            border: "1px solid rgba(139,92,246,0.35)",
            backdropFilter: "blur(14px)",
          }}
        >
          <p className="text-[10px] uppercase tracking-wider font-bold mb-2" style={{ color: "#a78bfa" }}>
            🛡️ Proxy în numele tău
          </p>
          <p className="text-[9px] mb-3" style={{ color: "#666" }}>
            Ce a răspuns AI-ul tău delegate lui Alex cât tu lipsești
          </p>
          <div className="space-y-2">
            {approvals.slice().reverse().slice(0, 6).map((a, i) => (
              <div key={i} className="p-2 rounded-lg" style={{ backgroundColor: "rgba(139,92,246,0.08)", border: "1px solid rgba(139,92,246,0.2)" }}>
                <p className="text-[9px]" style={{ color: "#888" }}>{(a.ts || "").slice(5, 16).replace("T", " ")}</p>
                <p className="text-[11px] whitespace-pre-wrap mt-1" style={{ color: "#ddd", lineHeight: 1.4 }}>{a.proxy_response}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </>
  );
}
interface Phase { active: string | null; contributions: Contribution[]; synthesis: string | null; asking: boolean; }

function SeatCard({ seat: s, isActive, isAmbient, contrib, delegateActive, ambientMsg, elevated }: {
  seat: Seat; isActive: boolean; isAmbient: boolean;
  contrib?: Contribution; delegateActive: boolean; ambientMsg: string;
  activeAgents: string[]; ambientAgent: string | null; asking: boolean; elevated?: boolean;
}) {
  const isAlex = s.kind === "alex";
  const isYou = s.kind === "you";
  return (
    <div className="relative flex flex-col items-center" style={{ width: 80 }}>
      {/* Pulse ring */}
      {(isActive || isAmbient) && (
        <span className="absolute rounded-full" style={{
          animation: isActive ? "brainPulse 1.4s ease-out infinite" : "brainPulseSoft 2.4s ease-out infinite",
          backgroundColor: isActive
            ? (isAlex ? "rgba(245,158,11,0.5)" : "rgba(59,130,246,0.4)")
            : (isAlex ? "rgba(245,158,11,0.25)" : "rgba(16,185,129,0.3)"),
          width: 72, height: 72, top: -4, left: 4, zIndex: 0,
        }} />
      )}
      {/* Ambient whisper */}
      {isAmbient && ambientMsg && (
        <div className="absolute text-[10px] px-2 py-1 rounded-md whitespace-nowrap z-20"
          style={{
            backgroundColor: "rgba(16,185,129,0.15)", border: "1px solid rgba(16,185,129,0.35)",
            color: "#86efac", top: -28, left: "50%", transform: "translateX(-50%)",
            animation: "brainFadeIn 0.3s ease-out",
          }}>
          {ambientMsg}
        </div>
      )}
      {/* Avatar */}
      <div
        className="w-14 h-14 rounded-full flex items-center justify-center text-2xl relative overflow-hidden z-10"
        style={{
          backgroundColor: isAlex ? "rgba(245,158,11,0.25)"
            : isYou && delegateActive ? "rgba(139,92,246,0.28)"
            : isYou ? "rgba(59,130,246,0.25)"
            : "rgba(255,255,255,0.06)",
          border: elevated ? `3px solid ${s.color}` : `2px solid ${s.color}`,
          boxShadow: isActive
            ? `0 0 24px ${isAlex ? "rgba(245,158,11,0.6)" : "rgba(59,130,246,0.5)"}`
            : `0 4px 12px rgba(0,0,0,0.4)`,
          transition: "all 0.3s ease",
          backgroundImage: isYou ? "url(/avatars/eduard.jpg)" : undefined,
          backgroundSize: "cover", backgroundPosition: "center 20%",
        }}
      >
        {!isYou && s.icon}
        {isAlex && <span className="absolute -top-1 -right-1 text-xs">👑</span>}
        {isYou && delegateActive && (
          <span className="absolute -top-1 -right-1 text-xs flex items-center justify-center rounded-full"
            style={{ backgroundColor: "#8B5CF6", width: 18, height: 18, boxShadow: "0 0 10px rgba(139,92,246,0.8)", animation: "brainBreath 1.5s infinite" }}
            title="Delegate Mode">🛡️</span>
        )}
      </div>
      {/* Status dot */}
      <span className="absolute w-2.5 h-2.5 rounded-full z-10" style={{
        bottom: 22, right: 16,
        backgroundColor: isYou && delegateActive ? "#8B5CF6" : isActive ? "#F59E0B" : isAmbient ? "#10B981" : s.color,
        boxShadow: `0 0 8px ${isActive ? "#F59E0B" : s.color}`,
        animation: "brainBreath 3s ease-in-out infinite",
      }} />
      {/* Name + title */}
      <p className="text-xs font-bold text-center mt-1" style={{ color: isAlex ? "#2ecc71" : isYou ? "#3B82F6" : "white" }}>{s.name}</p>
      <p className="text-[10px] text-center" style={{ color: "#888" }}>{s.title}</p>
      {/* Color accent bar */}
      <div className="w-10 h-1 rounded-full mt-1" style={{ backgroundColor: s.color, opacity: isActive ? 1 : 0.5 }} />
      {/* Speech bubble */}
      {isActive && contrib && (
        <div className="absolute text-xs p-2.5 rounded-lg shadow-2xl z-30"
          style={{
            backgroundColor: "rgba(26,26,36,0.98)", border: `1px solid ${s.color}80`,
            color: "#eee", width: 220,
            top: s.side === "bottom" ? "auto" : "100%",
            bottom: s.side === "bottom" ? "100%" : "auto",
            left: "50%", transform: "translateX(-50%)",
            marginTop: s.side === "bottom" ? 0 : 8,
            marginBottom: s.side === "bottom" ? 8 : 0,
            backdropFilter: "blur(12px)", lineHeight: 1.5,
            animation: "brainFadeIn 0.3s ease-out",
          }}>
          <p className="font-bold text-[11px]" style={{ color: s.color }}>{contrib.agent_name}</p>
          <p className="mt-1.5 text-[11px]">{contrib.text.slice(0, 180)}{contrib.text.length > 180 ? "..." : ""}</p>
        </div>
      )}
    </div>
  );
}

// No fake ambient feed — removed. All displayed activity is real data from DB.
// No auto-kickoff question — removed. User initiates every session manually.

export default function Boardroom() {
  const [question, setQuestion] = useState("");
  const [phase, setPhase] = useState<Phase>(() => {
    if (typeof window === "undefined") return { active: null, contributions: [], synthesis: null, asking: false };
    try {
      const saved = localStorage.getItem("boardroom_state_v1");
      if (saved) {
        const parsed = JSON.parse(saved) as Phase;
        // Clear asking flag — any in-flight request is gone after refresh
        return { ...parsed, asking: false, active: null };
      }
    } catch { /* ignore */ }
    return { active: null, contributions: [], synthesis: null, asking: false };
  });

  // Persist phase whenever it changes (except while asking)
  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const toSave: Phase = { ...phase, asking: false, active: null };
      localStorage.setItem("boardroom_state_v1", JSON.stringify(toSave));
    } catch { /* ignore */ }
  }, [phase.contributions, phase.synthesis]);
  const [error, setError] = useState<string | null>(null);
  // ambientAgent is now REAL — populated from /api/brain/activity active_agents
  // (which agent is currently executing a backend job right now). No fake data.
  const [ambientAgent, setAmbientAgent] = useState<string | null>(null);
  const [ambientMsg, setAmbientMsg] = useState<string>(""); // latest real activity line for the active agent
  const [whisper] = useState<{ from: string; to: string } | null>(null); // kept for compatibility, never set
  const [liveFeed, setLiveFeed] = useState<string[]>([]);
  const [activeAgents, setActiveAgents] = useState<string[]>([]);
  const [perAgent, setPerAgent] = useState<Record<string, { agent_id: string; agent_name: string; description: string; time: string; activity: string }>>({});
  const [feedItems, setFeedItems] = useState<Array<{ agent_id: string; agent_name: string; line: string; time: string }>>([]);
  const [debugInfo, setDebugInfo] = useState<string>("init");
  const timersRef = useRef<NodeJS.Timeout[]>([]);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Delegate live feed — poll every 10s for proxy activity
  const [delegateActive, setDelegateActive] = useState(false);
  const [proxyApprovals, setProxyApprovals] = useState<Array<{ ts: string; question: string; synthesis: string; proxy_response: string }>>([]);
  useEffect(() => {
    const fetchFeed = async () => {
      try {
        const r = await fetch("/api/brain/delegate/feed");
        if (!r.ok) { setDelegateActive(false); return; }
        const d = await r.json();
        setDelegateActive(Boolean(d.session));
        setProxyApprovals(Array.isArray(d.approvals) ? d.approvals : []);
      } catch { /* no-op */ }
    };
    void fetchFeed();
    const iv = setInterval(fetchFeed, 10000);
    return () => clearInterval(iv);
  }, []);
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

  // No auto-kickoff — user initiates every session manually.
  // (removed: autonomous fake debate that wasn't driven by real data)

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

  // Real activity feed — pulls actual events from DB (outreach sent/replied,
  // critical ops incidents, delegate decisions, agent backend jobs running
  // RIGHT NOW). Updates every 3s when someone might be active (fast feedback),
  // every 20s otherwise. No synthetic data.
  useEffect(() => {
    const fetchActivity = async () => {
      try {
        const r = await fetch("/api/brain/activity");
        setDebugInfo(`HTTP ${r.status} · poll ${new Date().toLocaleTimeString()}`);
        if (!r.ok) {
          setDebugInfo(`ERR ${r.status} · ${new Date().toLocaleTimeString()}`);
          return;
        }
        const d = await r.json();
        if (Array.isArray(d.events)) {
          setLiveFeed(d.events.slice(0, 6));
          if (d.events[0]) setAmbientMsg(String(d.events[0]));
        }
        if (Array.isArray(d.active_agents)) {
          setActiveAgents(d.active_agents as string[]);
          setAmbientAgent(d.active_agents[0] ?? null);
        }
        if (d.per_agent && typeof d.per_agent === "object") {
          setPerAgent(d.per_agent as Record<string, { agent_id: string; agent_name: string; description: string; time: string; activity: string }>);
        }
        if (Array.isArray(d.feed_items)) {
          setFeedItems(d.feed_items as Array<{ agent_id: string; agent_name: string; line: string; time: string }>);
        }
        setDebugInfo(`OK · active=[${(d.active_agents ?? []).join(",") || "none"}] · events=${(d.events ?? []).length} · ${new Date().toLocaleTimeString().slice(-5)}`);
      } catch (e) {
        setDebugInfo(`EXCEPTION ${e instanceof Error ? e.message : "?"}`);
      }
    };
    void fetchActivity();
    // Fast poll (3s) for live pulse responsiveness — lightweight query
    const iv = setInterval(fetchActivity, 3000);
    return () => clearInterval(iv);
  }, []);

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
      {/* Ultra-compact inline header — sits in a narrow strip so the rest
          of the viewport is entirely for the board + grid + input */}
      <header className="max-w-[1800px] mx-auto px-5 py-2 flex items-center gap-3 relative z-20" style={{ minHeight: 40 }}>
        <Link href="/" className="text-[11px] inline-flex items-center gap-1 px-2 py-1 rounded-md"
          style={{ backgroundColor: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.08)", color: "#bbb" }}>
          <ArrowLeft className="w-3 h-3" /> Înapoi
        </Link>
        <p className="text-xs font-bold" style={{ color: "#F59E0B" }}>🏛️ Boardroom Live</p>
        <p className="text-[11px] flex-1 truncate" style={{ color: "#888" }}>
          {phase.asking
            ? "Ședință în desfășurare · echipa dezbate..."
            : phase.synthesis
            ? "Alex a închis ședința · raportul e în panoul său"
            : "Scrie o întrebare sau vorbește cu mic-ul — echipa răspunde"}
        </p>
        {delegateActive && (
          <div className="flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-md font-bold"
            style={{ backgroundColor: "rgba(139,92,246,0.2)", border: "1px solid rgba(139,92,246,0.5)", color: "#a78bfa" }}>
            🛡️ PROXY ACTIV
          </div>
        )}
        {phase.asking && (
          <div className="flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-md"
            style={{ backgroundColor: "rgba(245,158,11,0.15)", border: "1px solid rgba(245,158,11,0.3)", color: "#F59E0B" }}>
            <span className="inline-block w-1.5 h-1.5 rounded-full" style={{ backgroundColor: "#F59E0B", animation: "brainBreath 1.5s infinite" }} />
            LIVE
          </div>
        )}
      </header>

      {/* Proxy activity floating panel — shows when Delegate is active */}
      {/* Proxy activity — collapsed floating pill by default (doesn't cover table).
          Click to expand into a right-side drawer with history. */}
      {delegateActive && proxyApprovals.length > 0 && (
        <ProxyDrawer approvals={proxyApprovals} />
      )}

      {/* MAIN LAYOUT: Left column + Right live panel */}
      <div className="flex" style={{ height: "calc(100vh - 44px)", overflow: "hidden" }}>

        {/* LEFT COLUMN: Boardroom + Agent cards + Input */}
        <div className="flex-1 flex flex-col overflow-y-auto px-4 min-w-0">

          {/* Boardroom Arena — rectangular table layout */}
          <div className="flex-shrink-0">
            {/* TOP ROW */}
            <div className="flex items-end justify-center gap-2 mb-4 flex-wrap">
              {TOP_LEFT.map((s) => {
                const isActive = phase.active === s.id;
                const isBackendActive = activeAgents.includes(s.id);
                const isAmbient = (ambientAgent === s.id && !phase.asking) || isBackendActive;
                const contrib = activeContribs.get(s.id);
                return (
                  <SeatCard key={s.id} seat={s} isActive={isActive} isAmbient={isAmbient}
                    contrib={contrib} delegateActive={delegateActive} ambientMsg={ambientMsg}
                    activeAgents={activeAgents} ambientAgent={ambientAgent} asking={phase.asking} />
                );
              })}
              <div className="relative" style={{ transform: "translateY(-10px)" }}>
                {(() => {
                  const s = CENTER_SEAT;
                  const isActive = phase.active === s.id;
                  const isBackendActive = activeAgents.includes(s.id);
                  const isAmbient = (ambientAgent === s.id && !phase.asking) || isBackendActive;
                  const contrib = activeContribs.get(s.id);
                  return (
                    <SeatCard seat={s} isActive={isActive} isAmbient={isAmbient}
                      contrib={contrib} delegateActive={delegateActive} ambientMsg={ambientMsg}
                      activeAgents={activeAgents} ambientAgent={ambientAgent} asking={phase.asking} elevated />
                  );
                })()}
              </div>
              {TOP_RIGHT.map((s) => {
                const isActive = phase.active === s.id;
                const isBackendActive = activeAgents.includes(s.id);
                const isAmbient = (ambientAgent === s.id && !phase.asking) || isBackendActive;
                const contrib = activeContribs.get(s.id);
                return (
                  <SeatCard key={s.id} seat={s} isActive={isActive} isAmbient={isAmbient}
                    contrib={contrib} delegateActive={delegateActive} ambientMsg={ambientMsg}
                    activeAgents={activeAgents} ambientAgent={ambientAgent} asking={phase.asking} />
                );
              })}
            </div>

            {/* TABLE */}
            <div className="mx-auto flex items-center justify-center" style={{
              width: "90%", height: 70, borderRadius: 40,
              background: "radial-gradient(ellipse at 30% 25%, rgba(245,158,11,0.12), transparent 55%), repeating-linear-gradient(88deg, rgba(101,67,33,0.9) 0 2px, rgba(120,80,40,0.85) 2px 5px, rgba(85,55,25,0.88) 5px 9px), linear-gradient(180deg, rgba(92,55,25,1), rgba(60,35,15,1))",
              border: "2px solid rgba(139,90,43,0.5)",
              boxShadow: "inset 0 -6px 20px rgba(0,0,0,0.5), 0 16px 32px rgba(0,0,0,0.4), 0 0 0 3px rgba(50,30,15,0.8)",
            }}>
              <span style={{ color: "rgba(245,215,160,0.18)", letterSpacing: 4, fontWeight: 700, fontSize: "0.8rem" }}>BOARDROOM TABLE</span>
            </div>

            {/* EDUARD — bottom */}
            <div className="flex justify-center mt-4 mb-3">
              {(() => {
                const s = BOTTOM_SEAT;
                const isActive = phase.active === s.id;
                const isBackendActive = activeAgents.includes(s.id);
                const isAmbient = (ambientAgent === s.id && !phase.asking) || isBackendActive;
                const contrib = activeContribs.get(s.id);
                return (
                  <SeatCard seat={s} isActive={isActive} isAmbient={isAmbient}
                    contrib={contrib} delegateActive={delegateActive} ambientMsg={ambientMsg}
                    activeAgents={activeAgents} ambientAgent={ambientAgent} asking={phase.asking} elevated />
                );
              })()}
            </div>
          </div>

          {/* DEBATE SECTION: Alex hero + 9 directors grid — fills remaining space */}
          <div className="flex-1 flex flex-col min-h-0 mt-1">
            <p className="text-[10px] uppercase tracking-widest font-bold mb-2 flex-shrink-0" style={{ color: "#F59E0B", letterSpacing: "0.15em" }}>
              💬 Live Debate
            </p>

            {/* Alex synthesis panel */}
            <div className="rounded-xl p-3 mb-2 flex-shrink-0" style={{
              background: "linear-gradient(135deg, rgba(245,158,11,0.12), rgba(245,158,11,0.02))",
              border: `1px solid ${phase.active === "alex" ? "rgba(245,158,11,0.65)" : "rgba(245,158,11,0.3)"}`,
              boxShadow: phase.active === "alex" ? "0 0 24px rgba(245,158,11,0.25)" : "0 4px 12px rgba(0,0,0,0.3)",
              maxHeight: 150,
            }}>
              <div className="flex items-center gap-2 mb-1">
                <span className="text-lg">👔</span>
                <div className="flex-1">
                  <p className="font-bold text-sm flex items-center gap-2" style={{ color: "#F59E0B" }}>
                    Alex · CEO
                    {phase.active === "alex" && <span className="inline-block w-2 h-2 rounded-full" style={{ backgroundColor: "#10B981", animation: "brainBreath 1.5s infinite" }} />}
                    {activeAgents.includes("alex") && !phase.asking && <span className="inline-block w-2 h-2 rounded-full" style={{ backgroundColor: "#10B981", animation: "brainPulseSoft 2.4s infinite" }} />}
                  </p>
                  <p className="text-[10px]" style={{ color: "#b88a3a" }}>
                    {phase.synthesis ? "Final recommendation" : phase.asking ? "Listening, preparing synthesis..." : perAgent.alex?.description || "Waiting for your question"}
                  </p>
                </div>
              </div>
              <div className="overflow-y-auto text-sm" style={{ color: "#eee", lineHeight: 1.6, maxHeight: 90 }}>
                {phase.synthesis ? (
                  <p className="whitespace-pre-wrap">{phase.synthesis}</p>
                ) : (
                  <p style={{ color: "#888", fontStyle: "italic" }}>— Alex will synthesize all perspectives after the debate.</p>
                )}
              </div>
            </div>

            {/* 9 directors — 3×3 grid, fills remaining space */}
            <div className="grid gap-2 flex-1 min-h-0" style={{ gridTemplateColumns: "repeat(3, minmax(0, 1fr))" }}>
              {SEATS.filter((s) => s.kind === "agent").map((seat) => {
                const latestDebate = [...phase.contributions].reverse().find((c) => c.agent_id === seat.id);
                const isActive = phase.active === seat.id;
                const isBackendActive = activeAgents.includes(seat.id);
                const agentActivity = perAgent[seat.id];
                return (
                  <div key={seat.id} className="rounded-xl p-2.5 flex flex-col overflow-hidden" style={{
                    backgroundColor: "rgba(26,26,36,0.9)",
                    border: `1px solid ${isActive ? `${seat.color}80` : isBackendActive ? `${seat.color}40` : "rgba(255,255,255,0.08)"}`,
                    transition: "all 0.3s ease",
                    boxShadow: isActive ? `0 0 20px ${seat.color}33` : isBackendActive ? `0 0 12px ${seat.color}22` : undefined,
                  }}>
                    <div className="flex items-center gap-2 mb-1.5 flex-shrink-0">
                      <span className="text-base">{seat.icon}</span>
                      <div className="flex-1 min-w-0">
                        <p className="font-bold text-xs truncate" style={{ color: seat.color }}>{seat.name}</p>
                        <p className="text-[9px] truncate" style={{ color: "#888" }}>{seat.title}</p>
                      </div>
                      {(isActive || isBackendActive) && (
                        <span className="inline-block w-2 h-2 rounded-full flex-shrink-0" style={{
                          backgroundColor: isActive ? "#F59E0B" : seat.color,
                          animation: isActive ? "brainBreath 1.5s infinite" : "brainPulseSoft 2.4s infinite",
                          boxShadow: `0 0 6px ${isActive ? "#F59E0B" : seat.color}`,
                        }} />
                      )}
                    </div>
                    <div className="flex-1 text-[11px] overflow-y-auto" style={{ color: "#ccc", lineHeight: 1.45 }}>
                      {latestDebate ? (
                        <p className="whitespace-pre-wrap">{latestDebate.text}</p>
                      ) : phase.asking && isActive ? (
                        <p style={{ color: seat.color, fontStyle: "italic" }}>Thinking...</p>
                      ) : agentActivity ? (
                        <p style={{ color: "#999" }}>
                          <span className="text-[9px] font-mono" style={{ color: "#666" }}>{agentActivity.time}</span>{" "}
                          {agentActivity.description}
                        </p>
                      ) : (
                        <p style={{ color: "#444", fontStyle: "italic" }}>—</p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Input bar — pinned bottom of left column */}
          <form onSubmit={(e) => { e.preventDefault(); if (!phase.asking) { ask(); } }}
            className="flex-shrink-0 py-2 mt-1" style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}>
            <div className="flex gap-2 items-center">
              <button type="button" onClick={() => setVoiceOn((v) => !v)}
                title={voiceOn ? "Voice: ON" : "Voice: OFF"}
                className="w-10 h-10 rounded-lg inline-flex items-center justify-center flex-shrink-0"
                style={{ backgroundColor: voiceOn ? "rgba(245,158,11,0.15)" : "rgba(255,255,255,0.05)", border: `1px solid ${voiceOn ? "rgba(245,158,11,0.35)" : "rgba(255,255,255,0.1)"}`, color: voiceOn ? "#F59E0B" : "#888" }}>
                {voiceOn ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
              </button>
              <button type="button" onClick={recording ? stopRecording : startRecording} disabled={phase.asking}
                title={recording ? "Stop recording" : "Voice input"}
                className="w-10 h-10 rounded-lg inline-flex items-center justify-center flex-shrink-0 disabled:opacity-40"
                style={{ backgroundColor: recording ? "#EF4444" : "rgba(255,255,255,0.05)", border: `1px solid ${recording ? "#EF4444" : "rgba(255,255,255,0.1)"}`, color: recording ? "white" : "#ccc", animation: recording ? "brainBreath 1.3s infinite" : undefined }}>
                {recording ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
              </button>
              <input value={question} onChange={(e) => setQuestion(e.target.value)}
                placeholder={recording ? "Listening..." : (phase.asking ? "Board is debating..." : "Ask the board a question...")}
                disabled={recording} autoComplete="off" autoCorrect="off" autoCapitalize="off" spellCheck={false}
                name={`board-q-${Date.now()}`}
                className="flex-1 rounded-lg px-4 py-3 text-sm"
                style={{ backgroundColor: "rgba(26,26,36,0.95)", border: "1px solid rgba(255,255,255,0.1)", color: "white", outline: "none" }} />
              <button type="submit" disabled={phase.asking || !question}
                className="px-4 py-3 rounded-lg font-bold inline-flex items-center gap-2 disabled:opacity-50"
                style={{ backgroundColor: "#F59E0B", color: "black" }}>
                {phase.asking ? <><Loader2 className="w-4 h-4 animate-spin" /> Debating...</> : <><Sparkles className="w-4 h-4" /> Ask</>}
              </button>
            </div>
            {error && <p className="text-xs text-center mt-1" style={{ color: "#F87171" }}>{error}</p>}
          </form>
        </div>

        {/* RIGHT PANEL: Live Activity Feed — full height */}
        <div className="w-72 flex-shrink-0 hidden lg:flex flex-col overflow-y-auto"
          style={{ borderLeft: "1px solid rgba(16,185,129,0.2)", background: "rgba(10,10,16,0.85)", backdropFilter: "blur(12px)" }}>
          <div className="px-4 py-3 flex items-center gap-2 flex-shrink-0" style={{ borderBottom: "1px solid rgba(16,185,129,0.15)" }}>
            <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: "#10B981", animation: "brainBreath 2s infinite" }} />
            <span className="text-[10px] uppercase tracking-widest font-bold" style={{ color: "#10B981" }}>Live Activity</span>
          </div>
          <div className="flex-1 overflow-y-auto">
            {feedItems.length > 0 ? feedItems.map((item, i) => {
              const seat = SEATS.find((s) => s.id === item.agent_id);
              const color = seat?.color ?? "#888";
              return (
                <div key={i} className="px-4 py-2.5" style={{ borderBottom: "1px solid rgba(255,255,255,0.04)", opacity: 1 - i * 0.05 }}>
                  <div className="text-[9px] mb-0.5" style={{ color: "#555" }}>{item.time}</div>
                  <div className="text-[11px]" style={{ color: "#aaa", lineHeight: 1.4 }}>
                    <span className="inline-block text-[9px] font-bold px-1.5 py-0.5 rounded mr-1" style={{ backgroundColor: `${color}22`, color }}>{item.agent_name.split(" ")[0]}</span>
                    {item.line}
                  </div>
                </div>
              );
            }) : liveFeed.length > 0 ? liveFeed.map((line, i) => (
              <div key={i} className="px-4 py-2.5 text-[11px]" style={{ color: "#aaa", lineHeight: 1.35, borderBottom: "1px solid rgba(255,255,255,0.04)", opacity: 1 - i * 0.1 }}>
                {line}
              </div>
            )) : (
              <div className="px-4 py-6 text-[11px] text-center" style={{ color: "#555" }}>No activity yet</div>
            )}
          </div>
          {/* Debug */}
          <div className="px-3 py-1.5 text-[9px] font-mono flex-shrink-0" style={{ borderTop: "1px solid rgba(255,255,255,0.06)", color: debugInfo.startsWith("OK") ? "#6ee7b7" : "#fca5a5" }}>
            🔌 {debugInfo}
          </div>
        </div>
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
      `}</style>
    </div>
  );
}
