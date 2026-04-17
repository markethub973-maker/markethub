"use client";

import { type ReactNode } from "react";

interface GlassChartProps {
  title: string;
  subtitle?: string;
  trend?: string;
  trendUp?: boolean;
  children: ReactNode;
  height?: number;
}

export default function GlassChart({
  title,
  subtitle,
  trend,
  trendUp,
  children,
  height = 220,
}: GlassChartProps) {
  return (
    <div
      style={{
        position: "relative",
        borderRadius: 16,
        overflow: "hidden",
        isolation: "isolate",
      }}
    >
      <div
        style={{
          position: "absolute",
          inset: 0,
          zIndex: 0,
          borderRadius: "inherit",
          backdropFilter: "blur(20px) saturate(180%)",
          WebkitBackdropFilter: "blur(20px) saturate(180%)",
          filter: "url(#glass-distortion)",
        }}
      />
      <div
        style={{
          position: "absolute",
          inset: 0,
          zIndex: 1,
          borderRadius: "inherit",
          background: "rgba(255,255,255,0.05)",
          border: "1px solid rgba(255,255,255,0.1)",
        }}
      />
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          height: "45%",
          zIndex: 2,
          borderRadius: "16px 16px 60% 60%/16px 16px 28px 28px",
          background: "linear-gradient(180deg,rgba(255,255,255,0.08) 0%,transparent 100%)",
          pointerEvents: "none",
        }}
      />
      <div style={{ position: "relative", zIndex: 3, padding: "16px 20px" }}>
        <div
          style={{
            display: "flex",
            alignItems: "flex-start",
            justifyContent: "space-between",
            marginBottom: 16,
          }}
        >
          <div>
            <div style={{ fontSize: 13, fontWeight: 600, color: "rgba(255,255,255,0.85)" }}>{title}</div>
            {subtitle && (
              <div style={{ fontSize: 11, color: "rgba(255,255,255,0.35)", marginTop: 2 }}>{subtitle}</div>
            )}
          </div>
          {trend && (
            <span
              style={{
                fontSize: 12,
                fontWeight: 700,
                padding: "3px 10px",
                borderRadius: 20,
                background: trendUp ? "rgba(16,185,129,0.12)" : "rgba(239,68,68,0.12)",
                color: trendUp ? "#6ee7b7" : "#fca5a5",
                border: `1px solid ${trendUp ? "rgba(16,185,129,0.2)" : "rgba(239,68,68,0.2)"}`,
              }}
            >
              {trendUp ? "↑" : "↓"} {trend}
            </span>
          )}
        </div>
        <div style={{ height }}>{children}</div>
      </div>
    </div>
  );
}
