"use client";

import { memo } from "react";
import { useStory } from "@/hooks/useStory";
import { useTransition } from "@/hooks/useTransition";
import { cn } from "@/utils";

/**
 * Minimal vertical dot indicator for which chapter is active. Reads
 * useStory() for the registered section list (populated automatically as
 * <StorySection>s mount) and reuses useTransition()'s goToSection for
 * click-to-jump, rather than re-implementing the Lenis scroll logic here.
 * Renders nothing until at least one section has registered.
 */
export const StoryProgress = memo(function StoryProgress({ className }) {
  const { sections, currentSection } = useStory();
  const { goToSection } = useTransition();

  if (sections.length === 0) return null;

  return (
    <nav
      aria-label="Story progress"
      className={cn(
        "fixed right-6 top-1/2 z-[var(--z-navigation)] hidden -translate-y-1/2 flex-col items-center gap-3 md:flex",
        className
      )}
    >
      {sections.map((section) => {
        const isActive = section.id === currentSection;
        return (
          <button
            key={section.id}
            type="button"
            aria-label={`Go to ${section.id}`}
            aria-current={isActive}
            onClick={() => goToSection(section.id)}
            className={cn(
              "h-2 w-2 rounded-full border border-moon-white/50 transition-transform duration-300",
              isActive ? "scale-125 border-royal-gold bg-royal-gold" : "bg-transparent hover:bg-moon-white/30"
            )}
          />
        );
      })}
    </nav>
  );
});
