"use client";

import { assetManager } from "./AssetManager";
import { memoryManager } from "./MemoryManager";

/**
 * Global, section-driven preload orchestrator. Deliberately a plain
 * singleton (not a hook) so anything outside React — scroll handlers,
 * GSAP ScrollTrigger callbacks — can drive it too; usePreloader()
 * (hooks/usePreloader.js) subscribes it into component state, the same
 * pattern AudioProvider uses to bridge audioManager.
 */
class Preloader {
  constructor() {
    this.currentSectionId = null;
    this.nextSectionId = null;
    this.progress = 0; // 0-1 load progress of the *current* section
    this.loadedSectionIds = new Set();
    this.listeners = new Set();
  }

  get percentage() {
    return Math.round(this.progress * 100);
  }

  get isLoaded() {
    return this.currentSectionId !== null && this.loadedSectionIds.has(this.currentSectionId);
  }

  getSnapshot() {
    return {
      currentSectionId: this.currentSectionId,
      nextSectionId: this.nextSectionId,
      progress: this.progress,
      percentage: this.percentage,
      isLoaded: this.isLoaded,
      loadedSectionIds: Array.from(this.loadedSectionIds),
      remainingSectionIds: assetManager.listSections().filter((id) => !this.loadedSectionIds.has(id)),
    };
  }

  subscribe(listener) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  notify() {
    this.listeners.forEach((listener) => listener(this.getSnapshot()));
  }

  /** Points the preloader at a new active section — the single entry point scroll/navigation code calls. */
  async setActiveSection(sectionId) {
    if (!assetManager.hasSection(sectionId) || this.currentSectionId === sectionId) return;

    this.currentSectionId = sectionId;
    this.nextSectionId = assetManager.getNextSectionId(sectionId);
    this.progress = this.loadedSectionIds.has(sectionId) ? 1 : 0;
    this.notify();

    await memoryManager.setActiveSection(sectionId, {
      onProgress: (ratio) => {
        this.progress = ratio;
        this.notify();
      },
    });

    this.loadedSectionIds.add(sectionId);
    this.progress = 1;
    this.notify();
  }

  /** Preloads the very first section ahead of any scroll/navigation — call once on app mount. */
  preloadInitial() {
    const [firstSectionId] = assetManager.listSections();
    return firstSectionId ? this.setActiveSection(firstSectionId) : Promise.resolve();
  }
}

export const preloader = new Preloader();
export default preloader;
