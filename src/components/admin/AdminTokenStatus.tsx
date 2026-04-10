"use client";

import { useEffect, useState, useCallback } from "react";

interface TokenInfo {
  platform: string;
  label: string;
  token_prefix: string;
  saved_at: string;
  expires_at: string | null;
  expires_days: number | null;
  status: "ok" | "warning" | "expired" | "unknown" | "never_expires";
  renewal_url: string;
  renewal_guide: string;
  extra?: Record<string, string>;
}

interface TokenData {
  tokens: TokenInfo[];
  summary: { total: number; expired: number; warning: number; ok: number; never_expires: number };
}

const PLATFORM_ICON: Record<string, string> = {
  instagram: "📸",
  facebook: "📘",
  youtube: "▶️",
  youtube_api: "🔑",
  anthropic: "🤖",
  rapidapi: "⚡",
  resend: "📧",
  google_oauth: "🔐",
  stripe: "💳",
};

const STATUS_CONFIG = {
  expired: { bg: "rgba(239,68,68,0.08)", border: "rgba(239,68,68,0.3)", color: "#DC2626", label: "EXPIRED", icon: "🔴" },
  warning: { bg: "rgba(245,158,11,0.08)", border: "rgba(245,158,11,0.3)", color: "#D97706", label: "EXPIRES SOON", icon: "🟡" },
  ok: { bg: "rgba(22,163,74,0.06)", border: "rgba(22,163,74,0.2)", color: "#16A34A", label: "OK", icon: "🟢" },
  never_expires: { bg: "rgba(99,102,241,0.06)", border: "rgba(99,102,241,0.15)", color: "#6366F1", label: "NO EXPIRY", icon: "🔵" },
  unknown: { bg: "rgba(120,97,78,0.06)", border: "rgba(120,97,78,0.15)", color: "#78614E", label: "UNKNOWN", icon: "⚪" },
};

function daysLabel(days: number | null, expiresAt: string | null): string {
  if (days === null) return "—";
  if (days < 0) return `Expired ${Math.abs(days)}d ago`;
  if (days === 0) return "Expires today!";
  if (days === 1) return "Expires tomorrow!";
  return `${days} days left`;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}

export default function AdminTokenStatus() {
  const [data, setData] = useState<TokenData | null>(null);
  const [loading, setLoading] = useState(true);
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/token-status");
      const json = await res.json();
      setData(json);
      setLastRefresh(new Date());
    } catch {
      /* ignore */
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
    const interval = setInterval(load, 10 * 60 * 1000); // refresh every 10min
    return () => clearInterval(interval);
  }, [load]);

  const { tokens = [], summary } = data || {};
  const hasAlerts = (summary?.expired ?? 0) + (summary?.warning ?? 0) > 0;

  return (
    <div className="rounded-2xl p-6" style={{ backgroundColor: "#FFFCF7", border: "1px solid rgba(245,215,160,0.25)" }}>
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center text-xl"
            style={{ backgroundColor: hasAlerts ? "rgba(239,68,68,0.1)" : "rgba(22,163,74,0.08)" }}>
            🔑
          </div>
          <div>
            <h2 className="font-bold text-lg" style={{ color: "#292524" }}>API Credentials & Token Status</h2>
            <p className="text-xs" style={{ color: "#C4AA8A" }}>
              Credențiale externe: Instagram, Stripe, YouTube, Anthropic, RapidAPI
              {summary ? ` · ${summary.total} keys tracked` : ""}
              {lastRefresh && ` · ${lastRefresh.toLocaleTimeString()}`}
            </p>
          </div>
        </div>
        <button type="button" onClick={load} disabled={loading}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg"
          style={{ backgroundColor: "rgba(245,158,11,0.1)", color: "#D97706" }}>
          {loading ? (
            <svg className="w-3 h-3 animate-spin" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"/>
            </svg>
          ) : "↻"} Refresh
        </button>
      </div>

      {/* Summary badges */}
      {summary && (
        <div className="flex flex-wrap gap-2 mb-5">
          {summary.expired > 0 && (
            <span className="text-xs font-bold px-3 py-1 rounded-full animate-pulse"
              style={{ backgroundColor: "rgba(239,68,68,0.12)", color: "#DC2626", border: "1px solid rgba(239,68,68,0.3)" }}>
              🔴 {summary.expired} EXPIRED
            </span>
          )}
          {summary.warning > 0 && (
            <span className="text-xs font-bold px-3 py-1 rounded-full"
              style={{ backgroundColor: "rgba(245,158,11,0.12)", color: "#D97706", border: "1px solid rgba(245,158,11,0.3)" }}>
              🟡 {summary.warning} expiring soon
            </span>
          )}
          {summary.ok > 0 && (
            <span className="text-xs font-bold px-3 py-1 rounded-full"
              style={{ backgroundColor: "rgba(22,163,74,0.08)", color: "#16A34A", border: "1px solid rgba(22,163,74,0.2)" }}>
              🟢 {summary.ok} OK
            </span>
          )}
          {summary.never_expires > 0 && (
            <span className="text-xs font-bold px-3 py-1 rounded-full"
              style={{ backgroundColor: "rgba(99,102,241,0.08)", color: "#6366F1", border: "1px solid rgba(99,102,241,0.15)" }}>
              🔵 {summary.never_expires} no expiry
            </span>
          )}
        </div>
      )}

      {loading && !data ? (
        <div className="flex justify-center py-8">
          <svg className="w-6 h-6 animate-spin" style={{ color: "#F59E0B" }} fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"/>
          </svg>
        </div>
      ) : (
        <div className="space-y-2">
          {tokens.map((t) => {
            const cfg = STATUS_CONFIG[t.status];
            return (
              <div key={t.platform} className="rounded-xl p-4"
                style={{ backgroundColor: cfg.bg, border: `1px solid ${cfg.border}` }}>
                <div className="flex items-start gap-3">
                  {/* Icon */}
                  <span className="text-xl shrink-0 mt-0.5">{PLATFORM_ICON[t.platform] ?? "🔑"}</span>

                  {/* Main info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center flex-wrap gap-2 mb-1">
                      <span className="font-semibold text-sm" style={{ color: "#292524" }}>{t.label}</span>
                      <span className="text-xs font-bold px-2 py-0.5 rounded-full"
                        style={{ backgroundColor: cfg.bg, color: cfg.color, border: `1px solid ${cfg.border}` }}>
                        {cfg.icon} {cfg.label}
                      </span>
                    </div>

                    <div className="flex flex-wrap gap-4 text-xs" style={{ color: "#78614E" }}>
                      <span>Key: <code className="font-mono" style={{ color: "#5C4A35" }}>{t.token_prefix}</code></span>
                      <span>Saved: {formatDate(t.saved_at)}</span>
                      {t.expires_at && (
                        <span style={{ color: cfg.color, fontWeight: 600 }}>
                          Expires: {formatDate(t.expires_at)} · {daysLabel(t.expires_days, t.expires_at)}
                        </span>
                      )}
                      {t.status === "never_expires" && (
                        <span style={{ color: "#6366F1" }}>No expiry date</span>
                      )}
                    </div>

                    {/* Extra metadata */}
                    {t.extra && Object.keys(t.extra).length > 0 && (
                      <div className="flex flex-wrap gap-3 mt-1">
                        {Object.entries(t.extra).map(([k, v]) => (
                          <span key={k} className="text-xs" style={{ color: "#C4AA8A" }}>
                            {k}: <span style={{ color: "#78614E" }}>{v}</span>
                          </span>
                        ))}
                      </div>
                    )}

                    {/* Renewal guide */}
                    <p className="text-xs mt-1.5" style={{ color: "#A8967E" }}>{t.renewal_guide}</p>
                  </div>

                  {/* Renewal button */}
                  <a href={t.renewal_url} target="_blank" rel="noopener noreferrer"
                    className="shrink-0 text-xs font-bold px-3 py-1.5 rounded-lg transition-opacity hover:opacity-80"
                    style={{
                      backgroundColor: t.status === "expired" || t.status === "warning" ? cfg.color : "rgba(245,215,160,0.3)",
                      color: t.status === "expired" || t.status === "warning" ? "white" : "#78614E",
                    }}>
                    {t.status === "expired" ? "🔄 Renew now" : t.status === "warning" ? "⚠ Renew soon" : "→ Manage"}
                  </a>
                </div>

                {/* Progress bar for expiring tokens */}
                {t.expires_days !== null && t.expires_days >= 0 && (
                  <div className="mt-3">
                    <div className="w-full h-1.5 rounded-full overflow-hidden" style={{ backgroundColor: "rgba(245,215,160,0.3)" }}>
                      <div className="h-full rounded-full transition-all"
                        style={{
                          width: `${Math.min((t.expires_days / 60) * 100, 100)}%`,
                          backgroundColor: t.expires_days <= 7 ? "#DC2626" : t.expires_days <= 14 ? "#F59E0B" : "#16A34A",
                        }} />
                    </div>
                    <p className="text-xs mt-0.5 text-right" style={{ color: cfg.color }}>
                      {t.expires_days} / 60 days remaining
                    </p>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      <p className="text-xs mt-4 text-center" style={{ color: "#C4AA8A" }}>
        Meta tokens (Instagram/Facebook) expiră după 60 zile · Auto-refresh la 10 minute
      </p>
    </div>
  );
}
