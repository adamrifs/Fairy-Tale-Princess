"use client";

import { useEffect, useRef, memo } from "react";
import { useAnimationContext } from "@/providers/AnimationProvider";
import "./FantasyCapsuleButton.css";
import "./FantasyLoader.css"; // Required for the flower and sparkle particle classes

// Same presets as the background
const petalColors = ["#ffd7e5", "#ffbfd7", "#f9a8c5", "#f7d0df", "#ffe7ef"];
const sparkleColors = ["#ffffff", "#ffbfd7", "#ffd066", "#f9a8c5"];
const FLOWERS_PER_SIDE = 35;
const SPARKLES_PER_SIDE = 16;

export const FantasyCapsuleButton = memo(function FantasyCapsuleButton({
  onClick,
  children,
}) {
  const btnRef = useRef(null);
  const flowersBehindRef = useRef(null);
  const flowersInFrontRef = useRef(null);
  const sparklesRef = useRef(null);
  const { reducedMotion } = useAnimationContext();

  useEffect(() => {
    if (reducedMotion) return;
    const flowersBehind = flowersBehindRef.current;
    const flowersInFront = flowersInFrontRef.current;
    const sparklesContainer = sparklesRef.current;

    if (!flowersBehind || !flowersInFront || !sparklesContainer) return;

    flowersBehind.innerHTML = "";
    flowersInFront.innerHTML = "";
    sparklesContainer.innerHTML = "";

    function generateFlower(side, layer) {
      const wrapper = document.createElement("span");
      wrapper.className = "flower-wrapper";

      const randType = Math.random();
      let type = "full";
      if (randType > 0.55 && randType <= 0.8) type = "bud";
      else if (randType > 0.8) type = "petal";

      const centerX = side === "left" ? 10 : 410;
      const centerY = 17; // Centered vertically in 34px high capsule button

      const radius = Math.pow(Math.random(), 1.5) * 55;
      const angle = Math.random() * Math.PI * 2;
      const x = centerX + Math.cos(angle) * radius;
      const y = centerY + Math.sin(angle) * radius;

      const scale = 0.4 + Math.random() * 0.7;
      const rotation = Math.floor(Math.random() * 360);
      const opacity = 0.7 + Math.random() * 0.3;
      const color = petalColors[Math.floor(Math.random() * petalColors.length)];

      wrapper.style.left = `${x}px`;
      wrapper.style.top = `${y}px`;
      wrapper.style.setProperty("--base-rotate", `${rotation}deg`);
      wrapper.style.setProperty("--base-opacity", opacity);
      wrapper.style.setProperty("--petal-color", color);
      wrapper.style.setProperty(
        "--anim-duration",
        `${5 + Math.random() * 4.5}s`,
      );
      wrapper.style.setProperty("--anim-delay", `-${Math.random() * 9}s`);

      const animClass = `anim-float-${Math.floor(Math.random() * 4) + 1}`;
      const flowerEl = document.createElement("span");
      flowerEl.className = `flower ${animClass}`;
      wrapper.style.transform = `scale(${scale})`;

      if (type === "full") {
        wrapper.classList.add("full-flower");
        for (let i = 1; i <= 5; i++) {
          const petal = document.createElement("span");
          petal.className = `petal p${i}`;
          flowerEl.appendChild(petal);
        }
        const center = document.createElement("span");
        center.className = "flower-center";
        flowerEl.appendChild(center);
      } else if (type === "bud") {
        wrapper.classList.add("flower-bud-wrapper");
        for (let i = 1; i <= 3; i++) {
          const petal = document.createElement("span");
          petal.className = `petal b${i}`;
          flowerEl.appendChild(petal);
        }
      } else {
        wrapper.classList.add("single-petal-wrapper");
        const petal = document.createElement("span");
        petal.className = "petal p1";
        flowerEl.appendChild(petal);
      }

      wrapper.appendChild(flowerEl);
      layer.appendChild(wrapper);
    }

    function generateSparkle(side) {
      const sparkle = document.createElement("span");
      const isStar = Math.random() > 0.45;
      sparkle.className = `sparkle ${isStar ? "star-sparkle" : "dot-sparkle"}`;

      const centerX = side === "left" ? 10 : 410;
      const centerY = 17;

      const radius = Math.pow(Math.random(), 1.3) * 75;
      const angle = Math.random() * Math.PI * 2;
      const x = centerX + Math.cos(angle) * radius;
      const y = centerY + Math.sin(angle) * radius;

      const duration = 2.2 + Math.random() * 2.4;
      const delay = Math.random() * -5;

      sparkle.style.left = `${x}px`;
      sparkle.style.top = `${y}px`;
      sparkle.style.setProperty("--sparkle-duration", `${duration}s`);
      sparkle.style.setProperty("--sparkle-delay", `${delay}s`);

      if (!isStar) {
        const color =
          sparkleColors[Math.floor(Math.random() * sparkleColors.length)];
        sparkle.style.setProperty("--sparkle-color", color);
      }

      sparklesContainer.appendChild(sparkle);
    }

    ["left", "right"].forEach((side) => {
      for (let i = 0; i < FLOWERS_PER_SIDE; i++) {
        const targetLayer = i % 2 === 0 ? flowersBehind : flowersInFront;
        generateFlower(side, targetLayer);
      }
      for (let i = 0; i < SPARKLES_PER_SIDE; i++) {
        generateSparkle(side);
      }
    });

    return () => {
      flowersBehind.innerHTML = "";
      flowersInFront.innerHTML = "";
      sparklesContainer.innerHTML = "";
    };
  }, [reducedMotion]);

  const handleBurst = (e) => {
    if (reducedMotion) {
      onClick?.(e);
      return;
    }

    const rect = btnRef.current.getBoundingClientRect();
    const clickX = e.clientX || rect.left + rect.width / 2;
    const clickY = e.clientY || rect.top + rect.height / 2;

    const particleCount = 32;
    for (let i = 0; i < particleCount; i++) {
      const isPetal = Math.random() > 0.45;
      const particle = document.createElement("span");

      const angle = Math.random() * Math.PI * 2;
      const distance = 40 + Math.random() * 140;
      const tx = Math.cos(angle) * distance;
      const ty = Math.sin(angle) * distance - (30 + Math.random() * 50); // Upward gravity bias
      const tr = Math.floor(Math.random() * 360) + 180;
      const ts = 0.3 + Math.random() * 0.9;
      const duration = 0.8 + Math.random() * 0.6;

      if (isPetal) {
        particle.className = "burst-petal";
        const color =
          petalColors[Math.floor(Math.random() * petalColors.length)];
        particle.style.setProperty("--petal-color", color);
      } else {
        particle.className = "burst-sparkle";
        const color =
          sparkleColors[Math.floor(Math.random() * sparkleColors.length)];
        particle.style.setProperty("--sparkle-color", color);
      }

      particle.style.left = `${clickX}px`;
      particle.style.top = `${clickY}px`;
      particle.style.setProperty("--tx", `${tx}px`);
      particle.style.setProperty("--ty", `${ty}px`);
      particle.style.setProperty("--tr", `${tr}deg`);
      particle.style.setProperty("--ts", ts);
      particle.style.setProperty("--burst-duration", `${duration}s`);

      document.body.appendChild(particle);

      setTimeout(() => {
        particle.remove();
      }, duration * 1000);
    }

    // Call the original onClick after triggering burst
    onClick?.(e);
  };

  return (
    <button
      className="fantasy-capsule-button"
      ref={btnRef}
      onClick={handleBurst}
    >
      <span className="btn-glow"></span>
      <span className="sparkles-container" ref={sparklesRef}></span>
      <span className="flowers-layer behind" ref={flowersBehindRef}></span>
      <span className="button-content">
        <span className="button-text">{children}</span>
        <span className="shine-effect"></span>
      </span>
      <span className="flowers-layer in-front" ref={flowersInFrontRef}></span>
    </button>
  );
});
