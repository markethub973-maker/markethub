"use client";

import { useSecurityStore } from "@/lib/security-monitor";
import { getServiceAlertCount } from "@/lib/services-tracker";

export default function AdminTopBar() {
  const { isUnderAttack, triggerThreat } = useSecurityStore();
  const serviceAlerts = getServiceAlertCount();

  return (
    <div style={{
      display: "flex", alignItems: "center", justifyContent: "space-between",
      marginBottom: 16, position: "relative", zIndex: 10,
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 11 }}>
        <div style={{
          width: 32, height: 32, flexShrink: 0,
          background: "linear-gradient(135deg, var(--accent, #f59e0b), color-mix(in srgb, var(--accent, #f59e0b) 70%, #000))",
          borderRadius: 9, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16,
          boxShadow: "0 4px 14px rgba(245,158,11,0.45), inset 0 1px 0 rgba(255,255,255,0.3)",
        }}>⚡</div>
        <div>
          <div style={{ fontSize: 15, fontWeight: 700, color: "rgba(255,255,255,0.95)", letterSpacing: "-0.02em" }}>
            Admin Command Center
          </div>
          <div style={{ fontSize: 9, color: "rgba(245,158,11,0.65)", letterSpacing: "0.1em", textTransform: "uppercase", marginTop: 1 }}>
            MarketHub Pro — Priority Control
          </div>
        </div>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
        {isUnderAttack && (
          <div className="status-pill status-pill-red">
            <div className="dot-pulse dot-pulse-red dot-pulse-fast" />THREAT DETECTED
          </div>
        )}
        {serviceAlerts > 0 && (
          <div className="status-pill status-pill-amber">
            <div className="dot-pulse dot-pulse-amber" />{serviceAlerts} SERVICE{serviceAlerts > 1 ? "S" : ""} DUE
          </div>
        )}
        {!isUnderAttack && (
          <div className="status-pill status-pill-green">
            <div className="dot-pulse dot-pulse-green" />SYSTEMS ONLINE
          </div>
        )}
        {process.env.NODE_ENV === "development" && (
          <button onClick={() => triggerThreat("ddos")} className="btn-liquid-secondary" style={{ padding: "5px 12px", fontSize: 9, borderRadius: 8, fontWeight: 700 }}>
            ⚙ Test Attack
          </button>
        )}
      </div>
    </div>
  );
}
