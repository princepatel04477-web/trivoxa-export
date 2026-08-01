"use client";

import { useEffect, useRef, useState } from "react";
import { isLowEndDevice } from "@/lib/gpu-capability";
import { createShaderBackground, type ShaderBackground as Scene } from "@/lib/shader-background";

/**
 * Fixed, full-viewport GLSL shader background behind page content (see .shader-bg
 * z-index). Client-only: server + first client render output nothing (SSR-safe,
 * no hydration mismatch); on mount it checks `isLowEndDevice()` and only then
 * mounts the WebGL canvas. A runtime frame-budget degrade unmounts it too, both
 * falling back to the zero-cost ambient background (`.tvx__bg`). Never mounted on
 * the home page (which keeps its particle globe) — one WebGL context per page.
 * `?forceShader=1` bypasses the low-end gate (for testing on software WebGL).
 */
export default function ShaderBackground({ variant }: { variant: string }) {
  const [ready, setReady] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const sceneRef = useRef<Scene | null>(null);

  // Decide on mount (client only) — keeps SSR and first client render identical.
  // setState is deferred to the next frame so it isn't a synchronous effect-body
  // write (react-hooks/set-state-in-effect).
  useEffect(() => {
    const force = new URLSearchParams(window.location.search).has("forceShader");
    if (!force && isLowEndDevice()) return; // stay unmounted → ambient fallback
    const raf = requestAnimationFrame(() => setReady(true));
    return () => cancelAnimationFrame(raf);
  }, []);

  useEffect(() => {
    if (!ready || !canvasRef.current) return;
    let scene: Scene | null = null;
    let raf = 0;
    try {
      scene = createShaderBackground(canvasRef.current, variant, () => setReady(false));
      sceneRef.current = scene;
    } catch (err) {
      // Previously silent — any renderer/shader failure here dropped straight
      // to the ambient fallback with no trace.
      console.error(`[ShaderBackground] createShaderBackground("${variant}") failed — falling back to ambient background.`, err);
      raf = requestAnimationFrame(() => setReady(false));
    }
    return () => {
      if (raf) cancelAnimationFrame(raf);
      scene?.dispose();
      sceneRef.current = null;
    };
  }, [ready, variant]);

  if (!ready) return null;

  return (
    <div className="shader-bg" aria-hidden="true">
      <canvas ref={canvasRef} />
      <div className="shader-bg__scrim" />
    </div>
  );
}
