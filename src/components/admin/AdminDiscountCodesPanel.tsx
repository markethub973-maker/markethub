"use client";

import { useEffect, useState } from "react";
import { Plus, Trash2, Loader2, RefreshCw, Tag, ToggleLeft, ToggleRight, X, Check } from "lucide-react";

const cardStyle = {
  backgroundColor: "var(--color-bg-secondary)",
  border: "1px solid rgba(245,215,160,0.25)",
  boxShadow: "0 1px 3px rgba(120,97,78,0.08)",
};

const SQL = `CREATE TABLE IF NOT EXISTS discount_codes (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  code TEXT UNIQUE NOT NULL,
  description TEXT DEFAULT '',
  discount_pct INTEGER NOT NULL CHECK (discount_pct > 0 AND discount_pct <= 100),
  max_uses INTEGER DEFAULT 0,
  uses INTEGER DEFAULT 0,
  applies_to TEXT[] DEFAULT '{}',
  expires_at TIMESTAMPTZ,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);`;

const PLAN_OPTIONS = [
  { id: "lite", label: "Creator" },
  { id: "pro", label: "Pro" },
  { id: "business", label: "Studio" },
  { id: "agency", label: "Agency" },
];

const EMPTY_FORM = {
  code: "", description: "", discount_pct: 20, max_uses: 0,
  applies_to: [] as string[], expires_at: "",
};

interface DiscountCode {
  id: string;
  code: string;
  description: string;
  discount_pct: number;
  max_uses: number;
  uses: number;
  applies_to: string[];
  expires_at: string | null;
  is_active: boolean;
  created_at: string;
}

function inputStyle(extra?: object) {
  return {
    border: "1px solid rgba(245,215,160,0.3)",
    backgroundColor: "var(--color-bg)",
    color: "var(--color-text)",
    ...extra,
  };
}

export default function AdminDiscountCodesPanel() {
  const [codes, setCodes] = useState<DiscountCode[]>([]);
  const [tableExists, setTableExists] = useState(true);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [toggling, setToggling] = useState<string | null>(null);
  const [error, setError] = useState("");

  const fetch_ = async () => {
    setLoading(true);
    const res = await fetch("/api/admin/discount-codes");
    const data = await res.json();
    setCodes(data.codes ?? []);
    setTableExists(data.table_exists ?? true);
    setLoading(false);
  };

  useEffect(() => { fetch_(); }, []);

  const handleCreate = async () => {
    if (!form.code.trim()) { setError("Code is required"); return; }
    if (!form.discount_pct || form.discount_pct < 1) { setError("Discount must be ≥ 1%"); return; }
    setSaving(true);
    setError("");
    const res = await fetch("/api/admin/discount-codes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...form,
        expires_at: form.expires_at || null,
        max_uses: form.max_uses || 0,
      }),
    });
    const data = await res.json();
    if (data.error) { setError(data.error); setSaving(false); return; }
    setCodes(c => [data.code, ...c]);
    setForm(EMPTY_FORM);
    setShowForm(false);
    setSaving(false);
  };

  const handleDelete = async (id: string) => {
    setDeleting(id);
    await fetch(`/api/admin/discount-codes?id=${id}`, { method: "DELETE" });
    setCodes(c => c.filter(x => x.id !== id));
    setDeleting(null);
  };

  const toggleActive = async (code: DiscountCode) => {
    setToggling(code.id);
    await fetch("/api/admin/discount-codes", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: code.id, is_active: !code.is_active }),
    });
    setCodes(c => c.map(x => x.id === code.id ? { ...x, is_active: !x.is_active } : x));
    setToggling(null);
  };

  const togglePlan = (planId: string) => {
    setForm(f => ({
      ...f,
      applies_to: f.applies_to.includes(planId)
        ? f.applies_to.filter(p => p !== planId)
        : [...f.applies_to, planId],
    }));
  };

  const isExpired = (code: DiscountCode) =>
    code.expires_at && new Date(code.expires_at) < new Date();
  const isExhausted = (code: DiscountCode) =>
    code.max_uses > 0 && code.uses >= code.max_uses;

  return (
    <div className="rounded-2xl p-6" style={cardStyle}>
      <div className="flex items-center justify-between mb-5">
        <div>
          <h2 className="text-xl font-bold" style={{ color: "var(--color-text)" }}>Discount Codes</h2>
          <p className="text-sm mt-0.5" style={{ color: "#A8967E" }}>Create and manage promo codes for plan subscriptions</p>
        </div>
        <div className="flex gap-2">
          <button type="button" onClick={fetch_} disabled={loading}
            className="p-1.5 rounded-lg" style={{ color: "#A8967E" }}>
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          </button>
          <button type="button" onClick={() => { setShowForm(s => !s); setError(""); }}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold"
            style={{ backgroundColor: "var(--color-primary)", color: "white" }}>
            {showForm ? <X className="w-3.5 h-3.5" /> : <Plus className="w-3.5 h-3.5" />}
            {showForm ? "Cancel" : "New Code"}
          </button>
        </div>
      </div>

      {!tableExists && (
        <div className="mb-4 rounded-xl px-4 py-3 text-xs" style={{ backgroundColor: "rgba(99,102,241,0.06)", color: "#6366F1", border: "1px solid rgba(99,102,241,0.15)" }}>
          <strong>Run this SQL in Supabase first:</strong>
          <code className="block mt-1 bg-white/50 rounded p-2 font-mono text-[10px]" style={{ color: "var(--color-text)" }}>{SQL}</code>
        </div>
      )}

      {/* Create form */}
      {showForm && (
        <div className="mb-5 rounded-xl p-4 space-y-3" style={{ backgroundColor: "var(--color-bg)", border: "1px solid rgba(245,215,160,0.3)" }}>
          <h3 className="text-sm font-bold" style={{ color: "var(--color-text)" }}>Create New Code</h3>

          {error && (
            <p className="text-xs px-3 py-2 rounded-lg" style={{ backgroundColor: "rgba(239,68,68,0.08)", color: "#DC2626" }}>{error}</p>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold mb-1" style={{ color: "#78614E" }}>Code *</label>
              <input type="text" placeholder="LAUNCH20" value={form.code}
                onChange={e => setForm(f => ({ ...f, code: e.target.value.toUpperCase() }))}
                className="w-full px-3 py-2 text-sm rounded-lg focus:outline-none uppercase"
                style={inputStyle()} />
            </div>
            <div>
              <label className="block text-xs font-semibold mb-1" style={{ color: "#78614E" }}>Discount % *</label>
              <input type="number" min={1} max={100} value={form.discount_pct}
                onChange={e => setForm(f => ({ ...f, discount_pct: Number(e.target.value) }))}
                className="w-full px-3 py-2 text-sm rounded-lg focus:outline-none"
                style={inputStyle()} />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold mb-1" style={{ color: "#78614E" }}>Description (optional)</label>
            <input type="text" placeholder="Launch week promo" value={form.description}
              onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
              className="w-full px-3 py-2 text-sm rounded-lg focus:outline-none"
              style={inputStyle()} />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold mb-1" style={{ color: "#78614E" }}>Max Uses <span style={{ color: "#C4AA8A" }}>(0 = unlimited)</span></label>
              <input type="number" min={0} value={form.max_uses}
                onChange={e => setForm(f => ({ ...f, max_uses: Number(e.target.value) }))}
                className="w-full px-3 py-2 text-sm rounded-lg focus:outline-none"
                style={inputStyle()} />
            </div>
            <div>
              <label className="block text-xs font-semibold mb-1" style={{ color: "#78614E" }}>Expires At <span style={{ color: "#C4AA8A" }}>(optional)</span></label>
              <input type="date" value={form.expires_at}
                onChange={e => setForm(f => ({ ...f, expires_at: e.target.value }))}
                className="w-full px-3 py-2 text-sm rounded-lg focus:outline-none"
                style={inputStyle()} />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold mb-2" style={{ color: "#78614E" }}>Applies To <span style={{ color: "#C4AA8A" }}>(empty = all plans)</span></label>
            <div className="flex flex-wrap gap-1.5">
              {PLAN_OPTIONS.map(p => {
                const sel = form.applies_to.includes(p.id);
                return (
                  <button key={p.id} type="button" onClick={() => togglePlan(p.id)}
                    className="px-2.5 py-1 rounded-full text-xs font-semibold transition-colors"
                    style={{
                      backgroundColor: sel ? "var(--color-primary)" : "rgba(245,215,160,0.2)",
                      color: sel ? "white" : "#A8967E",
                    }}>
                    {p.label}
                  </button>
                );
              })}
            </div>
          </div>

          <button type="button" onClick={handleCreate} disabled={saving}
            className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-bold disabled:opacity-50"
            style={{ backgroundColor: "var(--color-primary)", color: "white" }}>
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
            Create Code
          </button>
        </div>
      )}

      {/* Table */}
      {loading ? (
        <div className="flex justify-center py-10"><Loader2 className="w-5 h-5 animate-spin" style={{ color: "var(--color-primary)" }} /></div>
      ) : codes.length === 0 ? (
        <div className="text-center py-10">
          <Tag className="w-8 h-8 mx-auto mb-2" style={{ color: "#C4AA8A" }} />
          <p className="text-sm" style={{ color: "#A8967E" }}>No discount codes yet</p>
        </div>
      ) : (
        <div className="space-y-2">
          {codes.map(code => {
            const expired = isExpired(code);
            const exhausted = isExhausted(code);
            const inactive = !code.is_active || expired || exhausted;
            return (
              <div key={code.id} className="flex items-center gap-3 px-4 py-3 rounded-xl"
                style={{ backgroundColor: inactive ? "rgba(196,170,138,0.06)" : "rgba(245,158,11,0.04)", border: "1px solid rgba(245,215,160,0.2)" }}>

                {/* Code badge */}
                <div className="flex-shrink-0">
                  <span className="font-mono text-sm font-bold px-2 py-0.5 rounded"
                    style={{ backgroundColor: inactive ? "rgba(196,170,138,0.12)" : "rgba(245,158,11,0.12)", color: inactive ? "#A8967E" : "var(--color-primary-hover)" }}>
                    {code.code}
                  </span>
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-semibold" style={{ color: "var(--color-text)" }}>–{code.discount_pct}%</span>
                    {code.description && <span className="text-xs" style={{ color: "#A8967E" }}>{code.description}</span>}
                    {code.applies_to?.length > 0 && (
                      <span className="text-xs px-1.5 py-0.5 rounded" style={{ backgroundColor: "rgba(99,102,241,0.08)", color: "#6366F1" }}>
                        {code.applies_to.join(", ")}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-3 mt-0.5 text-xs" style={{ color: "#C4AA8A" }}>
                    <span>{code.uses}/{code.max_uses === 0 ? "∞" : code.max_uses} uses</span>
                    {code.expires_at && (
                      <span style={{ color: expired ? "#DC2626" : "#C4AA8A" }}>
                        expires {new Date(code.expires_at).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })}
                      </span>
                    )}
                    {expired && <span style={{ color: "#DC2626" }}>Expired</span>}
                    {exhausted && !expired && <span style={{ color: "var(--color-primary-hover)" }}>Exhausted</span>}
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 flex-shrink-0">
                  <button type="button" onClick={() => toggleActive(code)} disabled={toggling === code.id}
                    title={code.is_active ? "Deactivate" : "Activate"}
                    style={{ color: code.is_active ? "var(--color-primary)" : "#C4AA8A" }}>
                    {toggling === code.id
                      ? <Loader2 className="w-4 h-4 animate-spin" />
                      : code.is_active
                        ? <ToggleRight className="w-5 h-5" />
                        : <ToggleLeft className="w-5 h-5" />
                    }
                  </button>
                  <button type="button" onClick={() => handleDelete(code.id)} disabled={deleting === code.id}
                    style={{ color: "#C4AA8A" }} title="Delete">
                    {deleting === code.id
                      ? <Loader2 className="w-4 h-4 animate-spin" />
                      : <Trash2 className="w-4 h-4" />
                    }
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
