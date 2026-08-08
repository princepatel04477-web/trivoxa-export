"use client";

import { INSIGHTS } from "@/lib/choreography";
import ParticleCanvasWrapper from "@/components/ParticleCanvasWrapper";

// Mounted via ParticleCanvasWrapper: that wrapper owns both `ssr: false` and
// the canvas error boundary, so no route can mount the field unguarded.

/**
 * The Insights signature animation: a point of light expanding into an
 * intelligence network.
 *
 * Owns the INSIGHTS config rather than receiving it as a prop — the config carries
 * `buildStages` and `buildPhase`, and functions can't cross the server→client
 * boundary.
 */
export default function InsightsNetwork() {
  return <ParticleCanvasWrapper config={INSIGHTS} />;
}
