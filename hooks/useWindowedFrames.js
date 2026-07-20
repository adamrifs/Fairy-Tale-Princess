"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { assetManager } from "@/lib/assets/AssetManager";
import { cacheManager } from "@/lib/assets/CacheManager";
import { getDevicePixelRatio } from "@/utils";

/**
 * How many frames to keep decoded around the current position. Source
 * frames ship at 1600px (~90KB webp; 4K originals live in assets-src/),
 * and decodes are further downscaled to display resolution when smaller
 * (see decodeFrame) — a resident decoded frame costs ~4-6MB of RGBA.
 * Worst-case residency is the window plus EVICTION_GRACE on each side
 * (~86 frames, transient); steady-state during scrolling is far lower
 * (~window + in-flight). The window is biased in the direction of travel.
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

/**
 * Network prefetch tier: compressed blobs are fetched this many frames
 * around the current position — far wider than the decode window, and
 * cheap to hold (~90KB compressed each ≈ ~17MB for the whole range,
 * vs ~5MB per DECODED frame). This exists for production: on localhost
 * every fetch is ~instant so the decode window alone stays fed, but over
 * a real network (CDN latency + limited bandwidth) fetching only when a
 * frame enters the small decode window means every decode pays network
 * latency mid-scroll and the canvas starves. Prefetching well ahead
 * decouples the network from the scrub: by the time a frame enters the
 * decode window its bytes are already in memory.
 */
const PREFETCH_MAJOR = 150; // compressed blobs kept in the scroll direction
const PREFETCH_MINOR = 30; // compressed blobs kept opposite the scroll direction
// Production (Vercel) serves HTTP/2, where these multiplex over one
// connection and higher parallelism hides per-request latency. Measured
// A/B under emulated 25Mbps+60ms: 10 concurrent beat 6 decisively.
const MAX_CONCURRENT_PREFETCHES = 10;

/**
 * Blobs slightly outside the moving prefetch range are kept this many
 * frames longer before eviction — the same lesson as EVICTION_GRACE at
 * the decode tier: under sustained scrolling a fetch completes ~hundreds
 * of ms after it was queued, by which point the range has moved past it;
 * evicting it immediately throws away bytes that were just paid for.
 */
const PREFETCH_GRACE = 60;

/**
 * Keyframe ladder: every LADDER_STRIDE-th frame's compressed blob is
 * fetched progressively in the background and NEVER evicted (~148 blobs
 * × ~100KB ≈ 15MB — trivial). This is what makes fast scrolling smooth
 * when scroll demand exceeds network supply: bandwidth can never keep up
 * with every frame at ~300 frames/s of scrub demand, but ladder frames
 * are always local, so the decoder can land a nearby frame every tick
 * and the display advances in LADDER_STRIDE steps (~30 visual updates/s
 * — reads as fluid motion), with exact frames filling in as soon as the
 * scroll slows. Without the ladder, sustained scrolling starves: every
 * in-flight fetch goes stale before it can be shown.
 */
const LADDER_STRIDE = 8;

function isLadderIndex(index) {
  return index % LADDER_STRIDE === 0;
}

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
async function decodeFrame(url, signal, resizeWidth, prefetchedBlob) {
  if (typeof createImageBitmap === "function") {
    let blob = prefetchedBlob;
    if (!blob) {
      const response = await fetch(url, { signal, cache: "force-cache" });
      if (!response.ok) throw new Error(`HTTP ${response.status}: ${url}`);
      blob = await response.blob();
    }
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

  // Network prefetch tier state — compressed blobs, index-keyed.
  const blobsRef = useRef(new Map()); // index -> Blob (compressed bytes, ~90KB each)
  const blobInFlightRef = useRef(new Set());
  const prefetchQueueRef = useRef([]);
  const activePrefetchCountRef = useRef(0);
  const prefetchRangeRef = useRef({ start: -1, end: -1 });

  useEffect(() => {
    abortRef.current = new AbortController();
    const blobs = blobsRef.current; // stable Map instance — captured to satisfy exhaustive-deps
    return () => {
      abortRef.current?.abort();
      queueRef.current = [];
      prefetchQueueRef.current = [];
      blobs.clear();
      // Full teardown, not a window-narrowing — evict everything cached
      // for this section/scene, not just the last known window (an
      // in-flight decode from just before unmount could otherwise land
      // in the cache after this cleanup runs and never get swept).
      cacheManager.deleteImagesByPrefix(`${sectionId}:${sceneId}:`);
    };
  }, [sectionId, sceneId]);

  /**
   * Fetch-only pump for the prefetch tier: pulls compressed blobs into
   * blobsRef so the decode pump never has to touch the network for a
   * frame the user is about to reach. Completed fetches are kept even if
   * the range has drifted a bit (the range sweep in loadWindow bounds
   * them) — same lesson as EVICTION_GRACE, applied to bytes.
   */
  const prefetchPump = useCallback(() => {
    while (
      activePrefetchCountRef.current < MAX_CONCURRENT_PREFETCHES &&
      prefetchQueueRef.current.length > 0
    ) {
      const index = prefetchQueueRef.current.shift();
      const { start, end } = prefetchRangeRef.current;
      // Ladder rungs are global background fill — never stale, whatever
      // the near range has moved to. Only non-ladder (exact-frame) work
      // is dropped when the range has left it behind.
      if (!isLadderIndex(index) && (index < start || index > end)) continue;
      if (blobsRef.current.has(index) || blobInFlightRef.current.has(index)) continue;
      if (cacheManager.hasBlob(frameCacheKey(sectionId, sceneId, index))) continue; // preloaded up front

      blobInFlightRef.current.add(index);
      activePrefetchCountRef.current += 1;

      const url = resolveFrameUrl(descriptor, index);
      const signal = abortRef.current?.signal;

      fetch(url, { signal, cache: "force-cache" })
        .then((response) => (response.ok ? response.blob() : null))
        .then((blob) => {
          if (blob && !signal?.aborted) {
            blobsRef.current.set(index, blob);
            // A landed blob is its own decode candidate: the decode pump
            // consumes-and-skips indexes whose bytes weren't local yet,
            // so by the time this fetch resolves, this index's queue
            // entry is usually gone — re-enqueue at the front (decodes
            // are pure CPU now, and the pump's own bounds check drops it
            // if the window has truly moved on).
            const { start, end } = loadedWindowRef.current;
            if (index >= start - EVICTION_GRACE && index <= end + EVICTION_GRACE) {
              queueRef.current.unshift(index);
            }
            pump();
          }
        })
        .catch(() => {})
        .finally(() => {
          blobInFlightRef.current.delete(index);
          activePrefetchCountRef.current -= 1;
          prefetchPump();
        });
    }
    // descriptor is stable for a mounted section; pump is defined below
    // and stable — see its own useCallback([]) rationale.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const pump = useCallback(() => {
    while (activeDecodeCountRef.current < MAX_CONCURRENT_DECODES && queueRef.current.length > 0) {
      const index = queueRef.current.shift();
      const { start, end } = loadedWindowRef.current;

      // Decode slots do CPU work ONLY — an index whose bytes aren't
      // local yet is skipped, not fetched. Live-network tracing showed
      // why this rule is load-bearing: when decodes were allowed to
      // fetch for themselves, six slots sat occupied ~300ms each by
      // bandwidth-starved exact-frame downloads while already-local
      // ladder rungs (15ms decodes that would have kept the canvas
      // advancing) queued behind them — the pipeline clogged itself.
      // Bytes come from the shared blob cache (preloaded in full on the
      // loading screen — the common case, so nothing here ever waits on
      // the network) or, as a fallback, this hook's own prefetch tier.
      const key = frameCacheKey(sectionId, sceneId, index);
      const blob = blobsRef.current.get(index) ?? cacheManager.getBlob(key);
      if (!blob) continue;
      if (index < start - EVICTION_GRACE || index > end + EVICTION_GRACE) continue;

      if (cacheManager.hasImage(key) || inFlightRef.current.has(index)) continue;

      inFlightRef.current.add(index);
      activeDecodeCountRef.current += 1;

      const url = resolveFrameUrl(descriptor, index);
      const signal = abortRef.current?.signal;

      decodeFrame(url, signal, targetWidthRef.current, blob)
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
      const delta = currentIndex - lastIndexRef.current;
      const movingBackward = delta < 0;
      lastIndexRef.current = currentIndex;
      // Moving faster than one ladder rung per tick means exact-frame
      // fetches at the leading edge will be stale before they arrive —
      // in that regime all network budget goes to the ladder instead.
      const fastScroll = Math.abs(delta) > LADDER_STRIDE;
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

      // Drop queued-but-not-yet-started work outside the grace-padded
      // bounds (the pump's own two-tier check handles the rest — local-
      // blob work stays eligible there, network work needs the strict
      // window).
      queueRef.current = queueRef.current.filter(
        (i) => i >= start - EVICTION_GRACE && i <= end + EVICTION_GRACE
      );

      // Priority order: the frame actually being displayed first, then
      // radiating outward — so a burst of newly-queued work (e.g. a fast
      // scroll jump) fills in the visible frame before its neighbors.
      const priorityOrder = [currentIndex];
      const maxOffset = Math.max(currentIndex - start, end - currentIndex);
      for (let offset = 1; offset <= maxOffset; offset++) {
        if (currentIndex + offset <= end) priorityOrder.push(currentIndex + offset);
        if (currentIndex - offset >= start) priorityOrder.push(currentIndex - offset);
      }

      // Ladder rungs within the grace-padded window, nearest first — the
      // guaranteed-landable decodes that keep the display advancing when
      // exact-frame decodes can't keep up with scroll speed.
      const nearestRung = Math.round(currentIndex / LADDER_STRIDE) * LADDER_STRIDE;
      for (let k = 0; k * LADDER_STRIDE <= EVICTION_GRACE; k++) {
        const forward = nearestRung + k * LADDER_STRIDE;
        const backward = nearestRung - k * LADDER_STRIDE;
        if (forward < descriptor.count && forward <= end + EVICTION_GRACE) priorityOrder.push(forward);
        if (k > 0 && backward >= 0 && backward >= start - EVICTION_GRACE) priorityOrder.push(backward);
      }

      const decodeQueued = new Set(queueRef.current);
      for (const i of priorityOrder) {
        const key = frameCacheKey(sectionId, sceneId, i);
        if (cacheManager.hasImage(key) || inFlightRef.current.has(i) || decodeQueued.has(i)) continue;
        decodeQueued.add(i);
        queueRef.current.push(i);
      }

      pump();

      // ── Prefetch tier: keep compressed bytes resident far beyond the
      // decode window, biased the same direction. Evict blobs that fell
      // outside the range (bounded ~180 × ~90KB ≈ 17MB), queue missing
      // ones radiating outward from the decode window's leading edge.
      const prefetchAhead = movingBackward ? PREFETCH_MINOR : PREFETCH_MAJOR;
      const prefetchBehind = movingBackward ? PREFETCH_MAJOR : PREFETCH_MINOR;
      const pStart = Math.max(0, currentIndex - prefetchBehind);
      const pEnd = Math.min(descriptor.count - 1, currentIndex + prefetchAhead);
      // The pump's staleness skip uses grace-padded bounds so in-flight
      // work that drifted slightly behind the range isn't wasted.
      prefetchRangeRef.current = { start: pStart - PREFETCH_GRACE, end: pEnd + PREFETCH_GRACE };

      // Evict non-ladder blobs outside the grace-padded range. Ladder
      // blobs are permanent by design (see LADDER_STRIDE) — they're the
      // ~15MB that keeps fast scrolling fluid forever after first fetch.
      for (const index of blobsRef.current.keys()) {
        if (isLadderIndex(index)) continue;
        if (index < pStart - PREFETCH_GRACE || index > pEnd + PREFETCH_GRACE) {
          blobsRef.current.delete(index);
        }
      }

      // Rebuilt from scratch every tick — priorities must reflect where
      // the scroll is NOW; carrying over yesterday's queue order lets
      // stale near-range work sit ahead of urgently-needed ladder rungs.
      // (In-flight fetches are unaffected; this only reorders waiting work.)
      prefetchQueueRef.current = [];
      const queued = new Set();
      const enqueuePrefetch = (i) => {
        if (blobsRef.current.has(i) || blobInFlightRef.current.has(i) || queued.has(i)) return;
        // Already downloaded up front on the loading screen — no fetch
        // needed. When the full-sequence preload has completed (the normal
        // case) every index short-circuits here and the prefetch tier does
        // nothing at all, which is exactly what keeps scroll network-free.
        if (cacheManager.hasBlob(frameCacheKey(sectionId, sceneId, i))) return;
        queued.add(i);
        prefetchQueueRef.current.push(i);
      };

      // Two request families, allocated by ORDER, never by exclusion —
      // the queue is rebuilt each tick, so under a saturated connection
      // whatever is enqueued first wins the bandwidth, while a fast
      // connection simply drains both and everything gets fetched:
      //
      //  - exact frames around the current position (direction-biased):
      //    what makes a slow/paused scrub pixel-exact.
      //  - ladder rungs from here across the whole sequence in the
      //    direction of travel: the display's fallback material that
      //    keeps motion continuous when scroll outruns the network.
      //
      // Fast movement puts the ladder first (exact frames would be stale
      // on arrival anyway); slow movement puts exact frames first.
      const step = movingBackward ? -1 : 1;
      const enqueueExactRange = () => {
        for (let i = currentIndex; i >= pStart && i <= pEnd; i += step) enqueuePrefetch(i);
        for (let i = currentIndex - step; i >= pStart && i <= pEnd; i -= step) enqueuePrefetch(i);
      };
      // Two-level: a coarse pass (4× the stride — full-sequence coverage
      // for ~a quarter of the bytes, so SOMETHING is decodable everywhere
      // within the first seconds even on a slow connection) and then the
      // fine pass that refines to LADDER_STRIDE. Both direction-first.
      const enqueueLadder = () => {
        const coarse = LADDER_STRIDE * 4;
        const currentCoarse = Math.round(currentIndex / coarse) * coarse;
        const coarseStep = movingBackward ? -coarse : coarse;
        for (let r = currentCoarse; r >= 0 && r < descriptor.count; r += coarseStep) enqueuePrefetch(r);
        for (let r = currentCoarse - coarseStep; r >= 0 && r < descriptor.count; r -= coarseStep) enqueuePrefetch(r);

        const currentRung = Math.round(currentIndex / LADDER_STRIDE) * LADDER_STRIDE;
        const rungStep = movingBackward ? -LADDER_STRIDE : LADDER_STRIDE;
        for (let r = currentRung; r >= 0 && r < descriptor.count; r += rungStep) enqueuePrefetch(r);
        for (let r = currentRung - rungStep; r >= 0 && r < descriptor.count; r -= rungStep) enqueuePrefetch(r);
      };

      if (fastScroll) {
        enqueueLadder();
        enqueueExactRange();
      } else {
        enqueueExactRange();
        enqueueLadder();
      }

      prefetchPump();
    },
    [descriptor, pump, prefetchPump, sectionId, sceneId]
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
