"use client";

import { useEffect, useState, useRef } from "react";
import Header from "@/components/layout/Header";
import {
  Phone, Globe, Star, MapPin, Instagram, Facebook, Play,
  Search, Trash2, Download, RefreshCw, Loader2, AlertCircle,
  Users, Map, Hash, ExternalLink, Filter, Copy, Check,
  CheckCircle2, Circle, StickyNote, X, Youtube, MessageSquare,
  Sparkles, Mail, Send, Upload,
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
  pipeline_status?: string;
  extra_data?: any;
  created_at: string;
};

// Pipeline stages — keep order, the UI cycles through this list and stage
// filter pills follow the same sequence so the user reads it as a funnel.
const PIPELINE_STAGES: { key: string; label: string; color: string }[] = [
  { key: "new", label: "New", color: "#A8967E" },
  { key: "contacted", label: "Contacted", color: "#F59E0B" },
  { key: "replied", label: "Replied", color: "#3B82F6" },
  { key: "interested", label: "Interested", color: "#8B5CF6" },
  { key: "client", label: "Client", color: "#1DB954" },
  { key: "lost", label: "Lost", color: "#DC2626" },
];
const STAGE_BY_KEY = Object.fromEntries(PIPELINE_STAGES.map(s => [s.key, s]));

const TYPE_COLORS: Record<string, string> = {
  local_business: "#34A853",
  website: AMBER,
  instagram: IG,
  tiktok: TT,
  facebook: FB,
  youtube: "#FF0000",
  reddit: "#FF4500",
};

const TYPE_ICONS: Record<string, React.ElementType> = {
  local_business: Map,
  website: Globe,
  instagram: Instagram,
  tiktok: Play,
  facebook: Facebook,
  youtube: Youtube,
  reddit: MessageSquare,
};

const TYPE_LABELS: Record<string, string> = {
  local_business: "Google Maps",
  website: "Website",
  instagram: "Instagram",
  tiktok: "TikTok",
  facebook: "Facebook",
  youtube: "YouTube",
  reddit: "Reddit",
};

function fmtNum(n: number) {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + "M";
  if (n >= 1_000) return (n / 1_000).toFixed(1) + "K";
  return String(Math.round(n));
}

// Extract bare domain (e.g. "youtube.com", "mellamusicproduction.ro") from any URL
// so the user can see WHERE the lead actually points without clicking it.
function hostnameOf(u: string | null | undefined): string {
  if (!u) return "";
  try {
    const url = u.startsWith("http") ? new URL(u) : new URL("https://" + u);
    return url.hostname.replace(/^www\./, "");
  } catch {
    return u;
  }
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
  const [editingNote, setEditingNote] = useState<string | null>(null); // lead id
  const [noteText, setNoteText] = useState("");
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [stageFilter, setStageFilter] = useState<string>("all");
  const [enriching, setEnriching] = useState(false);
  const [enrichMsg, setEnrichMsg] = useState<string | null>(null);
  // Email composer state — modal opens when emailingLead is set.
  const [emailingLead, setEmailingLead] = useState<Lead | null>(null);
  const [emailGoal, setEmailGoal] = useState("");
  const [emailDraft, setEmailDraft] = useState<{ subject: string; body: string; to: string } | null>(null);
  const [generatingEmail, setGeneratingEmail] = useState(false);
  const [emailError, setEmailError] = useState<string | null>(null);

  const handleSetStage = async (lead: Lead, stage: string) => {
    setTogglingId(lead.id);
    await fetch("/api/leads", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: lead.id, pipeline_status: stage }),
    });
    setLeads(ls => ls.map(l => l.id === lead.id ? { ...l, pipeline_status: stage } : l));
    setTogglingId(null);
  };

  const handleSaveNote = async (id: string) => {
    await fetch("/api/leads", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, notes: noteText }),
    });
    setLeads(ls => ls.map(l => l.id === id ? { ...l, notes: noteText } : l));
    setEditingNote(null);
  };

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
    const matchStage = stageFilter === "all" || (l.pipeline_status || "new") === stageFilter;
    const matchSearch = !search || [l.name, l.address, l.city, l.phone, l.category, l.goal]
      .some(v => v?.toLowerCase().includes(search.toLowerCase()));
    return matchType && matchStage && matchSearch;
  });

  const stageCounts = leads.reduce((acc, l) => {
    const k = l.pipeline_status || "new";
    acc[k] = (acc[k] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const toggleSelect = (id: string) => {
    const s = new Set(selected);
    s.has(id) ? s.delete(id) : s.add(id);
    setSelected(s);
  };

  const selectAll = () => {
    if (selected.size === filtered.length) setSelected(new Set());
    else setSelected(new Set(filtered.map(l => l.id)));
  };

  const handleEnrich = async () => {
    // Pick selected enrichable leads, or all visible enrichable leads if nothing selected.
    // website → HTML scraper (tel:/email regex), instagram/youtube → Apify actors.
    const ENRICHABLE = new Set(["instagram", "youtube", "website"]);
    const pool = filtered.filter(l => ENRICHABLE.has(l.lead_type));
    const targets = selected.size > 0
      ? pool.filter(l => selected.has(l.id))
      : pool;
    if (!targets.length) {
      setEnrichMsg("Niciun lead enrichable (Instagram/YouTube/Website)");
      setTimeout(() => setEnrichMsg(null), 4000);
      return;
    }
    setEnriching(true);
    setEnrichMsg(null);
    try {
      const res = await fetch("/api/leads/enrich", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: targets.slice(0, 10).map(l => l.id) }),
      });
      const json = await res.json();
      if (!res.ok) {
        setEnrichMsg(json?.error || `HTTP ${res.status}`);
      } else {
        const parts = [`${json.enriched} îmbogățite`];
        if (json.skipped) parts.push(`${json.skipped} sărite`);
        if (json.errors) parts.push(`${json.errors} erori`);
        setEnrichMsg(parts.join(" • "));
        await fetchLeads();
      }
    } catch (e: any) {
      setEnrichMsg(e?.message || "Network error");
    } finally {
      setEnriching(false);
      setTimeout(() => setEnrichMsg(null), 6000);
    }
  };

  const handleOpenEmail = (lead: Lead) => {
    setEmailingLead(lead);
    setEmailGoal("");
    setEmailDraft(null);
    setEmailError(null);
  };

  const handleCloseEmail = () => {
    setEmailingLead(null);
    setEmailGoal("");
    setEmailDraft(null);
    setEmailError(null);
    setGeneratingEmail(false);
  };

  const handleGenerateEmail = async () => {
    if (!emailingLead) return;
    setGeneratingEmail(true);
    setEmailError(null);
    setEmailDraft(null);
    try {
      const res = await fetch("/api/leads/email/draft", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ lead_id: emailingLead.id, goal: emailGoal.trim() || undefined }),
      });
      const json = await res.json();
      if (!res.ok) {
        setEmailError(json?.error || `HTTP ${res.status}`);
      } else {
        setEmailDraft({ subject: json.subject || "", body: json.body || "", to: json.to || emailingLead.email || "" });
      }
    } catch (e: any) {
      setEmailError(e?.message || "Network error");
    } finally {
      setGeneratingEmail(false);
    }
  };

  const handleOpenInGmail = async () => {
    if (!emailingLead || !emailDraft) return;
    // Zero-OAuth Gmail compose URL — opens a new tab with subject & body pre-filled.
    // The user reviews and clicks Send themselves.
    const params = new URLSearchParams({
      view: "cm",
      fs: "1",
      to: emailDraft.to,
      su: emailDraft.subject,
      body: emailDraft.body,
    });
    const url = `https://mail.google.com/mail/?${params.toString()}`;
    window.open(url, "_blank", "noopener,noreferrer");

    // Auto-bump pipeline_status to "contacted" if still in "new" — best-effort,
    // we don't block the Gmail tab if the PATCH fails.
    if ((emailingLead.pipeline_status || "new") === "new") {
      try {
        await fetch("/api/leads", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id: emailingLead.id, pipeline_status: "contacted" }),
        });
        setLeads(ls => ls.map(l => l.id === emailingLead.id ? { ...l, pipeline_status: "contacted" } : l));
      } catch {}
    }
    handleCloseEmail();
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

  const csvInputRef = useRef<HTMLInputElement>(null);
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<string | null>(null);

  const importCSV = async (file: File) => {
    setImporting(true); setImportResult(null);
    const text = await file.text();
    const lines = text.split("\n").map(l => l.trim()).filter(Boolean);
    if (lines.length < 2) { setImporting(false); return; }

    const headers = lines[0].split(",").map(h => h.replace(/"/g, "").trim().toLowerCase());
    const leads = lines.slice(1).map(line => {
      const vals = line.match(/(".*?"|[^,]+|(?<=,)(?=,)|^(?=,))/g) ?? line.split(",");
      const obj: Record<string, string> = {};
      headers.forEach((h, i) => { obj[h] = (vals[i] ?? "").replace(/^"|"$/g, "").trim(); });
      return {
        name: obj.name || obj.company || obj.business || "",
        email: obj.email || obj["e-mail"] || "",
        phone: obj.phone || obj.tel || obj.telephone || "",
        website: obj.website || obj.url || obj.site || "",
        city: obj.city || obj.oras || obj.location || "",
        address: obj.address || obj.adresa || "",
        category: obj.category || obj.niche || obj.industry || "",
        notes: obj.notes || obj.note || "",
      };
    }).filter(l => l.name || l.email || l.website);

    const res = await fetch("/api/leads/import", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ leads }) });
    const d = await res.json();
    setImportResult(d.message || "Import complet");
    if (d.imported > 0) fetchLeads();
    setImporting(false);
  };

  const exportCSV = () => {
    const toExport = filtered.filter(l => selected.size === 0 || selected.has(l.id));
    const rows = [
      ["Source", "Stage", "Name", "Category", "Address", "City", "Phone", "Website", "Email", "Rating", "URL", "Goal", "Notes", "Date"],
      ...toExport.map(l => [
        TYPE_LABELS[l.lead_type] || l.lead_type,
        STAGE_BY_KEY[l.pipeline_status || "new"]?.label || "New",
        l.name, l.category || "",
        l.address || "", l.city || "", l.phone || "", l.website || "",
        l.email || "", l.rating?.toString() || "", l.url || "",
        l.goal || "", l.notes || "", new Date(l.created_at).toLocaleDateString(),
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
      <Header title="Leads Database" subtitle="Contacts discovered by Marketing Agent — saved automatically via Apify Webhooks" />
      <div className="p-6 space-y-5">

        {/* SQL Migration notice */}
        {tablesMissing && (
          <div className="rounded-2xl p-5 space-y-3"
            style={{ backgroundColor: "rgba(99,102,241,0.05)", border: "1px solid rgba(99,102,241,0.2)" }}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <AlertCircle className="w-5 h-5" style={{ color: "#6366F1" }} />
                <p className="font-bold" style={{ color: "#292524" }}>Tables don't exist yet in Supabase</p>
              </div>
              <div className="flex gap-2">
                <button type="button" onClick={() => setShowSQL(s => !s)}
                  className="text-xs px-3 py-1.5 rounded-lg font-semibold"
                  style={{ backgroundColor: "rgba(99,102,241,0.1)", color: "#6366F1" }}>
                  {showSQL ? "Hide SQL" : "View SQL"}
                </button>
                <button type="button" onClick={copySQL}
                  className="flex items-center gap-1 text-xs px-3 py-1.5 rounded-lg font-semibold"
                  style={{ backgroundColor: copied ? "rgba(29,185,84,0.1)" : "rgba(99,102,241,0.1)", color: copied ? GREEN : "#6366F1" }}>
                  {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                  {copied ? "Copied!" : "Copy SQL"}
                </button>
              </div>
            </div>
            <p className="text-sm" style={{ color: "#78614E" }}>
              Run the SQL below in <strong>Supabase → SQL Editor</strong>, then refresh the page.
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
            <p className="font-bold text-sm" style={{ color: "#292524" }}>Apify Webhook — Setup</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            <div className="rounded-xl p-3" style={{ backgroundColor: "rgba(29,185,84,0.06)", border: "1px solid rgba(29,185,84,0.15)" }}>
              <p className="font-bold mb-1" style={{ color: GREEN }}>Webhook URL</p>
              <code className="block font-mono text-xs break-all" style={{ color: "#292524" }}>
                https://markethubpromo.com/api/webhooks/apify
              </code>
              <p className="mt-1" style={{ color: "#A8967E" }}>Add it in Apify → Actor → Settings → Webhooks</p>
            </div>
            <div className="rounded-xl p-3" style={{ backgroundColor: "rgba(245,158,11,0.06)", border: "1px solid rgba(245,158,11,0.15)" }}>
              <p className="font-bold mb-1" style={{ color: AMBER }}>Events to enable</p>
              <p style={{ color: "#78614E" }}>✓ ACTOR.RUN.SUCCEEDED</p>
              <p style={{ color: "#78614E" }}>✓ ACTOR.RUN.FAILED</p>
              <p className="mt-1" style={{ color: "#A8967E" }}>Data is saved automatically on completion</p>
            </div>
            <div className="rounded-xl p-3" style={{ backgroundColor: "rgba(99,102,241,0.06)", border: "1px solid rgba(99,102,241,0.15)" }}>
              <p className="font-bold mb-1" style={{ color: "#6366F1" }}>ENV Variable</p>
              <code className="font-mono" style={{ color: "#292524" }}>APIFY_WEBHOOK_SECRET=<span style={{ color: "#A8967E" }}>any_secret_string</span></code>
              <p className="mt-1" style={{ color: "#A8967E" }}>Add it in Vercel + .env.local</p>
            </div>
            <div className="rounded-xl p-3" style={{ backgroundColor: "rgba(245,215,160,0.08)", border: "1px solid rgba(245,215,160,0.2)" }}>
              <p className="font-bold mb-1" style={{ color: "#78614E" }}>Automatic flow</p>
              <p style={{ color: "#78614E" }}>1. Agent starts Apify run</p>
              <p style={{ color: "#78614E" }}>2. Apify processes in background</p>
              <p style={{ color: "#78614E" }}>3. Webhook → data into Supabase</p>
              <p style={{ color: GREEN }}>4. Leads appear here automatically ✓</p>
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
              <p className="text-xs mt-0.5" style={{ color: "#A8967E" }}>With phone</p>
            </div>
            <div className="rounded-xl p-4" style={card}>
              <p className="text-2xl font-bold" style={{ color: "#6366F1" }}>{withEmail}</p>
              <p className="text-xs mt-0.5" style={{ color: "#A8967E" }}>With email</p>
            </div>
            <div className="rounded-xl p-4" style={card}>
              <p className="text-2xl font-bold" style={{ color: STAGE_BY_KEY.client.color }}>
                {stageCounts.client || 0}
              </p>
              <p className="text-xs mt-0.5" style={{ color: "#A8967E" }}>Clients converted</p>
            </div>
          </div>
        )}

        {/* Pipeline funnel — counts per stage in order, click to filter */}
        {!tablesMissing && leads.length > 0 && (
          <div className="rounded-xl p-3 flex items-center gap-2 flex-wrap" style={card}>
            <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color: "#A8967E" }}>Pipeline:</span>
            <button type="button" onClick={() => setStageFilter("all")}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold transition-all"
              style={stageFilter === "all"
                ? { backgroundColor: AMBER + "20", color: AMBER, border: `1px solid ${AMBER}40` }
                : { backgroundColor: "rgba(245,215,160,0.1)", color: "#A8967E", border: "1px solid rgba(245,215,160,0.2)" }}>
              All ({leads.length})
            </button>
            {PIPELINE_STAGES.map(s => (
              <button key={s.key} type="button" onClick={() => setStageFilter(s.key)}
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold transition-all"
                style={stageFilter === s.key
                  ? { backgroundColor: s.color + "20", color: s.color, border: `1px solid ${s.color}40` }
                  : { backgroundColor: "rgba(245,215,160,0.1)", color: "#A8967E", border: "1px solid rgba(245,215,160,0.2)" }}>
                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: s.color }} />
                {s.label} ({stageCounts[s.key] || 0})
              </button>
            ))}
          </div>
        )}

        {/* Toolbar */}
        {!tablesMissing && (
          <div className="flex items-center gap-3 flex-wrap">
            <div className="flex items-center gap-2 flex-1 px-3 py-2 rounded-xl min-w-48"
              style={{ border: "1px solid rgba(245,215,160,0.3)", backgroundColor: "#FFFDF9" }}>
              <Search className="w-3.5 h-3.5 flex-shrink-0" style={{ color: "#C4AA8A" }} />
              <input type="text" value={search} onChange={e => setSearch(e.target.value)}
                placeholder="Search by name, phone, city..."
                className="flex-1 text-xs bg-transparent focus:outline-none" style={{ color: "#292524" }} />
            </div>

            {/* Type filter */}
            <div className="flex gap-1.5 flex-wrap">
              {["all", "local_business", "instagram", "tiktok", "youtube", "facebook", "reddit", "website"].map(t => {
                const Icon = t === "all" ? Filter : TYPE_ICONS[t] || Filter;
                const color = t === "all" ? AMBER : TYPE_COLORS[t] || AMBER;
                return (
                  <button key={t} type="button" onClick={() => setFilter(t)}
                    className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all"
                    style={filter === t
                      ? { backgroundColor: color + "20", color, border: `1px solid ${color}40` }
                      : { backgroundColor: "rgba(245,215,160,0.1)", color: "#A8967E", border: "1px solid rgba(245,215,160,0.2)" }}>
                    <Icon className="w-3 h-3" />
                    {t === "all" ? `All (${leads.length})` : `${TYPE_LABELS[t] || t} (${typeCounts[t] || 0})`}
                  </button>
                );
              })}
            </div>

            <div className="flex gap-2 ml-auto">
              {selected.size > 0 && (
                <button type="button" onClick={handleDelete}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold"
                  style={{ backgroundColor: "rgba(239,68,68,0.1)", color: "#DC2626" }}>
                  <Trash2 className="w-3 h-3" />Delete ({selected.size})
                </button>
              )}
              <button type="button" onClick={handleEnrich} disabled={enriching}
                title="Îmbogățește lead-uri Instagram/YouTube cu bio + email + telefon"
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold disabled:opacity-50"
                style={{ backgroundColor: "rgba(139,92,246,0.1)", color: "#8B5CF6" }}>
                {enriching ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />}
                Enrich {selected.size > 0 ? `(${selected.size})` : ""}
              </button>
              <button type="button" onClick={exportCSV}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold"
                style={{ backgroundColor: "rgba(29,185,84,0.1)", color: GREEN }}>
                <Download className="w-3 h-3" />Export CSV {selected.size > 0 ? `(${selected.size})` : ""}
              </button>
              <input ref={csvInputRef} type="file" accept=".csv" className="hidden"
                onChange={e => { const f = e.target.files?.[0]; if (f) importCSV(f); e.target.value = ""; }} />
              <button type="button" onClick={() => csvInputRef.current?.click()} disabled={importing}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold disabled:opacity-50"
                style={{ backgroundColor: "rgba(99,102,241,0.1)", color: "#6366F1" }}>
                {importing ? <Loader2 className="w-3 h-3 animate-spin" /> : <Upload className="w-3 h-3" />}
                Import CSV
              </button>
              <button type="button" onClick={fetchLeads} disabled={loading}
                className="p-1.5 rounded-lg" style={{ color: "#A8967E" }}>
                <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
              </button>
            </div>
          </div>
        )}

        {importResult && (
          <div className="rounded-xl p-3 text-xs font-semibold flex items-center gap-2"
            style={{ backgroundColor: "rgba(99,102,241,0.08)", color: "#6366F1" }}>
            <Check className="w-4 h-4" /> {importResult}
            <button type="button" onClick={() => setImportResult(null)} className="ml-auto"><X className="w-3.5 h-3.5" /></button>
          </div>
        )}
        {enrichMsg && (
          <div className="rounded-xl p-3 text-xs font-semibold flex items-center gap-2"
            style={{ backgroundColor: "rgba(139,92,246,0.08)", color: "#8B5CF6", border: "1px solid rgba(139,92,246,0.2)" }}>
            <Sparkles className="w-3.5 h-3.5" />
            {enrichMsg}
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
              {leads.length === 0 ? "No leads saved yet" : "No results for the selected filters"}
            </p>
            <p className="text-sm mt-1" style={{ color: "#C4AA8A" }}>
              {leads.length === 0
                ? "Start the Marketing Agent → leads are saved automatically via webhook"
                : "Change the filter or search for a different term"}
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
                {filtered.length} leads {selected.size > 0 ? `· ${selected.size} selected` : ""}
              </span>
            </div>

            <div className="divide-y" style={{ borderColor: "rgba(245,215,160,0.1)" }}>
              {filtered.map(lead => {
                const Icon = TYPE_ICONS[lead.lead_type] || Globe;
                const color = TYPE_COLORS[lead.lead_type] || AMBER;
                const isSelected = selected.has(lead.id);

                return (
                  <div key={lead.id}>
                  <div className="px-4 py-3 flex items-start gap-3 transition-colors"
                    style={{ backgroundColor: isSelected ? "rgba(245,158,11,0.04)" : "transparent" }}>
                    <input type="checkbox" checked={isSelected}
                      onChange={() => toggleSelect(lead.id)}
                      className="w-3.5 h-3.5 rounded mt-1 flex-shrink-0" />

                    <div className="flex-1 min-w-0">
                      {/* Source label is the FIRST visible element in the title row, then the lead name */}
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-md font-bold uppercase tracking-wider flex-shrink-0"
                          style={{ backgroundColor: color, color: lead.lead_type === "tiktok" ? "#FFF8F0" : "white" }}>
                          <Icon className="w-2.5 h-2.5" />
                          {TYPE_LABELS[lead.lead_type] || lead.lead_type}
                        </span>
                        <p className="text-sm font-bold" style={{ color: "#292524" }}>{lead.name || "—"}</p>
                      </div>
                      {lead.category && (
                        <p className="text-xs mt-0.5" style={{ color: "#A8967E" }}>{lead.category}</p>
                      )}

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
                            className="flex items-center gap-1 text-xs font-semibold hover:underline" style={{ color: "#6366F1" }}>
                            <Globe className="w-3 h-3" />{hostnameOf(lead.website)}
                          </a>
                        )}
                        {lead.url && !lead.website && (
                          <a href={lead.url} target="_blank" rel="noopener noreferrer"
                            className="flex items-center gap-1 text-xs font-semibold hover:underline" style={{ color }}>
                            <ExternalLink className="w-3 h-3" />{hostnameOf(lead.url)}
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

                    <div className="flex flex-col items-end gap-1.5 flex-shrink-0">
                      <p className="text-xs" style={{ color: "#C4AA8A" }}>
                        {new Date(lead.created_at).toLocaleDateString("en", { day: "2-digit", month: "short" })}
                      </p>
                      {/* Pipeline stage selector — native select styled as a colored badge */}
                      {(() => {
                        const stage = STAGE_BY_KEY[lead.pipeline_status || "new"] || STAGE_BY_KEY.new;
                        return (
                          <div className="relative">
                            <select
                              value={lead.pipeline_status || "new"}
                              onChange={e => handleSetStage(lead, e.target.value)}
                              disabled={togglingId === lead.id}
                              aria-label={`Pipeline stage for ${lead.name || "lead"}`}
                              title="Pipeline stage"
                              className="text-xs font-bold px-2 py-1 pr-6 rounded-lg appearance-none cursor-pointer transition-all focus:outline-none"
                              style={{
                                backgroundColor: stage.color + "15",
                                color: stage.color,
                                border: `1px solid ${stage.color}40`,
                              }}>
                              {PIPELINE_STAGES.map(s => (
                                <option key={s.key} value={s.key}>{s.label}</option>
                              ))}
                            </select>
                            <span className="pointer-events-none absolute right-1.5 top-1/2 -translate-y-1/2 text-[8px]" style={{ color: stage.color }}>▼</span>
                            {togglingId === lead.id && <Loader2 className="absolute right-5 top-1/2 -translate-y-1/2 w-3 h-3 animate-spin" style={{ color: stage.color }} />}
                          </div>
                        );
                      })()}
                      <div className="flex items-center gap-1">
                        {/* Email composer — only shown if the lead actually has an email */}
                        {lead.email && (
                          <button type="button"
                            onClick={() => handleOpenEmail(lead)}
                            title="Compose AI email and open in Gmail"
                            className="flex items-center gap-1 text-xs px-2 py-1 rounded-lg"
                            style={{ color: "#6366F1", backgroundColor: "rgba(99,102,241,0.1)" }}>
                            <Mail className="w-3 h-3" />
                            Email
                          </button>
                        )}
                        {/* Notes */}
                        <button type="button"
                          onClick={() => { setEditingNote(lead.id); setNoteText(lead.notes || ""); }}
                          className="flex items-center gap-1 text-xs px-2 py-1 rounded-lg"
                          style={{ color: lead.notes ? AMBER : "#C4AA8A", backgroundColor: lead.notes ? `${AMBER}10` : "transparent" }}>
                          <StickyNote className="w-3 h-3" />
                          {lead.notes ? "Note" : "+ Note"}
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Inline note editor */}
                  {editingNote === lead.id && (
                    <div className="mx-4 mb-3 flex gap-2">
                      <textarea
                        value={noteText}
                        onChange={e => setNoteText(e.target.value)}
                        autoFocus rows={2}
                        placeholder="Add a note about this lead..."
                        className="flex-1 text-xs px-3 py-2 rounded-xl resize-none focus:outline-none"
                        style={{ border: `1px solid ${AMBER}40`, backgroundColor: "#FFFDF9", color: "#292524" }}
                      />
                      <div className="flex flex-col gap-1">
                        <button type="button" onClick={() => handleSaveNote(lead.id)}
                          className="px-2 py-1.5 rounded-lg text-xs font-bold"
                          style={{ backgroundColor: `${AMBER}15`, color: AMBER }}>
                          <Check className="w-3 h-3" />
                        </button>
                        <button type="button" onClick={() => setEditingNote(null)}
                          className="px-2 py-1.5 rounded-lg text-xs"
                          style={{ color: "#A8967E" }}>
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Show existing note */}
                  {lead.notes && editingNote !== lead.id && (
                    <div className="mx-4 mb-3 px-3 py-2 rounded-xl text-xs"
                      style={{ backgroundColor: `${AMBER}08`, borderLeft: `2px solid ${AMBER}50`, color: "#78614E" }}>
                      {lead.notes}
                    </div>
                  )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

      </div>

      {/* Email composer modal — opens when emailingLead is set.
          Generates subject + body via Anthropic, then opens Gmail compose
          in a new tab with the draft pre-filled (zero-OAuth path). */}
      {emailingLead && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ backgroundColor: "rgba(28,24,20,0.6)" }}
          onClick={handleCloseEmail}>
          <div className="w-full max-w-2xl rounded-2xl p-6 space-y-4 max-h-[90vh] overflow-y-auto"
            style={{ ...card, boxShadow: "0 20px 50px rgba(120,97,78,0.3)" }}
            onClick={e => e.stopPropagation()}>

            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-2">
                <div className="w-9 h-9 rounded-xl flex items-center justify-center"
                  style={{ backgroundColor: "rgba(99,102,241,0.1)" }}>
                  <Mail className="w-4 h-4" style={{ color: "#6366F1" }} />
                </div>
                <div>
                  <p className="font-bold text-sm" style={{ color: "#292524" }}>AI Email Composer</p>
                  <p className="text-xs" style={{ color: "#A8967E" }}>
                    To: <span className="font-mono">{emailingLead.email}</span>
                    {emailingLead.name ? ` · ${emailingLead.name}` : ""}
                  </p>
                </div>
              </div>
              <button type="button" onClick={handleCloseEmail}
                title="Close email composer" aria-label="Close email composer"
                className="p-1.5 rounded-lg" style={{ color: "#A8967E" }}>
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Goal input */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold" style={{ color: "#78614E" }}>
                What do you want to achieve with this email?
              </label>
              <textarea
                value={emailGoal}
                onChange={e => setEmailGoal(e.target.value)}
                rows={3}
                placeholder="Ex: Vreau să le propun o colaborare pentru promovarea unui produs nou. Sau: Pitch pentru un pachet de marketing pe Instagram."
                className="w-full text-xs px-3 py-2 rounded-xl resize-none focus:outline-none"
                style={{ border: "1px solid rgba(245,215,160,0.4)", backgroundColor: "#FFFDF9", color: "#292524" }}
              />
              <p className="text-[10px]" style={{ color: "#C4AA8A" }}>
                Lasă gol pentru un mesaj generic de prezentare. AI-ul va folosi numele, bio-ul și nișa lead-ului.
              </p>
            </div>

            {/* Generate button */}
            {!emailDraft && (
              <button type="button"
                onClick={handleGenerateEmail}
                disabled={generatingEmail}
                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold disabled:opacity-50"
                style={{ backgroundColor: "#6366F1", color: "white" }}>
                {generatingEmail
                  ? <><Loader2 className="w-4 h-4 animate-spin" /> Generez email-ul...</>
                  : <><Sparkles className="w-4 h-4" /> Generează cu AI</>}
              </button>
            )}

            {emailError && (
              <div className="rounded-xl p-3 text-xs flex items-center gap-2"
                style={{ backgroundColor: "rgba(220,38,38,0.08)", color: "#DC2626", border: "1px solid rgba(220,38,38,0.2)" }}>
                <AlertCircle className="w-3.5 h-3.5" />
                {emailError}
              </div>
            )}

            {/* Generated draft preview */}
            {emailDraft && (
              <div className="space-y-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold" style={{ color: "#78614E" }}>Subject</label>
                  <input
                    type="text"
                    value={emailDraft.subject}
                    onChange={e => setEmailDraft(d => d ? { ...d, subject: e.target.value } : d)}
                    title="Email subject"
                    placeholder="Email subject"
                    className="w-full text-sm px-3 py-2 rounded-xl focus:outline-none"
                    style={{ border: "1px solid rgba(245,215,160,0.4)", backgroundColor: "#FFFDF9", color: "#292524" }}
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold" style={{ color: "#78614E" }}>Body</label>
                  <textarea
                    value={emailDraft.body}
                    onChange={e => setEmailDraft(d => d ? { ...d, body: e.target.value } : d)}
                    rows={10}
                    title="Email body"
                    placeholder="Email body"
                    className="w-full text-xs px-3 py-2 rounded-xl resize-y focus:outline-none font-mono"
                    style={{ border: "1px solid rgba(245,215,160,0.4)", backgroundColor: "#FFFDF9", color: "#292524" }}
                  />
                </div>
                <div className="flex gap-2">
                  <button type="button"
                    onClick={handleGenerateEmail}
                    disabled={generatingEmail}
                    className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold disabled:opacity-50"
                    style={{ backgroundColor: "rgba(139,92,246,0.1)", color: "#8B5CF6" }}>
                    {generatingEmail
                      ? <Loader2 className="w-3 h-3 animate-spin" />
                      : <RefreshCw className="w-3 h-3" />}
                    Regenerează
                  </button>
                  <button type="button"
                    onClick={handleOpenInGmail}
                    className="flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-xl text-sm font-bold"
                    style={{ backgroundColor: GREEN, color: "white" }}>
                    <Send className="w-3.5 h-3.5" />
                    Deschide în Gmail
                  </button>
                </div>
                <p className="text-[10px] text-center" style={{ color: "#C4AA8A" }}>
                  Se va deschide Gmail Compose într-un tab nou cu draft-ul pre-completat. Lead-ul trece automat în &quot;Contacted&quot;.
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
