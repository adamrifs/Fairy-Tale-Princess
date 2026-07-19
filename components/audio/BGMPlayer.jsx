"use client";

import { useState, useEffect, useRef } from "react";
import { Howl } from "howler";
import { cn } from "@/utils";

export function BGMPlayer({ className }) {
  const [isPlaying, setIsPlaying] = useState(false);
  const soundRef = useRef(null);

  useEffect(() => {
    soundRef.current = new Howl({
      src: ["/sounds/bgm_optimized.mp3"],
      loop: true,
      volume: 0.5,
      autoplay: true,
      // html5: true forces Howler to use HTML5 Audio instead of the Web Audio API.
      // This is highly recommended for large background music files to prevent
      // decoding the entire file into memory before playback can begin.
      html5: true,
      preload: true,
      onplay: () => setIsPlaying(true),
      onpause: () => setIsPlaying(false),
      onstop: () => setIsPlaying(false),
      onloaderror: (id, err) => console.error("Howler load error", err),
      onplayerror: (id, err) => {
        console.error("Howler play error", err);
        soundRef.current.once('unlock', () => {
          soundRef.current.play();
        });
      },
    });

    return () => {
      if (soundRef.current) {
        soundRef.current.unload();
      }
    };
  }, []);

  // Robust fallback for strict autoplay policies:
  // If the browser silently blocks autoplay without throwing playerror,
  // we listen for the VERY FIRST user interaction and force play.
  useEffect(() => {
    const handleFirstInteraction = () => {
      if (soundRef.current && !soundRef.current.playing()) {
        soundRef.current.play();
      }
      // Remove listeners once interaction happens
      window.removeEventListener('click', handleFirstInteraction);
      window.removeEventListener('touchstart', handleFirstInteraction);
      window.removeEventListener('keydown', handleFirstInteraction);
      window.removeEventListener('scroll', handleFirstInteraction);
    };

    window.addEventListener('click', handleFirstInteraction, { once: true });
    window.addEventListener('touchstart', handleFirstInteraction, { once: true });
    window.addEventListener('keydown', handleFirstInteraction, { once: true });
    window.addEventListener('scroll', handleFirstInteraction, { once: true, passive: true });

    return () => {
      window.removeEventListener('click', handleFirstInteraction);
      window.removeEventListener('touchstart', handleFirstInteraction);
      window.removeEventListener('keydown', handleFirstInteraction);
      window.removeEventListener('scroll', handleFirstInteraction);
    };
  }, []);

  const togglePlay = () => {
    if (!soundRef.current) return;
    
    if (isPlaying) {
      soundRef.current.pause();
    } else {
      soundRef.current.play();
    }
  };

  return (
    <div className={cn("fixed bottom-6 right-6 z-[var(--z-audio-controls)] transition-opacity duration-1000", className)}>
      <button
        onClick={togglePlay}
        className="flex h-12 w-12 items-center justify-center rounded-full bg-midnight-blue/20 text-royal-gold backdrop-blur-md border border-royal-gold/30 hover:bg-midnight-blue/40 hover:scale-105 transition-all duration-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-royal-gold"
        aria-label={isPlaying ? "Pause music" : "Play music"}
      >
        {isPlaying ? (
          <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" stroke="none" className="ml-0.5">
            <rect x="6" y="4" width="4" height="16" rx="1"></rect>
            <rect x="14" y="4" width="4" height="16" rx="1"></rect>
          </svg>
        ) : (
          <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" stroke="none" className="ml-1">
            <polygon points="5 3 19 12 5 21 5 3"></polygon>
          </svg>
        )}
      </button>
    </div>
  );
}
