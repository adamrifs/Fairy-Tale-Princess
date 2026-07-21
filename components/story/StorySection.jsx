"use client";

import { memo, useEffect, useRef, useState } from "react";
import { usePinnedSection } from "@/hooks/usePinnedSection";
import { useStory } from "@/hooks/useStory";
import { useScene } from "@/hooks/useScene";
import { ScrollTrigger } from "@/lib/gsap";
import { STORY_PHASE } from "@/lib/story/SceneManager";
import { StoryText } from "./StoryText";
import { StoryTransition } from "./StoryTransition";
import { SectionWrapper } from "@/components/layout/SectionWrapper";
import { cn } from "@/utils";

/**
 * One chapter of the story — the full section timeline in a single
 * reusable component:
 *
 *   Animation (unpinned scrub) -> Freeze -> Pin -> Story Text
 *   (cinematic multi-beat cycle) -> Transition into the next section.
 *
 * Callers never touch GSAP directly. Pass `texts` and a `children`
 * render-prop that draws whatever background — frame sequence, video,
 * static art, the engine doesn't know or care — using the `progress`/
 * `frame`/`phase` it's handed:
 *
 *   <StorySection id="section-1" texts={["Once upon a time...", "...", "..."]} frameCount={240}>
 *     {({ frame }) => <MyFrameCanvas frame={frame} />}
 *   </StorySection>
 *
 * Mechanics: both phases hold `stage` in place via plain CSS — the
 * animation phase via `position: sticky`, the text phase via a manually
 * toggled `position: fixed` — rather than GSAP's built-in `pin` feature.
 * GSAP's pin computes its fixed offset assuming the pinned element starts
 * in normal (non-sticky) flow; layered on top of an element that's
 * *already* being held at the viewport top by CSS sticky, that offset is
 * doubly-applied — confirmed via live browser testing, where the pin
 * consistently placed `stage` exactly `animationVh`'s worth of pixels
 * above the viewport, off-screen, every time. Driving the same "stuck at
 * top:0" visual manually from the same trigger callbacks that already
 * exist sidesteps the conflict entirely (and, as a side effect, also
 * avoids GSAP's `.pin-spacer` wrapper insertion, which happens the
 * instant a pinned trigger is *created* — even before its active range
 * begins, even with pinSpacing:false — and would otherwise leave the
 * sticky animation phase zero room to stick in, since that spacer is
 * exactly one viewport tall). The text-phase trigger is still deferred
 * until the animation phase's onLeave (`animationComplete`), and handing
 * off at the exact on-screen position sticky already had it at means the
 * last frame never jumps, restarts, or disappears. The section's own
 * height is set to exactly animationVh + textVh so the two phases' scroll
 * distance lines up with where the next <StorySection> begins, with no
 * dead gap or overlap.
 */
export const StorySection = memo(function StorySection({
  id,
  order,
  texts = [],
  frameCount = 0,
  animationVh = 250,
  textVh = 300,
  textVisibleProgress = 0.97,
  className,
  children,
}) {
  const sectionRef = useRef(null);
  const stageRef = useRef(null);
  const story = useStory();
  const scene = useScene(id);
  const totalVh = animationVh + textVh;
  const [isTextPinned, setIsTextPinned] = useState(false);
  const [isEntering, setIsEntering] = useState(false);

  useEffect(() => {
    story.registerSection(id, order);
    return () => story.unregisterSection(id);
    // story's methods are stable proxies to the sceneManager singleton;
    // only re-register if this section's own identity actually changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, order]);

  // A ScrollTrigger's `end` is computed from the document height at the
  // moment the trigger is created. For any section below the first, both of
  // its triggers (animation + text) are built at mount while this section's
  // own dvh-tall box may not yet contribute its full height, so ScrollTrigger
  // clamps `end` down toward `start` — a near-zero-length trigger that fires
  // every phase callback at a single scroll point, collapsing the section
  // (its scrub, its text pin, and its transition all misfire at once).
  // Recomputing positions on the next frame, once every section's box is laid
  // out and both triggers exist, restores the real ranges before anything is
  // scrolled into view. The rAF defer also makes this run after this commit's
  // trigger-creation effects regardless of hook order. Cheap and idempotent.
  useEffect(() => {
    const raf = requestAnimationFrame(() => ScrollTrigger.refresh());
    return () => cancelAnimationFrame(raf);
  }, []);

  usePinnedSection({
    triggerRef: sectionRef,
    pin: false,
    start: "top top",
    getDistance: () => (animationVh / 100) * window.innerHeight,
    dependencies: [id, animationVh],
    onUpdate: (self) => {
      story.setAnimationProgress(self.progress);
      story.setSectionProgress(id, (self.progress * animationVh) / totalVh);
      if (frameCount > 0) {
        story.setFrame(Math.round(self.progress * (frameCount - 1)));
      }
    },
    onEnter: () => {
      story.setActiveSection(id);
      story.setPhase(STORY_PHASE.ANIMATING);
    },
    onEnterBack: () => {
      story.setActiveSection(id);
      story.setPhase(STORY_PHASE.ANIMATING);
    },
    onLeave: () => {
      story.setPhase(STORY_PHASE.FROZEN);
    },
  });

  usePinnedSection({
    triggerRef: sectionRef,
    pin: false, // held in place manually (isTextPinned -> stage's className below), not via GSAP's pin — see file docblock
    // Created eagerly, NOT gated on animationComplete. The `enabled` gate
    // exists to defer triggers whose `pin: true` would insert a viewport-
    // tall .pin-spacer and collapse an earlier sticky phase's room to stick
    // (see usePinnedSection) — but this trigger is pin: false, so it inserts
    // no spacer and is safe to exist from mount. Deferring it meant it was
    // built lazily at the exact scroll position of its own start, mid-scroll,
    // where a one-frame stale measurement let its onLeave fire immediately
    // and strand the section in the transitioning state (its text crossfaded
    // out the instant it should have pinned). Building it up front lets the
    // post-mount ScrollTrigger.refresh position it correctly long before it's
    // scrolled into range.
    //
    // Start is expressed relative to THIS section's own top ("top top-=<one
    // animation phase's worth of scroll>") rather than by reading the
    // animation trigger's resolved `.end`. Reading the sibling trigger's
    // `.end` created a refresh-order dependency: if ScrollTrigger recomputed
    // this trigger before the animation trigger's end was corrected, the text
    // phase inherited a stale (short) start and collapsed. An element-relative
    // start resolves correctly on every refresh regardless of order, and lands
    // at exactly the same scroll position the animation phase ends.
    start: () => `top top-=${(animationVh / 100) * window.innerHeight}`,
    getDistance: () => (textVh / 100) * window.innerHeight,
    dependencies: [id, textVh, texts.length, animationVh],
    onUpdate: (self) => {
      const index = texts.length > 0 ? Math.min(texts.length - 1, Math.floor(self.progress * texts.length)) : 0;
      story.setStoryIndex(index);
      story.setSectionProgress(id, (animationVh + self.progress * textVh) / totalVh);
    },
    onEnter: () => {
      story.setPinned(true);
      setIsTextPinned(true);
      story.setPhase(STORY_PHASE.TEXT);
    },
    onEnterBack: () => {
      story.setActiveSection(id);
      story.setPinned(true);
      setIsTextPinned(true);
      // Scrolling back up into the text phase reverses the outgoing crossfade
      // — clear this section's transition so it returns to full opacity.
      story.setTransitioning(false, id);
      story.setPhase(STORY_PHASE.TEXT);
    },
    onLeave: () => {
      story.setPinned(false);
      setIsTextPinned(false);
      story.setTransitioning(true, id);
      story.setPhase(STORY_PHASE.TRANSITIONING);
    },
    onLeaveBack: () => {
      story.setPinned(false);
      setIsTextPinned(false);
    },
  });

  usePinnedSection({
    triggerRef: sectionRef,
    pin: false,
    start: "top bottom",
    getDistance: () => window.innerHeight,
    onEnter: () => setIsEntering(true),
    onLeave: () => setIsEntering(false),
    onEnterBack: () => setIsEntering(true),
    onLeaveBack: () => setIsEntering(false),
  });

  return (
    <SectionWrapper
      ref={sectionRef}
      id={id}
      style={{ height: `${totalVh}dvh` }}
      className={cn("relative", className)}
    >
      {/*
        StoryTransition wraps the CONTENT inside stage, not stage itself.
        StoryTransition sets willChange/transform for its own crossfade
        tween, and per the CSS spec any transformed (or will-change:
        transform) ancestor becomes the containing block for
        position:fixed descendants instead of the viewport. stage needs
        to pin/stick relative to the true viewport, so it must not have
        a transformed ancestor between it and the viewport — confirmed
        via live browser testing: with the nesting the other way around,
        the pinned stage's fixed-position offset tracked scroll almost
        1:1 (thousands of px off-screen) instead of holding at the
        viewport top.
      */}
      <div
        ref={stageRef}
        className={cn(
          "top-0 h-dvh w-full overflow-hidden", 
          scene.isTransitioning ? "fixed z-20 pointer-events-none" : isEntering ? "fixed z-10" : isTextPinned ? "fixed z-10" : "sticky z-10"
        )}
      >
        <StoryTransition active={scene.isTransitioning} entering={isEntering} className="absolute inset-0">
          {typeof children === "function"
            ? children({ progress: scene.animationProgress, frame: scene.frame, phase: scene.phase })
            : children}
          <StoryText texts={texts} activeIndex={scene.storyIndex} isVisible={scene.isActive && (scene.phase !== STORY_PHASE.ANIMATING || scene.animationProgress > textVisibleProgress)} />
        </StoryTransition>
      </div>
    </SectionWrapper>
  );
});
