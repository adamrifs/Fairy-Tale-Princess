"use client";

import { memo } from "react";
import { StorySection } from "@/components/story/StorySection";
import { Section4Scene } from "./Section4Scene";
import { SECTION4_ID, SECTION4_TEXTS } from "@/data/story/section4";

export const Section4 = memo(function Section4() {
  return (
    <StorySection 
      id={SECTION4_ID} 
      texts={SECTION4_TEXTS} 
      animationVh={150} 
      textVisibleProgress={0.90}
      isFinale={true}
    >
      {(props) => <Section4Scene {...props} />}
    </StorySection>
  );
});
