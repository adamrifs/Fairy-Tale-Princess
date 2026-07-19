"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { assetManager } from "@/lib/assets/AssetManager";
import { cacheManager } from "@/lib/assets/CacheManager";
import { getDevicePixelRatio } from "@/utils";

/**
 * How many frames to keep decoded around the current position. The source
 * frames are 4K (3840×2160 → 33MB decoded RGBA each), but decodes are
 * downscaled to display resolution (see decodeFrame), so a resident frame
 * costs ~5MB. Worst-case residency is the window plus EVICTION_GRACE on
 * each side (~86 frames ≈ 400MB, transient); steady-state during
 * scrolling is far lower (~window + in-flight ≈ 150-200MB), well within
 * a tab's budget. The window is biased in the direction of travel.
 */
const WINDOW_MAJOR = 20; // frames kept in the scroll direction
const WINDOW_MINOR = 5; // frames kept opposite the scroll direction

/**
 * At most this many frames decode at once. Each decode is a fetch of a
 * large (~500-900KB) 4K webp plus createImageBitmap work; letting every
 * frame that enters the window fire its own fetch unconditionally means a
 * fast scroll (which can move the window by dozens of frames in a single
 * tick) kicks off dozens of simultaneous decodes, starving the frame the
 * user is actually looking at.
 */
const MAX_CONCURRENT_DECODES = 6;

/**
 * How far getDisplayFrame searches from the requested index for the
 * nearest already-decoded frame. Generous on purpose: after a fast flick
 * the nearest resident frame can be an entire window-width away, and
 * showing it beats freezing (each miss is just a Map lookup).
 */
const NEAREST_SEARCH_RADIUS = 120;

/**
 * Completed decodes are accepted (and residents kept) within this many
 * frames beyond the strict window. During sustained scrolling the window
 * moves faster than a 4K decode completes, so by completion time a
 * decode's index is almost always somewhat behind the window — rejecting
 * those outright (an earlier revision did) collapses decode throughput
 * to zero while scrolling: everything is stale on arrival, nothing ever
 * lands, and the canvas freezes until the user stops. With a grace
 * margin, slightly-stale frames land, get shown by getDisplayFrame's
 * nearest-neighbor lookup, and are evicted by the range sweep one or two
 * window-moves later — bounded memory AND continuous visual advance.
 */
const EVICTION_GRACE = 30;

function frameCacheKey(sectionId, sceneId, index) {
  return `${sectionId}:${sceneId}:${index}`;
}

function resolveFrameUrl(descriptor, index) {
  if (descriptor.files) return `${descriptor.path}${descriptor.files[index]}`;
  const padded = String(index + 1).padStart(descriptor.padding, "0");
  return `${descriptor.path}${descriptor.prefix}${padded}.${descriptor.extension}`;
}

/**
 * Decodes one frame, downscaled at decode time to `resizeWidth` when
 * given. This matters enormously for 4K sources rendered into a
 * viewport-sized canvas: full-size decode is 33MB of RGBA and 100-200ms
 * of CPU per frame — far slower than scrubbing advances — while decoding
 * straight to display width is ~7× smaller and correspondingly faster,
 * and drawImage no longer downscales 4K on every canvas paint either.
 * The resize options are try/caught because Safari historically ignores/
 * throws on them — full-size decode is the graceful fallback.
 */
async function decodeFrame(url, signal, resizeWidth) {
  if (typeof createImageBitmap === "function") {
    const response = await fetch(url, { signal });
    if (!response.ok) throw new Error(`HTTP ${response.status}: ${url}`);
    const blob = await response.blob();
    if (resizeWidth) {
      try {
        return await createImageBitmap(blob, { resizeWidth, resizeQuality: "medium" });
      } catch {
        return createImageBitmap(blob);
      }
    }
    return createImageBitmap(blob);
  }
  const img = new Image();
  img.decoding = "async";
  img.src = url;
  await img.decode();
  return img;
}

/**
 * Sliding-window frame loader for very large single-sequence sections.
 *
 * Two correctness properties that matter more than they look, both fixed
 * here after causing a real OOM crash during fast scrolling:
 *
 * 1. Concurrency is capped (MAX_CONCURRENT_DECODES) and queued work is
 *    reordered around whatever index is actually being displayed right
 *    now, so a fast scroll doesn't fire an unbounded burst of large
 *    fetches that starve the frame the user is actually looking at.
 *
 * 2. Eviction is a single range sweep (deleteImagesOutsideRange) over
 *    the grace-padded window, run on every loadWindow() call. Being
 *    index-range-based rather than delta-based, it is immune to the
 *    decode-completion race that caused the original OOM crash: a frame
 *    that finished decoding *after* the window had moved past it used to
 *    slip through delta eviction (it wasn't cached yet when its range
 *    was swept) and then never got evicted at all. Note the sweep keeps
 *    the grace margin alive on purpose — see EVICTION_GRACE for why
 *    strictly rejecting anything outside the bare window is also wrong
 *    (it zeroes decode throughput during sustained scrolling).
 *
 * Smoothness additions, after 4K sources made exact-frame display stall:
 *
 * 3. Decodes are downscaled to display width (see decodeFrame) — the
 *    single biggest lever, cutting both per-frame memory and per-frame
 *    decode time by ~7× for 4K sources.
 *
 * 4. getDisplayFrame(index) returns the nearest already-decoded frame
 *    when the exact one isn't ready yet, so the canvas keeps advancing
 *    through whatever IS resident instead of freezing on an old frame
 *    and jump-cutting when the exact decode finally lands. During
 *    normal-speed scrolling the "nearest" frame is almost always the
 *    exact one or ±1-2 — visually indistinguishable; during a hard
 *    flick it degrades to coarser steps instead of a hang.
 *
 * 5. The window is biased in the direction of travel (WINDOW_MAJOR ahead,
 *    WINDOW_MINOR behind) — decode budget goes where the scroll is going.
 *
 * `setLoadedCount` is a stable React state setter. When any frame
 * finishes decoding, calling it increments a counter which triggers a
 * re-render of the consuming component. Without this, frames land in the
 * cache silently and React never knows to re-render — producing a blank
 * frame until the next scroll event causes a re-render externally.
 * The counter value itself is never used; only the re-render side-effect
 * matters. The number of extra renders is bounded by the window size,
 * not the total frame count.
 */
export function useWindowedFrames(sectionId, sceneId) {
  const descriptor = useMemo(
    () => assetManager.getFrames(sectionId, sceneId),
    [sectionId, sceneId]
  );

  const [, setLoadedCount] = useState(0);

  const inFlightRef = useRef(new Set());
  const loadedWindowRef = useRef({ start: -1, end: -1 });
  const abortRef = useRef(null);
  const queueRef = useRef([]); // indexes waiting for a free decode slot, priority order
  const activeDecodeCountRef = useRef(0);
  const lastIndexRef = useRef(0); // previous loadWindow index — determines scroll direction
  const targetWidthRef = useRef(null); // decode-time resize width, computed lazily in the browser

  useEffect(() => {
    abortRef.current = new AbortController();
    return () => {
      abortRef.current?.abort();
      queueRef.current = [];
      // Full teardown, not a window-narrowing — evict everything cached
      // for this section/scene, not just the last known window (an
      // in-flight decode from just before unmount could otherwise land
      // in the cache after this cleanup runs and never get swept).
      cacheManager.deleteImagesByPrefix(`${sectionId}:${sceneId}:`);
    };
  }, [sectionId, sceneId]);

  const pump = useCallback(() => {
    while (activeDecodeCountRef.current < MAX_CONCURRENT_DECODES && queueRef.current.length > 0) {
      const index = queueRef.current.shift();
      const { start, end } = loadedWindowRef.current;

      // The window may have moved past this index while it sat in the
      // queue — skip it rather than spend a decode slot on stale work.
      if (index < start || index > end) continue;

      const key = frameCacheKey(sectionId, sceneId, index);
      if (cacheManager.hasImage(key) || inFlightRef.current.has(index)) continue;

      inFlightRef.current.add(index);
      activeDecodeCountRef.current += 1;

      const url = resolveFrameUrl(descriptor, index);
      const signal = abortRef.current?.signal;

      decodeFrame(url, signal, targetWidthRef.current)
        .then((bitmap) => {
          if (signal?.aborted) {
            bitmap.close?.();
            return;
          }
          // Completion-time staleness check, with EVICTION_GRACE slack:
          // wildly stale results (a decode from before a huge flick) are
          // dropped so they can't leak, but slightly-behind-the-window
          // results — the normal case during sustained scrolling — are
          // kept so the nearest-frame display always has fresh material.
          // Anything kept here is inside the range sweep's bounds below,
          // so it cannot outlive the window by more than the grace.
          const current = loadedWindowRef.current;
          if (index < current.start - EVICTION_GRACE || index > current.end + EVICTION_GRACE) {
            bitmap.close?.();
            return;
          }
          cacheManager.setImage(key, bitmap);
          setLoadedCount((c) => c + 1);
        })
        .catch(() => {})
        .finally(() => {
          inFlightRef.current.delete(index);
          activeDecodeCountRef.current -= 1;
          pump();
        });
    }
    // descriptor/sectionId/sceneId are stable for a mounted section.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadWindow = useCallback(
    (currentIndex) => {
      if (!descriptor || descriptor.count === 0) return;

      // Decode-time resize target: the canvas covers the viewport, so
      // decoding wider than viewport × DPR is pure waste (the sources
      // are 4K). Computed lazily here because window isn't available at
      // module/render scope during SSR.
      if (targetWidthRef.current === null && typeof window !== "undefined") {
        targetWidthRef.current = Math.ceil(window.innerWidth * getDevicePixelRatio());
      }

      // Bias the window in the direction of travel — decode budget goes
      // where the scroll is going, not evenly behind and ahead.
      const movingBackward = currentIndex < lastIndexRef.current;
      lastIndexRef.current = currentIndex;
      const ahead = movingBackward ? WINDOW_MINOR : WINDOW_MAJOR;
      const behind = movingBackward ? WINDOW_MAJOR : WINDOW_MINOR;

      const start = Math.max(0, currentIndex - behind);
      const end = Math.min(descriptor.count - 1, currentIndex + ahead);

      loadedWindowRef.current = { start, end };

      // Single eviction mechanism: everything resident outside the
      // grace-padded window is swept, every call, regardless of how or
      // when it got cached — timing-independent, so no decode-completion
      // race can leak past it. The grace padding deliberately keeps
      // recently-landed slightly-stale frames alive briefly; they're
      // what getDisplayFrame shows while exact decodes catch up. Cheap:
      // iterates only keys currently resident (≈ window + grace), never
      // the sequence's total frame count.
      cacheManager.deleteImagesOutsideRange(
        `${sectionId}:${sceneId}:`,
        start - EVICTION_GRACE,
        end + EVICTION_GRACE
      );

      // Drop queued-but-not-yet-started work that's now outside the window.
      queueRef.current = queueRef.current.filter((i) => i >= start && i <= end);

      // Priority order: the frame actually being displayed first, then
      // radiating outward — so a burst of newly-queued work (e.g. a fast
      // scroll jump) fills in the visible frame before its neighbors.
      const priorityOrder = [currentIndex];
      const maxOffset = Math.max(currentIndex - start, end - currentIndex);
      for (let offset = 1; offset <= maxOffset; offset++) {
        if (currentIndex + offset <= end) priorityOrder.push(currentIndex + offset);
        if (currentIndex - offset >= start) priorityOrder.push(currentIndex - offset);
      }

      for (const i of priorityOrder) {
        const key = frameCacheKey(sectionId, sceneId, i);
        if (cacheManager.hasImage(key) || inFlightRef.current.has(i) || queueRef.current.includes(i)) continue;
        queueRef.current.push(i);
      }

      pump();
    },
    [descriptor, pump, sectionId, sceneId]
  );

  const getFrame = useCallback(
    (index) => {
      if (!descriptor || index < 0 || index >= descriptor.count) return null;
      return cacheManager.getImage(frameCacheKey(sectionId, sceneId, index));
    },
    [descriptor, sectionId, sceneId]
  );

  /**
   * The exact frame if decoded, otherwise the nearest decoded neighbor
   * (searching outward up to NEAREST_SEARCH_RADIUS). This is what keeps
   * scrubbing visually continuous while decodes catch up — see docblock.
   * Misses are cheap Map lookups, and the search exits on the first hit,
   * which during normal scrolling is the exact index or ±1.
   */
  const getDisplayFrame = useCallback(
    (index) => {
      if (!descriptor || descriptor.count === 0) return null;
      const clamped = Math.min(Math.max(index, 0), descriptor.count - 1);

      const exact = cacheManager.getImage(frameCacheKey(sectionId, sceneId, clamped));
      if (exact) return exact;

      for (let offset = 1; offset <= NEAREST_SEARCH_RADIUS; offset++) {
        const behind = clamped - offset;
        if (behind >= 0) {
          const image = cacheManager.getImage(frameCacheKey(sectionId, sceneId, behind));
          if (image) return image;
        }
        const ahead = clamped + offset;
        if (ahead < descriptor.count) {
          const image = cacheManager.getImage(frameCacheKey(sectionId, sceneId, ahead));
          if (image) return image;
        }
      }
      return null;
    },
    [descriptor, sectionId, sceneId]
  );

  return { count: descriptor?.count ?? 0, getFrame, getDisplayFrame, loadWindow };
}
