"use client";

import dynamic from "next/dynamic";
import type { SceneConfig } from "@/lib/particle-scene";
import CanvasErrorBoundary from "@/components/CanvasErrorBoundary";

// `ssr: false` is the whole client-only guard: nothing is rendered on the
// server and the chunk is fetched after hydration, so the Three.js layer can
// never produce a mismatch. An extra useState/useEffect "mounted" gate on top
// of this was pure duplication — it only cost the canvas an additional render
// cycle before it could start compiling shaders.
const ParticleCanvas = dynamic(() => import("@/components/ParticleCanvas"), { ssr: false });

interface ParticleCanvasWrapperProps {
  /** This page's choreography — see src/lib/choreography.ts. */
  config: Omit<SceneConfig, "onDegrade">;
}

export default function ParticleCanvasWrapper({ config }: ParticleCanvasWrapperProps) {
  // The boundary is here rather than at each page's call site so no route can
  // mount the field unguarded by forgetting to add it.
  return (
    <CanvasErrorBoundary system="ParticleCanvas">
      <ParticleCanvas config={config} />
    </CanvasErrorBoundary>
  );
}
