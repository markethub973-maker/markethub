"use client";
import { useState, useEffect, useCallback } from "react";
import Header from "@/components/layout/Header";
import { Plus, Trash2, Copy, Check, Key, Eye, EyeOff, Loader2, Shield, Code } from "lucide-react";

interface ApiKey { id: string; name: string; key_prefix: string; last_used: string | null; expires_at: string | null; active: boolean; created_at: string; }

const card = { backgroundColor: "var(--color-bg-secondary)", border: "1px solid rgba(245,215,160,0.25)", borderRadius: 12 };
const inp: React.CSSProperties = { border: "1px solid rgba(245,215,160,0.3)", backgroundColor: "white", color: "var(--color-text)", borderRadius: 8, padding: "8px 12px", fontSize: 14, outline: "none" };
const fmtDate = (s: string) => new Date(s).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });

export default function ApiKeysPage() {
  const [keys, setKeys] = useState<ApiKey[]>([]);
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState("");
  const [expiresDays, setExpiresDays] = useState("365");
  const [creating, setCreating] = useState(false);
  const [newKey, setNewKey] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState("");

  const load = useCallback(() => {
    fetch("/api/api-keys").then(r => r.json()).then(d => { if (d.keys) setKeys(d.keys); }).finally(() => setLoading(false));
  }, []);
  useEffect(() => { load(); }, [load]);

  const create = async () => {
    if (!name.trim()) return;
    setCreating(true); setError(""); setNewKey(null);
    const res = await fetch("/api/api-keys", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name: name.trim(), expires_days: parseInt(expiresDays) || null }) });
    const d = await res.json();
    if (d.key) { setKeys(p => [d.key, ...p]); setNewKey(d.key.raw_key); setName(""); }
    else setError(d.error || "Error");
    setCreating(false);
  };

  const del = async (id: string) => {
    if (!confirm("Delete this API key? Applications using it will lose access.")) return;
    await fetch("/api/api-keys", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id }) });
    setKeys(p => p.filter(k => k.id !== id));
  };

  const copyKey = (key: string) => { navigator.clipboard.writeText(key); setCopied(true); setTimeout(() => setCopied(false), 2000); };

  const ENDPOINTS = [
    { method: "GET", path: "/api/external/analytics?type=summary", desc: "General statistics" },
    { method: "GET", path: "/api/external/analytics?type=campaigns", desc: "Campaign list" },
    { method: "GET", path: "/api/external/analytics?type=leads", desc: "Leads list" },
    { method: "GET", path: "/api/external/analytics?type=influencers", desc: "Influencer database" },
  ];

  return (
    <div className="min-h-screen" style={{ backgroundColor: "#FAFAF8" }}>
      <Header title="API Keys" subtitle="External access to your data via REST API (Studio/Agency plan)" />
      <div className="p-4 max-w-3xl mx-auto space-y-4">

        {/* Create key */}
        <div className="rounded-2xl p-4 space-y-3" style={card}>
          <p className="font-bold text-sm" style={{ color: "var(--color-text)" }}>Generate new API Key</p>
          <div className="flex gap-2 flex-wrap">
            <input value={name} onChange={e => setName(e.target.value)} placeholder="Key name (e.g. Zapier Integration)" style={{ ...inp, flex: 1, minWidth: 200 }} />
            <select value={expiresDays} onChange={e => setExpiresDays(e.target.value)} style={{ ...inp, minWidth: 130 }}>
              <option value="30">Expires in 30 days</option>
              <option value="90">Expires in 90 days</option>
              <option value="365">Expires in 1 year</option>
              <option value="">Never expires</option>
            </select>
            <button type="button" onClick={create} disabled={creating || !name.trim()}
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold disabled:opacity-40"
              style={{ background: "linear-gradient(135deg,#F59E0B,#D97706)", color: "#1C1814" }}>
              {creating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />} Generate
            </button>
          </div>
          {error && <p className="text-xs text-red-500">{error}</p>}
        </div>

        {/* New key reveal */}
        {newKey && (
          <div className="rounded-2xl p-4 space-y-2" style={{ ...card, border: "1px solid rgba(16,185,129,0.3)", backgroundColor: "rgba(16,185,129,0.02)" }}>
            <p className="text-sm font-bold" style={{ color: "#10B981" }}>✅ API Key generated — save it now, it will not be shown again!</p>
            <div className="flex gap-2 items-center">
              <code className="flex-1 text-xs p-3 rounded-lg break-all" style={{ backgroundColor: "white", color: "#10B981" }}>{newKey}</code>
              <button type="button" onClick={() => copyKey(newKey)} className="p-2 rounded-lg shrink-0" style={{ backgroundColor: "rgba(16,185,129,0.1)", color: "#10B981" }}>
                {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
              </button>
            </div>
            <button type="button" onClick={() => setNewKey(null)} className="text-xs" style={{ color: "#A8967E" }}>Close (I saved it)</button>
          </div>
        )}

        {/* Keys list */}
        {loading ? <div className="flex justify-center py-8"><Loader2 className="w-5 h-5 animate-spin" style={{ color: "var(--color-primary)" }} /></div>
        : keys.length === 0 ? (
          <div className="rounded-2xl p-12 text-center" style={card}>
            <Key className="w-8 h-8 mx-auto mb-3" style={{ color: "#C4AA8A" }} />
            <p className="text-sm" style={{ color: "#78614E" }}>No API keys created yet</p>
          </div>
        ) : (
          <div className="space-y-2">
            {keys.map(k => (
              <div key={k.id} className="rounded-xl px-4 py-3 flex items-center gap-3" style={card}>
                <Key className="w-4 h-4 shrink-0" style={{ color: "var(--color-primary)" }} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold" style={{ color: "var(--color-text)" }}>{k.name}</p>
                  <p className="text-xs mt-0.5" style={{ color: "#A8967E" }}>
                    <code>{k.key_prefix}...</code> · Created {fmtDate(k.created_at)}
                    {k.last_used && ` · Last used: ${fmtDate(k.last_used)}`}
                    {k.expires_at && ` · Expires: ${fmtDate(k.expires_at)}`}
                  </p>
                </div>
                <span className="text-[10px] px-2 py-0.5 rounded-full font-semibold shrink-0"
                  style={{ backgroundColor: k.active ? "rgba(16,185,129,0.1)" : "rgba(239,68,68,0.08)", color: k.active ? "#10B981" : "#EF4444" }}>
                  {k.active ? "Active" : "Inactive"}
                </span>
                <button type="button" onClick={() => del(k.id)} className="p-1.5 rounded-lg shrink-0" style={{ backgroundColor: "rgba(239,68,68,0.08)", color: "#EF4444" }}>
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Docs */}
        <div className="rounded-2xl p-4 space-y-3" style={{ ...card, border: "1px solid rgba(99,102,241,0.2)" }}>
          <div className="flex items-center gap-2">
            <Code className="w-4 h-4" style={{ color: "#6366F1" }} />
            <p className="font-bold text-sm" style={{ color: "var(--color-text)" }}>API Usage</p>
          </div>
          <div className="rounded-lg p-3 text-xs font-mono" style={{ backgroundColor: "white", color: "#2D2620" }}>
            <p style={{ color: "#A8967E" }}># Authentication</p>
            <p>Authorization: Bearer mhp_your_key_here</p>
            <br />
            <p style={{ color: "#A8967E" }}># curl example</p>
            <p>curl https://markethubpromo.com/api/external/analytics \</p>
            <p>  -H "Authorization: Bearer mhp_..."</p>
          </div>
          <div className="space-y-2">
            {ENDPOINTS.map(ep => (
              <div key={ep.path} className="flex items-center gap-3 text-xs">
                <span className="px-1.5 py-0.5 rounded font-bold shrink-0" style={{ backgroundColor: "rgba(16,185,129,0.1)", color: "#10B981" }}>{ep.method}</span>
                <code style={{ color: "#6366F1" }}>{ep.path}</code>
                <span style={{ color: "#A8967E" }}>— {ep.desc}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
