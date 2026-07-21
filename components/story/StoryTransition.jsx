"use client";

import { memo, useEffect, useRef } from "react";
import { gsap } from "@/lib/gsap";
import { useAnimationContext } from "@/providers/AnimationProvider";
import { DURATION, EASE } from "@/constants";
import { cn } from "@/utils";

/**
 * Plays the section-to-section crossfade.
 *
 * The outgoing section fades + scales out when `active` flips true (opacity
 * 1->0, scale 1->1.03), which StorySection sets once its text phase's
 * ScrollTrigger leaves — DURATION.transition (1s) on EASE.standard
 * (power2.out), spec-exact. The incoming section is simply present at
 * opacity 1 (the "next section opacity 0->1" half of the spec): because
 * every StorySection mounts up front (they all render into the page at
 * load, positioned by scroll), an incoming section has always finished
 * mounting long before it's scrolled into view, so its arrival reads as it
 * settling under the outgoing section's dissolve rather than as a fade that
 * has to be replayed at the boundary.
 *
 * The resting opacity is 1 and there is no enter tween that starts from
 * opacity 0. That is deliberate and load-bearing: this component wraps
 * EVERY section, and an enter animation that renders an opacity-0 from-state
 * can strand a section invisible if its tween is ever restarted or torn down
 * mid-flight (observed as section content flickering to blank while the
 * user scrolls through it, and as a permanent blank under reduced motion
 * where GSAP's ticker isn't being driven). Keeping the base state visible
 * makes blanking impossible regardless of scroll/mount churn.
 *
 * Only transform and opacity are ever animated, so this stays on the GPU
 * compositor. The next section is always painted opaque beneath the outgoing
 * one during the handoff, so the fade never exposes the page background —
 * no white flash, no dark frame. Honors prefers-reduced-motion by snapping
 * straight to the end state instead of tweening.
 */
export const StoryTransition = memo(function StoryTransition({ active = false, className, children }) {
  const ref = useRef(null);
  const { reducedMotion } = useAnimationContext();

  // Exit: fade + scale out when `active` flips true (opacity 1->0, scale 1->1.03).
  // When it flips back false (scrolling up, re-entering the section), restore
  // the resting visible state so the section is never left dimmed.
  useEffect(() => {
    const node = ref.current;
    if (!node) return undefined;

    if (!active) {
      gsap.set(node, { opacity: 1, scale: 1 });
      return undefined;
    }

    if (reducedMotion) {
      gsap.set(node, { opacity: 0, scale: 1.03 });
      return undefined;
    }

    const tween = gsap.to(node, {
      opacity: 0,
      scale: 1.03,
      duration: DURATION.transition,
      ease: EASE.standard,
    });
    return () => tween.kill();
  }, [active, reducedMotion]);

  return (
    <div ref={ref} className={cn("h-full w-full", className)} style={{ willChange: "opacity, transform" }}>
      {children}
    </div>
  );
});
