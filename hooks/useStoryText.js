"use client";

import { useStory } from "./useStory";

/**
 * Resolves which of `texts` is active for the current section's text-phase
 * progress — a pure lookup, no animation logic (the <StoryText>
 * component owns the GSAP crossfade). Useful for a custom scene that
 * wants the active text's content without rendering <StoryText> itself.
 */
export function useStoryText(texts = []) {
  const { currentStoryIndex } = useStory();
  const activeIndex = Math.min(Math.max(currentStoryIndex, 0), Math.max(texts.length - 1, 0));

  return {
    activeIndex,
    activeText: texts[activeIndex] ?? null,
    texts,
  };
}
