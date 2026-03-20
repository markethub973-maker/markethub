"use client";

import Header from "@/components/layout/Header";
import { Check, Zap, Star, Building2 } from "lucide-react";

const plans = [
  {
    name: "Free",
    price: "$0",
    period: "pentru totdeauna",
    icon: <Zap className="w-5 h-5" />,
    current: true,
    color: "#A8967E",
    features: [
      "10 canale urmarite",
      "YouTube Analytics",
      "30 zile istoric",
      "Export CSV",
      "Alerte trending (5 keywords)",
    ],
    missing: ["TikTok & Instagram", "Comparatii nelimitate", "API access", "Suport prioritar"],
  },
  {
    name: "Pro",
    price: "$29",
    period: "/ luna",
    icon: <Star className="w-5 h-5" />,
    current: false,
    color: "#F59E0B",
    highlight: true,
    features: [
      "Canale nelimitate",
      "YouTube + TikTok + Instagram",
      "1 an istoric",
      "Export CSV + PDF",
      "Alerte trending nelimitate",
      "Comparatii avansate",
      "Demographics detaliate",
      "Rapoarte saptamanale email",
    ],
    missing: [],
  },
  {
    name: "Enterprise",
    price: "$99",
    period: "/ luna",
    icon: <Building2 className="w-5 h-5" />,
    current: false,
    color: "#78614E",
    features: [
      "Tot ce include Pro",
      "API access complet",
      "White-label dashboard",
      "Multi-utilizatori (10 conturi)",
      "Manager de cont dedicat",
      "Integrare Slack/Webhook",
      "Date in timp real (live)",
      "SLA 99.9% uptime",
    ],
    missing: [],
  },
];

export default function UpgradePage() {
  return (
    <div>
      <Header title="Upgrade Plan" subtitle="Alege planul potrivit pentru tine" />

      <div className="p-6">
        {/* Hero */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-semibold mb-4" style={{ backgroundColor: "rgba(245,158,11,0.12)", color: "#D97706" }}>
            <Zap className="w-3.5 h-3.5" />
            Upgrade si obtine acces la toate platformele
          </div>
          <h2 className="text-3xl font-black mb-2" style={{ color: "#292524" }}>Planuri simple si transparente</h2>
          <p className="text-sm" style={{ color: "#A8967E" }}>Fara contracte. Anuleaza oricand.</p>
        </div>

        {/* Plans Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl mx-auto">
          {plans.map((plan) => (
            <div
              key={plan.name}
              className="rounded-2xl p-6 flex flex-col"
              style={plan.highlight
                ? { background: "linear-gradient(135deg, #F59E0B, #D97706)", boxShadow: "0 8px 32px rgba(245,158,11,0.35)", color: "white" }
                : { backgroundColor: "#FFFCF7", border: "1px solid rgba(245,215,160,0.25)", boxShadow: "0 1px 3px rgba(120,97,78,0.08)" }
              }
            >
              {plan.highlight && (
                <div className="text-xs font-bold text-center mb-3 py-1 rounded-full" style={{ backgroundColor: "rgba(255,255,255,0.2)" }}>
                  ⭐ POPULAR
                </div>
              )}

              <div className="flex items-center gap-2 mb-4" style={{ color: plan.highlight ? "white" : plan.color }}>
                {plan.icon}
                <span className="font-bold text-lg" style={{ color: plan.highlight ? "white" : "#292524" }}>{plan.name}</span>
                {plan.current && <span className="text-xs px-2 py-0.5 rounded-full ml-auto" style={{ backgroundColor: "rgba(245,215,160,0.2)", color: "#A8967E" }}>Curent</span>}
              </div>

              <div className="mb-6">
                <span className="text-4xl font-black" style={{ color: plan.highlight ? "white" : "#292524" }}>{plan.price}</span>
                <span className="text-sm ml-1" style={{ color: plan.highlight ? "rgba(255,255,255,0.7)" : "#A8967E" }}>{plan.period}</span>
              </div>

              <ul className="space-y-2 flex-1 mb-6">
                {plan.features.map(f => (
                  <li key={f} className="flex items-start gap-2 text-sm">
                    <Check className="w-4 h-4 flex-shrink-0 mt-0.5" style={{ color: plan.highlight ? "rgba(255,255,255,0.9)" : "#16a34a" }} />
                    <span style={{ color: plan.highlight ? "rgba(255,255,255,0.9)" : "#5C4A35" }}>{f}</span>
                  </li>
                ))}
              </ul>

              <button
                type="button"
                className="w-full py-3 rounded-xl text-sm font-bold transition-all"
                style={plan.highlight
                  ? { backgroundColor: "rgba(255,255,255,0.95)", color: "#D97706" }
                  : plan.current
                  ? { backgroundColor: "rgba(245,215,160,0.15)", color: "#A8967E", cursor: "default" }
                  : { backgroundColor: "#F59E0B", color: "#1C1814" }
                }
                disabled={plan.current}
              >
                {plan.current ? "Plan curent" : "Alege " + plan.name}
              </button>
            </div>
          ))}
        </div>

        {/* FAQ */}
        <div className="max-w-2xl mx-auto mt-12 space-y-4">
          <h3 className="text-lg font-bold text-center mb-6" style={{ color: "#292524" }}>Intrebari frecvente</h3>
          {[
            { q: "Pot anula oricand?", a: "Da, poti anula abonamentul in orice moment fara penalitati." },
            { q: "Ce platforme sunt suportate?", a: "Free: YouTube. Pro si Enterprise: YouTube, TikTok, Instagram, Facebook." },
            { q: "Datele sunt reale sau estimate?", a: "YouTube este 100% real. TikTok si Instagram necesita aprobare API (in curs). Demographics sunt estimate bazate pe categoria canalului." },
            { q: "Cum platesc?", a: "Acceptam card de credit/debit. Plata securizata prin Stripe." },
          ].map(item => (
            <div key={item.q} className="rounded-xl p-4" style={{ backgroundColor: "#FFFCF7", border: "1px solid rgba(245,215,160,0.2)" }}>
              <p className="font-semibold text-sm mb-1" style={{ color: "#292524" }}>{item.q}</p>
              <p className="text-sm" style={{ color: "#A8967E" }}>{item.a}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
