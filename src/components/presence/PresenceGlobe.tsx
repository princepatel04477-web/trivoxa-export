"use client";

import dynamic from "next/dynamic";
import { GLOBAL_PRESENCE } from "@/lib/choreography";

// ssr:false keeps the WebGL scene out of the server render entirely — nothing to
// hydrate, so no mismatch and no mount-gate state.
const ParticleCanvas = dynamic(() => import("@/components/ParticleCanvas"), { ssr: false });

/**
 * The Global Presence signature animation: the particle globe, held spherical
 * for the length of the page while regions illuminate and trade routes draw.
 *
 * Owns the GLOBAL_PRESENCE config rather than receiving it as a prop — the config
 * carries `buildGeoField`, and functions can't cross the server→client boundary.
 */
export default function PresenceGlobe() {
  return <ParticleCanvas config={GLOBAL_PRESENCE} />;
}
