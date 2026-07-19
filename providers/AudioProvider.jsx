"use client";

import { createContext, useCallback, useContext, useMemo, useState } from "react";
import { audioManager } from "@/lib/audio";

const AudioContext = createContext(null);

/**
 * Bridges the imperative AudioManager singleton into React state so UI
 * (mute buttons, volume sliders) can re-render on change. The manager
 * itself is never recreated here — it must survive this provider
 * remounting so playback doesn't restart between navigations.
 */
export function AudioProvider({ children }) {
  const [isMuted, setIsMuted] = useState(false);
  const [volume, setVolumeState] = useState(audioManager.musicVolume);

  const toggleMute = useCallback(() => {
    setIsMuted(audioManager.toggleMute());
  }, []);

  const setVolume = useCallback((nextVolume) => {
    setVolumeState(nextVolume);
    audioManager.setMusicVolume(nextVolume);
  }, []);

  const value = useMemo(
    () => ({ manager: audioManager, isMuted, volume, toggleMute, setVolume }),
    [isMuted, volume, toggleMute, setVolume]
  );

  return <AudioContext.Provider value={value}>{children}</AudioContext.Provider>;
}

export function useAudioContext() {
  const context = useContext(AudioContext);
  if (!context) {
    throw new Error("useAudioContext must be used within an AudioProvider");
  }
  return context;
}
