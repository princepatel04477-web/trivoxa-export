"use client";

/**
 * Region-scoped grain canvas — RECONCILED OUT.
 *
 * This layer used to paint an animated noise field scoped to the hero (via
 * GrainGlobe), the Group vision and CTA blocks, and the inner page heroes (via
 * SectionGrain). Site-wide grain now comes from ONE source: the document-level
 * `.grain-overlay` field mounted at the root of <body>.
 *
 * Two fields cannot coexist. Wherever a region layer overlapped the document
 * field the page carried two grain densities, and the boundary between them —
 * a textured hero sitting directly above flat, untextured body copy — is
 * precisely what made the page read as static rather than photographic. The
 * correction is not more grain; it is grain everywhere, at one intensity, from
 * one source.
 *
 * The element is retained rather than deleted so nothing above it restructures:
 * its three call sites, their containers, and the CSS that positions them are
 * all unchanged. An unpainted canvas composites to nothing, so it now costs one
 * empty element and no frames — no tile pool, no rAF, no ResizeObserver, no
 * per-tick fill. Its props are kept for the same reason; both are now decided
 * once, globally, by `.grain-overlay` and src/lib/grain.ts.
 */
interface GrainOverlayProps {
  /** Retained for API stability. Grain cadence is now global (25Hz, CSS). */
  frameSkip?: number;
  /** Retained for API stability. Handled globally by the reduced-motion query. */
  reducedMotion?: boolean;
}

export default function GrainOverlay(_props: GrainOverlayProps) {
  void _props;
  // `display: none` inline, so it beats the four per-page rules that style this
  // canvas without any of them having to change. It is not cosmetic: those rules
  // carry `mix-blend-mode`, and a blended element forces its own compositing
  // layer whether or not anything is painted into it. Left alone, the site would
  // carry four permanently promoted layers for grain that draws nothing. The
  // document field is the one persistent promoted layer, and it stays the only
  // one.
  return <canvas className="grain-globe__canvas" aria-hidden="true" style={{ display: "none" }} />;
}
