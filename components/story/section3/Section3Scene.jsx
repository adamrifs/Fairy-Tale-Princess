"use client";

import { memo, useEffect, useRef } from "react";
import { useWindowedFrames } from "@/hooks/useWindowedFrames";
import { FrameSequencePlayer } from "@/components/story/section1/FrameSequencePlayer";
import { assetManager } from "@/lib/assets/AssetManager";
import { frameManager } from "@/lib/assets/FrameManager";
import { idleCallback, cancelIdleCallback } from "@/utils/timing";
import { SECTION3_ID, SECTION3_SCENE_ID } from "@/data/story/section3";

/**
 * Background renderer for Section 3 — a single continuous frame sequence
 * (public/sections/section-3/, ~300 frames), driven 1:1 by scroll.
 *
 * Identical loading path to Section 1/2: the full compressed blob set is
 * preloaded up front by the MemoryManager/FrameManager pipeline (keyed by
 * sectionId/sceneId), and this component's useWindowedFrames slides a decode
 * window across those already-local blobs so scrubbing never waits on the
 * network. The generic FrameSequencePlayer canvas draws whatever frame it's
 * handed.
 *
 * Like Section 2, there is no landing-video crossfade and no end video —
 * Section 3 opens directly on its frame sequence. A static frame_0001
 * backdrop sits beneath the canvas so the section is always opaque (mirrors
 * the role Section 1's landing video plays as a solid base layer): the
 * cross-section handoff can never reveal the page background, and the very
 * first frame is already on screen before the first decode lands.
 */
export const Section3Scene = memo(function Section3Scene({ progress = 0 }) {
  const { count, getDisplayFrame, loadWindow } = useWindowedFrames(SECTION3_ID, SECTION3_SCENE_ID);

  const frameIndex = count > 0
    ? Math.round(Math.min(Math.max(progress, 0), 1) * (count - 1))
    : 0;

  // Seed the initial window on mount so frames near the start decode early
  // — by the time the user scrolls into this section, frame 0 is ready.
  useEffect(() => {
    loadWindow(0);
    // loadWindow is stable (useCallback); only run once on mount.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Full-sequence warm (Section 3 lag fix) ─────────────────────────────
  // MemoryManager only fully downloads Section 1 (the loading screen) and
  // Section 2 (Section 1's "next"). Section 3 is two hops down the residency
  // chain and never gets that full warm — only this component's own windowed
  // prefetch tier, which reaches ~150 frames ahead of frame 0. That leaves the
  // back half of the sequence to stream in ON-DEMAND mid-scroll (measured:
  // ~130 network fetches during the first scrub), a network wait the decoder
  // can't hide — which is the lag. Warm the ENTIRE blob set here in the
  // background (exactly the full download FrameManager already does for
  // Section 2) so scrubbing Section 3 is network-free like Section 2. Deferred
  // until the previous section has finished so it never splits bandwidth with
  // the loading screen or Section 2's own warm. Scoped entirely to Section 3 —
  // it only fills the shared blob cache (the windowed loader skips anything
  // already cached), touching nothing in other sections.
  useEffect(() => {
    const prevId = assetManager.getPreviousSectionId(SECTION3_ID);
    const prevScene = prevId ? assetManager.getFrames(prevId)?.id : null;
    let idleHandle = null;
    let timer = null;
    const warmWhenPrevReady = () => {
      if (!prevId || frameManager.isLoaded(prevId, prevScene)) {
        idleHandle = idleCallback(() => frameManager.loadSectionFrames(SECTION3_ID));
      } else {
        timer = setTimeout(warmWhenPrevReady, 1000);
      }
    };
    timer = setTimeout(warmWhenPrevReady, 1000);
    return () => {
      if (timer) clearTimeout(timer);
      if (idleHandle !== null) cancelIdleCallback(idleHandle);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Advance the sliding window as the user scrolls through the sequence.
  const lastIndexRef = useRef(-1);
  useEffect(() => {
    if (frameIndex !== lastIndexRef.current) {
      lastIndexRef.current = frameIndex;
      loadWindow(frameIndex);
    }
  }, [frameIndex, loadWindow]);

  // Nearest decoded frame, not strictly the exact index — keeps the scrub
  // visually continuous while decodes catch up to fast scrolling.
  const image = getDisplayFrame(frameIndex);

  return (
    <>
      {/* ── Opaque base layer ─────────────────────────────────────────────── */}
      {/* Static first frame beneath the canvas so the section is never       */}
      {/* transparent — no page background ever shows through during the      */}
      {/* cross-section handoff (no white flash, no dark frame).              */}
      <div
        className="absolute inset-0 h-full w-full bg-cover bg-center"
        style={{ backgroundImage: "url(/sections/section-3/frame_0001.webp)" }}
      />

      {/* ── Frame sequence ────────────────────────────────────────────────── */}
      <FrameSequencePlayer image={image} fallbackSrc="/sections/section-3/frame_0001.webp" />

      {/* ── Dark overlay ──────────────────────────────────────────────────── */}
      {/* Helps the white typography stand out against bright backgrounds.    */}
      <div className="absolute inset-0 h-full w-full bg-black/40 pointer-events-none" />
    </>
  );
});
