"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import { usePrefersReducedMotion } from "@/hooks/usePrefersReducedMotion";

// ssr:false keeps THREE out of the server render entirely — nothing to hydrate,
// so no mismatch, and the ~74KB vendored module is fetched only on this route.
const AtomicGlobe = dynamic(() => import("@/components/presence/vendor/AtomicGlobe"), {
  ssr: false,
});

/**
 * Trivoxa's trade hubs, as globe hotspots.
 *
 * These are the same eight cities the retired flat map plotted (Surat is the
 * origin every lane draws from), carried over so the network the page describes
 * in prose is the network the globe shows.
 */
const HUBS = [
  { label: "Surat, India", lat: 21.17, lng: 72.83, description: "Origin — sourcing, consolidation, and export coordination." },
  { label: "Dubai, UAE", lat: 25.2, lng: 55.27, description: "Gulf distribution for building materials, agriculture, and consumer goods." },
  { label: "Singapore", lat: 1.35, lng: 103.82, description: "Asia-Pacific transhipment and cross-border trade." },
  { label: "London, United Kingdom", lat: 51.51, lng: -0.13, description: "European textiles, professional services, and buyer relationships." },
  { label: "New York, United States", lat: 40.71, lng: -74.01, description: "North American textiles, home goods, and technology services." },
  { label: "São Paulo, Brazil", lat: -23.55, lng: -46.63, description: "South American sourcing partnerships and consumer goods." },
  { label: "Lagos, Nigeria", lat: 6.52, lng: 3.38, description: "African agriculture, pharmaceuticals, and industrial supply." },
  { label: "Shanghai, China", lat: 31.23, lng: 121.47, description: "Manufacturing collaboration across the Asia-Pacific corridor." },
];

/** Design tokens this globe needs, in the order they are read below. */
const TOKENS = ["--gold-particle", "--bg", "--gold", "--gold-hover", "--text", "--bg-card"] as const;

type Palette = Record<(typeof TOKENS)[number], string>;

/**
 * Reads the resolved value of each token off :root.
 *
 * The vendored component hands its colours to THREE, which cannot parse
 * `var(--gold)` — it needs a concrete value. Rather than hardcode hexes here
 * (which would fork the palette the moment a token changes), the tokens are
 * resolved from computed style at mount, so the globe stays bound to
 * globals.css as its single source of truth.
 */
function readPalette(): Palette | null {
  if (typeof window === "undefined") return null;
  const root = getComputedStyle(document.documentElement);
  const out = {} as Palette;
  for (const token of TOKENS) {
    const value = root.getPropertyValue(token).trim();
    // A token that resolves to nothing would reach THREE as an empty string and
    // silently render black; better to bail and let the caller skip the globe.
    if (!value) return null;
    out[token] = value;
  }
  return out;
}

/**
 * The Global Presence globe.
 *
 * Replaces the shared particle engine's geo-mode field on this page. Only one
 * WebGL context runs here — this one.
 *
 * Reduced motion is handled inside the vendored component via the
 * `useIsStaticRenderer` shim (see lib/framer-runtime.ts): it paints a single
 * fully-formed frame and never starts a render loop. Arcs are additionally
 * switched off, since their travel is the one piece of motion that persists
 * independently of the loop.
 */
export default function AtomicGlobeScene() {
  // Lazy initialiser, not an effect: reading computed style and then calling
  // setState from an effect is a cascading render. This runs once per mount and
  // returns null during SSR, where there is no :root to measure.
  const [palette] = useState<Palette | null>(() => readPalette());
  const reduced = usePrefersReducedMotion();

  // Deliberately NOT an early return on `palette`. AtomicGlobe is loaded with
  // ssr:false, so it renders null on the server AND on the client's first paint
  // (before its chunk arrives) — rendering the same element on both sides keeps
  // those two passes identical. Bailing out early here instead would make the
  // server and client trees diverge, which is the hydration mismatch this
  // component exists to avoid.
  if (!palette) return <AtomicGlobe style={{ width: "100%", height: "100%" }} />;

  return (
    <AtomicGlobe
      style={{ width: "100%", height: "100%" }}
      /* Applied as a CSS `background` on the wrapper div, not a THREE clear
         colour — so "transparent" is valid and lets the page ground show. */
      backgroundColor="transparent"
      dotColor={palette["--gold-particle"]}
      backParticleOpacity={0.18}
      /* A POINT COUNT, not a 0-1 multiplier (upstream default 130000). */
      dotDensity={120000}
      baseSize={4}
      sizeRandomness={1}
      globeScale={1.05}
      rotationSpeed={reduced ? 0 : 0.05}
      tilt={16}
      centerLng={40}
      enableHover={!reduced}
      allowVerticalDrag
      showArcs={!reduced}
      arcColor={palette["--gold"]}
      /* Only "chain" and "all" are valid. "all" is 28 arcs across 8 hubs —
         a mesh, not a set of lanes — so the sequential chain is used, with
         Surat first in HUBS so the loop starts at the origin. */
      arcMode="chain"
      arcHeight={0.35}
      arcSpeed={0.5}
      reformOnScroll={!reduced}
      markers={HUBS}
      markerType="pin"
      pinColor={palette["--gold"]}
      markerBgColor={palette["--bg-card"]}
      markerActiveBgColor={palette["--gold"]}
      markerActiveIconColor={palette["--bg"]}
      markerTextColor={palette["--text"]}
      performanceMode="auto"
    />
  );
}
