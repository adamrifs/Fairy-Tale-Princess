"use client";

import { assetManager } from "./AssetManager";
import { cacheManager } from "./CacheManager";
import { mapWithConcurrency } from "@/utils/preload";

const CONCURRENCY = 6; // bounds simultaneous frame fetches so one sequence's load can't saturate the network

function frameCacheKey(sectionId, sceneId, index) {
  return `${sectionId}:${sceneId}:${index}`;
}

function frameSequenceKeyPrefix(sectionId, sceneId) {
  return `${sectionId}:${sceneId}:`;
}

/** Builds a frame's URL from its manifest descriptor — either the compact "<prefix><padded>.<ext>" formula or an explicit filename list. */
function resolveFrameUrl(descriptor, index) {
  if (descriptor.files) return `${descriptor.path}${descriptor.files[index]}`;
  const frameNumber = String(index + 1).padStart(descriptor.padding, "0");
  return `${descriptor.path}${descriptor.prefix}${frameNumber}.${descriptor.extension}`;
}

/**
 * Decodes one frame. createImageBitmap decodes off the main thread and
 * avoids the double-buffering HTMLImageElement incurs, so it's preferred
 * wherever available; Image + decode() is the fallback for browsers
 * without it.
 */
async function decodeImage(url, signal) {
  if (typeof createImageBitmap === "function") {
    const response = await fetch(url, { signal });
    if (!response.ok) throw new Error(`Failed to fetch frame: ${url}`);
    const blob = await response.blob();
    return createImageBitmap(blob);
  }

  const img = new Image();
  img.decoding = "async";
  img.src = url;
  await img.decode();
  return img;
}

/**
 * One frame sequence's loading state. Decoded frames are stored in
 * cacheManager rather than a private array, so MemoryManager can evict
 * them without going through this instance, and re-loading after a
 * dispose is just calling loadFrames() again.
 */
class FrameSequence {
  constructor(sectionId, sceneId, descriptor) {
    this.sectionId = sectionId;
    this.sceneId = sceneId;
    this.descriptor = descriptor;
    this.count = descriptor.count;
    this.isLoaded = this.count === 0;
    this.loadPromise = null;
    this.controller = null;
  }

  getFrame(index) {
    if (index < 0 || index >= this.count) return null;
    return cacheManager.getImage(frameCacheKey(this.sectionId, this.sceneId, index));
  }

  isFrameLoaded(index) {
    return cacheManager.hasImage(frameCacheKey(this.sectionId, this.sceneId, index));
  }

  loadFrames({ onProgress } = {}) {
    if (this.isLoaded) return Promise.resolve();
    if (this.loadPromise) return this.loadPromise;

    // Sequences past this size (like section 1's 1185 frames) are too large
    // to bulk-preload entirely without causing an OOM or burning bandwidth.
    // However, to ensure a smooth start and a satisfying loading bar experience,
    // we will explicitly preload just the first 60 frames of these massive sequences.
    const PRELOAD_LIMIT = 60;
    const framesToLoad = this.count > 300 ? Math.min(this.count, PRELOAD_LIMIT) : this.count;

    this.controller = new AbortController();
    const { signal } = this.controller;
    const indexes = Array.from({ length: framesToLoad }, (_, index) => index);
    let loaded = 0;

    this.loadPromise = mapWithConcurrency(indexes, CONCURRENCY, async (index) => {
      const cacheKey = frameCacheKey(this.sectionId, this.sceneId, index);
      if (!cacheManager.hasImage(cacheKey)) {
        const bitmap = await decodeImage(resolveFrameUrl(this.descriptor, index), signal);
        cacheManager.setImage(cacheKey, bitmap);
      }
      loaded += 1;
      onProgress?.(loaded / framesToLoad, loaded, framesToLoad);
    })
      .then(() => {
        this.isLoaded = true;
      })
      .catch((error) => {
        this.loadPromise = null; // allow a retry on the next loadFrames() call
        if (error.name !== "AbortError") throw error;
      });

    return this.loadPromise;
  }

  disposeFrames() {
    this.controller?.abort();
    this.controller = null;
    this.loadPromise = null;
    this.isLoaded = this.count === 0;
    cacheManager.deleteImagesByPrefix(frameSequenceKeyPrefix(this.sectionId, this.sceneId));
  }
}

/**
 * Registry of FrameSequence instances, one per (sectionId, sceneId) pair,
 * built lazily from AssetManager's manifest. Mirrors VideoManager's
 * pooling shape: callers ask for a section/scene and always get back the
 * same instance.
 */
class FrameManager {
  constructor() {
    this.sequences = new Map();
  }

  getSequence(sectionId, sceneId) {
    const resolvedSceneId = sceneId ?? Object.keys(assetManager.getFramesMap(sectionId))[0];
    if (!resolvedSceneId) return null;

    const key = `${sectionId}:${resolvedSceneId}`;
    if (this.sequences.has(key)) return this.sequences.get(key);

    const descriptor = assetManager.getFrames(sectionId, resolvedSceneId);
    if (!descriptor) return null;

    const sequence = new FrameSequence(sectionId, resolvedSceneId, descriptor);
    this.sequences.set(key, sequence);
    return sequence;
  }

  loadFrames(sectionId, sceneId, options) {
    const sequence = this.getSequence(sectionId, sceneId);
    return sequence ? sequence.loadFrames(options) : Promise.resolve();
  }

  getFrame(sectionId, sceneId, index) {
    return this.getSequence(sectionId, sceneId)?.getFrame(index) ?? null;
  }

  getFrameCount(sectionId, sceneId) {
    return this.getSequence(sectionId, sceneId)?.count ?? 0;
  }

  isLoaded(sectionId, sceneId) {
    return this.getSequence(sectionId, sceneId)?.isLoaded ?? false;
  }

  disposeFrames(sectionId, sceneId) {
    this.getSequence(sectionId, sceneId)?.disposeFrames();
  }

  /** Loads every frame sequence declared for a section — the unit MemoryManager reasons about. */
  loadSectionFrames(sectionId, { onProgress } = {}) {
    const sceneIds = Object.keys(assetManager.getFramesMap(sectionId));
    if (sceneIds.length === 0) return Promise.resolve();

    const progressBySceneId = new Map(sceneIds.map((id) => [id, 0]));
    const reportProgress = () => {
      if (!onProgress) return;
      const sum = Array.from(progressBySceneId.values()).reduce((a, b) => a + b, 0);
      onProgress(sum / sceneIds.length);
    };

    return Promise.all(
      sceneIds.map((sceneId) =>
        this.loadFrames(sectionId, sceneId, {
          onProgress: (ratio) => {
            progressBySceneId.set(sceneId, ratio);
            reportProgress();
          },
        })
      )
    );
  }

  disposeSectionFrames(sectionId) {
    Object.keys(assetManager.getFramesMap(sectionId)).forEach((sceneId) => {
      this.disposeFrames(sectionId, sceneId);
    });
  }
}

export const frameManager = new FrameManager();
export default frameManager;
