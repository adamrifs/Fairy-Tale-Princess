"use client";

import { assetManager } from "./AssetManager";
import { cacheManager } from "./CacheManager";

function videoKey(sectionId, videoId) {
  return `${sectionId}:${videoId}`;
}

function createPooledElement(src) {
  const video = document.createElement("video");
  video.preload = "auto";
  video.muted = true;
  video.playsInline = true;
  video.src = src;
  return video;
}

/**
 * Pools one hidden <video> per (sectionId, videoId) purely to force the
 * browser to fetch/buffer it ahead of time. A scene renders its own
 * on-screen <video> (components/shared/VideoContainer) with `src` read
 * from getSrc()/useVideo() — the browser's HTTP cache then serves that
 * request instantly because this pooled element already warmed it.
 * getElement() is also exposed for a scene that wants to adopt the
 * already-buffered element directly instead of relying on cache reuse.
 */
class VideoManager {
  constructor() {
    this.loadPromises = new Map();
  }

  getSrc(sectionId, videoId) {
    return assetManager.getVideo(sectionId, videoId)?.path ?? null;
  }

  getElement(sectionId, videoId) {
    return cacheManager.getVideo(videoKey(sectionId, videoId));
  }

  isLoaded(sectionId, videoId) {
    const element = this.getElement(sectionId, videoId);
    return Boolean(element && element.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA);
  }

  preloadVideo(sectionId, videoId) {
    const key = videoKey(sectionId, videoId);
    if (cacheManager.hasVideo(key)) return Promise.resolve(this.getElement(sectionId, videoId));
    if (this.loadPromises.has(key)) return this.loadPromises.get(key);

    const src = this.getSrc(sectionId, videoId);
    if (!src) return Promise.resolve(null);

    const promise = new Promise((resolve, reject) => {
      const element = createPooledElement(src);

      const cleanup = () => {
        element.removeEventListener("loadeddata", handleLoaded);
        element.removeEventListener("error", handleError);
      };
      const handleLoaded = () => {
        cleanup();
        cacheManager.setVideo(key, element);
        resolve(element);
      };
      const handleError = () => {
        cleanup();
        reject(new Error(`Failed to preload video: ${src}`));
      };

      element.addEventListener("loadeddata", handleLoaded);
      element.addEventListener("error", handleError);
      element.load();
    }).finally(() => {
      this.loadPromises.delete(key);
    });

    this.loadPromises.set(key, promise);
    return promise;
  }

  /** Preloads `videoId` now and warms whichever video comes next in this section's manifest order — never the whole list. */
  async setActiveVideo(sectionId, videoId) {
    const nextVideoId = assetManager.getNextVideoId(sectionId, videoId);
    const keep = new Set([videoId, nextVideoId].filter(Boolean));

    assetManager
      .getVideoOrder(sectionId)
      .filter((id) => !keep.has(id))
      .forEach((id) => this.disposeVideo(sectionId, id));

    const current = await this.preloadVideo(sectionId, videoId);
    if (nextVideoId) this.preloadVideo(sectionId, nextVideoId); // fire-and-forget, low priority
    return current;
  }

  pauseVideo(sectionId, videoId) {
    this.getElement(sectionId, videoId)?.pause();
  }

  resumeVideo(sectionId, videoId) {
    this.getElement(sectionId, videoId)?.play().catch(() => {});
  }

  disposeVideo(sectionId, videoId) {
    const key = videoKey(sectionId, videoId);
    this.loadPromises.delete(key);
    cacheManager.deleteVideo(key);
  }

  disposeSectionVideos(sectionId) {
    Object.keys(assetManager.getVideosMap(sectionId)).forEach((videoId) =>
      this.disposeVideo(sectionId, videoId)
    );
  }
}

export const videoManager = new VideoManager();
export default videoManager;
