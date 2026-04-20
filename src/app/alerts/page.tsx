"use client";

import { useState, useEffect, useCallback } from "react";
import Header from "@/components/layout/Header";
import { formatNumber } from "@/lib/utils";
import {
  Bell, Plus, Trash2, TrendingUp, Zap, Mail, CheckCircle2,
  AlertTriangle, XCircle, ChevronDown, ChevronUp, RefreshCw,
} from "lucide-react";

// ── Types ────────────────────────────────────────────────────────────────────

type Platform = "youtube" | "instagram" | "tiktok";
type MetricKey =
  | "ig_followers" | "ig_engagement" | "ig_posts"
  | "yt_views" | "yt_subscribers" | "yt_likes"
  | "tt_followers" | "tt_likes";
type Condition = "above" | "below" | "drops_pct" | "grows_pct";
type AlertStatus = "active" | "triggered" | "dismissed";

interface MetricRule {
  id: string;
  name: string;
  platform: Platform;
  metric: MetricKey;
  condition: Condition;
  threshold: number;
  notifyEmail: boolean;
  email: string;
  status: AlertStatus;
  lastChecked: string | null;
  lastValue: number | null;
  createdAt: string;
}

interface AlertEvent {
  id: string;
  ruleId: string;
  ruleName: string;
  message: string;
  value: number;
  threshold: number;
  timestamp: string;
  emailSent: boolean;
}

interface KeywordAlert {
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

// ── Config ───────────────────────────────────────────────────────────────────

const METRIC_LABELS: Record<MetricKey, { label: string; unit: string; platform: Platform }> = {
  ig_followers:   { label: "IG Followers",      unit: "",  platform: "instagram" },
  ig_engagement:  { label: "IG Engagement Rate", unit: "%", platform: "instagram" },
  ig_posts:       { label: "IG Posts Count",    unit: "",  platform: "instagram" },
  yt_views:       { label: "YT Video Views",    unit: "",  platform: "youtube" },
  yt_subscribers: { label: "YT Subscribers",    unit: "",  platform: "youtube" },
  yt_likes:       { label: "YT Likes",          unit: "",  platform: "youtube" },
  tt_followers:   { label: "TT Followers",      unit: "",  platform: "tiktok" },
  tt_likes:       { label: "TT Total Likes",    unit: "",  platform: "tiktok" },
};

const CONDITION_LABELS: Record<Condition, string> = {
  above:      "goes above",
  below:      "drops below",
  drops_pct:  "drops by % in 24h",
  grows_pct:  "grows by % in 24h",
};

const PLATFORM_COLOR: Record<Platform, string> = {
  youtube: "#FF0000",
  instagram: "#E1306C",
  tiktok: "#FF0050",
};

const STATUS_CONFIG: Record<AlertStatus, { color: string; bg: string; label: string; icon: React.ReactNode }> = {
  active:    { color: "#16A34A", bg: "rgba(22,163,74,0.08)",    label: "Monitoring", icon: <CheckCircle2 className="w-3.5 h-3.5" /> },
  triggered: { color: "#DC2626", bg: "rgba(239,68,68,0.08)",    label: "Triggered!", icon: <AlertTriangle className="w-3.5 h-3.5" /> },
  dismissed: { color: "#A8967E", bg: "rgba(168,150,126,0.08)", label: "Dismissed",  icon: <XCircle className="w-3.5 h-3.5" /> },
};

const cardStyle = {
  backgroundColor: "var(--color-bg-secondary)",
  border: "1px solid rgba(245,215,160,0.25)",
  boxShadow: "0 1px 3px rgba(120,97,78,0.08)",
};

// ── Main Page ────────────────────────────────────────────────────────────────

export default function AlertsPage() {
  const [rules, setRules] = useState<MetricRule[]>([]);
  const [events, setEvents] = useState<AlertEvent[]>([]);
  const [keywords, setKeywords] = useState<KeywordAlert[]>([]);
  const [ytVideos, setYtVideos] = useState<YTVideo[]>([]);
  const [kwInput, setKwInput] = useState("");
  const [showRuleForm, setShowRuleForm] = useState(false);
  const [expandedHistory, setExpandedHistory] = useState(false);
  const [checking, setChecking] = useState(false);
  const [sendingEmail, setSendingEmail] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState("");

  // Rule form state
  const [form, setForm] = useState({
    name: "", metric: "ig_followers" as MetricKey,
    condition: "below" as Condition, threshold: 1000,
    notifyEmail: false, email: "",
  });

  // Fetch alerts from API on mount
  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/alerts");
        if (!res.ok) return;
        const data = await res.json();
        if (data.rules) {
          setRules(data.rules.map((r: any) => ({
            id: r.id,
            name: r.metric, // use metric as display name if no name field
            platform: METRIC_LABELS[r.metric as MetricKey]?.platform || "instagram",
            metric: r.metric as MetricKey,
            condition: r.condition as Condition,
            threshold: r.threshold,
            notifyEmail: !!r.email,
            email: r.email || "",
            status: r.active ? ("active" as AlertStatus) : ("dismissed" as AlertStatus),
            lastChecked: r.last_triggered_at,
            lastValue: null,
            createdAt: r.created_at,
          })));
        }
        if (data.events) {
          setEvents(data.events.map((e: any) => ({
            id: e.id,
            ruleId: e.alert_id,
            ruleName: e.metric,
            message: e.message,
            value: e.value,
            threshold: 0,
            timestamp: e.created_at,
            emailSent: false,
          })));
        }
      } catch { /* ignore fetch errors */ }
    })();
  }, []);

  // Keywords still use localStorage (no DB table for keywords)
  useEffect(() => {
    if (typeof window !== "undefined") {
      try {
        const s = localStorage.getItem("mh_alerts");
        if (s) setKeywords(JSON.parse(s));
      } catch { /* ignore */ }
    }
  }, []);
  useEffect(() => {
    if (typeof window !== "undefined") {
      try { localStorage.setItem("mh_alerts", JSON.stringify(keywords)); } catch { /* ignore */ }
    }
  }, [keywords]);

  useEffect(() => {
    fetch("/api/youtube/trending?region=RO&max=12")
      .then(r => r.json())
      .then(d => { if (Array.isArray(d)) setYtVideos(d); })
      .catch(() => {});
  }, []);

  // ── Keywords ───────────────────────────────────────────────────────────────
  const addKeyword = () => {
    const kw = kwInput.trim();
    if (!kw || keywords.find(a => a.keyword.toLowerCase() === kw.toLowerCase())) return;
    setKeywords(prev => [...prev, { id: Date.now().toString(), keyword: kw, createdAt: new Date().toLocaleDateString("en-US") }]);
    setKwInput("");
  };

  // ── Rules ──────────────────────────────────────────────────────────────────
  const addRule = async () => {
    if (!form.name.trim()) return;
    try {
      const res = await fetch("/api/alerts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          metric: form.metric,
          condition: form.condition,
          threshold: Number(form.threshold),
          email: form.notifyEmail ? form.email.trim() : null,
        }),
      });
      if (!res.ok) throw new Error("Failed to save");
      const saved = await res.json();
      const rule: MetricRule = {
        id: saved.id,
        name: form.name.trim(),
        platform: METRIC_LABELS[form.metric].platform,
        metric: form.metric,
        condition: form.condition,
        threshold: Number(form.threshold),
        notifyEmail: form.notifyEmail,
        email: form.email.trim(),
        status: "active",
        lastChecked: null,
        lastValue: null,
        createdAt: saved.created_at || new Date().toISOString(),
      };
      setRules(prev => [...prev, rule]);
      setForm({ name: "", metric: "ig_followers", condition: "below", threshold: 1000, notifyEmail: false, email: "" });
      setShowRuleForm(false);
      flash("Rule added successfully!");
    } catch {
      flash("Failed to save rule. Please try again.");
    }
  };

  const deleteRule = async (id: string) => {
    setRules(prev => prev.filter(r => r.id !== id));
    try {
      await fetch("/api/alerts", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
    } catch { /* optimistic UI — already removed */ }
  };

  const dismissRule = async (id: string) => {
    setRules(prev => prev.map(r => r.id === id ? { ...r, status: "dismissed" } : r));
    try {
      await fetch("/api/alerts", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, active: false }),
      });
    } catch { /* optimistic UI */ }
  };

  const reactivateRule = async (id: string) => {
    setRules(prev => prev.map(r => r.id === id ? { ...r, status: "active" } : r));
    try {
      await fetch("/api/alerts", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, active: true }),
      });
    } catch { /* optimistic UI */ }
  };

  const flash = (msg: string) => { setSuccessMsg(msg); setTimeout(() => setSuccessMsg(""), 3000); };

  // ── Check rules (manual) ──────────────────────────────────────────────────
  const checkRules = useCallback(async () => {
    if (rules.filter(r => r.status === "active").length === 0) return;
    setChecking(true);

    let igData: { followers?: number; engagement_rate?: number; posts_count?: number } | null = null;

    // Fetch IG stats if needed
    if (rules.some(r => r.platform === "instagram" && r.status === "active")) {
      try {
        const res = await fetch("/api/instagram");
        const d = await res.json();
        igData = { followers: d.followers, engagement_rate: d.engagement_rate, posts_count: d.posts_count };
      } catch { /* ignore */ }
    }

    const newEvents: AlertEvent[] = [];
    const updatedRules = rules.map(rule => {
      if (rule.status !== "active") return rule;

      let currentValue: number | null = null;

      if (rule.platform === "instagram" && igData) {
        if (rule.metric === "ig_followers") currentValue = igData.followers ?? null;
        if (rule.metric === "ig_engagement") currentValue = igData.engagement_rate ?? null;
        if (rule.metric === "ig_posts") currentValue = igData.posts_count ?? null;
      }

      if (currentValue === null) {
        return { ...rule, lastChecked: new Date().toISOString() };
      }

      let triggered = false;
      let message = "";

      if (rule.condition === "above" && currentValue > rule.threshold) {
        triggered = true;
        message = `${METRIC_LABELS[rule.metric].label} reached ${currentValue}${METRIC_LABELS[rule.metric].unit} (above threshold ${rule.threshold})`;
      }
      if (rule.condition === "below" && currentValue < rule.threshold) {
        triggered = true;
        message = `${METRIC_LABELS[rule.metric].label} is ${currentValue}${METRIC_LABELS[rule.metric].unit} (below threshold ${rule.threshold})`;
      }
      if (rule.condition === "drops_pct" && rule.lastValue !== null) {
        const drop = ((rule.lastValue - currentValue) / rule.lastValue) * 100;
        if (drop >= rule.threshold) {
          triggered = true;
          message = `${METRIC_LABELS[rule.metric].label} dropped ${drop.toFixed(1)}% (from ${rule.lastValue} to ${currentValue})`;
        }
      }
      if (rule.condition === "grows_pct" && rule.lastValue !== null) {
        const grow = ((currentValue - rule.lastValue) / rule.lastValue) * 100;
        if (grow >= rule.threshold) {
          triggered = true;
          message = `${METRIC_LABELS[rule.metric].label} grew ${grow.toFixed(1)}% (from ${rule.lastValue} to ${currentValue})`;
        }
      }

      if (triggered) {
        newEvents.push({
          id: Date.now().toString() + Math.random(),
          ruleId: rule.id,
          ruleName: rule.name,
          message,
          value: currentValue,
          threshold: rule.threshold,
          timestamp: new Date().toISOString(),
          emailSent: false,
        });
      }

      return {
        ...rule,
        status: triggered ? "triggered" as AlertStatus : rule.status,
        lastChecked: new Date().toISOString(),
        lastValue: currentValue,
      };
    });

    setRules(updatedRules);
    if (newEvents.length > 0) {
      setEvents(prev => [...newEvents, ...prev].slice(0, 50));
      flash(`${newEvents.length} alert(s) triggered!`);
    } else {
      flash("All rules checked — no alerts.");
    }
    setChecking(false);
  }, [rules]);

  // ── Send email for event ──────────────────────────────────────────────────
  const sendAlertEmail = async (event: AlertEvent) => {
    const rule = rules.find(r => r.id === event.ruleId);
    if (!rule?.notifyEmail || !rule.email) return;
    setSendingEmail(event.id);
    try {
      const res = await fetch("/api/email/send-digest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          recipients: [rule.email],
          digest: {
            subject_line: `🚨 MarketHub Alert: ${event.ruleName}`,
            headline: event.ruleName,
            performance_badge: "slow",
            top_3_wins: [],
            key_metric: { label: METRIC_LABELS[rule.metric]?.label || rule.metric, value: String(event.value), context: event.message },
            content_spotlight: { title: "Alert Details", why_it_worked: event.message },
            action_item: `Check your ${rule.platform} account immediately.`,
            next_week_focus: "Investigate and resolve the metric anomaly.",
          },
          weekLabel: new Date(event.timestamp).toLocaleString("en-GB"),
          clientName: "Alert Notification",
        }),
      });
      if (res.ok) {
        setEvents(prev => prev.map(e => e.id === event.id ? { ...e, emailSent: true } : e));
        flash("Email sent!");
      }
    } catch { /* ignore */ }
    setSendingEmail(null);
  };

  // ── Keyword matching ───────────────────────────────────────────────────────
  const matchedKeywords = keywords.map(alert => ({
    alert,
    video: ytVideos.find(v =>
      v.title.toLowerCase().includes(alert.keyword.toLowerCase()) ||
      v.channel.toLowerCase().includes(alert.keyword.toLowerCase())
    ),
  }));

  const trendingSuggestions = ytVideos
    .map(v => {
      const word = v.title.replace(/[^\w\s]/g, " ").split(/\s+/).find(w => w.length > 4);
      return { keyword: word || v.channel, views: v.views };
    })
    .filter(s => s.keyword)
    .slice(0, 10);

  const triggeredCount = rules.filter(r => r.status === "triggered").length;
  const activeCount = rules.filter(r => r.status === "active").length;

  return (
    <div>
      <Header
        title="Alerts & Notifications"
        subtitle="Metric threshold rules, keyword tracking, email alerts"
      />
      <div className="p-6 space-y-6 max-w-5xl mx-auto">

        {/* Success flash */}
        {successMsg && (
          <div className="rounded-xl px-4 py-3 text-sm font-semibold flex items-center gap-2 animate-pulse"
            style={{ backgroundColor: "rgba(22,163,74,0.1)", color: "#16A34A", border: "1px solid rgba(22,163,74,0.2)" }}>
            <CheckCircle2 className="w-4 h-4" />{successMsg}
          </div>
        )}

        {/* Summary bar */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { label: "Active Rules",     value: activeCount,             color: "#16A34A", icon: "🟢" },
            { label: "Triggered Alerts", value: triggeredCount,          color: "#DC2626", icon: "🔴" },
            { label: "Keyword Monitors", value: keywords.length,         color: "var(--color-primary)", icon: "🔍" },
            { label: "Alert History",    value: events.length,           color: "#6366F1", icon: "📋" },
          ].map(s => (
            <div key={s.label} className="rounded-xl p-4 text-center" style={cardStyle}>
              <p className="text-xl mb-0.5">{s.icon}</p>
              <p className="text-2xl font-bold" style={{ color: s.color }}>{s.value}</p>
              <p className="text-xs" style={{ color: "#A8967E" }}>{s.label}</p>
            </div>
          ))}
        </div>

        {/* ── Metric Rules ─────────────────────────────────────────────────── */}
        <div className="rounded-2xl p-6 space-y-4" style={cardStyle}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5" style={{ color: "var(--color-primary)" }} />
              <h3 className="font-bold" style={{ color: "var(--color-text)" }}>Metric Alert Rules</h3>
            </div>
            <div className="flex gap-2">
              <button type="button" onClick={checkRules} disabled={checking || activeCount === 0}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold disabled:opacity-40"
                style={{ backgroundColor: "rgba(245,158,11,0.1)", color: "var(--color-primary-hover)", border: "1px solid rgba(245,158,11,0.2)" }}>
                <RefreshCw className={`w-3 h-3 ${checking ? "animate-spin" : ""}`} />
                {checking ? "Checking..." : "Check Now"}
              </button>
              <button type="button" onClick={() => setShowRuleForm(v => !v)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold"
                style={{ backgroundColor: "var(--color-primary)", color: "#1C1814" }}>
                <Plus className="w-3 h-3" /> New Rule
              </button>
            </div>
          </div>

          {/* Rule form */}
          {showRuleForm && (
            <div className="rounded-xl p-4 space-y-3"
              style={{ backgroundColor: "rgba(245,215,160,0.08)", border: "1px solid rgba(245,215,160,0.3)" }}>
              <h4 className="text-sm font-bold" style={{ color: "var(--color-text)" }}>Create Alert Rule</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold block mb-1" style={{ color: "#78614E" }}>Rule Name</label>
                  <input type="text" placeholder="Ex: IG Followers Low" value={form.name}
                    onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
                    className="w-full px-3 py-2 text-sm rounded-lg focus:outline-none"
                    style={{ border: "1px solid rgba(245,215,160,0.35)", backgroundColor: "var(--color-bg)", color: "var(--color-text)" }} />
                </div>
                <div>
                  <label className="text-xs font-semibold block mb-1" style={{ color: "#78614E" }}>Metric</label>
                  <select value={form.metric} onChange={e => setForm(p => ({ ...p, metric: e.target.value as MetricKey }))}
                    aria-label="Select metric"
                    className="w-full px-3 py-2 text-sm rounded-lg focus:outline-none"
                    style={{ border: "1px solid rgba(245,215,160,0.35)", backgroundColor: "var(--color-bg)", color: "var(--color-text)" }}>
                    {Object.entries(METRIC_LABELS).map(([k, v]) => (
                      <option key={k} value={k}>{v.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-semibold block mb-1" style={{ color: "#78614E" }}>Condition</label>
                  <select value={form.condition} onChange={e => setForm(p => ({ ...p, condition: e.target.value as Condition }))}
                    aria-label="Select condition"
                    className="w-full px-3 py-2 text-sm rounded-lg focus:outline-none"
                    style={{ border: "1px solid rgba(245,215,160,0.35)", backgroundColor: "var(--color-bg)", color: "var(--color-text)" }}>
                    {Object.entries(CONDITION_LABELS).map(([k, v]) => (
                      <option key={k} value={k}>{v}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-semibold block mb-1" style={{ color: "#78614E" }}>
                    Threshold {form.condition.includes("pct") ? "(% change)" : METRIC_LABELS[form.metric]?.unit || "value"}
                  </label>
                  <input type="number" value={form.threshold} min={0}
                    aria-label="Threshold value"
                    onChange={e => setForm(p => ({ ...p, threshold: Number(e.target.value) }))}
                    className="w-full px-3 py-2 text-sm rounded-lg focus:outline-none"
                    style={{ border: "1px solid rgba(245,215,160,0.35)", backgroundColor: "var(--color-bg)", color: "var(--color-text)" }} />
                </div>
              </div>
              {/* Email notification */}
              <div className="flex items-center gap-3">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={form.notifyEmail}
                    onChange={e => setForm(p => ({ ...p, notifyEmail: e.target.checked }))}
                    className="w-4 h-4 rounded" />
                  <span className="text-xs font-semibold" style={{ color: "#78614E" }}>
                    <Mail className="w-3 h-3 inline mr-1" />Send email on trigger
                  </span>
                </label>
                {form.notifyEmail && (
                  <input type="email" placeholder="email@example.com" value={form.email}
                    onChange={e => setForm(p => ({ ...p, email: e.target.value }))}
                    className="flex-1 px-3 py-1.5 text-xs rounded-lg focus:outline-none"
                    style={{ border: "1px solid rgba(245,215,160,0.35)", backgroundColor: "var(--color-bg)", color: "var(--color-text)" }} />
                )}
              </div>
              <p className="text-xs" style={{ color: "#C4AA8A" }}>
                Note: Instagram metrics are checked when you click "Check Now". Email uses your Resend API key.
              </p>
              <div className="flex gap-2 pt-1">
                <button type="button" onClick={addRule} disabled={!form.name.trim()}
                  className="px-4 py-2 rounded-lg text-sm font-bold disabled:opacity-40"
                  style={{ backgroundColor: "var(--color-primary)", color: "#1C1814" }}>
                  Add Rule
                </button>
                <button type="button" onClick={() => setShowRuleForm(false)}
                  className="px-4 py-2 rounded-lg text-sm font-semibold"
                  style={{ backgroundColor: "rgba(245,215,160,0.15)", color: "#78614E" }}>
                  Cancel
                </button>
              </div>
            </div>
          )}

          {/* Rules list */}
          {rules.length === 0 ? (
            <div className="text-center py-8">
              <Bell className="w-8 h-8 mx-auto mb-2" style={{ color: "#C4AA8A" }} />
              <p className="text-sm" style={{ color: "#A8967E" }}>No rules yet. Create one to start monitoring metrics.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {rules.map(rule => {
                const sc = STATUS_CONFIG[rule.status];
                const mc = METRIC_LABELS[rule.metric];
                return (
                  <div key={rule.id} className="rounded-xl p-4"
                    style={{ backgroundColor: sc.bg, border: `1px solid ${sc.color}30` }}>
                    <div className="flex items-center gap-3 flex-wrap">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-semibold text-sm" style={{ color: "var(--color-text)" }}>{rule.name}</span>
                          <span className="text-xs px-2 py-0.5 rounded-full font-semibold flex items-center gap-1"
                            style={{ backgroundColor: sc.bg, color: sc.color, border: `1px solid ${sc.color}40` }}>
                            {sc.icon}{sc.label}
                          </span>
                          <span className="text-xs px-2 py-0.5 rounded-full"
                            style={{ backgroundColor: `${PLATFORM_COLOR[rule.platform]}10`, color: PLATFORM_COLOR[rule.platform] }}>
                            {rule.platform}
                          </span>
                          {rule.notifyEmail && <Mail className="w-3.5 h-3.5" style={{ color: "#6366F1" }} />}
                        </div>
                        <p className="text-xs mt-0.5" style={{ color: "#78614E" }}>
                          {mc?.label} {CONDITION_LABELS[rule.condition]} {rule.threshold}{mc?.unit}
                          {rule.lastValue !== null && ` · Current: ${rule.lastValue}${mc?.unit}`}
                          {rule.lastChecked && ` · Checked ${new Date(rule.lastChecked).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })}`}
                        </p>
                      </div>
                      <div className="flex gap-1.5 shrink-0">
                        {rule.status === "triggered" && (
                          <button type="button" onClick={() => dismissRule(rule.id)}
                            className="text-xs px-2.5 py-1 rounded-lg font-semibold"
                            style={{ backgroundColor: "rgba(168,150,126,0.15)", color: "#78614E" }}>
                            Dismiss
                          </button>
                        )}
                        {rule.status === "dismissed" && (
                          <button type="button" onClick={() => reactivateRule(rule.id)}
                            className="text-xs px-2.5 py-1 rounded-lg font-semibold"
                            style={{ backgroundColor: "rgba(22,163,74,0.1)", color: "#16A34A" }}>
                            Reactivate
                          </button>
                        )}
                        <button type="button" onClick={() => deleteRule(rule.id)}
                          title="Delete rule"
                          className="p-1.5 rounded-lg" style={{ color: "#EF4444" }}>
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* ── Alert History ─────────────────────────────────────────────────── */}
        {events.length > 0 && (
          <div className="rounded-2xl p-6" style={cardStyle}>
            <button type="button" onClick={() => setExpandedHistory(v => !v)}
              className="flex items-center justify-between w-full">
              <div className="flex items-center gap-2">
                <Zap className="w-5 h-5" style={{ color: "#6366F1" }} />
                <h3 className="font-bold" style={{ color: "var(--color-text)" }}>Alert History ({events.length})</h3>
              </div>
              {expandedHistory ? <ChevronUp className="w-4 h-4" style={{ color: "#A8967E" }} /> : <ChevronDown className="w-4 h-4" style={{ color: "#A8967E" }} />}
            </button>
            {expandedHistory && (
              <div className="space-y-2 mt-4">
                {events.slice(0, 20).map(event => (
                  <div key={event.id} className="rounded-xl p-3 flex items-start gap-3"
                    style={{ backgroundColor: "rgba(239,68,68,0.04)", border: "1px solid rgba(239,68,68,0.15)" }}>
                    <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" style={{ color: "#DC2626" }} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold" style={{ color: "var(--color-text)" }}>{event.ruleName}</p>
                      <p className="text-xs mt-0.5" style={{ color: "#78614E" }}>{event.message}</p>
                      <p className="text-xs mt-0.5" style={{ color: "#C4AA8A" }}>
                        {new Date(event.timestamp).toLocaleString("en-GB")}
                        {event.emailSent && " · ✉ Email sent"}
                      </p>
                    </div>
                    {!event.emailSent && (
                      <button type="button" onClick={() => sendAlertEmail(event)}
                        disabled={sendingEmail === event.id}
                        className="shrink-0 flex items-center gap-1 text-xs px-2.5 py-1.5 rounded-lg font-semibold disabled:opacity-50"
                        style={{ backgroundColor: "rgba(99,102,241,0.1)", color: "#6366F1" }}>
                        {sendingEmail === event.id
                          ? <RefreshCw className="w-3 h-3 animate-spin" />
                          : <Mail className="w-3 h-3" />
                        }
                        Send email
                      </button>
                    )}
                  </div>
                ))}
                {events.length > 20 && (
                  <p className="text-xs text-center pt-1" style={{ color: "#C4AA8A" }}>Showing last 20 of {events.length}</p>
                )}
              </div>
            )}
          </div>
        )}

        {/* ── Keyword Alerts ─────────────────────────────────────────────────── */}
        <div className="rounded-2xl p-6 space-y-4" style={cardStyle}>
          <div className="flex items-center gap-2 mb-1">
            <TrendingUp className="w-5 h-5" style={{ color: "#cc0000" }} />
            <h3 className="font-bold" style={{ color: "var(--color-text)" }}>Keyword Trending Monitors</h3>
          </div>
          <p className="text-xs" style={{ color: "#A8967E" }}>
            Track keywords — get alerted when they appear in YouTube trending videos.
          </p>
          <div className="flex gap-2">
            <input type="text" value={kwInput}
              onChange={e => setKwInput(e.target.value)}
              onKeyDown={e => e.key === "Enter" && addKeyword()}
              placeholder="Ex: gaming, AI, beauty..."
              className="flex-1 px-4 py-2.5 text-sm rounded-lg focus:outline-none"
              style={{ border: "1px solid rgba(245,215,160,0.35)", backgroundColor: "var(--color-bg)", color: "var(--color-text)" }} />
            <button type="button" onClick={addKeyword}
              className="flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-bold"
              style={{ backgroundColor: "#cc0000", color: "white" }}>
              <Plus className="w-4 h-4" /> Add
            </button>
          </div>

          {keywords.length > 0 && (
            <div className="space-y-2">
              {matchedKeywords.map(({ alert, video }) => (
                <div key={alert.id} className="rounded-xl p-3 flex items-center gap-3"
                  style={{ backgroundColor: video ? "rgba(22,163,74,0.05)" : "rgba(245,215,160,0.08)", border: `1px solid ${video ? "rgba(22,163,74,0.2)" : "rgba(245,215,160,0.2)"}` }}>
                  <Bell className="w-4 h-4 shrink-0" style={{ color: video ? "#cc0000" : "#C4AA8A" }} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold" style={{ color: "var(--color-text)" }}>#{alert.keyword}</p>
                    {video && <p className="text-xs truncate" style={{ color: "#78614E" }}>Found: {video.title} · {formatNumber(video.views)} views</p>}
                    {!video && <p className="text-xs" style={{ color: "#C4AA8A" }}>Monitoring · Added {alert.createdAt}</p>}
                  </div>
                  {video && (
                    <span className="text-xs font-bold px-2.5 py-1 rounded-full flex items-center gap-1 shrink-0"
                      style={{ backgroundColor: "rgba(22,163,74,0.1)", color: "#16A34A" }}>
                      <TrendingUp className="w-3 h-3" /> Trending!
                    </span>
                  )}
                  <button type="button" onClick={() => setKeywords(prev => prev.filter(a => a.id !== alert.id))}
                    title="Remove keyword alert"
                    className="p-1.5 rounded-lg shrink-0" style={{ color: "#C4AA8A" }}>
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Quick add from trending */}
          {trendingSuggestions.length > 0 && (
            <div>
              <p className="text-xs font-semibold mb-2" style={{ color: "#A8967E" }}>Quick add from trending:</p>
              <div className="flex flex-wrap gap-2">
                {trendingSuggestions.map((s, i) => {
                  const added = keywords.some(a => a.keyword.toLowerCase() === s.keyword.toLowerCase());
                  return (
                    <button key={i} type="button" disabled={added}
                      onClick={() => {
                        if (!added) setKeywords(prev => [...prev, { id: Date.now().toString(), keyword: s.keyword, createdAt: new Date().toLocaleDateString("en-US") }]);
                      }}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-colors"
                      style={added
                        ? { backgroundColor: "rgba(245,215,160,0.15)", color: "#C4AA8A", cursor: "not-allowed" }
                        : { backgroundColor: "rgba(255,0,0,0.06)", color: "#cc0000", border: "1px solid rgba(255,0,0,0.15)" }
                      }>
                      <TrendingUp className="w-3 h-3" />
                      {s.keyword}
                      <span style={{ color: "#A8967E" }}>{formatNumber(s.views)} views</span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
