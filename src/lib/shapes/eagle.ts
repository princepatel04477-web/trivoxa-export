/**
 * The shared closing stage — the Trivoxa eagle.
 *
 * Every page's morph sequence ends here: whatever form the page has been building
 * dissolves and the particles converge into the brand mark behind the final CTA,
 * then settle into faint drift. It is the same silhouette at the same proportions
 * on every route, which is what makes five separate choreographies read as one
 * site rather than five demos.
 *
 * The point cloud is sampled from the homepage eagle asset's ALPHA channel — the
 * same `/images/trivoxa-eagle.png` the home page's own eagle beat already uses, so
 * the closing mark is literally the mark, not a redrawing of it.
 *
 * Sampling decodes a PNG and walks its pixels, so the result is cached per
 * (count, viewport-scale) pair for the session: a route change or a Strict Mode
 * remount reuses the buffer instead of re-decoding.
 */

import type { Shape, ShapeContext } from "./types";

/** The homepage brand mark. */
const EAGLE_ASSET = "/images/trivoxa-eagle.png";

/**
 * Silhouette width in world units per unit of viewport scale. Deliberately modest:
 * the closing mark should sit in generous open space behind the CTA copy, not fill
 * the frame.
 */
const EAGLE_WIDTH = 17;

/** Faint ambient drift once settled, as a fraction of the nominal radius. */
const EAGLE_DRIFT = 0.03;

const cache = new Map<string, Promise<Shape>>();

/**
 * The shared eagle stage, cached. Callers get a fresh Shape object but share the
 * underlying sampled buffer — nothing mutates stage data after it is built.
 */
export function buildEagleStage(ctx: ShapeContext): Promise<Shape> {
  const key = `${ctx.count}:${ctx.S}`;
  let pending = cache.get(key);
  if (!pending) {
    pending = sampleAlphaMask(EAGLE_ASSET, "eagle", EAGLE_WIDTH * ctx.S, ctx.count).then(
      (shape) => ({ ...shape, drift: ctx.R * EAGLE_DRIFT })
    );
    cache.set(key, pending);
  }
  return pending.then((shape) => ({ ...shape }));
}

/**
 * Compose a page's own stage sequence with the shared finale.
 *
 * Every page config routes its builder through this, so "the eagle is always last"
 * is guaranteed structurally rather than by each page remembering to append it.
 */
export function withEagleFinale(
  build: (ctx: ShapeContext) => Shape[]
): (ctx: ShapeContext) => Promise<Shape[]> {
  return async (ctx) => [...build(ctx), await buildEagleStage(ctx)];
}

/**
 * Sample `count` points from an image's alpha channel.
 *
 * The source is downscaled to at most 260px wide before sampling — the silhouette
 * only needs enough resolution to place points along its own shape, and decoding a
 * full-size bitmap to read opacity would be wasted work. Points are taken on an
 * even stride through the collected opaque pixels (rather than at random) so the
 * mark's density is uniform, with sub-pixel jitter so it reads as grain instead of
 * a visible pixel grid.
 *
 * No colour is read or produced here: a Shape carries geometry and an accent mask
 * only, and the hues come from the scene's palette tokens.
 */
function sampleAlphaMask(
  url: string,
  name: string,
  targetWidth: number,
  count: number
): Promise<Shape> {
  return new Promise((resolve) => {
    const data = new Float32Array(count * 3);
    // The closing mark is one clean tone — no accent nodes, so the signature reads
    // as a single settled silhouette rather than reintroducing focal points.
    const accent = new Float32Array(count);
    const fallback = (): Shape => ({ name, data, accent, flat: true });

    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      const maxW = 260;
      const scale = Math.min(1, maxW / img.width);
      const w = Math.max(1, Math.round(img.width * scale));
      const h = Math.max(1, Math.round(img.height * scale));
      const canvas = document.createElement("canvas");
      canvas.width = w;
      canvas.height = h;
      const cx = canvas.getContext("2d");
      if (!cx) {
        resolve(fallback());
        return;
      }
      cx.drawImage(img, 0, 0, w, h);
      const px = cx.getImageData(0, 0, w, h).data;

      const opaque: number[] = [];
      for (let y = 0; y < h; y++) {
        for (let x = 0; x < w; x++) {
          if (px[(y * w + x) * 4 + 3] > 128) opaque.push(x, y);
        }
      }

      const unit = targetWidth / w;
      const n = opaque.length / 2 || 1;
      for (let i = 0; i < count; i++) {
        const s = (Math.floor((i / count) * n) % n) * 2;
        const jx = opaque[s] + Math.random();
        const jy = opaque[s + 1] + Math.random();
        data[i * 3] = (jx - w / 2) * unit;
        data[i * 3 + 1] = -(jy - h / 2) * unit;
        data[i * 3 + 2] = (Math.random() - 0.5) * targetWidth * 0.04;
      }
      resolve({ name, data, accent, flat: true });
    };
    img.onerror = () => resolve(fallback());
    img.src = url;
  });
}
