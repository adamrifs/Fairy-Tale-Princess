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

    // Sequences past this size (section 1's 1185-frame flat sequence, the
    // only current case) are loaded exclusively by useWindowedFrames — a
    // sliding decode window keyed off actual scroll position, not a bulk
    // preload. Decoding/caching all of them here would be an instant OOM
    // (1185 × ~8MB decoded ≈ 9GB); even just network-fetching them all in
    // the background — a previous version of this method did that, to
    // warm the browser's HTTP cache — competes for bandwidth with the
    // sliding window's own fetches during real scrolling and contributed
    // to observed scroll lag with no upside, since nothing here ever
    // reads that warmed cache. Resolving instantly is intentional, not a
    // placeholder: there is nothing productive for the bulk path to do
    // for a sequence this size.
    if (this.count > 300) {
      this.isLoaded = true;
      onProgress?.(1, this.count, this.count);
      return Promise.resolve();
    }

    this.controller = new AbortController();
    const { signal } = this.controller;
    const indexes = Array.from({ length: this.count }, (_, index) => index);
    let loaded = 0;

    this.loadPromise = mapWithConcurrency(indexes, CONCURRENCY, async (index) => {
      const cacheKey = frameCacheKey(this.sectionId, this.sceneId, index);
      if (!cacheManager.hasImage(cacheKey)) {
        const bitmap = await decodeImage(resolveFrameUrl(this.descriptor, index), signal);
        cacheManager.setImage(cacheKey, bitmap);
      }
      loaded += 1;
      onProgress?.(loaded / this.count, loaded, this.count);
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
