"use client";

import { useAudioContext } from "@/providers/AudioProvider";

/** Exposes the AudioManager singleton plus reactive mute/volume state. */
export function useAudio() {
  return useAudioContext();
}
