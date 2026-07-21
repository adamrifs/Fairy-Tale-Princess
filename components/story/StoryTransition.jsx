"use client";

import { memo, useEffect, useRef } from "react";
import { gsap } from "@/lib/gsap";
import { useAnimationContext } from "@/providers/AnimationProvider";
import { cn } from "@/utils";

/**
 * Plays a cinematic slow smooth black fade for section transitions.
 *
 * When `active` is true (outgoing section), the black overlay smoothly fades from opacity 0 -> 1 (fade to black).
 * When `isActive` is true for the first time (section start), the black overlay smoothly fades from opacity 1 -> 0 (fade from black).
 */
export const StoryTransition = memo(function StoryTransition({
  active = false, // Outgoing section: fade TO black
  isActive = false, // Current section active state: fade FROM black on start
  className,
  children,
}) {
  const contentRef = useRef(null);
  const overlayRef = useRef(null);
  const hasFadedInRef = useRef(false);
  const { reducedMotion } = useAnimationContext();

  useEffect(() => {
    const overlay = overlayRef.current;
    if (!overlay) return undefined;

    if (reducedMotion) {
      gsap.set(overlay, { opacity: active ? 1 : 0 });
      return undefined;
    }

    // 1. Outgoing Section: Fade TO BLACK when section transition starts
    if (active) {
      hasFadedInRef.current = false;
      const tween = gsap.fromTo(
        overlay,
        { opacity: 0 },
        {
          opacity: 1,
          duration: 1.4,
          ease: "power2.inOut",
        }
      );
      return () => tween.kill();
    }

    // 2. Incoming / Starting Section: Fade FROM BLACK when section becomes active
    if (isActive && !hasFadedInRef.current) {
      hasFadedInRef.current = true;
      const tween = gsap.fromTo(
        overlay,
        { opacity: 1 },
        {
          opacity: 0,
          duration: 1.4,
          ease: "power2.inOut",
        }
      );
      return () => tween.kill();
    }

    // 3. Reset fade state when section is inactive
    if (!isActive && !active) {
      hasFadedInRef.current = false;
      gsap.set(overlay, { opacity: 0 });
    }

    return undefined;
  }, [active, isActive, reducedMotion]);

  return (
    <div ref={contentRef} className={cn("relative h-full w-full", className)}>
      {children}
      {/* Black curtain overlay for cinematic transition */}
      <div
        ref={overlayRef}
        className="pointer-events-none absolute inset-0 z-50 bg-black opacity-0"
        style={{ willChange: "opacity" }}
      />
    </div>
  );
});
