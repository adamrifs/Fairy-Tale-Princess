"use client";

import { useAssetContext } from "@/providers/AssetProvider";

/**
 * Reactive view of the global asset Preloader (lib/assets/Preloader.js).
 * A future LoadingOverlay wires progress/isLoaded in from here instead of
 * managing its own preload list.
 */
export function usePreloader() {
  const { progress, percentage, isLoaded, currentSectionId, nextSectionId, setActiveSection } =
    useAssetContext();

  return { progress, percentage, isLoaded, currentSectionId, nextSectionId, setActiveSection };
}
