"use client";

import { useEffect, useMemo } from "react";
import { assetManager } from "@/lib/assets/AssetManager";
import { useIntersection } from "./useIntersection";
import { usePreloader } from "./usePreloader";

/**
 * Convenience composite for a scene that just wants "is section X ready"
 * plus its registry entries, without wiring useFrames/useVideo per scene.
 * `ref` (from useIntersection) is meant for the section's root element —
 * attaching it auto-activates the section (and its preload) as it
 * approaches the viewport, via rootMargin, so most scenes never need to
 * call activate() manually. Ignoring `ref` just falls back to manual
 * activation.
 */
export function useSectionAssets(sectionId, { autoActivate = true, rootMargin = "50% 0px" } = {}) {
  const { currentSectionId, nextSectionId, progress, isLoaded, setActiveSection } = usePreloader();
  const [ref, isIntersecting] = useIntersection({ rootMargin, threshold: 0 });

  useEffect(() => {
    if (autoActivate && isIntersecting) setActiveSection(sectionId);
  }, [autoActivate, isIntersecting, sectionId, setActiveSection]);

  const assets = useMemo(() => assetManager.getSectionAssets(sectionId), [sectionId]);

  return {
    ...assets,
    ref,
    isActive: currentSectionId === sectionId,
    isNext: nextSectionId === sectionId,
    isLoaded: currentSectionId === sectionId ? isLoaded : false,
    progress: currentSectionId === sectionId ? progress : 0,
    activate: () => setActiveSection(sectionId),
  };
}
