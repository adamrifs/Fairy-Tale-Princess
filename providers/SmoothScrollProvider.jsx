"use client";

import { createContext, useContext, useEffect, useState } from "react";
import Lenis from "lenis";
import { registerGsap, gsap, ScrollTrigger } from "@/lib/gsap";
import { LENIS_CONFIG } from "@/constants";
import { prefersReducedMotion } from "@/utils";

const LenisContext = createContext(null);

/**
 * Owns the single Lenis instance for the entire app and drives it from
 * GSAP's ticker so scroll-driven ScrollTrigger animations and Lenis's
 * eased scroll position never fall out of sync (the #1 cause of jitter
 * when mixing the two libraries).
 *
 * Users with prefers-reduced-motion get native scroll instead — Lenis's
 * eased momentum is exactly the kind of motion that setting asks to skip.
 */
export function SmoothScrollProvider({ children }) {
  const [lenis, setLenis] = useState(null);

  useEffect(() => {
    registerGsap();

    if (prefersReducedMotion()) {
      return undefined;
    }

    const instance = new Lenis(LENIS_CONFIG);
    setLenis(instance);

    instance.on("scroll", ScrollTrigger.update);

    const tickerCallback = (time) => {
      instance.raf(time * 1000);
    };
    gsap.ticker.add(tickerCallback);
    gsap.ticker.lagSmoothing(0);

    const handleResize = () => {
      instance.resize();
      ScrollTrigger.refresh();
    };
    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("resize", handleResize);
      gsap.ticker.remove(tickerCallback);
      instance.destroy();
      setLenis(null);
    };
  }, []);

  return <LenisContext.Provider value={lenis}>{children}</LenisContext.Provider>;
}

export function useLenisContext() {
  return useContext(LenisContext);
}
