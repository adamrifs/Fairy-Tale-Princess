import { forwardRef } from "react";
import { cn } from "@/utils";

/**
 * Full-viewport structural container a future story chapter composes a
 * "scene" inside. Carries no animation or narrative logic of its own.
 * forwardRef so it can be handed the ref useSectionAssets() returns
 * (intersection-driven auto-activation), matching its sibling containers.
 */
export const SceneContainer = forwardRef(function SceneContainer(
  { id, className, children, ...props },
  ref
) {
  return (
    <section
      ref={ref}
      id={id}
      data-scene={id}
      className={cn("relative h-dvh w-full overflow-hidden", className)}
      {...props}
    >
      {children}
    </section>
  );
});
