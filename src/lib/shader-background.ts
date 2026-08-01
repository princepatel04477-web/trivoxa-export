import * as THREE from "three";
import { gsap } from "@/lib/gsap";
import { VERTEX } from "@/shaders/prelude";
import { getFragment } from "@/shaders";
import { isMobileDevice, pixelRatio, suspendWhenOffscreen } from "@/lib/device";

export interface ShaderBackground {
  dispose(): void;
}

// Render below CSS resolution and upsample — this is an out-of-focus ambient
// field, so the loss is invisible and the saving is quadratic. Mobile takes the
// harder cut: at 0.5 a 430×932 phone at DPR 3 renders 0.30 MP per frame instead
// of the 3.6 MP an uncapped surface would.
const RENDER_SCALE_DESKTOP = 0.7;
const RENDER_SCALE_MOBILE = 0.5;
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

  const renderScale = isMobileDevice() ? RENDER_SCALE_MOBILE : RENDER_SCALE_DESKTOP;

  // iOS Safari fires `resize` every time the address bar collapses or expands,
  // which on a long page is continuously during a scroll. Reallocating the
  // renderer's backing store on each of those is pure thrash for a height
  // change the shader does not read. Only a real width change (rotation, a
  // desktop window drag) rebuilds the target; height alone updates the
  // resolution uniform, which is free.
  // The 200px height tolerance is comfortably above any address-bar delta
  // (~60-120px) and comfortably below a rotation, so a genuine viewport change
  // still rebuilds the target.
  const HEIGHT_TOLERANCE = 200;
  let lastWidth = 0;
  let lastHeight = 0;

  const resize = () => {
    const w = window.innerWidth;
    const h = window.innerHeight;
    const dpr = pixelRatio(renderScale);
    if (w !== lastWidth || Math.abs(h - lastHeight) > HEIGHT_TOLERANCE) {
      lastWidth = w;
      lastHeight = h;
      renderer.setPixelRatio(dpr);
      renderer.setSize(w, h, false);
    }
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
    // Detached from the ticker entirely when off-screen or backgrounded, rather
    // than left attached and early-returning: an attached callback still costs
    // a call and keeps GSAP's ticker awake.
    const release = suspendWhenOffscreen(
      canvas,
      () => gsap.ticker.add(update),
      () => gsap.ticker.remove(update)
    );
    return () => {
      release();
      gsap.ticker.remove(update);
    };
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
