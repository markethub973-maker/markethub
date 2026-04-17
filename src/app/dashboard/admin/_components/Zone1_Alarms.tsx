"use client";

import GlassCard from "@/components/ui/GlassCard";
import { getTrackedServices, type TrackedService } from "@/lib/services-tracker";

const STATUS_COLORS = {
  ok: { val: "#6ee7b7", bar: "#10b981,#6ee7b7", badge: "rgba(16,185,129,0.12)", bc: "rgba(16,185,129,0.22)", tc: "#6ee7b7" },
  warning: { val: "#fbbf24", bar: "#f59e0b,#fbbf24", badge: "rgba(245,158,11,0.12)", bc: "rgba(245,158,11,0.25)", tc: "#fbbf24" },
  critical: { val: "#fca5a5", bar: "#ef4444,#fca5a5", badge: "rgba(239,68,68,0.12)", bc: "rgba(239,68,68,0.25)", tc: "#fca5a5" },
};

function AlarmCard({ svc }: { svc: TrackedService }) {
  const c = STATUS_COLORS[svc.status];
  return (
    <GlassCard accent={svc.status === "warning" || svc.status === "critical"} padding="p-4">
      <div style={{ fontSize: 20, marginBottom: 8 }}>{svc.icon}</div>
      <div style={{ fontSize: 10, fontWeight: 700, color: "rgba(255,255,255,0.8)", marginBottom: 3 }}>{svc.name}</div>
      <div style={{ fontSize: 22, fontWeight: 800, letterSpacing: "-0.02em", color: c.val, marginBottom: 3 }}>{svc.cost}</div>
      <div style={{ fontSize: 9, color: "rgba(255,255,255,0.35)", lineHeight: 1.5 }}>{svc.usageLabel}</div>
      {svc.usagePercent !== null && (
        <div className="alarm-gauge">
          <div className="alarm-gauge-fill" style={{ width: `${svc.usagePercent}%`, background: `linear-gradient(90deg, ${c.bar})` }} />
        </div>
      )}
      <div style={{
        display: "inline-flex", alignItems: "center", gap: 4,
        fontSize: 8, fontWeight: 700, padding: "3px 8px", borderRadius: 10, marginTop: 8,
        background: c.badge, color: c.tc, border: `1px solid ${c.bc}`,
      }}>
        {svc.status === "ok" ? "✓ OK" : svc.status === "warning" ? "⏰ " + svc.statusLabel : "🚨 " + svc.statusLabel}
      </div>
    </GlassCard>
  );
}

export default function Zone1_Alarms() {
  const services = getTrackedServices();
  return (
    <div>
      <div className="zone-label">🔴 Zone 1 — Alarme & Servicii de Plată</div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 10 }}>
        {services.map((svc) => <AlarmCard key={svc.id} svc={svc} />)}
      </div>
    </div>
  );
}
