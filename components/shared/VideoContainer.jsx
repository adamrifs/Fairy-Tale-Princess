import { forwardRef } from "react";
import { cn } from "@/utils";

/** Structural <video> wrapper with sensible cinematic defaults. Src, autoplay and business logic are the caller's responsibility. */
export const VideoContainer = forwardRef(function VideoContainer({ className, ...props }, ref) {
  return (
    <video
      ref={ref}
      playsInline
      muted
      preload="none"
      className={cn("h-full w-full object-cover", className)}
      {...props}
    />
  );
});
