"use client";
import { useState, useEffect, useCallback } from "react";
import Header from "@/components/layout/Header";
import { Bell, Settings, RefreshCw, Loader2, Trash2, ExternalLink, Plus, X, Check, Instagram, MessageSquare, Newspaper, Zap, TrendingUp } from "lucide-react";

interface Mention { id: string; keyword: string; platform: string; content: string; author: string; url: string; reach: number; sentiment: string; detected_at: string; }
interface Config { keywords: string[]; platforms: string[]; email: string; active: boolean; notify_email: boolean; }

const card = { backgroundColor: "#FFFCF7", border: "1px solid rgba(245,215,160,0.25)", borderRadius: 12 };
const inp: React.CSSProperties = { border: "1px solid rgba(245,215,160,0.3)", backgroundColor: "white", color: "#292524", borderRadius: 8, padding: "8px 12px", fontSize: 14, outline: "none" };

const PLATFORM_ICONS: Record<string, React.ElementType> = { TikTok: Zap, Instagram: Instagram, Reddit: MessageSquare, News: Newspaper };
const PLATFORM_COLORS: Record<string, string> = { TikTok: "#00F2EA", Instagram: "#E1306C", Reddit: "#FF4500", News: "#6366F1" };
const SENTIMENT_COLORS: Record<string, string> = { positive: "#10B981", neutral: "#A8967E", negative: "#EF4444" };
const ALL_PLATFORMS = ["tiktok", "instagram", "reddit", "news"];

function fmtDate(iso: string) { return new Date(iso).toLocaleDateString("en-GB", { day: "2-digit", month: "short" }) + " " + new Date(iso).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" }); }
function fmtNum(n: number) { return n >= 1e6 ? (n/1e6).toFixed(1)+"M" : n >= 1e3 ? (n/1e3).toFixed(1)+"K" : String(n); }

export default function SocialListeningPage() {
  const [mentions, setMentions] = useState<Mention[]>([]);
  const [config, setConfig] = useState<Config>({ keywords: [], platforms: ALL_PLATFORMS, email: "", active: true, notify_email: true });
  const [loading, setLoading] = useState(true);
  const [scanning, setScanning] = useState(false);
  const [showConfig, setShowConfig] = useState(false);
  const [saving, setSaving] = useState(false);
  const [newKeyword, setNewKeyword] = useState("");
  const [filterPlatform, setFilterPlatform] = useState("all");
  const [filterKeyword, setFilterKeyword] = useState("all");

  const load = useCallback(() => {
    setLoading(true);
    fetch("/api/social-listening").then(r => r.json())
      .then(d => { if (d.mentions) setMentions(d.mentions); if (d.config) setConfig(d.config); })
      .finally(() => setLoading(false));
  }, []);
  useEffect(() => { load(); }, [load]);

  const save = async () => {
    setSaving(true);
    await fetch("/api/social-listening", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(config) });
    setSaving(false); setShowConfig(false);
  };

  const scan = async () => {
    setScanning(true);
    await fetch("/api/social-listening/scan", { method: "POST" }).catch(() => {});
    await new Promise(r => setTimeout(r, 3000));
    await load();
    setScanning(false);
  };

  const del = async (id: string) => {
    await fetch("/api/social-listening", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id }) });
    setMentions(p => p.filter(m => m.id !== id));
  };

  const addKeyword = () => {
    const k = newKeyword.trim();
    if (!k || config.keywords.includes(k)) return;
    setConfig(p => ({ ...p, keywords: [...p.keywords, k] }));
    setNewKeyword("");
  };

  const togglePlatform = (p: string) => setConfig(prev => ({
    ...prev,
    platforms: prev.platforms.includes(p) ? prev.platforms.filter(x => x !== p) : [...prev.platforms, p],
  }));

  const allKeywords = [...new Set(mentions.map(m => m.keyword))];
  const filtered = mentions.filter(m =>
    (filterPlatform === "all" || m.platform.toLowerCase() === filterPlatform.toLowerCase()) &&
    (filterKeyword === "all" || m.keyword === filterKeyword)
  );

  const byPlatform = ALL_PLATFORMS.reduce((acc, p) => {
    acc[p] = mentions.filter(m => m.platform.toLowerCase() === p).length;
    return acc;
  }, {} as Record<string, number>);

  return (
    <div className="min-h-screen" style={{ backgroundColor: "#FAFAF8" }}>
      <Header title="Social Listening" subtitle="Monitor mentions of your brand across all platforms" />
      <div className="p-4 max-w-4xl mx-auto space-y-4">

        {/* Actions */}
        <div className="flex gap-2 flex-wrap">
          <button type="button" onClick={() => setShowConfig(v => !v)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold"
            style={{ ...card, color: "#78614E", boxShadow: "0 1px 3px rgba(120,97,78,0.06)" }}>
            <Settings className="w-4 h-4" /> Configure
          </button>
          <button type="button" onClick={scan} disabled={scanning}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold disabled:opacity-40"
            style={{ background: "linear-gradient(135deg,#6366F1,#4F46E5)", color: "white" }}>
            {scanning ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
            {scanning ? "Scanning..." : "Scan now"}
          </button>
          <span className="flex items-center text-xs ml-auto" style={{ color: "#A8967E" }}>
            🕐 Auto-scan daily at 08:00
          </span>
        </div>

        {/* Config panel */}
        {showConfig && (
          <div className="rounded-2xl p-4 space-y-4" style={{ ...card, border: "1px solid rgba(99,102,241,0.2)" }}>
            <p className="font-bold text-sm" style={{ color: "#292524" }}>⚙️ Social Listening configuration</p>

            {/* Keywords */}
            <div>
              <label className="block text-xs font-medium mb-2" style={{ color: "#78614E" }}>Keywords to monitor (brand, product, competitor)</label>
              <div className="flex flex-wrap gap-1.5 mb-2">
                {config.keywords.map(k => (
                  <span key={k} className="flex items-center gap-1 px-2 py-0.5 rounded-full text-xs"
                    style={{ backgroundColor: "rgba(99,102,241,0.1)", color: "#6366F1" }}>
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
                  placeholder="e.g. MarketHub, Nike, competitor..." style={{ ...inp, flex: 1 }} />
                <button type="button" onClick={addKeyword}
                  className="px-3 py-2 rounded-lg" style={{ backgroundColor: "#6366F1", color: "white" }}>
                  <Plus className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Platforms */}
            <div>
              <label className="block text-xs font-medium mb-2" style={{ color: "#78614E" }}>Platforms to scan</label>
              <div className="flex gap-2 flex-wrap">
                {ALL_PLATFORMS.map(p => {
                  const Icon = PLATFORM_ICONS[p.charAt(0).toUpperCase() + p.slice(1)] ?? Bell;
                  const color = PLATFORM_COLORS[p.charAt(0).toUpperCase() + p.slice(1)] ?? "#A8967E";
                  const active = config.platforms.includes(p);
                  return (
                    <button key={p} type="button" onClick={() => togglePlatform(p)}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all"
                      style={active ? { backgroundColor: color + "20", color, border: `1px solid ${color}40` } : { backgroundColor: "rgba(245,215,160,0.15)", color: "#A8967E", border: "1px solid rgba(245,215,160,0.3)" }}>
                      <Icon className="w-3.5 h-3.5" />
                      {p.charAt(0).toUpperCase() + p.slice(1)}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium mb-1" style={{ color: "#78614E" }}>Notification email</label>
                <input value={config.email} onChange={e => setConfig(p => ({ ...p, email: e.target.value }))}
                  placeholder="email@example.com" style={inp} />
              </div>
              <div className="flex items-center gap-2 pt-5">
                <input type="checkbox" id="notify" checked={config.notify_email}
                  onChange={e => setConfig(p => ({ ...p, notify_email: e.target.checked }))} />
                <label htmlFor="notify" className="text-sm" style={{ color: "#78614E" }}>Send email</label>
              </div>
            </div>

            <button type="button" onClick={save} disabled={saving}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold disabled:opacity-40"
              style={{ background: "linear-gradient(135deg,#F59E0B,#D97706)", color: "#1C1814" }}>
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
              Save
            </button>
          </div>
        )}

        {/* Platform stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {ALL_PLATFORMS.map(p => {
            const Icon = PLATFORM_ICONS[p.charAt(0).toUpperCase() + p.slice(1)] ?? Bell;
            const color = PLATFORM_COLORS[p.charAt(0).toUpperCase() + p.slice(1)] ?? "#A8967E";
            const count = byPlatform[p] ?? 0;
            return (
              <button key={p} type="button"
                onClick={() => setFilterPlatform(filterPlatform === p.charAt(0).toUpperCase() + p.slice(1) ? "all" : p.charAt(0).toUpperCase() + p.slice(1))}
                className="rounded-xl p-3 text-center transition-all"
                style={{ ...card, border: `1px solid ${filterPlatform === p.charAt(0).toUpperCase() + p.slice(1) ? color : "rgba(245,215,160,0.25)"}` }}>
                <Icon className="w-5 h-5 mx-auto mb-1" style={{ color }} />
                <p className="text-lg font-bold" style={{ color }}>{count}</p>
                <p className="text-[10px]" style={{ color: "#A8967E" }}>{p.charAt(0).toUpperCase() + p.slice(1)}</p>
              </button>
            );
          })}
        </div>

        {/* Filters */}
        {allKeywords.length > 1 && (
          <div className="flex gap-2 flex-wrap">
            <button type="button" onClick={() => setFilterKeyword("all")}
              className="text-xs px-3 py-1.5 rounded-full font-medium transition-all"
              style={filterKeyword === "all" ? { backgroundColor: "#292524", color: "#FFF8F0" } : { ...card, color: "#78614E" }}>
              All
            </button>
            {allKeywords.map(k => (
              <button key={k} type="button" onClick={() => setFilterKeyword(k)}
                className="text-xs px-3 py-1.5 rounded-full font-medium transition-all"
                style={filterKeyword === k ? { backgroundColor: "#6366F1", color: "white" } : { ...card, color: "#78614E" }}>
                {k}
              </button>
            ))}
          </div>
        )}

        {/* Mentions */}
        {loading ? <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin" style={{ color: "#6366F1" }} /></div>
        : filtered.length === 0 ? (
          <div className="rounded-2xl p-12 text-center" style={card}>
            <Bell className="w-8 h-8 mx-auto mb-3" style={{ color: "#C4AA8A" }} />
            <p className="text-sm font-medium mb-1" style={{ color: "#78614E" }}>
              {config.keywords?.length === 0 ? "Configure keywords to start monitoring" : "No mentions detected yet"}
            </p>
            <p className="text-xs" style={{ color: "#A8967E" }}>Click &quot;Scan now&quot; or wait for the automatic daily scan</p>
          </div>
        ) : (
          <div className="space-y-2">
            <p className="text-xs px-1" style={{ color: "#A8967E" }}>{filtered.length} mentions</p>
            {filtered.map(m => {
              const Icon = PLATFORM_ICONS[m.platform] ?? Bell;
              const color = PLATFORM_COLORS[m.platform] ?? "#A8967E";
              return (
                <div key={m.id} className="rounded-xl p-4 flex items-start gap-3" style={card}>
                  <div className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0"
                    style={{ backgroundColor: color + "15" }}>
                    <Icon className="w-4 h-4" style={{ color }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <span className="text-[10px] px-2 py-0.5 rounded-full font-semibold" style={{ backgroundColor: color + "15", color }}>{m.platform}</span>
                      <span className="text-[10px] px-2 py-0.5 rounded-full" style={{ backgroundColor: "rgba(99,102,241,0.1)", color: "#6366F1" }}>#{m.keyword}</span>
                      {m.reach > 0 && <span className="text-[10px] flex items-center gap-0.5" style={{ color: "#A8967E" }}><TrendingUp className="w-3 h-3" />{fmtNum(m.reach)}</span>}
                      <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: SENTIMENT_COLORS[m.sentiment] ?? "#A8967E" }} title={m.sentiment} />
                    </div>
                    <p className="text-sm leading-relaxed" style={{ color: "#292524" }}>{m.content.slice(0, 200)}{m.content.length > 200 ? "..." : ""}</p>
                    <p className="text-xs mt-1" style={{ color: "#A8967E" }}>{m.author && `@${m.author} · `}{fmtDate(m.detected_at)}</p>
                  </div>
                  <div className="flex gap-1 shrink-0">
                    {m.url && (
                      <a href={m.url} target="_blank" rel="noopener noreferrer"
                        className="p-1.5 rounded-lg" style={{ backgroundColor: "rgba(99,102,241,0.08)", color: "#6366F1" }}>
                        <ExternalLink className="w-3.5 h-3.5" />
                      </a>
                    )}
                    <button type="button" onClick={() => del(m.id)}
                      className="p-1.5 rounded-lg" style={{ backgroundColor: "rgba(239,68,68,0.08)", color: "#EF4444" }}>
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
