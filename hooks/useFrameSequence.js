"use client";

import { useEffect, useMemo, useState } from "react";
import { assetManager } from "@/lib/assets/AssetManager";
import { frameManager } from "@/lib/assets/FrameManager";

/**
 * Like useFrames, plus an `enabled` gate — a multi-scene section (Section
 * 1's five frame sequences) must load one scene at a time, current +
 * next only, never all at once. This hook only calls
 * frameManager.loadFrames() while `enabled` is true; the caller decides
 * when that is (see Section1Controller.getLoadPlan). Every actual fetch/
 * decode/cache/dispose is still delegated to FrameManager — this only
 * adds sequencing on top, it doesn't reimplement any of it.
 */
export function useFrameSequence(sectionId, sceneId, { enabled = true } = {}) {
  const [state, setState] = useState({ isLoaded: false, progress: 0, error: null });

  useEffect(() => {
    if (!enabled || !sectionId || !sceneId) return undefined;

    let cancelled = false;

    frameManager
      .loadFrames(sectionId, sceneId, {
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
  }, [enabled, sectionId, sceneId]);

  const descriptor = useMemo(
    () => (sectionId && sceneId ? assetManager.getFrames(sectionId, sceneId) : null),
    [sectionId, sceneId]
  );

  return {
    count: descriptor?.count ?? 0,
    isLoaded: state.isLoaded,
    progress: state.progress,
    error: state.error,
    getFrame: (index) => (sectionId && sceneId ? frameManager.getFrame(sectionId, sceneId, index) : null),
  };
}
