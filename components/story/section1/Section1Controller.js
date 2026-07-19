/**
 * Pure scene-resolution logic for Section 1's five frame sequences — no
 * React, no side effects, so it's trivially testable and keeps
 * Section1Scene focused on rendering. Nothing here hardcodes a frame
 * number or count; frameCounts always comes from assetManager at runtime.
 */

/**
 * Splits the section's single 0-1 animation progress into weighted
 * segments — one per scene, weighted by that scene's own frame count so
 * scroll speed feels consistent across scenes (a 300-frame scene
 * naturally gets ~3x the scroll distance a 100-frame scene does, rather
 * than an arbitrary equal split). Returns which scene index `progress`
 * currently falls in and that scene's own local 0-1 progress.
 */
export function resolveActiveScene(progress, frameCounts) {
  const weights = frameCounts.map((count) => Math.max(count, 1));
  const total = weights.reduce((sum, weight) => sum + weight, 0) || 1;

  let cumulative = 0;
  const boundaries = weights.map((weight) => {
    const start = cumulative / total;
    cumulative += weight;
    return { start, end: cumulative / total };
  });

  const clamped = Math.min(Math.max(progress, 0), 1);
  let activeIndex = boundaries.findIndex((segment) => clamped < segment.end);
  if (activeIndex === -1) activeIndex = boundaries.length - 1;

  const { start, end } = boundaries[activeIndex];
  const span = end - start || 1;
  const localProgress = Math.min(Math.max((clamped - start) / span, 0), 1);

  return { activeIndex, localProgress, boundaries };
}

/**
 * Which scene should actively be loading right now, and which one should
 * be warming in the background — "current + next only," matching the
 * asset system's own MemoryManager policy at the section level. Anything
 * outside this pair should be disposed.
 */
export function getLoadPlan(activeIndex, totalScenes) {
  return {
    loadIndex: activeIndex,
    preloadIndex: activeIndex + 1 < totalScenes ? activeIndex + 1 : null,
  };
}

/** The frame index within one scene for its own local 0-1 progress. */
export function resolveFrameIndex(localProgress, frameCount) {
  if (frameCount <= 0) return 0;
  return Math.round(localProgress * (frameCount - 1));
}
