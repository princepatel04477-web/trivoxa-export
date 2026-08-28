/**
 * Home-page shape vocabulary: the globe, the maritime trade beats, and the
 * brand mark. Geometry here is carried over verbatim from the original
 * particle-scene.ts so the home choreography is unchanged by the extraction.
 */

import * as THREE from "three";
import { buildGlobeGeometry } from "../globe-geometry";
import { sampleParts } from "./sample";
import { buildEagleStage } from "./eagle";
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
    shape: { name: "globe", data: geo.positions },
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
  const hull = new THREE.BoxGeometry(R * 3.4, R * 0.55, R * 0.7, 60, 8, 8);
  hull.translate(0, -R * 0.35, 0);
  parts.push(hull);
  const cols = 7;
  const rows = 3;
  const cw = R * 0.42;
  const ch = R * 0.3;
  const gap = R * 0.05;
  const startX = -R * 1.3;
  for (let c = 0; c < cols; c++) {
    const stack = c === cols - 1 ? rows - 1 : rows; // taper the bow stack
    for (let r = 0; r < stack; r++) {
      const box = new THREE.BoxGeometry(cw, ch, R * 0.55, 6, 5, 6);
      box.translate(startX + c * (cw + gap), -R * 0.02 + r * (ch + gap * 0.6), 0);
      parts.push(box);
    }
  }
  const bridge = new THREE.BoxGeometry(R * 0.5, R * 0.75, R * 0.52, 6, 12, 6);
  bridge.translate(R * 1.2, R * 0.42, 0);
  parts.push(bridge);
  const shape = sampleParts(parts, "cargo-ship", count);
  shape.flat = true;
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
  const shape = sampleParts(parts, "container", count);
  shape.flat = true;
  return shape;
}

/**
 * The Trivoxa eagle, built from the mark's PNG alpha channel — the brand
 * itself rendered in grains. Every page resolves into this at its CTA beat.
 */
export function buildEagle(ctx: ShapeContext): Promise<Shape> {
  return buildEagleStage(ctx);
}

