"use client";

import { GROUP } from "@/lib/choreography";
import ParticleCanvasWrapper from "@/components/ParticleCanvasWrapper";

// Mounted via ParticleCanvasWrapper: that wrapper owns both `ssr: false` and
// the canvas error boundary, so no route can mount the field unguarded.

/**
 * The Group page's signature lattice.
 *
 * This component exists to OWN the GROUP config rather than receive it: the
 * config carries `buildStages`, a function, and functions cannot be passed as
 * props from a server component to a client one. Importing it inside the client
 * boundary keeps it off the serialization path. (HOME was the one exception
 * while its config was plain data; it now follows the same pattern — see
 * HomeField.)
 */
export default function GroupLattice() {
  return <ParticleCanvasWrapper config={GROUP} />;
}
