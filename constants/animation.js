/**
 * Shared animation timing so every future scene pulls from one source of
 * truth instead of hand-rolled durations/easings scattered across files.
 */

export const DURATION = {
  instant: 0.15,
  fast: 0.3,
  base: 0.6,
  slow: 1,
  cinematic: 1.8,
  text: 0.8, // StoryText fade duration — spec-exact
  transition: 1, // StoryTransition cross-section fade duration — spec-exact
};

export const EASE = {
  standard: "power2.out",
  enter: "power3.out",
  exit: "power2.in",
  smooth: "power1.inOut",
  elastic: "elastic.out(1, 0.5)",
};

// Framer Motion uses cubic-bezier arrays / named curves rather than GSAP's
// string eases, so a parallel map keeps the two libraries visually matched.
export const MOTION_EASE = {
  standard: [0.22, 1, 0.36, 1],
  enter: [0.16, 1, 0.3, 1],
  exit: [0.7, 0, 0.84, 0],
};

export const LENIS_CONFIG = {
  duration: 1.2,
  smoothWheel: true,
  syncTouch: false,
  touchMultiplier: 2,
};
