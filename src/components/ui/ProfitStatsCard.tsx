"use client";

import { useEffect, useRef, useState } from "react";
import { Clock, DollarSign, TrendingUp } from "lucide-react";

// ── Business constants ────────────────────────────────────────────────────────
const MINUTES_PER_ACTION = 15;
const HOURLY_VALUE_USD   = 25;
const WORK_HOURS_PER_DAY = 8;

function calcImpact(actions: number) {
  const hoursSaved  = (actions * MINUTES_PER_ACTION) / 60;
  const moneySaved  = hoursSaved * HOURLY_VALUE_USD;
  const daysSaved   = hoursSaved / WORK_HOURS_PER_DAY;
  return { hoursSaved, moneySaved, daysSaved };
}

// ── Animated counter hook ─────────────────────────────────────────────────────
function useCounter(target: number, duration = 1200): number {
  const [value, setValue] = useState(0);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    if (target === 0) { setValue(0); return; }
    const start = performance.now();
    const step = (now: number) => {
      const progress = Math.min((now - start) / duration, 1);
      // Ease-out cubic
      const eased = 1 - Math.pow(1 - progress, 3);
      setValue(eased * target);
      if (progress < 1) rafRef.current = requestAnimationFrame(step);
    };
    rafRef.current = requestAnimationFrame(step);
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current); };
  }, [target, duration]);

  return value;
}

// ── Component ─────────────────────────────────────────────────────────────────
interface ProfitStatsCardProps {
  actionsCount: number;
}

export default function ProfitStatsCard({ actionsCount }: ProfitStatsCardProps) {
  const { hoursSaved, moneySaved, daysSaved } = calcImpact(actionsCount);

  const animHours = useCounter(hoursSaved);
  const animMoney = useCounter(moneySaved);
  const animDays  = useCounter(daysSaved);

  if (actionsCount === 0) return null;

  return (
    <div
      className="rounded-2xl p-6"
      style={{
        background: "linear-gradient(135deg, #FFFCF7 0%, #FFF8EE 100%)",
        border: "1px solid rgba(245,215,160,0.4)",
        boxShadow: "0 2px 16px rgba(120,97,78,0.08)",
      }}
    >
      {/* Header */}
      <div className="flex items-center gap-3 mb-5">
        <div
          className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
          style={{ background: "linear-gradient(135deg, #16A34A, #15803D)" }}
        >
          <TrendingUp className="w-4 h-4 text-white" />
        </div>
        <div>
          <h3 className="font-bold text-sm" style={{ color: "#292524" }}>
            Impactul AI în afacerea ta
          </h3>
          <p className="text-xs" style={{ color: "#A8967E" }}>Luna aceasta · {actionsCount} acțiuni premium folosite</p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4 mb-4">
        {/* Timp recuperat */}
        <div
          className="rounded-xl p-4"
          style={{ backgroundColor: "rgba(245,215,160,0.15)", border: "1px solid rgba(245,215,160,0.3)" }}
        >
          <div className="flex items-center gap-2 mb-2">
            <Clock className="w-4 h-4" style={{ color: "#F59E0B" }} />
            <span className="text-xs font-medium" style={{ color: "#78614E" }}>Timp recuperat</span>
          </div>
          <p className="text-2xl font-bold" style={{ color: "#292524" }}>
            {animHours.toFixed(1)}
            <span className="text-sm font-medium ml-1" style={{ color: "#A8967E" }}>ore</span>
          </p>
          <p className="text-xs mt-1" style={{ color: "#C4AA8A" }}>
            {actionsCount} × {MINUTES_PER_ACTION} min
          </p>
        </div>

        {/* Costuri economisite */}
        <div
          className="rounded-xl p-4"
          style={{ backgroundColor: "rgba(22,163,74,0.06)", border: "1px solid rgba(22,163,74,0.2)" }}
        >
          <div className="flex items-center gap-2 mb-2">
            <DollarSign className="w-4 h-4" style={{ color: "#16A34A" }} />
            <span className="text-xs font-medium" style={{ color: "#78614E" }}>Costuri economisite</span>
          </div>
          <p className="text-2xl font-bold" style={{ color: "#16A34A" }}>
            ${animMoney.toFixed(0)}
          </p>
          <p className="text-xs mt-1" style={{ color: "#C4AA8A" }}>
            la ${HOURLY_VALUE_USD}/oră muncă manuală
          </p>
        </div>
      </div>

      {/* Footer retention message */}
      <div
        className="rounded-xl px-4 py-3 flex items-center gap-2"
        style={{ backgroundColor: "rgba(22,163,74,0.06)", border: "1px solid rgba(22,163,74,0.15)" }}
      >
        <span className="text-base flex-shrink-0">🚀</span>
        <p className="text-xs" style={{ color: "#5C4A35" }}>
          Platforma a lucrat în locul tău echivalentul a{" "}
          <span className="font-bold" style={{ color: "#16A34A" }}>
            {animDays.toFixed(1)} zile
          </span>{" "}
          de muncă full-time luna aceasta.
        </p>
      </div>
    </div>
  );
}
