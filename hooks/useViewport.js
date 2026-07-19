"use client";

import { useMemo } from "react";
import { useResize } from "./useResize";
import { BREAKPOINTS } from "@/constants";

/** Derives the active breakpoint name and device-class flags from window size. */
export function useViewport() {
  const { width, height } = useResize();

  const breakpoint = useMemo(() => {
    if (width >= BREAKPOINTS.ultrawide) return "ultrawide";
    if (width >= BREAKPOINTS.desktop) return "desktop";
    if (width >= BREAKPOINTS.laptop) return "laptop";
    if (width >= BREAKPOINTS.tablet) return "tablet";
    return "mobile";
  }, [width]);

  return {
    width,
    height,
    breakpoint,
    isMobile: breakpoint === "mobile",
    isTablet: breakpoint === "tablet",
    isDesktop: breakpoint === "desktop" || breakpoint === "ultrawide",
  };
}
