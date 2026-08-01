/**
 * Insights shape vocabulary: a single point of light expanding into an
 * intelligence network.
 *
 * The whole page is one idea — knowledge starts as a point, emits, organises, and
 * settles into a lattice — so the geometry is built around one invariant: the
 * ORIGIN node never moves. It sits at the centre in every stage, always accented,
 * and the network grows around it. Particle index roles are fixed too (the first
 * slice of the pool is always the origin core), so a grain that is the source in
 * the hero is still the source in the lattice.
 *
 * Node placement is a golden-angle spiral with a √ radius, which is the
 * phyllotaxis distribution: evenly spaced by area, no rings, no seams, and no
 * visible grid. That evenness is what makes the final state read as a calm
 * editorial lattice rather than an energetic particle demo.
 *
 * One constraint drives the stage design: the connection lines are ONE static
 * geometry (endpoints baked at build time), so any node a line touches must hold
 * the same position in every stage where lines are visible. Stages 3 and 4
 * therefore share their primary node positions exactly — stage 4 adds density by
 * introducing a SECOND tier of unlinked infill nodes and redistributing the pool
 * across both, never by moving the linked ones.
 */

import type { Shape, ShapeContext } from "./types";

const GOLDEN_ANGLE = Math.PI * (3 - Math.sqrt(5));
const TAU = Math.PI * 2;

/** Share of the pool held in the origin core — the point of light itself. */
const CORE_FRACTION = 0.06;
/** Linked network nodes (excluding the origin). Positions are shared by stages 3–4. */
const K_PRIMARY = 18;
/**
 * Unlinked infill nodes, introduced in the full-density lattice only.
 *
 * EQUAL TO K_PRIMARY on purpose, and that is a constraint rather than a taste
 * call. Particles are assigned to nodes by `index % nodeCount`, and their pulse
 * phase is assigned by `index % K_PRIMARY`. Those two groupings only agree when
 * the node count is an exact multiple of K_PRIMARY — otherwise a lattice node
 * collects particles with several different phases, its brightness averages out,
 * and the nodes stop breathing precisely in the calm final state where the pulse
 * is the only motion left. 18 + 18 = 36 keeps every node phase-coherent.
 */
const K_SECONDARY = K_PRIMARY;
/**
 * Which primary nodes carry the accent. Three, spread around the spiral — "a few focal
 * nodes", enough to give the eye somewhere to land without becoming a second
 * colour scheme.
 */
const FOCAL_NODES = [2, 8, 14];
/** Each node links to this many nearest neighbours (deduplicated into a graph). */
const NEIGHBOURS = 2;

interface Node {
  x: number;
  y: number;
  /** Accent weight, 0–1. */
  accent: number;
  /**
   * Accent only the dense centre of the cluster rather than all of it.
   *
   * This is what keeps "a few focal nodes" an accent. A node holds the same share
   * of the pool as every other node — with 18 nodes that is ~5% each, so three
   * fully-accented focal nodes would put 16% of the field in the accent hue and
   * read as a second colour scheme rather than as punctuation. Restricting it to the
   * inner quarter-radius takes each focal node to ~12% of its own particles, and
   * reads as what it should: a primary-tone node with a warm core.
   */
  accentCoreOnly?: boolean;
  /** Cluster radius — tighter reads as a more deliberate, organised node. */
  spread: number;
}

/** Cluster-relative radius inside which `accentCoreOnly` nodes take the accent. */
const ACCENT_CORE_T = 0.25;

/**
 * Golden-angle spiral position k of K. The √ on the radius spaces nodes evenly by
 * AREA; without it they bunch at the rim.
 */
function spiral(k: number, K: number, maxR: number, angleOffset = 0): [number, number] {
  const t = Math.sqrt((k + 0.5) / K);
  const a = k * GOLDEN_ANGLE + angleOffset;
  return [maxR * t * Math.cos(a), maxR * t * Math.sin(a)];
}

/** Deterministic jitter — same particle gets the same offset every rebuild. */
function jitter(seed: number): number {
  const s = Math.sin(seed * 12.9898) * 43758.5453;
  return (s - Math.floor(s)) * 2 - 1;
}

/**
 * Lay the pool onto a node set. The first `coreCount` indices always belong to
 * nodes[0] (the origin); the rest round-robin over the remainder, which keeps a
 * particle's structural role stable from stage to stage.
 */
function layout(
  name: string,
  nodes: Node[],
  { count, R }: ShapeContext,
  opts: { drift?: number } = {}
): Shape {
  const coreCount = Math.max(1, Math.floor(count * CORE_FRACTION));
  const data = new Float32Array(count * 3);
  const accent = new Float32Array(count);
  const outer = nodes.length > 1 ? nodes.slice(1) : nodes;

  for (let i = 0; i < count; i++) {
    const node = i < coreCount ? nodes[0] : outer[(i - coreCount) % outer.length];
    // Two summed randoms bias each cluster toward its centre, so a node reads as a
    // dense core with a soft halo rather than a uniform disc.
    const t = (Math.random() + Math.random()) / 2;
    const rad = node.spread * t;
    const a = Math.random() * TAU;
    const x = node.x + rad * Math.cos(a);
    const y = node.y + rad * Math.sin(a);
    const z = jitter(i * 1.7) * R * 0.05;


    data[i * 3] = x;
    data[i * 3 + 1] = y;
    data[i * 3 + 2] = z;
    accent[i] = node.accentCoreOnly && t > ACCENT_CORE_T ? 0 : node.accent;
  }

  return {
    name,
    data,
    accent,
    flat: true,
    drift: opts.drift ?? R * 0.02,
  };
}

/**
 * The origin — centre, accented, always, and fully rather than core-only: it IS
 * the point of light the page opens on. It carries a large share of the pool by
 * COUNT but the tightest spread on the page, so it occupies almost no area — a
 * small intense point, not an accented region.
 */
function originNode(R: number, spread: number): Node {
  return { x: 0, y: 0, accent: 1, spread: R * spread };
}

/**
 * Primary network nodes. `jitterAmount` scatters them (0 is the organised layout);
 * `focalWeight` is the accent weight on the focal few — 0 before the web organises,
 * so they warm in across that morph rather than arriving already lit.
 */
function primaryNodes(
  R: number,
  maxR: number,
  spread: number,
  jitterAmount: number,
  focalWeight: number
): Node[] {
  return Array.from({ length: K_PRIMARY }, (_, k) => {
    const [x, y] = spiral(k, K_PRIMARY, maxR);
    const focal = FOCAL_NODES.includes(k);
    return {
      x: x + jitter(k * 2.3) * jitterAmount,
      y: y + jitter(k * 4.7) * jitterAmount,
      accent: focal ? focalWeight : 0,
      accentCoreOnly: true,
      spread: R * spread,
    };
  });
}

export function buildInsightsStages(ctx: ShapeContext): Shape[] {
  const { R } = ctx;

  // Stage 1 — a single dense point of light, accent-cored. Everything is at the
  // centre; the core sits tighter than the halo around it, so the point has a
  // genuine bright centre rather than being an even blob.
  const point = layout(
    "point",
    [originNode(R, 0.035), { x: 0, y: 0, accent: 0, spread: R * 0.14 }],
    ctx,
    { drift: R * 0.008 }
  );

  // Stage 2 — the point emits. Nodes scatter outward, deliberately untidy: this is
  // knowledge dispersing, before it has been organised into anything.
  const scattered = layout(
    "scattered-nodes",
    // focalWeight 0: nothing is focal yet, the knowledge is only dispersing.
    [originNode(R, 0.05), ...primaryNodes(R, R * 1.55, 0.115, R * 0.2, 0)],
    ctx,
    { drift: R * 0.035 }
  );

  // Stage 3 — the web. Same nodes, now on the clean spiral and tighter, with the
  // connections drawn between related nodes. These positions are FROZEN into the
  // link geometry, so stage 4 must not move them.
  const webNodes = [originNode(R, 0.045), ...primaryNodes(R, R * 1.15, 0.075, 0, 1)];
  const web = layout("web", webNodes, ctx, { drift: R * 0.02 });
  web.links = nearestNeighbourGraph(webNodes);

  // Stage 4 — full density. The primary nodes hold exactly still (the lines stay
  // attached); a second tier of finer nodes is interleaved between them, offset by
  // half a golden angle so it fills the gaps the spiral leaves rather than
  // doubling up on it. The pool spreads across both tiers, so every node gets
  // fewer, finer grains — the field reads denser and calmer at once.
  const secondary: Node[] = Array.from({ length: K_SECONDARY }, (_, k) => {
    const [x, y] = spiral(k, K_SECONDARY, R * 1.32, GOLDEN_ANGLE * 0.5);
    return { x, y, accent: 0, spread: R * 0.055 };
  });
  const lattice = layout("lattice", [...webNodes, ...secondary], ctx, { drift: R * 0.018 });
  // Same endpoints as stage 3. Declared again so the engine's linking stage is the
  // one the reader is on when the strokes finish arriving (see linkEnvelope).
  lattice.links = web.links;

  // No closing stage here: the shared eagle finale is appended by withEagleFinale
  // (see src/lib/shapes/eagle.ts), so the lattice dissolves into the brand mark
  // behind the CTA rather than into a page-specific drift.
  return [point, scattered, web, lattice];
}

/**
 * Connect each node to its `NEIGHBOURS` nearest others, deduplicated so a mutual
 * pair yields one line. Nearest-neighbour rather than a fixed pattern is what
 * makes the result read as "related nodes": every line is short and local, so the
 * eye follows clusters of association instead of a decorative starburst.
 */
function nearestNeighbourGraph(nodes: Node[]): Float32Array {
  const pairs = new Set<string>();
  nodes.forEach((a, i) => {
    const byDistance = nodes
      .map((b, j) => ({ j, d: Math.hypot(b.x - a.x, b.y - a.y) }))
      .filter((e) => e.j !== i)
      .sort((p, q) => p.d - q.d)
      .slice(0, NEIGHBOURS);
    for (const { j } of byDistance) pairs.add(i < j ? `${i}:${j}` : `${j}:${i}`);
  });

  const list = [...pairs].map((k) => k.split(":").map(Number) as [number, number]);
  // Shortest first, so the staggered draw-in grows outward from tight local
  // associations to the longer spans — the network assembles rather than flashing.
  list.sort(
    (p, q) =>
      Math.hypot(nodes[p[0]].x - nodes[p[1]].x, nodes[p[0]].y - nodes[p[1]].y) -
      Math.hypot(nodes[q[0]].x - nodes[q[1]].x, nodes[q[0]].y - nodes[q[1]].y)
  );

  const out = new Float32Array(list.length * 6);
  list.forEach(([i, j], n) => {
    out.set([nodes[i].x, nodes[i].y, 0, nodes[j].x, nodes[j].y, 0], n * 6);
  });
  return out;
}

/**
 * Coherent pulse phase: every particle in a node shares one phase, so nodes
 * breathe as units. Phases are spread by the golden angle across nodes so they
 * never pulse in unison — the field stays alive without ever looking like it is
 * flashing. The origin core is pinned to phase 0 and so sits steady, the one
 * fixed light on the page.
 */
export function buildInsightsPhase({ count }: ShapeContext): Float32Array {
  const phases = new Float32Array(count);
  const coreCount = Math.max(1, Math.floor(count * CORE_FRACTION));
  for (let i = 0; i < count; i++) {
    if (i < coreCount) {
      phases[i] = 0;
      continue;
    }
    const node = (i - coreCount) % K_PRIMARY;
    phases[i] = (node * GOLDEN_ANGLE) % TAU;
  }
  return phases;
}
