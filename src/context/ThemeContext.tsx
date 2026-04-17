"use client";

import {
  createContext,
  useContext,
  useState,
  useEffect,
  type ReactNode,
} from "react";
import {
  type ThemeConfig,
  THEMES,
  DEFAULT_THEME,
  applyThemeToDOM,
  loadSavedTheme,
  saveTheme,
} from "@/lib/theme";

interface ThemeContextValue {
  theme: ThemeConfig;
  setTheme: (t: ThemeConfig) => void;
  themes: ThemeConfig[];
}

const ThemeCtx = createContext<ThemeContextValue>({
  theme: DEFAULT_THEME,
  setTheme: () => {},
  themes: THEMES,
});

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<ThemeConfig>(DEFAULT_THEME);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const saved = loadSavedTheme();
    setThemeState(saved);
    applyThemeToDOM(saved);
    setMounted(true);
  }, []);

  const setTheme = (t: ThemeConfig) => {
    setThemeState(t);
    saveTheme(t);
    applyThemeToDOM(t);
  };

  // Prevent flash of wrong theme before hydration
  if (!mounted) {
    return (
      <ThemeCtx.Provider value={{ theme, setTheme, themes: THEMES }}>
        {children}
      </ThemeCtx.Provider>
    );
  }

  return (
    <ThemeCtx.Provider value={{ theme, setTheme, themes: THEMES }}>
      {children}
    </ThemeCtx.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeCtx);
}
