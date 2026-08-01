"use client";

import { useEffect, useRef, useState } from "react";
import { createParticleScene, type ParticleScene, type SceneConfig } from "@/lib/particle-scene";
import { markPreloaderDone } from "@/lib/site-events";
import { isLowEndDevice } from "@/lib/gpu-capability";
import ParticleFallback from "@/components/ParticleFallback";

interface ParticleCanvasProps {
  /** This page's choreography — see src/lib/choreography.ts. */
  config: Omit<SceneConfig, "onDegrade">;
}

export default function ParticleCanvas({ config }: ParticleCanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<ParticleScene | null>(null);
  // Pre-flight gate (checked once, before the WebGL scene is ever created) and
  // the runtime frame-budget monitor (fires mid-session on a device that
  // looked fine at load but can't sustain the field) both land here — either
  // one swaps the canvas for the static, zero-cost fallback.
  const [useFallback, setUseFallback] = useState(() => isLowEndDevice());

  useEffect(() => {
    if (useFallback) {
      // No WebGL scene was ever created, so the preloader has nothing to wait
      // on — signal ready immediately so the hero still reveals.
      markPreloaderDone();
      return;
    }

    let cancelled = false;
    const handleDegrade = () => {
      if (cancelled) return;
      cancelled = true;
      sceneRef.current?.dispose();
      sceneRef.current = null;
      setUseFallback(true);
    };

    createParticleScene({ ...config, onDegrade: handleDegrade })
      .then((scene) => {
        if (cancelled) {
          scene.dispose();
          return;
        }
        sceneRef.current = scene;
        containerRef.current?.appendChild(scene.domElement);
        // Only the scene instance that actually mounted (not one torn down
        // mid-load, e.g. by a dev Strict Mode remount) gets to signal that
        // the hero is ready to reveal.
        markPreloaderDone();
      })
      .catch((err) => {
        // This previously had no .catch() at all — a rejected scene creation
        // (e.g. a shader compile failure) was an unhandled promise rejection
        // that never set useFallback, leaving an empty container and no
        // console signal pointing at WebGL. Now it's loud and it degrades
        // cleanly to the same static fallback every other path uses.
        if (cancelled) return;
        console.error("[ParticleCanvas] createParticleScene failed — falling back to the static field.", err);
        markPreloaderDone();
        setUseFallback(true);
      });

    return () => {
      cancelled = true;
      sceneRef.current?.dispose();
    };
    // `config` is a module-level constant from src/lib/choreography.ts, so its
    // identity is stable and this never re-runs on a re-render.
  }, [useFallback, config]);

  if (useFallback) return <ParticleFallback />;

  return <div ref={containerRef} />;
}
