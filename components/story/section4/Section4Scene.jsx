"use client";

import { memo, useState, useRef, useEffect } from "react";
import { STORY_PHASE } from "@/lib/story/SceneManager";
import { MagicButton } from "@/components/ui/MagicButton";
import { cn } from "@/utils";
import { Howler } from "howler";

export const Section4Scene = memo(function Section4Scene({ phase }) {
  const [isVideoPlaying, setIsVideoPlaying] = useState(false);
  const [isSection6Playing, setIsSection6Playing] = useState(false);
  const [showFirstText, setShowFirstText] = useState(false);
  const [showSecondText, setShowSecondText] = useState(false);
  const videoRef = useRef(null);
  const section6Ref = useRef(null);

  useEffect(() => {
    if (isSection6Playing) {
      const t1 = setTimeout(() => setShowFirstText(true), 1500);
      const t2 = setTimeout(() => setShowFirstText(false), 8500);
      const t3 = setTimeout(() => setShowSecondText(true), 10500);
      return () => {
        clearTimeout(t1);
        clearTimeout(t2);
        clearTimeout(t3);
      };
    }
  }, [isSection6Playing]);

  useEffect(() => {
    const video = videoRef.current;
    const handleVideoEnd = () => {
      Howler.mute(false);
      setIsSection6Playing(true);
      if (section6Ref.current) {
        section6Ref.current.play();
      }
    };

    if (video) {
      video.addEventListener("ended", handleVideoEnd);
    }
    return () => {
      if (video) {
        video.removeEventListener("ended", handleVideoEnd);
      }
      Howler.mute(false); // Ensure we unmute if the component unmounts
    };
  }, []);

  const handlePlayVideo = () => {
    setIsVideoPlaying(true);
    if (videoRef.current) {
      Howler.mute(true);
      videoRef.current.play();
    }
  };

  return (
    <>
      {/* ── Opaque base layer ─────────────────────────────────────────────── */}
      <div
        className="absolute inset-0 h-full w-full bg-cover bg-center"
        style={{ backgroundImage: "url(/sections/section-4/frame_0001.webp)" }}
      />

      {/* ── Dark overlay ──────────────────────────────────────────────────── */}
      <div className="absolute inset-0 h-full w-full bg-black/40 pointer-events-none" />

      {/* ── Climax Video ──────────────────────────────────────────────────── */}
      <div 
        className={cn(
          "absolute inset-0 h-full w-full bg-black transition-opacity duration-[1500ms] z-50 flex items-center justify-center",
          isVideoPlaying ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
        )}
      >
        <video 
          ref={videoRef}
          src="/sections/section-5/finalScene.mp4" 
          className="w-full h-full object-cover"
          playsInline
          controls={false}
        />
      </div>

      {/* ── Section 6 Video ───────────────────────────────────────────────── */}
      <div 
        className={cn(
          "absolute inset-0 h-full w-full bg-black transition-opacity duration-[1500ms] z-50 flex items-center justify-center",
          isSection6Playing ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
        )}
      >
        <video 
          ref={section6Ref}
          src="/sections/section-6/Night_sky_animation_compressed.mp4" 
          className="w-full h-full object-cover"
          playsInline
          controls={false}
          loop
          muted
        />
        
        {/* Final Text Overlay */}
        <div className="absolute inset-0 pointer-events-none">
          {/* First Text */}
          <div 
            className={cn(
              "absolute inset-0 flex items-center justify-center p-8 text-center transition-all duration-[2000ms] ease-in-out",
              showFirstText ? "opacity-100 translate-y-0 scale-100" : "opacity-0 translate-y-4 scale-95"
            )}
          >
            <p className="max-w-4xl text-balance font-serif italic text-3xl md:text-4xl lg:text-5xl font-normal leading-[1.6] tracking-widest text-[#fffdf0] drop-shadow-[0_4px_16px_rgba(0,0,0,0.95)] opacity-95">
               <span className="font-display not-italic text-4xl md:text-5xl lg:text-6xl bg-gradient-to-b from-[#fffae6] via-[#ffd066] to-[#b8860b] bg-clip-text text-transparent pr-2">Once,</span>
               a prince loved a princess.
            </p>
          </div>

          {/* Second Text */}
          <div 
            className={cn(
              "absolute inset-0 flex items-center justify-center p-8 text-center transition-all duration-[2500ms] ease-out",
              showSecondText ? "opacity-100 translate-y-0 scale-100" : "opacity-0 translate-y-4 scale-95"
            )}
          >
            <p className="max-w-4xl text-balance font-serif italic text-2xl md:text-3xl lg:text-4xl font-normal leading-[1.8] tracking-widest text-[#fffdf0] drop-shadow-[0_4px_16px_rgba(0,0,0,0.95)] opacity-90">
               Even if this story is only a part of my life...<br className="hidden md:block" />
               thank you for being its most beautiful chapter.
            </p>
          </div>
        </div>
      </div>

      {/* ── Play Button ───────────────────────────────────────────────────── */}
      <div className={cn(
        "absolute inset-0 flex items-end justify-center pb-24 z-20 transition-opacity duration-1000",
        phase === STORY_PHASE.TEXT && !isVideoPlaying ? "opacity-100" : "opacity-0 pointer-events-none"
      )}>
         <MagicButton onClick={handlePlayVideo} className="bg-black/50 backdrop-blur-sm">
            Watch the Climax
         </MagicButton>
      </div>
    </>
  );
});
