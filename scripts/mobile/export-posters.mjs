import fs from 'fs';
import path from 'path';
import { pathToFileURL } from 'url';
import { register } from 'node:module';

/**
 * §4.3 — "LOW tier and STATIC tier must have a real, art-directed fallback
 * image — not a blank container. Export a still frame from each morph at its
 * resting state and ship it as the poster."
 *
 * Generates the poster from THE SAME GEOMETRY the live scene uses —
 * buildGlobeGeometry() over the same continent rings and the same Fibonacci
 * distribution — projected to 2D and emitted as SVG.
 *
 * The obvious approach, screenshotting the real canvas headlessly, was tried
 * first and rejected: headless Chromium rasterises WebGL through SwiftShader,
 * and additive point sprites come back as red/blue/white channel noise rather
 * than the gold palette. The shape was right and the colour was not, and a
 * poster that misstates the brand palette is worse than no poster.
 *
 * Deriving it from the geometry instead gives an image that is faithful by
 * construction, resolution-independent, a few KB rather than 600, and — the
 * part that matters under §0.1 — carries no baked colour at all. Every fill is
 * `currentColor` or a var(--token), so the poster re-themes with the site.
 *
 *   node scripts/mobile/export-posters.mjs
 */

// Node 24 strips TypeScript types natively, so the scene's own geometry module
// is imported directly — no build step, no second copy of the continent data
// that could drift away from the one the live field uses.
//
// The one thing Node will not do is resolve TypeScript's extensionless
// specifiers (`./geo-sphere`), so a resolve hook supplies the `.ts`.
register(
  'data:text/javascript,' +
    encodeURIComponent(`
      import { existsSync } from 'node:fs';
      import { fileURLToPath } from 'node:url';
      export async function resolve(spec, ctx, next) {
        if (spec.startsWith('.') && !/\\.[a-z]+$/i.test(spec)) {
          try {
            const url = new URL(spec + '.ts', ctx.parentURL);
            if (existsSync(fileURLToPath(url))) return { url: url.href, shortCircuit: true };
          } catch {}
        }
        return next(spec, ctx);
      }
    `),
  pathToFileURL('./')
);

const { buildGlobeGeometry } = await import(
  pathToFileURL(path.resolve('src/lib/globe-geometry.ts')).href
);

const OUT = 'public/images/posters';
fs.mkdirSync(OUT, { recursive: true });

// Enough points to read as a dense field at a glance, few enough that the SVG
// stays small. The live hero runs 8,000-18,000; a still does not need parity
// because nothing is moving to reveal the gaps.
const COUNT = 2600;
const R = 100;

const geo = buildGlobeGeometry(COUNT, R);

/**
 * Project to 2D exactly as the scene's camera sees the resting globe: a plain
 * orthographic front view with the same 23.4-degree axial tilt the holder
 * carries, so the poster and the live field show the world at the same angle.
 */
const TILT = (23.4 * Math.PI) / 180;
const cos = Math.cos(TILT);
const sin = Math.sin(TILT);

const land = [];
const shell = [];
for (let i = 0; i < COUNT; i++) {
  const x0 = geo.positions[i * 3];
  const y0 = geo.positions[i * 3 + 1];
  const z = geo.positions[i * 3 + 2];
  // Rotate about Z for the tilt.
  const x = x0 * cos - y0 * sin;
  const y = x0 * sin + y0 * cos;
  if (z < 0) continue; // back hemisphere is occluded by the front one
  // Depth fade: points near the limb sit further from the viewer and read
  // dimmer in the live field, which is what gives the cloud its volume.
  const depth = z / R; // 0 at the limb, 1 at the centre facing the viewer
  const pt = {
    x: Math.round(x),
    y: Math.round(-y), // SVG y grows downward
    o: +(0.25 + depth * 0.75).toFixed(2),
    r: geo.layer[i] === 0 ? 0.9 : 0.55,
  };
  (geo.layer[i] === 0 ? land : shell).push(pt);
}

/**
 * Emitted as an ALPHA MASK, not as a coloured picture.
 *
 * §0.1 forbids hardcoding a colour, and an external SVG referenced by CSS
 * cannot read the page's custom properties — so baking gold into the file
 * would be the one thing the standing constraints rule out. As a mask the file
 * carries only shape and density; the colour comes from
 * `background: var(--gold-particle)` behind it (see .particle-fallback__globe),
 * which means the poster re-themes with the tokens like everything else.
 *
 * Opacity is quantised to six buckets and the points grouped per bucket, which
 * is what keeps this a few KB rather than seventy: the per-circle opacity
 * attribute was more than half the file, and six steps of depth fade are
 * indistinguishable from a continuous ramp at this dot size.
 */
const BUCKETS = 6;
function emit(pts, radius) {
  const byBucket = new Map();
  for (const p of pts) {
    const b = Math.max(1, Math.round(p.o * BUCKETS));
    if (!byBucket.has(b)) byBucket.set(b, []);
    byBucket.get(b).push(p);
  }
  return [...byBucket.entries()]
    .sort((a, b) => a[0] - b[0])
    .map(([b, group]) => {
      const o = +(b / BUCKETS).toFixed(2);
      // `r` is repeated per circle rather than set once on the group: it is a
      // geometry property that SVG 2 says should inherit, and no shipping
      // browser implements that — grouping it renders every dot at radius 0,
      // i.e. an invisible poster.
      const circles = group
        .map((p) => `<circle cx="${p.x}" cy="${p.y}" r="${radius}"/>`)
        .join('');
      return `<g opacity="${o}">${circles}</g>`;
    })
    .join('');
}

// Shell first, land over it — the land layer is the brighter, larger dot and
// should win where the two coincide near the limb.
const svg =
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="-110 -110 220 220">` +
  `<g fill="#000">${emit(shell, 0.55)}${emit(land, 0.9)}</g>` +
  `</svg>`;

const file = path.join(OUT, 'particle-globe.svg');
fs.writeFileSync(file, svg);
console.log(
  `wrote ${file}  ${(svg.length / 1024).toFixed(1)}KB  (${land.length} land + ${shell.length} shell points)`
);
