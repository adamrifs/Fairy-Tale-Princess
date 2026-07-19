/**
 * Breakpoints mirror Tailwind's default scale so JS-side media queries
 * (useMedia, useViewport) stay in sync with CSS utility breakpoints.
 */

export const BREAKPOINTS = {
  mobile: 0,
  tablet: 768,
  laptop: 1024,
  desktop: 1440,
  ultrawide: 1920,
};

export const MEDIA_QUERIES = {
  tablet: `(min-width: ${BREAKPOINTS.tablet}px)`,
  laptop: `(min-width: ${BREAKPOINTS.laptop}px)`,
  desktop: `(min-width: ${BREAKPOINTS.desktop}px)`,
  ultrawide: `(min-width: ${BREAKPOINTS.ultrawide}px)`,
  reducedMotion: "(prefers-reduced-motion: reduce)",
  touch: "(hover: none) and (pointer: coarse)",
};
