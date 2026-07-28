"use client";

import dynamic from "next/dynamic";
import type { SceneConfig } from "@/lib/particle-scene";

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
  return <ParticleCanvas config={config} />;
}
