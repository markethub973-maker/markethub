"use client";

import { useEffect, useState } from "react";
import { Loader2, Save, TrendingUp, DollarSign, Zap, Search, Percent, ToggleLeft, ToggleRight } from "lucide-react";

const AMBER = "#F59E0B";
const GREEN = "#1DB954";
const RED = "#EF4444";

const OP_LABELS: Record<string, string> = {
  analyze: "Analiză ofertă AI", score: "Scorare leads AI", message: "Mesaj outreach AI",
  campaign: "Campanie completă AI", marketing_advisor: "APEX — Marketing Intelligence",
  research_google: "Căutare Google", research_maps: "Căutare Maps",
  research_reddit: "Căutare Reddit", research_website: "Analiză website",
  research_maps_reviews: "Recenzii Maps", research_local_market: "Piața locală",
};

function fmt(usd: number) {
  if (usd === 0) return "$0";
  return usd < 0.001 ? `$${(usd * 1000).toFixed(3)}‰` : `$${usd.toFixed(4)}`;
}

interface Settings {
  markup_percent: number;
  value_fee_percent: number;
  value_fee_min_usd: number;
  value_fee_max_usd: number;
  value_fee_enabled: boolean;
}

interface Costs30d {
  total_usd: number;
  by_service: Record<string, number>;
  by_operation: Record<string, number>;
  calls_count: number;
}

// Simulate pricing for preview
function calcPreview(apiCost: number, settings: Settings, campaignValue: number): {
  api_cost: number; api_markup: number; value_fee: number; total: number;
} {
  const apiMarkup = apiCost * (settings.markup_percent / 100);
  let valueFee = 0;
  if (settings.value_fee_enabled && campaignValue > 0) {
    const raw = campaignValue * (settings.value_fee_percent / 100);
    valueFee = Math.max(settings.value_fee_min_usd, Math.min(settings.value_fee_max_usd, raw));
  }
  return { api_cost: apiCost, api_markup: apiMarkup, value_fee: valueFee, total: apiCost + apiMarkup + valueFee };
}

export default function AdminMarkupPanel() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState<Settings>({
    markup_percent: 20, value_fee_percent: 10,
    value_fee_min_usd: 5, value_fee_max_usd: 500, value_fee_enabled: true,
  });
  const [costs30d, setCosts30d] = useState<Costs30d | null>(null);
  const [saveOk, setSaveOk] = useState(false);
  const [error, setError] = useState("");
  // Preview inputs
  const [previewApi, setPreviewApi] = useState("5");
  const [previewValue, setPreviewValue] = useState("1000");

  useEffect(() => {
    const adminKey = localStorage.getItem("admin_secret_key") || "";
    fetch("/api/admin/markup", { headers: { "x-admin-key": adminKey } })
      .then(r => r.json())
      .then(d => {
        if (d.settings) setSettings(d.settings);
        else if (d.markup_percent) setSettings(s => ({ ...s, markup_percent: d.markup_percent }));
        setCosts30d(d.costs_30d ?? null);
      })
      .finally(() => setLoading(false));
  }, []);

  const handleSave = async () => {
    setSaving(true); setError("");
    const adminKey = localStorage.getItem("admin_secret_key") || "";
    const res = await fetch("/api/admin/markup", {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-admin-key": adminKey },
      body: JSON.stringify(settings),
    });
    setSaving(false);
    if (res.ok) { setSaveOk(true); setTimeout(() => setSaveOk(false), 3000); }
    else setError("Eroare la salvare");
  };

  const preview = calcPreview(parseFloat(previewApi) || 0, settings, parseFloat(previewValue) || 0);
  const profit30d = (costs30d?.total_usd ?? 0) * (settings.markup_percent / 100);

  if (loading) return <div className="flex justify-center py-8"><Loader2 className="w-5 h-5 animate-spin" style={{ color: AMBER }} /></div>;

  return (
    <div className="space-y-6">

      {/* ── Calculator preview ─────────────────────────────────────────────── */}
      <div className="rounded-2xl p-5 space-y-4" style={{ backgroundColor: "#FFFCF7", border: `2px solid ${AMBER}30` }}>
        <div className="flex items-center gap-2">
          <DollarSign className="w-5 h-5" style={{ color: AMBER }} />
          <h3 className="font-bold" style={{ color: "#292524" }}>Simulator de preț — cum vede clientul</h3>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs font-bold mb-1 block" style={{ color: "#78614E" }}>Cost API real ($)</label>
            <input type="number" value={previewApi} onChange={e => setPreviewApi(e.target.value)} min="0" step="0.5"
              className="w-full px-3 py-2 rounded-lg text-sm focus:outline-none"
              style={{ border: `1px solid ${AMBER}30`, backgroundColor: "#FFFDF9", color: "#292524" }} />
          </div>
          <div>
            <label className="text-xs font-bold mb-1 block" style={{ color: "#78614E" }}>Valoarea afacerii clientului ($)</label>
            <input type="number" value={previewValue} onChange={e => setPreviewValue(e.target.value)} min="0" step="100"
              className="w-full px-3 py-2 rounded-lg text-sm focus:outline-none"
              style={{ border: `1px solid ${AMBER}30`, backgroundColor: "#FFFDF9", color: "#292524" }} />
          </div>
        </div>
        {/* Price breakdown */}
        <div className="rounded-xl p-4 space-y-2" style={{ backgroundColor: "rgba(245,215,160,0.08)", border: `1px solid ${AMBER}20` }}>
          {[
            { label: "Cost API real (Anthropic + Apify)", value: preview.api_cost, color: "#A8967E" },
            { label: `Comision platformă pe API (${settings.markup_percent}%)`, value: preview.api_markup, color: "#78614E" },
            { label: `Comision valoare afacere (${settings.value_fee_percent}% din $${previewValue})`, value: preview.value_fee, color: AMBER, bold: true },
          ].map(({ label, value, color, bold }) => (
            <div key={label} className="flex justify-between items-center">
              <span className="text-xs" style={{ color }}>{label}</span>
              <span className={`text-xs font-mono ${bold ? "font-bold text-base" : "font-semibold"}`} style={{ color: bold ? AMBER : color }}>
                ${value.toFixed(2)}
              </span>
            </div>
          ))}
          <div className="border-t pt-2 flex justify-between items-center" style={{ borderColor: `${AMBER}25` }}>
            <span className="text-sm font-bold" style={{ color: "#292524" }}>Total clientul plătește</span>
            <span className="text-lg font-bold" style={{ color: GREEN }}>${preview.total.toFixed(2)}</span>
          </div>
          <div className="flex justify-between text-xs" style={{ color: "#A8967E" }}>
            <span>Profitul tău</span>
            <span className="font-bold" style={{ color: GREEN }}>
              ${(preview.api_markup + preview.value_fee).toFixed(2)} ({preview.total > 0 ? (((preview.api_markup + preview.value_fee) / preview.total) * 100).toFixed(1) : 0}% din total)
            </span>
          </div>
        </div>
      </div>

      {/* ── Settings ───────────────────────────────────────────────────────── */}
      <div className="rounded-2xl p-5 space-y-5" style={{ backgroundColor: "#FFFCF7", border: "1px solid rgba(245,215,160,0.25)" }}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Percent className="w-5 h-5" style={{ color: AMBER }} />
            <h3 className="font-bold" style={{ color: "#292524" }}>Configurare comisioane</h3>
          </div>
          <button type="button" onClick={handleSave} disabled={saving}
            className="flex items-center gap-2 px-4 py-2 rounded-xl font-bold text-sm disabled:opacity-60"
            style={{ backgroundColor: AMBER, color: "#1C1814" }}>
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            {saveOk ? "Salvat ✓" : "Salvează"}
          </button>
        </div>
        {error && <p className="text-sm" style={{ color: RED }}>{error}</p>}

        {/* API markup */}
        <div className="space-y-2">
          <label className="text-xs font-bold" style={{ color: "#78614E" }}>
            1. Comision pe costul API real (%)
          </label>
          <p className="text-xs" style={{ color: "#A8967E" }}>Se aplică pe costul Anthropic + Apify din fiecare sesiune</p>
          <div className="flex items-center gap-3">
            <input type="range" min="0" max="200" step="5" value={settings.markup_percent}
              onChange={e => setSettings(s => ({ ...s, markup_percent: Number(e.target.value) }))}
              className="flex-1" />
            <span className="text-lg font-bold w-16 text-right" style={{ color: AMBER }}>{settings.markup_percent}%</span>
          </div>
        </div>

        <div className="border-t" style={{ borderColor: "rgba(245,215,160,0.2)" }} />

        {/* Value fee toggle */}
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-bold" style={{ color: "#292524" }}>2. Comision pe valoarea afacerii clientului</p>
            <p className="text-xs" style={{ color: "#A8967E" }}>Platforma ia X% din valoarea declarată de client per tranzacție</p>
          </div>
          <button type="button" onClick={() => setSettings(s => ({ ...s, value_fee_enabled: !s.value_fee_enabled }))}>
            {settings.value_fee_enabled
              ? <ToggleRight className="w-8 h-8" style={{ color: GREEN }} />
              : <ToggleLeft className="w-8 h-8" style={{ color: "#A8967E" }} />}
          </button>
        </div>

        {settings.value_fee_enabled && (
          <div className="space-y-4 pl-4" style={{ borderLeft: `2px solid ${AMBER}30` }}>
            {/* Value fee % */}
            <div className="space-y-2">
              <label className="text-xs font-bold" style={{ color: "#78614E" }}>Procent din valoarea afacerii (%)</label>
              <div className="flex items-center gap-3">
                <input type="range" min="1" max="50" step="1" value={settings.value_fee_percent}
                  onChange={e => setSettings(s => ({ ...s, value_fee_percent: Number(e.target.value) }))}
                  className="flex-1" />
                <span className="text-lg font-bold w-16 text-right" style={{ color: AMBER }}>{settings.value_fee_percent}%</span>
              </div>
            </div>
            {/* Min / Max */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-bold mb-1 block" style={{ color: "#78614E" }}>Fee minim ($)</label>
                <input type="number" min="0" step="1" value={settings.value_fee_min_usd}
                  onChange={e => setSettings(s => ({ ...s, value_fee_min_usd: Number(e.target.value) }))}
                  className="w-full px-3 py-2 rounded-lg text-sm focus:outline-none"
                  style={{ border: `1px solid ${AMBER}30`, backgroundColor: "#FFFDF9", color: "#292524" }} />
                <p className="text-xs mt-1" style={{ color: "#A8967E" }}>Dacă % e sub minim, se ia minimul</p>
              </div>
              <div>
                <label className="text-xs font-bold mb-1 block" style={{ color: "#78614E" }}>Fee maxim ($)</label>
                <input type="number" min="0" step="10" value={settings.value_fee_max_usd}
                  onChange={e => setSettings(s => ({ ...s, value_fee_max_usd: Number(e.target.value) }))}
                  className="w-full px-3 py-2 rounded-lg text-sm focus:outline-none"
                  style={{ border: `1px solid ${AMBER}30`, backgroundColor: "#FFFDF9", color: "#292524" }} />
                <p className="text-xs mt-1" style={{ color: "#A8967E" }}>Cap pentru clienți cu valori mari</p>
              </div>
            </div>
            {/* Example */}
            <div className="rounded-lg px-3 py-2 text-xs" style={{ backgroundColor: `${GREEN}08`, border: `1px solid ${GREEN}20` }}>
              <span className="font-bold" style={{ color: GREEN }}>Exemplu: </span>
              <span style={{ color: "#78614E" }}>
                Client cu afacere de $1000 → fee = max(${settings.value_fee_min_usd}, {settings.value_fee_percent}% × $1000) = <strong>${Math.max(settings.value_fee_min_usd, Math.min(settings.value_fee_max_usd, 1000 * settings.value_fee_percent / 100)).toFixed(2)}</strong>
              </span>
            </div>
          </div>
        )}
      </div>

      {/* ── 30d cost overview ──────────────────────────────────────────────── */}
      {costs30d && (
        <div className="rounded-2xl p-5 space-y-4" style={{ backgroundColor: "#FFFCF7", border: "1px solid rgba(245,215,160,0.25)" }}>
          <div className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5" style={{ color: AMBER }} />
            <h3 className="font-bold" style={{ color: "#292524" }}>Costuri platformă — ultimele 30 de zile</h3>
          </div>
          <div className="grid grid-cols-3 gap-3">
            {[
              { label: "Apeluri API", value: String(costs30d.calls_count) },
              { label: "Cost real plătit", value: `$${costs30d.total_usd.toFixed(4)}` },
              { label: "Profit din markup API", value: `$${profit30d.toFixed(4)}` },
            ].map(({ label, value }) => (
              <div key={label} className="rounded-xl p-3 text-center"
                style={{ backgroundColor: "rgba(245,215,160,0.08)", border: "1px solid rgba(245,215,160,0.15)" }}>
                <p className="text-xs" style={{ color: "#A8967E" }}>{label}</p>
                <p className="text-base font-bold mt-1" style={{ color: "#292524" }}>{value}</p>
              </div>
            ))}
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-xs font-bold mb-2" style={{ color: "#78614E" }}><Zap className="w-3 h-3 inline mr-1" />Pe serviciu</p>
              {Object.entries(costs30d.by_service).map(([svc, usd]) => (
                <div key={svc} className="flex justify-between text-xs py-1.5 border-b" style={{ borderColor: "rgba(245,215,160,0.1)" }}>
                  <span style={{ color: "#78614E" }}>{svc === "anthropic" ? "🤖 Anthropic AI" : "🔍 Apify Search"}</span>
                  <span className="font-mono font-bold" style={{ color: "#292524" }}>{fmt(usd)}</span>
                </div>
              ))}
            </div>
            <div>
              <p className="text-xs font-bold mb-2" style={{ color: "#78614E" }}><Search className="w-3 h-3 inline mr-1" />Pe operațiune (top)</p>
              {Object.entries(costs30d.by_operation).sort(([,a],[,b]) => b-a).slice(0,6).map(([op, usd]) => (
                <div key={op} className="flex justify-between text-xs py-1.5 border-b" style={{ borderColor: "rgba(245,215,160,0.1)" }}>
                  <span style={{ color: "#78614E" }}>{OP_LABELS[op] || op}</span>
                  <span className="font-mono font-bold" style={{ color: "#292524" }}>{fmt(usd)}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
