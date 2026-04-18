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
    // Hide only on public pages — show on all dashboard/app pages
    const isPublic =
      host === "get.markethubpromo.com" ||
      p === "/login" || p === "/register" || p === "/promo" ||
      p === "/demo" || p === "/pricing" ||
      p.startsWith("/features") || p.startsWith("/white-label") ||
      p.startsWith("/offer") || p.startsWith("/l/") ||
      p.startsWith("/guides") || p.startsWith("/for/") || p.startsWith("/vs/");
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
    <div className="fixed bottom-4 left-52 z-50">
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
          className="absolute bottom-14 left-0 w-72"
          style={{
            animation: "slideUpIn 0.2s ease-out",
          }}
        >
          <div style={{
            background: "#0d0b1e",
            backdropFilter: "blur(32px) saturate(180%)",
            border: "1px solid rgba(255,255,255,0.18)",
            borderRadius: 16,
            padding: 20,
            boxShadow: "0 20px 60px rgba(0,0,0,0.8), inset 0 1px 0 rgba(255,255,255,0.1)",
            position: "relative",
            overflow: "hidden",
          }}>
            {/* Glass shine effect */}
            <div style={{
              position: "absolute", top: 0, left: 0, right: 0, height: "40%",
              background: "linear-gradient(180deg, rgba(255,255,255,0.06) 0%, transparent 100%)",
              borderRadius: "16px 16px 60% 60%", pointerEvents: "none",
            }} />
            <h3 style={{ color: "rgba(255,255,255,0.9)", fontWeight: 600, fontSize: 14, marginBottom: 16 }}>
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
                  <span style={{ width: 80, color: "rgba(255,255,255,0.65)" }}>{f.label}</span>
                  <span style={{ color: "rgba(255,255,255,0.3)", fontFamily: "monospace", fontSize: 10 }}>{theme[f.key]}</span>
                </label>
              ))}
            </div>

            {/* Text colors */}
            <div style={{ marginTop: 12, paddingTop: 10, borderTop: "1px solid rgba(255,255,255,0.08)" }}>
              <p style={{ fontSize: 9, color: "rgba(255,255,255,0.3)", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 8 }}>Text Colors</p>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                <label style={{ display: "flex", alignItems: "center", gap: 12, fontSize: 12 }}>
                  <input
                    type="color"
                    value={theme.textSidebar?.startsWith("#") ? theme.textSidebar : "#FFF8F0"}
                    onChange={(e) => handleColorChange("textSidebar", e.target.value)}
                    style={{ width: 28, height: 28, borderRadius: 8, cursor: "pointer", border: "none", background: "transparent", flexShrink: 0 }}
                  />
                  <span style={{ color: "rgba(255,255,255,0.65)" }}>Sidebar text</span>
                </label>
                <label style={{ display: "flex", alignItems: "center", gap: 12, fontSize: 12 }}>
                  <input
                    type="color"
                    value={theme.textWorkspace?.startsWith("#") ? theme.textWorkspace : "#2D2620"}
                    onChange={(e) => handleColorChange("textWorkspace", e.target.value)}
                    style={{ width: 28, height: 28, borderRadius: 8, cursor: "pointer", border: "none", background: "transparent", flexShrink: 0 }}
                  />
                  <span style={{ color: "rgba(255,255,255,0.65)" }}>Workspace text</span>
                </label>
              </div>
            </div>

            {/* Blob colors */}
            <div style={{ marginTop: 12, paddingTop: 10, borderTop: "1px solid rgba(255,255,255,0.08)" }}>
              <p style={{ fontSize: 9, color: "rgba(255,255,255,0.3)", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 8 }}>Ambient Blobs</p>
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
                    <span style={{ color: "rgba(255,255,255,0.65)" }}>{f.label}</span>
                  </label>
                ))}
              </div>
            </div>

            <div style={{ marginTop: 12, paddingTop: 10, borderTop: "1px solid rgba(255,255,255,0.08)", fontSize: 10, color: "rgba(255,255,255,0.3)" }}>
              Active: {theme.name}
            </div>
          </div>
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
