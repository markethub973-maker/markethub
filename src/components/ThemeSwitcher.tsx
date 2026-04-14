"use client";

/**
 * ThemeSwitcher — globally-floating button (top-right) that opens a
 * full-overlay panel with 4 preset themes + custom-color picker.
 *
 * Rendered via React portal into document.body so it escapes ANY
 * sidebar / overflow / z-index context. Visible on every page.
 */

import { useTheme, THEMES, ThemeId } from "./ThemeProvider";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Palette, Check, RotateCcw, X } from "lucide-react";

export default function ThemeSwitcher() {
  const { theme, customColors, setTheme, setCustomColors } = useTheme();
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => { setMounted(true); }, []);

  // Close on outside click + Escape
  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    const onEsc = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    document.addEventListener("mousedown", onClick);
    document.addEventListener("keydown", onEsc);
    return () => {
      document.removeEventListener("mousedown", onClick);
      document.removeEventListener("keydown", onEsc);
    };
  }, [open]);

  const pick = (id: ThemeId) => {
    setTheme(id);
    if (id !== "custom") setOpen(false);
  };

  const onPrimary = (e: React.ChangeEvent<HTMLInputElement>) => {
    setCustomColors({ ...customColors, primary: e.target.value });
  };
  const onAccent = (e: React.ChangeEvent<HTMLInputElement>) => {
    setCustomColors({ ...customColors, accent: e.target.value });
  };

  // Floating trigger — always visible top-right, above every other layer
  const trigger = (
    <button
      type="button"
      onClick={() => setOpen(true)}
      className="fixed top-3 right-3 w-10 h-10 rounded-full shadow-lg flex items-center justify-center transition-transform hover:scale-105"
      style={{
        zIndex: 9998,
        background: `linear-gradient(135deg, var(--color-primary), var(--color-accent))`,
        color: "white",
        border: "2px solid rgba(255,255,255,0.6)",
      }}
      aria-label="Change theme"
      title="Change theme"
    >
      <Palette className="w-4 h-4" />
    </button>
  );

  // Panel — also portaled, fixed position, with backdrop
  const panel = open && (
    <div
      className="fixed inset-0 flex items-start justify-end p-3"
      style={{
        zIndex: 9999,
        backgroundColor: "rgba(0,0,0,0.35)",
        backdropFilter: "blur(2px)",
      }}
    >
      <div
        ref={panelRef}
        className="w-80 max-w-[calc(100vw-24px)] rounded-2xl shadow-2xl overflow-y-auto mt-12"
        style={{
          backgroundColor: "var(--color-bg)",
          border: "1px solid var(--color-border)",
          maxHeight: "calc(100vh - 80px)",
        }}
      >
        {/* Header */}
        <div
          className="px-4 py-3 flex items-center gap-2"
          style={{ borderBottom: "1px solid var(--color-border)", backgroundColor: "var(--color-bg-secondary)" }}
        >
          <Palette className="w-4 h-4" style={{ color: "var(--color-primary)" }} />
          <p className="text-sm font-bold flex-1" style={{ color: "var(--color-text)" }}>
            Theme
          </p>
          <button
            type="button"
            onClick={() => setOpen(false)}
            aria-label="Close"
            className="p-1 rounded"
            style={{ color: "var(--color-text-secondary)" }}
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Preset list */}
        <div className="py-1">
          {THEMES.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => pick(t.id)}
              className="w-full flex items-center gap-3 px-4 py-2.5 transition text-left"
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
                  className="w-5 h-5 rounded-full inline-block"
                  style={{
                    background: t.id === "custom" ? customColors.primary : t.primary,
                    border: "1px solid rgba(0,0,0,0.08)",
                  }}
                />
                <span
                  className="w-5 h-5 rounded-full inline-block"
                  style={{
                    background: t.id === "custom" ? customColors.accent : t.accent,
                    border: "1px solid rgba(0,0,0,0.08)",
                  }}
                />
              </span>
              <span className="text-sm flex-1 font-medium" style={{ color: "var(--color-text)" }}>
                {t.label}
              </span>
              {theme === t.id && (
                <Check className="w-4 h-4" style={{ color: "var(--color-primary)" }} />
              )}
            </button>
          ))}
        </div>

        {/* Custom color pickers — show when "custom" is active */}
        {theme === "custom" && (
          <div
            className="px-4 py-4 space-y-3"
            style={{ borderTop: "1px solid var(--color-border)", backgroundColor: "var(--color-bg-secondary)" }}
          >
            <p className="text-xs font-bold uppercase tracking-wide" style={{ color: "var(--color-text-secondary)" }}>
              Your colors
            </p>

            <div className="flex items-center gap-3">
              <label className="text-xs flex-1 font-semibold" style={{ color: "var(--color-text)" }}>
                Primary
              </label>
              <input
                type="color"
                value={customColors.primary}
                onChange={onPrimary}
                className="w-10 h-10 rounded cursor-pointer"
                style={{ border: "1px solid var(--color-border)" }}
                aria-label="Primary color"
              />
              <input
                type="text"
                value={customColors.primary}
                onChange={(e) => /^#[0-9A-Fa-f]{0,6}$/.test(e.target.value) && setCustomColors({ ...customColors, primary: e.target.value })}
                className="w-24 rounded px-2 py-1.5 text-xs font-mono"
                style={{
                  backgroundColor: "var(--color-bg)",
                  border: "1px solid var(--color-border)",
                  color: "var(--color-text)",
                  outline: "none",
                }}
              />
            </div>

            <div className="flex items-center gap-3">
              <label className="text-xs flex-1 font-semibold" style={{ color: "var(--color-text)" }}>
                Accent
              </label>
              <input
                type="color"
                value={customColors.accent}
                onChange={onAccent}
                className="w-10 h-10 rounded cursor-pointer"
                style={{ border: "1px solid var(--color-border)" }}
                aria-label="Accent color"
              />
              <input
                type="text"
                value={customColors.accent}
                onChange={(e) => /^#[0-9A-Fa-f]{0,6}$/.test(e.target.value) && setCustomColors({ ...customColors, accent: e.target.value })}
                className="w-24 rounded px-2 py-1.5 text-xs font-mono"
                style={{
                  backgroundColor: "var(--color-bg)",
                  border: "1px solid var(--color-border)",
                  color: "var(--color-text)",
                  outline: "none",
                }}
              />
            </div>

            <div className="flex items-center gap-2 pt-1">
              <button
                type="button"
                onClick={() => setCustomColors({ primary: "#F59E0B", accent: "#EC8054" })}
                className="text-[11px] flex items-center gap-1 underline"
                style={{ color: "var(--color-text-secondary)" }}
              >
                <RotateCcw className="w-3 h-3" />
                Reset
              </button>
              <span className="text-[10px] flex-1 text-right" style={{ color: "var(--color-text-muted)" }}>
                Lighter shades auto-derived
              </span>
            </div>
          </div>
        )}

        {/* Footer */}
        <div
          className="px-4 py-2 text-[10px]"
          style={{ borderTop: "1px solid var(--color-border)", color: "var(--color-text-muted)", backgroundColor: "var(--color-bg-secondary)" }}
        >
          Changes save instantly on this device.
        </div>
      </div>
    </div>
  );

  if (!mounted) return null;
  return (
    <>
      {createPortal(trigger, document.body)}
      {createPortal(panel, document.body)}
    </>
  );
}
