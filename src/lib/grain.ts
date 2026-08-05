/**
 * Grain tiering — the one writer to `<html data-grain>`.
 *
 * The grain field itself is CSS (`.grain-overlay`, globals.css): one fixed
 * full-viewport layer, one tokenized intensity, no JavaScript in the render
 * path. This module exists only to decide which of the three tiers that layer
 * runs at, because two independent things want a say:
 *
 *   - the DEVICE FLOOR, resolved once at mount from the hardware class, and
 *   - the FRAME-BUDGET LADDER inside the particle engine, which may ask for a
 *     further step down while a route is under sustained load.
 *
 * Two writers to one attribute is how an attribute ends up flickering, so both
 * go through here and the STRONGEST request wins. The ladder relaxing back does
 * not lift a device below its floor.
 *
 * Grain is never removed. `dim` thins the field; it does not clear it. A page
 * without grain does not match its siblings, and a missing texture reads as a
 * rendering fault rather than as a performance decision.
 */

import { deviceClass } from "@/lib/device";

/** 0 = animated, 1 = static texture, 2 = static and thinned. */
export type GrainTier = 0 | 1 | 2;

const ATTR: Record<GrainTier, string | null> = {
  0: null,
  1: "static",
  2: "dim",
};

let floor: GrainTier = 0;
let requested: GrainTier = 0;

function commit(): void {
  if (typeof document === "undefined") return;
  const tier = Math.max(floor, requested) as GrainTier;
  const value = ATTR[tier];
  if (value) document.documentElement.dataset.grain = value;
  else delete document.documentElement.dataset.grain;
}

/**
 * The device floor. Called once, at mount, from the root provider.
 *
 * A blended layer across the whole viewport is cheap to composite on desktop
 * and measurably less so on a handset GPU. Handsets therefore hold a static
 * field: the texture is identical, only the 25Hz reseed stops.
 */
export function applyGrainFloor(): void {
  floor = deviceClass() === "mobile" ? 1 : 0;
  commit();
}

/**
 * Rungs 3 and 4 of the particle engine's degradation ladder.
 *
 * Those rungs previously stepped down, and then disabled, the in-canvas
 * postprocess grain. That pass no longer exists — it was reconciled out so the
 * document field is the single source and the canvas boundary carries no seam —
 * so the rungs now drive the document field instead. Both are reversible.
 */
export function requestGrainStep(step: GrainTier): void {
  requested = step;
  commit();
}
