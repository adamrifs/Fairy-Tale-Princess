"use client";

import { useEffect, useRef, memo } from "react";
import { useAnimationContext } from "@/providers/AnimationProvider";

export const AmbientParticles = memo(function AmbientParticles() {
  const containerRef = useRef(null);
  const { reducedMotion } = useAnimationContext();

  useEffect(() => {
    const container = containerRef.current;
    if (!container || reducedMotion) return;

    const PARTICLE_COUNT = 45; // Amount of falling particles
    const colors = ["#ffffff", "#ffbfd7", "#ffd066", "#f9a8c5"];

    container.innerHTML = "";

    for (let i = 0; i < PARTICLE_COUNT; i++) {
      const particle = document.createElement("div");
      
      const size = Math.random() * 3 + 1; // 1px to 4px
      const color = colors[Math.floor(Math.random() * colors.length)];
      const left = Math.random() * 100; // 0% to 100% width
      const duration = Math.random() * 12 + 15; // 15s to 27s slow fall time
      const delay = Math.random() * -30; // Random stagger

      particle.className = "absolute rounded-full pointer-events-none";
      particle.style.width = `${size}px`;
      particle.style.height = `${size}px`;
      particle.style.backgroundColor = color;
      particle.style.left = `${left}%`;
      particle.style.boxShadow = `0 0 ${size * 2}px ${color}, 0 0 ${size * 4}px ${color}`;
      particle.style.opacity = (Math.random() * 0.5 + 0.3).toString();
      
      // We use a custom inline keyframe or a predefined one
      particle.style.animation = `ambient-fall ${duration}s linear infinite ${delay}s`;

      container.appendChild(particle);
    }

    return () => {
      container.innerHTML = "";
    };
  }, [reducedMotion]);

  return (
    <>
      <style dangerouslySetInnerHTML={{__html: `
        @keyframes ambient-fall {
          0% { transform: translateY(-5vh) translateX(0) scale(0.8); opacity: 0; }
          20% { opacity: 0.8; }
          80% { opacity: 0.8; }
          100% { transform: translateY(105vh) translateX(30px) scale(1.2); opacity: 0; }
        }
      `}} />
      <div ref={containerRef} className="absolute inset-0 h-full w-full pointer-events-none overflow-hidden z-[5]">
      </div>
    </>
  );
});
