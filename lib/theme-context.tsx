"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

export type AppTheme = "light" | "dark";

const STORAGE_KEY = "hg_app_theme";

type ThemeState = {
  theme: AppTheme;
  toggleTheme: () => void;
};

const ThemeContext = createContext<ThemeState | null>(null);

function readStored(): AppTheme {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw === "dark" || raw === "light") return raw;
  } catch {
    /* ignore */
  }
  return "light";
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useState<AppTheme>("light");

  useEffect(() => {
    setTheme(readStored());
  }, []);

  useEffect(() => {
    document.documentElement.setAttribute("data-app-theme", theme);
    try {
      localStorage.setItem(STORAGE_KEY, theme);
    } catch {
      /* ignore */
    }
  }, [theme]);

  return (
    <ThemeContext.Provider
      value={{
        theme,
        toggleTheme: () => setTheme((t) => (t === "light" ? "dark" : "light")),
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme(): ThemeState {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used within ThemeProvider");
  return ctx;
}
