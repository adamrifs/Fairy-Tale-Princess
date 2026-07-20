"use client";

import { memo, useRef } from "react";
import { gsap } from "@/lib/gsap";
import { useGSAP } from "@/hooks/useGSAP";
import { useAnimationContext } from "@/providers/AnimationProvider";
import { DURATION, EASE } from "@/constants";
import { cn } from "@/utils";

/**
 * Cinematic text cycle for a pinned story section: pass ["Text One",
 * "Text Two", "Text Three"] (or `{ heading, subtitle }` objects) and this
 * handles the rest. Every text is always mounted, stacked on top of each
 * other in the bottom third of the screen, and GSAP tweens each one to
 * its target state (visible vs hidden) whenever `activeIndex`/`isVisible`
 * change — nothing is ever removed or instantly swapped, so text always
 * crossfades, never jump-cuts.
 *
 * Reactive props, not an imperative ref API: activeIndex only changes a
 * handful of times per section (never per scroll pixel), so plain
 * useGSAP-on-dependency-change is precise enough and stays consistent
 * with the rest of the engine's reactive style.
 */
export const StoryText = memo(function StoryText({
  texts = [],
  activeIndex = 0,
  isVisible = true,
  className,
}) {
  const itemRefs = useRef([]);
  const { reducedMotion } = useAnimationContext();

  useGSAP(
    () => {
      texts.forEach((_, index) => {
        const el = itemRefs.current[index];
        if (!el) return;

        const isCurrent = isVisible && index === activeIndex;
        const targetY = isCurrent ? 0 : index < activeIndex ? -30 : 40;

        if (reducedMotion) {
          gsap.set(el, { opacity: isCurrent ? 1 : 0, y: targetY });
          return;
        }

        gsap.to(el, {
          opacity: isCurrent ? 1 : 0,
          y: targetY,
          duration: DURATION.text,
          ease: isCurrent ? EASE.enter : EASE.exit,
          overwrite: "auto",
        });
      });
    },
    { dependencies: [activeIndex, isVisible, reducedMotion, texts.length] }
  );

  if (texts.length === 0) return null;

  return (
    <div
      className={cn(
        "pointer-events-none absolute inset-0 z-[var(--z-story)] flex flex-col items-center justify-center px-6",
        className
      )}
    >
      {texts.map((text, index) => {
        const heading = typeof text === "string" ? text : text.heading;
        const subtitle = typeof text === "string" ? null : text.subtitle;

        return (
          <div
            key={index}
            ref={(el) => {
              itemRefs.current[index] = el;
            }}
            className="absolute inset-0 m-auto flex h-fit max-w-5xl flex-col items-center justify-center px-4 text-center opacity-0"
            style={{ transform: "translateY(40px)", willChange: "transform, opacity" }}
          >
            <h2 className="text-balance font-display bg-gradient-to-b from-[#fffae6] via-[#ffd066] to-[#b8860b] bg-clip-text text-transparent text-5xl sm:text-6xl md:text-7xl lg:text-[5.5rem] xl:text-[6.5rem] leading-[1.1] tracking-wide font-normal drop-shadow-[0_4px_24px_rgba(0,0,0,0.85)] py-2">
              {heading}
            </h2>
            {subtitle && (
              <p className="mt-6 max-w-4xl text-balance font-serif italic text-xl md:text-2xl lg:text-3xl font-normal leading-[1.8] tracking-widest text-[#fffdf0] drop-shadow-[0_4px_16px_rgba(0,0,0,0.95)] opacity-90">
                {subtitle}
              </p>
            )}
          </div>
        );
      })}
    </div>
  );
});
