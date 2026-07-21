"use client";

import { memo } from "react";
import { StorySection } from "@/components/story/StorySection";
import { Section3Scene } from "./Section3Scene";
import { SECTION3_ID, SECTION3_TEXTS } from "@/data/story/section3";

/**
 * Section 3 — a single continuous frame sequence of ~300 frames in a flat
 * directory (public/sections/section-3/). The Story Engine's standard
 * StorySection handles pinning, text cycling, and transition handoff, and
 * the section transitions straight into the next chapter via StoryTransition.
 *
 * animationVh={300} matches Section 2's scroll-distance-per-frame feel for
 * this equal-length (300-frame) sequence, so the scrub reads at the same pace
 * without skipping frames.
 */
export const Section3 = memo(function Section3() {
  return (
    <StorySection id={SECTION3_ID} texts={SECTION3_TEXTS} animationVh={300} textVisibleProgress={0.90}>
      {({ progress }) => <Section3Scene progress={progress} />}
    </StorySection>
  );
});
