"use client";

import { useEffect, useState } from "react";
import { Zap, Edit3, Check, X, Loader2, RefreshCw } from "lucide-react";

const cardStyle = {
  backgroundColor: "#FFFCF7",
  border: "1px solid rgba(245,215,160,0.25)",
  boxShadow: "0 1px 3px rgba(120,97,78,0.08)",
};

const SQL = `CREATE TABLE IF NOT EXISTS admin_plan_config (
  plan_id TEXT PRIMARY KEY,
  tokens_month INTEGER,
  feature_flags JSONB DEFAULT '{}',
  updated_at TIMESTAMPTZ DEFAULT now()
);`;

interface PlanConfig {
  id: string;
  name: string;
  tokens_month: number;
  features: Record<string, boolean>;
}

function fmtTokens(n: number) {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + "M";
  if (n >= 1_000) return (n / 1_000).toFixed(0) + "K";
  return String(n);
}

export default function AdminTokensPanel() {
  const [plans, setPlans] = useState<PlanConfig[]>([]);
  const [tableExists, setTableExists] = useState(true);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [editing, setEditing] = useState<string | null>(null);
  const [editValue, setEditValue] = useState(0);
  const [saved, setSaved] = useState<string | null>(null);

  const fetch_ = async () => {
    setLoading(true);
    const res = await fetch("/api/admin/plan-config");
    const data = await res.json();
    if (!data.error) {
      setPlans(data.plans ?? []);
      setTableExists(data.table_exists ?? true);
    }
    setLoading(false);
  };

  useEffect(() => { fetch_(); }, []);

  const startEdit = (plan: PlanConfig) => {
    setEditing(plan.id);
    setEditValue(plan.tokens_month);
  };

  const handleSave = async (planId: string) => {
    setSaving(planId);
    const res = await fetch("/api/admin/plan-config", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ plan_id: planId, tokens_month: editValue }),
    });
    const data = await res.json();
    if (!data.error) {
      setPlans(p => p.map(pl => pl.id === planId ? { ...pl, tokens_month: editValue } : pl));
      setEditing(null);
      setSaved(planId);
      setTimeout(() => setSaved(null), 2000);
    }
    setSaving(null);
  };

  return (
    <div className="rounded-2xl p-6" style={cardStyle}>
      <div className="flex items-center justify-between mb-5">
        <div>
          <h2 className="text-xl font-bold" style={{ color: "#292524" }}>Token Allocation per Plan</h2>
          <p className="text-sm mt-0.5" style={{ color: "#A8967E" }}>Monthly token allowance included in each subscription</p>
        </div>
        <button type="button" onClick={fetch_} disabled={loading}
          className="p-1.5 rounded-lg" style={{ color: "#A8967E" }}>
          <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
        </button>
      </div>

      {!tableExists && (
        <div className="mb-4 rounded-xl px-4 py-3 text-xs" style={{ backgroundColor: "rgba(99,102,241,0.06)", color: "#6366F1", border: "1px solid rgba(99,102,241,0.15)" }}>
          <strong>Run this SQL in Supabase first:</strong>
          <code className="block mt-1 bg-white/50 rounded p-2 font-mono" style={{ color: "#292524" }}>{SQL}</code>
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-10"><Loader2 className="w-5 h-5 animate-spin" style={{ color: "#F59E0B" }} /></div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {plans.map(plan => (
            <div key={plan.id} className="rounded-xl p-4" style={{ backgroundColor: "#FFF8F0", border: "1px solid rgba(245,215,160,0.3)" }}>
              <p className="text-xs font-semibold mb-1" style={{ color: "#A8967E" }}>{plan.name}</p>

              {editing === plan.id ? (
                <div className="space-y-2">
                  <div className="flex items-center gap-1">
                    <input
                      type="number" min={0} step={1000}
                      value={editValue}
                      onChange={e => setEditValue(Number(e.target.value))}
                      className="w-full px-2 py-1.5 text-sm rounded-lg focus:outline-none"
                      style={{ border: "1px solid rgba(245,215,160,0.4)", backgroundColor: "#FFFCF7", color: "#292524" }}
                    />
                  </div>
                  <div className="flex gap-1.5">
                    <button type="button" onClick={() => handleSave(plan.id)} disabled={saving === plan.id}
                      className="flex-1 flex items-center justify-center gap-1 py-1.5 rounded-lg text-xs font-bold"
                      style={{ backgroundColor: "#F59E0B", color: "white" }}>
                      {saving === plan.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <Check className="w-3 h-3" />}
                      Save
                    </button>
                    <button type="button" onClick={() => setEditing(null)}
                      className="px-2 py-1.5 rounded-lg text-xs" style={{ color: "#A8967E" }}>
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <Zap className="w-3.5 h-3.5" style={{ color: "#3B82F6" }} />
                    <span className="text-lg font-bold" style={{ color: saved === plan.id ? "#16A34A" : "#292524" }}>
                      {fmtTokens(plan.tokens_month)}
                    </span>
                  </div>
                  <button type="button" onClick={() => startEdit(plan)}
                    className="p-1 rounded-lg" style={{ color: "#C4AA8A" }}>
                    <Edit3 className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      <p className="text-xs mt-4" style={{ color: "#C4AA8A" }}>
        Changes take effect on next login / token refresh. Free Trial tokens cannot be increased beyond plan limits.
      </p>
    </div>
  );
}
