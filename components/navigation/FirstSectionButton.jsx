"use client";

import { memo, useEffect, useState } from "react";
import { useLenis } from "@/hooks/useLenis";
import { cn } from "@/utils";

/**
 * Floating button on the bottom-left to jump back to the very first section/video.
 * Fades in once the user begins scrolling down into the story.
 */
export const FirstSectionButton = memo(function FirstSectionButton({ className }) {
  const lenis = useLenis();
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsVisible(window.scrollY > 200);
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    handleScroll();

    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const handleReturnToFirstSection = () => {
    const section1 = document.getElementById("section-1");
    if (section1) {
      if (lenis) {
        lenis.scrollTo(section1, { offset: 0 });
      } else {
        section1.scrollIntoView({ behavior: "smooth" });
      }
    } else {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  return (
    <div
      className={cn(
        "fixed bottom-6 left-6 z-[var(--z-audio-controls)] transition-all duration-700",
        isVisible ? "opacity-100 translate-y-0 pointer-events-auto" : "opacity-0 translate-y-4 pointer-events-none",
        className
      )}
    >
      <button
        type="button"
        onClick={handleReturnToFirstSection}
        aria-label="Go to first section"
        title="Return to first section"
        className="group flex h-12 items-center gap-2 rounded-full bg-midnight-blue/20 text-royal-gold backdrop-blur-md border border-royal-gold/30 px-4 hover:bg-midnight-blue/40 hover:scale-105 hover:border-royal-gold/60 transition-all duration-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-royal-gold shadow-lg"
      >
        <svg
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="transition-transform duration-300 group-hover:-translate-x-0.5"
        >
          <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
          <path d="M3 3v5h5" />
        </svg>
        <span className="font-sans text-xs tracking-wider uppercase font-medium text-royal-gold/90 group-hover:text-royal-gold">
          First Chapter
        </span>
      </button>
    </div>
  );
});
