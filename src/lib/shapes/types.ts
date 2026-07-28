/**
 * Shared types for the particle shape registry.
 *
 * A Shape is just a target position buffer for the scene's shared particle
 * pool — morphing is a lerp from the pool's current positions into `data`,
 * so every shape must be built at the same `count` as the pool.
 */

export interface Shape {
  name: string;
  /** Interleaved xyz target positions, length count*3. */
  data: Float32Array;
  /**
   * Flat silhouettes (the eagle, fanned planes, concentric rings) breathe and
   * follow the cursor instead of spinning on Y — a side-on spin would collapse
   * them to a line.
   */
  flat?: boolean;
  /**
   * Per-particle accent mask, length `count`. 1 renders the particle in the
   * accent hue, 0 in the primary. Interpolated alongside position across a
   * morph, so a node can warm into the accent tone as the form arrives. Omit for a
   * single-hue shape.
   */
  accent?: Float32Array;
  /**
   * Straight connections drawn between node centres while this stage is on
   * screen, as line geometry rather than particles. Interleaved pairs:
   * [ax,ay,az, bx,by,bz, …].
   *
   * Draw DIRECTION is baked by endpoint order: a segment grows from its first
   * point toward its second, so a thread that should converge inward is stored
   * edge-first and one that radiates outward is stored centre-first.
   */
  links?: Float32Array;
  /**
   * Ambient positional drift amplitude in world units (0 = still). Raised on a
   * deliberately loose stage so the form reads as dispersing.
   */
  drift?: number;
  /**
   * Y-axis rotation rate in radians/sec while this stage is settled, interpolated
   * across a morph like `drift`.
   *
   * A volumetric form (a cube) has to turn in 3D to read as one; a form that is
   * essentially planar (a left-to-right process chain) must not, or it turns
   * edge-on and collapses. So the rate belongs to the stage, not the scene.
   */
  spinY?: number;
}

export interface ShapeContext {
  /** Particle pool size — 7000 desktop, 3000 mobile. */
  count: number;
  /** Nominal shape radius in world units (== globeRadius). */
  R: number;
  /** Viewport scale factor: 1 desktop, 0.82 tablet, 0.66 mobile. */
  S: number;
}

/* Colour deliberately lives nowhere in this module. A Shape carries geometry and
 * an accent MASK only; the hues come from the scene's palette tokens (see
 * design-tokens.ts), so a shape can never pin a colour of its own. */
