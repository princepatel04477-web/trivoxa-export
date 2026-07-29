"use client";

import { useEffect, useRef, useState } from "react";
import { createParticleScene, type ParticleScene, type SceneConfig } from "@/lib/particle-scene";
import { markPreloaderDone } from "@/lib/site-events";
import { isLowEndDevice } from "@/lib/gpu-capability";
import { tierRendersPoster } from "@/lib/device";
import ParticleFallback from "@/components/ParticleFallback";

interface ParticleCanvasProps {
  /** This page's choreography — see src/lib/choreography.ts. */
  config: Omit<SceneConfig, "onDegrade">;
}

/**
 * `?forceParticles=1` bypasses the pre-flight low-end gate, mirroring
 * `?forceShader=1` on ShaderBackground. Without it the field never mounts on a
 * software rasteriser, which means it cannot be measured in an automated
 * harness — and the §8 render-budget gates can only be signed off against a
 * surface that actually exists. Never set in normal sessions.
 */
function forcedOn(): boolean {
  if (typeof window === "undefined") return false;
  return new URLSearchParams(window.location.search).has("forceParticles");
}

export default function ParticleCanvas({ config }: ParticleCanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<ParticleScene | null>(null);
  // Pre-flight gate (checked once, before the WebGL scene is ever created) and
  // the runtime frame-budget monitor (fires mid-session on a device that
  // looked fine at load but can't sustain the field) both land here — either
  // one swaps the canvas for the static, zero-cost fallback.
  // §4.3 — TIER_STATIC (reduced motion, or data-saver) renders the poster frame
  // and never creates a WebGL context at all. That is a stronger guarantee than
  // the scene's internal reduced-motion handling, which still built the field
  // and merely held it still: a still field is a still 8,000-point draw, and a
  // reader who asked for less motion or less data should not be paying for a
  // GPU context to sit there.
  const [useFallback, setUseFallback] = useState(
    () => !forcedOn() && (isLowEndDevice() || tierRendersPoster())
  );

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

    // Under ?forceParticles the frame-budget monitor is withheld entirely rather
    // than merely ignored: the engine treats a missing onDegrade as "no budget
    // gate", so its render loop keeps scheduling. Passing the callback and
    // swallowing it is not equivalent — the engine sets its own `degraded` flag
    // first and stops the loop, which is exactly what a measurement harness
    // needs not to happen. Normal sessions always pass it.
    const onDegrade = forcedOn() ? undefined : handleDegrade;

    createParticleScene({ ...config, onDegrade }).then((scene) => {
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
