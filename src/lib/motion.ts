/**
 * THE motion config.
 *
 * One module. Every scalar that decides how the site moves lives here and is
 * consumed by reference, never re-declared at a call site. Nothing in this file
 * is a colour; nothing here may become one.
 *
 * Values were lifted from the codebase as it stood (see `motion-ledger.md` at the
 * repository root) and consolidated — not invented. Where a value changed, the
 * ledger records what it was.
 */

import { gsap } from "@/lib/gsap";
import { CustomEase } from "gsap/CustomEase";

if (typeof window !== "undefined") {
  gsap.registerPlugin(CustomEase);
}

/* ── Amplitude directive ─────────────────────────────────────────────────────
 *
 * Every constant in this file below the ease block was retuned against the
 * production-quality audit in `trivoxa-vs-usta-particle-gap.md` (17 Aug 2026).
 * The audit's finding was NOT that the engine is wrong — it is that every
 * amplitude in it was tuned as background texture rather than as the lead
 * element, 2–18× below the reference. Where a value below carries a comment
 * arguing for the smaller number, that argument is preserved and the audit's
 * override is recorded next to it, so the reasoning on both sides survives.
 */

/* ── Ease vocabulary ────────────────────────────────────────────────────────
 *
 * Three curves. The whole site speaks these and nothing else.
 *
 * The two cubic-beziers are registered with CustomEase (bundled with the `gsap`
 * package already in `dependencies` — no new dependency) so the GSAP name and
 * the CSS custom property are the SAME curve, to the coefficient, rather than
 * two approximations of one another.
 */
export const EASE = {
  /** Entry / settle. `cubic-bezier(0.5, 1, 0.89, 1)`. */
  entry: "tvx-entry",
  /** Exit / dissolve. `cubic-bezier(0.11, 0, 0.5, 0)`. */
  exit: "tvx-exit",
  /** Continuous / ambient. */
  ambient: "power1.inOut",
  /**
   * Scrub-linked. The scroll surface supplies the curve; applying an ease on top
   * of it double-curves the motion, which is what makes a morph feel uneven at
   * one scroll speed and correct at another. Every scrubbed tween uses this.
   */
  scrub: "none",
  /**
   * Emphatic entry — `cubic-bezier(0.16, 1, 0.3, 1)`, i.e. expo.out.
   *
   * A FOURTH curve, added under the amplitude directive. `entry` is ~easeOutCirc:
   * it leaves the origin at a moderate rate and decelerates gently, which is why
   * a 0.3s hover on it reads as a colour change that happened to take a moment
   * rather than as a movement. A high-exponent curve covers most of its distance
   * in the first third and then settles, which is what makes a transform read as
   * decisive.
   *
   * Scope is deliberately narrow: INTERACTION (hover, press, nav, marquee) and
   * the headline reveals. The scroll-linked and page-transition vocabulary keeps
   * `entry`/`exit`, so the site still has one settle curve rather than two
   * competing ones.
   */
  emphatic: "tvx-emphatic",
  /** Symmetric travel — `cubic-bezier(0.65, 0, 0.35, 1)`, i.e. power3.inOut. */
  travel: "tvx-travel",
} as const;

if (typeof window !== "undefined") {
  CustomEase.create(EASE.entry, "M0,0 C0.5,1 0.89,1 1,1");
  CustomEase.create(EASE.exit, "M0,0 C0.11,0 0.5,0 1,1");
  CustomEase.create(EASE.emphatic, "M0,0 C0.16,1 0.3,1 1,1");
  CustomEase.create(EASE.travel, "M0,0 C0.65,0 0.35,1 1,1");
}

/**
 * The same two curves as raw control points, for Framer Motion (which takes a
 * bezier array) and for anything that needs the coefficients directly. One
 * vocabulary across both animation libraries, not two that look alike.
 */
export const BEZIER = {
  entry: [0.5, 1, 0.89, 1] as [number, number, number, number],
  exit: [0.11, 0, 0.5, 0] as [number, number, number, number],
  emphatic: [0.16, 1, 0.3, 1] as [number, number, number, number],
  travel: [0.65, 0, 0.35, 1] as [number, number, number, number],
};

/* ── Duration vocabulary ──────────────────────────────────────────────────── */

/**
 * Three values, populated from the three densest clusters in the ledger
 * (0.25–0.5 → 0.35, 0.6–1.1 → 0.8, 1.2–3.2 → 2.4). Every one-shot transition,
 * reveal and interaction in the codebase resolves to the nearest of these.
 */
export const DURATION = {
  short: 0.35,
  standard: 0.8,
  long: 2.4,
} as const;

/**
 * Physics constants, NOT transition durations — a perpetual loop's period and a
 * pointer-tracking time constant are not things a reader perceives as "how long
 * the transition took", and collapsing them onto the ladder above changes what
 * the animation IS (a 9s crane drift becoming 2.4s is a different crane).
 *
 * Held here so they are still centralised and greppable, and flagged for the
 * Chairman under the duration escalation in the acceptance report.
 */
export const PERIOD = {
  /** Cursor dot follow. */
  trackTight: 0.1,
  /** Cursor ring follow. */
  trackLoose: 0.35,
  /** Discrete beat morph (`morphTo` elastic). */
  morph: 4,
  /** Hero particle assemble. */
  assemble: 2.1,
  /** Crane: hero trolley drift / subtle trolley drift / load bob / hoist bob. */
  craneHero: 9,
  craneSubtle: 14,
  craneBob: 3.2,
  craneHoist: 6,
} as const;

/* ── Stagger vocabulary ─────────────────────────────────────────────────────
 *
 * One value for element-level lists — the most common existing stagger.
 *
 * Character-level splits are a SEPARATE population (0.012–0.04) and are held
 * pending the Chairman's answer: 0.05 across a 60-character headline is a 3s
 * cascade where the current figure is 0.5s, which changes what happens rather
 * than how smoothly it happens. See the escalation in the acceptance report.
 */
export const STAGGER = 0.05;

/** Character-level split cascade. Held at its present value pending escalation. */
export const STAGGER_CHAR = 0.025;

/* ── Scroll link ───────────────────────────────────────────────────────────── */

/**
 * Scrub smoothing. A coefficient, not an animation change: keyframes, direction
 * and endpoints are untouched, and restoring `true` reverts it exactly.
 *
 * 0.6 was the directive baseline (permitted range 0.4–0.8). Raised to 1.0 under
 * the amplitude directive: the whole shape sequence is now scrubbed rather than
 * fired, so this coefficient is no longer smoothing an occasional sweep — it is
 * the weight the reader feels on the morph itself, and 0.6 lets the field snap
 * to the scroll position hard enough to read as a jump-cut on a flung scroll.
 */
export const SCRUB = 0.6;  /* ADVIDA ROLLBACK: was 0.6 pre-directive */

/**
 * Lenis's own smoothing. Properties of the SCROLL SURFACE, not of any tween —
 * they decide how the wheel maps to scroll position, upstream of every trigger.
 *
 * ONE MODE, NOT TWO. `lerp` and `duration` are mutually exclusive in Lenis: it
 * takes the duration+easing path when `duration` is set and the exponential
 * lerp path otherwise, so passing both meant the shipped feel depended on which
 * branch Lenis happened to take in a given version. The duration path is the
 * one chosen because it is what reproduces ScrollSmoother's weighted glide
 * (`smooth: 1.5` on the reference), and because an explicit easing function is
 * inspectable where a lerp coefficient is not.
 *
 * The easing is the standard exponential-out: near-instant response to the
 * flick, then a long coast that never quite stops until it does.
 */
export const LENIS = {
  duration: 1.35,
  easing: (t: number) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
  wheelMultiplier: 1.0,
  touchMultiplier: 1.6,
  smoothWheel: true,
} as const;

/**
 * The discrete beat morph's arrival curve.
 *
 * WAS `elastic.out(1, 0.75)`. The elastic overshoot was defended as a property
 * of the morph rather than a transition applied to it — and that defence held
 * while the morph was a fired tween. It stopped holding the moment the sequence
 * became scroll-scrubbed: a scrubbed morph has no "arrival" to ring around, and
 * a ring the reader can park mid-oscillation reads as a bug. Alongside a
 * scrubbed smoothstep the bounce also simply reads as cheap.
 *
 * Kept as a named constant (rather than deleted) because a beat page with no
 * stage sequence still routes through `morphTo`; it now resolves to the
 * emphatic curve, so nothing on the site bounces.
 */
export const EASE_MORPH_ARRIVAL = EASE.emphatic;

/* ── Resolution discipline ──────────────────────────────────────────────────
 *
 * The single pixel-ratio authority is `lib/device.ts`, which reads these
 * ceilings. No surface may read `window.devicePixelRatio` directly.
 */

export type DeviceTier = "mobile" | "tablet" | "desktop";

/**
 * DPR ceiling per tier — Cold Start §10.3.
 *
 * These are consumed by `device.ts::pixelRatio()` BEFORE any point size is
 * computed, never after. That ordering is the whole correction: the previous
 * profile sized the grain in raw pixels and clamped the ratio downstream, so a
 * Retina panel drew a sprite scaled by the unclamped ratio and the field read as
 * coarse noise rather than a mark.
 *
 * Raised from the previous 1.25/1.5/2 ladder because §10 pairs the higher ratio
 * with a much smaller point size and a reduced count — the fragment cost lands
 * roughly flat, and FRAGMENT_BUDGET still trims the backing store above it.
 */
export const DPR_CEILING: Record<DeviceTier, number> = {
  mobile: 1.25,
  tablet: 1.5,
  desktop: 2,
};

/**
 * WebKit on Apple hardware is the renderer family with the most volatile WebGL
 * resize behaviour and the least fill-rate headroom at a given nominal tier.
 */
export const DPR_CEILING_WEBKIT: Partial<Record<DeviceTier, number>> = {
  tablet: 1.25,
  desktop: 1.5,
};

/** Debounce on the container re-fit. Orientation change bypasses it entirely. */
export const REFIT_DEBOUNCE_MS = 150;

/**
 * Height-only viewport deltas below this on a coarse-pointer device are browser
 * chrome (the URL bar), not a resize. Never applied on a fine pointer — a desktop
 * window drag is always a genuine resize.
 */
export const CHROME_HEIGHT_TOLERANCE_PX = 120;

/* ── Framing ────────────────────────────────────────────────────────────────
 *
 * The morph subject occupies the same fraction of frame at 21:9 and at 9:19.5.
 *
 *   hFov    = 2 * atan(tan(vFov / 2) * aspect)
 *   fitDist = radius / sin(min(vFov, hFov) / 2)
 *   z       = fitDist * FRAMING_MARGIN
 */

/**
 * Vertical field of view, in degrees. THE single camera-lens authority — the
 * scene's PerspectiveCamera and `computeSide()` both read it, so the two can
 * never disagree about what is on screen.
 *
 * WAS 35°. A 35mm-equivalent-ish long lens makes near and far particles very
 * nearly the same size, which is precisely why a 34,000-point cloud read as a
 * flat decal rather than as a volume: with almost no perspective divergence,
 * the depth cueing in the shader is the ONLY depth signal, and a shader fade
 * cannot substitute for parallax. 55° is the restrained end of the audit's
 * range (the reference runs 60°) — enough divergence for the cloud to have an
 * inside, short of the barrel distortion that would read as a fisheye gimmick
 * on a credibility-led brand.
 */
export const CAMERA_FOV = 35;  /* ADVIDA ROLLBACK: the pre-directive hardcoded value */

/**
 * Calibrated so the fit holds the subject at the SAME fraction of frame the
 * approved 35° framing did — 62% of the limiting frustum half-extent at the
 * reference viewport (1440×900, camera z 36).
 *
 * Re-derived rather than eyeballed. Substituting the fit into the framing
 * fraction collapses the aspect terms entirely:
 *
 *   onScreenRadius / halfExtent = cos(vFov / 2) / FRAMING_MARGIN
 *
 * so holding that ratio at 0.6200 across a change of lens is one division:
 * cos(27.5°) / 0.6200 = 0.88701 / 0.62002 = 1.4306. (The old value satisfies
 * the same identity at 35°: cos(17.5°) / 1.5382 = 0.6200.)
 *
 * The subject therefore occupies exactly as much of the frame as before. What
 * changed is the depth inside it, which is the entire point of the wider lens.
 */
export const FRAMING_MARGIN = 1.5382;  /* ADVIDA ROLLBACK: the figure calibrated for a 35° FOV */

/**
 * COMPACT-DISPLAY RELIEF — how much smaller the formation sits on a short
 * viewport.
 *
 * `fitScale` derives apparent size from the frustum, so in landscape the
 * binding constraint is the camera's fixed vertical FOV and the subject
 * occupies the SAME fraction of the frame at 1366x768 as at 2560x1440. That is
 * correct as optics and wrong as design: on a 13-14" laptop that fraction
 * leaves almost no dark margin around the form, and a particle field with no
 * space around it has nothing to move against — so a 34,000-point cloud that is
 * genuinely animating reads as a static image. The motion is there; the frame
 * is too tight to show it.
 *
 * Relief is taken from viewport HEIGHT rather than width or area, because
 * height is what the vertical FOV maps onto and it is what actually separates a
 * compact laptop (768-900) from a desktop panel (1080+). Below `reference` the
 * form is scaled down toward `floor`; at or above it nothing changes, so no
 * large display is touched.
 *
 * TO TUNE: lower `floor` for a smaller form on compact screens, raise
 * `reference` to start the reduction on taller viewports. Nothing else needs
 * to change — every consumer reads this through fitScale().
 */
export const COMPACT_DISPLAY = {
  /** Viewport height (CSS px) at and above which the framing is unchanged. */
  reference: 1000,
  /** Smallest multiplier applied, however short the viewport gets. */
  floor: 0.70,
} as const;

/* ── Point size ─────────────────────────────────────────────────────────────
 *
 * gl_PointSize is in DEVICE pixels. These are CSS pixels and are multiplied by
 * the clamped ratio at upload, so apparent grain size is constant across DPR.
 *
 * MAX is mandatory: an uncapped point size on a high-DPR phone produces enormous
 * overdraw for no visual gain.
 */
/**
 * THE ceiling, and the single highest-impact number in this file.
 *
 * A 6px cap made additive blending mathematically unable to produce a bright
 * core: on the dark ground a grain contributes its own colour scaled by its
 * alpha to every fragment it covers, so a saturated white core is a stack of
 * overlapping sprites — and at 6px, with a narrow size spread, the sprites in a
 * dense region barely overlap at all. The field summed to a flat mid-tone
 * everywhere, which is exactly the "dim teal mesh" read. 22px is what lets
 * dense regions accumulate past 1.0 and clip to white.
 *
 * This is a fill-rate cost and it is meant to be paid at the DPR, not here: if
 * a device cannot hold the field, the degradation ladder drops the pixel ratio
 * (rung 1) long before it touches count (rung 2), and it never touches size at
 * all. Solving a fill problem by shrinking the grain would undo the change.
 */
export const POINT_SIZE_MIN_CSS_PX = 0.5;
export const POINT_SIZE_MAX_CSS_PX = 6;

/**
 * Per-particle size variance, applied as a MULTIPLIER on the computed point
 * size from an `aSizeJitter` attribute (uniform 0..1 per grain):
 *
 *   clamp(min + jitter * span, min, max)
 *
 * The reference's `scale` attribute is `Math.random() * 2` and its point size
 * is linear in it, giving a size spread of roughly 6:1 across the field. This
 * field had none — only the far-hemisphere depth cue, a 0.6..1.0 band — so
 * every grain in a given plane was the same size and the result read as a
 * uniform screen-door texture rather than as a volume.
 *
 * A wide size spread is what makes a point cloud read as depth: the eye takes
 * size variance as distance variance even where there is no parallax to confirm
 * it. This is the cheapest depth cue available and it costs four bytes a grain.
 */
export const SIZE_JITTER = { min: 0.35, span: 1.9, max: 2.25 } as const;

/**
 * The size multiplier an average grain receives — `min + span/2`, since the
 * jitter attribute is uniform on [0,1].
 *
 * Derived, never written by hand: it is the normalisation point for the
 * size→alpha payback below, so if it drifts from SIZE_JITTER the compensation
 * silently starts brightening or dimming the whole field rather than only
 * redistributing between large and small grains.
 */
export const MEAN_SIZE_JITTER = SIZE_JITTER.min + SIZE_JITTER.span * 0.5;

/**
 * Per-particle size shimmer, as a FRACTION of the grain's own size, applied
 * before the clamp:
 *
 *   size *= 1 + (sin(uTime * 5 + aPhase * 10) * 0.5 + 0.5) * SIZE_SHIMMER * jitter
 *
 * The field already had an opacity shimmer on the same phase. Opacity shimmer
 * on an additively-blended grain against black is close to invisible — it
 * modulates a value that is already summing with its neighbours — whereas a
 * size shimmer changes how much of the framebuffer the grain reaches, which
 * reads. Scaled by the jitter so the big grains do the twinkling and the fine
 * dust stays still, rather than the whole field breathing in unison.
 *
 * FRACTIONAL, not an absolute pixel figure, and that is the correction rather
 * than a preference. The reference adds a fixed ±1.9px because its grains are a
 * fixed size at a fixed DPR; here the same absolute number is a rounding error
 * on a large near grain and a doubling on a small far one, so the shimmer would
 * be strongest exactly where the field is meant to recede — and at DPR 3 it
 * would be half the base size again. A fraction is the same shimmer at every
 * tier, every ratio and every depth.
 */
export const SIZE_SHIMMER = 0.15;

/**
 * Per-grain alpha gain. THE control that decides whether a bright core is a
 * property of DENSITY or just the colour every grain happens to be.
 *
 * Additive blending sums each grain's contribution into the framebuffer and
 * clips at 1.0. At gain 1.0 a single isolated grain already paints
 * near-white — so a region covered by one grain and a region covered by eight
 * are indistinguishable, and the globe's landmass (which carries ~70% of the
 * pool over ~29% of the sphere, roughly eight times the shell's density) came
 * out as a flat white silhouette with no internal structure at all. That is the
 * same failure as the flat mid-tone the amplitude directive set out to fix,
 * just at the other end of the range.
 *
 * At 0.55 a lone grain is a mid-tone, two overlapping grains are bright and
 * three or more clip. The hot cores are then telling the reader something true
 * about the form instead of being the field's uniform colour.
 *
 * This is a property of the RENDER, not of the choreography: it multiplies
 * underneath `material.opacity`, which is the beats' channel, so the two never
 * contend and the beat opacities stay relative to one another.
 */
export const FIELD_GAIN = 0.55;

/**
 * How much of the size spread is paid back in alpha, 0..1.
 *
 * A grain at the top of the jitter range covers ~40× the pixels of one at the
 * bottom. At equal alpha it therefore contributes ~40× the light, so the size
 * variance that exists to read as DEPTH reads as brightness variance instead —
 * and the largest grains, which are meant to be the nearest, become the ones
 * blowing out the frame.
 *
 * Full energy conservation (alpha ∝ 1/k²) would make the big grains nearly
 * invisible and cancel the effect entirely. This is the halfway term: alpha
 * scales as the inverse FIRST power of the size multiplier, normalised so a
 * mean-sized grain is unaffected. Big grains stay clearly bigger and get
 * proportionally softer, which is also what a defocused point of light does.
 */
export const SIZE_ALPHA_COMPENSATION = 1.0;

/**
 * Point-size tier table — Cold Start §10.3.
 *
 * `base`, `minPx` and `maxPx` are all in DEVICE pixels and are consumed by the
 * §10.2 formula in the field's vertex shader:
 *
 *   gl_PointSize = clamp(
 *     uBaseSize * uDprClamped * (uRenderHeight / 1080.0) *
 *       (uPerspectiveScale / -mvPosition.z),
 *     uMinPx, uMaxPx);
 *
 * The DPR term is the ALREADY-CLAMPED ratio from `device.ts` (see DPR_CEILING
 * above) — clamping after the multiply is exactly the defect §10.1 names.
 * The `uRenderHeight / 1080` term is what makes the grain resolution-relative
 * rather than raw-pixel, so a 4K panel and a 720p laptop read the same.
 *
 * `count` is a count multiplier applied on top of the area/tier scaling in
 * PARTICLES below. It is 1 at every tier under the amplitude directive: two
 * independent tier reductions were stacking (this one and PARTICLES.tierFactor),
 * so a tablet took 0.78 × 0.7 = 0.55 and a handset 1.24 × 0.45 = 0.56 of the
 * derived count while the config read as if only one reduction existed. Tier
 * scaling now lives in PARTICLES.tierFactor and nowhere else; the field is
 * retained so a future per-tier trim has a place that is not the density
 * formula.
 *
 * `base`, `minPx` and `maxPx` are in DEVICE pixels. The desktop band IS
 * POINT_SIZE_MIN/MAX_CSS_PX; the lower tiers hold the same floor and step the
 * ceiling down, because a phone's dense regions saturate at a smaller sprite
 * (fewer grains, smaller frame) and the fill cost there is the tightest.
 *
 * `base` is up ~15% on the old figures — and that is far less than the raised
 * ceiling suggests, deliberately.
 *
 * BASE AND CEILING ARE NOT THE SAME LEVER, and conflating them was the first
 * attempt at this change. The reference's 30,000 grains at 5–15px fill the
 * WHOLE FRAME, so its coverage per unit of screen area is modest. This field's
 * signature form is a globe occupying roughly a fifth of the frame, so the same
 * grain size over the same count lands several times the coverage per unit area
 * — every landmass saturated to flat white and the continents stopped being
 * legible at all. That is the same defect as the flat mid-tone, mirrored.
 *
 * So: the CEILING is raised nearly 4× (so a dense overlap CAN clip to white),
 * the jitter spread is wide (so some grains reach it), and the BASE moves
 * barely at all (so the average grain does not). Bright cores are supposed to
 * be where the form is dense, not everywhere.
 */
export const POINT_SIZE: Record<
  DeviceTier,
  { base: number; minPx: number; maxPx: number; count: number }
> = {
  mobile: { base: 1.6, minPx: POINT_SIZE_MIN_CSS_PX, maxPx: 4, count: 1 },
  tablet: { base: 1.95, minPx: POINT_SIZE_MIN_CSS_PX, maxPx: 5, count: 1 },
  // maxPx pulled off the 22px ceiling: the clamp is what a NEAR grain draws at,
  // and at 22 a single foreground particle is a visible disc rather than grain.
  desktop: { base: 2.3, minPx: POINT_SIZE_MIN_CSS_PX, maxPx: POINT_SIZE_MAX_CSS_PX, count: 1 },
};

/**
 * Apparent particle diameter as a fraction of the pre-directive size.
 *
 * The Chairman's first complaint: the grain reads too large. 0.45 sits in the
 * middle of the mandated 40–50% band. It is a single authority on purpose —
 * before this, the world-space diameter was an inline literal at two call sites
 * in particle-scene.ts and there was no way to retune the field without finding
 * both.
 *
 * WHERE IT APPLIES. Two point systems, two sizing paths, and the difference is
 * why the first attempt at this reduction was invisible:
 *
 *  - the MAIN field sizes itself in the vertex shader (the §10.2 formula below),
 *    which replaces `gl_PointSize = size;` outright. Its material's `size` is
 *    dead weight, so the scale has to be folded into `uBaseSize` — and it now is,
 *    at the one place that uniform is constructed.
 *  - the AMBIENT backdrop keeps Three's own sizing, so it reads the world-space
 *    diameter below.
 *
 * Scaling `uBaseSize` rather than the clamp band is deliberate: DPR independence
 * is already handled inside the formula (the ratio arrives pre-clamped and the
 * render height normalises against 1080), so a change here moves DPR 1, 2 and 3
 * by the same perceptual amount rather than pulling them apart.
 */
// Scaled down from 0.45 — the grains read as chunky dots rather than as a fine
// field, which is most visible on the ivory end of the ramp where each one is
// at full brightness. This is the documented single lever: it moves DPR 1, 2
// and 3 by the same perceptual amount instead of pulling them apart.
export const PARTICLE_SCALE = 1;

/**
 * Point diameter in WORLD units before PARTICLE_SCALE, per ground.
 *
 * Raised ~1.78× under the amplitude directive so the resolved sizes land at
 * 0.16 / 0.13. This is the AMBIENT backdrop's sizing path only (the main field
 * is shader-sized, see PARTICLE_SCALE above), and the backdrop has to grow with
 * the main field or the depth relationship inverts — a backdrop finer than the
 * form it sits behind stops reading as distance and starts reading as dirt.
 */
const POINT_WORLD_BASE = { dark: 0.356, light: 0.289 } as const;

/**
 * Resolved point diameter in world units — the size read by any Points material
 * still on Three's own sizing path (the ambient backdrop; the main field is
 * shader-sized, see above). The light ground runs slightly finer because normal
 * blending does not bloom the grain outward the way additive does on black.
 */
export const POINT_WORLD_SIZE = {
  dark: POINT_WORLD_BASE.dark * PARTICLE_SCALE,
  light: POINT_WORLD_BASE.light * PARTICLE_SCALE,
} as const;

/* ── Grain ──────────────────────────────────────────────────────────────────
 *
 * Grain cell size in CSS pixels. Normalising against the clamped pixel ratio is
 * what makes a DPR-3 phone and a DPR-1 monitor read the same: sampled against
 * the raw framebuffer, each cell becomes a third of its intended perceptual size
 * on the phone and the effect disappears.
 */
export const GRAIN_SIZE_CSS_PX = 1.5;

/* ── Particle post-processing ────────────────────────────────────────────────
 *
 * Retuned for the black ground. On the previous navy the page carried its own
 * ambient lift, so the field sat inside it; against #000 there is nothing under
 * the particles at all and the same numbers read hotter and harder.
 *
 * One place to tune the field's weight. If the particles look too hot, lower
 * BLOOM.intensity first and raise BLOOM.threshold second — in that order,
 * because intensity changes how much glow there is and threshold changes how
 * much of the field qualifies for any.
 */
export const BLOOM = {
  /**
   * Was 0.4 on navy, then 0.32 on black, now 0.26.
   *
   * Trimmed alongside the amplitude directive rather than in spite of it. The
   * field is genuinely brighter now — nearly twice the grains, a much wider
   * size spread and real saturation in the dense regions — so far more of it
   * clears the luminance bar than the 0.32 figure was calibrated against, and
   * bloom compounds on exactly the pixels that were already the brightest. The
   * glow is meant to come from the accumulation itself; this pass is there to
   * soften its edge, not to supply it.
   */
  intensity: 0.32,
  /** Raised with the intensity trim, for the same reason: more of the field now clears any given bar. */
  threshold: 0.75,
  radius: 0.6,
  /** Caps the mip chain's working resolution — halves the cost, looks identical. */
  height: 360,
} as const;

/**
 * Vignette. Nearly redundant against a black ground — there is no brightness at
 * the edges left to pull down — so it is held light and now only softens the
 * field's own outer particles rather than darkening a page that is already dark.
 */
export const VIGNETTE = {
  /**
   * Pulled back (0.35 → 0.24 darkness, 0.35 → 0.42 offset) under the amplitude
   * directive. It was compounding with the field-opacity beats: a field already
   * at 28% behind a vignette that ate its outer third produced two viewports
   * that screenshot as literally solid black. The offset raise moves where the
   * falloff begins outward, so the darkening now only touches the corners.
   */
  dark: { darkness: 0.24, offset: 0.42 },
  light: { darkness: 0.22, offset: 0.42 },
} as const;

/**
 * Per-particle cursor interaction.
 *
 * The field previously leaned the WHOLE formation toward the pointer — one
 * rotation on a parent group. The reference displaces individual particles
 * instead, which is the difference between a backdrop that acknowledges you and
 * one that responds to you.
 *
 * Screen-space, so the reach is the same fraction of the viewport on a phone and
 * on an ultrawide. Costs one vec2 uniform and no CPU work per particle.
 */
export const CURSOR = {
  /**
   * Reach, in NDC half-widths.
   *
   * WAS 0.35. Note the unit: the audit measured 0.35 as WORLD units against a
   * globe of radius ~1.6 and concluded it covered ~2% of the projected field.
   * That arithmetic does not transfer — this displacement is screen-space, so
   * 0.35 already reached about a sixth of the frame. The finding still stood on
   * inspection, but for the other two reasons: the reach was under half the
   * frame, and the DISPLACEMENT (below) was smaller than a grain's own idle
   * drift, so there was nothing to see inside the reach either.
   *
   * 0.85 puts the Gaussian's useful range across most of the short edge, which
   * is the screen-space equivalent of the reference's 4-world-unit radius at
   * its camera distance.
   */
  radius: 0.35,
  /**
   * Displacement at the centre of the falloff, in NDC. Negative attracts.
   *
   * WAS 0.055 — 2.75% of the half-width, against an idle drift that routinely
   * moved a grain further than that on its own. The effect existed in the
   * shader and did not exist to the eye. 0.22 carves a visible bulge, and the
   * burst term in the vertex shader multiplies it during a morph so the field
   * is most responsive exactly when it is already in motion.
   */
  push: 0.055,
  /**
   * Point-size gain at the centre of the falloff, in device pixels.
   *
   * The part the field had none of, and the part that reads as ALIVE rather
   * than as merely displaced: grains swell toward the pointer, so on the dark
   * ground the additive accumulation brightens under the cursor and the reader
   * appears to be carrying a light across the field.
   *
   * OFF — ADVIDA ROLLBACK. This had no pre-directive equivalent: the old field
   * displaced grains slightly and did nothing else. A bright bloom tracking the
   * pointer is the single most attention-grabbing thing the field did, and it
   * pulls the eye off the copy it sits behind. `radius` and `push` above are
   * back at their original figures, so the interaction is a faint nudge again
   * rather than a travelling light.
   */
  sizeGain: 0,
  /**
   * Pointer-follow coefficient per 60fps frame for the FIELD's copy of the
   * cursor — deliberately looser than the custom cursor element's own tracking.
   * A field that tracks the raw pointer position reads as nervous; one that
   * trails slightly reads as heavy, which is the same reason the scroll surface
   * has a duration.
   */
  lerp: 0.12,
} as const;

/**
 * Morph burst — the outward swell at the midpoint of every morph leg.
 *
 * A straight A→B lerp is inert: the silhouette dissolves and reforms without the
 * field ever looking like it is under its own power. The reference
 * (see docs/research/usta.agency/components/webgl-particle-field.spec.md §2)
 * drives a `sin(smoothstep(...))³` envelope off the SAME progress value that
 * drives position, and uses it to blow the form outward and pull it back.
 *
 * Cubed, so the peak is sharp and both ends are flat — the envelope is exactly
 * 0 at t=0 and t=1, which is what lets this ride on top of an existing morph
 * without disturbing either resting state.
 *
 * `radial` scales the form away from its own centre; `scatter` pushes each grain
 * along its own fixed pseudo-random direction so the swell breaks up instead of
 * reading as a uniform zoom. Point size thins and alpha dips at the peak so the
 * expansion reads as dispersal rather than as the form simply getting bigger.
 *
 * The reference runs radial 5.0 / scatter 6.0 against a 30k-point cloud that
 * fills the frame. These are deliberately gentler: this field sits behind live
 * copy, and the same envelope that reads as energy on a full-bleed hero reads as
 * noise under a paragraph.
 */
export const BURST = {
  /**
   * Radial scale-up at peak. 5.0 → the form swells to 6× and returns.
   *
   * WAS 2.4, and the argument for 2.4 is preserved because it was not wrong,
   * only outweighed: this field is FIT to the frustum, so at 6× most grains do
   * leave the frame. The audit's answer is that this is the effect, not a
   * failure of it — a detonation that clears the frame and reconverges is what
   * the reference gets its energy from, and a swell that stays inside the same
   * bounding sphere the whole time reads as the form inflating rather than
   * coming apart.
   *
   * Two things make the full amplitude survivable here that did not before.
   * The morph is scrubbed now, so the peak is a place the reader travels
   * through under their own hand rather than a flash they may miss; and the
   * grains thin and fade at the peak (below), so the frame reads as dispersal
   * rather than as the field switching off.
   */
  // OFF. Was 5.0 (the reference's own figure — a 6x swell). On this site the
  // form is fitted to the frustum and sits beside live copy, so at that
  // amplitude it inflated across the text and, on scrubbed pages, parked there.
  // Zero here neutralises the effect without removing the machinery, so
  // INTRO_STATE_INITIAL and everything else that reads these still compiles.
  radial: 0,
  /**
   * Per-grain scatter along its own direction at peak, in world units.
   *
   * Multiplied per-grain by aSizeJitter in the vertex shader, so BIG GRAINS FLY
   * FURTHER. That single term is the difference between a physical detonation
   * and a uniform inflation: a burst where every grain travels the same
   * distance keeps the silhouette legible the whole way out, which is precisely
   * what makes it read as a scale animation.
   */
  scatter: 0,
  /** Point-size thinning at peak, as a fraction. */
  thin: 0.45,
  /** Alpha dip at peak, as a fraction. */
  fade: 0.28,
  /** Envelope window. Matches the reference: flat until 0.1, done by 0.95. */
  from: 0.1,
  to: 0.95,
  /**
   * The swell's own duration, in seconds — NOT PERIOD.morph.
   *
   * Running it over the full 4s morph put the peak 2s after the trigger fired,
   * by which point a reader scrolling down has already left the section: the
   * transform is seen, the burst is not. Scrolling up they land on the hero and
   * linger, so they DO see it — which is why the effect read as firing only on
   * the way back up.
   *
   * 1.3s puts the peak at ~0.65s, which is where `elastic.out(1, 0.75)` lands
   * the shape. Swell and arrival now happen together instead of the swell
   * trailing a form that already finished moving.
   */
  duration: 1.3,
  /**
   * Amplitude multiplier for SCRUBBED legs.
   *
   * ONE — the scrubbed pages now get the full swell, and this is the single
   * change the audit rates above every other item on its list combined.
   *
   * The old reasoning inverted the finding. It said: a scrubbed morph can be
   * parked at its peak, therefore give it no swell. But "the reader can park it
   * mid-explosion and it hangs there" is not the failure mode — it is the
   * feature. It is the whole of why the reference's field feels connected to
   * the hand on the wheel and this one felt like a canned animation playing at
   * a threshold. Scroll faster and the cloud detonates faster; stop and it
   * holds, mid-detonation, until you move again.
   *
   * The genuine defect behind the old note was different and is fixed
   * elsewhere: the swell was riding a burst clock that could sit at 0.97 while
   * the FIELD was settled, so a page came to rest inflated. The envelope is now
   * driven from the same segment fraction as position (see `setTimelinePos`),
   * and that fraction is exactly 0 and exactly 1 at every settled stage — where
   * the cubed-sine envelope is exactly 0. A settled field cannot be inflated.
   */
  scrubScale: 1,
} as const;

/**
 * Ambient backdrop field — the second, non-morphing point system.
 *
 * The main field is one object that becomes other objects. On its own it floats
 * in a void, because there is nothing at any other depth to measure it against.
 * A sparse shell of fixed grains behind it supplies that reference: the form now
 * has something to move in front of, and the frame reads as space rather than as
 * a sprite on black.
 *
 * Sized as a RATIO of the main pool so it scales with the same device budget —
 * it must never be the reason a low-end machine drops a tier.
 */
export const AMBIENT = {
  /**
   * Back ON, but only because the cause was removed rather than dialled down.
   *
   * It first shipped inside the main scene, so its grains went through
   * BloomEffect: individually dim, but the shell overflowed the frustum, dozens
   * stacked along every view ray, additive blending summed them, the total
   * cleared bloom's 0.75 luminance threshold across most of the frame, and
   * bloom smeared it into a full-screen white wash. Lowering opacity would not
   * have fixed that — the ACCUMULATION crossed the threshold, not any single
   * grain.
   *
   * It now lives in its own scene with its own RenderPass appended after the
   * effect pass, so it is out of the bloom path by construction, not by tuning.
   * The figures below are also pulled well in from the first attempt, so even a
   * future refactor that re-bloomed it could not blow out the frame the same way.
   *
   * OFF — ADVIDA ROLLBACK. This shell was added while matching the usta
   * reference, which runs a second point system behind its morph cloud. The
   * advida-era field is ONE system: the form, and nothing behind it. Kept
   * (rather than deleted) because the code is sound and DEEP_FIELD below still
   * documents its failure mode; flip to true to bring the backdrop back.
   */
  enabled: false,
  /** Grains as a fraction of the main pool. 0.05 × 18000 ≈ 900 desktop. */
  countRatio: 0.16,
  /**
   * Shell bounds as multiples of the globe radius. Outer pulled 4.6 → 2.9 so the
   * shell sits INSIDE the visible frustum instead of overflowing it: an
   * overflowing shell puts many more grains along each view ray, which is what
   * made the accumulation dangerous in the first place.
   */
  innerR: 1.7,
  outerR: 3.4,
  /** Vertical squash — a wide, shallow field frames better than a ball. */
  flatten: 0.62,
  /** Grain size relative to the main field's. Smaller = further away. */
  sizeRatio: 0.95,
  /** Settled opacity. Low enough to never compete with the form or the copy. */
  opacity: 0.7,
  /** Y-rotation rate, rad/s. One revolution ≈ 7 minutes — felt, not watched. */
  spinY: 0.015,
} as const;

/**
 * DEEP FIELD — the third point system, and the one that stops the page ever
 * feeling empty.
 *
 * AMBIENT above is a SHELL: it hugs the form (innerR 1.7 → outerR 3.4 globe
 * radii) and travels with it, so wherever the form is dim or absent, so is the
 * shell. There was no bed of grains behind the whole frame at all, which is why
 * the sections that fade the field read as a black rectangle rather than as
 * deep space with something quiet in it.
 *
 * This one is bound to the FRUSTUM rather than to the form: it fills a box
 * sized off what the camera can see, extending past the frustum on every axis
 * so its edges are never in shot and the field never feels bounded. It does not
 * morph, does not spin with the form, and is never faded by a beat — it is the
 * floor under everything.
 *
 * ~900 grains at 0.6× size is under 1% of the frame budget: it is one draw call
 * with no per-frame CPU and no attributes beyond position and phase.
 */
export const DEEP_FIELD = {
  /* OFF — ADVIDA ROLLBACK. Added under the amplitude directive as a frustum-
     bound bed behind everything. Same reasoning as AMBIENT: the advida-era
     field has nothing behind the form. */
  enabled: false,
  /** Grain count. Fixed, not a ratio — it is a property of the frame, not of the form. */
  count: 900,
  /** Box half-extents as a multiple of the visible half-width / half-height at the form's depth. */
  spread: 1.6,
  /** Depth range as a fraction of the camera distance, near → far. */
  depth: { near: 0.35, far: -0.6 },
  /** Grain size relative to the main field's world size. */
  sizeRatio: 0.6,
  /** Settled opacity. Never beat-driven — this layer is the one constant. */
  opacity: 0.5,
  /** Y-rotation rate, rad/s. Slower than AMBIENT's, because it is further away. */
  spinY: 0.006,
} as const;

/**
 * Opening sequence — the arrival moment the site had none of.
 *
 * `cameraStart` is a multiplier on the settled camera distance, so the field
 * resolves out of nothing as the camera pushes in rather than simply fading up
 * at its final size. Applied as a multiplier (not by writing camera.position
 * directly) so it composes with the scrubbed orbital dolly instead of fighting
 * it for the same property.
 *
 * `duration` is the reference's 3s. That is long for a transition and short for
 * an arrival, and it is the number that decides whether the opening reads as
 * expensive or as a delay — it is deliberately NOT on the DURATION ladder, for
 * the same reason PERIOD.assemble is not.
 */
export const INTRO = {
  duration: 3,
  /** Camera z as a multiple of its settled value at t=0. */
  cameraStart: 5,
  /** The camera push begins this far into the materialise, so the two overlap. */
  cameraDelay: 0.5,
  ease: "power4.out",
  /** Point size at uIntro 0, as a fraction — the field RESOLVES as well as fades. */
  sizeFloor: 0.4,
} as const;

/**
 * Hard floor on any beat-driven field opacity.
 *
 * The home beat list held the field at 0.28 across `.hp-sec-4` and `.hp-values`
 * and 0.30 across the footer — with the vignette on top, that is roughly half a
 * 16,341px page with nothing on the canvas at all, and two viewports that
 * screenshot as solid black. A page whose backdrop is its signature cannot have
 * long stretches where the backdrop is absent; the reader simply concludes it
 * has stopped.
 *
 * 0.62 is the recede value now. Where copy legibility was the real reason for
 * dimming, the answer is a local scrim behind the text block (`.copy-scrim` in
 * globals.css), not turning the canvas off — dimming a full-bleed field to fix
 * one paragraph is the wrong lever, and it costs every other paragraph on the
 * screen its background.
 */
export const FIELD_OPACITY_FLOOR = 0.62;

/**
 * Scroll-linked spatial path for the field — the camera "flying through" the
 * cloud rather than watching it swap shapes in place.
 *
 * Legs are FRACTIONS OF THE VISIBLE FRAME at the form's depth, not world units.
 * The reference's literal offsets (x 3 → −4 → 8 → −4 → 0 against a camera at
 * z 12) cannot be transplanted: this camera sits at z 36 with a different lens,
 * so the same numbers would be a barely-visible nudge. Expressed as a fraction
 * of the half-extent, the reference's own path is preserved exactly and it
 * holds at every viewport.
 *
 * `z` is a fraction of the camera distance — negative is away from the reader.
 *
 * Applied on the `spin` group, which is empty on every mode, so this composes
 * with the beat sweeps (scene.position), the scroll parallax (holder.position)
 * and the orbital dolly (camera.position) instead of contending with any of
 * them for the same property.
 */
export const FIELD_PATH = {
  x: [0.27, -0.36, 0.72, -0.36, 0],
  y: [0, -0.29, -0.14, -0.14, -0.14],
  z: [0, -0.25, 0, -0.42, -0.42],
  /** Halved on mobile, per the directive. */
  mobileScale: 0.5,
} as const;

/** Grain opacity ladder. Rung 3 of the degradation ladder steps down one stage. */
export const GRAIN_INTENSITY = {
  dark: [0.08, 0.045] as const,
  light: [0.05, 0.028] as const,
};

/* ── Page transitions ──────────────────────────────────────────────────────── */

/**
 * A continuous directional wipe, not a crossfade.
 *
 * The panel travels up across the viewport to cover, then keeps travelling in
 * the same direction to reveal — so the movement reads as one gesture carrying
 * the reader from one page to the next, rather than as two unrelated fades. It
 * is the same continuity-of-direction principle the hover rule is built on.
 *
 * Cover is the short duration and the exit curve (the reader has already
 * committed — get out of the way); reveal is the standard duration and the
 * entry curve (arriving somewhere should settle, not snap).
 */
export const TRANSITION = {
  cover: DURATION.short,
  reveal: DURATION.standard,
  /**
   * Hard ceiling on how long the panel may stay closed. If a route stalls or a
   * navigation is dropped, the reader must never be left behind a black panel
   * with no way out — the reveal fires regardless.
   */
  failSafeMs: 2500,
} as const;

/* ── Frame budget and graduated degradation ─────────────────────────────────── */

/**
 * Particle count is derived from RENDERED AREA, not from a breakpoint —
 * breakpoint-keyed counts produce a visible density jump at the boundary.
 *
 *   count = clamp(BASE * (cssArea / REFERENCE_AREA) * tierFactor, MIN, MAX)
 *
 * Calibrated to reproduce the previous counts at each tier's reference device:
 * 1280×720 desktop → 18000, 768×1024 tablet → 12000, 390×844 mobile → ~7970.
 */
export const PARTICLES = {
  /**
   * 34000, up from 18000. The reference runs a fixed 30,000 desktop and this
   * field's grains are individually finer, so parity on perceived density needs
   * more of them, not the same number.
   *
   * Density is the first cause of "dull" and it is not substitutable: a bright
   * core is a stack of overlapping additive sprites, and below a certain count
   * per unit of screen area no size or blending setting can produce one.
   */
  BASE: 34000,
  /** 1280×720 — the smallest viewport that previously received the full count. */
  REFERENCE_AREA: 921_600,
  /**
   * 12000, up from 4000. The floor is what a small window or a handset actually
   * receives, and 4000 is not a sparse field, it is a broken one — the
   * silhouette stops being legible before the density does.
   */
  MIN: 12000,
  MAX: 34000,
  /**
   * THE tier authority, and now the only one (POINT_SIZE[].count is 1 at every
   * tier — see the note there).
   *
   * mobile 1.24 → 0.55 looks like a cut and is a large raise in practice: the
   * old 1.24 was compensating for the 0.45 multiplier that used to stack on top
   * of it, and a handset ended up on ~5k. Against the new BASE and MIN a phone
   * now lands on the 12000 floor.
   */
  tierFactor: { desktop: 1, tablet: 0.78, mobile: 0.55 } as Record<DeviceTier, number>,
} as const;

/**
 * Fragment ceiling per tier, in drawing-buffer pixels. Exceeding it reduces the
 * pixel ratio BEFORE it reduces the particle count — resolution is cheaper to
 * lose than density, and density carries the brand read.
 *
 * Roughly doubled under the amplitude directive, because the old figures were
 * calibrated against a field of ~3px grains and would now trip on an ordinary
 * desktop that has plenty of headroom. The ORDER is what protects the design:
 * an over-budget backing store trims the ratio here, the ladder's rung 1 trims
 * it again, and only rung 2 touches count. Nothing anywhere trims point size —
 * lowering it to buy fill would undo the change these budgets exist to permit.
 */
export const FRAGMENT_BUDGET: Record<DeviceTier, number> = {
  mobile: 4_800_000,
  tablet: 8_000_000,
  desktop: 16_000_000,
};

/** 20 ms/frame is the 50fps floor. */
export const FRAME_BUDGET_MS = 20;

/**
 * A rung is entered only after a sustained window below threshold — never on a
 * single dropped frame, which is GC or a tab switch, not a device that cannot
 * hold the field.
 */
export const DEGRADE_WINDOW_FRAMES = 60;

/** Hysteresis: recovery needs a longer clean window than descent needed a dirty one. */
export const RECOVER_WINDOW_FRAMES = 180;

/** Skips the shader-compile / first-texture-upload spike every scene has. */
export const WARMUP_SECONDS = 1.5;

/* ── Cold-start timing integrity (Cold Start §5, §6, §9) ────────────────────── */

/**
 * Hard per-frame ceiling on how far the time-driven opening assemble may
 * advance — §5.2. Independent of `gsap.ticker.lagSmoothing`, which is the
 * global defence: this is the local one, so a single long frame can never
 * deposit the assemble mid-flight even if the ticker's smoothing is bypassed.
 */
export const INTRO_MAX_FRAME_DELTA = 1 / 30;

/**
 * §6.4 — the compile gate opens no later than this, whatever else is pending.
 * A gate that never opens is a worse failure than a late start.
 */
export const COMPILE_GATE_MAX_MS = 2500;

/**
 * §9.1 — warmup is not evidence. Budget sampling starts only after BOTH of
 * these have elapsed since the ready signal (not since loop start, which is
 * what the previous profile measured and why a cold start could trip the
 * ladder before the first stage had even formed).
 */
export const BUDGET_WARMUP_FRAMES = 90;
export const BUDGET_WARMUP_MS = 1500;

/**
 * §9.2 — a rolling median replaces the old binary consecutive-frame counter.
 * One slow frame is GC; a median over this many frames is the device.
 */
export const BUDGET_MEDIAN_WINDOW = 45;

/** §9.2 — sustained breach required before the ladder steps down one rung. */
export const BUDGET_SUSTAINED_BREACH_FRAMES = 30;

/**
 * §9.4 / §11.H — every ladder transition logs its reason and measured value,
 * but only behind this flag. Nothing in the intro path may log unconditionally.
 */
export function isMotionDebugEnabled(): boolean {
  if (typeof window === "undefined") return false;
  return new URLSearchParams(window.location.search).has("motionDebug");
}

/**
 * §7.1 — ONE source of truth for stage zero.
 *
 * Consumed twice, and the two can never diverge: once at material construction
 * (so no frame can paint a state the choreography never authored) and once by
 * the opening `.set()` that precedes the assemble.
 *
 * The defect this closes: `uProgress` was constructed at `1` — fully morphed to
 * the TO buffer — while the timeline was treated as the sole author of state.
 * Any frame rendered between material construction and the first authored tick
 * therefore painted the terminal pose of whatever buffer pair happened to be
 * loaded. Construction was quietly authoring state first.
 *
 * `bend` is 1 (spherical) because every geo route opens on the globe; `stagger`
 * is 0 here and is raised to 1 by the assemble itself, which is the only thing
 * entitled to turn per-particle arrival delays on.
 */
export const INTRO_STATE_INITIAL: {
  progress: number;
  stagger: number;
  burst: number;
  burstT: number;
  drift: number;
  bend: number;
  eagleBlend: number;
  activeRegion: number;
  regionActive: number;
  opacity: number;
} = {
  /** Morph fraction between the FROM and TO buffers. 0 = nothing has moved. */
  progress: 0,
  /** 0 = uniform lerp. The hero assemble raises this to 1 when it starts. */
  stagger: 0,
  /** Morph swell amplitude and its own linear clock. */
  burst: 0,
  burstT: 0,
  /** Ambient idle dispersal, in world units. */
  drift: 0,
  /** Geo routes: 1 = sphere, 0 = flat map. Every route opens spherical. */
  bend: 1,
  /** 0 = the page's own form, 1 = converged into the shared eagle finale. */
  eagleBlend: 0,
  /** Regional highlight: nothing illuminated until a beat asks for it. */
  activeRegion: 0,
  regionActive: 0,
  /** Nothing paints until the choreography has authored a pose. */
  opacity: 0,
};

/** Steps the pixel ratio is reduced by at rung 1, and restored by on recovery. */
export const DPR_STEP = 0.25;

/** Fraction of the particle pool drawn at each rung-2 step. */
export const COUNT_STEP = 0.75;

/* ── matchMedia contexts ────────────────────────────────────────────────────
 *
 * Exactly four. ONLY SCALARS may differ between them — no context may add,
 * remove or reorder a tween. A context needing structural difference is a change
 * of animation and is out of scope.
 */
export const MEDIA = {
  compact: "(max-width: 767px)",
  tablet: "(min-width: 768px) and (max-width: 1023px)",
  desktop: "(min-width: 1024px)",
  reduced: "(prefers-reduced-motion: reduce)",
} as const;

/** Per-context scalars. Structure is identical in all four — only numbers move. */
export const CONTEXT_SCALARS = {
  compact: { scrub: SCRUB, stagger: STAGGER, parallax: 0.6 },
  tablet: { scrub: SCRUB, stagger: STAGGER, parallax: 0.8 },
  desktop: { scrub: SCRUB, stagger: STAGGER, parallax: 1 },
  /** Reduced motion resolves everything to its end state; nothing travels. */
  reduced: { scrub: 0, stagger: 0, parallax: 0 },
} as const;

/**
 * The site's four motion contexts, registered on one `gsap.matchMedia()`.
 *
 * `build` receives that context's scalars and must produce the SAME structure
 * every time — the same tweens, in the same order, on the same targets. Only
 * numbers may differ between contexts. A context that needs a different set of
 * tweens is a different animation, and that is out of scope here.
 *
 * Returns the matchMedia instance so the caller can revert it on teardown.
 */
export function motionContexts(
  build: (scalars: (typeof CONTEXT_SCALARS)[keyof typeof CONTEXT_SCALARS], key: keyof typeof MEDIA) => void
): gsap.MatchMedia {
  const mm = gsap.matchMedia();
  (Object.keys(MEDIA) as (keyof typeof MEDIA)[]).forEach((key) => {
    mm.add(MEDIA[key], () => build(CONTEXT_SCALARS[key], key));
  });
  return mm;
}
