"use client";

import { useState, useRef } from "react";
import Header from "@/components/layout/Header";
import { Search, ExternalLink, AlertCircle, Globe2, Monitor, Smartphone, Instagram, Facebook, ChevronDown, ChevronUp, Eye, DollarSign, Users, Calendar, Maximize2 } from "lucide-react";

const cardStyle = { backgroundColor: "#FFFCF7", border: "1px solid rgba(245,215,160,0.25)", boxShadow: "0 1px 3px rgba(120,97,78,0.08)" };
const META = "#1877F2";
const IG = "#E1306C";

const COUNTRIES = [
  { code: "RO", label: "Romania" },
  { code: "US", label: "USA" },
  { code: "GB", label: "UK" },
  { code: "DE", label: "Germany" },
  { code: "FR", label: "France" },
  { code: "IT", label: "Italy" },
  { code: "ES", label: "Spain" },
  { code: "NL", label: "Netherlands" },
  { code: "ALL", label: "Global" },
];

const AD_TYPES = [
  { value: "all", label: "Toate tipurile" },
  { value: "political_and_issue_ads", label: "Politic" },
  { value: "housing_ads", label: "Imobiliare" },
  { value: "employment_ads", label: "Angajare" },
  { value: "credit_ads", label: "Credit/Finante" },
];

const EXAMPLES = ["Nike", "Zara", "eMAG", "Kaufland", "Lidl", "Booking", "Revolut", "Bolt"];

function buildMetaLibraryUrl(query: string, country: string, adType: string) {
  const params = new URLSearchParams({
    active_status: "active",
    ad_type: adType,
    country: country === "ALL" ? "ALL" : country,
    q: query,
    media_type: "all",
  });
  return `https://www.facebook.com/ads/library/?${params.toString()}`;
}

export default function AdsLibraryPage() {
  const [query, setQuery] = useState("");
  const [country, setCountry] = useState("RO");
  const [adType, setAdType] = useState("all");
  const [iframeUrl, setIframeUrl] = useState<string | null>(null);
  const [iframeBlocked, setIframeBlocked] = useState(false);
  const [fullscreen, setFullscreen] = useState(false);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  const search = (q?: string) => {
    const term = (q || query).trim();
    if (!term) return;
    const url = buildMetaLibraryUrl(term, country, adType);
    setIframeUrl(url);
    setIframeBlocked(false);
  };

  const openExternal = () => {
    if (iframeUrl) window.open(iframeUrl, "_blank");
  };

  return (
    <div>
      <Header title="Meta Ads Library" subtitle="Reclame active ale oricarui brand pe Facebook & Instagram" />
      <div className="p-6 space-y-5">

        {/* Search */}
        <div className="rounded-xl p-4 space-y-3" style={cardStyle}>
          <div className="flex gap-3 flex-wrap">
            <div className="relative flex-1 min-w-48">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: META }} />
              <input type="text" placeholder="Cauta brand (ex: Nike, eMAG, Zara...)"
                value={query} onChange={e => setQuery(e.target.value)}
                onKeyDown={e => e.key === "Enter" && search()}
                className="w-full pl-9 pr-4 py-3 text-sm rounded-xl focus:outline-none"
                style={{ border: `1px solid ${META}30`, backgroundColor: "#FFFCF7", color: "#292524" }} />
            </div>
            <select value={country} onChange={e => setCountry(e.target.value)}
              className="px-3 py-3 text-sm rounded-xl focus:outline-none"
              style={{ border: "1px solid rgba(245,215,160,0.3)", backgroundColor: "#FFFCF7", color: "#292524" }}>
              {COUNTRIES.map(c => <option key={c.code} value={c.code}>{c.label}</option>)}
            </select>
            <select value={adType} onChange={e => setAdType(e.target.value)}
              className="px-3 py-3 text-sm rounded-xl focus:outline-none"
              style={{ border: "1px solid rgba(245,215,160,0.3)", backgroundColor: "#FFFCF7", color: "#292524" }}>
              {AD_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
            </select>
            <button type="button" onClick={() => search()} disabled={!query.trim()}
              className="px-6 py-3 rounded-xl text-sm font-bold"
              style={{ backgroundColor: META, color: "white" }}>
              Cauta
            </button>
          </div>

          {/* Examples */}
          <div className="flex flex-wrap gap-2 items-center">
            <span className="text-xs" style={{ color: "#C4AA8A" }}>Exemple:</span>
            {EXAMPLES.map(ex => (
              <button key={ex} type="button" onClick={() => { setQuery(ex); search(ex); }}
                className="px-2.5 py-1 rounded-full text-xs font-semibold"
                style={{ backgroundColor: `${META}10`, color: META, border: `1px solid ${META}25` }}>
                {ex}
              </button>
            ))}
          </div>
        </div>

        {/* Iframe embed */}
        {iframeUrl && (
          <div className={fullscreen
            ? "fixed inset-0 z-50 bg-white flex flex-col"
            : "rounded-xl overflow-hidden"
          } style={fullscreen ? {} : cardStyle}>

            {/* Toolbar */}
            <div className="flex items-center justify-between px-4 py-2 flex-shrink-0"
              style={{ backgroundColor: "rgba(24,119,242,0.05)", borderBottom: "1px solid rgba(24,119,242,0.15)" }}>
              <div className="flex items-center gap-2">
                <Facebook className="w-4 h-4" style={{ color: META }} />
                <span className="text-xs font-semibold" style={{ color: "#292524" }}>Meta Ad Library</span>
                <span className="text-xs" style={{ color: "#A8967E" }}>— {query} ({COUNTRIES.find(c => c.code === country)?.label})</span>
              </div>
              <div className="flex items-center gap-2">
                <button type="button" onClick={() => setFullscreen(!fullscreen)}
                  className="p-1.5 rounded-lg text-xs font-semibold flex items-center gap-1"
                  style={{ backgroundColor: "rgba(24,119,242,0.1)", color: META }}>
                  <Maximize2 className="w-3 h-3" />
                  {fullscreen ? "Minimizeaza" : "Fullscreen"}
                </button>
                <a href={iframeUrl} target="_blank" rel="noopener noreferrer"
                  className="p-1.5 rounded-lg text-xs font-semibold flex items-center gap-1"
                  style={{ backgroundColor: "rgba(24,119,242,0.1)", color: META }}>
                  <ExternalLink className="w-3 h-3" />
                  Deschide in tab nou
                </a>
              </div>
            </div>

            {/* iframe or blocked message */}
            {!iframeBlocked ? (
              <iframe
                ref={iframeRef}
                src={iframeUrl}
                className="w-full border-0"
                style={{ height: fullscreen ? "calc(100vh - 44px)" : 700 }}
                sandbox="allow-scripts allow-same-origin allow-popups allow-forms"
                onError={() => setIframeBlocked(true)}
                onLoad={() => {
                  // Facebook blocks iframes — detect by checking if we can access content
                  try {
                    const doc = iframeRef.current?.contentDocument;
                    // If we can access it and it's empty/error, it's blocked
                    if (doc && doc.body && doc.body.innerHTML === "") {
                      setIframeBlocked(true);
                    }
                  } catch {
                    // Cross-origin = loaded successfully (Facebook's page)
                    // This is actually the success case for iframe
                  }
                }}
              />
            ) : (
              <div className="p-12 text-center" style={{ minHeight: 400 }}>
                <AlertCircle className="w-12 h-12 mx-auto mb-4" style={{ color: `${META}60` }} />
                <p className="font-semibold text-lg mb-2" style={{ color: "#292524" }}>
                  Facebook blocheaza afisarea in iframe
                </p>
                <p className="text-sm mb-6 max-w-md mx-auto" style={{ color: "#A8967E" }}>
                  Din motive de securitate, Facebook nu permite afisarea Ad Library in alte site-uri.
                  Deschide pagina direct pe facebook.com:
                </p>
                <a href={iframeUrl} target="_blank" rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-bold"
                  style={{ backgroundColor: META, color: "white" }}>
                  <ExternalLink className="w-4 h-4" />
                  Deschide Meta Ad Library
                </a>
              </div>
            )}
          </div>
        )}

        {/* Empty state */}
        {!iframeUrl && (
          <div className="rounded-xl p-12 text-center" style={cardStyle}>
            <Search className="w-12 h-12 mx-auto mb-4" style={{ color: `${META}40` }} />
            <p className="font-semibold text-lg mb-2" style={{ color: "#292524" }}>Cauta reclame active</p>
            <p className="text-sm max-w-md mx-auto mb-4" style={{ color: "#A8967E" }}>
              Introdu numele oricarui brand si vezi toate reclamele active pe Facebook si Instagram direct in pagina.
            </p>
            <p className="text-xs" style={{ color: "#C4AA8A" }}>
              Se incarca Meta Ad Library de pe facebook.com — date publice in timp real.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
