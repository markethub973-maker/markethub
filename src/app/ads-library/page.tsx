"use client";

import { useState } from "react";
import Header from "@/components/layout/Header";
import { Search, ExternalLink, AlertCircle, Globe2, Monitor, Smartphone, Instagram, Facebook, ChevronDown, ChevronUp, Eye, DollarSign, Users, Calendar } from "lucide-react";

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

function PlatformIcon({ platform }: { platform: string }) {
  if (platform === "instagram") return <Instagram className="w-3 h-3" style={{ color: IG }} />;
  if (platform === "facebook") return <Facebook className="w-3 h-3" style={{ color: META }} />;
  if (platform === "messenger") return <Monitor className="w-3 h-3" style={{ color: "#00B2FF" }} />;
  if (platform === "audience_network") return <Globe2 className="w-3 h-3" style={{ color: "#6B7280" }} />;
  return <Smartphone className="w-3 h-3" style={{ color: "#6B7280" }} />;
}

function formatRange(val: { lower_bound?: string; upper_bound?: string } | undefined) {
  if (!val) return null;
  const lo = val.lower_bound ? parseInt(val.lower_bound).toLocaleString() : null;
  const hi = val.upper_bound ? parseInt(val.upper_bound).toLocaleString() : null;
  if (lo && hi) return `${lo} – ${hi}`;
  if (lo) return `>= ${lo}`;
  if (hi) return `<= ${hi}`;
  return null;
}

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

function AdCard({ ad }: { ad: any }) {
  const [expanded, setExpanded] = useState(false);
  const daysSinceStart = ad.startDate
    ? Math.floor((Date.now() - new Date(ad.startDate).getTime()) / 86400000)
    : null;
  const impressionsRange = formatRange(ad.impressions);
  const spendRange = formatRange(ad.spend);
  const audienceRange = formatRange(ad.audienceSize);

  return (
    <div className="rounded-xl overflow-hidden" style={cardStyle}>
      <div className="p-4 pb-3">
        <div className="flex items-start justify-between gap-2 mb-2">
          <div className="flex-1 min-w-0">
            <p className="font-bold text-sm truncate" style={{ color: "#292524" }}>{ad.pageName}</p>
            <div className="flex items-center gap-1.5 mt-1 flex-wrap">
              {ad.platforms.map((p: string) => (
                <span key={p} className="flex items-center gap-0.5 text-xs px-1.5 py-0.5 rounded-full"
                  style={{ backgroundColor: "rgba(245,215,160,0.15)", color: "#78614E" }}>
                  <PlatformIcon platform={p} />
                  <span className="capitalize">{p === "audience_network" ? "Network" : p}</span>
                </span>
              ))}
            </div>
          </div>
          <a href={ad.snapshotUrl} target="_blank" rel="noopener noreferrer"
            className="flex-shrink-0 p-1.5 rounded-lg transition-colors"
            style={{ backgroundColor: `${META}12`, color: META }}
            title="Vezi reclama">
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
        </div>

        {ad.body && (
          <p className="text-xs leading-relaxed line-clamp-3" style={{ color: "#78614E" }}>{ad.body}</p>
        )}
        {ad.linkTitle && (
          <p className="text-xs font-semibold mt-1.5 truncate" style={{ color: "#292524" }}>{ad.linkTitle}</p>
        )}
        {ad.linkDescription && (
          <p className="text-xs mt-0.5 line-clamp-2" style={{ color: "#A8967E" }}>{ad.linkDescription}</p>
        )}
      </div>

      <div className="px-4 pb-3 grid grid-cols-2 gap-2">
        {impressionsRange && (
          <div className="rounded-lg p-2 text-center" style={{ backgroundColor: `${META}08`, border: `1px solid ${META}18` }}>
            <Eye className="w-3 h-3 mx-auto mb-0.5" style={{ color: META }} />
            <p className="text-xs font-bold" style={{ color: META }}>{impressionsRange}</p>
            <p className="text-xs" style={{ color: "#A8967E" }}>Impresii</p>
          </div>
        )}
        {spendRange && (
          <div className="rounded-lg p-2 text-center" style={{ backgroundColor: "rgba(16,185,129,0.05)", border: "1px solid rgba(16,185,129,0.15)" }}>
            <DollarSign className="w-3 h-3 mx-auto mb-0.5" style={{ color: "#10B981" }} />
            <p className="text-xs font-bold" style={{ color: "#10B981" }}>{spendRange} {ad.currency}</p>
            <p className="text-xs" style={{ color: "#A8967E" }}>Buget estimat</p>
          </div>
        )}
        {audienceRange && (
          <div className="rounded-lg p-2 text-center" style={{ backgroundColor: "rgba(245,158,11,0.05)", border: "1px solid rgba(245,158,11,0.15)" }}>
            <Users className="w-3 h-3 mx-auto mb-0.5" style={{ color: "#F59E0B" }} />
            <p className="text-xs font-bold" style={{ color: "#F59E0B" }}>{audienceRange}</p>
            <p className="text-xs" style={{ color: "#A8967E" }}>Audienta</p>
          </div>
        )}
        {daysSinceStart !== null && (
          <div className="rounded-lg p-2 text-center" style={{ backgroundColor: "rgba(107,114,128,0.05)", border: "1px solid rgba(107,114,128,0.12)" }}>
            <Calendar className="w-3 h-3 mx-auto mb-0.5" style={{ color: "#6B7280" }} />
            <p className="text-xs font-bold" style={{ color: "#6B7280" }}>{daysSinceStart}z</p>
            <p className="text-xs" style={{ color: "#A8967E" }}>Activ de</p>
          </div>
        )}
      </div>

      {ad.demographicDistribution?.length > 0 && (
        <div className="border-t" style={{ borderColor: "rgba(245,215,160,0.2)" }}>
          <button type="button" onClick={() => setExpanded(v => !v)}
            className="w-full flex items-center justify-between px-4 py-2.5 text-xs font-semibold"
            style={{ color: "#A8967E" }}>
            <span>Date demografice</span>
            {expanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </button>
          {expanded && (
            <div className="px-4 pb-3 space-y-1">
              {ad.demographicDistribution.slice(0, 8).map((d: any, i: number) => (
                <div key={i} className="flex items-center gap-2">
                  <span className="text-xs w-24 flex-shrink-0" style={{ color: "#78614E" }}>
                    {d.age} {d.gender === "male" ? "B" : d.gender === "female" ? "F" : ""}
                  </span>
                  <div className="flex-1 h-1.5 rounded-full overflow-hidden" style={{ backgroundColor: "rgba(245,215,160,0.2)" }}>
                    <div className="h-full rounded-full" style={{
                      width: `${Math.round(parseFloat(d.percentage) * 100)}%`,
                      backgroundColor: d.gender === "female" ? IG : META,
                    }} />
                  </div>
                  <span className="text-xs w-10 text-right" style={{ color: "#A8967E" }}>
                    {Math.round(parseFloat(d.percentage) * 100)}%
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {ad.startDate && (
        <div className="px-4 py-2 border-t" style={{ borderColor: "rgba(245,215,160,0.2)" }}>
          <p className="text-xs" style={{ color: "#C4AA8A" }}>
            Activ din {new Date(ad.startDate).toLocaleDateString("ro-RO", { day: "2-digit", month: "long", year: "numeric" })}
            {ad.endDate ? ` — ${new Date(ad.endDate).toLocaleDateString("ro-RO", { day: "2-digit", month: "long" })}` : " — prezent"}
          </p>
        </div>
      )}
    </div>
  );
}

export default function AdsLibraryPage() {
  const [query, setQuery] = useState("");
  const [country, setCountry] = useState("RO");
  const [adType, setAdType] = useState("all");
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [mode, setMode] = useState<"api" | "direct">("direct");

  const search = (q?: string) => {
    const term = (q || query).trim();
    if (!term) return;

    if (mode === "direct") {
      window.open(buildMetaLibraryUrl(term, country, adType), "_blank");
      return;
    }

    setLoading(true);
    setError("");
    setData(null);
    fetch(`/api/ads-library?q=${encodeURIComponent(term)}&country=${country}&adType=${adType}&limit=24`)
      .then(r => r.json())
      .then(d => {
        if (d.error) {
          if (d.errorCode === "NO_PERMISSION") {
            setMode("direct");
            setError("API indisponibil — se deschide Meta Ad Library direct.");
            window.open(buildMetaLibraryUrl(term, country, adType), "_blank");
          } else {
            setError(d.error);
          }
          return;
        }
        setData(d);
      })
      .catch(() => setError("Eroare de retea"))
      .finally(() => setLoading(false));
  };

  return (
    <div>
      <Header title="Meta Ads Library" subtitle="Reclame active ale oricarui brand pe Facebook & Instagram" />
      <div className="p-6 space-y-5">

        {/* Search */}
        <div className="rounded-xl p-4 space-y-3" style={cardStyle}>
          {/* Mode toggle */}
          <div className="flex items-center gap-2">
            <button type="button" onClick={() => setMode("direct")}
              className="px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors"
              style={mode === "direct"
                ? { backgroundColor: META, color: "white" }
                : { backgroundColor: `${META}10`, color: META, border: `1px solid ${META}25` }}>
              Deschide Meta Library
            </button>
            <button type="button" onClick={() => setMode("api")}
              className="px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors"
              style={mode === "api"
                ? { backgroundColor: META, color: "white" }
                : { backgroundColor: `${META}10`, color: META, border: `1px solid ${META}25` }}>
              API (necesita ads_read)
            </button>
          </div>

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
            <button type="button" onClick={() => search()} disabled={loading || !query.trim()}
              className="px-6 py-3 rounded-xl text-sm font-bold"
              style={{ backgroundColor: META, color: "white", opacity: loading ? 0.7 : 1 }}>
              {loading ? "..." : mode === "direct" ? "Deschide" : "Cauta"}
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

          <p className="text-xs" style={{ color: "#C4AA8A" }}>
            {mode === "direct"
              ? "Se deschide Meta Ad Library direct pe facebook.com — date publice, fara API necesar."
              : "Date din Meta Ads Library API — necesita permisiunea ads_read pe token."}
          </p>
        </div>

        {/* Error */}
        {error && (
          <div className="rounded-xl p-5 flex items-start gap-3" style={cardStyle}>
            <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" style={{ color: "#EF4444" }} />
            <div>
              <p className="text-sm font-semibold" style={{ color: "#EF4444" }}>Eroare</p>
              <p className="text-sm mt-1" style={{ color: "#A8967E" }}>{error}</p>
            </div>
          </div>
        )}

        {/* API Results */}
        {data && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold" style={{ color: "#292524" }}>
                {data.total} reclame active{data.total === 24 ? "+" : ""} pentru &quot;{data.searchTerms}&quot; in {COUNTRIES.find(c => c.code === data.country)?.label || data.country}
              </h3>
              {data.total === 0 && (
                <p className="text-sm" style={{ color: "#A8967E" }}>Nu s-au gasit reclame active.</p>
              )}
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {data.ads.map((ad: any) => <AdCard key={ad.id} ad={ad} />)}
            </div>
          </div>
        )}

        {/* Empty state */}
        {!data && !loading && !error && (
          <div className="rounded-xl p-12 text-center" style={cardStyle}>
            <Search className="w-12 h-12 mx-auto mb-4" style={{ color: `${META}40` }} />
            <p className="font-semibold text-lg mb-2" style={{ color: "#292524" }}>Cauta reclame active</p>
            <p className="text-sm max-w-md mx-auto mb-4" style={{ color: "#A8967E" }}>
              Introdu numele oricarui brand si vezi toate reclamele active pe Facebook si Instagram.
            </p>
            {mode === "direct" && (
              <p className="text-xs" style={{ color: "#C4AA8A" }}>
                Se va deschide Meta Ad Library direct pe facebook.com — date publice in timp real.
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
