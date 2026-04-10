"use client";
import { useState } from "react";
import Header from "@/components/layout/Header";
import { TrendingUp, DollarSign, Users, Clock, BarChart3, Download } from "lucide-react";

const card = { backgroundColor: "#FFFCF7", border: "1px solid rgba(245,215,160,0.25)", borderRadius: 12 };
const inp: React.CSSProperties = { border: "1px solid rgba(245,215,160,0.3)", backgroundColor: "white", color: "#292524", borderRadius: 8, padding: "8px 12px", fontSize: 14, outline: "none", width: "100%" };

function fmtCurrency(n: number) { return "$" + Math.round(n).toLocaleString("en-US"); }
function fmtNum(n: number) { return n >= 1e6 ? (n/1e6).toFixed(1)+"M" : n >= 1e3 ? (n/1e3).toFixed(1)+"K" : String(Math.round(n)); }

export default function ROICalculatorPage() {
  const [client, setClient] = useState("");
  const [inputs, setInputs] = useState({
    followersStart: 1000, followersEnd: 5000,
    engagementRate: 3.5,
    leadsGenerated: 50,
    avgOrderValue: 200,
    conversionRate: 5,
    hoursPerMonth: 20,
    hourlyRate: 50,
    adSpend: 0,
    monthlyRetainer: 500,
  });

  const f = (k: keyof typeof inputs) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setInputs(p => ({ ...p, [k]: parseFloat(e.target.value) || 0 }));

  // Calculations
  const followersGained = inputs.followersEnd - inputs.followersStart;
  const followersGrowthPct = inputs.followersStart > 0 ? ((followersGained / inputs.followersStart) * 100) : 0;
  const revenueFromLeads = (inputs.leadsGenerated * inputs.conversionRate / 100) * inputs.avgOrderValue;
  const agencyCost = (inputs.hoursPerMonth * inputs.hourlyRate) + inputs.adSpend + inputs.monthlyRetainer;
  const roi = agencyCost > 0 ? ((revenueFromLeads - agencyCost) / agencyCost * 100) : 0;
  const timeSavedHours = inputs.hoursPerMonth * 0.6; // agency saves ~60% of time client would spend
  const timeSavedValue = timeSavedHours * 25; // client's estimated hourly value $25
  const totalValue = revenueFromLeads + timeSavedValue;
  const roiMultiple = agencyCost > 0 ? (totalValue / agencyCost) : 0;

  const downloadReport = () => {
    const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>ROI Report — ${client || "Client"}</title>
<style>body{font-family:Arial,sans-serif;max-width:700px;margin:40px auto;padding:40px;color:#292524}
h1{color:#F59E0B}h2{color:#292524;font-size:16px;margin-top:32px}
.kpi{display:grid;grid-template-columns:repeat(3,1fr);gap:16px;margin:24px 0}
.kpi-card{background:#FFF8F0;border:1px solid #F5D7A0;border-radius:12px;padding:16px;text-align:center}
.kpi-value{font-size:24px;font-weight:bold;color:#F59E0B}
.kpi-label{font-size:12px;color:#A8967E;margin-top:4px}
table{width:100%;border-collapse:collapse;margin:16px 0}
th{text-align:left;padding:8px 12px;background:#FFF8F0;font-size:12px;color:#A8967E;border-bottom:2px solid #F5D7A0}
td{padding:8px 12px;border-bottom:1px solid rgba(245,215,160,0.3);font-size:13px}
.highlight{color:#10B981;font-weight:bold}
</style></head><body>
<h1>📊 ROI Report${client ? ` — ${client}` : ""}</h1>
<p style="color:#A8967E;font-size:13px">Generat: ${new Date().toLocaleDateString("ro-RO", { day: "numeric", month: "long", year: "numeric" })}</p>
<div class="kpi">
  <div class="kpi-card"><div class="kpi-value">${followersGrowthPct.toFixed(1)}%</div><div class="kpi-label">Creștere Followers</div></div>
  <div class="kpi-card"><div class="kpi-value" style="color:#10B981">${roiMultiple.toFixed(1)}x</div><div class="kpi-label">ROI Multiplier</div></div>
  <div class="kpi-card"><div class="kpi-value">${fmtCurrency(totalValue)}</div><div class="kpi-label">Valoare totală generată</div></div>
</div>
<h2>Detalii calcul</h2>
<table><thead><tr><th>Metric</th><th>Valoare</th></tr></thead><tbody>
<tr><td>Followeri câștigați</td><td class="highlight">+${fmtNum(followersGained)}</td></tr>
<tr><td>Leads generate</td><td>${inputs.leadsGenerated}</td></tr>
<tr><td>Conversie estimată (${inputs.conversionRate}%)</td><td>${Math.round(inputs.leadsGenerated * inputs.conversionRate / 100)} clienți</td></tr>
<tr><td>Valoare medie comandă</td><td>${fmtCurrency(inputs.avgOrderValue)}</td></tr>
<tr><td>Venituri din leads</td><td class="highlight">${fmtCurrency(revenueFromLeads)}</td></tr>
<tr><td>Timp economisit client (${timeSavedHours.toFixed(0)}h × $25/h)</td><td class="highlight">${fmtCurrency(timeSavedValue)}</td></tr>
<tr><td><strong>Valoare totală generată</strong></td><td class="highlight" style="font-size:15px">${fmtCurrency(totalValue)}</td></tr>
<tr><td>Cost total agenție/lună</td><td style="color:#EF4444">${fmtCurrency(agencyCost)}</td></tr>
<tr><td><strong>ROI net</strong></td><td class="highlight" style="font-size:15px">${roi.toFixed(0)}% (${roiMultiple.toFixed(1)}x)</td></tr>
</tbody></table>
<p style="margin-top:32px;font-size:12px;color:#A8967E">Generat de MarketHub Pro · markethubpromo.com</p>
</body></html>`;
    const blob = new Blob([html], { type: "text/html" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url;
    a.download = `ROI_Report_${(client || "Client").replace(/\s+/g, "_")}.html`;
    a.click(); URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen" style={{ backgroundColor: "#FAFAF8" }}>
      <Header title="ROI Calculator" subtitle="Demonstrează valoarea concretă a serviciilor tale clienților" />
      <div className="p-4 max-w-3xl mx-auto space-y-4">

        {/* Client name */}
        <div className="flex gap-2 items-center">
          <input value={client} onChange={e => setClient(e.target.value)} placeholder="Numele clientului (opțional)"
            className="flex-1 rounded-xl px-3 py-2.5 text-sm outline-none" style={{ ...inp, maxWidth: 300 }} />
          <button type="button" onClick={downloadReport}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold"
            style={{ backgroundColor: "#6366F1", color: "white" }}>
            <Download className="w-4 h-4" /> Export HTML
          </button>
        </div>

        <div className="grid md:grid-cols-2 gap-4">
          {/* Inputs */}
          <div className="space-y-3">
            <div className="rounded-2xl p-4 space-y-3" style={card}>
              <div className="flex items-center gap-2"><Users className="w-4 h-4" style={{ color: "#E1306C" }} /><p className="font-bold text-sm" style={{ color: "#292524" }}>Social Media Growth</p></div>
              {[["followersStart", "Followeri start"], ["followersEnd", "Followeri end"], ["engagementRate", "Engagement rate (%)"], ["leadsGenerated", "Leads generate/lună"]].map(([k, l]) => (
                <div key={k}><label className="block text-xs font-medium mb-1" style={{ color: "#78614E" }}>{l}</label><input type="number" value={(inputs as any)[k] || ""} onChange={f(k as any)} style={inp} /></div>
              ))}
            </div>

            <div className="rounded-2xl p-4 space-y-3" style={card}>
              <div className="flex items-center gap-2"><DollarSign className="w-4 h-4" style={{ color: "#10B981" }} /><p className="font-bold text-sm" style={{ color: "#292524" }}>Venituri Client</p></div>
              {[["avgOrderValue", "Valoare medie comandă ($)"], ["conversionRate", "Rată conversie leads (%)"]].map(([k, l]) => (
                <div key={k}><label className="block text-xs font-medium mb-1" style={{ color: "#78614E" }}>{l}</label><input type="number" value={(inputs as any)[k] || ""} onChange={f(k as any)} style={inp} /></div>
              ))}
            </div>

            <div className="rounded-2xl p-4 space-y-3" style={card}>
              <div className="flex items-center gap-2"><Clock className="w-4 h-4" style={{ color: "#6366F1" }} /><p className="font-bold text-sm" style={{ color: "#292524" }}>Costul Agenției</p></div>
              {[["hoursPerMonth", "Ore lucrate/lună"], ["hourlyRate", "Tarif orar ($)"], ["adSpend", "Ad spend ($)"], ["monthlyRetainer", "Retainer lunar ($)"]].map(([k, l]) => (
                <div key={k}><label className="block text-xs font-medium mb-1" style={{ color: "#78614E" }}>{l}</label><input type="number" value={(inputs as any)[k] || ""} onChange={f(k as any)} style={inp} /></div>
              ))}
            </div>
          </div>

          {/* Results */}
          <div className="space-y-3">
            <div className="rounded-2xl p-5 space-y-4" style={{ ...card, border: `1px solid ${roi >= 0 ? "rgba(16,185,129,0.3)" : "rgba(239,68,68,0.2)"}` }}>
              <p className="font-bold text-sm" style={{ color: "#292524" }}>Rezultate calculate</p>

              {[
                { label: "Followeri câștigați", value: `+${fmtNum(followersGained)} (${followersGrowthPct.toFixed(1)}%)`, color: "#E1306C" },
                { label: "Venituri din leads", value: fmtCurrency(revenueFromLeads), color: "#10B981" },
                { label: "Timp economisit client", value: `${timeSavedHours.toFixed(0)}h/lună`, color: "#6366F1" },
                { label: "Valoare timp economisit", value: fmtCurrency(timeSavedValue), color: "#6366F1" },
                { label: "Valoare totală generată", value: fmtCurrency(totalValue), color: "#10B981" },
                { label: "Cost total agenție", value: fmtCurrency(agencyCost), color: "#EF4444" },
              ].map(s => (
                <div key={s.label} className="flex items-center justify-between">
                  <span className="text-sm" style={{ color: "#78614E" }}>{s.label}</span>
                  <span className="font-bold text-sm" style={{ color: s.color }}>{s.value}</span>
                </div>
              ))}

              <div className="pt-3 border-t" style={{ borderColor: "rgba(245,215,160,0.3)" }}>
                <div className="text-center">
                  <p className="text-4xl font-bold" style={{ color: roi >= 0 ? "#10B981" : "#EF4444" }}>{roiMultiple.toFixed(1)}x</p>
                  <p className="text-sm mt-1" style={{ color: "#A8967E" }}>ROI Multiplier</p>
                  <p className="text-lg font-bold mt-1" style={{ color: roi >= 0 ? "#10B981" : "#EF4444" }}>
                    {roi >= 0 ? "+" : ""}{roi.toFixed(0)}% ROI net
                  </p>
                </div>
              </div>
            </div>

            {/* Summary text */}
            <div className="rounded-xl p-4 text-sm" style={{ backgroundColor: "rgba(245,158,11,0.05)", border: "1px solid rgba(245,158,11,0.2)", color: "#78614E", lineHeight: 1.7 }}>
              <strong style={{ color: "#292524" }}>Concluzie pentru client:</strong><br />
              Investind <strong>{fmtCurrency(agencyCost)}/lună</strong> în serviciile noastre, ai generat o valoare totală de <strong style={{ color: "#10B981" }}>{fmtCurrency(totalValue)}</strong>, cu un ROI de <strong style={{ color: "#10B981" }}>{roiMultiple.toFixed(1)}x</strong>. Ai câștigat <strong>+{fmtNum(followersGained)} followeri</strong> și <strong>{inputs.leadsGenerated} leads</strong> noi.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
