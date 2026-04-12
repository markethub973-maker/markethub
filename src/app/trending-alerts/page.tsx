"use client";

import { useState, useEffect, useCallback } from "react";
import Header from "@/components/layout/Header";
import {
  Bell, Plus, Trash2, Settings, Loader2,
  Zap, Check, X, ExternalLink, RefreshCw, Instagram,
} from "lucide-react";

interface TrendingAlert {
  id: string; product: string; platform: string; trend_score: number;
  hashtag: string; example_url: string; category: string; detected_at: string; notified: boolean;
}

interface AlertConfig {
  keywords: string[]; categories: string[]; email: string; active: boolean;
}

const card = { backgroundColor: "#FFFCF7", border: "1px solid rgba(245,215,160,0.25)", borderRadius: 12 };
const inp: React.CSSProperties = { border: "1px solid rgba(245,215,160,0.3)", backgroundColor: "white", color: "#292524", borderRadius: 8, padding: "8px 12px", fontSize: 14, outline: "none" };

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-GB", { day: "2-digit", month: "short" }) + " " +
    new Date(iso).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
}

const scoreColor = (s: number) => s >= 70 ? "#EF4444" : s >= 40 ? "#F59E0B" : "#10B981";

export default function TrendingAlertsPage() {
  const [alerts, setAlerts] = useState<TrendingAlert[]>([]);
  const [config, setConfig] = useState<AlertConfig>({ keywords: [], categories: [], email: "", active: true });
  const [loading, setLoading] = useState(true);
  const [showConfig, setShowConfig] = useState(false);
  const [saving, setSaving] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [newKeyword, setNewKeyword] = useState("");

  const load = useCallback(() => {
    setLoading(true);
    fetch("/api/trending-alert").then(r => r.json())
      .then(d => { if (d.alerts) setAlerts(d.alerts); if (d.config) setConfig(d.config); })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  const saveConfig = async () => {
    setSaving(true);
    await fetch("/api/trending-alert", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(config) });
    setSaving(false); setShowConfig(false);
  };

  const del = async (id: string) => {
    await fetch("/api/trending-alert", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id }) });
    setAlerts(p => p.filter(a => a.id !== id));
  };

  const scanNow = async () => {
    setScanning(true);
    await fetch("/api/trending-alerts/scan", { method: "POST" }).catch(() => {});
    await new Promise(r => setTimeout(r, 2000));
    await load();
    setScanning(false);
  };

  const addKeyword = () => {
    const k = newKeyword.trim();
    if (!k) return;
    setConfig(p => ({ ...p, keywords: [...new Set([...p.keywords, k])] }));
    setNewKeyword("");
  };

  return (
    <div className="min-h-screen" style={{ backgroundColor: "#FAFAF8" }}>
      <Header title="Trending Products Alert" subtitle="Detectează produse în trend pe TikTok și Instagram" />
      <div className="p-4 max-w-4xl mx-auto space-y-4">

        {/* Actions */}
        <div className="flex gap-2 flex-wrap">
          <button type="button" onClick={() => setShowConfig(v => !v)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold"
            style={{ ...card, color: "#78614E", boxShadow: "0 1px 3px rgba(120,97,78,0.06)" }}>
            <Settings className="w-4 h-4" /> Configure
          </button>
          <button type="button" onClick={scanNow} disabled={scanning}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold disabled:opacity-40"
            style={{ backgroundColor: "#7C3AED", color: "white" }}>
            {scanning ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
            {scanning ? "Scanez..." : "Scanează acum"}
          </button>
        </div>

        {/* Config */}
        {showConfig && (
          <div className="rounded-2xl p-4 space-y-3" style={{ ...card, border: "1px solid rgba(124,58,237,0.2)" }}>
            <p className="font-bold text-sm" style={{ color: "#292524" }}>⚙️ Keywords de urmărit</p>
            <div className="flex flex-wrap gap-1.5">
              {config.keywords.map(k => (
                <span key={k} className="flex items-center gap-1 px-2 py-0.5 rounded-full text-xs"
                  style={{ backgroundColor: "rgba(124,58,237,0.1)", color: "#7C3AED" }}>
                  {k}
                  <button type="button" onClick={() => setConfig(p => ({ ...p, keywords: p.keywords.filter(x => x !== k) }))}>
                    <X className="w-3 h-3" />
                  </button>
                </span>
              ))}
            </div>
            <div className="flex gap-2">
              <input value={newKeyword} onChange={e => setNewKeyword(e.target.value)}
                onKeyDown={e => e.key === "Enter" && addKeyword()}
                placeholder="ex: Stanley Cup, LED Mask, Collagen..."
                style={{ ...inp, flex: 1 }} />
              <button type="button" onClick={addKeyword}
                className="px-3 py-2 rounded-lg" style={{ backgroundColor: "#7C3AED", color: "white" }}>
                <Plus className="w-4 h-4" />
              </button>
            </div>
            <div>
              <label className="block text-xs font-medium mb-1" style={{ color: "#78614E" }}>Notification email</label>
              <input value={config.email} onChange={e => setConfig(p => ({ ...p, email: e.target.value }))}
                placeholder="email@example.com" style={{ ...inp, width: "100%" }} />
            </div>
            <button type="button" onClick={saveConfig} disabled={saving}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold disabled:opacity-40"
              style={{ background: "linear-gradient(135deg,#F59E0B,#D97706)", color: "#1C1814" }}>
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
              Save
            </button>
          </div>
        )}

        {/* Keywords active */}
        {config.keywords?.length > 0 && !showConfig && (
          <div className="flex flex-wrap gap-2 items-center">
            <span className="text-xs" style={{ color: "#A8967E" }}>Tracking:</span>
            {config.keywords.map(k => (
              <span key={k} className="text-xs px-2 py-0.5 rounded-full"
                style={{ backgroundColor: "rgba(124,58,237,0.1)", color: "#7C3AED" }}>{k}</span>
            ))}
          </div>
        )}

        {/* Alerts */}
        {loading ? (
          <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin" style={{ color: "#F59E0B" }} /></div>
        ) : alerts.length === 0 ? (
          <div className="rounded-2xl p-12 text-center" style={card}>
            <Bell className="w-8 h-8 mx-auto mb-3" style={{ color: "#C4AA8A" }} />
            <p className="text-sm font-medium mb-1" style={{ color: "#78614E" }}>No alerts detected yet</p>
            <p className="text-xs" style={{ color: "#A8967E" }}>Add keywords and click "Scan now"</p>
          </div>
        ) : (
          <div className="space-y-3">
            <p className="text-xs px-1" style={{ color: "#A8967E" }}>{alerts.length} produse detectate</p>
            {alerts.map(alert => (
              <div key={alert.id} className="rounded-xl p-4 flex items-start gap-3" style={card}>
                <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                  style={{ backgroundColor: alert.platform === "TikTok" ? "rgba(0,242,234,0.1)" : "rgba(225,48,108,0.1)" }}>
                  {alert.platform === "TikTok"
                    ? <Zap className="w-5 h-5" style={{ color: "#00F2EA" }} />
                    : <Instagram className="w-5 h-5" style={{ color: "#E1306C" }} />}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-bold text-sm" style={{ color: "#292524" }}>{alert.product}</p>
                    <span className="text-[10px] px-2 py-0.5 rounded-full font-bold"
                      style={{ backgroundColor: `${scoreColor(alert.trend_score)}15`, color: scoreColor(alert.trend_score) }}>
                      🔥 {alert.trend_score}/100
                    </span>
                    {alert.notified && <span className="text-[10px] px-1.5 py-0.5 rounded-full" style={{ backgroundColor: "rgba(16,185,129,0.1)", color: "#10B981" }}>✓ Email</span>}
                  </div>
                  <p className="text-xs mt-0.5" style={{ color: "#A8967E" }}>{alert.hashtag} · {alert.category} · {fmtDate(alert.detected_at)}</p>
                </div>
                <div className="flex gap-1 shrink-0">
                  {alert.example_url && (
                    <a href={alert.example_url} target="_blank" rel="noopener noreferrer"
                      className="p-1.5 rounded-lg" style={{ backgroundColor: "rgba(99,102,241,0.08)", color: "#6366F1" }}>
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  )}
                  <button type="button" onClick={() => del(alert.id)}
                    className="p-1.5 rounded-lg" style={{ backgroundColor: "rgba(239,68,68,0.08)", color: "#EF4444" }}>
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
