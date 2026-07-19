"use client";

import { useRef } from "react";
import { ScrollTrigger } from "@/lib/gsap";
import { useGSAP } from "./useGSAP";

/**
 * Generic scroll-scrubbed ScrollTrigger, optionally pinned. This is the
 * one place ScrollTrigger.create() gets called for the Story Engine —
 * StorySection uses it twice (once unpinned for the animation phase,
 * once pinned for the text phase) instead of hand-rolling two near-
 * identical trigger setups.
 *
 * `getDistance` is called fresh on every refresh (resize-safe). `end` is
 * always computed as `self.start + getDistance()` so a caller can chain
 * triggers back-to-back by passing a previous trigger's `.end` as `start`.
 *
 * `enabled` (default true) gates whether the ScrollTrigger is created at
 * all — needed because GSAP inserts a `.pin-spacer` wrapper around the
 * pinned element the moment a `pin: true` trigger is *created*, even
 * before its active range is ever entered, even with `pinSpacing: false`.
 * That spacer is exactly one viewport tall, which collapses any sibling/
 * earlier CSS `position: sticky` phase's containing block to zero extra
 * room to stick in (sticky needs its containing block taller than
 * itself to have anywhere to travel). So a pinned trigger that's meant
 * to take over *after* an earlier unpinned/sticky phase must not be
 * created until that earlier phase has actually finished — pass
 * `enabled: false` until then, flipping true from the earlier phase's
 * onLeave (and back to false on its onEnterBack, so scrolling back up
 * tears the pin-spacer back down and restores the earlier phase's room
 * to stick).
 *
 * Cleanup (killing the ScrollTrigger on unmount/dependency change,
 * including `enabled` flipping false) is inherited from useGSAP's
 * gsap.context revert — no manual kill needed.
 */
export function usePinnedSection({
  triggerRef,
  pinRef,
  start = "top top",
  getDistance,
  pin = true,
  pinSpacing = false,
  scrub = true,
  enabled = true,
  onUpdate,
  onEnter,
  onEnterBack,
  onLeave,
  onLeaveBack,
  dependencies = [],
}) {
  const scrollTriggerRef = useRef(null);

  useGSAP(
    () => {
      const trigger = triggerRef.current;
      if (!trigger || !enabled) return;

      scrollTriggerRef.current = ScrollTrigger.create({
        trigger,
        start,
        end: (self) => self.start + getDistance(),
        scrub,
        pin: pin ? (pinRef?.current ?? trigger) : false,
        pinSpacing,
        onUpdate,
        onEnter,
        onEnterBack,
        onLeave,
        onLeaveBack,
      });
    },
    { scope: triggerRef, dependencies: [...dependencies, enabled] }
  );

  return scrollTriggerRef;
}
