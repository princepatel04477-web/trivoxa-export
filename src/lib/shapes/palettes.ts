/**
 * Per-shape spectra.
 *
 * REPALETTED to the TRIVOXA brand sheet (trivoxa-colours.md). These were a
 * literal reading of each object — ocean blues for the globe, painted steel for
 * the hull, oxide for the container — and against an Espresso ground they read
 * as four unrelated objects rather than one brand. Every ramp now runs inside
 * Espresso -> Bronze -> Ivory.
 *
 * NOTE: these are hardcoded hex ON PURPOSE and are the ONE exception to the
 * "no hex outside globals.css" rule, because a Shape is built before any
 * document exists to read a CSS custom property from. If the brand sheet
 * changes, this file has to change with globals.css — it will not follow.
 *
 * Kept additive-safe: no stop is near-black. On an additive field a very dark
 * grain adds almost no light and simply fails to draw, which is what made an
 * earlier near-black hull render as a patchy silhouette.
 *
 * Each entry is four stops, cool→warm, that the field's uSpectrumA–D uniforms
 * are tweened to across the morph that builds the stage. The vertex shader
 * ramps a per-particle hue across all four (see `tvxSpectrum`), so these read as
 * a material rather than a flat fill: the spread between the stops is what makes
 * a hull look like painted steel instead of grey dust.
 *
 * Keep four distinguishable stops even in a "monochrome" form. Four copies of
 * the same hex collapses the ramp and the form goes dead flat — the vessel's
 * near-black stop is what gives its white one something to be white against.
 */
export const SHAPE_SPECTRUM = {
  /**
   * Globe — Espresso through Bronze into Ivory. Land and ocean separate by
   * VALUE rather than by hue: the continents sit at the Ivory end, the water at
   * the Espresso end. A blue-green earth was the literal reading and it fought
   * every other colour on the page.
   */
  globe: ["#4A3B2E", "#7A6650", "#A88B68", "#F4EFE6"],

  /**
   * Cargo vessel — warm greys to White, RANGED FOR ADDITIVE.
   *
   * Still reads as a white-and-black ship, but the darks are made of ABSENCE,
   * not of dark grains: on an additive field a grain only ever ADDS light, so a
   * near-black hull grain contributes nothing and simply fails to draw. An
   * earlier version put half the ship below the visible floor and the hull came
   * out patchy. The palette controls only the lit part; the page ground supplies
   * the black. Neutrals are warmed toward the brand rather than left blue-grey.
   */
  vessel: ["#5B4F45", "#8A7C6C", "#C6BAAC", "#FFFFFF"],

  /**
   * Container — Espresso through Bronze into warm sand. The one form whose
   * literal material (oxide steel) already sat inside the brand family, so this
   * changed least; the stops are simply pulled onto the exact brand hues.
   */
  container: ["#3A2C22", "#6B5340", "#A88B68", "#D9C4A6"],

  /**
   * The mark — Ivory to White. A warm ramp rather than four copies of #FFF, so
   * the eagle keeps internal form at low opacity instead of flattening into a
   * silhouette. This is the brand's own logo pairing: Ivory on Espresso.
   */
  logo: ["#C9BFB1", "#E0D8CC", "#F4EFE6", "#FFFFFF"],
} as const satisfies Record<string, readonly [string, string, string, string]>;
