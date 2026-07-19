"use client";

import { useEffect, useRef, useState } from "react";
import { ScrollTrigger } from "@/lib/gsap";

/**
 * Tracks scroll progress (0-1) through a trigger element via ScrollTrigger.
 * Generic foundation for any future scene that needs to scrub an animation
 * against scroll position — contains no scene-specific logic.
 */
export function useScrollProgress({ start = "top bottom", end = "bottom top" } = {}) {
  const triggerRef = useRef(null);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const node = triggerRef.current;
    if (!node) return undefined;

    const scrollTrigger = ScrollTrigger.create({
      trigger: node,
      start,
      end,
      onUpdate: (self) => setProgress(self.progress),
    });

    return () => scrollTrigger.kill();
  }, [start, end]);

  return [triggerRef, progress];
}
