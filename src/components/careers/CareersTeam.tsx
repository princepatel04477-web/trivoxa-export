"use client";

import { CAREERS } from "@/lib/choreography";
import ParticleCanvasWrapper from "@/components/ParticleCanvasWrapper";

// Mounted via ParticleCanvasWrapper: that wrapper owns both `ssr: false` and
// the canvas error boundary, so no route can mount the field unguarded.

/**
 * The Careers signature animation: abstract silhouettes assembling into a team.
 *
 * Owns the CAREERS config rather than receiving it as a prop — the config carries
 * `buildStages` and `buildPhase`, and functions can't cross the server→client
 * boundary.
 */
export default function CareersTeam() {
  return <ParticleCanvasWrapper config={CAREERS} />;
}
