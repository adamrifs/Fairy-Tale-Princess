"use client";

import { memo } from "react";
import { StorySection } from "@/components/story/StorySection";
import { Section2Scene } from "./Section2Scene";
import { SECTION2_ID, SECTION2_TEXTS } from "@/data/story/section2";

/**
 * Section 2 — a single continuous frame sequence of ~300 frames in a flat
 * directory (public/sections/section-2/). The Story Engine's standard
 * StorySection handles pinning, text cycling, and transition handoff, and
 * the section transitions straight into the next chapter via StoryTransition.
 *
 * animationVh={300} keeps roughly Section 1's scroll-distance-per-frame
 * feel (Section 1: 600vh / 593 frames) for this half-length sequence, so
 * the scrub reads at the same pace without skipping frames.
 */
export const Section2 = memo(function Section2() {
  return (
    <StorySection id={SECTION2_ID} texts={SECTION2_TEXTS} animationVh={300} textVisibleProgress={0.90}>
      {({ progress }) => <Section2Scene progress={progress} />}
    </StorySection>
  );
});
