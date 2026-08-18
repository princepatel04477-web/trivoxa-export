/**
 * Industries-page shape vocabulary: eight sectors, converging on one spine.
 *
 * The Industries page had no particle field at all — it fell back to the shared
 * GLSL film every other secondary route runs, which left the one primary nav
 * route without a signature form. This restores it, and it is deliberately NOT
 * a copy of another page's vocabulary: the Group lattice argues that the
 * organisation is one connected structure, and Industries has a different
 * argument to make. Eight separate sectors, each real and each distinct, all
 * reaching the same operator.
 *
 *   eight scattered sector clusters, unconnected (hero)
 *     → they resolve into an ordered manifest — a readable column of eight
 *       (Industries We Serve)
 *     → the sectors thread together, connections drawing between them
 *       (Our Industry Solutions)
 *     → the threads pull in: one dense vertical spine, every sector feeding it
 *       (Why Industries Choose Trivoxa)
 *     → the spine converges into the shared eagle behind the CTA
 *
 * Every stage is planar and built from the same three-part index split — sector
 * cores, sector bodies, connective dust — so a particle that is a core in one
 * stage is a core in every stage. That is what makes the morphs read as the
 * same eight sectors moving rather than as four unrelated pictures.
 */

import { SHAPE_SPECTRUM } from "./palettes";
import type { Shape, ShapeContext } from "./types";

/** The eight industries the page enumerates. The count is the form. */
const SECTORS = 8;

/**
 * Share of the pool held in the sector CORES — the bright node at each sector's
 * centre. Applied by index range so the role is stable across every morph.
 */
const CORE_FRACTION = 0.22;

/**
 * Share held in the sector BODIES — the halo of grain that gives each sector
 * mass. The remainder is connective dust, which is what the links are drawn
 * through and what collapses into the spine at the end.
 */
const BODY_FRACTION = 0.56;

/**
 * Industries wears the same white the mark does rather than a colour of its
 * own. The page's argument is breadth, not a product category — eight sectors
 * in eight hues would read as a chart, and the one form on the page that IS
 * allowed a colour identity is the closing eagle, which this then flows into
 * without a spectrum change.
 */
const SPECTRUM = SHAPE_SPECTRUM.logo;

interface Sector {
  x: number;
  y: number;
  /** Body radius in world units. */
  r: number;
}

interface FormSpec {
  name: string;
  sectors: Sector[];
  /** Ambient drift as a fraction of the nominal radius. */
  driftFactor?: number;
  /** Accent the sector cores. Off while the sectors are still unconnected. */
  accentCores?: boolean;
  /**
   * Where the connective dust goes. `halo` scatters it loosely around the
   * sectors; `threads` lays it along the sector-to-sector lines; `spine` pulls
   * it onto the central column.
   */
  dust: "halo" | "threads" | "spine";
  /** Half-height of the spine, for the `spine` dust mode. */
  spineHalf?: number;
}

/** Deterministic-ish jitter helper: two summed randoms bias toward the centre. */
function centreBiased(): number {
  return (Math.random() + Math.random()) / 2;
}

function buildForm(spec: FormSpec, count: number, R: number): Shape {
  const data = new Float32Array(count * 3);
  const accent = new Float32Array(count);
  const coreBudget = Math.floor(count * CORE_FRACTION);
  const bodyBudget = coreBudget + Math.floor(count * BODY_FRACTION);
  const zJitter = R * 0.05;
  const spineHalf = spec.spineHalf ?? R * 1.1;

  for (let i = 0; i < count; i++) {
    let x: number;
    let y: number;

    if (i < coreBudget) {
      // Sector cores — a tight, dense knot at each sector's centre.
      const s = spec.sectors[i % SECTORS];
      const a = Math.random() * Math.PI * 2;
      const rad = s.r * 0.12 * centreBiased();
      x = s.x + rad * Math.cos(a);
      y = s.y + rad * Math.sin(a);
      accent[i] = spec.accentCores ? 1 : 0;
    } else if (i < bodyBudget) {
      // Sector bodies — a soft disc around the core, denser toward it.
      const s = spec.sectors[i % SECTORS];
      const a = Math.random() * Math.PI * 2;
      const rad = s.r * centreBiased();
      x = s.x + rad * Math.cos(a);
      y = s.y + rad * Math.sin(a);
      accent[i] = 0;
    } else if (spec.dust === "spine") {
      // The spine: one dense vertical column every sector now feeds.
      const t = Math.random();
      x = (Math.random() - 0.5) * 2 * R * 0.055;
      y = -spineHalf + t * spineHalf * 2;
      accent[i] = 0;
    } else if (spec.dust === "threads") {
      // Laid along the lines BETWEEN adjacent sectors, so the connective
      // material is visibly the thing joining them rather than a background
      // wash that happens to sit nearby.
      const k = (i - bodyBudget) % SECTORS;
      const a = spec.sectors[k];
      const b = spec.sectors[(k + 1) % SECTORS];
      const t = Math.random();
      const off = (Math.random() - 0.5) * 2 * R * 0.035;
      const dx = b.x - a.x;
      const dy = b.y - a.y;
      const len = Math.hypot(dx, dy) || 1;
      x = a.x + dx * t + (-dy / len) * off;
      y = a.y + dy * t + (dx / len) * off;
      accent[i] = 0;
    } else {
      // Loose halo — the sectors are not yet related to one another. Kept
      // INSIDE the sector spiral's outer reach rather than ringing it: a halo
      // drawn outside the clusters reads as the subject and turns the eight
      // sectors into decoration on a donut, which is the opposite of the
      // page's argument.
      const a = Math.random() * Math.PI * 2;
      const rad = R * (0.25 + Math.random() * Math.random() * 0.95);
      x = rad * Math.cos(a);
      y = rad * Math.sin(a) * 0.72;
      accent[i] = 0;
    }

    data[i * 3] = x;
    data[i * 3 + 1] = y;
    data[i * 3 + 2] = (Math.random() - 0.5) * 2 * zJitter;
  }

  return {
    name: spec.name,
    data,
    accent,
    flat: true,
    drift: R * (spec.driftFactor ?? 0.03),
    spectrum: SPECTRUM,
  };
}

/** Eight sectors scattered on a loose ellipse — related only by being present. */
function scattered(R: number): Sector[] {
  const out: Sector[] = [];
  for (let i = 0; i < SECTORS; i++) {
    // An irrational-turn spiral rather than an even ring: an even ring at this
    // stage already reads as an arrangement, and the point of the opening is
    // that nothing has been arranged yet.
    const a = i * 2.39996;
    const rad = R * (0.42 + 0.62 * (i / (SECTORS - 1)));
    out.push({ x: rad * Math.cos(a), y: rad * Math.sin(a) * 0.78, r: R * 0.2 });
  }
  return out;
}

/** The manifest: two ordered columns of four, the way the page lists them. */
function manifest(R: number): Sector[] {
  const out: Sector[] = [];
  const colX = R * 0.62;
  const rowGap = R * 0.52;
  for (let i = 0; i < SECTORS; i++) {
    const col = i % 2 === 0 ? -1 : 1;
    const row = Math.floor(i / 2);
    out.push({ x: col * colX, y: (1.5 - row) * rowGap, r: R * 0.17 });
  }
  return out;
}

/** The threaded ring: the same eight, now evenly spaced and joinable. */
function ring(R: number): Sector[] {
  const out: Sector[] = [];
  for (let i = 0; i < SECTORS; i++) {
    const a = (i / SECTORS) * Math.PI * 2 - Math.PI / 2;
    out.push({ x: R * 0.92 * Math.cos(a), y: R * 0.92 * Math.sin(a) * 0.84, r: R * 0.15 });
  }
  return out;
}

/** Converged: the eight draw in tight around a single vertical spine. */
function converged(R: number): Sector[] {
  const out: Sector[] = [];
  for (let i = 0; i < SECTORS; i++) {
    const side = i % 2 === 0 ? -1 : 1;
    const row = Math.floor(i / 2);
    out.push({ x: side * R * 0.26, y: (1.5 - row) * R * 0.42, r: R * 0.09 });
  }
  return out;
}

export function buildIndustriesStages({ count, R }: ShapeContext): Shape[] {
  // Stage 1 — eight sectors, scattered, unconnected, loose drift.
  const scatter = buildForm(
    { name: "sectors-scattered", sectors: scattered(R), dust: "halo", driftFactor: 0.06 },
    count,
    R
  );

  // Stage 2 — the manifest. The same eight, ordered and readable.
  const list = buildForm(
    { name: "sectors-manifest", sectors: manifest(R), dust: "halo", driftFactor: 0.025 },
    count,
    R
  );

  // Stage 3 — threaded. Cores light, and the connections draw between them.
  const threaded = buildForm(
    {
      name: "sectors-threaded",
      sectors: ring(R),
      dust: "threads",
      accentCores: true,
      driftFactor: 0.02,
    },
    count,
    R
  );
  threaded.links = ringLinks(ring(R));

  // Stage 4 — one operator. Every sector feeds a single spine.
  const spine = buildForm(
    {
      name: "sectors-spine",
      sectors: converged(R),
      dust: "spine",
      accentCores: true,
      spineHalf: R * 1.05,
      driftFactor: 0.015,
    },
    count,
    R
  );
  spine.links = spineLinks(converged(R), R * 1.05);

  return [scatter, list, threaded, spine];
}

/**
 * Rim connections around the threaded ring — each sector to its neighbour, plus
 * the four long chords across it, so the ring reads as a network rather than as
 * a circle drawn with dots.
 */
function ringLinks(sectors: Sector[]): Float32Array {
  const pairs: [Sector, Sector][] = [];
  for (let i = 0; i < sectors.length; i++) pairs.push([sectors[i], sectors[(i + 1) % sectors.length]]);
  for (let i = 0; i < sectors.length / 2; i++) pairs.push([sectors[i], sectors[i + sectors.length / 2]]);
  return pack(pairs);
}

/**
 * Every sector into the spine. Stored SECTOR-FIRST so each thread draws inward
 * toward the column — the direction is the argument (see Shape.links).
 */
function spineLinks(sectors: Sector[], half: number): Float32Array {
  const pairs: [Sector, Sector][] = sectors.map((s) => [s, { x: 0, y: s.y, r: 0 }]);
  pairs.push([{ x: 0, y: -half, r: 0 }, { x: 0, y: half, r: 0 }]);
  return pack(pairs);
}

function pack(pairs: [Sector, Sector][]): Float32Array {
  const out = new Float32Array(pairs.length * 6);
  pairs.forEach(([a, b], i) => out.set([a.x, a.y, 0, b.x, b.y, 0], i * 6));
  return out;
}
