"use client";

import { useState, useEffect } from "react";
import Header from "@/components/layout/Header";
import { formatNumber } from "@/lib/utils";
import { Bell, Plus, Trash2, TrendingUp, Zap } from "lucide-react";

interface Alert {
  id: string;
  keyword: string;
  createdAt: string;
}

interface YTVideo {
  id: string;
  title: string;
  channel: string;
  views: number;
  likes: number;
  comments: number;
}

export default function AlertsPage() {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [input, setInput] = useState("");
  const [ytVideos, setYtVideos] = useState<YTVideo[]>([]);

  useEffect(() => {
    const saved = localStorage.getItem("mh_alerts");
    if (saved) setAlerts(JSON.parse(saved));

    fetch("/api/youtube/trending?region=RO&max=12")
      .then(r => r.json())
      .then(d => { if (Array.isArray(d)) setYtVideos(d); })
      .catch(() => {});
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

  // Match alert keywords to real YouTube trending videos
  const matchedAlerts = alerts.map(alert => {
    const match = ytVideos.find(v =>
      v.title.toLowerCase().includes(alert.keyword.toLowerCase()) ||
      v.channel.toLowerCase().includes(alert.keyword.toLowerCase())
    );
    return { alert, video: match };
  });

  // Extract unique keywords from trending video titles as suggestions
  const trendingSuggestions = ytVideos
    .map(v => {
      const words = v.title
        .replace(/[^\w\s]/g, " ")
        .split(/\s+/)
        .filter(w => w.length > 4)
        .slice(0, 2);
      return { keyword: words[0] || v.channel, views: v.views, video: v };
    })
    .filter(s => s.keyword)
    .slice(0, 10);

  return (
    <div>
      <Header title="Trending Alerts" subtitle="Track keywords and get alerted when they trend" />

      <div className="p-6 space-y-6">
        {/* Add Alert */}
        <div className="rounded-2xl p-6" style={{ backgroundColor: "#FFFCF7", border: "1px solid rgba(245,215,160,0.25)", boxShadow: "0 1px 3px rgba(120,97,78,0.08)" }}>
          <div className="flex items-center gap-2 mb-4">
            <Zap className="w-5 h-5" style={{ color: "#F59E0B" }} />
            <h3 className="font-semibold" style={{ color: "#292524" }}>Add New Alert</h3>
          </div>
          <p className="text-sm mb-4" style={{ color: "#A8967E" }}>
            Enter a keyword (ex: "AI", "football", "gaming") and you'll be notified when it trends on YouTube.
          </p>
          <div className="flex gap-2">
            <input
              type="text"
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key === "Enter" && addAlert()}
              placeholder="Ex: gaming, AI, beauty, football..."
              className="flex-1 px-4 py-2.5 text-sm rounded-lg focus:outline-none"
              style={{ border: "1px solid rgba(245,215,160,0.35)", backgroundColor: "#FFF8F0", color: "#292524" }}
              onFocus={e => (e.currentTarget.style.border = "1px solid #F59E0B")}
              onBlur={e => (e.currentTarget.style.border = "1px solid rgba(245,215,160,0.35)")}
            />
            <button
              type="button"
              onClick={addAlert}
              className="flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-bold"
              style={{ backgroundColor: "#F59E0B", color: "#1C1814" }}
            >
              <Plus className="w-4 h-4" />
              Add
            </button>
          </div>
        </div>

        {/* Active Alerts */}
        {alerts.length === 0 ? (
          <div className="rounded-2xl p-12 text-center" style={{ backgroundColor: "#FFFCF7", border: "1px dashed rgba(245,215,160,0.4)" }}>
            <Bell className="w-10 h-10 mx-auto mb-3" style={{ color: "rgba(245,215,160,0.5)" }} />
            <p className="font-semibold" style={{ color: "#A8967E" }}>No active alerts</p>
            <p className="text-sm mt-1" style={{ color: "#C4AA8A" }}>Add a keyword above to start monitoring</p>
          </div>
        ) : (
          <div className="space-y-3">
            <h3 className="font-semibold" style={{ color: "#292524" }}>Active alerts ({alerts.length})</h3>
            {matchedAlerts.map(({ alert, video }) => (
              <div
                key={alert.id}
                className="rounded-xl p-4"
                style={{ backgroundColor: "#FFFCF7", border: "1px solid rgba(245,215,160,0.25)", boxShadow: "0 1px 3px rgba(120,97,78,0.06)" }}
              >
                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0" style={{ backgroundColor: video ? "rgba(255,0,0,0.1)" : "rgba(245,215,160,0.15)" }}>
                      <Bell className="w-4 h-4" style={{ color: video ? "#cc0000" : "#C4AA8A" }} />
                    </div>
                    <div className="min-w-0">
                      <p className="font-semibold text-sm" style={{ color: "#292524" }}>#{alert.keyword}</p>
                      <p className="text-xs" style={{ color: "#C4AA8A" }}>Added {alert.createdAt}</p>
                    </div>
                  </div>

                  {video ? (
                    <div className="flex items-center gap-4 flex-shrink-0">
                      <div className="text-right hidden sm:block">
                        <p className="text-xs" style={{ color: "#A8967E" }}>Video found</p>
                        <p className="text-xs font-semibold max-w-[140px] truncate" style={{ color: "#292524" }}>{video.title}</p>
                      </div>
                      <div className="text-right hidden sm:block">
                        <p className="text-xs" style={{ color: "#A8967E" }}>Views</p>
                        <p className="text-sm font-bold" style={{ color: "#292524" }}>{formatNumber(video.views)}</p>
                      </div>
                      <span className="flex items-center gap-1 text-sm font-bold px-2.5 py-1 rounded-full text-emerald-600"
                        style={{ backgroundColor: "rgba(16,185,129,0.08)" }}
                      >
                        <TrendingUp className="w-3.5 h-3.5" />
                        Trending!
                      </span>
                    </div>
                  ) : (
                    <span className="text-xs px-2.5 py-1 rounded-full flex-shrink-0" style={{ backgroundColor: "rgba(245,215,160,0.15)", color: "#A8967E" }}>
                      Monitoring active
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

        {/* Trending Now suggestions — real YouTube data */}
        <div>
          <div className="flex items-center gap-2 mb-3">
            <h3 className="font-semibold" style={{ color: "#292524" }}>Trending now on YouTube RO - add quickly</h3>
            <span className="text-xs px-2 py-0.5 rounded-full" style={{ backgroundColor: "rgba(255,0,0,0.08)", color: "#cc0000" }}>Live</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {trendingSuggestions.map((s, i) => {
              const alreadyAdded = alerts.some(a => a.keyword.toLowerCase() === s.keyword.toLowerCase());
              return (
                <button
                  key={i}
                  type="button"
                  disabled={alreadyAdded}
                  title={s.video.title}
                  onClick={() => {
                    if (!alreadyAdded) saveAlerts([...alerts, { id: Date.now().toString(), keyword: s.keyword, createdAt: new Date().toLocaleDateString("ro-RO") }]);
                  }}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-colors"
                  style={alreadyAdded
                    ? { backgroundColor: "rgba(245,215,160,0.15)", color: "#C4AA8A", cursor: "not-allowed" }
                    : { backgroundColor: "rgba(255,0,0,0.06)", color: "#cc0000", border: "1px solid rgba(255,0,0,0.15)", cursor: "pointer" }
                  }
                >
                  <TrendingUp className="w-3 h-3" />
                  {s.keyword}
                  <span style={{ color: "#A8967E" }}>{formatNumber(s.views)} views</span>
                </button>
              );
            })}
            {trendingSuggestions.length === 0 && (
              <p className="text-xs" style={{ color: "#C4AA8A" }}>Loading...</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
