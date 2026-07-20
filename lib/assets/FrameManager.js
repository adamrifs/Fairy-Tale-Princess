"use client";

import { assetManager } from "./AssetManager";
import { cacheManager } from "./CacheManager";
import { mapWithConcurrency } from "@/utils/preload";

// Bounds simultaneous frame fetches. These are fetch-only (no decode), and
// Vercel serves them over HTTP/2 where requests multiplex on one connection
// and higher parallelism hides per-request CDN latency — the prior perf pass
// measured 10 beating 6 under emulated throttling.
const CONCURRENCY = 10;

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
 * Downloads one frame's COMPRESSED bytes (no decode) into the shared blob
 * cache. This is the loading-screen critical path: getting every frame's
 * bytes resident up front is what lets scroll scrubbing run entirely off
 * local memory later (see cacheManager's blob store), so the deployed
 * site scrubs as smoothly as localhost. Decode is deliberately NOT done
 * here — decoding all 593 frames to RGBA would be gigabytes; the windowed
 * loader (useWindowedFrames) decodes just the frames near the current
 * scroll position, on demand, from these already-local blobs.
 */
async function fetchFrameBlob(cacheKey, url, signal) {
  if (cacheManager.hasBlob(cacheKey)) return;
  const response = await fetch(url, { signal, cache: "force-cache" });
  if (!response.ok) throw new Error(`Failed to fetch frame: ${url}`);
  cacheManager.setBlob(cacheKey, await response.blob());
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

    // Download EVERY frame's compressed bytes up front. This is the whole
    // reason a deployed frame-scrub can be buttery smooth: once all blobs
    // are resident, scrolling never waits on the network — the windowed
    // loader just decodes from local memory (pure CPU, off-thread) the way
    // it always effectively did on localhost. We only fetch (~60-70MB for
    // 593 frames), never decode-all: decoded RGBA would be gigabytes, so
    // decoding stays windowed. The trade is a longer, honest loading bar
    // in exchange for a scrub that never streaks; on repeat visits the
    // immutable cache makes it instant.
    this.controller = new AbortController();
    const { signal } = this.controller;
    const indexes = Array.from({ length: this.count }, (_, index) => index);
    let loaded = 0;

    this.loadPromise = mapWithConcurrency(indexes, CONCURRENCY, async (index) => {
      const cacheKey = frameCacheKey(this.sectionId, this.sceneId, index);
      await fetchFrameBlob(cacheKey, resolveFrameUrl(this.descriptor, index), signal);
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
    const prefix = frameSequenceKeyPrefix(this.sectionId, this.sceneId);
    cacheManager.deleteImagesByPrefix(prefix);
    cacheManager.deleteBlobsByPrefix(prefix); // release the ~60MB of resident compressed bytes too
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
