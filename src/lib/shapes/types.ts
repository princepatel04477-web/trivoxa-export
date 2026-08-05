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
  /**
   * Four-stop spectrum this form is rendered in, as hex strings, cool→warm.
   *
   * The field's spectrum uniforms are tweened to these across the morph that
   * creates the stage, so a form arrives in its own colour rather than
   * switching to it. Omit to hold whatever the previous stage established (the
   * page's token spectrum on first paint).
   *
   * A shape's identity is partly its colour — a globe is water and land, a hull
   * is painted steel, a container is oxide. See PALETTE in shapes/palettes.ts.
   */
  spectrum?: readonly [string, string, string, string];
}

export interface ShapeContext {
  /** Particle pool size — 7000 desktop, 3000 mobile. */
  count: number;
  /** Nominal shape radius in world units (== globeRadius). */
  R: number;
  /** Viewport scale factor: 1 desktop, 0.82 tablet, 0.66 mobile. */
  S: number;
}

/* Colour used to live nowhere in this module — a Shape carried geometry and an
 * accent MASK only, and every hue came from the scene's palette tokens.
 *
 * That held while every stage was the same field wearing one palette. It stopped
 * holding once the stages became things: a globe, a hull, a container, the mark.
 * A brown globe or a gold container reads as the same abstract dust in a
 * different mood, not as the object. So a Shape may now name its own four-stop
 * `spectrum`, and the scene tweens into it across the morph.
 *
 * The tokens remain the DEFAULT — a shape without a spectrum inherits whatever
 * is current, so nothing that predates this has to opt out. */
