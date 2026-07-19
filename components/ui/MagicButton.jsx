"use client";

import { forwardRef } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { cn } from "@/utils";

/**
 * Reusable CTA button with a subtle hover/tap response. Framer Motion
 * drives only this micro-interaction — never scroll-linked animation,
 * per the project's split of duties between Framer Motion and GSAP.
 */
export const MagicButton = forwardRef(function MagicButton(
  { children, className, ...props },
  ref
) {
  const shouldReduceMotion = useReducedMotion();

  return (
    <motion.button
      ref={ref}
      whileHover={shouldReduceMotion ? undefined : { scale: 1.04 }}
      whileTap={shouldReduceMotion ? undefined : { scale: 0.97 }}
      transition={{ duration: 0.2, ease: "easeOut" }}
      className={cn(
        "inline-flex items-center justify-center rounded-full border border-royal-gold bg-transparent px-8 py-3 font-sans text-sm uppercase tracking-widest text-royal-gold transition-colors hover:bg-royal-gold hover:text-midnight-blue focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-royal-gold",
        className
      )}
      {...props}
    >
      {children}
    </motion.button>
  );
});
