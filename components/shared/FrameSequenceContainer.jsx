import { forwardRef } from "react";
import { cn } from "@/utils";

/**
 * Structural <canvas> host for future scroll-scrubbed frame-sequence
 * scenes (the "draw one frame per scroll pixel" technique). Drawing and
 * preloading logic intentionally live with the scene that owns a
 * specific frame sequence, not here.
 */
export const FrameSequenceContainer = forwardRef(function FrameSequenceContainer(
  { className, ...props },
  ref
) {
  return <canvas ref={ref} className={cn("h-full w-full", className)} {...props} />;
});
