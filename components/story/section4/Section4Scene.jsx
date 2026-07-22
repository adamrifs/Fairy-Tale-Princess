"use client";

import { memo } from "react";

export const Section4Scene = memo(function Section4Scene() {
  return (
    <>
      {/* ── Opaque base layer ─────────────────────────────────────────────── */}
      <div
        className="absolute inset-0 h-full w-full bg-cover bg-center"
        style={{ backgroundImage: "url(/sections/section-4/frame_0001.webp)" }}
      />

      {/* ── Dark overlay ──────────────────────────────────────────────────── */}
      <div className="absolute inset-0 h-full w-full bg-black/40 pointer-events-none" />
    </>
  );
});
