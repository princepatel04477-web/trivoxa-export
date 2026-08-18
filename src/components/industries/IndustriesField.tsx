"use client";

import { INDUSTRIES } from "@/lib/choreography";
import ParticleCanvasWrapper from "@/components/ParticleCanvasWrapper";

// Mounted via ParticleCanvasWrapper: that wrapper owns both `ssr: false` and
// the canvas error boundary, so no route can mount the field unguarded.

/**
 * The Industries page's signature field: eight sectors converging on one spine.
 *
 * Owns the INDUSTRIES config rather than receiving it as a prop — the config
 * carries `buildStages`, and functions can't cross the server→client boundary.
 */
export default function IndustriesField() {
  return <ParticleCanvasWrapper config={INDUSTRIES} />;
}
