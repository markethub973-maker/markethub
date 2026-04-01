"use client";

import { useEffect, useState } from "react";
import { Loader2, RefreshCw, Check } from "lucide-react";

const cardStyle = {
  backgroundColor: "#FFFCF7",
  border: "1px solid rgba(245,215,160,0.25)",
  boxShadow: "0 1px 3px rgba(120,97,78,0.08)",
};

const FLAG_LABELS: Record<string, string> = {
  has_calendar:         "Calendar",
  has_tiktok:           "TikTok",
  has_api_access:       "API Access",
  has_white_label:      "White Label",
  has_priority_support: "Priority Support",
};
const FLAGS = Object.keys(FLAG_LABELS);

interface PlanConfig {
  id: string;
  name: string;
  tokens_month: number;
  features: Record<string, boolean>;
}

function Toggle({ on, onChange }: { on: boolean; onChange: (v: boolean) => void }) {
  return (
    <button type="button" role="switch" aria-checked={on} onClick={() => onChange(!on)}
      className="w-9 h-5 rounded-full relative transition-colors flex-shrink-0"
      style={{ backgroundColor: on ? "#F59E0B" : "rgba(196,170,138,0.3)" }}>
      <span className="absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform"
        style={{ transform: on ? "translateX(18px)" : "translateX(2px)" }} />
    </button>
  );
}

export default function AdminFeatureFlagsPanel() {
  const [plans, setPlans] = useState<PlanConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [saved, setSaved] = useState<string | null>(null);
  const [dirty, setDirty] = useState<Set<string>>(new Set());

  const fetch_ = async () => {
    setLoading(true);
    const res = await fetch("/api/admin/plan-config");
    const data = await res.json();
    if (!data.error) setPlans(data.plans ?? []);
    setLoading(false);
    setDirty(new Set());
  };

  useEffect(() => { fetch_(); }, []);

  const toggle = (planId: string, flag: string, value: boolean) => {
    setPlans(p => p.map(pl => pl.id === planId ? { ...pl, features: { ...pl.features, [flag]: value } } : pl));
    setDirty(d => new Set([...d, planId]));
  };

  const savePlan = async (plan: PlanConfig) => {
    setSaving(plan.id);
    await fetch("/api/admin/plan-config", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ plan_id: plan.id, feature_flags: plan.features }),
    });
    setSaving(null);
    setSaved(plan.id);
    setDirty(d => { const n = new Set(d); n.delete(plan.id); return n; });
    setTimeout(() => setSaved(null), 2000);
  };

  return (
    <div className="rounded-2xl p-6" style={cardStyle}>
      <div className="flex items-center justify-between mb-5">
        <div>
          <h2 className="text-xl font-bold" style={{ color: "#292524" }}>Feature Flags per Plan</h2>
          <p className="text-sm mt-0.5" style={{ color: "#A8967E" }}>Toggle which features are available on each plan</p>
        </div>
        <button type="button" onClick={fetch_} disabled={loading}
          className="p-1.5 rounded-lg" style={{ color: "#A8967E" }}>
          <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center py-10"><Loader2 className="w-5 h-5 animate-spin" style={{ color: "#F59E0B" }} /></div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr>
                <th className="text-left py-2 pr-4 text-xs font-semibold" style={{ color: "#A8967E" }}>Feature</th>
                {plans.map(plan => (
                  <th key={plan.id} className="text-center py-2 px-3 text-xs font-semibold min-w-[90px]" style={{ color: "#292524" }}>
                    {plan.name}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {FLAGS.map((flag, i) => (
                <tr key={flag} style={{ backgroundColor: i % 2 === 0 ? "rgba(245,215,160,0.05)" : "transparent" }}>
                  <td className="py-2.5 pr-4 text-xs font-medium whitespace-nowrap" style={{ color: "#78614E" }}>
                    {FLAG_LABELS[flag]}
                  </td>
                  {plans.map(plan => (
                    <td key={plan.id} className="py-2.5 px-3 text-center">
                      <div className="flex justify-center">
                        <Toggle
                          on={plan.features[flag] ?? false}
                          onChange={v => toggle(plan.id, flag, v)}
                        />
                      </div>
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>

          {/* Save buttons per column */}
          <div className="flex mt-4 gap-0">
            <div className="pr-4 min-w-[120px]" />
            {plans.map(plan => (
              <div key={plan.id} className="flex justify-center px-3 min-w-[90px]">
                {dirty.has(plan.id) ? (
                  <button type="button" onClick={() => savePlan(plan)} disabled={saving === plan.id}
                    className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold"
                    style={{ backgroundColor: "#F59E0B", color: "white" }}>
                    {saving === plan.id ? <Loader2 className="w-3 h-3 animate-spin" /> : null}
                    Save
                  </button>
                ) : saved === plan.id ? (
                  <span className="flex items-center gap-1 text-xs font-semibold" style={{ color: "#16A34A" }}>
                    <Check className="w-3 h-3" />Saved
                  </span>
                ) : null}
              </div>
            ))}
          </div>
        </div>
      )}

      <p className="text-xs mt-4" style={{ color: "#C4AA8A" }}>
        Feature flag changes apply at next user session. Save each column individually after making changes.
      </p>
    </div>
  );
}
