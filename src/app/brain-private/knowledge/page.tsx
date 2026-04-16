"use client";

/**
 * Brain Knowledge Base — read-only dashboard for the strategic brain.
 * Tabs: Frameworks, Intermediary Patterns, Client Needs (cross-sell graph).
 *
 * Populated by agents in real time. Truth, not theater.
 */

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, BookOpen, Target, Users, Sparkles, Loader2, Rocket } from "lucide-react";

type Tab = "frameworks" | "patterns" | "clients" | "crosssell" | "strategies";

interface Strategy {
  id: string;
  rank: number;
  name: string;
  tier: string;
  control_retained_pct: number;
  timeline: string;
  upside: string;
  current_status: string;
  progress_notes: string | null;
  kpi_target: string | null;
  kpi_current: string | null;
  next_milestone: string | null;
  owner_agent: string | null;
}

interface KnowledgeEntry {
  id: string;
  category: string;
  name: string;
  summary: string | null;
  content: Record<string, unknown> | null;
  tags: string[] | null;
  source: string | null;
  confidence: number | null;
}

interface Pattern {
  id: string;
  intermediary_type: string;
  end_client_segment: string;
  what_brings_end_client: string | null;
  intermediary_needs: string[] | null;
  our_product_match_score: number | null;
  our_product_delivers: string[] | null;
  our_product_gaps: string[] | null;
  notes: string | null;
  created_at: string;
}

interface ClientNeed {
  id: string;
  domain: string;
  business_name: string | null;
  vertical: string | null;
  needs: string[];
  match_score: number | null;
  created_at: string;
}

interface CrossSellCluster { need: string; client_count: number; clients: string[]; }
interface CrossSellPair { a: string; b: string; shared_needs: string[]; }

export default function KnowledgePage() {
  const [tab, setTab] = useState<Tab>("frameworks");
  const [loading, setLoading] = useState(true);
  const [frameworks, setFrameworks] = useState<KnowledgeEntry[]>([]);
  const [patterns, setPatterns] = useState<Pattern[]>([]);
  const [clients, setClients] = useState<ClientNeed[]>([]);
  const [crosssell, setCrosssell] = useState<{ clusters: CrossSellCluster[]; high_overlap_pairs: CrossSellPair[]; total_clients: number } | null>(null);
  const [strategies, setStrategies] = useState<Strategy[]>([]);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const [kbRes, patRes, cliRes, csRes, stRes] = await Promise.all([
          fetch("/api/brain/knowledge?category=framework").then((r) => r.ok ? r.json() : { entries: [] }),
          fetch("/api/brain/knowledge?category=patterns").then((r) => r.ok ? r.json() : { entries: [] }),
          fetch("/api/brain/knowledge?category=clients").then((r) => r.ok ? r.json() : { entries: [] }),
          fetch("/api/brain/cross-sell").then((r) => r.ok ? r.json() : null),
          fetch("/api/brain/strategy-stack").then((r) => r.ok ? r.json() : { strategies: [] }),
        ]);
        setFrameworks(kbRes.entries ?? []);
        setPatterns(patRes.entries ?? []);
        setClients(cliRes.entries ?? []);
        setCrosssell(csRes);
        setStrategies(stRes.strategies ?? []);
      } finally {
        setLoading(false);
      }
    };
    void load();
  }, []);

  const tabs: Array<{ id: Tab; label: string; icon: React.ComponentType<{ className?: string }>; count: number }> = [
    { id: "strategies", label: "Strategy Stack", icon: Rocket, count: strategies.length },
    { id: "frameworks", label: "Frameworks", icon: BookOpen, count: frameworks.length },
    { id: "patterns", label: "Intermediary Patterns", icon: Target, count: patterns.length },
    { id: "clients", label: "Client Needs Graph", icon: Users, count: clients.length },
    { id: "crosssell", label: "Cross-Sell Signals", icon: Sparkles, count: crosssell?.clusters?.length ?? 0 },
  ];

  return (
    <div className="min-h-screen" style={{ background: "linear-gradient(180deg, #0A0A10, #14141B)", color: "white" }}>
      <header className="max-w-6xl mx-auto px-5 py-3 flex items-center gap-3">
        <Link href="/" className="text-xs inline-flex items-center gap-1 px-2 py-1 rounded-md" style={{ backgroundColor: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.08)", color: "#bbb" }}>
          <ArrowLeft className="w-3 h-3" /> Înapoi
        </Link>
        <h1 className="text-sm font-bold" style={{ color: "#F59E0B" }}>🧠 Knowledge Base</h1>
        <p className="text-[11px] flex-1 truncate" style={{ color: "#888" }}>
          Strategic brain · frameworks + pattern-uri + cross-sell real — populat autonom de echipă
        </p>
      </header>

      {/* Tabs */}
      <div className="max-w-6xl mx-auto px-5 mb-3 flex gap-2 flex-wrap">
        {tabs.map((t) => {
          const I = t.icon;
          const active = tab === t.id;
          return (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold"
              style={{
                backgroundColor: active ? "rgba(245,158,11,0.2)" : "rgba(255,255,255,0.04)",
                border: `1px solid ${active ? "rgba(245,158,11,0.5)" : "rgba(255,255,255,0.08)"}`,
                color: active ? "#FBBF24" : "#bbb",
              }}
            >
              <I className="w-3.5 h-3.5" /> {t.label}
              <span className="text-[10px] px-1.5 py-0.5 rounded-full" style={{ backgroundColor: "rgba(255,255,255,0.08)" }}>{t.count}</span>
            </button>
          );
        })}
      </div>

      {/* Content */}
      <main className="max-w-6xl mx-auto px-5 pb-10">
        {loading && (
          <div className="flex items-center gap-2 p-6 justify-center" style={{ color: "#888" }}>
            <Loader2 className="w-4 h-4 animate-spin" /> Încarcă...
          </div>
        )}

        {!loading && tab === "strategies" && (
          <div className="space-y-3">
            {strategies.length === 0 && <EmptyState text="Niciun strategy încă. Rulează seed." />}
            {["foundation","acceleration","amplification","avoided"].map((tierKey) => {
              const rows = strategies.filter((s) => s.tier === tierKey);
              if (!rows.length) return null;
              const tierLabel = tierKey === "foundation" ? "🏛 Fundație (M0-M6)"
                : tierKey === "acceleration" ? "⚡ Accelerare (M6-M12)"
                : tierKey === "amplification" ? "🚀 Amplificare (M12+)"
                : "❌ De evitat";
              return (
                <div key={tierKey} className="space-y-2">
                  <p className="text-[10px] uppercase tracking-wider mt-2 mb-1" style={{ color: "#888" }}>{tierLabel}</p>
                  {rows.map((s) => {
                    const statusColor = s.current_status === "active" ? "#10B981"
                      : s.current_status === "planned" ? "#F59E0B"
                      : s.current_status === "monitoring" ? "#60A5FA"
                      : s.current_status === "abandoned" ? "#EF4444"
                      : "#666";
                    return (
                      <div key={s.id} className="p-3 rounded-xl" style={{ backgroundColor: "rgba(255,255,255,0.03)", border: `1px solid ${statusColor}30` }}>
                        <div className="flex items-start justify-between gap-3 mb-1">
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] font-mono opacity-50">#{s.rank}</span>
                            <h3 className="text-sm font-bold">{s.name}</h3>
                          </div>
                          <div className="flex items-center gap-2 flex-shrink-0">
                            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded" style={{ backgroundColor: statusColor + "30", color: statusColor }}>{s.current_status}</span>
                            <span className="text-[10px]" style={{ color: "#888" }}>{s.control_retained_pct}% control</span>
                          </div>
                        </div>
                        <p className="text-[10px] mb-1" style={{ color: "#aaa" }}>{s.timeline} · {s.upside}</p>
                        {s.progress_notes && <p className="text-[11px] mt-1 italic" style={{ color: "#ccc" }}>{s.progress_notes}</p>}
                        <div className="flex flex-wrap gap-3 mt-2 text-[10px]" style={{ color: "#888" }}>
                          {s.kpi_target && <span>🎯 target: <span style={{ color: "#ccc" }}>{s.kpi_target}</span></span>}
                          {s.kpi_current && <span>📊 current: <span style={{ color: "#ccc" }}>{s.kpi_current}</span></span>}
                          {s.next_milestone && <span>⏭ next: <span style={{ color: "#ccc" }}>{s.next_milestone}</span></span>}
                          {s.owner_agent && <span>👤 owner: <span style={{ color: "#ccc" }}>{s.owner_agent}</span></span>}
                        </div>
                      </div>
                    );
                  })}
                </div>
              );
            })}
          </div>
        )}

        {!loading && tab === "frameworks" && (
          <div className="space-y-3">
            {frameworks.length === 0 && <EmptyState text="Niciun framework încă. Adaugă prin DB direct sau via endpoint /api/brain/knowledge." />}
            {frameworks.map((f) => (
              <div key={f.id} className="p-4 rounded-xl" style={{ backgroundColor: "rgba(255,255,255,0.03)", border: "1px solid rgba(245,158,11,0.15)" }}>
                <div className="flex items-start justify-between mb-2">
                  <h3 className="text-sm font-bold" style={{ color: "#FBBF24" }}>{f.name}</h3>
                  <span className="text-[10px]" style={{ color: "#666" }}>{f.source}</span>
                </div>
                {f.summary && <p className="text-xs mb-2" style={{ color: "#ccc", lineHeight: 1.5 }}>{f.summary}</p>}
                {f.tags && f.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1 mb-2">
                    {f.tags.map((t) => <Tag key={t} label={t} />)}
                  </div>
                )}
                {f.content != null && (
                  <details className="text-[11px]" style={{ color: "#888" }}>
                    <summary className="cursor-pointer">content details</summary>
                    <pre className="mt-2 p-2 rounded overflow-x-auto text-[10px]" style={{ backgroundColor: "rgba(0,0,0,0.3)" }}>{JSON.stringify(f.content, null, 2)}</pre>
                  </details>
                )}
              </div>
            ))}
          </div>
        )}

        {!loading && tab === "patterns" && (
          <div className="space-y-3">
            {patterns.length === 0 && <EmptyState text="Niciun pattern analizat încă. Rulează /api/brain/reverse-audit sau /api/brain/find-intermediaries." />}
            {patterns.map((p) => {
              const score = p.our_product_match_score ?? 0;
              const color = score >= 7 ? "#10B981" : score >= 5 ? "#F59E0B" : "#EF4444";
              const reco = score >= 7 ? "GO" : score >= 5 ? "ITERATE" : "PARK";
              return (
                <div key={p.id} className="p-4 rounded-xl" style={{ backgroundColor: "rgba(255,255,255,0.03)", border: `1px solid ${color}30` }}>
                  <div className="flex items-start justify-between mb-2 gap-3">
                    <h3 className="text-sm font-bold">{p.intermediary_type}</h3>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold" style={{ color }}>{score}/10</span>
                      <span className="text-[10px] font-bold px-1.5 py-0.5 rounded" style={{ backgroundColor: color, color: "#000" }}>{reco}</span>
                    </div>
                  </div>
                  <p className="text-[11px] mb-2" style={{ color: "#bbb" }}>
                    <span style={{ color: "#888" }}>End customer:</span> {p.end_client_segment}
                  </p>
                  {p.what_brings_end_client && (
                    <p className="text-[11px] mb-2" style={{ color: "#bbb" }}>
                      <span style={{ color: "#888" }}>Acquisition:</span> {p.what_brings_end_client}
                    </p>
                  )}
                  {p.intermediary_needs && p.intermediary_needs.length > 0 && (
                    <div className="mb-2">
                      <p className="text-[10px] mb-1" style={{ color: "#888" }}>JTBD:</p>
                      <div className="flex flex-wrap gap-1">{p.intermediary_needs.map((n) => <Tag key={n} label={n} />)}</div>
                    </div>
                  )}
                  {p.notes && <p className="text-[11px] mt-2 italic" style={{ color: "#aaa" }}>{p.notes}</p>}
                </div>
              );
            })}
          </div>
        )}

        {!loading && tab === "clients" && (
          <div className="space-y-2">
            {clients.length === 0 && <EmptyState text="Niciun client tracked încă. mine-leads + outreach-batch populează automat pe măsură ce rulează." />}
            {clients.map((c) => (
              <div key={c.id} className="p-3 rounded-lg flex items-center gap-3" style={{ backgroundColor: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-bold truncate">{c.business_name ?? c.domain}</p>
                  <p className="text-[10px] truncate" style={{ color: "#888" }}>{c.domain} · {c.vertical ?? "unknown"}</p>
                </div>
                <div className="flex flex-wrap gap-1 max-w-md">
                  {(c.needs ?? []).slice(0, 8).map((n) => <Tag key={n} label={n} />)}
                </div>
              </div>
            ))}
          </div>
        )}

        {!loading && tab === "crosssell" && (
          <div className="space-y-4">
            {!crosssell && <EmptyState text="Nicio analiză cross-sell disponibilă." />}
            {crosssell && (
              <>
                <p className="text-xs" style={{ color: "#bbb" }}>
                  {crosssell.total_clients} clienți în graf. Clustere de nevoi cu ≥ 2 clienți:
                </p>
                <div className="space-y-2">
                  {crosssell.clusters.map((c) => (
                    <div key={c.need} className="p-3 rounded-lg" style={{ backgroundColor: "rgba(245,158,11,0.05)", border: "1px solid rgba(245,158,11,0.2)" }}>
                      <p className="text-xs font-bold mb-1" style={{ color: "#FBBF24" }}>Nevoie: {c.need}</p>
                      <p className="text-[10px] mb-2" style={{ color: "#888" }}>{c.client_count} clienți cu această nevoie</p>
                      <div className="flex flex-wrap gap-1">{c.clients.map((d) => <Tag key={d} label={d} />)}</div>
                    </div>
                  ))}
                </div>
                {crosssell.high_overlap_pairs.length > 0 && (
                  <div>
                    <p className="text-xs font-bold mb-2 mt-6" style={{ color: "#FBBF24" }}>Perechi cu ≥ 3 nevoi comune (bundle candidates)</p>
                    <div className="space-y-2">
                      {crosssell.high_overlap_pairs.map((p, i) => (
                        <div key={i} className="p-3 rounded-lg" style={{ backgroundColor: "rgba(139,92,246,0.05)", border: "1px solid rgba(139,92,246,0.2)" }}>
                          <p className="text-xs mb-1">
                            <span style={{ color: "#a78bfa" }}>{p.a}</span>
                            <span style={{ color: "#666" }}> ↔ </span>
                            <span style={{ color: "#a78bfa" }}>{p.b}</span>
                          </p>
                          <div className="flex flex-wrap gap-1">{p.shared_needs.map((n) => <Tag key={n} label={n} />)}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        )}
      </main>
    </div>
  );
}

function Tag({ label }: { label: string }) {
  return (
    <span
      className="inline-block text-[9px] px-1.5 py-0.5 rounded"
      style={{ backgroundColor: "rgba(255,255,255,0.06)", color: "#bbb", border: "1px solid rgba(255,255,255,0.08)" }}
    >
      {label}
    </span>
  );
}

function EmptyState({ text }: { text: string }) {
  return <div className="p-6 text-center text-xs" style={{ color: "#666" }}>{text}</div>;
}
