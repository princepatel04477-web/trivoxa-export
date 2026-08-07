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
} as const;

if (typeof window !== "undefined") {
  CustomEase.create(EASE.entry, "M0,0 C0.5,1 0.89,1 1,1");
  CustomEase.create(EASE.exit, "M0,0 C0.11,0 0.5,0 1,1");
}

/**
 * The same two curves as raw control points, for Framer Motion (which takes a
 * bezier array) and for anything that needs the coefficients directly. One
 * vocabulary across both animation libraries, not two that look alike.
 */
export const BEZIER = {
  entry: [0.5, 1, 0.89, 1] as [number, number, number, number],
  exit: [0.11, 0, 0.5, 0] as [number, number, number, number],
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
 * 0.6 is the directive baseline (permitted range 0.4–0.8; the reference site
 * runs 0.5 on its one pinned block). Pending E-1 confirmation — this is the one
 * line that changes it everywhere.
 */
export const SCRUB = 0.6;

/**
 * Lenis's own smoothing. These are properties of the SCROLL SURFACE, not of any
 * tween — they decide how the wheel maps to scroll position, upstream of every
 * trigger. Unchanged from what shipped; centralised so the scroll link has one
 * place to be tuned.
 */
export const LENIS = { lerp: 0.09, duration: 1.2 } as const;

/**
 * The discrete beat morph's arrival curve.
 *
 * A FOURTH curve, and knowingly so: the elastic overshoot is a property of the
 * morph itself — it is what the field does on arrival, not a transition applied
 * to it — and §1.1 locks the morph. Named here so no ease literal survives at a
 * call site, and flagged for the Chairman rather than silently replaced with one
 * of the three.
 */
export const EASE_MORPH_ARRIVAL = "elastic.out(1, 0.75)";

/* ── Resolution discipline ──────────────────────────────────────────────────
 *
 * The single pixel-ratio authority is `lib/device.ts`, which reads these
 * ceilings. No surface may read `window.devicePixelRatio` directly.
 */

export type DeviceTier = "mobile" | "tablet" | "desktop";

/**
 * DPR ceiling per tier. The strictest of the two ladders the codebase carried
 * before this directive (`device.ts` had 1.5/1.75/2, `particle-scene.ts` had
 * 1.25/1.5/2), so unifying them cannot cost a device frames it was holding.
 *
 * Uncapped DPR is the single largest cost in the mobile profile: a DPR-3 handset
 * renders 9× the fragments of a DPR-1 one for a difference no eye can resolve on
 * a 6" panel.
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
 * Calibrated so the fit reproduces today's framing EXACTLY at the reference
 * viewport (1440×900, 35° vFov, camera z 36, formation at 62% of the limiting
 * frustum half-extent). It is a re-expression of the approved framing in a form
 * that holds at every aspect ratio, not a retuning of it.
 */
export const FRAMING_MARGIN = 1.5382;

/* ── Point size ─────────────────────────────────────────────────────────────
 *
 * gl_PointSize is in DEVICE pixels. These are CSS pixels and are multiplied by
 * the clamped ratio at upload, so apparent grain size is constant across DPR.
 *
 * MAX is mandatory: an uncapped point size on a high-DPR phone produces enormous
 * overdraw for no visual gain.
 */
export const POINT_SIZE_MIN_CSS_PX = 0.5;
export const POINT_SIZE_MAX_CSS_PX = 6;

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
  /** Was 0.4 on navy. Black gives the glow a clean field, so less buys more. */
  intensity: 0.32,
  /** Was 0.7. Raised because far more of the field clears the bar on black. */
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
  dark: { darkness: 0.35, offset: 0.35 },
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
  /** Reach, in NDC half-widths. 0.35 is roughly a third of the shorter edge. */
  radius: 0.35,
  /** Displacement at the centre of the falloff, in NDC. Negative attracts. */
  push: 0.055,
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
   * Radial scale-up at peak. 2.4 → the form swells to ~3.4× and returns.
   *
   * The reference runs 5.0 (a 6× swell). Going the whole way here does not
   * reproduce it, it breaks it: that field is a loose cloud viewed from a
   * distant camera with room to expand into, whereas this one is FIT to the
   * frustum — at 6× virtually every grain leaves the frame and the effect reads
   * as "the field vanished for a second", not as a swell. 2.4 is the point where
   * the burst is unmistakable while enough of the form stays on screen for the
   * eye to follow it out and back.
   *
   * Push it toward 5.0 if you want the full reference blowout — the maths is
   * identical, only the amplitude differs.
   */
  radial: 2.4,
  /** Per-grain scatter along its own direction at peak, in world units. */
  scatter: 3.8,
  /** Point-size thinning at peak, as a fraction. */
  thin: 0.48,
  /** Alpha dip at peak, as a fraction. */
  fade: 0.32,
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
   * Amplitude multiplier for SCRUBBED legs (Group, Presence, Insights, Careers).
   *
   * A timed morph passes through the peak in a fraction of a second, so a large
   * swell is a gesture. A scrubbed one is parked wherever the reader stopped
   * scrolling — and a form held frozen at 3.4× reads as broken, not as motion.
   * Same envelope, scaled back, so the scroll-driven pages get the character
   * without the hazard.
   */
  scrubScale: 0.4,
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
   */
  enabled: true,
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
  BASE: 18000,
  /** 1280×720 — the smallest viewport that previously received the full count. */
  REFERENCE_AREA: 921_600,
  MIN: 4000,
  MAX: 18000,
  tierFactor: { desktop: 1, tablet: 0.78, mobile: 1.24 } as Record<DeviceTier, number>,
} as const;

/**
 * Fragment ceiling per tier, in drawing-buffer pixels. Exceeding it reduces the
 * pixel ratio BEFORE it reduces the particle count — resolution is cheaper to
 * lose than density, and density carries the brand read.
 */
export const FRAGMENT_BUDGET: Record<DeviceTier, number> = {
  mobile: 2_400_000,
  tablet: 4_000_000,
  desktop: 8_300_000,
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
