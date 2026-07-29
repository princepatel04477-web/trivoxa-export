/**
 * The poster frame (§4.3). Stands in for the WebGL particle field when the
 * pre-flight low-end gate blocks it, when the runtime frame-budget monitor
 * hands off mid-session, or when the render tier resolves to STATIC (reduced
 * motion, data-saver).
 *
 * §4.3 is emphatic that this must be real artwork: "A crisp static image reads
 * as deliberate restraint. An empty box reads as broken." What was here before
 * was a seven-line wireframe — a diagram of a globe rather than a still of the
 * one the site actually shows. The poster is now generated from the scene's
 * OWN geometry (scripts/mobile/export-posters.mjs runs buildGlobeGeometry over
 * the same continent rings and the same Fibonacci distribution), so a reader
 * who never sees the live field still sees the real composition, at the real
 * axial tilt, with the same land-and-shell density.
 *
 * It is applied as a CSS mask rather than an <img>: an external SVG cannot read
 * the page's custom properties, so a coloured file would have to bake gold in
 * and break §0.1. As a mask it carries only shape, and the colour stays
 * var(--gold-particle).
 *
 * No canvas, no JS loop, no WebGL context.
 */
export default function ParticleFallback() {
  return (
    <div className="particle-fallback" aria-hidden="true">
      <div className="particle-fallback__globe" />
    </div>
  );
}
