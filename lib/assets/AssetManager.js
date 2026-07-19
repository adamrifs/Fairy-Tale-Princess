import manifest from "./manifest.json";

/**
 * Centralized, read-only asset registry. Wraps the build-time manifest
 * (regenerated from public/ by scripts/generate-asset-manifest.js on every
 * `npm run dev` / `npm run build`) so no component or manager ever
 * hardcodes a "/sections/..." path. Dropping new files into
 * public/sections, public/music, public/sounds, public/fonts or
 * public/assets is enough for them to show up here — no source changes.
 *
 * Pure data lookups only (no browser APIs), so this is safe to import
 * from anywhere, unlike the loading managers which are client-only.
 */
class AssetManager {
  constructor(data) {
    this.manifest = data;
  }

  listSections() {
    return this.manifest.sectionOrder;
  }

  hasSection(sectionId) {
    return Boolean(this.manifest.sections[sectionId]);
  }

  getSectionAssets(sectionId) {
    const section = this.manifest.sections[sectionId];
    if (!section) return null;

    return {
      id: sectionId,
      frames: section.frames,
      videos: section.videos,
      music: this.getMusic(sectionId),
    };
  }

  /** Returns one frame-sequence descriptor. Omit sceneId to get the section's first (or only) sequence. */
  getFrames(sectionId, sceneId) {
    const frames = this.manifest.sections[sectionId]?.frames;
    if (!frames) return null;

    const resolvedId = sceneId ?? Object.keys(frames)[0];
    return resolvedId && frames[resolvedId] ? { id: resolvedId, ...frames[resolvedId] } : null;
  }

  /** All frame sequences declared for a section, keyed by sceneId. */
  getFramesMap(sectionId) {
    return this.manifest.sections[sectionId]?.frames ?? {};
  }

  /** Returns one video descriptor. Omit videoId to get the section's first (or only) video. */
  getVideo(sectionId, videoId) {
    const videos = this.manifest.sections[sectionId]?.videos;
    if (!videos) return null;

    const resolvedId = videoId ?? Object.keys(videos)[0];
    return resolvedId && videos[resolvedId] ? { id: resolvedId, ...videos[resolvedId] } : null;
  }

  /** All videos declared for a section, keyed by videoId. */
  getVideosMap(sectionId) {
    return this.manifest.sections[sectionId]?.videos ?? {};
  }

  /** Ordered video ids for a section — lets VideoManager compute "the next video" generically. */
  getVideoOrder(sectionId) {
    return Object.keys(this.getVideosMap(sectionId));
  }

  getNextVideoId(sectionId, currentVideoId) {
    const order = this.getVideoOrder(sectionId);
    const index = order.indexOf(currentVideoId);
    if (index === -1) return null;
    return order[index + 1] ?? null;
  }

  /**
   * Music/sounds are id-keyed globally (public/music, public/sounds are
   * flat, not per-section). Passing a sectionId works too, by convention:
   * name a file exactly "<sectionId>.<ext>" (e.g. public/music/section-1.mp3)
   * to auto-bind it as that section's score.
   */
  getMusic(id) {
    return this.manifest.music[id] ? { id, ...this.manifest.music[id] } : null;
  }

  getSound(id) {
    return this.manifest.sounds[id] ? { id, ...this.manifest.sounds[id] } : null;
  }

  getFont(id) {
    return this.manifest.fonts[id] ? { id, ...this.manifest.fonts[id] } : null;
  }

  /** Generic, non-section assets under public/assets (icons, logos, etc). */
  getAsset(id) {
    return this.manifest.assets[id] ? { id, ...this.manifest.assets[id] } : null;
  }

  getNextSectionId(sectionId) {
    const order = this.manifest.sectionOrder;
    const index = order.indexOf(sectionId);
    if (index === -1) return null;
    return order[index + 1] ?? null;
  }

  getPreviousSectionId(sectionId) {
    const order = this.manifest.sectionOrder;
    const index = order.indexOf(sectionId);
    if (index <= 0) return null;
    return order[index - 1] ?? null;
  }
}

// Singleton — one shared registry, same rationale as audioManager.
export const assetManager = new AssetManager(manifest);
export default assetManager;
