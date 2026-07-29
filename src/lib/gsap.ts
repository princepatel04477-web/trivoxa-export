"use client";

import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

if (typeof window !== "undefined") {
  gsap.registerPlugin(ScrollTrigger);

  // §5.3 — iOS fires `resize` every time the address bar collapses or
  // re-expands during an ordinary scroll. ScrollTrigger's default response is
  // a full refresh: it re-measures every trigger on the page, mid-gesture,
  // which on a 14,000px document is the most expensive thing that can happen
  // while the thumb is moving. It is also pure waste — the viewport WIDTH did
  // not change, so not one trigger boundary moved.
  //
  // `ignoreMobileResize` makes ScrollTrigger skip refreshes caused purely by
  // that vertical-only change. Real width changes still refresh normally.
  ScrollTrigger.config({ ignoreMobileResize: true });

  // Orientation change DOES move every boundary, and it is the one case
  // `ignoreMobileResize` deliberately does not cover. Refresh on it, debounced
  // 150ms so a rotation that fires several events costs one re-measure, and
  // gated on the width having actually changed so nothing here can reintroduce
  // the address-bar storm above.
  let lastWidth = window.innerWidth;
  let refreshTimer = 0;
  const onOrientation = () => {
    window.clearTimeout(refreshTimer);
    refreshTimer = window.setTimeout(() => {
      if (window.innerWidth === lastWidth) return;
      lastWidth = window.innerWidth;
      ScrollTrigger.refresh();
    }, 150);
  };
  // `orientationchange` fires BEFORE the new dimensions are readable on some
  // Android builds, so the debounce doubles as the settle window. The
  // matchMedia listener is the modern equivalent and covers browsers that have
  // dropped the legacy event.
  window.addEventListener("orientationchange", onOrientation);
  window.matchMedia("(orientation: portrait)").addEventListener("change", onOrientation);

  // §5.3 asks for a leak audit ("with this many sections, a leak will surface
  // as progressive slowdown as the user browses"). A leak is only observable
  // as ScrollTrigger.getAll() growing across route changes, and that cannot be
  // read from outside the bundle — so the instance is published here for
  // scripts/mobile/motion-check.mjs, and for anyone debugging trigger
  // boundaries in a console. One property assignment, no retained closure, no
  // effect on anything that renders.
  (window as unknown as { __ST_FOR_TEST?: typeof ScrollTrigger }).__ST_FOR_TEST = ScrollTrigger;
}

/* The old `BP` export (991 / 767 / 575) is gone. Those were three of the
   fourteen contradictory widths the audit found, and nothing imported them.
   The ladder now lives in ONE place — `BREAKPOINT` in lib/device.ts — and
   component-level motion conditions are written as gsap.matchMedia queries
   against it, so a JS behaviour boundary and its CSS counterpart cannot drift
   apart silently. */

export { gsap, ScrollTrigger };
