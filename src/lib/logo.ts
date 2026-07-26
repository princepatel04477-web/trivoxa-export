/**
 * Logo tone — the one rule that decides what colour the mark inherits.
 *
 * Colour is never set on the logo itself. The mark's paths fill with
 * `currentColor`; these tones point `currentColor` at an existing theme token
 * (see `src/app/styles/logo.css`). Everything here is background-first: a tone
 * names the SURFACE the logo is sitting on, not the ink. `dark` means "on a
 * dark surface", which renders the light logo.
 *
 * The navbar rule lives here — one function, one threshold — so all eight
 * routes resolve their masthead tone through the same code path instead of
 * each page deciding locally. That was the drift the audit found.
 */

/** Which surface the logo is sitting on. */
export type LogoTone = "light" | "dark";

/**
 * Scroll offset (px) at which the masthead leaves its transparent over-hero
 * state and condenses onto its own solid backdrop. Shared by the header's
 * `.header--scrolled` class toggle and by `navLogoTone` below, so the chrome
 * and the mark can never disagree about which state they are in.
 */
export const HEADER_CONDENSE_AT = 40;

/**
 * At rest the masthead floats transparent over the page hero. Every route's
 * hero sits on `--bg` (Midnight Navy), so the surface under the logo is dark.
 */
const HERO_TONE: LogoTone = "dark";

/**
 * Once condensed, the bar paints its own backdrop — a `--bg` gradient (see
 * `.header::before` in header.css). Same token, so the surface is still dark.
 * Kept as a separate constant rather than folded into the one above: if a light
 * masthead is ever introduced, this is the single line that changes it, on all
 * eight pages at once.
 */
const CONDENSED_TONE: LogoTone = "dark";

/**
 * The masthead tone rule. Applied identically on Home, Group, Businesses,
 * Industries, Global Presence, Insights, Careers and Contact — no page passes
 * its own tone to the navbar logo.
 */
export function navLogoTone(condensed: boolean): LogoTone {
  return condensed ? CONDENSED_TONE : HERO_TONE;
}

/**
 * The footer sits on `--bg` on every route, so its lockup takes the same tone
 * site-wide. Exported for symmetry with `navLogoTone` — again, so the value
 * lives in one file rather than in the footer's markup.
 */
export const FOOTER_TONE: LogoTone = "dark";
