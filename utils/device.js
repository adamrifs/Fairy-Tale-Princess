/** All checks guard against SSR — these must only report real values in the browser. */

export function isBrowser() {
  return typeof window !== "undefined";
}

export function isTouchDevice() {
  if (!isBrowser()) return false;
  return "ontouchstart" in window || navigator.maxTouchPoints > 0;
}

export function isIOS() {
  if (!isBrowser()) return false;
  return /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
}

export function isSafari() {
  if (!isBrowser()) return false;
  return /^((?!chrome|android).)*safari/i.test(navigator.userAgent);
}

export function prefersReducedMotion() {
  if (!isBrowser()) return false;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

export function getDevicePixelRatio() {
  if (!isBrowser()) return 1;
  return clampDpr(window.devicePixelRatio || 1);
}

// Caps DPR at 2 — rendering frame sequences/canvases at 3x on high-density
// displays burns GPU budget for a visual gain nobody notices.
function clampDpr(dpr) {
  return Math.min(dpr, 2);
}
