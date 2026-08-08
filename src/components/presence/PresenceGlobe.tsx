"use client";

import { GLOBAL_PRESENCE } from "@/lib/choreography";
import ParticleCanvasWrapper from "@/components/ParticleCanvasWrapper";

// Mounted via ParticleCanvasWrapper: that wrapper owns both `ssr: false` and
// the canvas error boundary, so no route can mount the field unguarded.

/**
 * The Global Presence signature animation: the particle globe, held spherical
 * for the length of the page while regions illuminate and trade routes draw.
 *
 * Owns the GLOBAL_PRESENCE config rather than receiving it as a prop — the config
 * carries `buildGeoField`, and functions can't cross the server→client boundary.
 */
export default function PresenceGlobe() {
  return <ParticleCanvasWrapper config={GLOBAL_PRESENCE} />;
}
