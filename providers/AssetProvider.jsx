"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { assetManager } from "@/lib/assets/AssetManager";
import { preloader } from "@/lib/assets/Preloader";

const AssetContext = createContext(null);

/**
 * Bridges the imperative asset singletons (AssetManager registry,
 * Preloader orchestration) into React state, mirroring AudioProvider.
 * The singletons themselves are never recreated here so loaded frames/
 * videos survive this provider remounting.
 */
export function AssetProvider({ children }) {
  const [snapshot, setSnapshot] = useState(() => preloader.getSnapshot());

  useEffect(() => {
    const unsubscribe = preloader.subscribe(setSnapshot);
    // Kick off the initial load so progress starts at 0 and goes to 100%.
    preloader.preloadInitial();
    return unsubscribe;
  }, []);

  const value = useMemo(
    () => ({
      manager: assetManager,
      preloader,
      ...snapshot,
      setActiveSection: (sectionId) => preloader.setActiveSection(sectionId),
    }),
    [snapshot]
  );

  return <AssetContext.Provider value={value}>{children}</AssetContext.Provider>;
}

export function useAssetContext() {
  const context = useContext(AssetContext);
  if (!context) {
    throw new Error("useAssetContext must be used within an AssetProvider");
  }
  return context;
}
