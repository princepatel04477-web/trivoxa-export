/**
 * Home-page shape vocabulary: the globe, the maritime trade beats, and the
 * brand mark. Geometry here is carried over verbatim from the original
 * particle-scene.ts so the home choreography is unchanged by the extraction.
 */

import * as THREE from "three";
import { buildGlobeGeometry } from "../globe-geometry";
import { sampleParts } from "./sample";
import { buildEagleStage } from "./eagle";
import { SHAPE_SPECTRUM } from "./palettes";
import type { Shape, ShapeContext } from "./types";

/**
 * The two-layer Fibonacci globe. Returns the per-particle layer attribute
 * alongside the shape because the shader's Layer-B dimming and depth cueing
 * are driven off it — the scene binds it once as a geometry attribute.
 *
 * Kept out of the generic registry for that reason: it is the only shape that
 * produces more than a position buffer.
 */
export function buildGlobeShape({ count, R }: ShapeContext): {
  shape: Shape;
  layer: Float32Array;
} {
  const geo = buildGlobeGeometry(count, R);
  return {
    shape: { name: "globe", data: geo.positions, spectrum: SHAPE_SPECTRUM.globe },
    layer: geo.layer,
  };
}

/**
 * Container ship (Global Presence) — maritime trade "across borders": long
 * hull, a grid of stacked deck containers, and a bridge tower at the stern.
 * flat:true → a stable, readable side profile facing the camera.
 */
export function buildCargoShip({ count, R }: ShapeContext): Shape {
  const parts: THREE.BufferGeometry[] = [];

  // ── Hull ────────────────────────────────────────────────────────────────
  // A box is why the old ship read as a brick. What makes a silhouette say
  // "ship" is almost entirely three things, none of which a box has: a raked
  // stem at the bow, a flat keel that lifts as it runs forward, and SHEER — the
  // deck line dipping amidships and rising at both ends. So the hull is a side
  // profile extruded across the beam, and since the stage is flat:true (side-on
  // to camera) that profile IS what the reader sees.
  //
  // Bow at +x, stern at -x. Traced as one closed loop: transom → keel → forefoot
  // → stem head → deck line back to the stern.
  const profile = new THREE.Shape();
  profile.moveTo(-R * 1.75, -R * 0.30); // transom foot
  profile.lineTo(-R * 1.56, -R * 0.46); // turn of the bilge
  profile.lineTo(R * 0.90, -R * 0.46); // flat keel
  profile.quadraticCurveTo(R * 1.72, -R * 0.44, R * 2.01, -R * 0.02); // forefoot sweeps up
  profile.lineTo(R * 2.07, R * 0.30); // raked stem head — the bow point
  profile.lineTo(R * 1.44, R * 0.19); // deck, forward
  profile.quadraticCurveTo(R * 0.1, R * 0.12, -R * 1.30, R * 0.21); // sheer: dips amidships
  profile.lineTo(-R * 1.75, R * 0.27); // deck, aft
  profile.closePath();

  const hull = new THREE.ExtrudeGeometry(profile, {
    depth: R * 0.62,
    bevelEnabled: false,
    curveSegments: 14,
  });
  hull.translate(0, 0, -R * 0.31); // extrudes along +z from 0; recentre on the axis
  parts.push(hull);

  // ── Deck cargo ──────────────────────────────────────────────────────────
  // Stacks step DOWN toward the bow. A level wall of boxes flattens the sheer
  // the hull just established; a stepped one lets the bow read as the high,
  // light end of the ship.
  const cols = 6;
  const cw = R * 0.36;
  const ch = R * 0.26;
  const gap = R * 0.05;
  const deckY = R * 0.17;
  const startX = -R * 1.02;
  for (let c = 0; c < cols; c++) {
    // 3 high over the body, 2 at the second-to-last bay, 1 at the bow bay.
    const stack = c >= cols - 1 ? 1 : c >= cols - 2 ? 2 : 3;
    for (let r = 0; r < stack; r++) {
      const box = new THREE.BoxGeometry(cw, ch, R * 0.5, 6, 5, 6);
      box.translate(startX + c * (cw + gap), deckY + ch * 0.5 + r * (ch + gap * 0.5), 0);
      parts.push(box);
    }
  }

  // ── Superstructure, aft ─────────────────────────────────────────────────
  // Accommodation block plus funnel, both at the stern. On a container ship the
  // bridge sits aft, and putting it there is most of what separates this
  // silhouette from a generic barge.
  const bridge = new THREE.BoxGeometry(R * 0.44, R * 0.62, R * 0.5, 6, 12, 6);
  bridge.translate(-R * 1.42, deckY + R * 0.31, 0);
  parts.push(bridge);

  const funnel = new THREE.BoxGeometry(R * 0.19, R * 0.28, R * 0.24, 4, 6, 4);
  funnel.translate(-R * 1.42, deckY + R * 0.76, 0);
  parts.push(funnel);

  // ── Fit ─────────────────────────────────────────────────────────────────
  // fitScale() frames the field off `globeRadius` — a SPHERE, shared by every
  // shape — so a form is only fully visible if it stays near the globe's own
  // ±R footprint. Drawn at natural proportions this hull spans 3.82R end to
  // end, nearly twice that, and both ends run off frame: the raked bow and the
  // aft superstructure are exactly what make the silhouette read as a ship, and
  // they were the parts being cropped. What was left on screen was a slab of
  // containers, which is why it did not look like a vessel.
  //
  // Scaled to ~2.4R, which still reads long and low against the globe it
  // replaces while keeping bow and stern inside the frame. Measured, not
  // guessed: at 0.72 the stern cleared but the bow was still crossing the right
  // edge, because the beat also carries sweep:1 which parks the form against
  // that edge. A round globe tolerates being parked; a form three times wider
  // than it is tall loses an end.
  const FIT = 0.63;

  // Recentre AFTER scaling. The silhouette runs from the keel at -0.46R up to
  // the funnel cap at +1.07R, so its mass sits above the origin; the shift is
  // scaled by the same factor or it would over-correct.
  parts.forEach((g) => {
    g.scale(FIT, FIT, FIT);
    g.translate(0, -R * 0.3 * FIT, 0);
  });

  const shape = sampleParts(parts, "cargo-ship", count);
  shape.flat = true;
  shape.spectrum = SHAPE_SPECTRUM.vessel;
  return shape;
}

/**
 * Small shipping container (About — "A Vision Beyond Business"): a single
 * corrugated box, sampled and held as a flat profile. Deliberately smaller
 * than the ship so the two maritime beats read as distinct moments.
 */
export function buildContainer({ count, R }: ShapeContext): Shape {
  const parts: THREE.BufferGeometry[] = [];
  const body = new THREE.BoxGeometry(R * 1.7, R * 0.74, R * 0.74, 46, 16, 16);
  parts.push(body);
  const ribs = 10;
  for (let i = 0; i < ribs; i++) {
    const rib = new THREE.BoxGeometry(R * 0.028, R * 0.74, R * 0.78, 2, 12, 8);
    rib.translate(-R * 0.82 + (i / (ribs - 1)) * R * 1.64, 0, 0);
    parts.push(rib);
  }
  // ── Scale parity with the other beats ───────────────────────────────────
  // Measured in globe radii, the sequence was globe 2.00R, vessel 2.41R,
  // container 1.70R — a 1.4x spread end to end, so the field changed SIZE as
  // well as shape between beats and the container read as a different, smaller
  // object rather than the same body reforming.
  //
  // 1.15 brings it to ~1.96R, just under the globe. Not matched exactly to the
  // vessel on purpose: a container SHOULD be shorter than the ship that carries
  // it, and forcing equal widths would trade one wrong reading for another. What
  // this removes is the size JUMP, not the proportion.
  const PARITY = 1.15;
  parts.forEach((g) => g.scale(PARITY, PARITY, PARITY));

  const shape = sampleParts(parts, "container", count);
  shape.flat = true;
  shape.spectrum = SHAPE_SPECTRUM.container;
  return shape;
}

/**
 * The Trivoxa eagle, built from the mark's PNG alpha channel — the brand
 * itself rendered in grains. Every page resolves into this at its CTA beat.
 */
export function buildEagle(ctx: ShapeContext): Promise<Shape> {
  return buildEagleStage(ctx);
}

