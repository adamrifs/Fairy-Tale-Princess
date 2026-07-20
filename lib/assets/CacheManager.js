const DEFAULT_MAX_BYTES = 256 * 1024 * 1024; // soft budget — decoded frame bitmaps dominate resident memory

/** Approximates a decoded image's in-memory footprint as uncompressed RGBA. */
function estimateImageBytes(image) {
  const width = image.width ?? image.naturalWidth ?? 0;
  const height = image.height ?? image.naturalHeight ?? 0;
  return width * height * 4;
}

/**
 * Single resident-memory ledger for decoded frame images and buffered
 * videos. FrameManager and VideoManager store into this rather than
 * keeping private caches of their own, so:
 *   - nothing is ever fetched/decoded twice for the same URL
 *   - MemoryManager has exactly one place to inspect and evict from
 *
 * This class only stores and disposes — deciding *when* to evict what is
 * MemoryManager's job, not this one's.
 */
class CacheManager {
  constructor({ maxBytes = DEFAULT_MAX_BYTES } = {}) {
    this.maxBytes = maxBytes;
    this.images = new Map(); // key -> { bitmap, bytes }
    this.videos = new Map(); // key -> { element, bytes }
    this.blobs = new Map(); // key -> Blob (compressed frame bytes, ~100-180KB each)
    this.totalBytes = 0;
    this.blobBytes = 0; // tracked separately from totalBytes — see setBlob
  }

  hasImage(key) {
    return this.images.has(key);
  }

  getImage(key) {
    return this.images.get(key)?.bitmap ?? null;
  }

  setImage(key, bitmap) {
    if (this.images.has(key)) return;
    const bytes = estimateImageBytes(bitmap);
    this.images.set(key, { bitmap, bytes });
    this.totalBytes += bytes;
  }

  deleteImage(key) {
    const entry = this.images.get(key);
    if (!entry) return;
    entry.bitmap?.close?.(); // ImageBitmap only — releases the decoded raster immediately instead of waiting on GC
    this.totalBytes -= entry.bytes;
    this.images.delete(key);
  }

  /** Evicts every cached image whose key starts with `prefix` — a whole frame sequence's cache-key namespace. */
  deleteImagesByPrefix(prefix) {
    for (const key of this.images.keys()) {
      if (key.startsWith(prefix)) this.deleteImage(key);
    }
  }

  /**
   * Evicts every cached image under `prefix` whose numeric index (the
   * remainder of the key after `prefix`) falls outside [start, end].
   * Safety net for windowed/sliding-window loaders (see
   * hooks/useWindowedFrames.js): even with careful bookkeeping at the
   * call site, an async decode that completes after its index has gone
   * stale can slip through a purely delta-based eviction pass. This sweep
   * is index-range-based rather than delta-based, so nothing can hide
   * from it regardless of timing.
   */
  deleteImagesOutsideRange(prefix, start, end) {
    for (const key of this.images.keys()) {
      if (!key.startsWith(prefix)) continue;
      const index = Number(key.slice(prefix.length));
      if (Number.isNaN(index) || index < start || index > end) {
        this.deleteImage(key);
      }
    }
  }

  /**
   * Compressed-blob store — the raw bytes of a frame BEFORE decode. This
   * is what makes scroll scrubbing network-independent (and therefore as
   * smooth on a deployed CDN as on localhost): the whole sequence's blobs
   * are downloaded once, up front, on the loading screen, then held here
   * permanently, so during scroll the windowed loader only ever does a
   * pure-CPU createImageBitmap on already-resident bytes — no fetch, no
   * CDN latency, in the hot path.
   *
   * Kept in a SEPARATE byte counter from `totalBytes` on purpose: that
   * budget governs decoded RGBA bitmaps (megabytes each) which
   * MemoryManager evicts under pressure. Compressed blobs are ~100-180KB
   * each (~60-70MB for a 593-frame sequence) and must NOT be swept by the
   * decoded-image eviction pass — evicting them would reintroduce the
   * mid-scroll fetch that this store exists to eliminate. They're released
   * only when their whole section unloads (deleteBlobsByPrefix).
   */
  hasBlob(key) {
    return this.blobs.has(key);
  }

  getBlob(key) {
    return this.blobs.get(key) ?? null;
  }

  setBlob(key, blob) {
    if (this.blobs.has(key)) return;
    this.blobs.set(key, blob);
    this.blobBytes += blob.size ?? 0;
  }

  deleteBlobsByPrefix(prefix) {
    for (const [key, blob] of this.blobs) {
      if (key.startsWith(prefix)) {
        this.blobBytes -= blob.size ?? 0;
        this.blobs.delete(key);
      }
    }
  }

  hasVideo(key) {
    return this.videos.has(key);
  }

  getVideo(key) {
    return this.videos.get(key)?.element ?? null;
  }

  setVideo(key, element, bytes = 0) {
    this.videos.set(key, { element, bytes });
    this.totalBytes += bytes;
  }

  deleteVideo(key) {
    const entry = this.videos.get(key);
    if (!entry) return;
    entry.element.pause();
    entry.element.removeAttribute("src");
    entry.element.load(); // documented technique to release a video element's buffered media
    this.totalBytes -= entry.bytes;
    this.videos.delete(key);
  }

  isOverBudget() {
    return this.totalBytes > this.maxBytes;
  }

  getStats() {
    return {
      totalBytes: this.totalBytes,
      maxBytes: this.maxBytes,
      imageCount: this.images.size,
      videoCount: this.videos.size,
      blobBytes: this.blobBytes,
      blobCount: this.blobs.size,
    };
  }

  clear() {
    Array.from(this.images.keys()).forEach((key) => this.deleteImage(key));
    Array.from(this.videos.keys()).forEach((key) => this.deleteVideo(key));
    this.blobs.clear();
    this.blobBytes = 0;
  }
}

export const cacheManager = new CacheManager();
export default cacheManager;
