"use client";

import GlassCard from "@/components/ui/GlassCard";

interface KPIData {
  totalUsers: number;
  revenue: number;
  activePlans: number;
  supportTickets: number;
  apiHealth: number;
  aiCreditsUsed: number;
  emailsSent: number;
}

export default function Zone3_KPIs({ data }: { data: KPIData }) {
  const kpis = [
    { label: "Total Users", value: data.totalUsers.toLocaleString(), trend: "+12%", trendUp: true, fill: 74, gradient: "#f59e0b,#fbbf24", color: "#fbbf24" },
    { label: "Revenue / mo", value: `$${data.revenue.toLocaleString()}`, trend: "+8%", trendUp: true, fill: 58, gradient: "#10b981,#6ee7b7", color: "#6ee7b7" },
    { label: "Active Plans", value: data.activePlans.toLocaleString(), trend: "+5%", trendUp: true, fill: 42, gradient: "#8b5cf6,#c4b5fd", color: "#c4b5fd" },
    { label: "Support Tickets", value: String(data.supportTickets), trend: `${data.supportTickets} open`, trendUp: false, fill: data.supportTickets * 10, gradient: "#3b82f6,#93c5fd", color: "#93c5fd" },
  ];
  const meters = [
    { label: "API Health", value: `${data.apiHealth}%`, fill: data.apiHealth, gradient: "#10b981,#6ee7b7", sub: "Uptime last 30 days" },
    { label: "AI Credits Used", value: `${data.aiCreditsUsed}%`, fill: data.aiCreditsUsed, gradient: "#f59e0b,#fbbf24", sub: "Monthly Anthropic quota" },
    { label: "Emails Sent", value: data.emailsSent.toLocaleString(), fill: Math.round((data.emailsSent / 6000) * 100), gradient: "#8b5cf6,#c4b5fd", sub: "Via Resend this month" },
  ];

  return (
    <div>
      <div className="zone-label">📊 Zone 3 — Business KPIs</div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4,minmax(0,1fr))", gap: 10, marginBottom: 10 }}>
        {kpis.map((k) => (
          <GlassCard key={k.label} padding="p-3">
            <div style={{ fontSize: 9, textTransform: "uppercase", letterSpacing: "0.1em", color: "rgba(255,255,255,0.3)", marginBottom: 3 }}>{k.label}</div>
            <div style={{ fontSize: 24, fontWeight: 800, letterSpacing: "-0.03em", color: k.color, lineHeight: 1 }}>{k.value}</div>
            <div style={{ fontSize: 9, marginTop: 3, color: k.trendUp ? "#6ee7b7" : "#fbbf24" }}>{k.trendUp ? "▲" : "▼"} {k.trend}</div>
            <div className="alarm-gauge"><div className="alarm-gauge-fill" style={{ width: `${k.fill}%`, background: `linear-gradient(90deg,${k.gradient})` }} /></div>
          </GlassCard>
        ))}
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3,minmax(0,1fr))", gap: 10 }}>
        {meters.map((m) => (
          <GlassCard key={m.label} padding="p-3">
            <div style={{ fontSize: 9, textTransform: "uppercase", letterSpacing: "0.1em", color: "rgba(255,255,255,0.3)", marginBottom: 3 }}>{m.label}</div>
            <div style={{ fontSize: 18, fontWeight: 800, color: "rgba(255,255,255,0.9)" }}>{m.value}</div>
            <div className="sys-meter-bar"><div className="sys-meter-fill" style={{ width: `${m.fill}%`, background: `linear-gradient(90deg,${m.gradient})` }} /></div>
            <div style={{ fontSize: 8, marginTop: 4, color: "rgba(255,255,255,0.25)" }}>{m.sub}</div>
          </GlassCard>
        ))}
      </div>
    </div>
  );
}
