"use client";

import { useEffect, useState } from "react";
import { ComposableMap, Geographies, Geography, ZoomableGroup } from "react-simple-maps";

const GEO_URL = "/world-110m.json";

// ISO alpha-2 → numeric mapping for world-atlas
const NUMERIC_TO_ALPHA2: Record<string, string> = {
  "004": "AF", "008": "AL", "012": "DZ", "024": "AO", "032": "AR", "036": "AU", "040": "AT",
  "031": "AZ", "050": "BD", "056": "BE", "068": "BO", "076": "BR", "100": "BG", "116": "KH",
  "120": "CM", "124": "CA", "152": "CL", "156": "CN", "170": "CO", "188": "CR", "191": "HR",
  "192": "CU", "196": "CY", "203": "CZ", "208": "DK", "214": "DO", "218": "EC", "818": "EG",
  "222": "SV", "233": "EE", "231": "ET", "246": "FI", "250": "FR", "276": "DE", "288": "GH",
  "300": "GR", "320": "GT", "332": "HT", "340": "HN", "348": "HU", "356": "IN", "360": "ID",
  "364": "IR", "368": "IQ", "372": "IE", "376": "IL", "380": "IT", "388": "JM", "392": "JP",
  "400": "JO", "398": "KZ", "404": "KE", "408": "KP", "410": "KR", "414": "KW", "422": "LB",
  "428": "LV", "440": "LT", "504": "MA", "484": "MX", "498": "MD", "496": "MN", "516": "NA",
  "524": "NP", "528": "NL", "554": "NZ", "558": "NI", "566": "NG", "578": "NO", "586": "PK",
  "591": "PA", "600": "PY", "604": "PE", "608": "PH", "616": "PL", "620": "PT", "630": "PR",
  "634": "QA", "642": "RO", "643": "RU", "682": "SA", "688": "RS", "694": "SL", "703": "SK",
  "705": "SI", "706": "SO", "710": "ZA", "724": "ES", "729": "SD", "752": "SE", "756": "CH",
  "760": "SY", "762": "TJ", "764": "TH", "788": "TN", "792": "TR", "800": "UG", "804": "UA",
  "784": "AE", "826": "GB", "840": "US", "858": "UY", "860": "UZ", "862": "VE", "704": "VN",
  "887": "YE", "894": "ZM", "716": "ZW", "112": "BY", "268": "GE",
  "384": "CI", "686": "SN", "834": "TZ",
};

type CountryItem = { code: string; name: string; flag: string };

type Props = {
  selectedCode: string;
  countries: CountryItem[];
  onSelect: (c: CountryItem) => void;
};

export default function WorldMap({ selectedCode, countries, onSelect }: Props) {
  const [tooltip, setTooltip] = useState<{ name: string; x: number; y: number } | null>(null);
  const supportedCodes = new Set(countries.map(c => c.code));

  const handleClick = (numericId: string) => {
    const alpha2 = NUMERIC_TO_ALPHA2[numericId];
    if (!alpha2) return;
    const country = countries.find(c => c.code === alpha2);
    if (country) onSelect(country);
  };

  const getFill = (numericId: string) => {
    const alpha2 = NUMERIC_TO_ALPHA2[numericId];
    if (!alpha2) return "rgba(245,215,160,0.08)";
    if (alpha2 === selectedCode) return "#F59E0B";
    if (supportedCodes.has(alpha2)) return "rgba(245,158,11,0.25)";
    return "rgba(245,215,160,0.08)";
  };

  return (
    <div className="relative w-full" style={{ background: "rgba(245,215,160,0.04)", borderRadius: "0.5rem", overflow: "hidden" }}>
      <ComposableMap
        projectionConfig={{ scale: 147 }}
        width={800}
        height={400}
        style={{ width: "100%", height: "auto" }}
      >
        <ZoomableGroup center={[0, 20]} zoom={1}>
          <Geographies geography={GEO_URL}>
            {({ geographies }) =>
              geographies.map((geo) => {
                const numericId = geo.id as string;
                const alpha2 = NUMERIC_TO_ALPHA2[numericId];
                const isSelected = alpha2 === selectedCode;
                const isSupported = alpha2 ? supportedCodes.has(alpha2) : false;
                return (
                  <Geography
                    key={geo.rsmKey}
                    geography={geo}
                    fill={getFill(numericId)}
                    stroke="rgba(245,215,160,0.2)"
                    strokeWidth={0.5}
                    style={{
                      default: { outline: "none", cursor: isSupported ? "pointer" : "default" },
                      hover: { fill: isSupported ? (isSelected ? "#F59E0B" : "rgba(245,158,11,0.45)") : "rgba(245,215,160,0.08)", outline: "none" },
                      pressed: { outline: "none" },
                    }}
                    onClick={() => handleClick(numericId)}
                    onMouseEnter={(e) => {
                      const country = alpha2 ? countries.find(c => c.code === alpha2) : null;
                      if (country) setTooltip({ name: `${country.flag} ${country.name}`, x: e.clientX, y: e.clientY });
                    }}
                    onMouseLeave={() => setTooltip(null)}
                  />
                );
              })
            }
          </Geographies>
        </ZoomableGroup>
      </ComposableMap>

      {tooltip && (
        <div
          className="fixed z-50 px-2 py-1 rounded text-xs font-semibold pointer-events-none"
          style={{ left: tooltip.x + 12, top: tooltip.y - 30, backgroundColor: "#1C1814", color: "#FFF8F0", border: "1px solid rgba(245,215,160,0.3)" }}>
          {tooltip.name}
        </div>
      )}

      {/* Legend */}
      <div className="absolute bottom-2 right-3 flex items-center gap-3">
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: "#F59E0B" }} />
          <span className="text-xs" style={{ color: "#A8967E" }}>Selectată</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: "rgba(245,158,11,0.25)" }} />
          <span className="text-xs" style={{ color: "#A8967E" }}>Disponibilă</span>
        </div>
      </div>
    </div>
  );
}
