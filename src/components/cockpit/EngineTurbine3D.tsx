"use client";

/**
 * Cockpit — Engine turbine indicator.
 *
 * SVG + CSS animation. A jet-engine-style fan whose RPM scales with load
 * and whose blade color tracks health. No WebGL — pure CSS transforms with
 * perspective to give it a 3D feel.
 */

import { useMemo } from "react";

interface Props {
  /** 0-1 relative load */
  load: number;
  /** Color state */
  status: "healthy" | "degraded" | "critical";
}

export default function EngineTurbine3D({ load, status }: Props) {
  const color = status === "healthy" ? "#10B981" : status === "degraded" ? "var(--color-primary)" : "#EF4444";
  // Spin duration: idle 8s, max 0.6s — inverse of load
  const spinDuration = useMemo(() => Math.max(0.6, 8 - load * 7.4), [load]);

  const blades = 12;

  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        perspective: 900,
      }}
    >
      <div
        style={{
          position: "relative",
          width: 220,
          height: 220,
          transformStyle: "preserve-3d",
          transform: "rotateX(16deg)",
        }}
      >
        {/* Outer cowl */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            borderRadius: "50%",
            background: "radial-gradient(circle at 30% 30%, #2a1f15, #0a0605)",
            border: "2px solid rgba(245,158,11,0.35)",
            boxShadow:
              "inset 0 0 40px rgba(0,0,0,0.8), 0 0 30px rgba(245,158,11,0.15)",
          }}
        />

        {/* Stator ring */}
        <div
          style={{
            position: "absolute",
            inset: 18,
            borderRadius: "50%",
            border: `1px solid ${color}44`,
            boxShadow: `inset 0 0 20px ${color}33`,
          }}
        />

        {/* Rotating blades */}
        <svg
          style={{
            position: "absolute",
            inset: 0,
            animation: `cockpit-turbine ${spinDuration}s linear infinite`,
            transition: "animation-duration 500ms ease-out",
          }}
          viewBox="0 0 220 220"
        >
          <defs>
            <linearGradient id="blade-grad" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor={color} stopOpacity="0.2" />
              <stop offset="50%" stopColor={color} stopOpacity="0.9" />
              <stop offset="100%" stopColor={color} stopOpacity="0.4" />
            </linearGradient>
          </defs>
          {Array.from({ length: blades }, (_, i) => {
            const angle = (i * 360) / blades;
            return (
              <g key={i} transform={`rotate(${angle} 110 110)`}>
                <rect
                  x="110"
                  y="44"
                  width="4"
                  height="56"
                  rx="2"
                  fill="url(#blade-grad)"
                />
              </g>
            );
          })}
          {/* Center hub */}
          <circle cx="110" cy="110" r="14" fill={color} opacity="0.9" />
          <circle cx="110" cy="110" r="6" fill="#0a0605" />
        </svg>

        {/* Heat shimmer ring (static) */}
        <div
          style={{
            position: "absolute",
            inset: -6,
            borderRadius: "50%",
            boxShadow: `0 0 30px ${color}55, 0 0 80px ${color}22`,
            pointerEvents: "none",
          }}
        />
      </div>

      <style jsx>{`
        @keyframes cockpit-turbine {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
