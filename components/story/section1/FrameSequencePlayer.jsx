"use client";

import { memo, useEffect, useRef, useState } from "react";
import { getDevicePixelRatio } from "@/utils";
import { cn } from "@/utils";

/**
 * Reusable single-<canvas> frame renderer: draws whatever `image` it's
 * given (an ImageBitmap or HTMLImageElement from FrameManager) full-bleed,
 * cover-fit, at the display's device pixel ratio for crisp/retina
 * rendering. No <img> tag is ever used for playback — the DOM only ever
 * contains the canvas element itself.
 *
 * Deliberately dumb/imperative: it takes the current image as a prop and
 * draws it directly in an effect — no internal frame/progress state, no
 * extra re-renders beyond what the parent already causes by changing
 * `image`. Falls back to a plain <img> if canvas 2D context is
 * unavailable (accessibility requirement).
 */
export const FrameSequencePlayer = memo(function FrameSequencePlayer({ image, fallbackSrc, className }) {
  const canvasRef = useRef(null);
  const imageRef = useRef(image);
  imageRef.current = image;
  const [canvasSupported, setCanvasSupported] = useState(true);

  useEffect(() => {
    const probe = document.createElement("canvas");
    setCanvasSupported(Boolean(probe.getContext && probe.getContext("2d")));
  }, []);

  // Reads canvasRef/imageRef fresh on every call rather than closing over
  // the `image` prop directly, so it's safe to call from the resize
  // effect below (which only re-runs on canvasSupported change) without
  // ever redrawing a stale frame after `image` has moved on.
  const draw = () => {
    const canvas = canvasRef.current;
    const currentImage = imageRef.current;
    if (!canvas || !currentImage) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const { width: canvasWidth, height: canvasHeight } = canvas;
    if (canvasWidth === 0 || canvasHeight === 0) return;

    const imageWidth = currentImage.width ?? currentImage.naturalWidth ?? 0;
    const imageHeight = currentImage.height ?? currentImage.naturalHeight ?? 0;
    if (!imageWidth || !imageHeight) return;

    // Cover-fit: scale to fill the canvas completely, cropping overflow, centered.
    const scale = Math.max(canvasWidth / imageWidth, canvasHeight / imageHeight);
    const drawWidth = imageWidth * scale;
    const drawHeight = imageHeight * scale;
    const dx = (canvasWidth - drawWidth) / 2;
    const dy = (canvasHeight - drawHeight) / 2;

    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";
    ctx.clearRect(0, 0, canvasWidth, canvasHeight);
    ctx.drawImage(currentImage, dx, dy, drawWidth, drawHeight);
  };

  // Resize handling: backing store tracks the canvas's own rendered box at
  // the current device pixel ratio, not just window size. Created once
  // (per canvasSupported change), not per frame — draw() reading from
  // imageRef rather than closing over `image` is what keeps this correct
  // even though it isn't recreated on every frame update.
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !canvasSupported) return undefined;

    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      const dpr = getDevicePixelRatio();
      const width = Math.round(rect.width * dpr);
      const height = Math.round(rect.height * dpr);

      if (width > 0 && height > 0 && (canvas.width !== width || canvas.height !== height)) {
        canvas.width = width;
        canvas.height = height;
      }

      draw();
    };

    const observer = new ResizeObserver(resize);
    observer.observe(canvas);
    resize();

    return () => observer.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [canvasSupported]);

  // Per-frame redraw whenever the image itself changes (canvas size unchanged).
  useEffect(() => {
    draw();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [image]);

  if (!canvasSupported) {
    return (
      // eslint-disable-next-line @next/next/no-img-element -- intentional fallback when canvas 2D is unavailable
      <img
        src={fallbackSrc}
        alt=""
        className={cn("absolute inset-0 h-full w-full object-cover", className)}
      />
    );
  }

  return <canvas ref={canvasRef} className={cn("absolute inset-0 h-full w-full", className)} />;
});
