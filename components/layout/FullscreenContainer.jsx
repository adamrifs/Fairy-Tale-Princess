import { cn } from "@/utils";

/** Locks its children to exactly one viewport — the base building block for scroll-pinned scenes. */
export function FullscreenContainer({ children, className, ...props }) {
  return (
    <div className={cn("relative h-dvh w-full overflow-hidden", className)} {...props}>
      {children}
    </div>
  );
}
