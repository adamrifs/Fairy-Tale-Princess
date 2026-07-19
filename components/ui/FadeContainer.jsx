"use client";

import { motion, useReducedMotion } from "framer-motion";
import { MOTION_EASE } from "@/constants";
import { cn } from "@/utils";

/**
 * Generic fade/rise-in-on-view wrapper for UI chrome (copy blocks, cards,
 * buttons). Not for cinematic scroll-scrubbed animation — that belongs to
 * GSAP/ScrollTrigger inside a scene, per the project's animation split.
 */
export function FadeContainer({
  children,
  className,
  y = 24,
  duration = 0.8,
  delay = 0,
  once = true,
  ...props
}) {
  const shouldReduceMotion = useReducedMotion();

  return (
    <motion.div
      initial={shouldReduceMotion ? false : { opacity: 0, y }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once, amount: 0.3 }}
      transition={{ duration, delay, ease: MOTION_EASE.enter }}
      className={cn(className)}
      {...props}
    >
      {children}
    </motion.div>
  );
}
