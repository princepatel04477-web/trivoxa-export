"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { applyGrainFloor } from "@/lib/grain";
import { startHoverSystem, tagHoverTargets } from "@/lib/hover";

/**
 * Mounts the two surface systems: the grain field's device tier, and the hover
 * vocabulary.
 *
 * Renders nothing. It exists because both systems are site-wide by definition —
 * a grain tier decided per page would seam at every navigation, and a hover
 * implemented per page is the thing that drifts. One mount point, at the root.
 */
export default function SurfaceProvider() {
  const pathname = usePathname();

  // Device tier for the grain field. Resolved once — hardware class does not
  // change mid-session, and the frame-budget ladder escalates through the same
  // module when a route needs it.
  useEffect(() => {
    applyGrainFloor();
  }, []);

  useEffect(() => startHoverSystem(), []);

  // Re-tag after each client-side navigation, because the new route's markup
  // did not exist when the previous pass ran. Tagging is idempotent (every
  // element is skipped once it carries `data-hv`), so a repeat costs one
  // querySelectorAll and nothing else.
  //
  // Deferred a frame past paint: React commits the new tree first, and tagging
  // reads computed styles, which would otherwise force a synchronous layout in
  // the middle of the navigation.
  useEffect(() => {
    const id = requestAnimationFrame(() => tagHoverTargets());
    return () => cancelAnimationFrame(id);
  }, [pathname]);

  return null;
}
