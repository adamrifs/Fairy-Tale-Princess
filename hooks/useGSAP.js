"use client";

import { useEffect, useRef } from "react";
import { gsap } from "@/lib/gsap";

/**
 * Runs `callback` inside a gsap.context() scoped to `scope` (a ref or
 * selector string), auto-reverting every tween/ScrollTrigger it creates on
 * unmount or when `dependencies` change. This is the sanctioned way to
 * write GSAP animations in this codebase — it's what prevents leaked
 * ScrollTriggers when scenes mount/unmount during scroll.
 */
export function useGSAP(callback, { scope, dependencies = [] } = {}) {
  const scopeRef = useRef(scope);
  scopeRef.current = scope;
  const callbackRef = useRef(callback);
  callbackRef.current = callback;

  useEffect(() => {
    const ctx = gsap.context(() => {
      callbackRef.current?.(gsap);
    }, scopeRef.current);

    return () => ctx.revert();
    // dependencies is caller-controlled, mirroring gsap's own useGSAP hook
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, dependencies);
}
