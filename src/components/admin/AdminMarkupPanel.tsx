"use client";

import { useEffect, useState } from "react";
import { Loader2, Save, TrendingUp, DollarSign, Zap, Search } from "lucide-react";

const AMBER = "#F59E0B";
const GREEN = "#1DB954";
const RED = "#EF4444";

const OP_LABELS: Record<string, string> = {
  analyze: "Analiză ofertă AI", score: "Scorare leads AI", message: "Mesaj outreach AI",
  campaign: "Campanie completă AI", marketing_advisor: "Expert Marketing MAX",
  research_google: "Căutare Google", research_maps: "Căutare Maps",
  research_reddit: "Căutare Reddit", research_website: "Analiză website",
  research_maps_reviews: "Recenzii Maps", research_local_market: "Piața locală",
};

function fmt(usd: number) {
  return usd < 0.001 ? `$${(usd * 1000).toFixed(3)}‰` : `$${usd.toFixed(4)}`;
}

export default function AdminMarkupPanel() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [markup, setMarkup] = useState(20);
  const [inputMarkup, setInputMarkup] = useState("20");
  const [costs30d, setCosts30d] = useState<{
    total_usd: number;
    by_service: Record<string, number>;
    by_operation: Record<string, number>;
    calls_count: number;
  } | null>(null);
  const [saveOk, setSaveOk] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const adminKey = localStorage.getItem("admin_secret_key") || "";
    fetch("/api/admin/markup", { headers: { "x-admin-key": adminKey } })
      .then(r => r.json())
      .then(d => {
        setMarkup(d.markup_percent ?? 20);
        setInputMarkup(String(d.markup_percent ?? 20));
        setCosts30d(d.costs_30d ?? null);
      })
      .finally(() => setLoading(false));
  }, []);

  const handleSave = async () => {
    const pct = parseFloat(inputMarkup);
    if (isNaN(pct) || pct < 0 || pct > 500) { setError("Valoare invalidă (0-500)"); return; }
    setSaving(true);
    setError("");
    const adminKey = localStorage.getItem("admin_secret_key") || "";
    const res = await fetch("/api/admin/markup", {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-admin-key": adminKey },
      body: JSON.stringify({ markup_percent: pct }),
    });
    setSaving(false);
    if (res.ok) { setMarkup(pct); setSaveOk(true); setTimeout(() => setSaveOk(false), 3000); }
    else setError("Eroare salvare");
  };

  if (loading) return (
    <div className="flex items-center justify-center py-8">
      <Loader2 className="w-5 h-5 animate-spin" style={{ color: AMBER }} />
    </div>
  );

  const totalWithMarkup = (costs30d?.total_usd ?? 0) * (1 + markup / 100);
  const profit = totalWithMarkup - (costs30d?.total_usd ?? 0);

  return (
    <div className="space-y-6">
      {/* Markup setting */}
      <div className="rounded-2xl p-5 space-y-4" style={{ backgroundColor: "#FFFCF7", border: "1px solid rgba(245,215,160,0.25)" }}>
        <div className="flex items-center gap-2">
          <DollarSign className="w-5 h-5" style={{ color: AMBER }} />
          <h3 className="font-bold" style={{ color: "#292524" }}>Comision platformă pe costul API real</h3>
        </div>
        <p className="text-sm" style={{ color: "#78614E" }}>
          Fiecare operațiune AI/căutare are un cost real. Setezi procentul de markup pe care platforma îl adaugă.
          Clientul vede prețul final (cost real + markup).
        </p>
        <div className="flex items-end gap-4">
          <div className="flex-1">
            <label className="text-xs font-bold mb-2 block" style={{ color: "#78614E" }}>Markup % (implicit 20%)</label>
            <div className="flex items-center gap-3">
              <input type="number" min="0" max="500" step="1" value={inputMarkup}
                onChange={e => setInputMarkup(e.target.value)}
                className="w-32 px-4 py-3 rounded-xl text-lg font-bold text-center focus:outline-none"
                style={{ border: `2px solid ${AMBER}50`, backgroundColor: "#FFFDF9", color: "#292524" }} />
              <span className="text-2xl font-bold" style={{ color: "#A8967E" }}>%</span>
              <div className="text-sm" style={{ color: "#78614E" }}>
                <p>Cost real: $1.00</p>
                <p>→ Client plătește: <span className="font-bold" style={{ color: AMBER }}>${(1 * (1 + parseFloat(inputMarkup || "0") / 100)).toFixed(2)}</span></p>
                <p>→ Profit platformă: <span className="font-bold" style={{ color: GREEN }}>${(parseFloat(inputMarkup || "0") / 100).toFixed(2)}</span></p>
              </div>
            </div>
          </div>
          <button type="button" onClick={handleSave} disabled={saving}
            className="flex items-center gap-2 px-5 py-3 rounded-xl font-bold text-sm disabled:opacity-60"
            style={{ backgroundColor: AMBER, color: "#1C1814" }}>
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            {saveOk ? "Salvat!" : "Salvează"}
          </button>
        </div>
        {error && <p className="text-sm" style={{ color: RED }}>{error}</p>}
      </div>

      {/* 30-day cost overview */}
      {costs30d && (
        <div className="rounded-2xl p-5 space-y-4" style={{ backgroundColor: "#FFFCF7", border: "1px solid rgba(245,215,160,0.25)" }}>
          <div className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5" style={{ color: AMBER }} />
            <h3 className="font-bold" style={{ color: "#292524" }}>Costuri reale — ultimele 30 de zile</h3>
          </div>
          <div className="grid grid-cols-4 gap-3">
            {[
              { label: "Apeluri totale", value: costs30d.calls_count, unit: "apeluri" },
              { label: "Cost real total", value: `$${costs30d.total_usd.toFixed(4)}`, unit: "" },
              { label: `Cost client (${markup}%)`, value: `$${totalWithMarkup.toFixed(4)}`, unit: "" },
              { label: "Profit platformă", value: `$${profit.toFixed(4)}`, unit: "" },
            ].map(({ label, value, unit }) => (
              <div key={label} className="rounded-xl p-3 text-center"
                style={{ backgroundColor: "rgba(245,215,160,0.08)", border: "1px solid rgba(245,215,160,0.15)" }}>
                <p className="text-xs" style={{ color: "#A8967E" }}>{label}</p>
                <p className="text-lg font-bold mt-1" style={{ color: "#292524" }}>{value}</p>
                {unit && <p className="text-xs" style={{ color: "#A8967E" }}>{unit}</p>}
              </div>
            ))}
          </div>

          <div className="grid grid-cols-2 gap-4">
            {/* By service */}
            <div>
              <p className="text-xs font-bold mb-2" style={{ color: "#78614E" }}>
                <Zap className="w-3 h-3 inline mr-1" />Pe serviciu
              </p>
              {Object.entries(costs30d.by_service).map(([svc, usd]) => (
                <div key={svc} className="flex justify-between text-xs py-1"
                  style={{ borderBottom: "1px solid rgba(245,215,160,0.1)" }}>
                  <span style={{ color: "#78614E" }}>{svc === "anthropic" ? "🤖 Anthropic AI" : "🔍 Apify Search"}</span>
                  <span className="font-mono font-bold" style={{ color: "#292524" }}>{fmt(usd)}</span>
                </div>
              ))}
            </div>
            {/* By operation */}
            <div>
              <p className="text-xs font-bold mb-2" style={{ color: "#78614E" }}>
                <Search className="w-3 h-3 inline mr-1" />Pe operațiune
              </p>
              {Object.entries(costs30d.by_operation)
                .sort(([,a], [,b]) => b - a)
                .slice(0, 8)
                .map(([op, usd]) => (
                <div key={op} className="flex justify-between text-xs py-1"
                  style={{ borderBottom: "1px solid rgba(245,215,160,0.1)" }}>
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
