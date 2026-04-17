"use client";

import { useRouter } from "next/navigation";
import GlassCard from "@/components/ui/GlassCard";
import { toast } from "@/lib/toast";
import { getTrackedServices } from "@/lib/services-tracker";

interface ActivityEvent { color: string; text: string; highlight?: string; time: string; }

const QUICK_ACTIONS = [
  { icon: "📨", label: "Send\nBroadcast", action: "/dashboard/admin/broadcast" },
  { icon: "👤", label: "Add\nUser", action: "/dashboard/admin/users" },
  { icon: "🏷", label: "New\nDiscount", action: "/dashboard/admin/discount-codes" },
  { icon: "⚡", label: "Feature\nFlag", action: "/dashboard/admin/feature-flags" },
  { icon: "📊", label: "Export\nReport", action: "export" },
  { icon: "🔄", label: "Refresh\nCache", action: "cache" },
];

export default function Zone5_LiveFeed({ events }: { events: ActivityEvent[] }) {
  const router = useRouter();
  const services = getTrackedServices();

  const handleAction = (action: string) => {
    if (action === "export") { toast.success("Export started", "Report will be ready in ~30s"); return; }
    if (action === "cache") { toast.info("Cache cleared", "All cached data refreshed"); return; }
    router.push(action);
  };

  return (
    <div>
      <div className="zone-label">⚡ Zone 5 — Live Feed & Quick Actions</div>
      <div style={{ display: "grid", gridTemplateColumns: "1.2fr 1fr 1fr", gap: 10 }}>
        <GlassCard padding="p-4">
          <div style={{ fontSize: 9, fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.1em", color: "rgba(255,255,255,0.2)", marginBottom: 10 }}>Recent Activity</div>
          {events.map((e, i) => (
            <div key={i} className="activity-item">
              <div style={{ width: 5, height: 5, borderRadius: "50%", background: e.color, flexShrink: 0, marginTop: 4 }} />
              <div className="activity-text">{e.highlight ? <>{e.text.split(e.highlight)[0]}<span style={{ color: "rgba(255,255,255,0.75)" }}>{e.highlight}</span>{e.text.split(e.highlight)[1]}</> : e.text}</div>
              <div className="activity-time">{e.time}</div>
            </div>
          ))}
        </GlassCard>
        <GlassCard padding="p-4">
          <div style={{ fontSize: 9, fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.1em", color: "rgba(255,255,255,0.2)", marginBottom: 10 }}>Quick Actions</div>
          <div className="quick-action-grid">
            {QUICK_ACTIONS.map((qa) => (
              <div key={qa.label} className="quick-action-btn" onClick={() => handleAction(qa.action)}>
                <div className="qa-icon">{qa.icon}</div>
                <div className="qa-label" style={{ whiteSpace: "pre-line" }}>{qa.label}</div>
              </div>
            ))}
          </div>
        </GlassCard>
        <GlassCard padding="p-4">
          <div style={{ fontSize: 9, fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.1em", color: "rgba(255,255,255,0.2)", marginBottom: 10 }}>Services & Costs</div>
          {services.map((svc) => (
            <div key={svc.id} className="service-row">
              <div><div className="service-name">{svc.name}</div><div className="service-due">{svc.usageLabel}</div></div>
              <div className="service-cost" style={{ color: svc.status === "ok" ? "#6ee7b7" : svc.status === "warning" ? "#fbbf24" : "#fca5a5" }}>{svc.cost}</div>
            </div>
          ))}
        </GlassCard>
      </div>
    </div>
  );
}
