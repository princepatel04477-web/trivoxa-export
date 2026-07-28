"use client";

import { useSyncExternalStore } from "react";

const NAV_CLASS = "nav-active";

/**
 * Reads the mobile nav's open state.
 *
 * `document.body.classList` is the existing source of truth — the hamburger
 * toggles it, the CSS keys every open-state rule off it, and the overlay's
 * GSAP timeline plays/reverses from it. Rather than introduce a second,
 * competing store that could drift out of sync with the class, this subscribes
 * to the class itself, so the button's `aria-expanded` and the overlay's
 * `inert` are always reporting the same fact the stylesheet is acting on.
 */
export function useNavActive(): boolean {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}

function subscribe(onChange: () => void): () => void {
  const observer = new MutationObserver(onChange);
  observer.observe(document.body, { attributes: true, attributeFilter: ["class"] });
  return () => observer.disconnect();
}

function getSnapshot(): boolean {
  return document.body.classList.contains(NAV_CLASS);
}

/** The overlay is always closed on the server — nothing has been clicked yet. */
function getServerSnapshot(): boolean {
  return false;
}

/** Close the overlay. Exported so callers never hand-write the class name. */
export function closeNavOverlay(): void {
  document.body.classList.remove(NAV_CLASS);
}

/** Toggle the overlay (the hamburger's only job). */
export function toggleNavOverlay(): void {
  document.body.classList.toggle(NAV_CLASS);
}
