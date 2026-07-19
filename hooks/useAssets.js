"use client";

import { useAssetContext } from "@/providers/AssetProvider";

/** Exposes the AssetManager registry plus the global Preloader snapshot/controls. */
export function useAssets() {
  return useAssetContext();
}
