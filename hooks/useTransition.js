"use client";

import { useCallback } from "react";
import { useStory } from "./useStory";
import { useLenis } from "./useLenis";

/**
 * Reactive transition state plus an imperative helper to jump the story to
 * another section — smooth-scrolls there via Lenis (native scrollIntoView
 * fallback for reduced-motion users, where Lenis is disabled); the
 * target's own StorySection ScrollTrigger takes over state from there.
 *
 * Named to match the Story Engine spec; distinct from React's built-in
 * useTransition (concurrent rendering) — import from "@/hooks", not "react".
 */
export function useTransition() {
  const { isTransitioning, currentSection, nextSection, previousSection } = useStory();
  const lenis = useLenis();

  const goToSection = useCallback(
    (sectionId) => {
      const target = document.getElementById(sectionId);
      if (!target) return;

      if (lenis) {
        lenis.scrollTo(target, { offset: 0 });
      } else {
        target.scrollIntoView({ behavior: "smooth" });
      }
    },
    [lenis]
  );

  return {
    isTransitioning,
    currentSection,
    nextSection,
    previousSection,
    goToSection,
    goToNext: () => nextSection && goToSection(nextSection),
    goToPrevious: () => previousSection && goToSection(previousSection),
  };
}
