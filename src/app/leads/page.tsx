"use client";

import { useEffect, useState } from "react";
import Header from "@/components/layout/Header";
import {
  Phone, Globe, Star, MapPin, Instagram, Facebook, Play,
  Search, Trash2, Download, RefreshCw, Loader2, AlertCircle,
  Users, Map, Hash, ExternalLink, Filter, Copy, Check,
} from "lucide-react";

const card = { backgroundColor: "#FFFCF7", border: "1px solid rgba(245,215,160,0.25)", boxShadow: "0 1px 3px rgba(120,97,78,0.08)" };
const AMBER = "#F59E0B";
const IG = "#E1306C";
const FB = "#1877F2";
const TT = "#010101";
const GREEN = "#1DB954";

const SQL_MIGRATION = `-- Run in Supabase → SQL Editor

CREATE TABLE IF NOT EXISTS agent_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  session_id TEXT,
  goal TEXT,
  step_label TEXT,
  actor_type TEXT,
  apify_run_id TEXT,
  apify_actor_id TEXT,
  status TEXT DEFAULT 'running',
  input_params JSONB,
  raw_data JSONB,
  leads_count INTEGER DEFAULT 0,
  started_at TIMESTAMPTZ DEFAULT now(),
  finished_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS research_leads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  agent_session_id TEXT,
  goal TEXT,
  source TEXT,
  lead_type TEXT,
  name TEXT,
  category TEXT,
  address TEXT,
  city TEXT,
  phone TEXT,
  website TEXT,
  email TEXT,
  rating NUMERIC,
  reviews_count INTEGER,
  url TEXT,
  extra_data JSONB,
  contacted BOOLEAN DEFAULT false,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_leads_user ON research_leads(user_id);
CREATE INDEX IF NOT EXISTS idx_leads_type ON research_leads(lead_type);
CREATE INDEX IF NOT EXISTS idx_leads_session ON research_leads(agent_session_id);
CREATE INDEX IF NOT EXISTS idx_runs_user ON agent_runs(user_id);
CREATE INDEX IF NOT EXISTS idx_runs_apify ON agent_runs(apify_run_id);`;

type Lead = {
  id: string;
  lead_type: string;
  source: string;
  name: string;
  category?: string;
  address?: string;
  city?: string;
  phone?: string;
  website?: string;
  email?: string;
  rating?: number;
  reviews_count?: number;
  url?: string;
  goal?: string;
  contacted?: boolean;
  notes?: string;
  extra_data?: any;
  created_at: string;
};

const TYPE_COLORS: Record<string, string> = {
  local_business: "#34A853",
  website: AMBER,
  instagram: IG,
  tiktok: TT,
  facebook: FB,
};

const TYPE_ICONS: Record<string, React.ElementType> = {
  local_business: Map,
  website: Globe,
  instagram: Instagram,
  tiktok: Play,
  facebook: Facebook,
};

const TYPE_LABELS: Record<string, string> = {
  local_business: "Google Maps",
  website: "Google Search",
  instagram: "Instagram",
  tiktok: "TikTok",
  facebook: "Facebook",
};

function fmtNum(n: number) {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + "M";
  if (n >= 1_000) return (n / 1_000).toFixed(1) + "K";
  return String(Math.round(n));
}

export default function LeadsPage() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [tablesMissing, setTablesMissing] = useState(false);
  const [filter, setFilter] = useState<string>("all");
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [copied, setCopied] = useState(false);
  const [showSQL, setShowSQL] = useState(false);

  const fetchLeads = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/leads?limit=200");
      const data = await res.json();
      if (data.error?.includes("relation") || data.error?.includes("table")) {
        setTablesMissing(true);
      } else if (data.leads) {
        setLeads(data.leads);
        setTablesMissing(false);
      }
    } catch {
      setError("Network error");
    }
    setLoading(false);
  };

  useEffect(() => { fetchLeads(); }, []);

  const filtered = leads.filter(l => {
    const matchType = filter === "all" || l.lead_type === filter;
    const matchSearch = !search || [l.name, l.address, l.city, l.phone, l.category, l.goal]
      .some(v => v?.toLowerCase().includes(search.toLowerCase()));
    return matchType && matchSearch;
  });

  const toggleSelect = (id: string) => {
    const s = new Set(selected);
    s.has(id) ? s.delete(id) : s.add(id);
    setSelected(s);
  };

  const selectAll = () => {
    if (selected.size === filtered.length) setSelected(new Set());
    else setSelected(new Set(filtered.map(l => l.id)));
  };

  const handleDelete = async () => {
    if (!selected.size) return;
    await fetch("/api/leads", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ids: [...selected] }),
    });
    setSelected(new Set());
    fetchLeads();
  };

  const exportCSV = () => {
    const toExport = filtered.filter(l => selected.size === 0 || selected.has(l.id));
    const rows = [
      ["Name", "Type", "Category", "Address", "City", "Phone", "Website", "Email", "Rating", "URL", "Goal", "Date"],
      ...toExport.map(l => [
        l.name, TYPE_LABELS[l.lead_type] || l.lead_type, l.category || "",
        l.address || "", l.city || "", l.phone || "", l.website || "",
        l.email || "", l.rating?.toString() || "", l.url || "",
        l.goal || "", new Date(l.created_at).toLocaleDateString(),
      ]),
    ];
    const csv = rows.map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `leads-${new Date().toISOString().split("T")[0]}.csv`;
    a.click(); URL.revokeObjectURL(url);
  };

  const copySQL = () => {
    navigator.clipboard.writeText(SQL_MIGRATION);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const typeCounts = leads.reduce((acc, l) => {
    acc[l.lead_type] = (acc[l.lead_type] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const withPhone = leads.filter(l => l.phone).length;
  const withEmail = leads.filter(l => l.email).length;

  return (
    <div>
      <Header title="Leads Database" subtitle="Contacte descoperite de Marketing Agent — salvate automat via Apify Webhooks" />
      <div className="p-6 space-y-5">

        {/* SQL Migration notice */}
        {tablesMissing && (
          <div className="rounded-2xl p-5 space-y-3"
            style={{ backgroundColor: "rgba(99,102,241,0.05)", border: "1px solid rgba(99,102,241,0.2)" }}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <AlertCircle className="w-5 h-5" style={{ color: "#6366F1" }} />
                <p className="font-bold" style={{ color: "#292524" }}>Tabelele nu există încă în Supabase</p>
              </div>
              <div className="flex gap-2">
                <button type="button" onClick={() => setShowSQL(s => !s)}
                  className="text-xs px-3 py-1.5 rounded-lg font-semibold"
                  style={{ backgroundColor: "rgba(99,102,241,0.1)", color: "#6366F1" }}>
                  {showSQL ? "Ascunde SQL" : "Vezi SQL"}
                </button>
                <button type="button" onClick={copySQL}
                  className="flex items-center gap-1 text-xs px-3 py-1.5 rounded-lg font-semibold"
                  style={{ backgroundColor: copied ? "rgba(29,185,84,0.1)" : "rgba(99,102,241,0.1)", color: copied ? GREEN : "#6366F1" }}>
                  {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                  {copied ? "Copiat!" : "Copiază SQL"}
                </button>
              </div>
            </div>
            <p className="text-sm" style={{ color: "#78614E" }}>
              Rulează SQL-ul de mai jos în <strong>Supabase → SQL Editor</strong>, apoi actualizează pagina.
            </p>
            {showSQL && (
              <pre className="text-xs rounded-xl p-4 overflow-x-auto"
                style={{ backgroundColor: "#1C1814", color: "#FFF8F0", border: "1px solid rgba(245,215,160,0.1)" }}>
                {SQL_MIGRATION}
              </pre>
            )}
          </div>
        )}

        {/* Webhook setup info */}
        <div className="rounded-2xl p-5 space-y-3" style={card}>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full animate-pulse" style={{ backgroundColor: GREEN }} />
            <p className="font-bold text-sm" style={{ color: "#292524" }}>Apify Webhook — Configurare</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            <div className="rounded-xl p-3" style={{ backgroundColor: "rgba(29,185,84,0.06)", border: "1px solid rgba(29,185,84,0.15)" }}>
              <p className="font-bold mb-1" style={{ color: GREEN }}>Webhook URL</p>
              <code className="block font-mono text-xs break-all" style={{ color: "#292524" }}>
                https://markethubpromo.com/api/webhooks/apify
              </code>
              <p className="mt-1" style={{ color: "#A8967E" }}>Adaugă în Apify → Actor → Settings → Webhooks</p>
            </div>
            <div className="rounded-xl p-3" style={{ backgroundColor: "rgba(245,158,11,0.06)", border: "1px solid rgba(245,158,11,0.15)" }}>
              <p className="font-bold mb-1" style={{ color: AMBER }}>Events de activat</p>
              <p style={{ color: "#78614E" }}>✓ ACTOR.RUN.SUCCEEDED</p>
              <p style={{ color: "#78614E" }}>✓ ACTOR.RUN.FAILED</p>
              <p className="mt-1" style={{ color: "#A8967E" }}>Datele se salvează automat la finalizare</p>
            </div>
            <div className="rounded-xl p-3" style={{ backgroundColor: "rgba(99,102,241,0.06)", border: "1px solid rgba(99,102,241,0.15)" }}>
              <p className="font-bold mb-1" style={{ color: "#6366F1" }}>ENV Variable</p>
              <code className="font-mono" style={{ color: "#292524" }}>APIFY_WEBHOOK_SECRET=<span style={{ color: "#A8967E" }}>orice_string_secret</span></code>
              <p className="mt-1" style={{ color: "#A8967E" }}>Adaugă în Vercel + .env.local</p>
            </div>
            <div className="rounded-xl p-3" style={{ backgroundColor: "rgba(245,215,160,0.08)", border: "1px solid rgba(245,215,160,0.2)" }}>
              <p className="font-bold mb-1" style={{ color: "#78614E" }}>Flow automat</p>
              <p style={{ color: "#78614E" }}>1. Agent pornește Apify run</p>
              <p style={{ color: "#78614E" }}>2. Apify procesează în background</p>
              <p style={{ color: "#78614E" }}>3. Webhook → date în Supabase</p>
              <p style={{ color: GREEN }}>4. Leads apar automat aici ✓</p>
            </div>
          </div>
        </div>

        {/* Stats */}
        {!tablesMissing && leads.length > 0 && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="rounded-xl p-4" style={card}>
              <p className="text-2xl font-bold" style={{ color: AMBER }}>{leads.length}</p>
              <p className="text-xs mt-0.5" style={{ color: "#A8967E" }}>Total leads</p>
            </div>
            <div className="rounded-xl p-4" style={card}>
              <p className="text-2xl font-bold" style={{ color: GREEN }}>{withPhone}</p>
              <p className="text-xs mt-0.5" style={{ color: "#A8967E" }}>Cu telefon</p>
            </div>
            <div className="rounded-xl p-4" style={card}>
              <p className="text-2xl font-bold" style={{ color: "#6366F1" }}>{withEmail}</p>
              <p className="text-xs mt-0.5" style={{ color: "#A8967E" }}>Cu email</p>
            </div>
            <div className="rounded-xl p-4" style={card}>
              <p className="text-2xl font-bold" style={{ color: IG }}>
                {leads.filter(l => l.contacted).length}
              </p>
              <p className="text-xs mt-0.5" style={{ color: "#A8967E" }}>Contactați</p>
            </div>
          </div>
        )}

        {/* Toolbar */}
        {!tablesMissing && (
          <div className="flex items-center gap-3 flex-wrap">
            <div className="flex items-center gap-2 flex-1 px-3 py-2 rounded-xl min-w-48"
              style={{ border: "1px solid rgba(245,215,160,0.3)", backgroundColor: "#FFFDF9" }}>
              <Search className="w-3.5 h-3.5 flex-shrink-0" style={{ color: "#C4AA8A" }} />
              <input type="text" value={search} onChange={e => setSearch(e.target.value)}
                placeholder="Caută după nume, telefon, oraș..."
                className="flex-1 text-xs bg-transparent focus:outline-none" style={{ color: "#292524" }} />
            </div>

            {/* Type filter */}
            <div className="flex gap-1.5 flex-wrap">
              {["all", "local_business", "instagram", "tiktok", "facebook", "website"].map(t => {
                const Icon = t === "all" ? Filter : TYPE_ICONS[t] || Filter;
                const color = t === "all" ? AMBER : TYPE_COLORS[t] || AMBER;
                return (
                  <button key={t} type="button" onClick={() => setFilter(t)}
                    className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all"
                    style={filter === t
                      ? { backgroundColor: color + "20", color, border: `1px solid ${color}40` }
                      : { backgroundColor: "rgba(245,215,160,0.1)", color: "#A8967E", border: "1px solid rgba(245,215,160,0.2)" }}>
                    <Icon className="w-3 h-3" />
                    {t === "all" ? `Toate (${leads.length})` : `${TYPE_LABELS[t] || t} (${typeCounts[t] || 0})`}
                  </button>
                );
              })}
            </div>

            <div className="flex gap-2 ml-auto">
              {selected.size > 0 && (
                <button type="button" onClick={handleDelete}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold"
                  style={{ backgroundColor: "rgba(239,68,68,0.1)", color: "#DC2626" }}>
                  <Trash2 className="w-3 h-3" />Șterge ({selected.size})
                </button>
              )}
              <button type="button" onClick={exportCSV}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold"
                style={{ backgroundColor: "rgba(29,185,84,0.1)", color: GREEN }}>
                <Download className="w-3 h-3" />Export CSV {selected.size > 0 ? `(${selected.size})` : ""}
              </button>
              <button type="button" onClick={fetchLeads} disabled={loading}
                className="p-1.5 rounded-lg" style={{ color: "#A8967E" }}>
                <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
              </button>
            </div>
          </div>
        )}

        {/* Leads list */}
        {loading && (
          <div className="flex justify-center py-10">
            <Loader2 className="w-5 h-5 animate-spin" style={{ color: AMBER }} />
          </div>
        )}

        {!loading && !tablesMissing && filtered.length === 0 && (
          <div className="rounded-2xl p-10 text-center" style={card}>
            <Users className="w-10 h-10 mx-auto mb-3" style={{ color: "rgba(196,170,138,0.4)" }} />
            <p className="font-semibold" style={{ color: "#78614E" }}>
              {leads.length === 0 ? "Niciun lead salvat încă" : "Niciun rezultat pentru filtrele selectate"}
            </p>
            <p className="text-sm mt-1" style={{ color: "#C4AA8A" }}>
              {leads.length === 0
                ? "Pornește Marketing Agent → leads se salvează automat via webhook"
                : "Schimbă filtrul sau caută alt termen"}
            </p>
          </div>
        )}

        {!loading && filtered.length > 0 && (
          <div className="rounded-2xl overflow-hidden" style={card}>
            <div className="px-4 py-3 flex items-center gap-3"
              style={{ borderBottom: "1px solid rgba(245,215,160,0.2)" }}>
              <input type="checkbox" checked={selected.size === filtered.length && filtered.length > 0}
                onChange={selectAll} className="w-3.5 h-3.5 rounded" />
              <span className="text-xs font-semibold" style={{ color: "#A8967E" }}>
                {filtered.length} leads {selected.size > 0 ? `· ${selected.size} selectate` : ""}
              </span>
            </div>

            <div className="divide-y" style={{ borderColor: "rgba(245,215,160,0.1)" }}>
              {filtered.map(lead => {
                const Icon = TYPE_ICONS[lead.lead_type] || Globe;
                const color = TYPE_COLORS[lead.lead_type] || AMBER;
                const isSelected = selected.has(lead.id);

                return (
                  <div key={lead.id}
                    className="px-4 py-3 flex items-start gap-3 transition-colors"
                    style={{ backgroundColor: isSelected ? "rgba(245,158,11,0.04)" : "transparent" }}>
                    <input type="checkbox" checked={isSelected}
                      onChange={() => toggleSelect(lead.id)}
                      className="w-3.5 h-3.5 rounded mt-1 flex-shrink-0" />

                    <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5"
                      style={{ backgroundColor: color + "15" }}>
                      <Icon className="w-3.5 h-3.5" style={{ color }} />
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2 flex-wrap">
                        <div>
                          <p className="text-sm font-bold" style={{ color: "#292524" }}>{lead.name || "—"}</p>
                          {lead.category && (
                            <p className="text-xs" style={{ color: "#A8967E" }}>{lead.category}</p>
                          )}
                        </div>
                        <span className="text-xs px-2 py-0.5 rounded-full font-semibold flex-shrink-0"
                          style={{ backgroundColor: color + "15", color }}>
                          {TYPE_LABELS[lead.lead_type] || lead.lead_type}
                        </span>
                      </div>

                      <div className="flex items-center gap-4 mt-1.5 flex-wrap">
                        {lead.address && (
                          <span className="flex items-center gap-1 text-xs" style={{ color: "#78614E" }}>
                            <MapPin className="w-3 h-3" />{lead.address}{lead.city ? `, ${lead.city}` : ""}
                          </span>
                        )}
                        {lead.phone && (
                          <a href={`tel:${lead.phone}`} className="flex items-center gap-1 text-xs font-semibold"
                            style={{ color: GREEN }}>
                            <Phone className="w-3 h-3" />{lead.phone}
                          </a>
                        )}
                        {lead.rating && (
                          <span className="flex items-center gap-0.5 text-xs" style={{ color: AMBER }}>
                            <Star className="w-3 h-3" />{lead.rating}
                            {lead.reviews_count ? ` (${fmtNum(lead.reviews_count)})` : ""}
                          </span>
                        )}
                        {lead.website && (
                          <a href={lead.website} target="_blank" rel="noopener noreferrer"
                            className="flex items-center gap-1 text-xs" style={{ color: "#A8967E" }}>
                            <Globe className="w-3 h-3" />website
                          </a>
                        )}
                        {lead.url && !lead.website && (
                          <a href={lead.url} target="_blank" rel="noopener noreferrer"
                            className="flex items-center gap-1 text-xs" style={{ color: color }}>
                            <ExternalLink className="w-3 h-3" />profil
                          </a>
                        )}
                      </div>

                      {lead.goal && (
                        <p className="text-xs mt-1" style={{ color: "#C4AA8A" }}>
                          Goal: {lead.goal.slice(0, 80)}{lead.goal.length > 80 ? "…" : ""}
                        </p>
                      )}

                      {/* Social extra data */}
                      {lead.extra_data?.followers && (
                        <p className="text-xs mt-1 font-semibold" style={{ color }}>
                          {fmtNum(lead.extra_data.followers)} followers
                          {lead.extra_data.plays ? ` · ${fmtNum(lead.extra_data.plays)} views` : ""}
                        </p>
                      )}
                    </div>

                    <p className="text-xs flex-shrink-0" style={{ color: "#C4AA8A" }}>
                      {new Date(lead.created_at).toLocaleDateString("ro", { day: "2-digit", month: "short" })}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
