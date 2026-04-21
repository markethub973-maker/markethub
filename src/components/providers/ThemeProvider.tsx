"use client";

/**
 * ThemeProvider (User Themes from DB)
 *
 * Wraps the app and loads the user's saved theme from the user_themes table
 * on mount. Applies CSS variables to document.documentElement so the entire
 * app respects the user's customization.
 *
 * This works alongside the existing localStorage-based ThemeProvider —
 * DB themes take priority when available.
 */

import { createContext, useContext, useEffect, useState, useCallback, ReactNode } from "react";

export interface ThemeConfig {
  // Colors
  primary: string;
  primaryHover: string;
  bg: string;
  bgSecondary: string;
  text: string;
  border: string;
  surface: string;
  sidebarBg: string;
  sidebarText: string;
  // Typography
  fontFamily: string;
  fontSize: number; // px
  headingWeight: number;
  // Buttons
  buttonRadius: number; // px
  // Cards
  cardRadius: number; // px
  cardShadow: "none" | "light" | "medium" | "heavy";
}

export const DEFAULT_THEME_CONFIG: ThemeConfig = {
  primary: "#F59E0B",
  primaryHover: "#D97706",
  bg: "#FFFCF7",
  bgSecondary: "#FFFFFF",
  text: "#2D2620",
  border: "#F5D7A0",
  surface: "#FFFFFF",
  sidebarBg: "#1C1814",
  sidebarText: "#FFF8F0",
  fontFamily: "system-ui",
  fontSize: 16,
  headingWeight: 700,
  buttonRadius: 12,
  cardRadius: 16,
  cardShadow: "light",
};

const SHADOW_MAP: Record<string, string> = {
  none: "none",
  light: "0 1px 3px rgba(120,97,78,0.08)",
  medium: "0 4px 12px rgba(120,97,78,0.12)",
  heavy: "0 8px 24px rgba(120,97,78,0.18)",
};

interface UserThemeContextValue {
  config: ThemeConfig;
  setConfig: (c: ThemeConfig) => void;
  saveTheme: (name?: string) => Promise<void>;
  loadTheme: () => Promise<void>;
  isSaving: boolean;
  isLoading: boolean;
}

const UserThemeContext = createContext<UserThemeContextValue | undefined>(undefined);

function applyThemeConfig(config: ThemeConfig) {
  const root = document.documentElement;
  // Colors
  root.style.setProperty("--color-primary", config.primary);
  root.style.setProperty("--color-primary-hover", config.primaryHover);
  root.style.setProperty("--color-bg", config.bg);
  root.style.setProperty("--color-bg-secondary", config.bgSecondary);
  root.style.setProperty("--color-text", config.text);
  root.style.setProperty("--color-border", config.border);
  root.style.setProperty("--color-surface", config.surface);
  // Sidebar — correct variable names
  root.style.setProperty("--color-surface-dark", config.sidebarBg || "#1C1814");
  root.style.setProperty("--color-surface-dark-text", config.sidebarText || "#FFF8F0");
  // Typography
  root.style.setProperty("--font-family-base", config.fontFamily);
  root.style.setProperty("--font-size-base", `${config.fontSize}px`);
  root.style.setProperty("--heading-weight", `${config.headingWeight}`);
  // Elements
  root.style.setProperty("--button-radius", `${config.buttonRadius}px`);
  root.style.setProperty("--card-radius", `${config.cardRadius}px`);
  root.style.setProperty("--card-shadow", SHADOW_MAP[config.cardShadow] || SHADOW_MAP.light);
}

export function UserThemeProvider({ children }: { children: ReactNode }) {
  const [config, setConfigState] = useState<ThemeConfig>(DEFAULT_THEME_CONFIG);
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const loadTheme = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/theme");
      if (res.ok) {
        const { theme } = await res.json();
        if (theme?.config) {
          const merged = { ...DEFAULT_THEME_CONFIG, ...theme.config };
          setConfigState(merged);
          applyThemeConfig(merged);
        }
      }
    } catch {
      // Silently fail — use defaults
    } finally {
      setIsLoading(false);
    }
  }, []);

  const saveTheme = useCallback(async (name?: string) => {
    setIsSaving(true);
    try {
      await fetch("/api/theme", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ theme_name: name || "Custom Theme", config }),
      });
    } catch {
      // Silently fail
    } finally {
      setIsSaving(false);
    }
  }, [config]);

  const setConfig = useCallback((c: ThemeConfig) => {
    setConfigState(c);
    applyThemeConfig(c);
  }, []);

  // Load on mount
  useEffect(() => {
    loadTheme();
  }, [loadTheme]);

  return (
    <UserThemeContext.Provider value={{ config, setConfig, saveTheme, loadTheme, isSaving, isLoading }}>
      {children}
    </UserThemeContext.Provider>
  );
}

export function useUserTheme() {
  const ctx = useContext(UserThemeContext);
  if (!ctx) throw new Error("useUserTheme must be used inside <UserThemeProvider>");
  return ctx;
}
