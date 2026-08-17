/**
 * Operation Midnight Navy · Phase 3 — procedural globe geometry.
 *
 * Replaces the old MeshSurfaceSampler random-UV sampling of globe2.obj (the
 * cause of the visible clumping and pole-bunching) with a Fibonacci
 * golden-angle distribution and a two-layer composition:
 *
 *   Layer A — Landmass (~70% of the budget): Fibonacci points kept only where
 *     they fall on land (coarse continent polygons below), so continents read
 *     at a glance. Occupies indices [0, landCount).
 *   Layer B — Shell (~30%): a sparse full-sphere Fibonacci lattice (oceans
 *     included) so the form reads as a solid globe, not floating continents.
 *     Occupies indices [landCount, count); rendered dimmer via aLayer.
 *
 * The lon/lat -> position mapping matches geo-sphere.ts's latLonToVec3 (verified
 * inverse of vec3ToLatLon) so the particle continents line up with the 3D
 * trade-arc overlay's port coordinates.
 */

import { vec3ToLatLon } from "./geo-sphere";

/** Coarse continent outlines as closed [lon, lat] rings. Not survey-accurate —
 * tuned to read as recognizable continents on the rotating particle globe. */
const CONTINENTS: [number, number][][] = [
  // North America
  [
    [-165, 60], [-160, 66], [-150, 70], [-130, 70], [-110, 72], [-95, 73],
    [-82, 74], [-65, 68], [-58, 52], [-56, 46], [-70, 44], [-72, 40],
    [-76, 34], [-81, 26], [-90, 29], [-97, 26], [-105, 22], [-112, 30],
    [-118, 33], [-124, 40], [-125, 48], [-135, 55], [-148, 58], [-165, 60],
  ],
  // Central America bridge
  [
    [-92, 18], [-83, 15], [-77, 8], [-83, 8], [-92, 18],
  ],
  // South America
  [
    [-79, 9], [-72, 11], [-62, 10], [-50, 0], [-42, -3], [-35, -8],
    [-38, -13], [-40, -22], [-48, -25], [-53, -34], [-58, -39], [-65, -45],
    [-72, -50], [-70, -55], [-74, -52], [-73, -42], [-71, -33], [-71, -24],
    [-76, -14], [-81, -6], [-80, 2], [-79, 9],
  ],
  // Africa
  [
    [-16, 14], [-16, 20], [-10, 28], [-2, 35], [10, 37], [20, 33], [32, 31],
    [35, 24], [38, 16], [44, 12], [51, 11], [48, 2], [42, -4], [40, -12],
    [35, -22], [27, -32], [20, -35], [15, -28], [12, -16], [9, -2], [5, 5],
    [-4, 5], [-12, 8], [-16, 14],
  ],
  // Europe
  [
    [-9, 37], [-9, 43], [-2, 48], [1, 50], [-4, 55], [3, 59], [8, 63],
    [15, 66], [24, 70], [30, 70], [40, 66], [42, 58], [38, 52], [30, 48],
    [28, 44], [20, 42], [16, 46], [10, 44], [3, 43], [-2, 40], [-9, 37],
  ],
  // Asia
  [
    [42, 58], [50, 62], [60, 66], [72, 68], [85, 72], [100, 74], [115, 74],
    [130, 70], [142, 66], [145, 58], [155, 58], [168, 66], [178, 68],
    [172, 60], [160, 58], [150, 52], [142, 46], [140, 52], [135, 44],
    [130, 42], [127, 38], [122, 40], [120, 32], [110, 22], [108, 14],
    [104, 9], [100, 13], [98, 8], [92, 20], [88, 22], [80, 14], [77, 8],
    [72, 20], [68, 24], [60, 25], [57, 26], [52, 28], [48, 30], [47, 38],
    [50, 44], [45, 48], [42, 52], [42, 58],
  ],
  // Australia
  [
    [114, -22], [122, -18], [130, -12], [137, -12], [142, -11], [146, -18],
    [150, -25], [153, -28], [150, -38], [143, -39], [138, -35], [130, -32],
    [123, -34], [115, -34], [113, -26], [114, -22],
  ],
  // Greenland
  [
    [-45, 60], [-30, 60], [-20, 70], [-25, 78], [-40, 82], [-55, 80],
    [-58, 72], [-52, 64], [-45, 60],
  ],
];

/** Ray-cast point-in-polygon on a [lon, lat] ring. */
function pointInRing(lon: number, lat: number, ring: [number, number][]): boolean {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, yi] = ring[i];
    const [xj, yj] = ring[j];
    const intersect =
      yi > lat !== yj > lat &&
      lon < ((xj - xi) * (lat - yi)) / (yj - yi || 1e-9) + xi;
    if (intersect) inside = !inside;
  }
  return inside;
}

/**
 * Lon/lat bounding box per continent ring, computed once at module load.
 *
 * The globe build is the most expensive thing on the page's load path: it
 * oversamples the sphere at ~4x the land budget and tests every point against
 * every ring, so at a 34,000-point pool that is ~95,000 points x 8 rings x ~20
 * edges — around 15 million segment tests, and it was measured at 309ms of
 * unbroken main-thread work.
 *
 * A box test rejects most of that for four comparisons. Roughly 71% of the
 * sphere is ocean and no ocean point is inside more than one box, so the full
 * ray-cast now runs on a small fraction of the pairs it used to.
 *
 * Exact, not approximate: a point outside a ring's bounding box cannot be
 * inside the ring, so this changes the cost and not the result.
 */
const CONTINENT_BOXES = CONTINENTS.map((ring) => {
  let minLon = Infinity;
  let maxLon = -Infinity;
  let minLat = Infinity;
  let maxLat = -Infinity;
  for (const [lon, lat] of ring) {
    if (lon < minLon) minLon = lon;
    if (lon > maxLon) maxLon = lon;
    if (lat < minLat) minLat = lat;
    if (lat > maxLat) maxLat = lat;
  }
  return { minLon, maxLon, minLat, maxLat, ring };
});

export function isLand(lon: number, lat: number): boolean {
  for (let i = 0; i < CONTINENT_BOXES.length; i++) {
    const b = CONTINENT_BOXES[i];
    if (lon < b.minLon || lon > b.maxLon || lat < b.minLat || lat > b.maxLat) continue;
    if (pointInRing(lon, lat, b.ring)) return true;
  }
  return false;
}

/** Golden-angle (Fibonacci) direction on the unit sphere for index i of n. */
function fibDirection(i: number, n: number): [number, number, number] {
  const y = 1 - (i / Math.max(1, n - 1)) * 2; // 1 (north pole) -> -1 (south)
  const r = Math.sqrt(Math.max(0, 1 - y * y));
  const goldenAngle = Math.PI * (3 - Math.sqrt(5));
  const theta = goldenAngle * i;
  return [Math.cos(theta) * r, y, Math.sin(theta) * r];
}

export interface GlobeGeometry {
  /** Interleaved xyz positions, length count*3. Land indices first. */
  positions: Float32Array;
  /** Per-particle layer flag: 0 = landmass (Layer A), 1 = shell (Layer B). */
  layer: Float32Array;
  landCount: number;
}

/**
 * Build the two-layer particle globe.
 * @param count  total particle budget (shared pool size)
 * @param radius world-unit sphere radius
 */
export function buildGlobeGeometry(count: number, radius: number): GlobeGeometry {
  const landCount = Math.floor(count * 0.7);
  const shellCount = count - landCount;
  const positions = new Float32Array(count * 3);
  const layer = new Float32Array(count);

  // Layer A — oversample the sphere with Fibonacci points, keep the land hits,
  // then subsample evenly across the collected set (Fibonacci index order runs
  // pole-to-pole, so an even stride avoids a hemisphere bias).
  let landDirs: number[] = [];
  let K = Math.max(landCount * 4, 20000);
  for (let attempt = 0; attempt < 5 && landDirs.length / 3 < landCount; attempt++) {
    landDirs = [];
    for (let i = 0; i < K; i++) {
      const [x, y, z] = fibDirection(i, K);
      const { lat, lon } = vec3ToLatLon(x, y, z);
      if (isLand(lon, lat)) landDirs.push(x, y, z);
    }
    if (landDirs.length / 3 < landCount) K = Math.floor(K * 1.8);
  }

  const available = Math.max(1, landDirs.length / 3);
  const step = available / landCount;
  for (let k = 0; k < landCount; k++) {
    const src = Math.min(available - 1, Math.floor(k * step)) * 3;
    positions[k * 3] = landDirs[src] * radius;
    positions[k * 3 + 1] = landDirs[src + 1] * radius;
    positions[k * 3 + 2] = landDirs[src + 2] * radius;
    layer[k] = 0;
  }

  // Layer B — sparse full-sphere shell (oceans included), its own Fibonacci set.
  for (let j = 0; j < shellCount; j++) {
    const [x, y, z] = fibDirection(j, shellCount);
    const idx = (landCount + j) * 3;
    positions[idx] = x * radius;
    positions[idx + 1] = y * radius;
    positions[idx + 2] = z * radius;
    layer[landCount + j] = 1;
  }

  return { positions, layer, landCount };
}
