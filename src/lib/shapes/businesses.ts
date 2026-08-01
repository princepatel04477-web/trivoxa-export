/**
 * Businesses shape vocabulary: a cube that unfolds into sectors.
 *
 * The page's argument is structural — one organisation, two divisions, four
 * process steps — so the form starts as the most closed shape available and opens
 * up in stages: solid cube → loosened → two clusters → a left-to-right process
 * chain → the shared eagle.
 *
 * CONTINUITY IS THE CONSTRAINT HERE. "Particles travel, never teleport" is not
 * something the engine can give you — it lerps whatever two buffers it is handed,
 * so if index 0 is a cube corner in one stage and a random point in the next, it
 * still interpolates, it just interpolates across the whole frame. What makes the
 * motion read as travel is that a particle's index means the same thing in every
 * stage. So:
 *
 *   1. The cube's point set is SORTED BY X once, at build time. Index 0 is the
 *      leftmost grain, the last index the rightmost.
 *   2. Every later stage partitions that same ordering into CONTIGUOUS index
 *      ranges, left to right — halves for the two divisions, quarters for the four
 *      process steps.
 *   3. Within each partition the generated points are sorted by x too, before
 *      being written into that partition's index range.
 *
 * Step 3 matters more than it looks. Without it the partitions are still monotonic
 * — nothing crosses the divide — but the assignment INSIDE a partition is random,
 * which leaves roughly half of all adjacent pairs out of order and sends grains on
 * needlessly long diagonal journeys. Sorting within the partition makes the whole
 * ordering monotonic in x end to end, so every grain travels to the nearest slot
 * that was going spare. The cube cleaves, then subdivides. Nothing swaps sides.
 */

import type { Shape, ShapeContext } from "./types";

/** Cube side length as a multiple of the nominal radius. */
const CUBE_SIDE = 1.35;
/** Share of the pool on the 12 edges rather than the 6 faces — edges carry the read. */
const EDGE_SHARE = 0.45;

/** Product Exports takes the larger share in the tighter volume: denser by both measures. */
const PRODUCT_SHARE = 0.55;

/** Y-axis rotation for the cube stages, radians/sec. A cube needs to turn in 3D to
 *  read as a cube; the chain stages must not, so this eases to zero. */
const CUBE_SPIN = (2 * Math.PI) / 70; // 70s per revolution

/** Deterministic jitter — the same particle gets the same offset every rebuild. */
function jitter(seed: number): number {
  const s = Math.sin(seed * 12.9898) * 43758.5453;
  return (s - Math.floor(s)) * 2 - 1;
}

type Pt = [number, number, number];

/**
 * The cube: dust along all 12 edges plus a lighter fill across the 6 faces, so it
 * reads as a solid object with defined structure rather than a wireframe or a fog.
 */
function cubePoints(count: number, h: number): Pt[] {
  const pts: Pt[] = [];
  const edgeBudget = Math.floor(count * EDGE_SHARE);

  // The 12 edges, as an origin plus the axis they run along.
  const edges: { o: Pt; axis: number }[] = [];
  for (let axis = 0; axis < 3; axis++) {
    const others = [0, 1, 2].filter((i) => i !== axis);
    for (const a of [-h, h]) {
      for (const b of [-h, h]) {
        const o: Pt = [0, 0, 0];
        o[axis] = -h;
        o[others[0]] = a;
        o[others[1]] = b;
        edges.push({ o, axis });
      }
    }
  }

  const edgeJitter = h * 0.02;
  for (let i = 0; i < edgeBudget; i++) {
    const { o, axis } = edges[i % edges.length];
    const p: Pt = [
      o[0] + jitter(i * 1.3) * edgeJitter,
      o[1] + jitter(i * 2.7) * edgeJitter,
      o[2] + jitter(i * 3.9) * edgeJitter,
    ];
    p[axis] = -h + Math.random() * 2 * h;
    pts.push(p);
  }

  // Faces: cycle axis and sign so all six get an even share.
  for (let i = edgeBudget; i < count; i++) {
    const axis = i % 3;
    const sign = Math.floor(i / 3) % 2 === 0 ? -1 : 1;
    const others = [0, 1, 2].filter((k) => k !== axis);
    const p: Pt = [0, 0, 0];
    p[axis] = sign * h;
    p[others[0]] = (Math.random() * 2 - 1) * h;
    p[others[1]] = (Math.random() * 2 - 1) * h;
    pts.push(p);
  }

  // THE continuity guarantee: order by x so every later partition can be a
  // contiguous, monotonic index range.
  pts.sort((a, b) => a[0] - b[0]);
  return pts;
}

/**
 * Sort each contiguous index range by x, in place, and return the list.
 *
 * `bounds` are the exclusive end indices of each partition. This is what keeps the
 * whole ordering monotonic in x rather than only the partition membership — see the
 * continuity note at the top of this file.
 */
function sortWithinPartitions<T extends { p: Pt }>(items: T[], bounds: number[]): T[] {
  let start = 0;
  for (const end of bounds) {
    const slice = items.slice(start, end).sort((a, b) => a.p[0] - b.p[0]);
    for (let k = 0; k < slice.length; k++) items[start + k] = slice[k];
    start = end;
  }
  return items;
}

function toShape(
  name: string,
  pts: Pt[],
  accent: Float32Array,
  opts: { drift: number; spinY?: number }
): Shape {
  const data = new Float32Array(pts.length * 3);
  pts.forEach((p, i) => {
    data[i * 3] = p[0];
    data[i * 3 + 1] = p[1];
    data[i * 3 + 2] = p[2];
  });
  return { name, data, accent, flat: true, drift: opts.drift, spinY: opts.spinY };
}

export function buildBusinessesStages(ctx: ShapeContext): Shape[] {
  const { count, R } = ctx;
  const h = (CUBE_SIDE * R) / 2;
  const cube = cubePoints(count, h);
  const noAccent = () => new Float32Array(count);

  // Stage 1 — the solid cube, turning slowly on Y so its faces read.
  const solid = toShape("cube", cube, noAccent(), { drift: R * 0.008, spinY: CUBE_SPIN });

  // Stage 2 — the edges loosen. Each grain pushes out along its own direction from
  // the centre and picks up jitter, so the silhouette softens without anything
  // travelling far: this is the same cube, held less tightly.
  const loosened = toShape(
    "cube-loose",
    cube.map((p, i) => {
      const len = Math.hypot(p[0], p[1], p[2]) || 1;
      const push = 1 + 0.16 * (1 + 0.6 * jitter(i * 5.1));
      const j = h * 0.09;
      return [
        (p[0] / len) * len * push + jitter(i * 7.3) * j,
        (p[1] / len) * len * push + jitter(i * 9.7) * j,
        (p[2] / len) * len * push + jitter(i * 11.1) * j,
      ] as Pt;
    }),
    noAccent(),
    { drift: R * 0.03, spinY: CUBE_SPIN }
  );

  // Stage 3 — two divisions. The cube cleaves on the axis it was sorted along, so
  // the left half becomes Product Exports and the right half Service Exports and no
  // grain crosses the divide.
  //
  // Product Exports is the denser body: the larger share of the pool inside the
  // smaller radius. Service Exports is lighter and networked — the same idea
  // distributed across satellite nodes rather than massed in one volume.
  const split = Math.floor(count * PRODUCT_SHARE);
  const gap = R * 0.62;
  const productR = R * 0.46;
  const serviceR = R * 0.66;
  const SERVICE_NODES = 7;
  // Accent band: how close to the divide plane a grain must sit to be marked, as a
  // fraction of the gap. Kept tight — this is a seam, not a second colour.
  const DIVIDE_BAND = 0.30;
  const clusters: { p: Pt; accent: number }[] = [];

  for (let i = 0; i < count; i++) {
    let p: Pt;
    if (i < split) {
      // Dense body. Cube-root radius fills the volume evenly rather than bunching
      // at the centre.
      const r = productR * Math.cbrt(Math.random());
      const th = Math.random() * Math.PI * 2;
      const ph = Math.acos(2 * Math.random() - 1);
      p = [
        -gap - r * Math.sin(ph) * Math.cos(th),
        r * Math.sin(ph) * Math.sin(th),
        r * Math.cos(ph) * 0.7,
      ];
    } else {
      // Networked: a centre node plus satellites, each loosely packed.
      const k = (i - split) % SERVICE_NODES;
      const a = (k / SERVICE_NODES) * Math.PI * 2;
      const orbit = k === 0 ? 0 : serviceR * 0.72;
      const nodeR = k === 0 ? serviceR * 0.3 : serviceR * 0.22;
      const r = nodeR * Math.cbrt(Math.random());
      const th = Math.random() * Math.PI * 2;
      const ph = Math.acos(2 * Math.random() - 1);
      p = [
        gap + orbit * Math.cos(a) + r * Math.sin(ph) * Math.cos(th),
        orbit * Math.sin(a) + r * Math.sin(ph) * Math.sin(th),
        r * Math.cos(ph) * 0.7,
      ];
    }
    // The accent marks the divide itself: only the grains hugging the plane the
    // cube split along, so a warm seam runs down the gap between the divisions.
    const nearDivide = Math.abs(p[0]) < gap * DIVIDE_BAND && Math.abs(p[1]) < R * 0.3;
    clusters.push({ p, accent: nearDivide ? 1 : 0 });
  }

  // Sort each half internally by x, then write it back into its own index range —
  // keeps the global ordering monotonic (see the note at the top of this file).
  const divisionPts = sortWithinPartitions(clusters, [split, count]);
  const divisions = toShape(
    "two-divisions",
    divisionPts.map((e) => e.p),
    Float32Array.from(divisionPts, (e) => e.accent),
    { drift: R * 0.022 }
  );

  // Stage 4 — the process chain: source → coordinate → verify → deliver, left to
  // right. Four abstract primitives, deliberately not illustrative: a filled disc,
  // a ring, a square outline, a triangle. Each is one contiguous quarter of the
  // ordering, so the two clusters simply subdivide again.
  //
  // The tail of each quarter dusts the gap to the next form. Those connectors are
  // particles, not line geometry — this page's chain is made of the same grains as
  // the forms it links, so nothing new is introduced at the last stage.
  const CHAIN_X = [-1.5, -0.5, 0.5, 1.5].map((m) => m * R);
  const formR = R * 0.28;
  const CONNECTOR_TAIL = 0.12;
  const chain: { p: Pt; accent: number }[] = [];

  for (let i = 0; i < count; i++) {
    const q = Math.min(3, Math.floor((i / count) * 4));
    const withinQ = (i / count) * 4 - q;
    const cx = CHAIN_X[q];

    if (withinQ > 1 - CONNECTOR_TAIL && q < 3) {
      // Connector to the next form.
      const t = (withinQ - (1 - CONNECTOR_TAIL)) / CONNECTOR_TAIL;
      const x0 = cx + formR;
      const x1 = CHAIN_X[q + 1] - formR;
      chain.push({
        p: [x0 + (x1 - x0) * t, jitter(i * 4.3) * R * 0.018, jitter(i * 6.1) * R * 0.03],
        accent: 0,
      });
      continue;
    }

    const a = Math.random() * Math.PI * 2;
    const z = jitter(i * 8.9) * R * 0.035;
    let form: Pt;
    if (q === 0) {
      // source — a filled disc
      const r = formR * Math.sqrt(Math.random());
      form = [cx + r * Math.cos(a), r * Math.sin(a), z];
    } else if (q === 1) {
      // coordinate — a ring
      const r = formR * (0.86 + jitter(i * 2.1) * 0.05);
      form = [cx + r * Math.cos(a), r * Math.sin(a), z];
    } else if (q === 2) {
      // verify — a square outline
      const side = Math.floor(Math.random() * 4);
      const t = Math.random() * 2 - 1;
      const e = formR * 0.9;
      const p: Pt =
        side === 0 ? [cx + t * e, e, z] : side === 1 ? [cx + t * e, -e, z] : side === 2 ? [cx + e, t * e, z] : [cx - e, t * e, z];
      form = p;
    } else {
      // deliver — a triangle outline, pointing along the chain
      const side = Math.floor(Math.random() * 3);
      const t = Math.random();
      const v: Pt[] = [
        [cx + formR, 0, z],
        [cx - formR * 0.7, formR * 0.85, z],
        [cx - formR * 0.7, -formR * 0.85, z],
      ];
      const A = v[side];
      const B = v[(side + 1) % 3];
      form = [A[0] + (B[0] - A[0]) * t, A[1] + (B[1] - A[1]) * t, z];
    }
    // A warm node at the leading edge of each form — four quiet markers down the
    // chain rather than a second colour scheme.
    chain.push({ p: form, accent: withinQ < 0.02 ? 1 : 0 });
  }

  const q1 = Math.floor(count / 4);
  const chainPts = sortWithinPartitions(chain, [q1, q1 * 2, q1 * 3, count]);
  const process = toShape(
    "process-chain",
    chainPts.map((e) => e.p),
    Float32Array.from(chainPts, (e) => e.accent),
    { drift: R * 0.016 }
  );

  // No closing stage here: withEagleFinale appends the shared eagle, so the chain
  // converges into the brand mark behind the CTA.
  return [solid, loosened, divisions, process];
}
