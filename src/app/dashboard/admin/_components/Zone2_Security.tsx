"use client";

import GlassCard from "@/components/ui/GlassCard";
import { useSecurityStore } from "@/lib/security-monitor";

const THREAT_ICON_BG: Record<string, string> = { clean: "rgba(16,185,129,0.12)", warning: "rgba(245,158,11,0.12)", alert: "rgba(239,68,68,0.15)", blocked: "rgba(16,185,129,0.12)" };
const THREAT_BADGE_CLASS: Record<string, string> = { clean: "threat-clean", warning: "threat-warn", alert: "threat-alert", blocked: "threat-clean" };
const THREAT_BADGE_LABEL: Record<string, string> = { clean: "CLEAN", warning: "REVIEW", alert: "ATTACK!", blocked: "BLOCKED" };
const AGENT_STATE_CLASS: Record<string, string> = { active: "agent-active", standby: "agent-standby", triggered: "agent-triggered" };
const AGENT_STATE_LABEL: Record<string, string> = { active: "ACTIVE", standby: "STANDBY", triggered: "TRIGGERED" };
const AGENT_DOT_COLOR: Record<string, string> = { active: "#10b981", standby: "#93c5fd", triggered: "#ef4444" };

export default function Zone2_Security() {
  const { threats, agents, triggerThreat } = useSecurityStore();
  return (
    <div>
      <div className="zone-label">🛡 Zone 2 — Securitate & Agenți</div>
      <div style={{ display: "grid", gridTemplateColumns: "1.2fr 1fr", gap: 10 }}>
        <GlassCard padding="p-4">
          <div style={{ fontSize: 9, fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.1em", color: "rgba(255,255,255,0.25)", marginBottom: 12 }}>Threat Monitor — Live</div>
          {threats.map((t) => (
            <div key={t.id} className="threat-item" onClick={() => t.level === "clean" && triggerThreat(t.id)} style={{ cursor: t.level === "clean" ? "pointer" : "default" }}>
              <div className="threat-icon-box" style={{ background: THREAT_ICON_BG[t.level] }}>{t.icon}</div>
              <div className="threat-label">{t.name}<span className="threat-sublabel">{t.description}</span></div>
              <div className={`threat-badge ${THREAT_BADGE_CLASS[t.level]}`}>{THREAT_BADGE_LABEL[t.level]}</div>
            </div>
          ))}
        </GlassCard>
        <GlassCard padding="p-4">
          <div style={{ fontSize: 9, fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.1em", color: "rgba(255,255,255,0.25)", marginBottom: 12 }}>Security Agents — Status</div>
          {agents.map((a) => (
            <div key={a.id} className="agent-item">
              <div style={{ width: 8, height: 8, borderRadius: "50%", background: AGENT_DOT_COLOR[a.state], flexShrink: 0, transition: "background 0.3s" }} />
              <div style={{ flex: 1 }}><div className="agent-name">{a.name}</div><div className="agent-role">{a.role}</div></div>
              <div className={`agent-state ${AGENT_STATE_CLASS[a.state]}`}>{AGENT_STATE_LABEL[a.state]}</div>
            </div>
          ))}
          <div style={{ marginTop: 12, paddingTop: 10, borderTop: "1px solid rgba(255,255,255,0.05)", fontSize: 9, color: "rgba(255,255,255,0.2)" }}>
            Apasă pe un threat CLEAN pentru a simula un atac
          </div>
        </GlassCard>
      </div>
    </div>
  );
}
