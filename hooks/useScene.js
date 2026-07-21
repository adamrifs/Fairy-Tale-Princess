"use client";

import { useStory } from "./useStory";
import { STORY_PHASE } from "@/lib/story/SceneManager";

/**
 * Convenience slice of useStory() scoped to one section — returns its own
 * phase/frame/text/pin state without the caller comparing ids itself.
 * A section that isn't current reports inert defaults, since only one
 * section is ever active at a time.
 */
export function useScene(sectionId) {
  const story = useStory();
  const isActive = story.currentSection === sectionId;

  return {
    isActive,
    phase: isActive ? story.phase : STORY_PHASE.IDLE,
    isAnimating: isActive && story.phase === STORY_PHASE.ANIMATING,
    isPinned: isActive && story.isPinned,
    // Scoped by id, NOT gated on isActive: the section that's leaving stays
    // the one crossfading out even after the next section has become current.
    isTransitioning: story.transitioningSection === sectionId,
    animationProgress: isActive ? story.animationProgress : 0,
    frame: isActive ? story.currentFrame : 0,
    storyIndex: isActive ? story.currentStoryIndex : 0,
  };
}
