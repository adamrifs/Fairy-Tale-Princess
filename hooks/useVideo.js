"use client";

import { useCallback, useEffect, useState } from "react";
import { assetManager } from "@/lib/assets/AssetManager";
import { videoManager } from "@/lib/assets/VideoManager";

/**
 * Resolves a section's video src — e.g. useVideo("section-5") or
 * useVideo("section-5", "finalScene") — and warms the browser's cache for
 * it via VideoManager. The scene still renders and owns its own <video>
 * element (components/shared/VideoContainer); this hook only supplies
 * `src` plus pause/resume bound to that same source.
 */
export function useVideo(sectionId, videoId) {
  const video = assetManager.getVideo(sectionId, videoId);
  const resolvedVideoId = video?.id ?? null;
  const [state, setState] = useState({ isLoaded: false, error: null });

  useEffect(() => {
    if (!sectionId || !resolvedVideoId) return undefined;

    let cancelled = false;
    setState({ isLoaded: false, error: null });

    videoManager
      .setActiveVideo(sectionId, resolvedVideoId)
      .then(() => {
        if (!cancelled) setState({ isLoaded: true, error: null });
      })
      .catch((error) => {
        if (!cancelled) setState({ isLoaded: false, error });
      });

    return () => {
      cancelled = true;
    };
  }, [sectionId, resolvedVideoId]);

  const pause = useCallback(
    () => videoManager.pauseVideo(sectionId, resolvedVideoId),
    [sectionId, resolvedVideoId]
  );
  const resume = useCallback(
    () => videoManager.resumeVideo(sectionId, resolvedVideoId),
    [sectionId, resolvedVideoId]
  );

  return {
    src: video?.path ?? null,
    isLoaded: state.isLoaded,
    error: state.error,
    pause,
    resume,
  };
}
