"use client";

import { memo, useEffect, useRef, useState } from "react";
import { usePinnedSection } from "@/hooks/usePinnedSection";
import { useStory } from "@/hooks/useStory";
import { useScene } from "@/hooks/useScene";
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
  const [animationComplete, setAnimationComplete] = useState(false);
  const [isTextPinned, setIsTextPinned] = useState(false);

  useEffect(() => {
    story.registerSection(id, order);
    return () => story.unregisterSection(id);
    // story's methods are stable proxies to the sceneManager singleton;
    // only re-register if this section's own identity actually changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, order]);

  const animTriggerRef = usePinnedSection({
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
      setAnimationComplete(false);
    },
    onLeave: () => {
      story.setPhase(STORY_PHASE.FROZEN);
      setAnimationComplete(true);
    },
  });

  usePinnedSection({
    triggerRef: sectionRef,
    pin: false, // held in place manually (isTextPinned -> stage's className below), not via GSAP's pin — see file docblock
    enabled: animationComplete,
    start: () => animTriggerRef.current?.end ?? 0,
    getDistance: () => (textVh / 100) * window.innerHeight,
    dependencies: [id, textVh, texts.length],
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
      story.setPinned(true);
      setIsTextPinned(true);
      story.setPhase(STORY_PHASE.TEXT);
    },
    onLeave: () => {
      story.setPinned(false);
      setIsTextPinned(false);
      story.setTransitioning(true);
      story.setPhase(STORY_PHASE.TRANSITIONING);
    },
    onLeaveBack: () => {
      story.setPinned(false);
      setIsTextPinned(false);
    },
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
        className={cn("top-0 h-dvh w-full overflow-hidden", isTextPinned ? "fixed" : "sticky")}
      >
        <StoryTransition active={scene.isTransitioning} className="absolute inset-0">
          {typeof children === "function"
            ? children({ progress: scene.animationProgress, frame: scene.frame, phase: scene.phase })
            : children}
          <StoryText texts={texts} activeIndex={scene.storyIndex} isVisible={scene.phase !== STORY_PHASE.ANIMATING || scene.animationProgress > textVisibleProgress} />
        </StoryTransition>
      </div>
    </SectionWrapper>
  );
});
