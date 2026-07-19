"use client";

import { useLenisContext } from "@/providers/SmoothScrollProvider";

/** Returns the shared Lenis instance, or null when smooth scroll is disabled (reduced motion) or not yet mounted. */
export function useLenis() {
  return useLenisContext();
}
