import { cn } from "@/utils";

/**
 * Top-level page shell — wrap each route's content in this once. It
 * establishes the base background/foreground.
 *
 * Deliberately does NOT set overflow-x-hidden here even though full-bleed
 * cinematic sections are prone to horizontal scroll — body already has
 * overflow-x: hidden (app/globals.css), which propagates to the viewport
 * per the CSS root-element propagation rule (since html sets no overflow
 * of its own) and achieves the same thing. Setting it again on this
 * regular (non-root) element does NOT get that propagation special case:
 * per spec, giving only one overflow axis a non-visible value forces the
 * other axis to compute as `auto` too, turning <main> into a genuine
 * (if invisible) scroll container — which silently breaks
 * `position: sticky` for every descendant, including the Story Engine's
 * pinned sections. Confirmed via live browser testing: with this class
 * present, a sticky element's getBoundingClientRect().top tracked scroll
 * position 1:1 (never actually stuck) despite getComputedStyle still
 * reporting `position: sticky`.
 */
export function PageWrapper({ children, className, ...props }) {
  return (
    <main
      className={cn("relative min-h-dvh w-full bg-midnight-blue text-moon-white", className)}
      {...props}
    >
      {children}
    </main>
  );
}
