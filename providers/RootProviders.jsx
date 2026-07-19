"use client";

import { ThemeProvider } from "./ThemeProvider";
import { AssetProvider } from "./AssetProvider";
import { AnimationProvider } from "./AnimationProvider";
import { AudioProvider } from "./AudioProvider";
import { SmoothScrollProvider } from "./SmoothScrollProvider";

/**
 * Single entry point the root layout mounts once. Consumers should never
 * need to know the individual provider tree — new global concerns get
 * added here, not scattered across app/layout.js. AssetProvider sits
 * outermost (after ThemeProvider) since it's foundational — every future
 * scene, and AudioManager itself, resolves paths through it.
 */
export function RootProviders({ children }) {
  return (
    <ThemeProvider>
      <AssetProvider>
        <AnimationProvider>
          <AudioProvider>
            <SmoothScrollProvider>{children}</SmoothScrollProvider>
          </AudioProvider>
        </AnimationProvider>
      </AssetProvider>
    </ThemeProvider>
  );
}
