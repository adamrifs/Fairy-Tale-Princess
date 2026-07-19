"use client";

import { useEffect, useMemo, useState } from "react";
import { assetManager } from "@/lib/assets/AssetManager";
import { frameManager } from "@/lib/assets/FrameManager";

/**
 * Loads one section's frame sequence — e.g. useFrames("section-2"). Omit
 * sceneId to get the section's first/only sequence, or pass one of its
 * scene ids explicitly (section-1 has five). Scene code reads frames via
 * the returned getFrame(index) and draws them itself; nothing here
 * touches canvas.
 *
 * Disposal is deliberately NOT tied to this hook's unmount — MemoryManager
 * owns the current+next residency window, so unmounting a scene (e.g.
 * scrolling slightly past its section) shouldn't nuke frames the
 * Preloader intentionally kept warm for the adjacent section.
 */
export function useFrames(sectionId, sceneId) {
  const resolvedSceneId = sceneId ?? Object.keys(assetManager.getFramesMap(sectionId))[0] ?? null;
  const [state, setState] = useState({ isLoaded: false, progress: 0, error: null });

  useEffect(() => {
    if (!sectionId || !resolvedSceneId) return undefined;

    let cancelled = false;
    setState({ isLoaded: false, progress: 0, error: null });

    frameManager
      .loadFrames(sectionId, resolvedSceneId, {
        onProgress: (progress) => {
          if (!cancelled) setState((prev) => ({ ...prev, progress }));
        },
      })
      .then(() => {
        if (!cancelled) setState({ isLoaded: true, progress: 1, error: null });
      })
      .catch((error) => {
        if (!cancelled) setState((prev) => ({ ...prev, error }));
      });

    return () => {
      cancelled = true;
    };
  }, [sectionId, resolvedSceneId]);

  const descriptor = useMemo(
    () => (sectionId && resolvedSceneId ? assetManager.getFrames(sectionId, resolvedSceneId) : null),
    [sectionId, resolvedSceneId]
  );

  return {
    count: descriptor?.count ?? 0,
    isLoaded: state.isLoaded,
    progress: state.progress,
    error: state.error,
    getFrame: (index) => frameManager.getFrame(sectionId, resolvedSceneId, index),
  };
}
