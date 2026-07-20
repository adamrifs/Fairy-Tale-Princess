"use client";

import { memo } from "react";
import { StorySection } from "@/components/story/StorySection";
import { Section1Scene } from "./Section1Scene";
import { SECTION1_ID, SECTION1_TEXTS } from "@/data/story/section1";

/**
 * Section 1 — a single continuous frame sequence of 1185 frames in a flat
 * directory (public/sections/section-1/). The Story Engine's standard
 * StorySection handles pinning, text cycling, and transition handoff.
 *
 * animationVh={600} keeps enough scroll distance to scrub through 1185 frames
 * smoothly without skipping, same as before.
 */
export const Section1 = memo(function Section1() {
  return (
    <StorySection id={SECTION1_ID} texts={SECTION1_TEXTS} animationVh={600} textVisibleProgress={0.90}>
      {({ progress }) => <Section1Scene progress={progress} />}
    </StorySection>
  );
});
