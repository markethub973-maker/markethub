"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Globe, Loader2, AlertTriangle, RefreshCw, ChevronDown } from "lucide-react";

const COUNTRY_TO_TIER: Record<string, string> = {
  IN: "emerging", PK: "emerging", BD: "emerging", PH: "emerging", VN: "emerging",
  ID: "emerging", TH: "emerging", KH: "emerging", MM: "emerging", LK: "emerging",
  NP: "emerging", NG: "emerging", KE: "emerging", GH: "emerging", ET: "emerging",
  TZ: "emerging", UG: "emerging", SN: "emerging", EG: "emerging", MA: "emerging",
  TN: "emerging", DZ: "emerging", BO: "emerging", PY: "emerging", EC: "emerging",
  GE: "emerging", AM: "emerging", UZ: "emerging", UA: "emerging", MD: "emerging",
  RO: "southeast", BG: "southeast", RS: "southeast", HR: "southeast", GR: "southeast",
  TR: "southeast", HU: "southeast", BA: "southeast", ME: "southeast", AL: "southeast",
  MK: "southeast", KZ: "southeast", AZ: "southeast", MX: "southeast", BR: "southeast",
  CO: "southeast", AR: "southeast", CL: "southeast", PE: "southeast", CR: "southeast",
  ZA: "southeast", MY: "southeast",
  DE: "europe", FR: "europe", IT: "europe", ES: "europe", PT: "europe",
  NL: "europe", BE: "europe", AT: "europe", PL: "europe", CZ: "europe",
  SK: "europe", FI: "europe", SE: "europe", IE: "europe", JP: "europe",
  KR: "europe", TW: "europe", IL: "europe",
  US: "premium", CA: "premium", GB: "premium", AU: "premium", NZ: "premium",
  DK: "premium", NO: "premium", SG: "premium", HK: "premium",
  CH: "ultra", LU: "ultra", AE: "ultra", QA: "ultra", SA: "ultra",
  KW: "ultra", BH: "ultra", OM: "ultra", MC: "ultra", LI: "ultra",
};

const ALL_COUNTRIES = [
  { code: "AL", flag: "🇦🇱", name: "Albania" }, { code: "DZ", flag: "🇩🇿", name: "Algeria" },
  { code: "AR", flag: "🇦🇷", name: "Argentina" }, { code: "AM", flag: "🇦🇲", name: "Armenia" },
  { code: "AU", flag: "🇦🇺", name: "Australia" }, { code: "AT", flag: "🇦🇹", name: "Austria" },
  { code: "AZ", flag: "🇦🇿", name: "Azerbaijan" }, { code: "BH", flag: "🇧🇭", name: "Bahrain" },
  { code: "BD", flag: "🇧🇩", name: "Bangladesh" }, { code: "BE", flag: "🇧🇪", name: "Belgium" },
  { code: "BO", flag: "🇧🇴", name: "Bolivia" }, { code: "BA", flag: "🇧🇦", name: "Bosnia" },
  { code: "BR", flag: "🇧🇷", name: "Brazil" }, { code: "BG", flag: "🇧🇬", name: "Bulgaria" },
  { code: "KH", flag: "🇰🇭", name: "Cambodia" }, { code: "CA", flag: "🇨🇦", name: "Canada" },
  { code: "CL", flag: "🇨🇱", name: "Chile" }, { code: "CO", flag: "🇨🇴", name: "Colombia" },
  { code: "CR", flag: "🇨🇷", name: "Costa Rica" }, { code: "HR", flag: "🇭🇷", name: "Croatia" },
  { code: "CZ", flag: "🇨🇿", name: "Czech Republic" }, { code: "DK", flag: "🇩🇰", name: "Denmark" },
  { code: "EC", flag: "🇪🇨", name: "Ecuador" }, { code: "EG", flag: "🇪🇬", name: "Egypt" },
  { code: "ET", flag: "🇪🇹", name: "Ethiopia" }, { code: "FI", flag: "🇫🇮", name: "Finland" },
  { code: "FR", flag: "🇫🇷", name: "France" }, { code: "GE", flag: "🇬🇪", name: "Georgia" },
  { code: "DE", flag: "🇩🇪", name: "Germany" }, { code: "GH", flag: "🇬🇭", name: "Ghana" },
  { code: "GR", flag: "🇬🇷", name: "Greece" }, { code: "HK", flag: "🇭🇰", name: "Hong Kong" },
  { code: "HU", flag: "🇭🇺", name: "Hungary" }, { code: "IN", flag: "🇮🇳", name: "India" },
  { code: "ID", flag: "🇮🇩", name: "Indonesia" }, { code: "IE", flag: "🇮🇪", name: "Ireland" },
  { code: "IL", flag: "🇮🇱", name: "Israel" }, { code: "IT", flag: "🇮🇹", name: "Italy" },
  { code: "JP", flag: "🇯🇵", name: "Japan" }, { code: "KZ", flag: "🇰🇿", name: "Kazakhstan" },
  { code: "KE", flag: "🇰🇪", name: "Kenya" }, { code: "KR", flag: "🇰🇷", name: "South Korea" },
  { code: "KW", flag: "🇰🇼", name: "Kuwait" }, { code: "LI", flag: "🇱🇮", name: "Liechtenstein" },
  { code: "LU", flag: "🇱🇺", name: "Luxembourg" }, { code: "MK", flag: "🇲🇰", name: "N. Macedonia" },
  { code: "MY", flag: "🇲🇾", name: "Malaysia" }, { code: "MC", flag: "🇲🇨", name: "Monaco" },
  { code: "MA", flag: "🇲🇦", name: "Morocco" }, { code: "MM", flag: "🇲🇲", name: "Myanmar" },
  { code: "MX", flag: "🇲🇽", name: "Mexico" }, { code: "MD", flag: "🇲🇩", name: "Moldova" },
  { code: "ME", flag: "🇲🇪", name: "Montenegro" }, { code: "NL", flag: "🇳🇱", name: "Netherlands" },
  { code: "NZ", flag: "🇳🇿", name: "New Zealand" }, { code: "NG", flag: "🇳🇬", name: "Nigeria" },
  { code: "NO", flag: "🇳🇴", name: "Norway" }, { code: "OM", flag: "🇴🇲", name: "Oman" },
  { code: "PK", flag: "🇵🇰", name: "Pakistan" }, { code: "PY", flag: "🇵🇾", name: "Paraguay" },
  { code: "PE", flag: "🇵🇪", name: "Peru" }, { code: "PH", flag: "🇵🇭", name: "Philippines" },
  { code: "PL", flag: "🇵🇱", name: "Poland" }, { code: "PT", flag: "🇵🇹", name: "Portugal" },
  { code: "QA", flag: "🇶🇦", name: "Qatar" }, { code: "RO", flag: "🇷🇴", name: "Romania" },
  { code: "SA", flag: "🇸🇦", name: "Saudi Arabia" }, { code: "SN", flag: "🇸🇳", name: "Senegal" },
  { code: "RS", flag: "🇷🇸", name: "Serbia" }, { code: "SG", flag: "🇸🇬", name: "Singapore" },
  { code: "SK", flag: "🇸🇰", name: "Slovakia" }, { code: "ZA", flag: "🇿🇦", name: "South Africa" },
  { code: "ES", flag: "🇪🇸", name: "Spain" }, { code: "LK", flag: "🇱🇰", name: "Sri Lanka" },
  { code: "SE", flag: "🇸🇪", name: "Sweden" }, { code: "CH", flag: "🇨🇭", name: "Switzerland" },
  { code: "TW", flag: "🇹🇼", name: "Taiwan" }, { code: "TZ", flag: "🇹🇿", name: "Tanzania" },
  { code: "TH", flag: "🇹🇭", name: "Thailand" }, { code: "TN", flag: "🇹🇳", name: "Tunisia" },
  { code: "TR", flag: "🇹🇷", name: "Turkey" }, { code: "UG", flag: "🇺🇬", name: "Uganda" },
  { code: "UA", flag: "🇺🇦", name: "Ukraine" }, { code: "AE", flag: "🇦🇪", name: "UAE" },
  { code: "GB", flag: "🇬🇧", name: "United Kingdom" }, { code: "US", flag: "🇺🇸", name: "United States" },
  { code: "UZ", flag: "🇺🇿", name: "Uzbekistan" }, { code: "VN", flag: "🇻🇳", name: "Vietnam" },
  { code: "NP", flag: "🇳🇵", name: "Nepal" },
];

// Timezone → country code (VPN doesn't change timezone)
const TZ_TO_COUNTRY: Record<string, string> = {
  "Europe/Bucharest": "RO", "Europe/Sofia": "BG", "Europe/Belgrade": "RS",
  "Europe/Zagreb": "HR", "Europe/Athens": "GR", "Europe/Istanbul": "TR",
  "Europe/Budapest": "HU", "Europe/Sarajevo": "BA", "Europe/Podgorica": "ME",
  "Europe/Tirane": "AL", "Europe/Skopje": "MK", "Europe/Chisinau": "MD",
  "Europe/Kiev": "UA", "Europe/Kyiv": "UA",
  "Europe/Berlin": "DE", "Europe/Paris": "FR", "Europe/Rome": "IT",
  "Europe/Madrid": "ES", "Europe/Lisbon": "PT", "Europe/Amsterdam": "NL",
  "Europe/Brussels": "BE", "Europe/Vienna": "AT", "Europe/Warsaw": "PL",
  "Europe/Prague": "CZ", "Europe/Bratislava": "SK", "Europe/Helsinki": "FI",
  "Europe/Stockholm": "SE", "Europe/Dublin": "IE", "Europe/Copenhagen": "DK",
  "Europe/Oslo": "NO", "Europe/Zurich": "CH", "Europe/Luxembourg": "LU",
  "Europe/Monaco": "MC", "Europe/Vaduz": "LI",
  "America/New_York": "US", "America/Chicago": "US", "America/Denver": "US",
  "America/Los_Angeles": "US", "America/Anchorage": "US", "Pacific/Honolulu": "US",
  "America/Toronto": "CA", "America/Vancouver": "CA", "America/Edmonton": "CA",
  "Europe/London": "GB",
  "Australia/Sydney": "AU", "Australia/Melbourne": "AU", "Australia/Brisbane": "AU",
  "Australia/Perth": "AU", "Pacific/Auckland": "NZ",
  "Asia/Tokyo": "JP", "Asia/Seoul": "KR", "Asia/Taipei": "TW",
  "Asia/Singapore": "SG", "Asia/Hong_Kong": "HK", "Asia/Dubai": "AE",
  "Asia/Riyadh": "SA", "Asia/Qatar": "QA", "Asia/Kuwait": "KW",
  "Asia/Bahrain": "BH", "Asia/Muscat": "OM",
  "Asia/Kolkata": "IN", "Asia/Karachi": "PK", "Asia/Dhaka": "BD",
  "Asia/Manila": "PH", "Asia/Ho_Chi_Minh": "VN", "Asia/Jakarta": "ID",
  "Asia/Bangkok": "TH", "Asia/Phnom_Penh": "KH", "Asia/Yangon": "MM",
  "Asia/Colombo": "LK", "Asia/Kathmandu": "NP",
  "Asia/Almaty": "KZ", "Asia/Baku": "AZ", "Asia/Tbilisi": "GE",
  "Asia/Yerevan": "AM", "Asia/Tashkent": "UZ", "Asia/Tel_Aviv": "IL",
  "Africa/Cairo": "EG", "Africa/Casablanca": "MA", "Africa/Tunis": "TN",
  "Africa/Algiers": "DZ", "Africa/Lagos": "NG", "Africa/Nairobi": "KE",
  "Africa/Accra": "GH", "Africa/Addis_Ababa": "ET", "Africa/Dar_es_Salaam": "TZ",
  "Africa/Kampala": "UG", "Africa/Dakar": "SN", "Africa/Johannesburg": "ZA",
  "America/Mexico_City": "MX", "America/Sao_Paulo": "BR", "America/Bogota": "CO",
  "America/Argentina/Buenos_Aires": "AR", "America/Santiago": "CL",
  "America/Lima": "PE", "America/Costa_Rica": "CR", "America/La_Paz": "BO",
  "America/Asuncion": "PY", "America/Guayaquil": "EC", "Asia/Kuala_Lumpur": "MY",
};

// Language prefix → country code (VPN doesn't change browser language)
const LANG_TO_COUNTRY: Record<string, string> = {
  "ro": "RO", "bg": "BG", "sr": "RS", "hr": "HR", "el": "GR", "tr": "TR",
  "hu": "HU", "bs": "BA", "sq": "AL", "mk": "MK", "uk": "UA", "ka": "GE",
  "de": "DE", "fr": "FR", "it": "IT", "es": "ES", "pt": "PT", "nl": "NL",
  "pl": "PL", "cs": "CZ", "sk": "SK", "fi": "FI", "sv": "SE", "da": "DK",
  "nb": "NO", "nn": "NO", "ja": "JP", "ko": "KR", "he": "IL",
  "hi": "IN", "bn": "BD", "ur": "PK", "tl": "PH", "vi": "VN",
  "id": "ID", "th": "TH", "km": "KH", "my": "MM", "si": "LK", "ne": "NP",
  "ar": "SA", "fa": "IR", "sw": "KE", "am": "ET", "ms": "MY",
  "kk": "KZ", "az": "AZ", "hy": "AM", "uz": "UZ",
};

function detectFromBrowser(): string | null {
  // 1. Timezone (most reliable — VPN never changes it)
  try {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    const cc = TZ_TO_COUNTRY[tz];
    if (cc && COUNTRY_TO_TIER[cc]) return cc;
  } catch { /* ignore */ }

  // 2. Browser language
  try {
    const lang = navigator.language?.split("-")[0]?.toLowerCase();
    if (lang) {
      const cc = LANG_TO_COUNTRY[lang];
      if (cc && COUNTRY_TO_TIER[cc]) return cc;
    }
    // Try full locale (e.g., "en-AU" → AU)
    const region = navigator.language?.split("-")[1]?.toUpperCase();
    if (region && COUNTRY_TO_TIER[region]) return region;
  } catch { /* ignore */ }

  return null;
}

export default function ResellerPage() {
  const router = useRouter();
  const [status, setStatus] = useState<"detecting" | "vpn" | "manual">("detecting");
  const [search, setSearch] = useState("");

  useEffect(() => {
    // Try browser signals first (instant, no network)
    const browserCC = detectFromBrowser();
    if (browserCC && COUNTRY_TO_TIER[browserCC]) {
      router.replace(`/reseller/${COUNTRY_TO_TIER[browserCC]}`);
      return;
    }

    // Fallback: IP detection
    const controller = new AbortController();
    fetch("https://ipapi.co/json/", { signal: controller.signal })
      .then((r) => r.json())
      .then((data) => {
        const cc = data?.country_code;
        if (cc && COUNTRY_TO_TIER[cc]) {
          router.replace(`/reseller/${COUNTRY_TO_TIER[cc]}`);
        } else {
          setStatus("vpn");
        }
      })
      .catch(() => setStatus("vpn"));
    return () => controller.abort();
  }, [router]);

  const retry = () => {
    setStatus("detecting");
    fetch("https://ipapi.co/json/")
      .then((r) => r.json())
      .then((data) => {
        const cc = data?.country_code;
        if (cc && COUNTRY_TO_TIER[cc]) {
          router.replace(`/reseller/${COUNTRY_TO_TIER[cc]}`);
        } else {
          setStatus("vpn");
        }
      })
      .catch(() => setStatus("vpn"));
  };

  const selectCountry = (code: string) => {
    const tier = COUNTRY_TO_TIER[code];
    if (tier) router.push(`/reseller/${tier}`);
  };

  const filtered = search
    ? ALL_COUNTRIES.filter((c) =>
        c.name.toLowerCase().includes(search.toLowerCase()) ||
        c.code.toLowerCase().includes(search.toLowerCase())
      )
    : ALL_COUNTRIES;

  return (
    <div
      className="min-h-screen text-[#FAFAF5]"
      style={{ background: "linear-gradient(180deg, #0A0A0A 0%, #1A1510 50%, #0A0A0A 100%)" }}
    >
      <div className="max-w-lg mx-auto px-6 py-24 text-center">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-semibold mb-8"
          style={{ background: "rgba(245,158,11,0.15)", color: "#F59E0B", border: "1px solid rgba(245,158,11,0.3)" }}>
          <Globe className="w-3.5 h-3.5" /> Partner Program
        </div>

        <h1 className="text-3xl md:text-4xl font-extrabold mb-4">
          You have the clients.{" "}
          <span className="bg-gradient-to-r from-amber-400 to-amber-600 bg-clip-text text-transparent">
            We do the work.
          </span>
        </h1>
        <p className="text-sm mb-10" style={{ color: "rgba(255,255,255,0.45)" }}>
          We tailor pricing to your local market so it makes sense for you and your clients.
        </p>

        {/* Detecting */}
        {status === "detecting" && (
          <div className="flex flex-col items-center gap-4 mt-8">
            <Loader2 className="w-8 h-8 animate-spin text-amber-500" />
            <p style={{ color: "rgba(255,255,255,0.5)" }}>Detecting your location...</p>
          </div>
        )}

        {/* VPN detected or failed */}
        {status === "vpn" && (
          <div className="mt-4 space-y-6">
            <div className="rounded-2xl p-5" style={{
              background: "rgba(245,158,11,0.06)",
              border: "1px solid rgba(245,158,11,0.2)",
            }}>
              <div className="flex items-center justify-center gap-2 mb-3">
                <AlertTriangle className="w-4 h-4" style={{ color: "#F59E0B" }} />
                <span className="text-sm font-semibold" style={{ color: "#F59E0B" }}>Location not detected</span>
              </div>
              <p className="text-xs mb-4" style={{ color: "rgba(255,255,255,0.45)" }}>
                If you&apos;re using a VPN, please disable it and retry so we can show you the right pricing for your country.
              </p>
              <button
                type="button"
                onClick={retry}
                className="btn-3d-active inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm"
              >
                <RefreshCw className="w-4 h-4" />
                Retry Detection
              </button>
            </div>

            <div className="flex items-center gap-3">
              <div className="flex-1 h-px" style={{ background: "rgba(255,255,255,0.08)" }} />
              <span className="text-xs" style={{ color: "rgba(255,255,255,0.25)" }}>or select manually</span>
              <div className="flex-1 h-px" style={{ background: "rgba(255,255,255,0.08)" }} />
            </div>

            {/* Country selector */}
            <button
              type="button"
              onClick={() => setStatus("manual")}
              className="btn-3d w-full flex items-center justify-between px-5 py-3 rounded-xl text-sm"
            >
              <span>Select your country</span>
              <ChevronDown className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Manual country selection */}
        {status === "manual" && (
          <div className="mt-4">
            <div className="rounded-2xl overflow-hidden" style={{
              background: "rgba(30, 30, 40, 0.95)",
              border: "1px solid rgba(255,255,255,0.12)",
              boxShadow: "0 8px 32px rgba(0,0,0,0.4)",
            }}>
              {/* Search */}
              <div className="p-3" style={{ borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search your country..."
                  autoFocus
                  className="w-full text-sm px-4 py-2.5 rounded-lg focus:outline-none"
                  style={{
                    background: "rgba(255,255,255,0.06)",
                    border: "1px solid rgba(255,255,255,0.1)",
                    color: "white",
                  }}
                />
              </div>

              {/* Country list */}
              <div className="overflow-y-auto" style={{ maxHeight: 320 }}>
                {filtered.map((c) => (
                  <button
                    key={c.code}
                    type="button"
                    onClick={() => selectCountry(c.code)}
                    className="w-full text-left px-5 py-3 flex items-center gap-3 transition-colors"
                    style={{ color: "rgba(255,255,255,0.75)" }}
                    onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(245,158,11,0.1)"; }}
                    onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
                  >
                    <span className="text-lg">{c.flag}</span>
                    <span className="text-sm font-medium">{c.name}</span>
                  </button>
                ))}
                {filtered.length === 0 && (
                  <p className="text-center py-6 text-sm" style={{ color: "rgba(255,255,255,0.3)" }}>
                    Country not found
                  </p>
                )}
              </div>

              {/* Back */}
              <div className="p-3" style={{ borderTop: "1px solid rgba(255,255,255,0.08)" }}>
                <button
                  type="button"
                  onClick={() => { setStatus("vpn"); setSearch(""); }}
                  className="w-full text-center text-xs py-2"
                  style={{ color: "rgba(255,255,255,0.3)" }}
                >
                  ← Back to retry
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
