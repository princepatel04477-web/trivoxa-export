"use client";

import { useEffect, useRef, useState } from "react";
import { prefersReducedMotion } from "@/hooks/useScrollAnimations";
import { isLowEndDevice } from "@/lib/gpu-capability";
import type { EngagementFlow } from "@/lib/engagement-flow";

/**
 * Mounts the engagement-model schematic.
 *
 * Three gates decide whether a WebGL context is ever created:
 *
 *  1. `prefers-reduced-motion` — the whole point of this panel is travel, so
 *     there is no meaningful "static WebGL" version. We render nothing and let
 *     the parent's static diagram stand in.
 *  2. `isLowEndDevice()` — the same pre-flight gate the particle field uses.
 *  3. Visibility — the panel sits well below the fold, and this route already
 *     runs a shader background, so the context is only taken while the reader is
 *     near it and is released once they scroll away. That keeps this route to
 *     one live WebGL context at rest and two only while the panel is on screen.
 *
 * `onActive` tells the parent whether the canvas took over, so it can hide the
 * static fallback without a flash of both.
 */
export default function EngagementFlowCanvas({ onActive }: { onActive: (active: boolean) => void }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<EngagementFlow | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    const container = containerRef.current;
    if (!container || failed) return;
    if (prefersReducedMotion() || isLowEndDevice()) return;

    let cancelled = false;
    // Tracks the last known visibility, so a build that resolves *after* the
    // reader has scrolled away does not attach an off-screen scene. Without
    // this, a fast scroll past the section leaves a WebGL context running with
    // nothing watching it — teardown() runs while the import is still in
    // flight and finds sceneRef still empty, so it has nothing to dispose.
    let visible = false;
    let building = false;

    const teardown = () => {
      sceneRef.current?.dispose();
      sceneRef.current = null;
      onActive(false);
    };

    const build = async () => {
      if (building || sceneRef.current) return;
      building = true;
      try {
        // Split into its own chunk so the scene code is only fetched once the
        // reader actually reaches the section. three.js itself is already on
        // this route (the shader background uses it), so what defers here is
        // this module, not the library.
        const { createEngagementFlow } = await import("@/lib/engagement-flow");
        if (cancelled || !visible || sceneRef.current) return;
        const scene = createEngagementFlow(container);
        if (cancelled || !visible) {
          scene.dispose();
          return;
        }
        sceneRef.current = scene;
        container.appendChild(scene.domElement);
        // Measure again after the canvas is in the DOM: the first resize ran
        // against a container that had not yet been given its final box.
        scene.resize();
        onActive(true);
      } catch (err) {
        // A missing token or a failed context is a real wiring problem — say so
        // loudly, then fall back to the static diagram rather than leaving a
        // blank panel with no explanation.
        console.error("[EngagementFlowCanvas] scene failed — falling back to the static diagram.", err);
        if (!cancelled) setFailed(true);
      } finally {
        building = false;
      }
    };

    // Visibility is derived from the element's own box rather than an
    // IntersectionObserver. IO only delivers callbacks as part of the rendering
    // lifecycle, so in any context where the page is not compositing frames it
    // can stay silent forever — and a silent observer here means the schematic
    // never appears at all, with nothing to indicate why. A rect read is cheap,
    // synchronous, and always correct, so the mount decision never depends on a
    // callback arriving.
    const MARGIN = 200;
    const isNear = () => {
      const r = container.getBoundingClientRect();
      return r.bottom > -MARGIN && r.top < window.innerHeight + MARGIN;
    };

    const evaluate = () => {
      const near = isNear();
      if (near === visible) return;
      visible = near;
      if (visible) void build();
      else teardown();
    };

    // Throttled on a timer rather than requestAnimationFrame. rAF only runs
    // while the page composites, so in a backgrounded or non-compositing tab it
    // never fires — and gating the *decision to build* behind it would mean the
    // schematic can never appear in those conditions. The render loop itself is
    // rAF-driven (as it must be); only this check is kept independent of it.
    const THROTTLE_MS = 120;
    let lastCheck = 0;
    let trailing = 0;
    const schedule = () => {
      const now = Date.now();
      if (now - lastCheck >= THROTTLE_MS) {
        lastCheck = now;
        evaluate();
        return;
      }
      // Always re-check after the burst settles, so a scroll that ends inside
      // the throttle window is not the one that gets dropped.
      if (!trailing) {
        trailing = window.setTimeout(() => {
          trailing = 0;
          lastCheck = Date.now();
          evaluate();
        }, THROTTLE_MS);
      }
    };

    // Settle the initial state immediately — if the panel is already on screen
    // when this mounts, it must not wait for the reader to scroll.
    visible = isNear();
    if (visible) void build();

    const onResize = () => {
      sceneRef.current?.resize();
      schedule();
    };
    window.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", onResize);

    return () => {
      cancelled = true;
      if (trailing) clearTimeout(trailing);
      window.removeEventListener("scroll", schedule);
      window.removeEventListener("resize", onResize);
      teardown();
    };
  }, [failed, onActive]);

  if (failed) return null;

  return <div ref={containerRef} className="delivery-model__canvas" aria-hidden="true" />;
}
