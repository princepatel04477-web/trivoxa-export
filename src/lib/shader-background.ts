import * as THREE from "three";
import { gsap } from "@/lib/gsap";
import { VERTEX } from "@/shaders/prelude";
import { getFragment } from "@/shaders";

export interface ShaderBackground {
  dispose(): void;
}

const MAX_DPR = 1.5;
const RENDER_SCALE = 0.7; // render below CSS res, upsampled — ambient blur hides it
const WARMUP_FRAMES = 30; // skip shader-compile / first-paint jank
const SLOW_MS = 45; // a frame slower than this counts against the budget
const SLOW_LIMIT = 90; // sustained slow frames -> degrade to CSS fallback

/**
 * Fullscreen-quad GLSL background rendered by Three.js. Mirrors the perf
 * discipline of particle-scene.ts: capped DPR + downscaled target, a frame-
 * budget monitor that calls onDegrade (and stops) when it can't hold budget,
 * pause when the tab is hidden, and gsap.matchMedia for reduced-motion (freeze).
 * Driven by gsap.ticker so it shares the site's animation clock.
 */
export function createShaderBackground(
  canvas: HTMLCanvasElement,
  variant: string,
  onDegrade?: () => void
): ShaderBackground {
  const renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: false,
    alpha: false,
    powerPreference: "high-performance",
  });
  renderer.setClearColor(0x0b1325, 1);

  // Context loss must not permanently strand this in a dead state — see the
  // matching handler in particle-scene.ts.
  const onContextLost = (e: Event) => {
    e.preventDefault();
    console.error(`[shader-background] WebGL context lost (variant "${variant}").`);
  };
  const onContextRestored = () => {
    console.warn(`[shader-background] WebGL context restored (variant "${variant}").`);
  };
  canvas.addEventListener("webglcontextlost", onContextLost, false);
  canvas.addEventListener("webglcontextrestored", onContextRestored, false);

  const scene = new THREE.Scene();
  const camera = new THREE.Camera(); // matrices unused — vertex shader is fullscreen
  const geometry = new THREE.PlaneGeometry(2, 2);

  const uniforms = {
    uTime: { value: 0 },
    uScroll: { value: 0 },
    uResolution: { value: new THREE.Vector2(1, 1) },
    uReducedMotion: { value: 0 },
  };
  const material = new THREE.ShaderMaterial({
    vertexShader: VERTEX,
    fragmentShader: getFragment(variant),
    uniforms,
    depthTest: false,
    depthWrite: false,
  });
  scene.add(new THREE.Mesh(geometry, material));

  const resize = () => {
    const w = window.innerWidth;
    const h = window.innerHeight;
    const dpr = Math.min(window.devicePixelRatio || 1, MAX_DPR) * RENDER_SCALE;
    renderer.setPixelRatio(dpr);
    renderer.setSize(w, h, false);
    uniforms.uResolution.value.set(w * dpr, h * dpr);
  };
  resize();
  window.addEventListener("resize", resize);

  const render = () => renderer.render(scene, camera);

  const scrollProgress = () => {
    const max = document.documentElement.scrollHeight - window.innerHeight;
    return max > 0 ? Math.min(1, Math.max(0, window.scrollY / max)) : 0;
  };

  let warm = 0;
  let slow = 0;
  let degraded = false;

  const update = (time: number, deltaTime: number) => {
    if (document.hidden || degraded) return;
    uniforms.uTime.value = time;
    uniforms.uScroll.value = scrollProgress();

    warm++;
    if (warm > WARMUP_FRAMES) {
      if (deltaTime > SLOW_MS) slow++;
      else slow = Math.max(0, slow - 2);
      if (onDegrade && slow > SLOW_LIMIT) {
        degraded = true;
        onDegrade();
        return;
      }
    }
    render();
  };

  // Reduced motion: one static frame, no ticker. Otherwise animate via ticker.
  const mm = gsap.matchMedia();
  mm.add("(prefers-reduced-motion: reduce)", () => {
    uniforms.uReducedMotion.value = 1;
    render();
  });
  mm.add("(prefers-reduced-motion: no-preference)", () => {
    gsap.ticker.add(update);
    return () => gsap.ticker.remove(update);
  });

  return {
    dispose() {
      degraded = true;
      mm.revert();
      gsap.ticker.remove(update);
      window.removeEventListener("resize", resize);
      canvas.removeEventListener("webglcontextlost", onContextLost, false);
      canvas.removeEventListener("webglcontextrestored", onContextRestored, false);
      geometry.dispose();
      material.dispose();
      renderer.dispose();
      renderer.forceContextLoss();
    },
  };
}
