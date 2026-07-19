import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

let isRegistered = false;

/**
 * Registers GSAP plugins exactly once for the lifetime of the app.
 * Safe to call from multiple components — subsequent calls are no-ops.
 * Must only run in the browser: gsap.registerPlugin touches the DOM.
 */
export function registerGsap() {
  if (isRegistered || typeof window === "undefined") {
    return gsap;
  }

  gsap.registerPlugin(ScrollTrigger);
  isRegistered = true;

  return gsap;
}

export { gsap, ScrollTrigger };
