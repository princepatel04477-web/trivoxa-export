/**
 * Per-shape spectra.
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
   * Globe — ocean and land. Deep sea blue through shelf blue into two greens,
   * so the land masses separate from the water at the same opacity instead of
   * relying on brightness alone.
   */
  globe: ["#1F5FA8", "#2E8FC0", "#2FA36B", "#7ED07A"],

  /**
   * Cargo vessel — white and black, RANGED FOR ADDITIVE.
   *
   * The literal reading of "white and black" does not survive this renderer. On
   * an additive field every grain only ever ADDS light, so a #14181C hull grain
   * contributes almost nothing and the hull simply fails to draw — the first
   * version of this palette put half the ship's grains below the visible floor
   * and the vessel came out patchy and broken.
   *
   * Black therefore has to be made of ABSENCE, not of dark grains: the hull
   * reads dark because the silhouette's interior is sparse and the page behind
   * it is black. What the palette controls is the lit part. So the range runs
   * slate → steel → pewter → white, which is a monochrome white/black vessel on
   * screen while every grain still renders.
   */
  vessel: ["#5A6675", "#8D9AA8", "#C4CDD6", "#FFFFFF"],

  /**
   * Container — corten / oxide. Dark rust through mid oxide into a dusty tan
   * highlight, which is what stops it reading as flat cardboard.
   */
  container: ["#3A1E12", "#6B3A1F", "#9C5A2E", "#C98A52"],

  /**
   * The mark — white. Cool white through to warm white rather than four #FFF,
   * so the eagle still has internal form at low opacity.
   */
  logo: ["#C9D2DC", "#E4EAF0", "#F5F8FB", "#FFFFFF"],
} as const satisfies Record<string, readonly [string, string, string, string]>;
