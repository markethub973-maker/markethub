"use client";

import Header from "@/components/layout/Header";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";
import { CheckCircle, XCircle } from "lucide-react";

// Date publice actualizate — surse: G2, Capterra, site-uri oficiale (martie 2026)
const competitors = [
  { name: "Sprout Social", pricing: "$249/mo", features: ["Instagram", "Facebook", "YouTube", "TikTok"], strength: "Management", g2Rating: 4.4, capterra: 4.4 },
  { name: "Hootsuite", pricing: "$99/mo", features: ["Instagram", "Facebook", "YouTube", "TikTok"], strength: "Scheduling", g2Rating: 4.2, capterra: 4.4 },
  { name: "Brandwatch", pricing: "$1000/mo", features: ["Instagram", "Facebook", "YouTube", "TikTok"], strength: "Enterprise Analytics", g2Rating: 4.4, capterra: 4.2 },
  { name: "Socialbakers", pricing: "$200/mo", features: ["Instagram", "Facebook"], strength: "AI Analytics", g2Rating: 4.0, capterra: 4.1 },
  { name: "MarketHub Pro", pricing: "$49/mo", features: ["Instagram", "Facebook", "YouTube", "TikTok"], strength: "Valoare + Pret", g2Rating: null, capterra: null },
];

const pricingData = competitors.map(c => ({
  name: c.name,
  price: parseInt(c.pricing.replace(/[^0-9]/g, ""), 10),
}));

const COLORS = ["#94a3b8", "#78350F", "#92400E", "#D97706", "#F59E0B"];

const tooltipStyle = { fontSize: 12, borderRadius: 8, border: "1px solid rgba(245,215,160,0.4)", backgroundColor: "#FFFCF7", color: "#292524" };

export default function CompetitorsPage() {
  return (
    <div>
      <Header title="Competitor Analysis" subtitle="Comparatie cu instrumente de pe piata" />

      <div className="p-6 space-y-6">

        {/* Disclaimer */}
        <div className="rounded-xl px-4 py-3 flex items-start gap-3" style={{ backgroundColor: "rgba(245,215,160,0.12)", border: "1px solid rgba(245,215,160,0.3)" }}>
          <span className="text-sm">📊</span>
          <p className="text-xs" style={{ color: "#78614E" }}>
            <b>Date publice</b> — Preturile si feature-urile sunt de pe site-urile oficiale, G2.com si Capterra.com (martie 2026).
            Rating-urile G2/Capterra sunt publice si verificabile.
          </p>
        </div>

        {/* Pricing Comparison Chart */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="rounded-xl p-5" style={{ backgroundColor: "#FFFCF7", border: "1px solid rgba(245,215,160,0.25)", boxShadow: "0 1px 3px rgba(120,97,78,0.08)" }}>
            <h3 className="font-semibold mb-1" style={{ color: "#292524" }}>Pret lunar (USD)</h3>
            <p className="text-xs mb-4" style={{ color: "#A8967E" }}>Comparatie preturi de pornire — surse oficiale</p>
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={pricingData} layout="vertical" margin={{ left: 40, right: 20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(245,215,160,0.3)" horizontal={false} />
                <XAxis type="number" tick={{ fontSize: 11, fill: "#C4AA8A" }} tickFormatter={(v) => "$" + v} />
                <YAxis type="category" dataKey="name" tick={{ fontSize: 12, fill: "#5C4A35" }} width={110} />
                <Tooltip contentStyle={tooltipStyle} formatter={(v) => ["$" + (v ?? 0) + "/mo", "Pret"]} />
                <Bar dataKey="price" radius={[0, 4, 4, 0]}>
                  {pricingData.map((_, i) => (
                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="rounded-xl p-5" style={{ backgroundColor: "#FFFCF7", border: "1px solid rgba(245,215,160,0.25)", boxShadow: "0 1px 3px rgba(120,97,78,0.08)" }}>
            <h3 className="font-semibold mb-1" style={{ color: "#292524" }}>Rating G2 / Capterra</h3>
            <p className="text-xs mb-4" style={{ color: "#A8967E" }}>Scor public de review-uri (din 5)</p>
            <div className="space-y-4 mt-6">
              {competitors.map((c, i) => (
                <div key={c.name} className="flex items-center gap-3">
                  <span className="text-sm font-semibold w-28 truncate" style={{ color: c.name === "MarketHub Pro" ? "#F59E0B" : "#5C4A35" }}>
                    {c.name} {c.name === "MarketHub Pro" && "⭐"}
                  </span>
                  <div className="flex-1">
                    <div className="flex gap-2 items-center">
                      <span className="text-xs w-8" style={{ color: "#A8967E" }}>G2</span>
                      <div className="flex-1 h-2 rounded-full overflow-hidden" style={{ backgroundColor: "rgba(245,215,160,0.2)" }}>
                        <div className="h-full rounded-full" style={{ width: c.g2Rating ? (c.g2Rating / 5 * 100) + "%" : "0%", backgroundColor: "#F59E0B" }} />
                      </div>
                      <span className="text-xs font-bold w-6" style={{ color: "#5C4A35" }}>{c.g2Rating || "—"}</span>
                    </div>
                    <div className="flex gap-2 items-center mt-1">
                      <span className="text-xs w-8" style={{ color: "#A8967E" }}>Cap</span>
                      <div className="flex-1 h-2 rounded-full overflow-hidden" style={{ backgroundColor: "rgba(245,215,160,0.2)" }}>
                        <div className="h-full rounded-full" style={{ width: c.capterra ? (c.capterra / 5 * 100) + "%" : "0%", backgroundColor: "#D97706" }} />
                      </div>
                      <span className="text-xs font-bold w-6" style={{ color: "#5C4A35" }}>{c.capterra || "nou"}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Feature Comparison Table */}
        <div className="rounded-xl overflow-hidden" style={{ backgroundColor: "#FFFCF7", border: "1px solid rgba(245,215,160,0.25)", boxShadow: "0 1px 3px rgba(120,97,78,0.08)" }}>
          <div className="px-5 py-4" style={{ borderBottom: "1px solid rgba(245,215,160,0.2)" }}>
            <h3 className="font-semibold" style={{ color: "#292524" }}>Comparatie Functionalitati</h3>
            <p className="text-xs mt-0.5" style={{ color: "#A8967E" }}>Feature-uri si platforme suportate</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-xs uppercase tracking-wide" style={{ backgroundColor: "rgba(245,215,160,0.1)", color: "#A8967E" }}>
                  <th className="text-left px-5 py-3">Tool</th>
                  <th className="text-center px-3 py-3">Pret</th>
                  <th className="text-center px-3 py-3">YouTube</th>
                  <th className="text-center px-3 py-3">Instagram</th>
                  <th className="text-center px-3 py-3">Facebook</th>
                  <th className="text-center px-3 py-3">TikTok</th>
                  <th className="text-center px-5 py-3">Punct forte</th>
                </tr>
              </thead>
              <tbody>
                {competitors.map((c, i) => {
                  const hasYouTube = c.features.includes("YouTube");
                  const hasInstagram = c.features.includes("Instagram");
                  const hasFacebook = c.features.includes("Facebook");
                  const hasTikTok = c.features.includes("TikTok");
                  const isUs = c.name === "MarketHub Pro";

                  return (
                    <tr
                      key={c.name}
                      className="transition-colors"
                      style={{ borderTop: "1px solid rgba(245,215,160,0.15)", backgroundColor: isUs ? "rgba(245,158,11,0.06)" : "transparent" }}
                      onMouseEnter={e => { if (!isUs) e.currentTarget.style.backgroundColor = "rgba(245,215,160,0.07)"; }}
                      onMouseLeave={e => { if (!isUs) e.currentTarget.style.backgroundColor = "transparent"; }}
                    >
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-2">
                          <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                          <span className="font-semibold" style={{ color: isUs ? "#F59E0B" : "#3D2E1E" }}>
                            {c.name} {isUs && "⭐"}
                          </span>
                        </div>
                      </td>
                      <td className="px-3 py-3 text-center">
                        <span className="text-xs font-medium px-2 py-0.5 rounded" style={{ backgroundColor: "rgba(245,215,160,0.15)", color: "#78614E" }}>
                          {c.pricing}
                        </span>
                      </td>
                      {[hasYouTube, hasInstagram, hasFacebook, hasTikTok].map((has, j) => (
                        <td key={j} className="px-3 py-3 text-center">
                          {has ? (
                            <CheckCircle className="w-4 h-4 text-emerald-500 mx-auto" />
                          ) : (
                            <XCircle className="w-4 h-4 mx-auto" style={{ color: "rgba(245,215,160,0.5)" }} />
                          )}
                        </td>
                      ))}
                      <td className="px-5 py-3 text-center">
                        <span className="text-xs font-medium px-2 py-0.5 rounded-full" style={{ backgroundColor: "rgba(245,158,11,0.12)", color: "#D97706" }}>
                          {c.strength}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="rounded-xl p-5" style={{ backgroundColor: "#FFFCF7", border: "1px solid rgba(245,215,160,0.25)", boxShadow: "0 1px 3px rgba(120,97,78,0.08)" }}>
            <h4 className="font-semibold mb-3" style={{ color: "#292524" }}>Avantajele noastre</h4>
            <ul className="space-y-2 text-sm" style={{ color: "#78614E" }}>
              {["Cel mai mic pret de pe piata ($49/mo)", "Toate 4 platformele incluse", "PDF Rapoarte automate pe email", "Instagram Competitor Tracker"].map((a) => (
                <li key={a} className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                  {a}
                </li>
              ))}
            </ul>
          </div>
          <div className="rounded-xl p-5" style={{ backgroundColor: "#FFFCF7", border: "1px solid rgba(245,215,160,0.25)", boxShadow: "0 1px 3px rgba(120,97,78,0.08)" }}>
            <h4 className="font-semibold mb-3" style={{ color: "#292524" }}>Ce le lipseste</h4>
            <ul className="space-y-2 text-sm" style={{ color: "#78614E" }}>
              {["Socialbakers: Fara YouTube/TikTok", "Brandwatch: Minim $1000/luna", "Hootsuite: Analytics limitat pe free", "Sprout Social: Pret ridicat pentru SMB"].map((a) => (
                <li key={a} className="flex items-center gap-2">
                  <XCircle className="w-4 h-4 text-red-400 flex-shrink-0" />
                  {a}
                </li>
              ))}
            </ul>
          </div>
          <div className="rounded-xl p-5 text-white" style={{ background: "linear-gradient(135deg, #F59E0B, #92400E)", boxShadow: "0 4px 12px rgba(245,158,11,0.25)" }}>
            <h4 className="font-bold text-lg mb-2">MarketHub Pro</h4>
            <p className="text-sm mb-4" style={{ color: "rgba(255,255,255,0.8)" }}>
              Cea mai accesibila platforma de analytics social media cu suport complet multi-platform.
            </p>
            <div className="text-3xl font-black">$49</div>
            <div className="text-xs mt-0.5" style={{ color: "rgba(255,255,255,0.7)" }}>per luna, toate platformele incluse</div>
            <div className="mt-3 text-sm font-semibold" style={{ color: "rgba(255,255,200,1)" }}>5x mai ieftin decat media pietei</div>
          </div>
        </div>
      </div>
    </div>
  );
}
