"use client";

/**
 * Cockpit — Attitude Indicator (artificial horizon).
 *
 * Uses pure SVG + CSS 3D transforms instead of WebGL. This keeps the bundle
 * small, avoids global type pollution from three.js/r3f, and still gives a
 * genuinely 3D-looking instrument thanks to perspective + rotate3d.
 *
 * The horizon tilts based on the overall platform health score:
 *   score 100 → level
 *   score 60-85 → slight bank
 *   score < 60 → heavy bank
 *
 * Additionally, a soft animated sweep rotates around the inner ring to make
 * the instrument feel "alive".
 */

import { useMemo } from "react";

interface Props {
  /** 0-100 overall health score */
  score: number;
  /** "healthy" | "degraded" | "critical" */
  status: "healthy" | "degraded" | "critical";
}

export default function AttitudeIndicator3D({ score, status }: Props) {
  const { bank, pitch } = useMemo(() => {
    // Target tilt derived from score. 100 = 0deg, 0 = 45deg bank.
    const off = (100 - score) / 100;
    return {
      bank: off * 35, // degrees roll
      pitch: off * 20, // degrees pitch (pushes horizon down)
    };
  }, [score]);

  const ringColor = status === "healthy" ? "#10B981" : status === "degraded" ? "var(--color-primary)" : "#EF4444";
  const skyColor = status === "healthy" ? "#1E40AF" : status === "degraded" ? "#78350F" : "#450A0A";
  const groundColor = status === "healthy" ? "#065F46" : status === "degraded" ? "#78350F" : "#450A0A";

  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        position: "relative",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        perspective: 800,
      }}
    >
      <div
        style={{
          position: "relative",
          width: 220,
          height: 220,
          transformStyle: "preserve-3d",
          transform: `rotateX(12deg) rotateY(-4deg)`,
          transition: "transform 500ms ease-out",
        }}
      >
        {/* Outer bezel with glow */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            borderRadius: "50%",
            background: "radial-gradient(circle at 30% 30%, #2a1f15, #0a0605)",
            boxShadow:
              "inset 0 0 20px rgba(0,0,0,0.8), 0 0 40px rgba(245,158,11,0.15), 0 0 80px rgba(245,158,11,0.08)",
            border: "2px solid rgba(245,158,11,0.35)",
          }}
        />

        {/* Inner attitude ball — rotates based on bank/pitch */}
        <div
          style={{
            position: "absolute",
            inset: 14,
            borderRadius: "50%",
            overflow: "hidden",
            transform: `rotate(${bank}deg)`,
            transition: "transform 600ms cubic-bezier(0.2, 0.8, 0.3, 1)",
            boxShadow: "inset 0 0 30px rgba(0,0,0,0.6)",
          }}
        >
          {/* Sky half */}
          <div
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              right: 0,
              height: `${50 + pitch}%`,
              background: `linear-gradient(180deg, ${skyColor}, ${skyColor}cc)`,
              transition: "height 500ms ease-out",
            }}
          />
          {/* Ground half */}
          <div
            style={{
              position: "absolute",
              bottom: 0,
              left: 0,
              right: 0,
              height: `${50 - pitch}%`,
              background: `linear-gradient(0deg, ${groundColor}, ${groundColor}cc)`,
              transition: "height 500ms ease-out",
            }}
          />
          {/* Horizon line */}
          <div
            style={{
              position: "absolute",
              left: 0,
              right: 0,
              top: `${50 + pitch}%`,
              height: 2,
              background: ringColor,
              boxShadow: `0 0 6px ${ringColor}`,
              transition: "top 500ms ease-out",
            }}
          />
          {/* Pitch ladder (tick marks above & below the horizon) */}
          {[-20, -10, 10, 20].map((deg) => (
            <div
              key={deg}
              style={{
                position: "absolute",
                left: "35%",
                right: "35%",
                top: `${50 + pitch + deg}%`,
                height: 1,
                background: "rgba(255,255,255,0.3)",
              }}
            />
          ))}
        </div>

        {/* Center crosshair (stays aligned with aircraft, not horizon) */}
        <svg
          style={{ position: "absolute", inset: 0, pointerEvents: "none" }}
          viewBox="0 0 220 220"
        >
          <line x1="80" y1="110" x2="100" y2="110" stroke={ringColor} strokeWidth="3" />
          <line x1="120" y1="110" x2="140" y2="110" stroke={ringColor} strokeWidth="3" />
          <circle cx="110" cy="110" r="3" fill={ringColor} />
          <line x1="110" y1="100" x2="110" y2="120" stroke={ringColor} strokeWidth="2" />
        </svg>

        {/* Rotating sweep for "alive" feel */}
        <svg
          style={{
            position: "absolute",
            inset: 0,
            pointerEvents: "none",
            animation: "cockpit-spin 8s linear infinite",
          }}
          viewBox="0 0 220 220"
        >
          <defs>
            <linearGradient id="sweep-grad" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor={ringColor} stopOpacity="0" />
              <stop offset="100%" stopColor={ringColor} stopOpacity="0.4" />
            </linearGradient>
          </defs>
          <path
            d={`M 110 110 L 110 18 A 92 92 0 0 1 196 110 Z`}
            fill="url(#sweep-grad)"
          />
        </svg>

        {/* Score overlay */}
        <div
          style={{
            position: "absolute",
            top: "50%",
            left: "50%",
            transform: "translate(-50%, 32px)",
            textAlign: "center",
            pointerEvents: "none",
          }}
        >
          <div
            style={{
              fontSize: 38,
              fontWeight: 900,
              color: ringColor,
              fontFamily: "monospace",
              lineHeight: 1,
              textShadow: `0 0 12px ${ringColor}99, 0 2px 4px rgba(0,0,0,0.8)`,
            }}
          >
            {score}
          </div>
          <div
            style={{
              fontSize: 9,
              color: "#C4AA8A",
              letterSpacing: 2,
              textTransform: "uppercase",
              marginTop: 2,
            }}
          >
            {status}
          </div>
        </div>

        {/* Tick marks around outer bezel */}
        <svg style={{ position: "absolute", inset: 0, pointerEvents: "none" }} viewBox="0 0 220 220">
          {Array.from({ length: 24 }, (_, i) => {
            const angle = (i * 15 * Math.PI) / 180;
            const r1 = 108;
            const r2 = i % 2 === 0 ? 100 : 104;
            const x1 = 110 + Math.cos(angle) * r1;
            const y1 = 110 + Math.sin(angle) * r1;
            const x2 = 110 + Math.cos(angle) * r2;
            const y2 = 110 + Math.sin(angle) * r2;
            return (
              <line
                key={i}
                x1={x1}
                y1={y1}
                x2={x2}
                y2={y2}
                stroke="rgba(245,158,11,0.5)"
                strokeWidth={i % 2 === 0 ? 1.5 : 0.8}
              />
            );
          })}
        </svg>
      </div>

      <style jsx>{`
        @keyframes cockpit-spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
