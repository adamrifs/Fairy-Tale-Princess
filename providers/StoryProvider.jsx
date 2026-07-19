"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { sceneManager } from "@/lib/story/SceneManager";

const StoryContext = createContext(null);

/**
 * Bridges the imperative SceneManager singleton into React state, exactly
 * mirroring AssetProvider/AudioProvider. Scoped around the story content
 * via StoryLayout rather than mounted in RootProviders — story playback
 * state isn't app-global infrastructure the way audio/assets are.
 */
export function StoryProvider({ children }) {
  const [snapshot, setSnapshot] = useState(() => sceneManager.getSnapshot());

  useEffect(() => sceneManager.subscribe(setSnapshot), []);

  const value = useMemo(
    () => ({
      manager: sceneManager,
      ...snapshot,
      registerSection: (id, order) => sceneManager.registerSection(id, order),
      unregisterSection: (id) => sceneManager.unregisterSection(id),
      setActiveSection: (id) => sceneManager.setActiveSection(id),
      setPhase: (phase) => sceneManager.setPhase(phase),
      setAnimationProgress: (progress) => sceneManager.setAnimationProgress(progress),
      setFrame: (frame) => sceneManager.setFrame(frame),
      setStoryIndex: (index) => sceneManager.setStoryIndex(index),
      setPinned: (isPinned) => sceneManager.setPinned(isPinned),
      setTransitioning: (isTransitioning) => sceneManager.setTransitioning(isTransitioning),
      setSectionProgress: (id, localProgress) => sceneManager.setSectionProgress(id, localProgress),
    }),
    [snapshot]
  );

  return <StoryContext.Provider value={value}>{children}</StoryContext.Provider>;
}

export function useStoryContext() {
  const context = useContext(StoryContext);
  if (!context) {
    throw new Error("useStoryContext must be used within a StoryProvider");
  }
  return context;
}
