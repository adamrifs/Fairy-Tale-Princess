"use client";

import { assetManager } from "./AssetManager";
import { frameManager } from "./FrameManager";
import { videoManager } from "./VideoManager";
import { cacheManager } from "./CacheManager";
import { idleCallback } from "@/utils/timing";

/**
 * Owns the "what's currently allowed to sit in memory" policy. Everything
 * else (FrameManager, VideoManager, CacheManager) just does what it's
 * told; this is the only place that decides a section's assets should be
 * evicted. Policy: keep the current section and the next one resident,
 * unload everything else — matching "when leaving Section 1, unload
 * Section 1, keep Section 2 and Section 3" once Section 2 becomes active.
 */
class MemoryManager {
  constructor() {
    this.residentSectionIds = new Set();
  }

  /** Loads a section's frames (blocking) and its first/next video (fire-and-forget) and marks it resident. */
  async loadSection(sectionId, { onProgress } = {}) {
    if (!assetManager.hasSection(sectionId)) return;
    this.residentSectionIds.add(sectionId);

    const [firstVideoId] = assetManager.getVideoOrder(sectionId);
    const tasks = [frameManager.loadSectionFrames(sectionId, { onProgress })];
    if (firstVideoId) tasks.push(videoManager.setActiveVideo(sectionId, firstVideoId));

    await Promise.all(tasks);
  }

  unloadSection(sectionId) {
    frameManager.disposeSectionFrames(sectionId);
    videoManager.disposeSectionVideos(sectionId);
    this.residentSectionIds.delete(sectionId);
  }

  /**
   * Applies the current+next residency window: the current section loads
   * immediately (its progress drives `onProgress`), the next section warms
   * in the background via requestIdleCallback so it never competes with
   * the current section's critical-path load, and anything outside that
   * window is unloaded up front to free memory before spending it again.
   */
  setActiveSection(sectionId, { onProgress } = {}) {
    const nextSectionId = assetManager.getNextSectionId(sectionId);
    const keep = new Set([sectionId, nextSectionId].filter(Boolean));

    for (const residentId of this.residentSectionIds) {
      if (!keep.has(residentId)) this.unloadSection(residentId);
    }

    const currentLoad = this.loadSection(sectionId, { onProgress });

    if (nextSectionId && !this.residentSectionIds.has(nextSectionId)) {
      idleCallback(() => this.loadSection(nextSectionId));
    }

    return currentLoad;
  }

  getStats() {
    return {
      residentSectionIds: Array.from(this.residentSectionIds),
      cache: cacheManager.getStats(),
    };
  }

  /** Full teardown — only for app unmount/hard navigation, mirrors AudioManager.destroy(). */
  destroy() {
    Array.from(this.residentSectionIds).forEach((sectionId) => this.unloadSection(sectionId));
    cacheManager.clear();
  }
}

export const memoryManager = new MemoryManager();
export default memoryManager;
