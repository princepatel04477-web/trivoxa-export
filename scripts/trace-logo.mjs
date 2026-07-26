/**
 * Regenerate `src/components/brand/logo-geometry.ts` from the brand raster masters.
 *
 * The Trivoxa logo ships only as PNG. For the mark to inherit its colour from
 * the surrounding theme — rather than being baked at one lightness and reused
 * over every background — it has to be vector. This contour-traces the alpha
 * channel of the two masters into compound SVG paths:
 *
 *   full      <- trivoxa-logo.png
 *   wordmark  <- trivoxa-logo.png, with the GROUP line masked off
 *   mark      <- trivoxa-eagle.png
 *
 * trivoxa-eagle.png is also what the particle system samples for its shared
 * closing eagle (src/lib/shapes/eagle.ts), so tracing that same file is what
 * keeps the CTA's particle mark and the rendered logo one silhouette.
 *
 * Zero dependencies — the PNG decode is inline so this stays runnable with a
 * bare `node scripts/trace-logo.mjs`.
 */

import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import zlib from "node:zlib";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const IMAGES = join(ROOT, "public", "images");
const OUT = join(ROOT, "src", "components", "brand", "logo-geometry.ts");

/** Source masters are quarter-scaled into a shared unit space. */
const SCALE = 1 / 4;

/**
 * The GROUP line's band in trivoxa-logo.png, cleared before tracing to derive
 * the wordmark. Verified clear of the eagle: the tail stops at x=244, and the
 * rows between TRIVOXA and GROUP are empty from y=573 to y=633.
 */
const GROUP_BAND = [500, 600, 1399, 683];

const VARIANTS = {
  full: { file: "trivoxa-logo.png", label: "Eagle + TRIVOXA + GROUP — the complete lockup." },
  wordmark: { file: "trivoxa-logo.png", clear: [GROUP_BAND], label: "Eagle + TRIVOXA, with the GROUP line lifted." },
  mark: { file: "trivoxa-eagle.png", label: "The eagle alone." },
};

// ---------------------------------------------------------------------------
// PNG decode (8-bit, non-interlaced) — alpha channel only.
// ---------------------------------------------------------------------------

function decodePng(file) {
  const buf = readFileSync(file);
  let off = 8;
  let w = 0, h = 0, depth = 0, ctype = 0, interlace = 0;
  const idat = [];
  let trns = null;
  while (off < buf.length) {
    const len = buf.readUInt32BE(off);
    const type = buf.toString("ascii", off + 4, off + 8);
    const data = buf.subarray(off + 8, off + 8 + len);
    if (type === "IHDR") {
      w = data.readUInt32BE(0); h = data.readUInt32BE(4);
      depth = data[8]; ctype = data[9]; interlace = data[12];
    } else if (type === "tRNS") trns = data;
    else if (type === "IDAT") idat.push(data);
    else if (type === "IEND") break;
    off += 12 + len;
  }
  if (depth !== 8) throw new Error(`bit depth ${depth} unsupported`);
  if (interlace) throw new Error("interlaced PNG unsupported");

  const bpp = { 0: 1, 2: 3, 3: 1, 4: 2, 6: 4 }[ctype];
  if (!bpp) throw new Error(`color type ${ctype} unsupported`);
  const raw = zlib.inflateSync(Buffer.concat(idat));
  const stride = w * bpp;
  const out = Buffer.alloc(h * stride);

  for (let y = 0; y < h; y++) {
    const filter = raw[y * (stride + 1)];
    const line = raw.subarray(y * (stride + 1) + 1, y * (stride + 1) + 1 + stride);
    const cur = out.subarray(y * stride, (y + 1) * stride);
    const prev = y ? out.subarray((y - 1) * stride, y * stride) : null;
    for (let x = 0; x < stride; x++) {
      const a = x >= bpp ? cur[x - bpp] : 0;
      const b = prev ? prev[x] : 0;
      const c = prev && x >= bpp ? prev[x - bpp] : 0;
      let v = line[x];
      switch (filter) {
        case 1: v += a; break;
        case 2: v += b; break;
        case 3: v += (a + b) >> 1; break;
        case 4: {
          const p = a + b - c, pa = Math.abs(p - a), pb = Math.abs(p - b), pc = Math.abs(p - c);
          v += pa <= pb && pa <= pc ? a : pb <= pc ? b : c;
          break;
        }
      }
      cur[x] = v & 0xff;
    }
  }

  const alpha = new Uint8Array(w * h);
  for (let i = 0; i < w * h; i++) {
    if (ctype === 6) alpha[i] = out[i * 4 + 3];
    else if (ctype === 4) alpha[i] = out[i * 2 + 1];
    else if (ctype === 3) alpha[i] = trns && out[i] < trns.length ? trns[out[i]] : 255;
    else alpha[i] = 255;
  }
  return { w, h, alpha };
}

// ---------------------------------------------------------------------------
// Contour tracing
// ---------------------------------------------------------------------------

/**
 * Walk the pixel edges of a binary mask into closed polygons. Interior stays on
 * a consistent side, so outer boundaries and holes wind oppositely and the
 * result fills correctly under fill-rule="evenodd".
 */
function contours(inside, w, h) {
  const at = (x, y) => x >= 0 && y >= 0 && x < w && y < h && inside[y * w + x];
  const starts = new Map(); // "x,y" -> [[endX, endY], ...]
  const push = (sx, sy, ex, ey) => {
    const k = sx + "," + sy;
    let a = starts.get(k);
    if (!a) starts.set(k, (a = []));
    a.push([ex, ey]);
  };
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      if (!at(x, y)) continue;
      if (!at(x, y - 1)) push(x, y, x + 1, y);
      if (!at(x + 1, y)) push(x + 1, y, x + 1, y + 1);
      if (!at(x, y + 1)) push(x + 1, y + 1, x, y + 1);
      if (!at(x - 1, y)) push(x, y + 1, x, y);
    }
  }

  const loops = [];
  for (const [k0, list0] of starts) {
    while (list0.length) {
      const loop = [];
      let [cx, cy] = k0.split(",").map(Number);
      let prev = null;
      for (;;) {
        const list = starts.get(cx + "," + cy);
        if (!list || !list.length) break;
        let idx = 0;
        if (list.length > 1 && prev) {
          // Ambiguous lattice point (two pixels meeting at a corner): keep the
          // foreground 8-connected by taking the sharpest clockwise turn.
          const ix = cx - prev[0], iy = cy - prev[1];
          let best = -Infinity;
          list.forEach(([ex, ey], i) => {
            const ox = ex - cx, oy = ey - cy;
            const cross = ix * oy - iy * ox;
            const score = cross > 0 ? 2 : cross < 0 ? 0 : ix * ox + iy * oy > 0 ? 1 : -1;
            if (score > best) { best = score; idx = i; }
          });
        }
        const [ex, ey] = list.splice(idx, 1)[0];
        loop.push([cx, cy]);
        prev = [cx, cy];
        cx = ex; cy = ey;
        if (loop.length > 1 && cx === loop[0][0] && cy === loop[0][1]) break;
      }
      if (loop.length > 3) loops.push(loop);
    }
  }
  return loops;
}

/** Douglas–Peucker on an open polyline. */
function dp(pts, tol) {
  if (pts.length < 3) return pts;
  const keep = new Uint8Array(pts.length);
  keep[0] = keep[pts.length - 1] = 1;
  const stack = [[0, pts.length - 1]];
  while (stack.length) {
    const [a, b] = stack.pop();
    if (b - a < 2) continue;
    const [ax, ay] = pts[a], [bx, by] = pts[b];
    const dx = bx - ax, dy = by - ay;
    const len = Math.hypot(dx, dy) || 1;
    let far = -1, fd = tol;
    for (let i = a + 1; i < b; i++) {
      const d = Math.abs((pts[i][0] - ax) * dy - (pts[i][1] - ay) * dx) / len;
      if (d > fd) { fd = d; far = i; }
    }
    if (far > 0) { keep[far] = 1; stack.push([a, far], [far, b]); }
  }
  return pts.filter((_, i) => keep[i]);
}

/** Simplify a closed loop, split at its top-left extreme so the seam is stable. */
function simplifyLoop(loop, tol) {
  const n = loop.length;
  if (n < 8) return loop;
  let a = 0;
  for (let i = 1; i < n; i++) {
    if (loop[i][1] < loop[a][1] || (loop[i][1] === loop[a][1] && loop[i][0] < loop[a][0])) a = i;
  }
  const rot = loop.slice(a).concat(loop.slice(0, a));
  const half = Math.floor(n / 2);
  return dp(rot.slice(0, half + 1), tol).slice(0, -1)
    .concat(dp(rot.slice(half).concat([rot[0]]), tol).slice(0, -1));
}

/** Chaikin corner-cutting on a closed loop — softens the pixel staircase. */
function chaikin(loop, rounds) {
  let pts = loop;
  for (let r = 0; r < rounds; r++) {
    const out = [];
    for (let i = 0; i < pts.length; i++) {
      const [x0, y0] = pts[i];
      const [x1, y1] = pts[(i + 1) % pts.length];
      out.push([x0 + (x1 - x0) * 0.25, y0 + (y1 - y0) * 0.25]);
      out.push([x0 + (x1 - x0) * 0.75, y0 + (y1 - y0) * 0.75]);
    }
    pts = out;
  }
  return pts;
}

/** Trace one PNG's alpha to SVG path data plus its tight-to-ink viewBox. */
function traceToPath(file, { tol = 0.9, scale = 1, clear = [], smooth = 2, precision = 1 } = {}) {
  const { w, h, alpha } = decodePng(file);
  const inside = new Uint8Array(w * h);
  for (let i = 0; i < w * h; i++) inside[i] = alpha[i] > 127 ? 1 : 0;
  for (const [x0, y0, x1, y1] of clear) {
    for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) inside[y * w + x] = 0;
  }

  let minX = w, minY = h, maxX = 0, maxY = 0;
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) if (inside[y * w + x]) {
    if (x < minX) minX = x; if (x > maxX) maxX = x;
    if (y < minY) minY = y; if (y > maxY) maxY = y;
  }

  const loops = contours(inside, w, h)
    .map((l) => simplifyLoop(l, tol))
    .filter((l) => l.length > 2)
    // Drop specks that survive the alpha threshold but carry no visual weight.
    .filter((l) => {
      let a = 0;
      for (let i = 0; i < l.length; i++) {
        const [x0, y0] = l[i], [x1, y1] = l[(i + 1) % l.length];
        a += x0 * y1 - x1 * y0;
      }
      return Math.abs(a / 2) > 2;
    })
    .map((l) => (smooth ? simplifyLoop(chaikin(l, smooth), tol * 0.55) : l));

  const p = Math.pow(10, precision);
  const round = (v) => Math.round(v * p) / p;
  const num = (v) => String(v).replace(/^0\./, ".").replace(/^-0\./, "-.");

  const d = loops
    .map((l) => {
      // Accumulate against the EMITTED position, not the true one, so rounding
      // error stays bounded per segment instead of random-walking along the loop.
      let px = round((l[0][0] - minX) * scale), py = round((l[0][1] - minY) * scale);
      let out = `M${num(px)} ${num(py)}`;
      for (let i = 1; i < l.length; i++) {
        const dx = round((l[i][0] - minX) * scale - px), dy = round((l[i][1] - minY) * scale - py);
        if (dx === 0 && dy === 0) continue;
        out += `l${num(dx)} ${num(dy)}`;
        px += dx; py += dy;
      }
      return out + "Z";
    })
    .join("")
    // `l5 -3` -> `l5-3`; the minus sign is its own separator.
    .replace(/l(-?[\d.]+) (-?)/g, (m, a, b) => `l${a}${b ? "-" : " "}`);

  return {
    d,
    width: (maxX - minX + 1) * scale,
    height: (maxY - minY + 1) * scale,
    loops: loops.length,
    points: loops.reduce((n, l) => n + l.length, 0),
  };
}

// ---------------------------------------------------------------------------
// Emit
// ---------------------------------------------------------------------------

const FILE_HEADER = [
  "/**",
  " * Trivoxa logo geometry — THE single source of truth for the mark.",
  " *",
  " * Contour-traced from the brand raster masters (`/images/trivoxa-logo.png` and",
  " * `/images/trivoxa-eagle.png`) at quarter scale, so the vector is the same",
  " * silhouette the particle system samples for its closing eagle — not a redraw.",
  " * Every viewBox is tight to the ink (no baked padding), which is what lets one",
  " * height token produce an identical size and left offset in every slot.",
  " *",
  " * Nothing here carries a colour. The paths fill with `currentColor`; the",
  " * surrounding theme token decides what that is. See `Logo.tsx`.",
  " *",
  " * Generated — do not hand-edit. Regenerate with `node scripts/trace-logo.mjs`.",
  " */",
  "",
  'export type LogoVariant = "full" | "wordmark" | "mark";',
  "",
  "export interface LogoGeometry {",
  "  /** Tight-to-ink viewBox width, in the shared quarter-scale unit space. */",
  "  width: number;",
  "  /** Tight-to-ink viewBox height, same unit space. */",
  "  height: number;",
  '  /** Single compound path; holes rely on fill-rule="evenodd". */',
  "  d: string;",
  "}",
  "",
  "",
].join("\n");

let out = FILE_HEADER + "export const LOGO_GEOMETRY: Record<LogoVariant, LogoGeometry> = {\n";
for (const [name, spec] of Object.entries(VARIANTS)) {
  const r = traceToPath(join(IMAGES, spec.file), { tol: 0.9, scale: SCALE, clear: spec.clear ?? [] });
  const n2 = (v) => Number(v.toFixed(2));
  out += `  /** ${spec.label} */\n  ${name}: {\n    width: ${n2(r.width)},\n    height: ${n2(r.height)},\n    d: "${r.d}",\n  },\n`;
  console.log(
    `${name.padEnd(9)} ${n2(r.width)} x ${n2(r.height)}  ${r.loops} loops, ${r.points} points, ${(r.d.length / 1024).toFixed(1)}KB`
  );
}
out += "};\n";

mkdirSync(dirname(OUT), { recursive: true });
writeFileSync(OUT, out);
console.log("wrote", OUT);
