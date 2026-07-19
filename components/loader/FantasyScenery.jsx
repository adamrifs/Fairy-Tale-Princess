"use client";

import { useEffect, useRef, memo } from "react";
import { useAnimationContext } from "@/providers/AnimationProvider";

// Constants from the original script
const FLOWERS_PER_SIDE = 32;
const SPARKLES_PER_SIDE = 18;

const petalColors = ["#ffd7e5", "#ffbfd7", "#f9a8c5", "#f7d0df", "#ffe7ef"];
const sparkleColors = ["#ffffff", "#ffbfd7", "#ffd066", "#f9a8c5"];

export const FantasyScenery = memo(function FantasyScenery() {
  const containerRef = useRef(null);
  const { reducedMotion } = useAnimationContext();

  useEffect(() => {
    const container = containerRef.current;
    if (!container || reducedMotion) return;

    const flowersBehind = container.querySelector("#flowers-behind");
    const flowersInFront = container.querySelector("#flowers-in-front");
    const sparklesContainer = container.querySelector("#sparkles-container");

    if (!flowersBehind || !flowersInFront || !sparklesContainer) return;

    flowersBehind.innerHTML = "";
    flowersInFront.innerHTML = "";
    sparklesContainer.innerHTML = "";

    function generateFlower(side, layer) {
      const wrapper = document.createElement("div");
      wrapper.className = "flower-wrapper";

      const randType = Math.random();
      let type = "full";
      if (randType > 0.55 && randType <= 0.8) type = "bud";
      else if (randType > 0.8) type = "petal";

      const centerX = side === "left" ? 35 : 385;
      const centerY = 50;

      const radius = Math.pow(Math.random(), 1.6) * 58;
      const angle = Math.random() * Math.PI * 2;
      const x = centerX + Math.cos(angle) * radius;
      const y = centerY + Math.sin(angle) * radius;

      const scale = 0.45 + Math.random() * 0.75;
      const rotation = Math.floor(Math.random() * 360);
      const opacity = 0.65 + Math.random() * 0.35;
      const color = petalColors[Math.floor(Math.random() * petalColors.length)];

      wrapper.style.left = `${x}px`;
      wrapper.style.top = `${y}px`;
      wrapper.style.setProperty("--base-rotate", `${rotation}deg`);
      wrapper.style.setProperty("--base-opacity", opacity);
      wrapper.style.setProperty("--petal-color", color);
      wrapper.style.setProperty("--anim-duration", `${5 + Math.random() * 4.5}s`);
      wrapper.style.setProperty("--anim-delay", `-${Math.random() * 9}s`);

      const animClass = `anim-float-${Math.floor(Math.random() * 4) + 1}`;
      const flowerEl = document.createElement("div");
      flowerEl.className = `flower ${animClass}`;
      wrapper.style.transform = `scale(${scale})`;

      if (type === "full") {
        wrapper.classList.add("full-flower");
        for (let i = 1; i <= 5; i++) {
          const petal = document.createElement("div");
          petal.className = `petal p${i}`;
          flowerEl.appendChild(petal);
        }
        const center = document.createElement("div");
        center.className = "flower-center";
        flowerEl.appendChild(center);
      } else if (type === "bud") {
        wrapper.classList.add("flower-bud-wrapper");
        for (let i = 1; i <= 3; i++) {
          const petal = document.createElement("div");
          petal.className = `petal b${i}`;
          flowerEl.appendChild(petal);
        }
      } else {
        wrapper.classList.add("single-petal-wrapper");
        const petal = document.createElement("div");
        petal.className = "petal p1";
        flowerEl.appendChild(petal);
      }

      wrapper.appendChild(flowerEl);
      layer.appendChild(wrapper);
    }

    function generateSparkle(side) {
      const sparkle = document.createElement("div");
      const isStar = Math.random() > 0.45;
      sparkle.className = `sparkle ${isStar ? "star-sparkle" : "dot-sparkle"}`;

      const centerX = side === "left" ? 35 : 385;
      const centerY = 50;
      const radius = Math.pow(Math.random(), 1.3) * 82;
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
        const color = sparkleColors[Math.floor(Math.random() * sparkleColors.length)];
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

  return (
    <div ref={containerRef} className="absolute inset-0 h-full w-full pointer-events-none">
      <div className="sparkles-container" id="sparkles-container"></div>
      <div className="flowers-layer behind" id="flowers-behind"></div>
      <div className="flowers-layer in-front" id="flowers-in-front"></div>
    </div>
  );
});
