"use client";

import { useState, useEffect } from "react";
import { usePathname } from "next/navigation";
import { useTheme } from "@/context/ThemeContext";
import { type ThemeConfig } from "@/lib/theme";
import GlassCard from "./GlassCard";

/**
 * Floating theme picker — bottom-right corner, toggled by palette icon.
 * Shows 5 preset swatches + custom accent color picker.
 */
const PUBLIC_PATHS = ["/promo", "/pricing", "/login", "/register", "/white-label", "/privacy", "/terms", "/help"];

export default function ThemeCustomizer() {
  const { theme, setTheme, themes } = useTheme();
  const [open, setOpen] = useState(false);
  const [hide, setHide] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    const p = pathname;
    const host = typeof window !== "undefined" ? window.location.hostname : "";
    const isPublic =
      host === "get.markethubpromo.com" ||
      PUBLIC_PATHS.some((pp) => p === pp) ||
      p.startsWith("/offer") || p.startsWith("/l/") ||
      p.startsWith("/features") || p.startsWith("/guides") ||
      p.startsWith("/for/") || p.startsWith("/vs/");
    setHide(isPublic);
  }, [pathname]);

  if (hide) return null;

  const handlePresetClick = (t: ThemeConfig) => {
    setTheme(t);
  };

  const handleColorChange = (field: keyof ThemeConfig, hex: string) => {
    const update: Partial<ThemeConfig> = { name: "Custom", [field]: hex };
    // Auto-derive accentGlow when accent changes
    if (field === "accent") {
      const r = parseInt(hex.slice(1, 3), 16);
      const g = parseInt(hex.slice(3, 5), 16);
      const b = parseInt(hex.slice(5, 7), 16);
      update.accentGlow = `rgba(${r},${g},${b},0.2)`;
    }
    setTheme({ ...theme, ...update });
  };

  return (
    <div className="fixed top-4 right-56 z-50">
      {/* Toggle button */}
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-12 h-12 rounded-full btn-liquid-primary flex items-center justify-center shadow-lg"
        title="Theme Customizer"
      >
        <svg
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <circle cx="13.5" cy="6.5" r="2.5" />
          <circle cx="17.5" cy="10.5" r="2.5" />
          <circle cx="8.5" cy="7.5" r="2.5" />
          <circle cx="6.5" cy="12.5" r="2.5" />
          <path d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12a10 10 0 0 0 4 8" />
          <circle cx="12" cy="17" r="2" />
        </svg>
      </button>

      {/* Panel */}
      {open && (
        <div
          className="absolute top-14 right-0 w-72"
          style={{
            animation: "slideUpIn 0.2s ease-out",
          }}
        >
          <GlassCard padding="p-5">
            <h3 className="text-glass-primary font-semibold text-sm mb-4">
              Theme Customizer
            </h3>

            {/* Preset swatches */}
            <div className="flex gap-3 mb-5">
              {themes.map((t) => (
                <button
                  key={t.name}
                  onClick={() => handlePresetClick(t)}
                  className="group relative flex flex-col items-center gap-1"
                  title={t.name}
                >
                  <div
                    className="w-10 h-10 rounded-full border-2 transition-all"
                    style={{
                      background: `linear-gradient(135deg, ${t.bg1}, ${t.accent})`,
                      borderColor:
                        theme.name === t.name
                          ? t.accent
                          : "rgba(255,255,255,0.1)",
                      boxShadow:
                        theme.name === t.name
                          ? `0 0 12px ${t.accentGlow}`
                          : "none",
                    }}
                  />
                  <span
                    className="text-[10px] text-glass-muted group-hover:text-glass-secondary transition-colors"
                    style={{
                      color:
                        theme.name === t.name ? t.accent : undefined,
                    }}
                  >
                    {t.name.split(" ")[0]}
                  </span>
                </button>
              ))}
            </div>

            {/* Color pickers — all customizable */}
            <div className="space-y-2.5">
              {([
                { key: "accent" as const, label: "Accent", hint: "Buttons, CTAs" },
                { key: "bg1" as const, label: "Background", hint: "Page gradient start" },
                { key: "bg2" as const, label: "Mid tone", hint: "Page gradient center" },
                { key: "bg3" as const, label: "Light bg", hint: "Page gradient end" },
              ] as const).map((f) => (
                <label key={f.key} className="flex items-center gap-3 text-xs">
                  <input
                    type="color"
                    value={theme[f.key]}
                    onChange={(e) => handleColorChange(f.key, e.target.value)}
                    className="w-7 h-7 rounded-lg cursor-pointer border-none bg-transparent flex-shrink-0"
                  />
                  <span className="w-20 text-glass-secondary">{f.label}</span>
                  <span className="text-glass-muted font-mono text-[10px]">{theme[f.key]}</span>
                </label>
              ))}
            </div>

            {/* Blob colors */}
            <div className="mt-3 pt-3 border-t border-white/5">
              <p className="text-[9px] text-glass-muted uppercase tracking-wider mb-2">Ambient Blobs</p>
              <div className="space-y-2">
                {([
                  { key: "blob1" as const, label: "Blob 1" },
                  { key: "blob2" as const, label: "Blob 2" },
                  { key: "blob3" as const, label: "Blob 3" },
                ] as const).map((f) => (
                  <label key={f.key} className="flex items-center gap-3 text-xs">
                    <input
                      type="color"
                      value={theme.accent}
                      onChange={(e) => {
                        const r = parseInt(e.target.value.slice(1, 3), 16);
                        const g = parseInt(e.target.value.slice(3, 5), 16);
                        const b = parseInt(e.target.value.slice(5, 7), 16);
                        handleColorChange(f.key, `rgba(${r},${g},${b},0.15)`);
                      }}
                      className="w-7 h-7 rounded-lg cursor-pointer border-none bg-transparent flex-shrink-0"
                    />
                    <span className="text-glass-secondary">{f.label}</span>
                  </label>
                ))}
              </div>
            </div>

            <div className="mt-3 pt-3 border-t border-white/5 text-glass-muted text-[10px]">
              Active: {theme.name}
            </div>
          </GlassCard>
        </div>
      )}

      <style>{`
        @keyframes slideUpIn {
          from { opacity: 0; transform: translateY(12px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}
