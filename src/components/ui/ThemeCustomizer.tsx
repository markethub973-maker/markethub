"use client";

import { useState } from "react";
import { useTheme } from "@/context/ThemeContext";
import { type ThemeConfig } from "@/lib/theme";
import GlassCard from "./GlassCard";

/**
 * Floating theme picker — bottom-right corner, toggled by palette icon.
 * Shows 5 preset swatches + custom accent color picker.
 */
export default function ThemeCustomizer() {
  const { theme, setTheme, themes } = useTheme();
  const [open, setOpen] = useState(false);

  const handlePresetClick = (t: ThemeConfig) => {
    setTheme(t);
  };

  const handleAccentChange = (hex: string) => {
    // Build a custom theme based on current, with new accent
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    setTheme({
      ...theme,
      name: "Custom",
      accent: hex,
      accentGlow: `rgba(${r},${g},${b},0.2)`,
    });
  };

  return (
    <div className="fixed top-4 right-32 z-50">
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

            {/* Custom accent picker */}
            <div className="space-y-3">
              <label className="flex items-center gap-3 text-glass-secondary text-xs">
                <span className="w-20">Accent</span>
                <input
                  type="color"
                  value={theme.accent}
                  onChange={(e) => handleAccentChange(e.target.value)}
                  className="w-8 h-8 rounded-lg cursor-pointer border-none bg-transparent"
                />
                <span className="text-glass-muted font-mono text-xs">
                  {theme.accent}
                </span>
              </label>
            </div>

            <div className="mt-4 pt-3 border-t border-white/5 text-glass-muted text-[10px]">
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
