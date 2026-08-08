"use client";

import { BUSINESSES } from "@/lib/choreography";
import ParticleCanvasWrapper from "@/components/ParticleCanvasWrapper";

// Mounted via ParticleCanvasWrapper: that wrapper owns both `ssr: false` and
// the canvas error boundary, so no route can mount the field unguarded.

/**
 * The Businesses signature animation: a cube that unfolds into sectors.
 *
 * Owns the BUSINESSES config rather than receiving it as a prop — the config
 * carries `buildStages`, and functions can't cross the server→client boundary.
 */
export default function BusinessesCube() {
  return <ParticleCanvasWrapper config={BUSINESSES} />;
}
