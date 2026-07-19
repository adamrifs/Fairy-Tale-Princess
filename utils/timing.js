/** Limits fn to running at most once per `wait` ms, preserving the latest call. */
export function throttle(fn, wait = 100) {
  let lastTime = 0;
  let timeoutId;

  return function throttled(...args) {
    const now = Date.now();
    const remaining = wait - (now - lastTime);

    if (remaining <= 0) {
      clearTimeout(timeoutId);
      lastTime = now;
      fn.apply(this, args);
    } else {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => {
        lastTime = Date.now();
        fn.apply(this, args);
      }, remaining);
    }
  };
}

/** Delays fn until `wait` ms have passed without another call. */
export function debounce(fn, wait = 100) {
  let timeoutId;

  return function debounced(...args) {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => fn.apply(this, args), wait);
  };
}

/** Throttles fn to once per animation frame — the correct cadence for scroll/resize handlers driving visual updates. */
export function rafThrottle(fn) {
  let frameId = null;

  return function throttled(...args) {
    if (frameId !== null) return;
    frameId = requestAnimationFrame(() => {
      frameId = null;
      fn.apply(this, args);
    });
  };
}

/**
 * requestIdleCallback with a setTimeout fallback for browsers that lack it
 * (Safari). Used to schedule non-critical work — e.g. warming the next
 * section's assets — without competing with the current section's
 * rendering for main-thread time.
 */
export function idleCallback(fn, options) {
  if (typeof window === "undefined") return null;
  if (typeof window.requestIdleCallback === "function") {
    return window.requestIdleCallback(fn, options);
  }
  return setTimeout(() => fn({ didTimeout: false, timeRemaining: () => 0 }), options?.timeout ?? 1);
}

/** Cancels a handle returned by idleCallback, matching whichever underlying API produced it. */
export function cancelIdleCallback(handle) {
  if (typeof window === "undefined" || handle === null) return;
  if (typeof window.cancelIdleCallback === "function") {
    window.cancelIdleCallback(handle);
  } else {
    clearTimeout(handle);
  }
}
