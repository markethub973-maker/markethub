"use client";

/**
 * Brain Command Center — Lead Miner (Apify)
 * Search Google Maps for a vertical + city, get domain list in 60s.
 */

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, Search, Loader2, Copy, Check } from "lucide-react";

interface Lead { domain: string; title?: string; email?: string; phone?: string; city?: string; category?: string; }

export default function MineLeadsPage() {
  const [searchString, setSearchString] = useState("dental clinic Bucharest");
  const [limit, setLimit] = useState(30);
  const [loading, setLoading] = useState(false);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const run = async () => {
    setLoading(true); setError(null); setLeads([]); setCopied(false);
    try {
      const res = await fetch("/api/brain/mine-leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          actor: "apify/google-maps-scraper",
          input: { searchStringsArray: [searchString], maxCrawledPlacesPerSearch: limit },
          limit,
        }),
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error ?? "Mining failed");
      setLeads(d.leads ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Mining failed");
    } finally { setLoading(false); }
  };

  const copyDomains = () => {
    const text = leads.map((l) => l.domain).join("\n");
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="min-h-screen" style={{ backgroundColor: "#0F0F14", color: "white", fontFamily: "system-ui, sans-serif" }}>
      <header className="max-w-5xl mx-auto px-6 py-6 flex items-center gap-3">
        <Link href="/" className="text-xs inline-flex items-center gap-1 px-2 py-1 rounded-md"
          style={{ backgroundColor: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.08)", color: "#bbb" }}>
          <ArrowLeft className="w-3 h-3" /> Back
        </Link>
        <div>
          <p className="text-sm font-semibold">Lead Miner · Google Maps via Apify</p>
          <p className="text-xs" style={{ color: "#888" }}>
            Search a vertical + city → Alex returns domain list you can paste into the outreach batch.
          </p>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 pb-16 space-y-4">
        <section className="p-5 rounded-2xl"
          style={{ backgroundColor: "#1A1A24", border: "1px solid rgba(255,255,255,0.08)" }}>
          <label className="text-xs uppercase tracking-wider font-bold" style={{ color: "#888" }}>Search query (e.g. "dental clinic Cluj-Napoca")</label>
          <input value={searchString} onChange={(e) => setSearchString(e.target.value)}
            className="w-full mt-2 rounded-md px-3 py-2 text-sm"
            style={{ backgroundColor: "#0F0F14", border: "1px solid rgba(255,255,255,0.1)", color: "white", outline: "none" }} />
          <label className="text-xs uppercase tracking-wider font-bold mt-4 block" style={{ color: "#888" }}>Max results</label>
          <input type="number" value={limit} onChange={(e) => setLimit(parseInt(e.target.value) || 30)} min={5} max={100}
            className="w-24 mt-2 rounded-md px-3 py-2 text-sm"
            style={{ backgroundColor: "#0F0F14", border: "1px solid rgba(255,255,255,0.1)", color: "white", outline: "none" }} />
          <div className="mt-4 flex gap-2">
            <button type="button" onClick={run} disabled={loading || !searchString}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-md font-bold text-sm disabled:opacity-50"
              style={{ backgroundColor: "#F59E0B", color: "black" }}>
              {loading ? <><Loader2 className="w-4 h-4 animate-spin" /> Mining...</> : <><Search className="w-4 h-4" /> Run Apify search</>}
            </button>
            {leads.length > 0 && (
              <button type="button" onClick={copyDomains}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-md font-bold text-sm"
                style={{ backgroundColor: "rgba(255,255,255,0.08)", color: "white", border: "1px solid rgba(255,255,255,0.15)" }}>
                {copied ? <><Check className="w-4 h-4" /> Copied</> : <><Copy className="w-4 h-4" /> Copy all domains</>}
              </button>
            )}
          </div>
          {error && <p className="text-xs font-semibold mt-3" style={{ color: "#F87171" }}>{error}</p>}
          <p className="text-xs mt-3" style={{ color: "#666" }}>
            Requires APIFY_TOKEN env var. If unset, you&apos;ll see a setup link in the error.
          </p>
        </section>

        {leads.length > 0 && (
          <section>
            <p className="text-xs uppercase tracking-wider font-bold mb-3" style={{ color: "#888" }}>
              {leads.length} domains found
            </p>
            <div className="space-y-1">
              {leads.map((l, i) => (
                <div key={i} className="flex items-center gap-2 p-3 rounded-xl text-sm"
                  style={{ backgroundColor: "#1A1A24", border: "1px solid rgba(255,255,255,0.06)" }}>
                  <span className="font-mono font-semibold" style={{ color: "#F59E0B" }}>{l.domain}</span>
                  <span style={{ color: "#888" }}>{l.title ? `· ${l.title}` : ""}</span>
                  {l.city && <span className="ml-auto text-xs" style={{ color: "#666" }}>{l.city}</span>}
                </div>
              ))}
            </div>
          </section>
        )}
      </main>
    </div>
  );
}
