"use client";

import { usePreloader } from "@/hooks/usePreloader";
import { LoadingOverlay } from "./LoadingOverlay";

import { useState } from "react";

export function AppLoader() {
  const { isLoaded, progress } = usePreloader();
  const [hasEntered, setHasEntered] = useState(false);
  
  return (
    <LoadingOverlay 
      isVisible={!hasEntered} 
      isLoaded={isLoaded}
      progress={progress} 
      onEnter={() => setHasEntered(true)}
    />
  );
}
