"use client";

import dynamic from "next/dynamic";
import { StoryProvider } from "@/providers/StoryProvider";
import { cn } from "@/utils";

// StoryProgress is a pure client-side navigational overlay (reads scroll
// state, drives Lenis) with zero SEO/content value and no reason to block
// or appear in the initial server-rendered payload — a genuine dynamic-
// import candidate, unlike StoryText/StoryTransition which wrap real
// section content and should render up front.
const StoryProgress = dynamic(() => import("./StoryProgress").then((mod) => mod.StoryProgress), {
  ssr: false,
});

/**
 * Entry point for the whole story — wrap every <StorySection> chapter in
 * one of these. Owns StoryProvider (scoped to the story content, not
 * app-global) and mounts the chapter-progress indicator by default, so a
 * future prompt only needs:
 *
 *   <StoryLayout>
 *     <StorySection id="section-1" texts={[...]}>...</StorySection>
 *     <StorySection id="section-2" texts={[...]}>...</StorySection>
 *   </StoryLayout>
 *
 * and registration, pinning, text, and transitions all wire up on their own.
 */
export function StoryLayout({ children, className, showProgress = true }) {
  return (
    <StoryProvider>
      <div className={cn("relative w-full", className)}>
        {children}
        {/* {showProgress && <StoryProgress />} */}
      </div>
    </StoryProvider>
  );
}
