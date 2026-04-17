/**
 * Liquid Glass Design System — Theme configuration.
 *
 * 5 preset themes + user-customizable accent/blob overrides.
 * ThemeContext injects CSS variables into :root at runtime so every
 * glass component and utility class adapts automatically.
 */

export type ThemeConfig = {
  name: string;
  bg1: string;        // darkest bg
  bg2: string;        // mid bg
  bg3: string;        // lightest bg
  accent: string;     // primary accent color
  accentGlow: string; // rgba version for shadows/glows
  blob1: string;      // top-left ambient glow
  blob2: string;      // bottom-right ambient glow
  blob3: string;      // center ambient glow
};

export const THEMES: ThemeConfig[] = [
  {
    name: "Amber Night",
    bg1: "#0d0b1e",
    bg2: "#1a0a2e",
    bg3: "#0a1628",
    accent: "#f59e0b",
    accentGlow: "rgba(245,158,11,0.2)",
    blob1: "rgba(168,85,247,0.2)",
    blob2: "rgba(245,158,11,0.18)",
    blob3: "rgba(16,185,129,0.1)",
  },
  {
    name: "Ocean Blue",
    bg1: "#020817",
    bg2: "#0a1628",
    bg3: "#0d1f35",
    accent: "#3b82f6",
    accentGlow: "rgba(59,130,246,0.2)",
    blob1: "rgba(59,130,246,0.2)",
    blob2: "rgba(99,102,241,0.15)",
    blob3: "rgba(16,185,129,0.1)",
  },
  {
    name: "Rose Gold",
    bg1: "#1a0a12",
    bg2: "#2d0f1f",
    bg3: "#1f0d18",
    accent: "#f43f5e",
    accentGlow: "rgba(244,63,94,0.2)",
    blob1: "rgba(244,63,94,0.2)",
    blob2: "rgba(251,113,133,0.15)",
    blob3: "rgba(245,158,11,0.1)",
  },
  {
    name: "Emerald",
    bg1: "#021712",
    bg2: "#042820",
    bg3: "#031a14",
    accent: "#10b981",
    accentGlow: "rgba(16,185,129,0.2)",
    blob1: "rgba(16,185,129,0.2)",
    blob2: "rgba(5,150,105,0.15)",
    blob3: "rgba(99,102,241,0.1)",
  },
  {
    name: "Arctic White",
    bg1: "#f0f4f8",
    bg2: "#e2e8f0",
    bg3: "#f8fafc",
    accent: "#6366f1",
    accentGlow: "rgba(99,102,241,0.15)",
    blob1: "rgba(99,102,241,0.1)",
    blob2: "rgba(245,158,11,0.08)",
    blob3: "rgba(16,185,129,0.07)",
  },
];

export const DEFAULT_THEME = THEMES[0]; // Amber Night

/**
 * Injects theme CSS variables into :root. Called by ThemeContext on
 * mount and on theme change.
 */
export function applyThemeToDOM(theme: ThemeConfig): void {
  const root = document.documentElement;
  root.style.setProperty("--bg1", theme.bg1);
  root.style.setProperty("--bg2", theme.bg2);
  root.style.setProperty("--bg3", theme.bg3);
  root.style.setProperty("--accent", theme.accent);
  root.style.setProperty("--accent-glow", theme.accentGlow);
  root.style.setProperty("--blob1", theme.blob1);
  root.style.setProperty("--blob2", theme.blob2);
  root.style.setProperty("--blob3", theme.blob3);

  // Detect if theme is "light" (Arctic White) to flip text colors
  const isLight = isLightTheme(theme);
  root.setAttribute("data-theme-mode", isLight ? "light" : "dark");
}

export function isLightTheme(theme: ThemeConfig): boolean {
  // Simple heuristic: if bg1 hex starts with high value, it's light
  const r = parseInt(theme.bg1.slice(1, 3), 16);
  return r > 128;
}

const STORAGE_KEY = "mhp-theme";

export function loadSavedTheme(): ThemeConfig {
  if (typeof window === "undefined") return DEFAULT_THEME;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_THEME;
    const parsed = JSON.parse(raw) as ThemeConfig;
    if (parsed.name && parsed.bg1 && parsed.accent) return parsed;
    return DEFAULT_THEME;
  } catch {
    return DEFAULT_THEME;
  }
}

export function saveTheme(theme: ThemeConfig): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(theme));
  } catch { /* quota exceeded — ignore */ }
}
