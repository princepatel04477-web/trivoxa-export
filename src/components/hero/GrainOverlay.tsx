"use client";

import { useEffect, useRef } from "react";
import { isMobileDevice, pixelRatio, suspendWhenOffscreen } from "@/lib/device";

const TILE_SIZE = 96;
const POOL_SIZE = 6;

/**
 * Grain is a texture cue, not a detail element — it is stochastic noise, so
 * there is nothing in it for extra device pixels to resolve. Rendering it at
 * half resolution on a phone and letting the browser upscale halves both the
 * bitmap memory and the per-tick fill cost, and is not detectable.
 */
function grainRatio(): number {
  return pixelRatio(isMobileDevice() ? 0.5 : 1);
}

function buildNoiseTile(): HTMLCanvasElement {
  const tile = document.createElement("canvas");
  tile.width = TILE_SIZE;
  tile.height = TILE_SIZE;
  const ctx = tile.getContext("2d");
  if (!ctx) return tile;
  const image = ctx.createImageData(TILE_SIZE, TILE_SIZE);
  for (let i = 0; i < image.data.length; i += 4) {
    const v = Math.floor(Math.random() * 255);
    image.data[i] = v;
    image.data[i + 1] = v;
    image.data[i + 2] = v;
    image.data[i + 3] = 255;
  }
  ctx.putImageData(image, 0, 0);
  return tile;
}

interface GrainOverlayProps {
  /** Frames of inactivity between redraws — higher = cheaper + slower flicker. */
  frameSkip: number;
  /** When true, paint one static tile and never animate again. */
  reducedMotion: boolean;
}

export default function GrainOverlay({ frameSkip, reducedMotion }: GrainOverlayProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const container = canvas?.parentElement;
    if (!canvas || !container) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Reduced motion only ever shows one frame — building the full cycling
    // pool would be wasted work.
    const poolSize = reducedMotion ? 1 : POOL_SIZE;
    const tiles = Array.from({ length: poolSize }, buildNoiseTile);
    const patterns = tiles.map((tile) => ctx.createPattern(tile, "repeat"));

    let width = 0;
    let height = 0;
    let poolIndex = 0;
    let dpr = grainRatio();

    const draw = (index: number) => {
      const pattern = patterns[index];
      if (!pattern) return;
      ctx.clearRect(0, 0, width, height);
      ctx.save();
      ctx.translate(Math.random() * TILE_SIZE, Math.random() * TILE_SIZE);
      ctx.fillStyle = pattern;
      ctx.fillRect(-TILE_SIZE, -TILE_SIZE, width + TILE_SIZE * 2, height + TILE_SIZE * 2);
      ctx.restore();
    };

    const resize = () => {
      dpr = grainRatio();
      const rect = container.getBoundingClientRect();
      width = Math.max(1, Math.round(rect.width * dpr));
      height = Math.max(1, Math.round(rect.height * dpr));
      canvas.width = width;
      canvas.height = height;
      // Resizing clears the bitmap — repaint the current frame immediately
      // instead of leaving it blank until the next scheduled tick.
      draw(poolIndex);
    };
    resize();
    const resizeObserver = new ResizeObserver(resize);
    resizeObserver.observe(container);

    if (reducedMotion) {
      return () => resizeObserver.disconnect();
    }

    let animId: number | null = null;
    let frame = 0;

    const tick = () => {
      frame += 1;
      if (frame % frameSkip === 0) {
        poolIndex = (poolIndex + 1) % POOL_SIZE;
        draw(poolIndex);
      }
      animId = requestAnimationFrame(tick);
    };

    // Suspended both when the hero scrolls away AND when the tab is hidden —
    // a backgrounded tab that keeps a grain loop alive is a battery cost with
    // no viewer.
    const releaseSuspend = suspendWhenOffscreen(
      container,
      () => {
        if (animId === null) animId = requestAnimationFrame(tick);
      },
      () => {
        if (animId !== null) cancelAnimationFrame(animId);
        animId = null;
      }
    );

    return () => {
      if (animId !== null) cancelAnimationFrame(animId);
      resizeObserver.disconnect();
      releaseSuspend();
    };
  }, [frameSkip, reducedMotion]);

  return <canvas ref={canvasRef} className="grain-globe__canvas" />;
}
