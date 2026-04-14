"use client";

/**
 * ThemeSwitcher — dropdown with 4 preset themes + custom-color picker.
 *
 * Click → opens panel. Click a preset → applies instantly. Click
 * "Custom" → reveals two color pickers (primary + accent) that update
 * live as the user drags. Selections persist in localStorage via the
 * ThemeProvider.
 */

import { useTheme, THEMES, ThemeId } from "./ThemeProvider";
import { useEffect, useRef, useState } from "react";
import { Palette, Check, RotateCcw } from "lucide-react";

export default function ThemeSwitcher() {
  const { theme, customColors, setTheme, setCustomColors } = useTheme();
  const [open, setOpen] = useState(false);
  const [showCustom, setShowCustom] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  // Close panel on outside click
  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setOpen(false);
        setShowCustom(false);
      }
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [open]);

  const pick = (id: ThemeId) => {
    if (id === "custom") {
      setShowCustom(true);
      setTheme("custom");
      return;
    }
    setTheme(id);
    setShowCustom(false);
    setOpen(false);
  };

  const onPrimary = (e: React.ChangeEvent<HTMLInputElement>) => {
    setCustomColors({ ...customColors, primary: e.target.value });
  };
  const onAccent = (e: React.ChangeEvent<HTMLInputElement>) => {
    setCustomColors({ ...customColors, accent: e.target.value });
  };

  return (
    <div className="relative" ref={panelRef}>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 px-3 py-1.5 rounded-lg border transition"
        style={{
          backgroundColor: "var(--color-bg-secondary)",
          borderColor: "var(--color-border)",
          color: "var(--color-text)",
        }}
        aria-label="Change theme"
        title="Theme"
      >
        <span
          className="w-4 h-4 rounded-full inline-block"
          style={{
            background: `linear-gradient(135deg, var(--color-primary) 50%, var(--color-accent) 50%)`,
            border: "1px solid rgba(0,0,0,0.06)",
          }}
        />
        <Palette className="w-3.5 h-3.5" />
      </button>

      {open && (
        <div
          className="absolute right-0 mt-2 w-72 rounded-xl shadow-2xl z-50 overflow-hidden"
          style={{
            backgroundColor: "var(--color-bg)",
            border: "1px solid var(--color-border)",
          }}
        >
          <div className="px-3 py-2" style={{ borderBottom: "1px solid var(--color-border)" }}>
            <p className="text-xs font-bold uppercase tracking-wide" style={{ color: "var(--color-text-secondary)" }}>
              Theme
            </p>
          </div>

          <div className="py-1">
            {THEMES.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => pick(t.id)}
                className="w-full flex items-center gap-3 px-3 py-2 transition text-left"
                style={{
                  backgroundColor: theme === t.id ? "var(--color-primary-light)" : "transparent",
                }}
                onMouseEnter={(e) => {
                  if (theme !== t.id) e.currentTarget.style.backgroundColor = "var(--color-bg-secondary)";
                }}
                onMouseLeave={(e) => {
                  if (theme !== t.id) e.currentTarget.style.backgroundColor = "transparent";
                }}
              >
                <span className="flex gap-1 flex-shrink-0">
                  <span
                    className="w-4 h-4 rounded-full inline-block"
                    style={{
                      background: t.id === "custom" ? customColors.primary : t.primary,
                      border: "1px solid rgba(0,0,0,0.08)",
                    }}
                  />
                  <span
                    className="w-4 h-4 rounded-full inline-block"
                    style={{
                      background: t.id === "custom" ? customColors.accent : t.accent,
                      border: "1px solid rgba(0,0,0,0.08)",
                    }}
                  />
                </span>
                <span className="text-sm flex-1" style={{ color: "var(--color-text)" }}>
                  {t.label}
                </span>
                {theme === t.id && (
                  <Check className="w-3.5 h-3.5" style={{ color: "var(--color-primary)" }} />
                )}
              </button>
            ))}
          </div>

          {/* Custom color pickers — show when "custom" is active */}
          {(theme === "custom" || showCustom) && (
            <div
              className="px-3 py-3 space-y-3"
              style={{ borderTop: "1px solid var(--color-border)", backgroundColor: "var(--color-bg-secondary)" }}
            >
              <p className="text-xs font-bold uppercase tracking-wide" style={{ color: "var(--color-text-secondary)" }}>
                Your colors
              </p>

              <div className="flex items-center gap-2">
                <label className="text-xs flex-1" style={{ color: "var(--color-text-secondary)" }}>
                  Primary
                </label>
                <input
                  type="color"
                  value={customColors.primary}
                  onChange={onPrimary}
                  className="w-9 h-9 rounded cursor-pointer"
                  style={{ border: "1px solid var(--color-border)" }}
                  aria-label="Primary color"
                />
                <input
                  type="text"
                  value={customColors.primary}
                  onChange={(e) => /^#[0-9A-Fa-f]{0,6}$/.test(e.target.value) && setCustomColors({ ...customColors, primary: e.target.value })}
                  className="w-20 rounded px-2 py-1 text-xs font-mono"
                  style={{
                    backgroundColor: "var(--color-bg)",
                    border: "1px solid var(--color-border)",
                    color: "var(--color-text)",
                    outline: "none",
                  }}
                />
              </div>

              <div className="flex items-center gap-2">
                <label className="text-xs flex-1" style={{ color: "var(--color-text-secondary)" }}>
                  Accent
                </label>
                <input
                  type="color"
                  value={customColors.accent}
                  onChange={onAccent}
                  className="w-9 h-9 rounded cursor-pointer"
                  style={{ border: "1px solid var(--color-border)" }}
                  aria-label="Accent color"
                />
                <input
                  type="text"
                  value={customColors.accent}
                  onChange={(e) => /^#[0-9A-Fa-f]{0,6}$/.test(e.target.value) && setCustomColors({ ...customColors, accent: e.target.value })}
                  className="w-20 rounded px-2 py-1 text-xs font-mono"
                  style={{
                    backgroundColor: "var(--color-bg)",
                    border: "1px solid var(--color-border)",
                    color: "var(--color-text)",
                    outline: "none",
                  }}
                />
              </div>

              <button
                type="button"
                onClick={() => { setCustomColors({ primary: "#F59E0B", accent: "#EC8054" }); }}
                className="text-[10px] flex items-center gap-1 underline"
                style={{ color: "var(--color-text-secondary)" }}
              >
                <RotateCcw className="w-2.5 h-2.5" />
                Reset to default
              </button>

              <p className="text-[10px]" style={{ color: "var(--color-text-muted)" }}>
                Lighter / semi-transparent shades are derived automatically.
                Saved on this device.
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
