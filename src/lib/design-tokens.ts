/**
 * Runtime access to the site's design tokens.
 *
 * The particle system must never carry a colour of its own. Every hue it renders
 * is read from the CSS custom properties the rest of the site already resolves
 * through (globals.css), at mount, so the animation cannot drift from the live
 * palette — now or after a retheme. There is no fallback shade and nothing is
 * approximated: if a token is missing the failure is loud, because silently
 * inventing a colour is the exact problem this module exists to prevent.
 *
 * Client-only — getComputedStyle needs a live document.
 */

import * as THREE from "three";

/** Token names this project's particle rendering is allowed to use. */
export type ColorToken =
  | "--bg"
  | "--text"
  | "--text-2"
  | "--line"
  | "--gold"
  | "--gold-hover"
  | "--gold-particle"
  | "--gold-packet"
  | "--route"
  | "--success"
  | "--particle-a"
  | "--particle-b"
  | "--particle-c"
  | "--particle-d"
  | "--port-origin-dot"
  | "--port-origin-text"
  | "--port-dest-dot"
  | "--port-dest-text";

/** Non-colour tokens the particle system reads (label typography). */
export type FontToken = "--font-mono";

// Tokens are static for a session, and getComputedStyle forces style resolution,
// so each name is read at most once.
const rawCache = new Map<string, string>();
const colorCache = new Map<string, THREE.Color>();

/**
 * Read a custom property's resolved value.
 *
 * Resolved against the documented scope for each token. `:root` carries the
 * canonical palette; `.tvx` re-declares a few (--gold among them) for the inner
 * pages, so when that element is on the page it is the more accurate source.
 */
export function readToken(name: ColorToken | FontToken): string {
  const cached = rawCache.get(name);
  if (cached !== undefined) return cached;

  const scope = document.querySelector<HTMLElement>(".tvx") ?? document.documentElement;
  const value = getComputedStyle(scope).getPropertyValue(name).trim();
  rawCache.set(name, value);
  return value;
}

/**
 * Read a token as a THREE.Color.
 *
 * Throws rather than guessing. A missing or non-literal token (a `color-mix()`
 * that THREE cannot parse, say) is a wiring bug, and rendering it as black or
 * white would be a silent palette drift that nobody notices until it ships.
 */
export function tokenColor(name: ColorToken): THREE.Color {
  const cached = colorCache.get(name);
  if (cached) return cached.clone();

  const raw = readToken(name);
  if (!raw) {
    throw new Error(
      `design-tokens: ${name} is not defined. Define it in globals.css — the ` +
        `particle system must not carry its own colour value.`
    );
  }

  const color = new THREE.Color();
  try {
    color.setStyle(raw);
  } catch {
    throw new Error(
      `design-tokens: ${name} resolved to "${raw}", which is not a literal colour ` +
        `THREE can parse. Point the token at a plain hex/rgb value.`
    );
  }

  colorCache.set(name, color);
  return color.clone();
}

/**
 * A canvas `font` shorthand built from a font token.
 *
 * Label sprites are drawn into a 2D canvas, which needs a concrete font string
 * rather than a CSS variable. The family comes from the token so map labels use the
 * same face as the rest of the site's mono type; only size and weight are passed
 * in. Falls back to the generic family if the token is missing, since an unreadable
 * label is a worse failure than a substituted face.
 */
export function canvasFont(name: FontToken, sizePx: number, weight = 500): string {
  const family = readToken(name) || "monospace";
  return `${weight} ${sizePx}px ${family}`;
}

/** Clear the caches. Only needed if the palette is swapped live (it isn't today). */
export function invalidateTokenCache(): void {
  rawCache.clear();
  colorCache.clear();
}
