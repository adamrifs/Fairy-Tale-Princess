"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { registerGsap } from "@/lib/gsap";
import { MEDIA_QUERIES } from "@/constants";

const AnimationContext = createContext(null);

/**
 * Registers GSAP plugins exactly once for the app and tracks the user's
 * reduced-motion preference so every future scene can gate its animations
 * off a single shared flag instead of each querying matchMedia itself.
 */
export function AnimationProvider({ children }) {
  const [reducedMotion, setReducedMotion] = useState(false);

  useEffect(() => {
    registerGsap();

    const mediaQuery = window.matchMedia(MEDIA_QUERIES.reducedMotion);
    setReducedMotion(mediaQuery.matches);

    const handleChange = (event) => setReducedMotion(event.matches);
    mediaQuery.addEventListener("change", handleChange);
    return () => mediaQuery.removeEventListener("change", handleChange);
  }, []);

  const value = useMemo(() => ({ reducedMotion }), [reducedMotion]);

  return <AnimationContext.Provider value={value}>{children}</AnimationContext.Provider>;
}

export function useAnimationContext() {
  const context = useContext(AnimationContext);
  if (!context) {
    throw new Error("useAnimationContext must be used within an AnimationProvider");
  }
  return context;
}
