"use client";

import { createContext, useContext, useMemo } from "react";
import { COLORS, FONT_FAMILIES } from "@/constants";

const ThemeContext = createContext(null);

/** Exposes the theme token constants through context so components can read them without re-importing constants everywhere. */
export function ThemeProvider({ children }) {
  const value = useMemo(() => ({ colors: COLORS, fonts: FONT_FAMILIES }), []);

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useThemeContext() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error("useThemeContext must be used within a ThemeProvider");
  }
  return context;
}
