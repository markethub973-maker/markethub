"use client";

import { TrendingUp, Users, Mail, Target } from "lucide-react";

interface Props {
  mrr: number;
  target: number;
  progress: number;
  offerSales: number;
  state: {
    total_users: number;
    paying_users: number;
    trial_users: number;
    leads_total: number;
    leads_new_7d: number;
    new_signups_7d: number;
  } | null;
}

export default function BrainMetricTiles({ mrr, target, progress, state, offerSales }: Props) {
  const tiles = [
    {
      icon: Target,
      label: "MRR Progress",
      value: `$${mrr}`,
      sub: `${progress}% of $${target} goal`,
      accent: progress >= 50 ? "#10B981" : "#F59E0B",
    },
    {
      icon: TrendingUp,
      label: "Accelerator Sales",
      value: `${offerSales}`,
      sub: "this week",
      accent: "#F59E0B",
    },
    {
      icon: Users,
      label: "Users",
      value: `${state?.total_users ?? 0}`,
      sub: `${state?.paying_users ?? 0} paying · ${state?.trial_users ?? 0} trial`,
      accent: "#3B82F6",
    },
    {
      icon: Mail,
      label: "Leads 7d",
      value: `${state?.leads_new_7d ?? 0}`,
      sub: `${state?.leads_total ?? 0} total pipeline`,
      accent: "#A855F7",
    },
  ];
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
      {tiles.map((t) => {
        const I = t.icon;
        return (
          <div
            key={t.label}
            className="p-4 rounded-xl"
            style={{ backgroundColor: "#1A1A24", border: "1px solid rgba(255,255,255,0.08)" }}
          >
            <div className="flex items-center gap-2 mb-2">
              <I className="w-4 h-4" style={{ color: t.accent }} />
              <span className="text-xs uppercase tracking-wider" style={{ color: "#888" }}>
                {t.label}
              </span>
            </div>
            <p className="text-2xl font-bold">{t.value}</p>
            <p className="text-xs mt-1" style={{ color: "#777" }}>
              {t.sub}
            </p>
          </div>
        );
      })}
    </div>
  );
}
