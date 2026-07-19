/**
 * Root-level public/ path prefixes only. Per-section frame sequences,
 * videos, and music/sound registries are NOT hardcoded here — they're
 * derived automatically from public/ by scripts/generate-asset-manifest.js
 * and served through assetManager (lib/assets/AssetManager.js). Components
 * should always go through assetManager / useAssets / useFrames / useVideo
 * / useSectionAssets rather than importing paths from this file.
 */

export const ASSET_PATHS = {
  assets: "/assets/",
  sections: "/sections/",
  music: "/music/",
  sounds: "/sounds/",
  fonts: "/fonts/",
};
