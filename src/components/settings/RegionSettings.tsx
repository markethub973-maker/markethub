"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { SUPPORTED_REGIONS, LOCAL_MARKETS } from "@/lib/localMarketConfig";
import { Globe, Check, Loader2, AlertCircle, Copy, ToggleLeft, ToggleRight } from "lucide-react";

const card = { backgroundColor: "#FFFCF7", border: "1px solid rgba(245,215,160,0.25)", boxShadow: "0 1px 3px rgba(120,97,78,0.08)" };
const AMBER = "#F59E0B";
const GREEN = "#1DB954";

export default function RegionSettings() {
  const [region, setRegion] = useState<string | null>(null);
  const [enabled, setEnabled] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");
  const [sqlMissing, setSqlMissing] = useState(false);
  const [copiedSQL, setCopiedSQL] = useState(false);

  const SQL_MIGRATION = `ALTER TABLE profiles ADD COLUMN IF NOT EXISTS preferred_region TEXT DEFAULT NULL;\nALTER TABLE profiles ADD COLUMN IF NOT EXISTS local_market_enabled BOOLEAN DEFAULT false;`;

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) { setLoading(false); return; }
      const { data } = await supabase
        .from("profiles")
        .select("preferred_region, local_market_enabled")
        .eq("id", user.id)
        .single();
      setRegion(data?.preferred_region ?? null);
      setEnabled(data?.local_market_enabled ?? false);
      setLoading(false);
    });
  }, []);

  const save = async (newRegion: string | null, newEnabled: boolean) => {
    setSaving(true);
    setSaved(false);
    setError("");

    const res = await fetch("/api/settings/region", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ preferred_region: newRegion, local_market_enabled: newEnabled }),
    });
    const data = await res.json();

    if (!res.ok) {
      if (data.error === "columns_missing") {
        setSqlMissing(true);
      } else {
        setError(data.error || "Save failed");
      }
    } else {
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    }
    setSaving(false);
  };

  const handleRegionChange = (code: string | null) => {
    setRegion(code);
    // Auto-enable local market when a region is selected
    const newEnabled = code !== null;
    setEnabled(newEnabled);
    save(code, newEnabled);
  };

  const handleToggle = () => {
    const newEnabled = !enabled;
    setEnabled(newEnabled);
    save(region, newEnabled);
  };

  const selectedMarket = region ? LOCAL_MARKETS[region] : null;

  if (loading) return (
    <div className="flex items-center gap-2 py-4" style={{ color: "#A8967E" }}>
      <Loader2 className="w-4 h-4 animate-spin" />
      <span className="text-sm">Loading region settings…</span>
    </div>
  );

  return (
    <div className="space-y-4">
      {/* SQL migration notice */}
      {sqlMissing && (
        <div className="rounded-xl p-4 space-y-2"
          style={{ backgroundColor: "rgba(99,102,241,0.05)", border: "1px solid rgba(99,102,241,0.2)" }}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4" style={{ color: "#6366F1" }} />
              <p className="text-sm font-bold" style={{ color: "#292524" }}>Rulează SQL în Supabase → SQL Editor</p>
            </div>
            <button type="button" onClick={() => { navigator.clipboard.writeText(SQL_MIGRATION); setCopiedSQL(true); setTimeout(() => setCopiedSQL(false), 2000); }}
              className="flex items-center gap-1 text-xs px-2 py-1 rounded-lg font-semibold"
              style={{ backgroundColor: copiedSQL ? "rgba(29,185,84,0.1)" : "rgba(99,102,241,0.1)", color: copiedSQL ? GREEN : "#6366F1" }}>
              {copiedSQL ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
              {copiedSQL ? "Copiat!" : "Copiază SQL"}
            </button>
          </div>
          <code className="block text-xs font-mono p-2 rounded-lg whitespace-pre"
            style={{ backgroundColor: "#1C1814", color: "#FFF8F0" }}>
            {SQL_MIGRATION}
          </code>
        </div>
      )}

      {/* Toggle ON/OFF */}
      <div className="flex items-center justify-between p-4 rounded-xl"
        style={{ backgroundColor: enabled ? "rgba(245,158,11,0.06)" : "rgba(245,215,160,0.06)", border: `1px solid ${enabled ? `${AMBER}30` : "rgba(245,215,160,0.2)"}` }}>
        <div className="flex items-center gap-3">
          <Globe className="w-5 h-5" style={{ color: enabled ? AMBER : "#C4AA8A" }} />
          <div>
            <p className="text-sm font-bold" style={{ color: "#292524" }}>Local Market Tools</p>
            <p className="text-xs" style={{ color: "#A8967E" }}>
              {enabled && region
                ? `Activ — unelte specifice ${SUPPORTED_REGIONS.find(r => r.code === region)?.label || region} vizibile`
                : "Dezactivat — interfață internațională"}
            </p>
          </div>
        </div>
        <button type="button" onClick={handleToggle} disabled={saving || !region}
          className="flex-shrink-0 disabled:opacity-40 transition-all">
          {enabled
            ? <ToggleRight className="w-8 h-8" style={{ color: AMBER }} />
            : <ToggleLeft className="w-8 h-8" style={{ color: "#C4AA8A" }} />}
        </button>
      </div>

      {/* Region selector */}
      <div className="space-y-2">
        <p className="text-xs font-bold" style={{ color: "#78614E" }}>Selectează piața locală</p>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
          {SUPPORTED_REGIONS.map(({ code, flag, label }) => {
            const isSelected = region === code;
            const hasMarket = code !== null && LOCAL_MARKETS[code];
            return (
              <button key={code ?? "intl"} type="button"
                onClick={() => handleRegionChange(code)}
                className="flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm font-semibold transition-all text-left"
                style={isSelected
                  ? { backgroundColor: code ? LOCAL_MARKETS[code]?.color + "15" || `${AMBER}15` : "rgba(245,215,160,0.15)", color: "#292524", border: `2px solid ${code ? LOCAL_MARKETS[code]?.color || AMBER : AMBER}` }
                  : { backgroundColor: "rgba(245,215,160,0.08)", color: "#78614E", border: "1px solid rgba(245,215,160,0.2)" }}>
                <span className="text-lg">{flag}</span>
                <span className="flex-1 truncate text-xs">{label}</span>
                {isSelected && <Check className="w-3 h-3 flex-shrink-0" style={{ color: AMBER }} />}
                {!isSelected && hasMarket && (
                  <span className="text-xs px-1 rounded flex-shrink-0"
                    style={{ backgroundColor: "rgba(29,185,84,0.1)", color: GREEN }}>✓</span>
                )}
              </button>
            );
          })}
        </div>
        <p className="text-xs" style={{ color: "#C4AA8A" }}>
          ✓ = piață cu unelte specifice disponibile · celelalte folosesc Google Maps + Social Media generice
        </p>
      </div>

      {/* Preview what activates */}
      {enabled && selectedMarket && (
        <div className="rounded-xl p-4 space-y-3"
          style={{ backgroundColor: `${selectedMarket.color}08`, border: `1px solid ${selectedMarket.color}25` }}>
          <p className="text-xs font-bold" style={{ color: selectedMarket.color }}>
            {selectedMarket.flag} Unelte activate pentru {selectedMarket.label}
          </p>
          <div className="grid grid-cols-2 gap-2">
            {selectedMarket.actors.map(a => (
              <div key={a.id} className="flex items-start gap-2 px-3 py-2 rounded-lg"
                style={{ backgroundColor: "rgba(255,255,255,0.6)" }}>
                <span className="text-base">{a.icon}</span>
                <div>
                  <p className="text-xs font-bold" style={{ color: "#292524" }}>{a.label}</p>
                  <p className="text-xs" style={{ color: "#A8967E" }}>{a.description}</p>
                </div>
              </div>
            ))}
          </div>
          <p className="text-xs" style={{ color: "#A8967E" }}>
            Aceste tab-uri apar în <strong>Research Hub</strong> și <strong>Marketing Agent</strong> le folosește automat.
          </p>
        </div>
      )}

      {/* Save status */}
      {saving && (
        <div className="flex items-center gap-2 text-xs" style={{ color: "#A8967E" }}>
          <Loader2 className="w-3 h-3 animate-spin" />Salvez…
        </div>
      )}
      {saved && (
        <div className="flex items-center gap-2 text-xs font-semibold" style={{ color: GREEN }}>
          <Check className="w-3 h-3" />Salvat — modificările sunt active imediat
        </div>
      )}
      {error && (
        <p className="text-xs font-semibold" style={{ color: "#DC2626" }}>{error}</p>
      )}
    </div>
  );
}
