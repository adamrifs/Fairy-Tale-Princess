/** Preloads a single image, resolving once it has decoded. */
export function preloadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(src);
    img.onerror = () => reject(new Error(`Failed to preload image: ${src}`));
    img.src = src;
  });
}

/** Preloads a batch of images, reporting progress as each one settles. */
export function preloadImages(sources, onProgress) {
  let loaded = 0;
  const total = sources.length;

  return Promise.all(
    sources.map((src) =>
      preloadImage(src).finally(() => {
        loaded += 1;
        onProgress?.(loaded / total, loaded, total);
      })
    )
  );
}

/** Preloads a video enough to know its metadata (duration/dimensions) is ready. */
export function preloadVideo(src) {
  return new Promise((resolve, reject) => {
    const video = document.createElement("video");
    video.preload = "auto";
    video.muted = true;
    video.playsInline = true;
    video.onloadeddata = () => resolve(src);
    video.onerror = () => reject(new Error(`Failed to preload video: ${src}`));
    video.src = src;
  });
}

/** Preloads a batch of videos, reporting progress as each one settles. */
export function preloadVideos(sources, onProgress) {
  let loaded = 0;
  const total = sources.length;

  return Promise.all(
    sources.map((src) =>
      preloadVideo(src).finally(() => {
        loaded += 1;
        onProgress?.(loaded / total, loaded, total);
      })
    )
  );
}

/**
 * Runs `mapper` over `items` with at most `limit` in flight at once.
 * A frame sequence can be hundreds of images — firing them all via a
 * single Promise.all would spike network and decode load at once, so
 * callers with large batches (FrameManager) should use this instead.
 */
export function mapWithConcurrency(items, limit, mapper) {
  const results = new Array(items.length);
  let nextIndex = 0;

  async function worker() {
    while (nextIndex < items.length) {
      const index = nextIndex;
      nextIndex += 1;
      results[index] = await mapper(items[index], index);
    }
  }

  const workerCount = Math.min(limit, items.length);
  return Promise.all(Array.from({ length: workerCount }, worker)).then(() => results);
}
