"use client";

/**
 * Cockpit — Mission Control for MarketHub Pro.
 *
 * Boeing-cockpit-inspired HUD: 3D attitude indicator + engine turbine +
 * HUD panels for services, security, findings, crons, and an AI assistant
 * chat at the bottom. Realtime data via Supabase Realtime + 10s polling
 * fallback.
 *
 * This page is gated by localStorage `admin_authenticated` (same as the
 * rest of /dashboard/admin/*). API calls use admin cookie auth.
 */

import { useEffect, useState, useRef, useCallback } from "react";
import Link from "next/link";
import dynamic from "next/dynamic";
import { createClient } from "@/lib/supabase/client";
import {
  ArrowLeft,
  Shield,
  Cpu,
  Activity,
  AlertTriangle,
  Radio,
  Database,
  Send,
  Play,
  Plane,
} from "lucide-react";

// 3D components loaded client-side only (no SSR for three.js)
const AttitudeIndicator3D = dynamic(() => import("@/components/cockpit/AttitudeIndicator3D"), { ssr: false });
const EngineTurbine3D = dynamic(() => import("@/components/cockpit/EngineTurbine3D"), { ssr: false });

// ── Types ──────────────────────────────────────────────────────────────────

interface ServiceCheck {
  ok: boolean;
  latency_ms: number;
  detail: string;
}

interface Finding {
  id: string;
  agent: string;
  severity: "info" | "low" | "medium" | "high" | "critical";
  title: string;
  occurrences: number;
  last_seen: string;
}

interface CockpitState {
  timestamp: string;
  overall: { status: "healthy" | "degraded" | "critical"; score: number };
  services: Record<string, ServiceCheck>;
  metrics: {
    active_users_5min: number;
    new_signups_today: number;
    events_last_hour: number;
    events_last_24h: number;
    high_severity_events_24h: number;
  };
  findings: {
    counts: Record<string, number>;
    total: number;
    recent: Finding[];
  };
  security: {
    events_last_hour: number;
    top_ips: { ip: string; count: number }[];
    recent_events: {
      id: string;
      type: string;
      severity: string;
      ip: string | null;
      at: string;
    }[];
  };
  crons: {
    recently_active: number;
    last_runs: { job: string; ran_at: string; result: Record<string, unknown> | null }[];
  };
}

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

// ── Styles ─────────────────────────────────────────────────────────────────

const PANEL_STYLE: React.CSSProperties = {
  background: "linear-gradient(180deg, rgba(12,8,6,0.95), rgba(28,20,15,0.85))",
  border: "1px solid rgba(245,158,11,0.25)",
  borderRadius: 8,
  padding: 14,
  position: "relative",
  boxShadow: "inset 0 0 20px rgba(245,158,11,0.04), 0 0 8px rgba(245,158,11,0.08)",
};

const PANEL_LABEL_STYLE: React.CSSProperties = {
  position: "absolute",
  top: -8,
  left: 12,
  fontSize: 9,
  letterSpacing: 2,
  color: "var(--color-primary)",
  background: "#0A0807",
  padding: "0 8px",
  fontFamily: "monospace",
  textTransform: "uppercase",
};

const SEV_COLORS: Record<string, string> = {
  critical: "#EF4444",
  high: "#F97316",
  medium: "var(--color-primary)",
  low: "#84CC16",
  info: "#0EA5E9",
};

// ── Page ───────────────────────────────────────────────────────────────────

export default function CockpitPage() {
  const [state, setState] = useState<CockpitState | null>(null);
  const [sessionExpired, setSessionExpired] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);

  // Chat state
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([
    { role: "assistant", content: "Cockpit Assistant online. Întreabă orice despre starea platformei." },
  ]);
  const [chatInput, setChatInput] = useState("");
  const [chatBusy, setChatBusy] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  // ── State loader ─────────────────────────────────────────────────────────

  const loadState = useCallback(async () => {
    try {
      const res = await fetch("/api/cockpit/state", { cache: "no-store" });
      if (res.status === 401 || res.status === 403 || res.status === 404) {
        setSessionExpired(true);
        return;
      }
      if (!res.ok) return;
      const data = (await res.json()) as CockpitState;
      setState(data);
      setSessionExpired(false);
      setLastUpdate(new Date());
    } catch {
      /* ignore transient errors — next poll recovers */
    }
  }, []);

  useEffect(() => {
    void loadState();
    const interval = setInterval(loadState, 10_000);
    return () => clearInterval(interval);
  }, [loadState]);

  // ── Supabase Realtime subscription ───────────────────────────────────────

  useEffect(() => {
    let channel: ReturnType<ReturnType<typeof createClient>["channel"]> | null = null;
    try {
      const supabase = createClient();
      channel = supabase
        .channel("cockpit")
        .on(
          "postgres_changes",
          { event: "INSERT", schema: "public", table: "maintenance_findings" },
          () => void loadState(),
        )
        .on(
          "postgres_changes",
          { event: "INSERT", schema: "public", table: "security_events" },
          () => void loadState(),
        )
        .subscribe();
    } catch {
      /* realtime not available — polling fallback still works */
    }
    return () => {
      try {
        channel?.unsubscribe();
      } catch {
        /* ignore */
      }
    };
  }, [loadState]);

  // ── Chat ─────────────────────────────────────────────────────────────────

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatMessages]);

  async function sendChat() {
    if (!chatInput.trim() || chatBusy) return;
    const userMsg: ChatMessage = { role: "user", content: chatInput.trim() };
    const next = [...chatMessages, userMsg];
    setChatMessages(next);
    setChatInput("");
    setChatBusy(true);
    try {
      // Send only the user/assistant conversation, flattened to plain text
      // content — the assistant's internal tool-use blocks stay server-side.
      const messages = next.map((m) => ({ role: m.role, content: m.content }));
      const res = await fetch("/api/cockpit/assistant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages }),
      });
      if (!res.ok) {
        setChatMessages([
          ...next,
          { role: "assistant", content: `⚠️ Error: HTTP ${res.status}. Check admin cookie.` },
        ]);
      } else {
        const data = (await res.json()) as { reply: string };
        setChatMessages([...next, { role: "assistant", content: data.reply || "(fără răspuns)" }]);
      }
    } catch (e) {
      setChatMessages([
        ...next,
        {
          role: "assistant",
          content: `⚠️ Network error: ${e instanceof Error ? e.message : "unknown"}`,
        },
      ]);
    } finally {
      setChatBusy(false);
    }
  }

  // ── Derived ──────────────────────────────────────────────────────────────

  const score = state?.overall.score ?? 50;
  const status = state?.overall.status ?? "degraded";
  const load = Math.min(1, (state?.metrics.events_last_hour ?? 0) / 100);

  // ── Render ───────────────────────────────────────────────────────────────

  if (sessionExpired) {
    return (
      <div style={{ background: "#0A0807", minHeight: "100vh", color: "var(--color-bg)", padding: 32, fontFamily: "monospace" }}>
        <h1 style={{ color: "var(--color-primary)" }}>⚠️ Sesiune admin expirată</h1>
        <p style={{ color: "#C4AA8A" }}>Re-loghează prin tunnel și revino.</p>
        <button
          onClick={() => window.location.reload()}
          style={{
            marginTop: 16,
            padding: "10px 20px",
            background: "var(--color-primary)",
            color: "#1C1814",
            border: "none",
            borderRadius: 8,
            fontWeight: 700,
            cursor: "pointer",
          }}
        >
          Reîncarcă
        </button>
      </div>
    );
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        background:
          "radial-gradient(ellipse at top, #1C1410 0%, #0A0807 40%, #000 100%)",
        color: "var(--color-bg)",
        padding: "24px 20px 200px",
        fontFamily: "-apple-system,BlinkMacSystemFont,sans-serif",
      }}
    >
      {/* ── Top bar ───────────────────────────────────────────────────── */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 16,
          marginBottom: 20,
          paddingBottom: 16,
          borderBottom: "1px solid rgba(245,158,11,0.25)",
          fontFamily: "monospace",
        }}
      >
        <Link
          href="/dashboard/admin"
          style={{
            display: "flex",
            alignItems: "center",
            gap: 6,
            padding: "6px 12px",
            background: "rgba(245,158,11,0.08)",
            borderRadius: 6,
            color: "var(--color-primary)",
            textDecoration: "none",
            fontSize: 11,
            letterSpacing: 1,
          }}
        >
          <ArrowLeft size={12} /> ADMIN
        </Link>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 10, color: "var(--color-primary)", letterSpacing: 3 }}>MARKETHUB PRO // COCKPIT</div>
          <div style={{ fontSize: 20, fontWeight: 900, color: "var(--color-bg)", marginTop: 2 }}>
            MISSION CONTROL
          </div>
        </div>
        <div style={{ textAlign: "right", fontSize: 10, color: "#C4AA8A" }}>
          <div>
            LAST UPDATE: {lastUpdate?.toLocaleTimeString("ro-RO") ?? "—"}
          </div>
          <div style={{ marginTop: 2 }}>
            STATUS: <span style={{ color: status === "healthy" ? "#10B981" : status === "degraded" ? "var(--color-primary)" : "#EF4444" }}>
              {status.toUpperCase()}
            </span>
          </div>
        </div>
      </div>

      {/* ── Main instrument row ────────────────────────────────────────── */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1.2fr 1fr",
          gap: 14,
          marginBottom: 14,
        }}
      >
        {/* Engine Turbine */}
        <div style={{ ...PANEL_STYLE, height: 280 }}>
          <span style={PANEL_LABEL_STYLE}>ENGINE · THROUGHPUT</span>
          <EngineTurbine3D load={load} status={status} />
          <div
            style={{
              position: "absolute",
              bottom: 10,
              left: 14,
              fontFamily: "monospace",
              fontSize: 10,
              color: "#C4AA8A",
            }}
          >
            {state?.metrics.events_last_hour ?? 0} EVT/h · {Math.round(load * 100)}% LOAD
          </div>
        </div>

        {/* Attitude Indicator (center) */}
        <div style={{ ...PANEL_STYLE, height: 280 }}>
          <span style={PANEL_LABEL_STYLE}>ATTITUDE · HEALTH SCORE</span>
          <AttitudeIndicator3D score={score} status={status} />
        </div>

        {/* Services gauges */}
        <div style={{ ...PANEL_STYLE, height: 280, display: "flex", flexDirection: "column" }}>
          <span style={PANEL_LABEL_STYLE}>SYSTEMS · SERVICES</span>
          <div style={{ display: "flex", flexDirection: "column", gap: 6, marginTop: 4, flex: 1, justifyContent: "center" }}>
            {state &&
              Object.entries(state.services).map(([name, s]) => (
                <div
                  key={name}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                    padding: "6px 10px",
                    background: s.ok ? "rgba(16,185,129,0.08)" : "rgba(239,68,68,0.12)",
                    border: `1px solid ${s.ok ? "rgba(16,185,129,0.3)" : "rgba(239,68,68,0.4)"}`,
                    borderRadius: 4,
                    fontFamily: "monospace",
                    fontSize: 11,
                  }}
                >
                  <div
                    style={{
                      width: 8,
                      height: 8,
                      borderRadius: "50%",
                      background: s.ok ? "#10B981" : "#EF4444",
                      boxShadow: `0 0 8px ${s.ok ? "#10B981" : "#EF4444"}`,
                    }}
                  />
                  <div style={{ flex: 1, textTransform: "uppercase", color: "var(--color-bg)", letterSpacing: 1 }}>
                    {name}
                  </div>
                  <div style={{ color: "#C4AA8A" }}>{s.latency_ms}ms</div>
                </div>
              ))}
          </div>
        </div>
      </div>

      {/* ── Gauges row ──────────────────────────────────────────────────── */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(5, 1fr)",
          gap: 14,
          marginBottom: 14,
        }}
      >
        <GaugeCard
          label="ACTIVE USERS"
          icon={<Activity size={12} />}
          value={state?.metrics.active_users_5min ?? 0}
          sub="last 5 min"
          color="#10B981"
        />
        <GaugeCard
          label="NEW TODAY"
          icon={<Plane size={12} />}
          value={state?.metrics.new_signups_today ?? 0}
          sub="signups"
          color="#0EA5E9"
        />
        <GaugeCard
          label="EVENTS 1H"
          icon={<Radio size={12} />}
          value={state?.metrics.events_last_hour ?? 0}
          sub="security"
          color="var(--color-primary)"
        />
        <GaugeCard
          label="HIGH 24H"
          icon={<AlertTriangle size={12} />}
          value={state?.metrics.high_severity_events_24h ?? 0}
          sub="critical events"
          color={state && state.metrics.high_severity_events_24h > 0 ? "#EF4444" : "#10B981"}
        />
        <GaugeCard
          label="CRONS ACTIVE"
          icon={<Cpu size={12} />}
          value={state?.crons.recently_active ?? 0}
          sub="< 2h"
          color="var(--color-primary)"
        />
      </div>

      {/* ── Warning panel + radar ───────────────────────────────────────── */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: 14,
          marginBottom: 14,
        }}
      >
        {/* Warning lights */}
        <div style={{ ...PANEL_STYLE, minHeight: 220 }}>
          <span style={PANEL_LABEL_STYLE}>WARNING PANEL · FINDINGS</span>
          {state && state.findings.total === 0 ? (
            <div style={{ textAlign: "center", padding: 30, color: "#10B981", fontFamily: "monospace" }}>
              ✓ ALL CLEAR
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 6, marginTop: 6 }}>
              {state?.findings.recent.slice(0, 6).map((f) => (
                <div
                  key={f.id}
                  style={{
                    padding: 8,
                    borderLeft: `3px solid ${SEV_COLORS[f.severity] ?? "#888"}`,
                    background: "rgba(255,255,255,0.02)",
                    borderRadius: 2,
                  }}
                >
                  <div style={{ fontSize: 11, color: "var(--color-bg)", fontWeight: 600 }}>{f.title}</div>
                  <div
                    style={{
                      fontSize: 9,
                      color: "#C4AA8A",
                      fontFamily: "monospace",
                      marginTop: 2,
                      letterSpacing: 1,
                    }}
                  >
                    [{f.severity.toUpperCase()}] {f.agent} · ×{f.occurrences}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* SIEM radar */}
        <div style={{ ...PANEL_STYLE, minHeight: 220 }}>
          <span style={PANEL_LABEL_STYLE}>SIEM RADAR · TOP IPs 24H</span>
          {state && state.security.top_ips.length === 0 ? (
            <div style={{ textAlign: "center", padding: 30, color: "#10B981", fontFamily: "monospace" }}>
              ✓ NO SUSPICIOUS IPs
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 4, marginTop: 6, fontFamily: "monospace", fontSize: 11 }}>
              {state?.security.top_ips.map((row) => (
                <div
                  key={row.ip}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    padding: "6px 10px",
                    background: "rgba(245,158,11,0.06)",
                    border: "1px solid rgba(245,158,11,0.15)",
                    borderRadius: 3,
                  }}
                >
                  <span style={{ color: "var(--color-bg)" }}>{row.ip}</span>
                  <span style={{ color: "var(--color-primary)", fontWeight: 700 }}>{row.count}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ── Event log + chat ─────────────────────────────────────────────── */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: 14,
        }}
      >
        {/* Event log (flight data recorder) */}
        <div style={{ ...PANEL_STYLE, minHeight: 320 }}>
          <span style={PANEL_LABEL_STYLE}>BLACK BOX · EVENT LOG</span>
          <div
            style={{
              marginTop: 8,
              maxHeight: 280,
              overflowY: "auto",
              fontFamily: "monospace",
              fontSize: 10,
              lineHeight: 1.7,
            }}
          >
            {state?.security.recent_events.map((e) => (
              <div key={e.id} style={{ display: "flex", gap: 8, padding: "2px 0" }}>
                <span style={{ color: "#78614E", minWidth: 70 }}>
                  {new Date(e.at).toLocaleTimeString("ro-RO", { hour12: false })}
                </span>
                <span style={{ color: SEV_COLORS[e.severity] ?? "#C4AA8A", minWidth: 60 }}>
                  [{e.severity.toUpperCase()}]
                </span>
                <span style={{ color: "var(--color-primary)", minWidth: 130 }}>{e.type}</span>
                <span style={{ color: "#C4AA8A" }}>{e.ip ?? "—"}</span>
              </div>
            ))}
            {(!state || state.security.recent_events.length === 0) && (
              <div style={{ color: "#78614E", padding: 12, textAlign: "center" }}>no events</div>
            )}
          </div>
        </div>

        {/* Cron status */}
        <div style={{ ...PANEL_STYLE, minHeight: 320 }}>
          <span style={PANEL_LABEL_STYLE}>AUTOPILOT · CRON STATUS</span>
          <div
            style={{
              marginTop: 8,
              maxHeight: 280,
              overflowY: "auto",
              fontFamily: "monospace",
              fontSize: 10,
              lineHeight: 1.7,
            }}
          >
            {state?.crons.last_runs.map((c, i) => (
              <div key={`${c.job}-${i}`} style={{ display: "flex", gap: 8, padding: "2px 0" }}>
                <span style={{ color: "#78614E", minWidth: 70 }}>
                  {new Date(c.ran_at).toLocaleTimeString("ro-RO", { hour12: false })}
                </span>
                <span style={{ color: "var(--color-primary)" }}>{c.job}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Assistant chat panel (fixed bottom) ──────────────────────────── */}
      <div
        style={{
          position: "fixed",
          bottom: 0,
          left: 0,
          right: 0,
          borderTop: "1px solid rgba(245,158,11,0.35)",
          background: "linear-gradient(180deg, rgba(10,8,7,0.6), rgba(10,8,7,0.98) 30%)",
          backdropFilter: "blur(10px)",
          padding: "12px 20px",
          zIndex: 50,
        }}
      >
        <div style={{ maxWidth: 1280, margin: "0 auto" }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              marginBottom: 8,
              fontSize: 9,
              color: "var(--color-primary)",
              letterSpacing: 2,
              fontFamily: "monospace",
            }}
          >
            <Shield size={10} /> COCKPIT ASSISTANT · HAIKU 4.5
          </div>
          {/* Messages (last 3 visible when collapsed) */}
          <div
            style={{
              maxHeight: 140,
              overflowY: "auto",
              fontSize: 12,
              lineHeight: 1.5,
              marginBottom: 8,
              padding: 8,
              background: "rgba(0,0,0,0.3)",
              border: "1px solid rgba(245,158,11,0.1)",
              borderRadius: 4,
            }}
          >
            {chatMessages.slice(-6).map((m, i) => (
              <div
                key={i}
                style={{
                  padding: "4px 0",
                  color: m.role === "user" ? "#F5D7A0" : "#C4AA8A",
                }}
              >
                <span
                  style={{
                    fontFamily: "monospace",
                    fontSize: 9,
                    color: "var(--color-primary)",
                    marginRight: 6,
                  }}
                >
                  {m.role === "user" ? "> YOU" : "> COCKPIT"}
                </span>
                {m.content}
              </div>
            ))}
            {chatBusy && (
              <div style={{ color: "var(--color-primary)", fontFamily: "monospace", fontSize: 10 }}>
                ▶ processing…
              </div>
            )}
            <div ref={chatEndRef} />
          </div>
          {/* Input */}
          <div style={{ display: "flex", gap: 8 }}>
            <input
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && sendChat()}
              placeholder="Întreabă despre platformă (ex: 'Există atacuri active?' sau 'Rulează backup acum')"
              disabled={chatBusy}
              style={{
                flex: 1,
                background: "rgba(0,0,0,0.5)",
                border: "1px solid rgba(245,158,11,0.3)",
                borderRadius: 4,
                padding: "10px 14px",
                color: "var(--color-bg)",
                fontSize: 13,
                fontFamily: "monospace",
                outline: "none",
              }}
            />
            <button
              onClick={sendChat}
              disabled={chatBusy || !chatInput.trim()}
              style={{
                padding: "10px 20px",
                background: "var(--color-primary)",
                color: "#1C1814",
                border: "none",
                borderRadius: 4,
                fontWeight: 800,
                fontSize: 11,
                letterSpacing: 2,
                cursor: chatBusy ? "not-allowed" : "pointer",
                display: "flex",
                alignItems: "center",
                gap: 6,
              }}
            >
              <Send size={12} /> SEND
            </button>
          </div>
          {/* Quick action chips */}
          <div style={{ display: "flex", gap: 6, marginTop: 8, flexWrap: "wrap" }}>
            {[
              "Există atacuri active acum?",
              "Rulează backup acum",
              "Generează raportul de azi",
              "Care sunt cele mai recente findings?",
              "Rulează toți agenții maintenance",
            ].map((q) => (
              <button
                key={q}
                onClick={() => {
                  setChatInput(q);
                }}
                style={{
                  padding: "4px 10px",
                  background: "rgba(245,158,11,0.08)",
                  border: "1px solid rgba(245,158,11,0.2)",
                  borderRadius: 100,
                  color: "var(--color-primary)",
                  fontSize: 10,
                  cursor: "pointer",
                  fontFamily: "monospace",
                  letterSpacing: 0.5,
                }}
              >
                <Play size={8} style={{ display: "inline", marginRight: 4 }} />
                {q}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Gauge card component ───────────────────────────────────────────────────

function GaugeCard({
  label,
  icon,
  value,
  sub,
  color,
}: {
  label: string;
  icon: React.ReactNode;
  value: number;
  sub: string;
  color: string;
}) {
  return (
    <div style={{ ...PANEL_STYLE, textAlign: "center", padding: "16px 12px" }}>
      <div
        style={{
          fontSize: 9,
          color: "var(--color-primary)",
          letterSpacing: 1.5,
          fontFamily: "monospace",
          marginBottom: 6,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: 4,
        }}
      >
        {icon}
        {label}
      </div>
      <div
        style={{
          fontSize: 34,
          fontWeight: 900,
          color,
          fontFamily: "monospace",
          lineHeight: 1,
          textShadow: `0 0 12px ${color}66`,
        }}
      >
        {value}
      </div>
      <div style={{ fontSize: 9, color: "#78614E", marginTop: 4, letterSpacing: 1 }}>{sub}</div>
    </div>
  );
}
