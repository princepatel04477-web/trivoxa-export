"use client";

import { HOME } from "@/lib/choreography";
import ParticleCanvasWrapper from "@/components/ParticleCanvasWrapper";

// Mounted via ParticleCanvasWrapper: that wrapper owns both `ssr: false` and
// the canvas error boundary, so no route can mount the field unguarded.

/**
 * The home page's particle field.
 *
 * This component exists to OWN the HOME config rather than receive it, for the
 * same reason GroupLattice / BusinessesCube / CareersTeam / InsightsNetwork do:
 * the config now carries `buildStages`, a function, and functions cannot cross
 * the server→client serialization boundary as props.
 *
 * HOME used to be plain data and so used to be passable straight from
 * `page.tsx`. It stopped being plain data when the home choreography became a
 * scrubbed stage sequence instead of a discrete beat list — see the note at the
 * top of HOME in lib/choreography.ts. Home is now the fifth page to follow this
 * pattern rather than the one exception to it.
 */
export default function HomeField() {
  return <ParticleCanvasWrapper config={HOME} />;
}
