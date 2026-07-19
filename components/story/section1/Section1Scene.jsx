"use client";

import { memo, useEffect, useRef, useState } from "react";
import { useWindowedFrames } from "@/hooks/useWindowedFrames";
import { FrameSequencePlayer } from "./FrameSequencePlayer";
import { SECTION1_ID, SECTION1_SCENE_ID } from "@/data/story/section1";

/**
 * Fraction of the section's animation progress over which the dissolve occurs.
 * At animationVh=600: 0.03 → ~18vh of scroll for the full dissolve.
 * Keeping it short makes it feel snappy rather than a long fade.
 */
const TRANSITION_RANGE = 0.03;

/**
 * Fraction of the section's animation progress over which the end video
 * dissolves in. Fades in during the final 3% of the scroll.
 */
const END_TRANSITION_RANGE = 0.03;

/**
 * Background renderer for Section 1.
 *
 * Phase 1 — Landing (progress ≈ 0):
 *   A looping video (landingFrame.mp4) plays fullscreen. Frame loading begins
 *   in the background so frames are ready when the crossfade starts.
 *
 * Phase 2 — Crossfade (progress: 0 → TRANSITION_RANGE):
 *   Video fades out while the frame sequence fades in over ~24vh of scroll.
 *   Both layers are composited simultaneously via their `opacity` styles.
 *
 * Phase 3 — Frame scrub (progress > TRANSITION_RANGE):
 *   Video is fully hidden (and paused to free CPU). Frame sequence is fully
 *   opaque and responds 1:1 with scroll position.
 */
export const Section1Scene = memo(function Section1Scene({ progress = 0 }) {
  const { count, getDisplayFrame, loadWindow } = useWindowedFrames(SECTION1_ID, SECTION1_SCENE_ID);
  const videoRef = useRef(null);
  const [isInView, setIsInView] = useState(false);

  // Dissolve: the video stays at opacity 1 as a solid base layer.
  // Only the frame sequence fades IN on top of it — no white background
  // ever shows through because the video is always fully covering it.
  const frameOpacity = Math.min(1, Math.max(0, progress) / TRANSITION_RANGE);
  // Once the frame is fully on top, the landing video is hidden behind it — pause it.
  const videoActive = frameOpacity < 1;

  // End dissolve: fades in hallStill.mp4 over the final END_TRANSITION_RANGE
  const endVideoOpacity = Math.min(
    1, 
    Math.max(0, progress - (1 - END_TRANSITION_RANGE)) / END_TRANSITION_RANGE
  );
  const endVideoActive = endVideoOpacity > 0;

  const frameIndex = count > 0
    ? Math.round(Math.min(Math.max(progress, 0), 1) * (count - 1))
    : 0;

  // Track viewport intersection
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const observer = new IntersectionObserver(([entry]) => {
      setIsInView(entry.isIntersecting);
    }, { threshold: 0.1 });

    observer.observe(video);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    if (!videoActive || !isInView) {
      video.pause();
    } else if (video.paused) {
      video.play().catch(() => {});
    }
  }, [videoActive, isInView]);

  // Pause the end video until it starts becoming visible
  const endVideoRef = useRef(null);
  useEffect(() => {
    const video = endVideoRef.current;
    if (!video) return;
    if (!endVideoActive) {
      video.pause();
    } else if (video.paused) {
      video.play().catch(() => {});
    }
  }, [endVideoActive]);

  // Seed the initial window on mount — frames start loading while the video
  // is playing so they're ready the moment the crossfade begins.
  useEffect(() => {
    loadWindow(0);
    // loadWindow is stable (useCallback); only run once on mount.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Advance the sliding window as the user scrolls through the frame sequence.
  const lastIndexRef = useRef(-1);
  useEffect(() => {
    if (frameIndex !== lastIndexRef.current) {
      lastIndexRef.current = frameIndex;
      loadWindow(frameIndex);
    }
  }, [frameIndex, loadWindow]);

  // Nearest decoded frame, not strictly the exact index — keeps the
  // scrub visually continuous while 4K decodes catch up to fast scrolling
  // instead of freezing on an old frame and jump-cutting (the "hang").
  const image = getDisplayFrame(frameIndex);

  return (
    <>
      {/* ── Layer 1: Landing video ───────────────────────────────────────── */}
      {/* Always fully opaque — acts as a solid backdrop so the dissolve     */}
      {/* never exposes the page background (no white flash).                */}
      <video
        ref={videoRef}
        src="/sections/landingFrame.mp4"
        loop
        muted
        playsInline
        poster="/sections/section-1/frame_0001.webp"
        className="absolute inset-0 h-full w-full object-cover"
      />

      {/* ── Layer 2: Frame sequence ───────────────────────────────────────── */}
      {/* Dissolves in on top of the video — opacity 0→1 over TRANSITION_RANGE */}
      <div
        className="absolute inset-0 h-full w-full"
        style={{
          opacity: frameOpacity,
          willChange: frameOpacity > 0 && frameOpacity < 1 ? "opacity" : "auto",
        }}
      >
        <FrameSequencePlayer image={image} />
      </div>

      {/* ── Layer 3: End video ───────────────────────────────────────────── */}
      {/* Dissolves in at the very end to act as the final resting background */}
      <video
        ref={endVideoRef}
        src="/sections/hallStill.mp4"
        loop
        muted
        playsInline
        className="absolute inset-0 h-full w-full object-cover"
        style={{
          opacity: endVideoOpacity,
          willChange: endVideoOpacity > 0 && endVideoOpacity < 1 ? "opacity" : "auto",
        }}
      />

      {/* ── Layer 4: Dark Overlay ────────────────────────────────────────── */}
      {/* Helps the white typography stand out against bright fairytale backgrounds */}
      <div className="absolute inset-0 h-full w-full bg-black/40 pointer-events-none" />
    </>
  );
});
