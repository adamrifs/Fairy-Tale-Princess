"use client";

import { memo, useRef } from "react";
import { gsap } from "@/lib/gsap";
import { useGSAP } from "@/hooks/useGSAP";
import { useAnimationContext } from "@/providers/AnimationProvider";
import { DURATION, EASE } from "@/constants";
import { cn } from "@/utils";

/**
 * Plays the section-to-section crossfade: fades + scales in once on
 * mount (opacity 0->1, scale 1.03->1), then fades + scales out when
 * `active` flips true (StorySection sets this once its text phase's
 * ScrollTrigger leaves) — opacity 1->0, scale 1->1.03. Only transform and
 * opacity are ever animated, so this stays on the GPU compositor.
 *
 * Reactive to a plain boolean prop rather than an imperative ref API,
 * since it only fires a couple of times per section's whole lifetime.
 */
export const StoryTransition = memo(function StoryTransition({ active = false, className, children }) {
  const ref = useRef(null);

  // Transitions removed per request: no GSAP animations on enter or exit.
  
  return (
    <div ref={ref} className={cn("h-full w-full", className)}>
      {children}
    </div>
  );
});
