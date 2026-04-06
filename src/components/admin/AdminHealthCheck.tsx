"use client";

import { useState, useEffect } from "react";
import {
  CheckCircle2, XCircle, RefreshCw, Loader2,
  Database, Brain, Zap, Mail, Youtube, Instagram, CreditCard, Clock,
} from "lucide-react";

const card = { backgroundColor: "#FFFCF7", border: "1px solid rgba(245,215,160,0.25)", boxShadow: "0 1px 3px rgba(120,97,78,0.08)" };
const AMBER = "#F59E0B";
const GREEN = "#1DB954";
const RED = "#EF4444";

const SERVICE_META: Record<string, { label: string; icon: React.ElementType; desc: string }> = {
  supabase:       { label: "Supabase DB",      icon: Database,   desc: "Conexiune baza de date" },
  supabase_tables:{ label: "Tabele SQL",        icon: Database,   desc: "research_leads, agent_runs, cron_logs, discount_codes" },
  anthropic:      { label: "Anthropic AI",      icon: Brain,      desc: "Marketing Agent, Lead Finder, Captions" },
  apify:          { label: "Apify Scraper",     icon: Zap,        desc: "Research Hub, Local Market, Lead Finder" },
  resend:         { label: "Resend Email",      icon: Mail,       desc: "Onboarding, rapoarte lunare, alerte" },
  youtube:        { label: "YouTube API",       icon: Youtube,    desc: "Analytics canal, trending, căutare" },
  instagram:      { label: "Instagram / Meta",  icon: Instagram,  desc: "Insights, media, hashtags" },
  stripe:         { label: "Stripe Payments",   icon: CreditCard, desc: "Checkout, abonamente, webhooks" },
};

interface ServiceResult {
  ok: boolean;
  latency: number;
  detail: string;
}

interface HealthData {
  ok: boolean;
  checked_at: string;
  services: Record<string, ServiceResult>;
}

export default function AdminHealthCheck() {
  const [data, setData] = useState<HealthData | null>(null);
  const [loading, setLoading] = useState(false);
  const [lastRun, setLastRun] = useState<string | null>(null);

  const runCheck = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/health-check");
      const json = await res.json();
      setData(json);
      setLastRun(new Date().toLocaleTimeString("en-US"));
    } catch {
      setData(null);
    }
    setLoading(false);
  };

  useEffect(() => { runCheck(); }, []);

  const services = data?.services || {};
  const okCount = Object.values(services).filter(s => s.ok).length;
  const totalCount = Object.keys(services).length;

  return (
    <div className="rounded-2xl p-6 space-y-5" style={card}>
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center"
            style={{ backgroundColor: data?.ok ? "rgba(29,185,84,0.1)" : "rgba(239,68,68,0.1)" }}>
            {loading
              ? <Loader2 className="w-5 h-5 animate-spin" style={{ color: AMBER }} />
              : data?.ok
              ? <CheckCircle2 className="w-5 h-5" style={{ color: GREEN }} />
              : <XCircle className="w-5 h-5" style={{ color: RED }} />}
          </div>
          <div>
            <p className="font-bold text-base" style={{ color: "#292524" }}>Health Check Agent</p>
            <p className="text-xs" style={{ color: "#A8967E" }}>
              {loading ? "Testez toate serviciile…" : data ? `${okCount}/${totalCount} servicii funcționale` : "Apasă Run pentru a testa"}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {lastRun && (
            <span className="flex items-center gap-1 text-xs" style={{ color: "#A8967E" }}>
              <Clock className="w-3 h-3" /> Ultima rulare: {lastRun}
            </span>
          )}
          <button type="button" onClick={runCheck} disabled={loading}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold disabled:opacity-50 transition-all"
            style={{ backgroundColor: `${AMBER}15`, color: AMBER, border: `1px solid ${AMBER}30` }}>
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
            {loading ? "Se testează…" : "Run Check"}
          </button>
        </div>
      </div>

      {/* Overall status bar */}
      {!loading && data && (
        <div className="h-2 rounded-full overflow-hidden" style={{ backgroundColor: "rgba(245,215,160,0.15)" }}>
          <div className="h-full rounded-full transition-all duration-700"
            style={{
              width: `${(okCount / totalCount) * 100}%`,
              backgroundColor: okCount === totalCount ? GREEN : okCount >= totalCount / 2 ? AMBER : RED,
            }} />
        </div>
      )}

      {/* Services grid */}
      {!loading && data && (
        <div className="grid sm:grid-cols-2 gap-3">
          {Object.entries(services).map(([key, svc]) => {
            const meta = SERVICE_META[key] || { label: key, icon: Zap, desc: "" };
            const Icon = meta.icon;
            return (
              <div key={key} className="rounded-xl p-3 flex items-start gap-3 transition-all"
                style={{
                  backgroundColor: svc.ok ? "rgba(29,185,84,0.04)" : "rgba(239,68,68,0.04)",
                  border: `1px solid ${svc.ok ? "rgba(29,185,84,0.15)" : "rgba(239,68,68,0.15)"}`,
                }}>
                <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                  style={{ backgroundColor: svc.ok ? "rgba(29,185,84,0.1)" : "rgba(239,68,68,0.1)" }}>
                  <Icon className="w-4 h-4" style={{ color: svc.ok ? GREEN : RED }} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm font-bold" style={{ color: "#292524" }}>{meta.label}</p>
                    <div className="flex items-center gap-1.5 flex-shrink-0">
                      {svc.latency > 0 && (
                        <span className="text-xs" style={{ color: "#A8967E" }}>{svc.latency}ms</span>
                      )}
                      {svc.ok
                        ? <CheckCircle2 className="w-4 h-4 flex-shrink-0" style={{ color: GREEN }} />
                        : <XCircle className="w-4 h-4 flex-shrink-0" style={{ color: RED }} />}
                    </div>
                  </div>
                  <p className="text-xs mt-0.5 truncate" style={{ color: svc.ok ? "#78614E" : RED }}>
                    {svc.detail}
                  </p>
                  <p className="text-xs mt-0.5" style={{ color: "#C4AA8A" }}>{meta.desc}</p>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Skeleton while loading */}
      {loading && (
        <div className="grid sm:grid-cols-2 gap-3">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="rounded-xl p-3 flex items-start gap-3"
              style={{ backgroundColor: "rgba(245,215,160,0.04)", border: "1px solid rgba(245,215,160,0.1)" }}>
              <div className="w-8 h-8 rounded-lg animate-pulse" style={{ backgroundColor: "rgba(245,215,160,0.1)" }} />
              <div className="flex-1 space-y-2">
                <div className="h-3 rounded animate-pulse w-3/4" style={{ backgroundColor: "rgba(245,215,160,0.1)" }} />
                <div className="h-2.5 rounded animate-pulse w-full" style={{ backgroundColor: "rgba(245,215,160,0.08)" }} />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
