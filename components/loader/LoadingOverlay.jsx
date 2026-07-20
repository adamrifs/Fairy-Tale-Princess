"use client";

import { useState, useEffect } from "react";
import { cn } from "@/utils";
import { FantasyCapsuleButton } from "./FantasyCapsuleButton";
import { FantasyScenery } from "./FantasyScenery";
import { AmbientParticles } from "./AmbientParticles";
import "./FantasyLoader.css";

const loadPhases = [
  {
    min: 0,
    max: 20,
    title: "The Enchanted Kingdom",
    status: "Where every sunrise brings magic to the royal gardens...",
  },
  {
    min: 20,
    max: 45,
    title: "The Princess",
    status: "A kind heart cherished by her kingdom...",
  },
  {
    min: 45,
    max: 70,
    title: "A Silent Wish",
    status: "Deep within her heart, she dreams of true love...",
  },
  {
    min: 70,
    max: 92,
    title: "Destiny Awakens",
    status: "Some hearts are closer than they realize...",
  },
  {
    min: 92,
    max: 100,
    title: "The Fairy Tale Begins",
    status: "Turn the first page of a story written by destiny...",
  },
];

export function LoadingOverlay({
  isVisible = true,
  isLoaded = false,
  progress = 0,
  onEnter,
  children,
  className,
}) {
  const [introState, setIntroState] = useState(0);

  useEffect(() => {
    if (isLoaded) {
      setIntroState(1);
      
      const t1 = setTimeout(() => setIntroState(2), 50);
      const t2 = setTimeout(() => setIntroState(3), 1750);
      const t3 = setTimeout(() => setIntroState(4), 3250);
      
      return () => {
        clearTimeout(t1);
        clearTimeout(t2);
        clearTimeout(t3);
      };
    }
  }, [isLoaded]);

  const [buttonVisible, setButtonVisible] = useState(false);

  useEffect(() => {
    if (introState === 4) {
      const t = setTimeout(() => setButtonVisible(true), 50);
      return () => clearTimeout(t);
    }
  }, [introState]);

  if (!isVisible) return null;

  const percentage = Math.min(100, Math.max(0, Math.round(progress * 100)));
  const activePhase =
    loadPhases.find((p) => percentage >= p.min && percentage <= p.max) ||
    loadPhases[0];

  return (
    <div
      role="status"
      aria-live="polite"
      aria-busy={progress < 1}
      className={cn(
        "fixed inset-0 z-[var(--z-loader)] flex flex-col items-center justify-center bg-black text-moon-white overflow-hidden",
        className,
      )}
    >
      <img
        src="/assets/loadingScreen.webp"
        alt=""
        className="absolute inset-0 h-full w-full object-cover opacity-30"
      />

      <AmbientParticles />
      <div className="bg-glow bg-glow-1"></div>
      <div className="bg-glow bg-glow-2"></div>

      {isLoaded ? (
        <div className="absolute inset-0 flex items-center justify-center z-20 flex-col">
          {introState >= 1 && introState <= 3 && (
            <h2
              className={cn(
                "fantasy-title transition-opacity duration-[1500ms] ease-in-out text-center px-6 tracking-[0.25em]",
                introState === 2 ? "opacity-100" : "opacity-0"
              )}
            >
              A Cinematic Fairytale Begins...
            </h2>
          )}
          {introState === 4 && (
            <div 
              className={cn(
                "transition-all duration-[2000ms] ease-out transform",
                buttonVisible ? "opacity-100 translate-y-0 scale-100" : "opacity-0 translate-y-4 scale-95"
              )}
            >
              <FantasyCapsuleButton onClick={onEnter}>Enter Tale</FantasyCapsuleButton>
            </div>
          )}
        </div>
      ) : (
        <div className="widget-wrapper w-full h-full animate-fade-in" id="loading-widget">
          <div className="header-section absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
            <h1 className="fantasy-title" id="spell-title">
              {activePhase.title}
            </h1>
            <p className="fantasy-subtitle">
              Please wait while the forest awakens
            </p>
          </div>

          <div className="loading-container absolute bottom-12 left-1/2 -translate-x-1/2">
            <FantasyScenery />

            <div className="progress-capsule" id="progress-capsule">
              <div className="progress-track">
                <div
                  className="progress-fill"
                  id="progress-fill"
                  style={{ width: `${percentage}%` }}
                >
                  <div className="shine-effect"></div>
                </div>
              </div>
            </div>
          </div>

          <div className="footer-section absolute bottom-[120px] left-1/2 -translate-x-1/2 z-20">
            <div className="percentage-container">
              <span className="percent-number" id="percent-number">
                {percentage}%
              </span>
            </div>
            <div className="status-indicator">
              <span className="status-dot"></span>
              <span className="status-text" id="status-text">
                {activePhase.status}
              </span>
            </div>
          </div>

          {/* Keeping original children in case anything relies on it */}
          <div className="absolute top-0">{children}</div>
        </div>
      )}
    </div>
  );
}
