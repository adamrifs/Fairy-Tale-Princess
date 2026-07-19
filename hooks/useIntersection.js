"use client";

import { useEffect, useRef, useState } from "react";

/** Observes an element's viewport intersection. Returns [ref, isIntersecting, entry]. */
export function useIntersection({ threshold = 0.2, rootMargin = "0px", once = false } = {}) {
  const ref = useRef(null);
  const [isIntersecting, setIsIntersecting] = useState(false);
  const [entry, setEntry] = useState(null);

  useEffect(() => {
    const node = ref.current;
    if (!node) return undefined;

    const observer = new IntersectionObserver(
      ([observedEntry]) => {
        setEntry(observedEntry);
        setIsIntersecting(observedEntry.isIntersecting);

        if (observedEntry.isIntersecting && once) {
          observer.disconnect();
        }
      },
      { threshold, rootMargin }
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, [threshold, rootMargin, once]);

  return [ref, isIntersecting, entry];
}
