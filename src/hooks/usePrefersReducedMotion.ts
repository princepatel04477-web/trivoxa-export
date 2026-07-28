"use client";

import { useSyncExternalStore } from "react";
import { REDUCED_MOTION_QUERY } from "@/hooks/useScrollAnimations";

/**
 * Reactive form of `prefersReducedMotion()`, for the cases where the answer has
 * to be part of the RENDER rather than of an effect.
 *
 * The imperative helper is right for "should I build this tween?" — a one-shot
 * question asked inside an effect. It is wrong for "which value should this
 * element show?", because reading it during render on the client while the
 * server rendered without it produces a hydration mismatch, and reading it in
 * an effect to then call setState is a cascading render.
 *
 * useSyncExternalStore resolves both: React renders the server snapshot first,
 * then reconciles to the client value in the same commit — no mismatch, no
 * extra render pass — and re-renders if the OS setting is toggled mid-session.
 */
export function usePrefersReducedMotion(): boolean {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}

function subscribe(onChange: () => void): () => void {
  const mql = window.matchMedia(REDUCED_MOTION_QUERY);
  mql.addEventListener("change", onChange);
  return () => mql.removeEventListener("change", onChange);
}

function getSnapshot(): boolean {
  return window.matchMedia(REDUCED_MOTION_QUERY).matches;
}

/** The server cannot know the preference; it renders the motion-on markup. */
function getServerSnapshot(): boolean {
  return false;
}
