"use client";

/**
 * MarketHub Pro Theme System
 *
 * 4 preset themes (amber default, emerald, indigo, mono) + a fully
 * customizable theme where the user picks their own primary + accent
 * colors. All themes set CSS variables on <html> so any component
 * using `var(--color-primary)` / `bg-primary` / `btn-primary` etc.
 * updates instantly without re-render.
 *
 * Storage: localStorage `markethub-theme` (preset id) + `markethub-custom-colors`
 * (JSON {primary, accent}) when the user goes custom.
 */

import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  ReactNode,
} from "react";

export type ThemeId = "amber" | "emerald" | "indigo" | "mono" | "custom";

export interface CustomColors {
  primary: string;   // hex — brand color (buttons, accents, CTAs)
  accent: string;    // hex — secondary highlight (badges, links)
  bg: string;        // hex — main page background
  surface: string;   // hex — cards / secondary panel surface
  text: string;      // hex — main text color
  sidebar: string;   // hex — sidebar background color
}

export interface ThemePreset {
  id: ThemeId;
  label: string;
  primary: string;
  accent: string;
  isCustom?: boolean;
}

export const THEMES: ThemePreset[] = [
  { id: "amber",   label: "Amber",          primary: "#F59E0B", accent: "#EC8054" },
  { id: "emerald", label: "Emerald + Pink", primary: "#10B981", accent: "#F472B6" },
  { id: "indigo",  label: "Indigo + Coral", primary: "#818CF8", accent: "#FB923C" },
  { id: "mono",    label: "Mono + Lime",    primary: "#404040", accent: "#84CC16" },
  { id: "custom",  label: "Custom…",        primary: "#F59E0B", accent: "#EC8054", isCustom: true },
];

interface ThemeContextValue {
  theme: ThemeId;
  customColors: CustomColors;
  setTheme: (t: ThemeId) => void;
  setCustomColors: (c: CustomColors) => void;
  resetToPreset: (t: Exclude<ThemeId, "custom">) => void;
}

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

const STORAGE_KEY = "markethub-theme";
const CUSTOM_KEY = "markethub-custom-colors";
const DEFAULT_CUSTOM: CustomColors = {
  primary: "#F59E0B",
  accent: "#EC8054",
  bg: "#FFFCF7",
  surface: "#FFFFFF",
  text: "#2D2620",
  sidebar: "#1C1814",
};

// ── helpers ────────────────────────────────────────────────────────────────
function isValidHex(c: string): boolean {
  return /^#[0-9A-Fa-f]{6}$/.test(c);
}
function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  if (!isValidHex(hex)) return null;
  return {
    r: parseInt(hex.slice(1, 3), 16),
    g: parseInt(hex.slice(3, 5), 16),
    b: parseInt(hex.slice(5, 7), 16),
  };
}
function rgba(hex: string, alpha: number): string {
  const c = hexToRgb(hex);
  if (!c) return hex;
  return `rgba(${c.r}, ${c.g}, ${c.b}, ${alpha})`;
}
/** Darken a hex by % (rough — for hover state). */
function darken(hex: string, pct = 15): string {
  const c = hexToRgb(hex);
  if (!c) return hex;
  const f = (1 - pct / 100);
  const ch = (n: number) => Math.max(0, Math.min(255, Math.round(n * f)));
  const toHex = (n: number) => n.toString(16).padStart(2, "0");
  return `#${toHex(ch(c.r))}${toHex(ch(c.g))}${toHex(ch(c.b))}`;
}

/** Apply custom colors to <html> by overriding CSS vars at runtime. */
function applyCustomColors(colors: CustomColors) {
  const root = document.documentElement;
  if (!isValidHex(colors.primary) || !isValidHex(colors.accent)) return;
  const bg = isValidHex(colors.bg) ? colors.bg : "#FFFCF7";
  const surface = isValidHex(colors.surface) ? colors.surface : "#FFFFFF";
  root.setAttribute("data-theme", "custom");
  // Primary
  root.style.setProperty("--color-primary", colors.primary);
  root.style.setProperty("--color-primary-hover", darken(colors.primary, 12));
  root.style.setProperty("--color-primary-light", rgba(colors.primary, 0.10));
  root.style.setProperty("--color-primary-dark", darken(colors.primary, 35));
  // Accent
  root.style.setProperty("--color-accent", colors.accent);
  root.style.setProperty("--color-accent-hover", darken(colors.accent, 12));
  root.style.setProperty("--color-accent-light", rgba(colors.accent, 0.10));
  root.style.setProperty("--color-accent-dark", darken(colors.accent, 35));
  // Backgrounds — user-picked
  root.style.setProperty("--color-bg", bg);
  root.style.setProperty("--color-bg-secondary", surface);
  root.style.setProperty("--color-bg-tertiary", darken(surface, 5));
  // Borders — derived from primary at low alpha so they harmonize
  root.style.setProperty("--color-border", rgba(colors.primary, 0.15));
  root.style.setProperty("--color-border-hover", rgba(colors.primary, 0.30));
  // Text — user-picked or derived
  const textColor = isValidHex(colors.text) ? colors.text : "#2D2620";
  root.style.setProperty("--color-text", textColor);
  root.style.setProperty("--color-text-secondary", rgba(textColor, 0.65));
  root.style.setProperty("--color-text-muted", rgba(textColor, 0.4));
  // Sidebar / dark surface — user-picked or derived from primary
  const sidebarColor = isValidHex(colors.sidebar) ? colors.sidebar : darken(colors.primary, 70);
  root.style.setProperty("--color-surface-dark", sidebarColor);
  root.style.setProperty("--color-surface-dark-secondary", darken(sidebarColor, -15));
  root.style.setProperty("--color-surface-dark-text", "#FFFCF7");
  root.style.setProperty("--color-surface-dark-text-muted", rgba(colors.primary, 0.55));
  root.style.setProperty("--color-surface-dark-text-dim", rgba(colors.primary, 0.35));
  root.style.setProperty("--color-surface-dark-border", rgba(colors.primary, 0.15));
}

/** Clear inline overrides — preset CSS class kicks back in. */
function clearCustomColors() {
  const root = document.documentElement;
  ["--color-primary", "--color-primary-hover", "--color-primary-light", "--color-primary-dark",
   "--color-bg", "--color-bg-secondary", "--color-bg-tertiary",
   "--color-surface-dark", "--color-surface-dark-secondary", "--color-surface-dark-text",
   "--color-surface-dark-text-muted", "--color-surface-dark-text-dim", "--color-surface-dark-border",
   "--color-accent", "--color-accent-hover", "--color-accent-light", "--color-accent-dark",
   "--color-border", "--color-border-hover"].forEach((v) => root.style.removeProperty(v));
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<ThemeId>("amber");
  const [customColors, setCustomColorsState] = useState<CustomColors>(DEFAULT_CUSTOM);

  // Hydrate from storage on mount
  useEffect(() => {
    try {
      const saved = (localStorage.getItem(STORAGE_KEY) ?? "amber") as ThemeId;
      const customRaw = localStorage.getItem(CUSTOM_KEY);
      const parsed = customRaw ? JSON.parse(customRaw) : {};
      // Merge with defaults — older users (pre-v2) only had {primary, accent}
      const custom: CustomColors = { ...DEFAULT_CUSTOM, ...parsed };
      if (custom.primary && custom.accent) setCustomColorsState(custom);
      const valid: ThemeId[] = ["amber", "emerald", "indigo", "mono", "custom"];
      const t = valid.includes(saved) ? saved : "amber";
      setThemeState(t);
      if (t === "custom") {
        applyCustomColors(custom);
      } else {
        clearCustomColors();
        document.documentElement.setAttribute("data-theme", t);
      }
    } catch { /* localStorage blocked */ }
  }, []);

  const setTheme = useCallback((t: ThemeId) => {
    setThemeState(t);
    try { localStorage.setItem(STORAGE_KEY, t); } catch { /* noop */ }
    if (t === "custom") {
      applyCustomColors(customColors);
    } else {
      clearCustomColors();
      document.documentElement.setAttribute("data-theme", t);
    }
  }, [customColors]);

  const setCustomColors = useCallback((c: CustomColors) => {
    setCustomColorsState(c);
    try { localStorage.setItem(CUSTOM_KEY, JSON.stringify(c)); } catch { /* noop */ }
    if (theme === "custom") {
      applyCustomColors(c);
    }
  }, [theme]);

  const resetToPreset = useCallback((t: Exclude<ThemeId, "custom">) => {
    setTheme(t);
  }, [setTheme]);

  return (
    <ThemeContext.Provider value={{ theme, customColors, setTheme, setCustomColors, resetToPreset }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used inside <ThemeProvider>");
  return ctx;
}
