"use client";

import { useEffect, useState } from "react";
import { rafThrottle } from "@/utils";

/** Tracks window dimensions, throttled to one update per animation frame. */
export function useResize() {
  const [size, setSize] = useState({ width: 0, height: 0 });

  useEffect(() => {
    const updateSize = () =>
      setSize({ width: window.innerWidth, height: window.innerHeight });

    updateSize();

    const handleResize = rafThrottle(updateSize);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  return size;
}
