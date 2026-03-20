"use client";

import { useState, useEffect } from "react";
import Header from "@/components/layout/Header";
import { trendingTopics } from "@/lib/mockData";
import { formatNumber } from "@/lib/utils";
import { Bell, Plus, Trash2, TrendingUp, TrendingDown, Zap } from "lucide-react";

interface Alert {
  id: string;
  keyword: string;
  createdAt: string;
}

export default function AlertsPage() {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [input, setInput] = useState("");

  useEffect(() => {
    const saved = localStorage.getItem("mh_alerts");
    if (saved) setAlerts(JSON.parse(saved));
  }, []);

  const saveAlerts = (updated: Alert[]) => {
    setAlerts(updated);
    localStorage.setItem("mh_alerts", JSON.stringify(updated));
  };

  const addAlert = () => {
    const kw = input.trim();
    if (!kw || alerts.find(a => a.keyword.toLowerCase() === kw.toLowerCase())) return;
    saveAlerts([...alerts, { id: Date.now().toString(), keyword: kw, createdAt: new Date().toLocaleDateString("ro-RO") }]);
    setInput("");
  };

  const removeAlert = (id: string) => saveAlerts(alerts.filter(a => a.id !== id));

  // Match alert keywords to trending topics
  const matchedTopics = alerts.map(alert => {
    const match = trendingTopics.find(t =>
      t.keyword.toLowerCase().includes(alert.keyword.toLowerCase()) ||
      alert.keyword.toLowerCase().includes(t.keyword.replace("#", "").toLowerCase())
    );
    return { alert, topic: match };
  });

  return (
    <div>
      <Header title="Trending Alerts" subtitle="Urmareste cuvinte cheie si primeste alerte cand devin virale" />

      <div className="p-6 space-y-6">
        {/* Add Alert */}
        <div className="rounded-2xl p-6" style={{ backgroundColor: "#FFFCF7", border: "1px solid rgba(245,215,160,0.25)", boxShadow: "0 1px 3px rgba(120,97,78,0.08)" }}>
          <div className="flex items-center gap-2 mb-4">
            <Zap className="w-5 h-5" style={{ color: "#F59E0B" }} />
            <h3 className="font-semibold" style={{ color: "#292524" }}>Adauga Alerta Noua</h3>
          </div>
          <p className="text-sm mb-4" style={{ color: "#A8967E" }}>
            Introdu un keyword (ex: "AI", "fotbal", "gaming") si vei fi notificat cand trendeaza.
          </p>
          <div className="flex gap-2">
            <input
              type="text"
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key === "Enter" && addAlert()}
              placeholder="Ex: gaming, AI, beauty, fotbal..."
              className="flex-1 px-4 py-2.5 text-sm rounded-lg focus:outline-none"
              style={{ border: "1px solid rgba(245,215,160,0.35)", backgroundColor: "#FFF8F0", color: "#292524" }}
              onFocus={e => (e.currentTarget.style.border = "1px solid #F59E0B")}
              onBlur={e => (e.currentTarget.style.border = "1px solid rgba(245,215,160,0.35)")}
            />
            <button
              type="button"
              onClick={addAlert}
              className="flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-bold transition-opacity"
              style={{ backgroundColor: "#F59E0B", color: "#1C1814" }}
            >
              <Plus className="w-4 h-4" />
              Adauga
            </button>
          </div>
        </div>

        {/* Active Alerts */}
        {alerts.length === 0 ? (
          <div className="rounded-2xl p-12 text-center" style={{ backgroundColor: "#FFFCF7", border: "1px dashed rgba(245,215,160,0.4)" }}>
            <Bell className="w-10 h-10 mx-auto mb-3" style={{ color: "rgba(245,215,160,0.5)" }} />
            <p className="font-semibold" style={{ color: "#A8967E" }}>Nicio alerta activa</p>
            <p className="text-sm mt-1" style={{ color: "#C4AA8A" }}>Adauga un keyword mai sus pentru a incepe monitorizarea</p>
          </div>
        ) : (
          <div className="space-y-3">
            <h3 className="font-semibold" style={{ color: "#292524" }}>Alerte active ({alerts.length})</h3>
            {matchedTopics.map(({ alert, topic }) => (
              <div
                key={alert.id}
                className="rounded-xl p-4"
                style={{ backgroundColor: "#FFFCF7", border: "1px solid rgba(245,215,160,0.25)", boxShadow: "0 1px 3px rgba(120,97,78,0.06)" }}
              >
                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0" style={{ backgroundColor: topic ? "rgba(245,158,11,0.15)" : "rgba(245,215,160,0.15)" }}>
                      <Bell className="w-4 h-4" style={{ color: topic ? "#F59E0B" : "#C4AA8A" }} />
                    </div>
                    <div className="min-w-0">
                      <p className="font-semibold text-sm" style={{ color: "#292524" }}>#{alert.keyword}</p>
                      <p className="text-xs" style={{ color: "#C4AA8A" }}>Adaugat {alert.createdAt}</p>
                    </div>
                  </div>

                  {topic ? (
                    <div className="flex items-center gap-4 flex-shrink-0">
                      <div className="text-right hidden sm:block">
                        <p className="text-xs" style={{ color: "#A8967E" }}>Vizualizari totale</p>
                        <p className="text-sm font-bold" style={{ color: "#292524" }}>{formatNumber(topic.totalViews)}</p>
                      </div>
                      <div className="text-right hidden sm:block">
                        <p className="text-xs" style={{ color: "#A8967E" }}>Videoclipuri</p>
                        <p className="text-sm font-bold" style={{ color: "#292524" }}>{formatNumber(topic.videoCount)}</p>
                      </div>
                      <span className={`flex items-center gap-1 text-sm font-bold px-2.5 py-1 rounded-full ${topic.growthPercent >= 0 ? "text-emerald-600" : "text-red-500"}`}
                        style={{ backgroundColor: topic.growthPercent >= 0 ? "rgba(16,185,129,0.08)" : "rgba(239,68,68,0.08)" }}
                      >
                        {topic.growthPercent >= 0 ? <TrendingUp className="w-3.5 h-3.5" /> : <TrendingDown className="w-3.5 h-3.5" />}
                        {topic.growthPercent >= 0 ? "+" : ""}{topic.growthPercent}%
                      </span>
                    </div>
                  ) : (
                    <span className="text-xs px-2.5 py-1 rounded-full flex-shrink-0" style={{ backgroundColor: "rgba(245,215,160,0.15)", color: "#A8967E" }}>
                      Monitorizare activa
                    </span>
                  )}

                  <button
                    type="button"
                    onClick={() => removeAlert(alert.id)}
                    className="p-1.5 rounded-lg flex-shrink-0 transition-colors"
                    style={{ color: "#C4AA8A" }}
                    onMouseEnter={e => { e.currentTarget.style.backgroundColor = "rgba(239,68,68,0.08)"; e.currentTarget.style.color = "#ef4444"; }}
                    onMouseLeave={e => { e.currentTarget.style.backgroundColor = "transparent"; e.currentTarget.style.color = "#C4AA8A"; }}
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Trending Now - suggestions */}
        <div>
          <h3 className="font-semibold mb-3" style={{ color: "#292524" }}>Topicuri trending acum — adauga rapid</h3>
          <div className="flex flex-wrap gap-2">
            {trendingTopics.map(t => {
              const alreadyAdded = alerts.some(a => a.keyword.toLowerCase() === t.keyword.replace("#", "").toLowerCase());
              return (
                <button
                  key={t.id}
                  type="button"
                  disabled={alreadyAdded}
                  onClick={() => {
                    const kw = t.keyword.replace("#", "");
                    if (!alreadyAdded) saveAlerts([...alerts, { id: Date.now().toString(), keyword: kw, createdAt: new Date().toLocaleDateString("ro-RO") }]);
                  }}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-colors"
                  style={alreadyAdded
                    ? { backgroundColor: "rgba(245,215,160,0.15)", color: "#C4AA8A", cursor: "not-allowed" }
                    : { backgroundColor: "rgba(245,158,11,0.12)", color: "#D97706", border: "1px solid rgba(245,158,11,0.25)", cursor: "pointer" }
                  }
                >
                  <TrendingUp className="w-3 h-3" />
                  {t.keyword}
                  <span style={{ color: "#16a34a" }}>+{t.growthPercent}%</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
