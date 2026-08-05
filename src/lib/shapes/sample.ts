import * as THREE from "three";
import { MeshSurfaceSampler } from "three/examples/jsm/math/MeshSurfaceSampler.js";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import type { Shape } from "./types";

/**
 * Sample `count` points off any BufferGeometry surface.
 *
 * Disposes the geometry it is handed — callers pass a throwaway.
 */
export function sampleGeometry(geo: THREE.BufferGeometry, name: string, count: number): Shape {
  const mesh = new THREE.Mesh(geo);
  const sampler = new MeshSurfaceSampler(mesh).build();
  const data = new Float32Array(count * 3);
  const tmp = new THREE.Vector3();
  for (let i = 0; i < count; i++) {
    sampler.sample(tmp);
    data[i * 3] = tmp.x;
    data[i * 3 + 1] = tmp.y;
    data[i * 3 + 2] = tmp.z;
  }
  geo.dispose();
  return { name, data };
}

/**
 * Merge a set of primitive parts into one geometry and sample it, disposing
 * every part.
 *
 * mergeGeometries requires every part to agree on indexed-ness. The THREE
 * primitives are all indexed, but ExtrudeGeometry — which is how a hull profile
 * gets built — is not, and mixing the two returns null. So the list is
 * normalised first: if ANY part is non-indexed, they all get flattened.
 * Sampling is area-weighted over triangles either way, so this costs a little
 * memory during the build and nothing in the result.
 */
export function sampleParts(parts: THREE.BufferGeometry[], name: string, count: number): Shape {
  const mixed = parts.some((g) => !g.index);
  const normalised = mixed ? parts.map((g) => (g.index ? g.toNonIndexed() : g)) : parts;
  const merged = mergeGeometries(normalised, false);
  if (!merged) throw new Error(`sampleParts("${name}"): geometries could not be merged`);
  // Dispose the throwaway conversions as well as the originals.
  normalised.forEach((g, i) => {
    if (g !== parts[i]) g.dispose();
  });
  parts.forEach((g) => g.dispose());
  return sampleGeometry(merged, name, count);
}
