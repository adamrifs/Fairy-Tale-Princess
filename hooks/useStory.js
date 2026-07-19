"use client";

import { useStoryContext } from "@/providers/StoryProvider";

/** Exposes the full story snapshot (currentSection, phase, scrollProgress, ...) plus SceneManager's write methods. */
export function useStory() {
  return useStoryContext();
}
