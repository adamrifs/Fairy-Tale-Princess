import { forwardRef } from "react";
import { cn } from "@/utils";

/**
 * Generic full-width section. Future story chapters compose their scenes
 * inside one of these per chapter. forwardRef so scroll-driven code (the
 * Story Engine's ScrollTrigger) can attach directly to the rendered node.
 */
export const SectionWrapper = forwardRef(function SectionWrapper(
  { as: Tag = "section", id, className, children, ...props },
  ref
) {
  return (
    <Tag ref={ref} id={id} className={cn("relative w-full", className)} {...props}>
      {children}
    </Tag>
  );
});
