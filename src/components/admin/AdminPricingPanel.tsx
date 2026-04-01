"use client";

import { useEffect, useState } from "react";
import { Database, RefreshCw, Check, Loader2, Edit3, X, AlertTriangle } from "lucide-react";

const SQL_MIGRATION = `-- Run once in Supabase → SQL Editor
CREATE TABLE IF NOT EXISTS admin_plan_config (
  plan_id TEXT PRIMARY KEY,
  price NUMERIC,
  tokens_month INTEGER,
  feature_flags JSONB DEFAULT '{}',
  updated_at TIMESTAMPTZ DEFAULT now()
);`;

interface Plan {
  id: string;
  name: string;
  price: number;
  period: string;
}

export default function AdminPricingPanel() {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [editingPlan, setEditingPlan] = useState<string | null>(null);
  const [editingPrice, setEditingPrice] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [dbConnected, setDbConnected] = useState<boolean | null>(null);
  const [error, setError] = useState("");
  const [savedPlan, setSavedPlan] = useState<string | null>(null);

  const fetchPrices = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/admin/pricing");
      const data = await res.json();
      if (data.success) {
        setPlans(data.plans);
        setDbConnected(data.db_connected ?? false);
      } else {
        setError(data.error || "Failed to load plans");
      }
    } catch {
      setError("Network error");
    }
    setLoading(false);
  };

  useEffect(() => { fetchPrices(); }, []);

  const startEdit = (plan: Plan) => {
    setEditingPlan(plan.id);
    setEditingPrice(plan.price);
    setError("");
    setSavedPlan(null);
  };

  const handleSave = async () => {
    if (!editingPlan) return;
    if (editingPlan === "free_test" && editingPrice !== 0) {
      setError("Free Trial must stay at $0");
      return;
    }
    if (editingPrice < 0) { setError("Price cannot be negative"); return; }

    setSaving(true);
    setError("");
    try {
      const res = await fetch("/api/admin/pricing", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan: editingPlan, price: editingPrice }),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Failed to save");
        if (data.db_error) setDbConnected(false);
        setSaving(false);
        return;
      }

      setPlans(p => p.map(pl => pl.id === editingPlan ? { ...pl, price: editingPrice } : pl));
      setSavedPlan(editingPlan);
      setEditingPlan(null);
      setDbConnected(true);
      setTimeout(() => setSavedPlan(null), 3000);
    } catch {
      setError("Network error");
    }
    setSaving(false);
  };

  return (
    <div className="rounded-2xl p-6 space-y-5"
      style={{ backgroundColor: "#FFFCF7", border: "1px solid rgba(245,215,160,0.25)", boxShadow: "0 1px 3px rgba(120,97,78,0.08)" }}>

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold" style={{ color: "#292524" }}>Pricing Management</h2>
          <p className="text-sm mt-0.5" style={{ color: "#A8967E" }}>Subscription prices saved directly to Supabase</p>
        </div>
        <div className="flex items-center gap-2">
          {/* DB connection badge */}
          {dbConnected !== null && (
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold"
              style={{
                backgroundColor: dbConnected ? "rgba(16,185,129,0.1)" : "rgba(239,68,68,0.08)",
                color: dbConnected ? "#059669" : "#DC2626",
                border: `1px solid ${dbConnected ? "rgba(16,185,129,0.25)" : "rgba(239,68,68,0.2)"}`,
              }}>
              <Database className="w-3 h-3" />
              {dbConnected ? "Supabase connected" : "DB not ready"}
            </div>
          )}
          <button type="button" onClick={fetchPrices} disabled={loading}
            className="p-1.5 rounded-lg" style={{ color: "#A8967E" }} title="Refresh">
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          </button>
        </div>
      </div>

      {/* SQL Migration notice */}
      {dbConnected === false && (
        <div className="rounded-xl px-4 py-3 text-xs space-y-2"
          style={{ backgroundColor: "rgba(99,102,241,0.06)", color: "#6366F1", border: "1px solid rgba(99,102,241,0.15)" }}>
          <div className="flex items-center gap-2 font-bold">
            <AlertTriangle className="w-3.5 h-3.5" />
            Table missing — run this SQL in Supabase → SQL Editor, then refresh:
          </div>
          <code className="block bg-white/60 rounded p-2 font-mono text-[11px] whitespace-pre" style={{ color: "#292524" }}>
            {SQL_MIGRATION}
          </code>
        </div>
      )}

      {/* Error */}
      {error && (
        <p className="text-xs px-3 py-2 rounded-lg font-semibold"
          style={{ backgroundColor: "rgba(239,68,68,0.08)", color: "#DC2626", border: "1px solid rgba(239,68,68,0.15)" }}>
          {error}
        </p>
      )}

      {/* Plans grid */}
      {loading ? (
        <div className="flex justify-center py-10">
          <Loader2 className="w-5 h-5 animate-spin" style={{ color: "#F59E0B" }} />
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {plans.map(plan => {
            const isFree = plan.id === "free_test";
            const justSaved = savedPlan === plan.id;
            return (
              <div key={plan.id} className="rounded-xl p-4"
                style={{
                  backgroundColor: justSaved ? "rgba(16,185,129,0.05)" : "#FFF8F0",
                  border: `1px solid ${justSaved ? "rgba(16,185,129,0.3)" : "rgba(245,215,160,0.3)"}`,
                  transition: "border-color 0.3s",
                }}>
                <div className="flex items-start justify-between mb-1">
                  <p className="text-xs font-semibold" style={{ color: "#A8967E" }}>{plan.name}</p>
                  <span className="text-[10px] px-1.5 py-0.5 rounded-full font-medium"
                    style={{ backgroundColor: "rgba(245,215,160,0.2)", color: "#C4AA8A" }}>
                    {plan.period.replace("_", " ")}
                  </span>
                </div>

                {editingPlan === plan.id ? (
                  <div className="space-y-2 mt-2">
                    <div className="flex items-center gap-1.5 px-2 py-1.5 rounded-lg"
                      style={{ border: "1px solid rgba(245,158,11,0.4)", backgroundColor: "#FFFCF7" }}>
                      <span className="text-sm font-bold" style={{ color: "#A8967E" }}>$</span>
                      <input
                        type="number" min={0} step={1} autoFocus
                        value={editingPrice}
                        onChange={e => setEditingPrice(parseFloat(e.target.value) || 0)}
                        placeholder="0"
                        aria-label="Plan price in USD"
                        className="flex-1 text-sm font-bold focus:outline-none bg-transparent"
                        style={{ color: "#292524" }}
                      />
                      <span className="text-xs" style={{ color: "#C4AA8A" }}>/mo</span>
                    </div>
                    <div className="flex gap-1.5">
                      <button type="button" onClick={() => setEditingPlan(null)}
                        className="flex-1 flex items-center justify-center gap-1 py-1.5 rounded-lg text-xs font-semibold"
                        style={{ backgroundColor: "rgba(196,170,138,0.12)", color: "#A8967E" }}>
                        <X className="w-3 h-3" />Cancel
                      </button>
                      <button type="button" onClick={handleSave} disabled={saving || isFree}
                        className="flex-1 flex items-center justify-center gap-1 py-1.5 rounded-lg text-xs font-bold disabled:opacity-50"
                        style={{ backgroundColor: "#F59E0B", color: "white" }}>
                        {saving ? <Loader2 className="w-3 h-3 animate-spin" /> : <Database className="w-3 h-3" />}
                        Save
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-end justify-between mt-2">
                    <div>
                      <p className="text-2xl font-bold" style={{ color: justSaved ? "#059669" : "#F59E0B" }}>
                        ${plan.price.toFixed(2)}
                      </p>
                      {justSaved && (
                        <p className="text-[10px] flex items-center gap-0.5 font-semibold mt-0.5" style={{ color: "#059669" }}>
                          <Check className="w-3 h-3" />Saved to Supabase
                        </p>
                      )}
                    </div>
                    <button type="button" onClick={() => startEdit(plan)} disabled={isFree}
                      className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold disabled:opacity-30"
                      style={{ backgroundColor: "rgba(245,158,11,0.1)", color: "#F59E0B" }}>
                      <Edit3 className="w-3 h-3" />Edit
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      <p className="text-xs" style={{ color: "#C4AA8A" }}>
        Prices are read from Supabase on every load. Free Trial is always $0. Changes affect new Stripe checkouts only.
      </p>
    </div>
  );
}
