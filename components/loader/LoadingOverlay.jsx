"use client";

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
        src="/assets/loadingScreen.png"
        alt=""
        className="absolute inset-0 h-full w-full object-cover opacity-30"
      />

      <AmbientParticles />
      <div className="bg-glow bg-glow-1"></div>
      <div className="bg-glow bg-glow-2"></div>

      {isLoaded ? (
        <div className="absolute inset-0 flex items-center justify-center animate-fade-in z-20">
          <FantasyCapsuleButton onClick={onEnter}>Enter Tale</FantasyCapsuleButton>
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
