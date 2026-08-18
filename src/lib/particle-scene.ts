import * as THREE from "three";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { latLonToVec3 } from "./geo-sphere";
import {
  buildGlobeShape,
  buildShapes,
  type Shape,
  type ShapeContext,
  type ShapeKey,
} from "./shapes";
import { TradeArcs } from "./trade-arcs";
import { readToken, tokenColor, type ColorToken } from "./design-tokens";
import { buildEagleStage } from "./shapes/eagle";
import { TRADE_CITIES } from "@/data/trade-cities";
import type { GeoField } from "./shapes/presence";
import { createPerfHud, isPerfHudEnabled } from "./perf-hud";
import { requestGrainStep } from "./grain";
// Suspension for this surface is handled by the existing visibilitychange
// handler plus the GPU idle gate in renderLoop — an IntersectionObserver has
// nothing to say about a position:fixed, full-viewport canvas.
import {
  assertBackingStore,
  deviceClass,
  isAppleWebKit,
  isTouchPrimary,
  observeContainerResize,
  pixelRatio,
} from "./device";
import {
  AMBIENT,
  BLOOM,
  BUDGET_MEDIAN_WINDOW,
  BUDGET_SUSTAINED_BREACH_FRAMES,
  BUDGET_WARMUP_FRAMES,
  BUDGET_WARMUP_MS,
  BURST,
  CAMERA_FOV,
  CHROME_HEIGHT_TOLERANCE_PX,
  COMPILE_GATE_MAX_MS,
  COUNT_STEP,
  CURSOR,
  DEEP_FIELD,
  DPR_STEP,
  DURATION,
  EASE,
  EASE_MORPH_ARRIVAL,
  FIELD_PATH,
  FRAGMENT_BUDGET,
  FRAME_BUDGET_MS,
  FIELD_GAIN,
  FRAMING_MARGIN,
  INTRO,
  MEAN_SIZE_JITTER,
  INTRO_MAX_FRAME_DELTA,
  INTRO_STATE_INITIAL,
  isMotionDebugEnabled,
  PARTICLE_SCALE,
  PARTICLES,
  PERIOD,
  POINT_SIZE,
  POINT_WORLD_SIZE,
  RECOVER_WINDOW_FRAMES,
  SCRUB,
  SIZE_ALPHA_COMPENSATION,
  SIZE_JITTER,
  SIZE_SHIMMER,
  VIGNETTE,
} from "./motion";
import {
  EffectComposer,
  RenderPass,
  EffectPass,
  BloomEffect,
  VignetteEffect,
  ChromaticAberrationEffect,
  type Effect,
} from "postprocessing";

/**
 * Particle count, derived from RENDERED AREA rather than from a breakpoint.
 *
 * A breakpoint-keyed count produces a visible density jump the instant a window
 * drag crosses the boundary; an area-derived one does not, and it tracks the
 * thing that actually costs frames (fill), which a width bucket does not.
 *
 * The tier factors are calibrated to reproduce the previous counts exactly at
 * each tier's reference device — 1280×720 desktop → 18000, 768×1024 tablet →
 * 12000, 390×844 handset → ~7970 against the old 8000 — so this is a change of
 * derivation, not of density.
 */
function deriveCount(cssWidth: number, cssHeight: number, tier: ReturnType<typeof deviceClass>) {
  const area = cssWidth * cssHeight;
  const raw = PARTICLES.BASE * (area / PARTICLES.REFERENCE_AREA) * PARTICLES.tierFactor[tier];
  // §10.3 count multiplier, applied on top of the area/tier derivation above.
  // Clamped BEFORE the multiplier so PARTICLES.MIN stays a floor on the derived
  // density rather than on the tier-reduced result — a handset that lands on
  // MIN should still receive its 0.45× reduction, not be floored back up to it.
  const clamped = THREE.MathUtils.clamp(raw, PARTICLES.MIN, PARTICLES.MAX);
  return Math.round(clamped * POINT_SIZE[tier].count);
}

// Globe motion (Phase 3.2)
const IDLE_OMEGA = (2 * Math.PI) / 26; // rad/s — single-axis idle spin, 26s/rev
const AXIAL_TILT = (23.4 * Math.PI) / 180; // Earth-accurate axial tilt
const PARALLAX_MAX = (4 * Math.PI) / 180; // max ±4° mouse parallax offset

// Overall formation size. FORMATION_SCALE enlarges the hero globe and the flat
// shapes (ship / container / eagle) 1.6×. The ports globe holds at PORTS_SCALE
// (its prior size) so it stays beside the global-presence copy rather than
// overrunning it. Both are applied via points.scale in the render loop.
const FORMATION_SCALE = 1.6;
const PORTS_SCALE = 1.22;

/**
 * THE size of the closing eagle, on every route, at every scroll depth.
 *
 * The mark is the one form that is genuinely shared: the same silhouette
 * sampled from the same asset, arrived at by six different choreographies. It
 * is a logo, and a logo that renders at one size on Home and at half that on
 * the five inner pages is two logos.
 *
 * Held here rather than left to each page's `formationScale`, which is what
 * produced the drift — that value is a COMPOSITION control (how much of the
 * frame this page's lattice or globe is allowed to occupy) and pages are right
 * to differ on it. The mark is not a composition decision, so it is taken out
 * of that value's reach entirely: no page can override it, because no page is
 * consulted.
 */
const EAGLE_SCALE = 0.82;

/** One trade lane on the ports globe: a bulging arc from Surat to a hub plus a
 * light "packet" sprite that travels along it, looping. */
interface ArcAnim {
  line: THREE.Line;
  packet: THREE.Sprite;
  curve: THREE.QuadraticBezierCurve3;
  speed: number;
  off: number;
  /**
   * Ordinal of this lane's DESTINATION port. The origin is index 0 and is
   * always revealed first, so gating on the destination alone is enough to
   * guarantee a lane is only drawn once both its ends exist.
   */
  portIndex: number;
}

/**
 * Screen-space box used to keep port labels off each other, in NDC. The
 * horizontal extent is measured per label from its own sprite; only the
 * vertical band and the side gutter are fixed.
 */
const PORT_LABEL_PAD_Y = 0.036;
const PORT_LABEL_GUTTER = 0.012;

export interface ParticleScene {
  domElement: HTMLCanvasElement;
  ready: Promise<void>;
  dispose(): void;
}

/**
 * One beat of a page's scroll choreography: at `trigger`, morph the field into
 * `shape` (or fade it out if `shape` is omitted) and sweep it to `sweep`.
 *
 * The field forms a shape at a handful of narrative beats and is faded to 0
 * everywhere else — that sparseness is deliberate, so it never competes with
 * content-dense sections.
 */
export interface Beat {
  /** CSS selector the ScrollTrigger hangs off. */
  trigger: string;
  /** Shape to morph into. Omit to hold the current shape (usually with opacity 0). */
  shape?: ShapeKey;
  /**
   * Horizontal placement as a multiple of the computed side offset: 1 parks it
   * at the edge, 0 centres it. Omit to leave the field where it is. Always 0 on
   * mobile, where computeSide() returns 0.
   */
  sweep?: number;
  /** Target field opacity (default 1). */
  opacity?: number;
  /** Fade duration in seconds (default 0.7). */
  fadeDuration?: number;
  /** Show the named-port overlay. Requires ports:true on the scene config. */
  ports?: boolean;
  /** ScrollTrigger start (default "top center"). */
  start?: string;
  /** Applied on scroll-up past the trigger, if the beat needs to undo itself. */
  onLeaveBack?: Pick<Beat, "opacity" | "ports" | "fadeDuration">;
}

/**
 * One transition in a scrubbed stage sequence: the scroll range across which the
 * field morphs INTO stage N. Two selectors are allowed so a single morph can
 * span a pair of sections (e.g. Foundation → Our Story) with the start pinned to
 * the first section's boundary and the end to the second's.
 */
export interface StageBinding {
  /** Section the range starts from. */
  trigger: string;
  /** Section the range ends on. Defaults to `trigger`. */
  endTrigger?: string;
  /** ScrollTrigger start (default "top center"). */
  start?: string;
  /** ScrollTrigger end (default "center center"). */
  end?: string;
}

/**
 * One stage of a GEO sequence. Every geo stage is the same point set at the same
 * lat/lon — only `bend` changes, and the vertex shader derives position from it.
 * So a geo page ships no position buffers at all, and the globe→map unwrap costs
 * a single float per frame no matter how many particles are in flight.
 */
export interface GeoStage {
  name: string;
  /** 1 = sphere, 0 = flat equirectangular map. Interpolated across a scrub. */
  bend: number;
  /** Ambient positional drift amplitude in world units. */
  drift?: number;
  /** Trade-route overlay visible while this stage is settled. */
  routes?: boolean;
  /**
   * Converge into the shared eagle finale. Geo mode derives position analytically
   * and has no stage buffers, so the closing mark arrives as a separate target
   * buffer (aEagle) blended in by uEagleBlend — see the vertex shader.
   */
  eagle?: boolean;
}

/** Region highlight bound to a scroll position — one entry per regional cluster. */
export interface RegionCue {
  trigger: string;
  /** Region id to illuminate (see REGION in shapes/presence.ts); 0 clears. */
  region: number;
  start?: string;
}

/** Shapes the scene built up front, handed to a page's own stage builder. */
export interface ShapeRegistry {
  /** Every shape named in `SceneConfig.shapes` (plus the hero, plus any beat's). */
  get(key: ShapeKey): Shape;
}

export interface SceneConfig {
  /** Shape assembled on load, behind the hero. Omit when using `stages`. */
  hero?: ShapeKey;
  beats?: Beat[];
  /**
   * Scrubbed stage sequence — the alternative to `beats`. The field settles on
   * stage 0 at load and morphs through the rest, each transition scrubbed across
   * the matching entry in `stageBindings` (so there is one binding fewer than
   * there are stages). Position buffers are only rewritten when the reader
   * crosses a stage boundary; within a segment the CPU writes a single float.
   *
   * A builder rather than prebuilt buffers because the pool size and world scale
   * are the scene's to decide (they depend on the device tier detected on mount),
   * and every stage must be built at exactly that count to be morphable.
   */
  buildStages?: (ctx: ShapeContext, registry: ShapeRegistry) => Shape[] | Promise<Shape[]>;
  /**
   * Registry shapes this page needs, built once by the scene and handed to
   * `buildStages` as its second argument.
   *
   * Exists so a page whose stage sequence is drawn from the shared vocabulary
   * (the home globe → vessel → container → globe → mark run) does not have to
   * rebuild the globe a second time inside its own builder. The globe is by far
   * the most expensive shape here — tens of thousands of Fibonacci points
   * tested against the continent rings — and it is also the only one that
   * produces the per-particle layer attribute the shader's depth cueing reads,
   * so it has to be built by the scene regardless.
   */
  shapes?: ShapeKey[];
  stageBindings?: StageBinding[];
  /**
   * When the connection lines draw in and fade out, in timeline units (a value of
   * 2.5 is halfway through the morph from stage 2 to stage 3). Defaults to drawing
   * across the last 38% of the morph INTO the linking stage and fading over the
   * 0.55 after it — right when a form's connections appear with the form.
   *
   * Override when the network is meant to keep completing across more than one
   * stage: an editorial lattice that organises and then densifies wants its
   * strokes still arriving through the second of those, not finished before it.
   */
  linkEnvelope?: { drawFrom: number; drawTo: number; fadeFrom: number; fadeTo: number };
  /**
   * Per-particle shimmer phase. The default is random per particle, which reads
   * as fine grain twinkling. Supply this to make particles that share a cluster
   * share a phase, so the CLUSTERS pulse as units instead — the difference between
   * a shimmering dust field and a network of breathing nodes.
   */
  buildPhase?: (ctx: ShapeContext) => Float32Array;
  /**
   * Geo mode: supply one lat/lon pair per particle and the scene derives every
   * position analytically from `bend`. Mutually exclusive with `buildStages`.
   * `geoStages` uses the same `stageBindings` scrub machinery.
   */
  buildGeoField?: (ctx: ShapeContext) => GeoField | Promise<GeoField>;
  geoStages?: GeoStage[];
  /** Regional clusters illuminated in sequence as they scroll into view. */
  regionCues?: RegionCue[];
  /**
   * Build the trade-route overlay (line geometry with an animated draw, plus
   * travelling packets and hub markers). Geo mode only — the arcs' sphere↔flat
   * blend is driven from the same `bend` that unwraps the particles, so the
   * overlay stays attached to the point cloud through the whole morph.
   */
  routes?: boolean;
  /** Let the reader spin the globe by dragging. Geo mode only. */
  draggable?: boolean;
  /**
   * Idle motion character. "globe" spins on Y with an axial tilt (the home
   * globe); "planar" spins slowly in-plane on Z and breathes, which is the only
   * safe idle for a flat lattice — a Y spin would collapse it edge-on. "geo"
   * spins while spherical and eases to still as it flattens, because a spinning
   * flat map is nonsense.
   */
  motion?: "globe" | "planar" | "geo";
  /** Formation size multiplier (default 1.6, tuned for the home globe). */
  formationScale?: number;
  /** Ceiling on field opacity, so a dense form can sit behind body copy. */
  fieldOpacity?: number;
  /**
   * Per-particle colour, driven by each stage's accent mask.
   *
   * `primary` and `accent` are DESIGN TOKEN NAMES, not colour values — the scene
   * resolves them from the live CSS custom properties at mount (see design-tokens).
   * The animation therefore holds no colour of its own and cannot drift from the
   * site palette. Passing a hex here is not possible by design.
   *
   * `ground` says what the field is composited over, and it decides more than the
   * blend mode. On a DARK ground (the default, and the site's canonical Midnight
   * Navy) particles glow additively and the bloom/aberration pass applies. On a
   * LIGHT ground additive blending is impossible — it can only brighten toward
   * white, so a dark particle would vanish — and bloom would blow the page out, so
   * the field composites normally and the effect stack is trimmed.
   */
  palette?: { primary: ColorToken; accent: ColorToken; ground?: "light" | "dark" };
  /**
   * Slow orbital camera dolly scrubbed across one element's full scroll range
   * (normally the page wrapper).
   */
  cameraOrbit?: { trigger: string; sweepDeg?: number; dolly?: number };
  /**
   * Scroll-linked spatial path amplitude, 0..1 — the field travelling laterally
   * and in depth across the page instead of swapping shapes on the spot. See
   * FIELD_PATH in lib/motion for the waypoints, which are fractions of the
   * visible frame rather than world units.
   *
   * Omit (or 0) to keep the field where the rest of the choreography puts it. A
   * page whose composition depends on the field parking beside a specific copy
   * column wants a small value or none — the path is a journey, and a journey
   * across a two-column layout will cross the column.
   */
  fieldPath?: number;
  /** Element the field path is scrubbed across. Defaults to the whole document. */
  fieldPathTrigger?: string;
  /**
   * Continuous scroll-linked field motion for BEAT pages.
   *
   * A beat page only moves the field at the handful of scroll positions its
   * beats hang off; between them the field has nothing but its own idle spin, so
   * scrolling a whole section produces no visible response from the backdrop.
   * Stage pages never had this problem — `cameraOrbit` scrubs across their entire
   * scroll range — and this is the beat-page equivalent.
   *
   * `spinDeg` is extra Y rotation across the page, applied only while the field
   * is a GLOBE: turning a flat mark (the vessel, the container, the eagle) about
   * Y would swing it edge-on. `driftY` is a small vertical parallax in world
   * units, applied to every formation, which is what keeps the field responding
   * to scroll while a flat shape is up.
   */
  scrollMotion?: { trigger?: string; spinDeg?: number; driftY?: number };
  /** Build the named-port overlay + trade arcs. Home / global-presence only. */
  ports?: boolean;
  /**
   * Cap on field opacity below 576px, where the field centres *behind* the
   * headline copy instead of parking beside it. Defaults to 1 (no cap).
   */
  mobileOpacityCap?: number;
  onDegrade?: () => void;
}

export async function createParticleScene(config: SceneConfig): Promise<ParticleScene> {
  const {
    hero,
    beats = [],
    buildStages,
    shapes: extraShapes,
    stageBindings = [],
    linkEnvelope,
    buildPhase,
    buildGeoField,
    geoStages,
    regionCues = [],
    routes: wantsRoutes = false,
    draggable = false,
    motion = "globe",
    formationScale = FORMATION_SCALE,
    fieldOpacity = 1,
    palette,
    cameraOrbit,
    fieldPath = 0,
    fieldPathTrigger,
    scrollMotion,
    ports: wantsPorts = false,
    mobileOpacityCap = 1,
    onDegrade,
  } = config;
  const twoTone = !!palette;
  const lightGround = palette?.ground === "light";
  const planar = motion === "planar";
  const geoMode = !!buildGeoField;
  const width = window.innerWidth;
  const height = window.innerHeight;

  // LAYOUT class — a pure function of CSS width. Drives where the field sits
  // and how bright it is relative to the copy. A narrow desktop window should
  // behave like a phone here, which is exactly what width tells us.
  const isMobile = width <= 575;

  // RENDER class — a function of the HARDWARE, resolved once per session from
  // the shortest viewport edge plus pointer coarseness. Deliberately separate
  // from the layout class above: a phone held sideways reports width 844 and
  // was previously classed "tablet", which handed a handset the tablet DPR
  // ceiling AND the full desktop post-processing chain (bloom + chromatic
  // aberration + per-frame noise). That is the single most expensive
  // misclassification in the old profile.
  const renderClass = deviceClass();
  const mobileGpu = renderClass === "mobile";
  const appleWebKit = isAppleWebKit();
  const coarsePointer = isTouchPrimary();
  // Declared here rather than beside the teardown block because the on-demand
  // render path (reduced motion) and the settle timers both read it.
  let disposed = false;

  const count = deriveCount(width, height, renderClass);

  /**
   * Load-path instrumentation.
   *
   * Every expensive step between mount and first paint is bracketed, so "the
   * page feels slow to arrive" can be answered with a measurement instead of a
   * guess. `performance.mark`/`measure` cost a few microseconds each and land
   * in the browser's own performance timeline, so a real session can be
   * inspected in DevTools without a debug build; only the console summary is
   * behind ?motionDebug.
   *
   * This exists because the amplitude directive roughly doubled the pool and
   * every synchronous builder on this path scales with it — a regression here
   * reaches the reader as a longer wait behind the preloader, which is the one
   * cost the whole arrival sequence is trying to buy back.
   */
  const phase = <T,>(name: string, run: () => T): T => {
    const start = `tvx:${name}:start`;
    performance.mark(start);
    const out = run();
    const finish = () => {
      try {
        performance.measure(`tvx:${name}`, start);
      } catch {
        /* a cleared timeline is not worth an exception on the load path */
      }
    };
    if (out instanceof Promise) return out.finally(finish) as T;
    finish();
    return out;
  };

  // The canvas's own CSS box. Every sizing decision below reads THESE, not
  // window.innerWidth/innerHeight — the ResizeObserver on the canvas is what
  // keeps them current, including on a container-only layout change that never
  // moves the window.
  let cssWidth = width;
  let cssHeight = height;
  const canvasWidth = () => cssWidth;
  const canvasHeight = () => cssHeight;

  // ── Resolution discipline ────────────────────────────────────────────────
  // The ratio comes from the single authority in lib/device.ts and is scaled by
  // the degradation ladder's current rung. Nothing here reads
  // window.devicePixelRatio, and nothing here carries its own ceiling.
  let dprScale = 1;
  const rendererPixelRatio = () => {
    const ratio = pixelRatio(dprScale);
    // Fragment ceiling. Resolution is cheaper to lose than density — and density
    // carries the brand read — so an over-budget backing store is trimmed HERE,
    // before the ladder is ever allowed to touch the particle count.
    const budget = FRAGMENT_BUDGET[renderClass];
    const w = canvasWidth();
    const h = canvasHeight();
    const fragments = w * ratio * h * ratio;
    if (fragments > budget) return Math.max(1, ratio * Math.sqrt(budget / fragments));
    return ratio;
  };
  // Below 576px computeSide() returns 0, so the field sits centred *behind* the
  // headline copy rather than beside it. Pages that put a beat under a heading
  // pass a cap so the text stays legible.
  const capOpacity = (o: number) => (isMobile ? Math.min(o, mobileOpacityCap) : o);
  const heroOpacity = capOpacity(fieldOpacity);
  const reducedMotion =
    typeof window.matchMedia === "function" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  const scene = new THREE.Scene();
  // The ambient backdrop's own scene. Separate so it can be rendered by its own
  // pass AFTER post-processing — see the composer block below for why it must
  // never share a scene with the bloomed field.
  const ambientScene = new THREE.Scene();
  // The deep field's own scene — like the ambient shell, kept out of the bloom
  // path by construction rather than by tuning. See the composer block.
  const deepScene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(CAMERA_FOV, width / height, 1, 10000);
  camera.position.z = 36;

  const renderer = new THREE.WebGLRenderer({
    alpha: true,
    antialias: false, // round point sprites don't benefit; MSAA costs fill rate
    powerPreference: "high-performance",
  });
  renderer.setPixelRatio(rendererPixelRatio());
  renderer.setSize(width, height, false);
  // Alpha 0 — a fully transparent canvas so the page background token shows
  // through. The RGB is unused and is not a palette value.
  renderer.setClearColor(0x000000, 0);
  const canvas = renderer.domElement;
  // width:100%, NOT 100vw: on a desktop browser with a classic scrollbar, 100vw
  // is the viewport INCLUDING the scrollbar gutter, so a fixed element that wide
  // overhangs by ~15px and shows up on the horizontal-overflow probe.
  //
  // height:100%, not 100dvh, and this is deliberate. dvh is the SMALL viewport
  // while the address bar is showing, so a full-bleed backdrop sized to it
  // letterboxes the moment the bar hides — the opposite of the defect dvh
  // exists to fix. Percentage against the fixed-position containing block is
  // the large viewport, which is what a z-index:-1 backdrop must always fill.
  // The page's LAYOUT containers use svh (see hero.css), which is stricter
  // still: it never changes at all, so a pin can never desynchronise from it.
  // Safe-area insets are handled by the token system in globals.css §3.3; a
  // decorative full-bleed backdrop must not be inset by them or it bands.
  canvas.style.cssText =
    "position:fixed;inset:0;width:100%;height:100%;z-index:-1;pointer-events:none;";

  // Context loss must not be a silent, permanent drop to fallback (P0 WebGL
  // investigation, Phase 2.3). preventDefault() is required by spec for the
  // browser to attempt restoration at all; the render loop keeps running
  // (it isn't gated on this), so Three.js's own GPU-resource recreation on
  // next draw handles the recovery. Both events are logged — this failure
  // class was previously invisible.
  const onContextLost = (e: Event) => {
    e.preventDefault();
    console.error("[particle-scene] WebGL context lost.");
  };
  const onContextRestored = () => {
    console.warn("[particle-scene] WebGL context restored.");
  };
  canvas.addEventListener("webglcontextlost", onContextLost, false);
  canvas.addEventListener("webglcontextrestored", onContextRestored, false);

  // Postprocessing is desktop/tablet-only — mipmap bloom + chromatic aberration
  // are the first things to cost frames on mid-range mobile GPUs. Gated on the
  // hardware class, not on CSS width, so rotating a phone cannot switch the
  // chain on.
  const composer = mobileGpu ? null : new EffectComposer(renderer);
  if (composer) {
    composer.addPass(new RenderPass(scene, camera));
    const effects: Effect[] = [];
    if (lightGround) {
      // Bloom and chromatic aberration both push toward white, which is exactly
      // what a dark-particle-on-light-paper palette must not do, so neither is
      // built. A gentle vignette survives — on paper it reads as the softened
      // edge of an aged print rather than as darkness.
      effects.push(new VignetteEffect(VIGNETTE.light));
    } else {
      // height caps the bloom mip chain's working resolution — visually
      // indistinguishable for a soft glow, roughly halves the effect's GPU cost.
      effects.push(
        new BloomEffect({
          intensity: BLOOM.intensity,
          luminanceThreshold: BLOOM.threshold,
          radius: BLOOM.radius,
          height: BLOOM.height,
        }),
        new VignetteEffect(VIGNETTE.dark)
      );
      if (!appleWebKit) {
        effects.push(
          new ChromaticAberrationEffect({
            offset: new THREE.Vector2(0.0005, 0.0005),
            radialModulation: false,
            modulationOffset: 0.15,
          })
        );
      }
    }
    // The canvas-layer grain. The page-wide brand grain is a DOM layer (see
    // GrainOverlay) because a composer pass can only reach the canvas, not the
    // page above it — this one just keeps the field itself from looking
    // digitally clean. Skipped under prefers-reduced-motion, the one effect here
    // that animates per frame.
    // THE IN-CANVAS GRAIN PASS IS GONE, DELIBERATELY.
    //
    // Grain is now a single document-level field (`.grain-overlay`, globals.css)
    // covering every pixel of every route — canvas, content, navigation, footer.
    // A canvas-local pass underneath that field would make the canvas region
    // carry two grain densities while the rest of the page carries one, and the
    // seam between them at the canvas boundary is exactly the defect this was
    // meant to fix. The canvas region is a strict subset of the document field,
    // so the only intensity that produces no seam is zero.
    //
    // The frame budget the pass used to spend is not reclaimed elsewhere: it
    // pays for the blended document layer. Ladder rungs 3 and 4 (below) now step
    // the document field down instead of this pass.
    composer.addPass(new EffectPass(camera, ...effects));
    // NOTE: the ambient backdrop is deliberately NOT a pass on this composer.
    // It is drawn straight to the canvas after composer.render() — see the
    // render loop. Appending a RenderPass here would take over `renderToScreen`
    // from the EffectPass and put the bloomed frame in an offscreen buffer that
    // never reaches the canvas.
  }

  const textureLoader = new THREE.TextureLoader();
  const texture = textureLoader.load("/images/particle-tiny.png");

  // Nominal shape radius (shared scale system, see S/R below). Built here so the
  // globe geometry and its per-particle layer attribute exist before first paint.
  const vpScale = width > 1024 ? 1 : width > 576 ? 0.82 : 0.66;
  const globeRadius = 7 * vpScale;

  // Every shape this page's choreography actually names — the registry builds
  // only these, so a page showing three shapes doesn't pay to sample thirteen.
  const shapeCtx = { count, R: globeRadius, S: vpScale };
  const shapeKeys = new Set<ShapeKey>();
  if (hero) shapeKeys.add(hero);
  for (const b of beats) if (b.shape) shapeKeys.add(b.shape);
  for (const k of extraShapes ?? []) shapeKeys.add(k);

  // The globe is built here rather than through the registry because it also
  // produces the per-particle layer attribute the shader's Layer-B dimming and
  // depth cueing read. Pages that never show it skip the work entirely — it is
  // the most expensive shape by far (tens of thousands of Fibonacci points
  // tested against the continent rings).
  //
  // Measured separately from the rest of the registry: it is the single most
  // expensive builder on the load path (tens of thousands of Fibonacci points
  // each tested against the continent rings) and it scales linearly with the
  // pool, so it is the first thing to look at when the arrival gets slower.
  const globeBuilt = shapeKeys.has("globe")
    ? phase("globe", () => buildGlobeShape(shapeCtx))
    : null;

  const geometry = new THREE.BufferGeometry();

  // GPU morph (see morphTo): the field interpolates between two stage buffers
  // inside the vertex shader, driven by a single uProgress uniform. `position`
  // is the FROM stage and aTo is the TO stage; the CPU writes one float per
  // frame instead of count*3, and only rewrites the attributes when a new morph
  // begins (rare) rather than every frame.
  const positions = new Float32Array(count * 3); // FROM stage
  const targets = new Float32Array(count * 3); // TO stage
  geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute("aTo", new THREE.BufferAttribute(targets, 3));

  // Per-particle arrival delay, used only by the hero assemble (uStagger=1) so
  // the form coalesces like settling dust instead of snapping in on one
  // synchronized keyframe. Zero-cost for ordinary morphs, which run uStagger=0.
  const delays = new Float32Array(count);
  geometry.setAttribute("aDelay", new THREE.BufferAttribute(delays, 1));

  // The field is always on screen and its bounds are driven by a shader-side
  // mix that Three can't see, so the auto-computed bounding sphere (derived
  // from `position` alone) would be wrong and could cull the whole cloud
  // mid-morph. One draw call, always visible — just skip culling.
  geometry.boundingSphere = new THREE.Sphere(new THREE.Vector3(), Infinity);

  // Per-particle random phase drives the idle shimmer entirely on the GPU —
  // each grain's opacity oscillates on its own phase (no synchronized "flat"
  // twinkle), and it costs zero per-frame CPU: only the uTime uniform ticks.
  // Random per particle by default. A page that wants its CLUSTERS to pulse as
  // units supplies buildPhase instead, giving every particle in a node the same
  // phase — otherwise the mixed phases inside a dense node average out and the
  // node's brightness barely moves, however much each individual grain twinkles.
  const phases = buildPhase ? buildPhase(shapeCtx) : new Float32Array(count);
  if (!buildPhase) for (let i = 0; i < count; i++) phases[i] = Math.random() * Math.PI * 2;
  geometry.setAttribute("aPhase", new THREE.BufferAttribute(phases, 1));

  // Per-particle size variance, 0..1 uniform. Deliberately its OWN attribute
  // rather than derived from aPhase: a page that supplies buildPhase makes the
  // phase a cluster id (so nodes pulse as units), and deriving size from it
  // would then make every grain in a node the same size — which is the exact
  // uniformity this exists to break. Four bytes a grain buys the field its
  // depth read, the size shimmer's amplitude, and the burst's per-grain reach.
  const sizeJitter = new Float32Array(count);
  for (let i = 0; i < count; i++) sizeJitter[i] = Math.random();
  geometry.setAttribute("aSizeJitter", new THREE.BufferAttribute(sizeJitter, 1));

  // Layer flag per particle (0 = landmass, 1 = shell). Fixed for the pool; the
  // shader only acts on it while the field is the globe (uGlobe), so flat shapes
  // are unaffected — which is also why pages without a globe bind zeros rather
  // than building the geometry just to source this.
  const layerData = globeBuilt?.layer ?? new Float32Array(count);
  geometry.setAttribute("aLayer", new THREE.BufferAttribute(layerData, 1));

  const shimmerUniform = { value: 0 };
  // 1 while the field is the globe, 0 for flat formations — gates the globe-only
  // depth cueing and Layer-B dimming. Lerped in the render loop for smoothness.
  const uGlobeUniform = { value: 1 };
  // GPU morph drivers. uProgress is the ONLY thing the CPU touches per frame —
  // GSAP tweens it for a discrete morph, ScrollTrigger scrubs it for a staged
  // sequence. uStagger blends between a uniform lerp (0) and the per-particle
  // delayed arrival used by the hero assemble (1).
  // §7.1 — every value below comes from INTRO_STATE_INITIAL, never from a
  // literal. This was `{ value: 1 }` — the TERMINAL morph state — so any frame
  // that painted before the choreography authored a pose showed the fully
  // morphed TO buffer. Construction was authoring state while the timeline was
  // assumed to be its only author.
  const uProgress = { value: INTRO_STATE_INITIAL.progress };
  const uStagger = { value: INTRO_STATE_INITIAL.stagger };
  // Morph burst amplitude, 0..1. Scales the whole BURST envelope, so a single
  // float turns the swell on for travelling morphs and off for the states where
  // it would be wrong: the hero assemble (grains are arriving from scatter — a
  // burst on top of that is just more scatter), reduced motion, and geo pages
  // (the unwrap is a rigid projection; blowing it apart destroys the read).
  const uBurst = { value: INTRO_STATE_INITIAL.burst };
  // The envelope's OWN clock, 0→1, always linear.
  //
  // It cannot ride uProgress: the discrete beat morph eases position with
  // `elastic.out(1, 0.75)`, which overshoots past 1 and then rings. An envelope
  // driven off that would peak inside the first ~0.25s of a 4s morph (a flash,
  // not a swell) and then re-fire a little burst on every oscillation as the
  // value dips back under the window. Position wants elastic; the swell wants
  // linear. So they get separate drivers.
  //
  // On the scrubbed stage timeline uProgress IS the linear segment fraction, so
  // there the two are simply kept in sync.
  const uBurstT = { value: INTRO_STATE_INITIAL.burstT };
  // One gate for the whole effect. Reduced motion gets no swell at all (it is
  // pure decorative travel); geo pages get none because the unwrap is a rigid
  // projection — a sphere coming apart mid-unwrap stops reading as a map.
  const burstAmp = reducedMotion || geoMode ? 0 : 1;

  // Two-tone accent: the FROM and TO stage's per-particle accent weight. Mixed by
  // the same t as position, so a focal node warms into the accent over the course of
  // the morph that creates it rather than switching colour on arrival. Bound
  // even in single-tone mode (two floats per particle) so the attribute layout
  // doesn't fork between pages.
  const accentA = new Float32Array(count);
  const accentB = new Float32Array(count);
  geometry.setAttribute("aAccentA", new THREE.BufferAttribute(accentA, 1));
  geometry.setAttribute("aAccentB", new THREE.BufferAttribute(accentB, 1));

  // Geo mode: lat/lon per particle plus a region id. Allocated only for geo pages
  // (the flag is known from the config up front, even though the field itself
  // resolves asynchronously) and filled once the builder returns — the attributes
  // must exist before the material compiles.
  const geoData = geoMode ? new Float32Array(count * 2) : null;
  const regionData = geoMode ? new Float32Array(count) : null;
  // Shared eagle finale for geo pages: a second target buffer the analytic
  // position blends toward, since geo mode has no stage buffers of its own.
  const eagleData = geoMode ? new Float32Array(count * 3) : null;
  if (geoData && regionData && eagleData) {
    geometry.setAttribute("aGeo", new THREE.BufferAttribute(geoData, 2));
    geometry.setAttribute("aRegion", new THREE.BufferAttribute(regionData, 1));
    geometry.setAttribute("aEagle", new THREE.BufferAttribute(eagleData, 3));
  }
  /** 1 = sphere, 0 = flat map. THE unwrap driver — the only thing the CPU writes. */
  const uBend = { value: INTRO_STATE_INITIAL.bend };
  /** 0 = the page's own form, 1 = fully converged into the shared eagle mark. */
  const uEagleBlend = { value: INTRO_STATE_INITIAL.eagleBlend };
  /** Sphere radius / plane scale in world units per radian (isometric unwrap). */
  const uGeoR = { value: globeRadius };
  const uActiveRegion = { value: INTRO_STATE_INITIAL.activeRegion };
  /** 0 = no highlight (everything at full), 1 = highlight in force. Eased. */
  const uRegionActive = { value: INTRO_STATE_INITIAL.regionActive };

  // Resolved from the live tokens, never from a literal in this file.
  const uColorPrimary = { value: palette ? tokenColor(palette.primary) : new THREE.Color(1, 1, 1) };
  const uColorAccent = { value: palette ? tokenColor(palette.accent) : new THREE.Color(1, 1, 1) };
  // The spectrum. Four stops the field ramps across per particle, cool to warm,
  // resolved from tokens like everything else here. This is what turns a
  // two-tone field into a light source: a single hue at low opacity reads as a
  // watermark no matter how many particles are in it.
  const uSpectrumA = { value: tokenColor("--particle-a") };
  const uSpectrumB = { value: tokenColor("--particle-b") };
  const uSpectrumC = { value: tokenColor("--particle-c") };
  const uSpectrumD = { value: tokenColor("--particle-d") };
  // Cursor, in normalised device coordinates. Fed from the SMOOTHED pointer the
  // render loop already maintains, so the field trails the cursor rather than
  // snapping to it — a particle that tracks raw pointer coordinates reads as
  // jitter, not as attention.
  const uCursor = { value: new THREE.Vector2(0, 0) };
  const uCursorRadius: { value: number } = { value: CURSOR.radius };
  const uCursorPush: { value: number } = { value: CURSOR.push };
  const uCursorSize: { value: number } = { value: CURSOR.sizeGain };
  const uAspect = { value: 1 };
  /**
   * Opening materialise, 0 → 1. Multiplies final alpha in the fragment shader
   * and lifts point size off INTRO.sizeFloor in the vertex shader, so the field
   * RESOLVES out of nothing rather than cross-fading in at its final size.
   *
   * Separate from the material's own opacity because that is the choreography's
   * channel — beats tween it all page long — and the arrival must not be a
   * value a later beat can overwrite.
   */
  const uIntro = { value: 0 };
  // Ambient idle drift amplitude in world units, eased toward the active stage's
  // own value so a deliberately loose stage disperses without a jump.
  const uDrift = { value: INTRO_STATE_INITIAL.drift };

  // §10.2 — the point-size formula's inputs, all in DEVICE pixels.
  //
  // uDprClamped is the ratio the renderer is ACTUALLY using, read back after
  // setPixelRatio. That read-back is the §10.1 correction: the clamp (both the
  // tier ceiling in device.ts and the fragment-budget trim above it) is applied
  // BEFORE it reaches the size calculation, never after. Sizing in raw pixels
  // and clamping the ratio downstream is what made the grain read as coarse
  // noise on Retina.
  //
  // uRenderHeight normalises against the drawing buffer, so a 4K panel and a
  // 720p laptop resolve the same apparent grain instead of the same pixel count.
  const pointTier = POINT_SIZE[renderClass];
  // PARTICLE_SCALE applies HERE, not on the material's `size`.
  //
  // The vertex shader below replaces `gl_PointSize = size;` outright, so
  // `material.size` — the only place PARTICLE_SCALE used to be consumed for the
  // main field — was discarded before it reached a pixel. That is why cutting
  // the constant to 45% changed nothing on screen: it was only ever reaching the
  // ambient backdrop, which keeps Three's own sizing path.
  //
  // Folding it into the base size is the whole reduction, and it is larger than
  // 45% in practice: at the previous base the formula saturated `uPointMax` on
  // any Retina-class panel, so the grain was pinned at the tier ceiling and the
  // clamp — not the base — was setting the size.
  const uBaseSize = { value: pointTier.base * PARTICLE_SCALE };
  const uDprClamped = { value: 1 };
  const uRenderHeight = { value: 1080 };
  // Normalises the perspective term to 1.0 at the formation plane, so uBaseSize
  // is the grain's size AT the form rather than an arbitrary scalar that has to
  // be retuned whenever the camera moves.
  //
  // Pinned to the SETTLED camera distance, never re-read from camera.position.
  // The camera moves now — the orbital dolly creeps in across a page and the
  // opening intro starts it five times further out — and re-reading it would
  // renormalise the grain to whatever distance the camera happened to be at
  // when the last resize fired, which is a size jump on a window drag. Holding
  // it constant is also what makes the intro's push-in visibly resolve the
  // field instead of holding it at a fixed apparent size the whole way.
  const CAMERA_SETTLED_Z = camera.position.z;
  const uPerspectiveScale = { value: CAMERA_SETTLED_Z };
  const uPointMin = { value: pointTier.minPx };
  const uPointMax = { value: pointTier.maxPx };
  const syncPointSize = () => {
    uDprClamped.value = renderer.getPixelRatio();
    uRenderHeight.value = Math.max(1, renderer.domElement.height);
  };
  syncPointSize();

  const material = new THREE.PointsMaterial({
    // Identity white. Every scene supplies a `palette`, so the fragment shader
    // takes its colour from the resolved tokens (vTint) and ignores `diffuse`.
    color: 0xffffff,
    size: lightGround ? POINT_WORLD_SIZE.light : POINT_WORLD_SIZE.dark,
    // §10.2 owns the whole size computation, including the perspective term.
    // Leaving Three's own attenuation on would multiply it in a second time
    // against `scale = drawingBufferHeight * 0.5` and the tier clamp would then
    // be binding on a number that had already been scaled twice.
    sizeAttenuation: false,
    map: texture,
    // Additive brightens toward white and so cannot draw a dark particle on light
    // paper — a light-ground field composites normally instead. On the dark ground
    // additive is what makes the grains read as points of light.
    blending: lightGround ? THREE.NormalBlending : THREE.AdditiveBlending,
    transparent: true,
    depthWrite: false,
  });
  material.onBeforeCompile = (shader) => {
    shader.uniforms.uTime = shimmerUniform;
    shader.uniforms.uGlobe = uGlobeUniform;
    shader.uniforms.uProgress = uProgress;
    shader.uniforms.uStagger = uStagger;
    shader.uniforms.uBurst = uBurst;
    shader.uniforms.uBurstT = uBurstT;
    shader.uniforms.uDrift = uDrift;
    shader.uniforms.uColorPrimary = uColorPrimary;
    shader.uniforms.uColorAccent = uColorAccent;
    shader.uniforms.uSpectrumA = uSpectrumA;
    shader.uniforms.uSpectrumB = uSpectrumB;
    shader.uniforms.uSpectrumC = uSpectrumC;
    shader.uniforms.uSpectrumD = uSpectrumD;
    shader.uniforms.uCursor = uCursor;
    shader.uniforms.uCursorRadius = uCursorRadius;
    shader.uniforms.uCursorPush = uCursorPush;
    shader.uniforms.uCursorSize = uCursorSize;
    shader.uniforms.uIntro = uIntro;
    shader.uniforms.uAspect = uAspect;
    shader.uniforms.uBaseSize = uBaseSize;
    shader.uniforms.uDprClamped = uDprClamped;
    shader.uniforms.uRenderHeight = uRenderHeight;
    shader.uniforms.uPerspectiveScale = uPerspectiveScale;
    shader.uniforms.uPointMin = uPointMin;
    shader.uniforms.uPointMax = uPointMax;
    if (geoMode) {
      shader.uniforms.uBend = uBend;
      shader.uniforms.uGeoR = uGeoR;
      shader.uniforms.uActiveRegion = uActiveRegion;
      shader.uniforms.uRegionActive = uRegionActive;
      shader.uniforms.uEagleBlend = uEagleBlend;
    }
    shader.vertexShader = shader.vertexShader
      .replace(
        "#include <common>",
        `#include <common>
        attribute float aPhase;
        attribute float aLayer;
        attribute vec3 aTo;
        attribute float aDelay;
        attribute float aAccentA;
        attribute float aAccentB;
        attribute float aSizeJitter;
        uniform float uTime;
        uniform float uGlobe;
        uniform float uProgress;
        uniform float uBurst;
        uniform float uBurstT;

        // Morph burst envelope. Cubed sine over the eased window: flat at both
        // ends (so a resting field is bit-for-bit unaffected), sharp at the
        // midpoint. Mirrored exactly on the CPU in burstEnvelope() — the two
        // must agree or an interrupted morph jumps.
        float tvxBurst(float t) {
          float w = sin(smoothstep(${BURST.from.toFixed(3)}, ${BURST.to.toFixed(3)}, t) * 3.14159265);
          return w * w * w;
        }

        // Fixed per-grain scatter direction from aPhase. Reusing the existing
        // phase attribute keeps this at zero extra bytes per particle, and
        // because it is derived (not random per frame) a grain leaves and
        // returns along the same line.
        vec3 tvxScatterDir(float phase) {
          float a = phase * 1.7;
          float b = phase * 2.3 + 1.1;
          return normalize(vec3(cos(a) * sin(b), sin(a) * sin(b), cos(b)));
        }
        uniform float uStagger;
        uniform float uDrift;
        uniform vec3 uColorPrimary;
        uniform vec3 uColorAccent;
        uniform vec3 uSpectrumA;
        uniform vec3 uSpectrumB;
        uniform vec3 uSpectrumC;
        uniform vec3 uSpectrumD;

        // Four-stop ramp across the field. smoothstep between stops rather than
        // a linear mix, so no band edge is visible where two colours meet — a
        // hard handoff is what makes a gradient field read as three separate
        // clouds instead of one.
        vec3 tvxSpectrum(float t) {
          vec3 c = mix(uSpectrumA, uSpectrumB, smoothstep(0.0, 0.34, t));
          c = mix(c, uSpectrumC, smoothstep(0.33, 0.67, t));
          c = mix(c, uSpectrumD, smoothstep(0.66, 1.0, t));
          return c;
        }
        uniform vec2 uCursor;
        uniform float uCursorRadius;
        uniform float uCursorPush;
        uniform float uCursorSize;
        uniform float uIntro;
        uniform float uAspect;
        uniform float uBaseSize;
        uniform float uDprClamped;
        uniform float uRenderHeight;
        uniform float uPerspectiveScale;
        uniform float uPointMin;
        uniform float uPointMax;
        varying float vAlpha;
        varying vec3 vTint;
${
  geoMode
    ? `        attribute vec2 aGeo;
        attribute float aRegion;
        uniform float uBend;
        uniform float uGeoR;
        uniform float uActiveRegion;
        uniform float uRegionActive;
        attribute vec3 aEagle;
        uniform float uEagleBlend;

        // Sphere → plane unwrap.
        //
        // For bend b, the surface is a sphere of radius R/b tangent to the plane
        // z = 0 at (lat 0, lon 0). At b = 1 that is exactly a sphere of radius R
        // centred on the origin; as b → 0 the radius of curvature diverges and
        // the surface becomes the equirectangular plane x = R·lon, y = R·lat.
        // Every intermediate b is a coherent surface, which is what makes this
        // read as unrolling rather than as the globe being crushed — a straight
        // lerp between a sphere buffer and a plane buffer sends every particle
        // through the sphere's interior.
        //
        // The z term is written via 1 - cos(x) = 2sin²(x/2). Algebraically
        // identical to R/b·(cos(bu)cos(bv) - 1), but that form loses all its
        // significant digits to cancellation as b → 0, where the difference of
        // two near-equal numbers is scaled by a diverging 1/b.
        vec3 unwrap(vec2 latLon, float bend) {
          // b is clamped off zero because the radius of curvature is R/b. The
          // clamp leaves the flat map with a residual bow of R·b·(u²+v²)/2 at the
          // corners — 3.5e-3 world units against a 44-unit-wide map, four orders
          // of magnitude below a pixel. 1e-4 is safe in float32 precisely because
          // the z term below is the cancellation-free form; the naive
          // R/b·(cos·cos - 1) would have lost all its digits by here.
          float b = max(bend, 1e-4);
          float v = latLon.x;             // latitude, radians
          float u = latLon.y;             // longitude, radians
          float Rb = uGeoR / b;
          float su = sin(b * u);
          float cu = cos(b * u);
          float sv = sin(b * v);
          float cv = cos(b * v);
          float shu = sin(b * u * 0.5);
          float shv = sin(b * v * 0.5);
          return vec3(
            Rb * su * cv,
            Rb * sv,
            -Rb * (2.0 * shu * shu + cu * 2.0 * shv * shv) + uGeoR * b
          );
        }`
    : ""
}`
      )
      // THE morph. `position` is the FROM stage, aTo the TO stage. Ordinary
      // morphs run uStagger=0 so t == uProgress and the easing curve stays
      // wholly owned by whatever drives the uniform (GSAP tween or scroll
      // scrub). The hero assemble runs uStagger=1, giving each grain its own
      // 0–400ms-delayed arrival window.
      .replace(
        "#include <begin_vertex>",
        `float staggered = smoothstep(aDelay, aDelay + 0.55, uProgress);
        float t = mix(uProgress, staggered, uStagger);
${
  geoMode
    ? `        // The map converges into the shared eagle finale. Blending the
        // analytic position toward a sampled target keeps geo mode's one-float
        // cost intact through the closing morph too.
        vec3 geoForm = mix(unwrap(aGeo, uBend), aEagle, uEagleBlend);
        // THE GEO ASSEMBLE. Geo mode derives every position analytically and so
        // had no opening at all — the globe simply faded up already built, which
        // is the one route that could never satisfy "begins at the unformed
        // state". \`position\` is otherwise unused here (the analytic path never
        // reads it), so it carries the scatter shell and the same staggered t
        // that the stage-buffer pages assemble on. Once t reaches 1 this is
        // exactly the previous expression, so nothing downstream changes.
        vec3 transformed = mix(position, geoForm, t);
        // Regional illumination. The active cluster lifts and everything else —
        // including the ocean shell, which carries region 0 — drops well back, so
        // even a small region (the Middle East box is ~2% of the land points)
        // reads clearly: the contrast does the work, not the brightness.
        float isActive = 1.0 - step(0.5, abs(aRegion - uActiveRegion));
        float regionDim = mix(1.0, mix(0.30, 1.45, isActive), uRegionActive);`
    : `        vec3 transformed = mix(position, aTo, t);
        float regionDim = 1.0;`
}
        // THE BURST. Rides on top of whatever the morph just produced, driven by
        // the same t, so it costs one envelope evaluation and no extra state.
        // Radial swell away from the form's own centre, plus a per-grain scatter
        // so the swell breaks up instead of reading as a zoom. Zero at both ends
        // of the morph, so a settled field is untouched.
        // Driven by uBurstT, NOT by t — see the uBurstT declaration. Uniform
        // across the field, so the whole form swells as one body rather than
        // each grain swelling on its own staggered clock.
        // Per-particle size variance. THE depth cue on a point cloud: the eye
        // reads size spread as distance spread even where there is no parallax
        // to confirm it, which is why a field of identically-sized grains looks
        // like a screen door however many of them there are.
        //
        // Computed HERE rather than beside gl_PointSize because three separate
        // things consume it — the point size, the alpha payback below, and the
        // burst's per-grain reach — and Three's own point-size assignment comes
        // after both of the others in the generated main().
        float tvxJitter = clamp(
          ${SIZE_JITTER.min.toFixed(3)} + aSizeJitter * ${SIZE_JITTER.span.toFixed(3)},
          ${SIZE_JITTER.min.toFixed(3)}, ${SIZE_JITTER.max.toFixed(3)});

        float burst = tvxBurst(uBurstT) * uBurst;
        // Radial term as a MULTIPLIER on the position vector, not an additive
        // offset: this is what produces a true scale swing (1× → 6× and back)
        // rather than a uniform outward nudge that leaves the silhouette the
        // same size.
        transformed *= 1.0 + burst * ${BURST.radial.toFixed(3)};
        // Scatter scaled by the grain's own size, so BIG GRAINS FLY FURTHER.
        // Without that term every grain travels the same distance and the form
        // stays perfectly legible all the way out — which reads as inflation,
        // not as a detonation. Mirrored exactly on the CPU in setStage().
        transformed += tvxScatterDir(aPhase) * burst * ${BURST.scatter.toFixed(3)} * aSizeJitter;
        // Ambient idle drift. Each grain wanders on its own phase across three
        // incommensurate periods, which reads as a slow curl rather than a
        // shared wobble. Costs one uniform; no extra attribute, no CPU work.
        transformed += uDrift * vec3(
          sin(uTime * 0.31 + aPhase),
          cos(uTime * 0.27 + aPhase * 1.7),
          sin(uTime * 0.19 + aPhase * 0.6)
        );
        // Per-particle spectrum position. aPhase is already a random 0..2PI per
        // particle, so reusing it costs no extra attribute and scatters the hues
        // through the form rather than banding them by height — the form keeps
        // its silhouette and gains colour, instead of turning into a gradient.
        float tvxHue = fract(aPhase * 0.15915494);
        // The accent mask still wins where a stage marks a node focal, so the
        // HQ marker, the origin port and the figure heads stay readable as
        // accents instead of dissolving into the spectrum.
        float tvxAccent = clamp(mix(aAccentA, aAccentB, t), 0.0, 1.0);
        vTint = mix(tvxSpectrum(tvxHue), uColorAccent, tvxAccent);`
      )
      .replace(
        "#include <project_vertex>",
        `#include <project_vertex>
        // Depth cueing (Phase 3.2.5): fade + shrink the far hemisphere so the
        // globe reads as a sphere, not a flat disc of dots. Frontness is the
        // view-space z of this particle's offset from the object centre.
        vec3 vCenter = (modelViewMatrix * vec4(0.0, 0.0, 0.0, 1.0)).xyz;
        vec3 vOff = mvPosition.xyz - vCenter;
        float frontness = length(vOff) > 0.0001 ? normalize(vOff).z : 0.0;
        float f01 = frontness * 0.5 + 0.5;               // 0 (far) .. 1 (near)
        float depthSize = mix(0.6, 1.0, f01);            // far 60% .. near 100% size
        float depthOpac = mix(0.35, 1.0, f01);            // far 35% .. near 100% opacity
        depthSize = mix(1.0, depthSize, uGlobe);          // no cueing on flat shapes
        depthOpac = mix(1.0, depthOpac, uGlobe);
        float layerDim = mix(1.0, 0.4, aLayer * uGlobe);  // Layer B shell dimmer, globe only
        float shimmer = 0.68 + 0.32 * sin(uTime + aPhase);
        // Dip alpha at the burst peak. Without this the swell reads as the form
        // getting BIGGER; with it, it reads as the form coming apart and
        // gathering itself back — which is the actual gesture.
        // Size→alpha payback. A grain at the top of the jitter range covers
        // ~40x the pixels of one at the bottom, so at equal alpha the size
        // spread reads as a brightness spread and the largest grains — the ones
        // meant to be NEAREST — are the ones blowing out the frame. Normalised
        // against the mean multiplier so an average grain is untouched, and
        // floored so a big grain stays visible rather than being conserved into
        // nothing.
        float tvxSizeAlpha = clamp(
          pow(${MEAN_SIZE_JITTER.toFixed(4)} / max(tvxJitter, 0.0001),
              ${SIZE_ALPHA_COMPENSATION.toFixed(2)}),
          0.45, 1.0);
        // uIntro is the opening materialise and is applied LAST, so nothing the
        // choreography does to opacity can bring the field up before the
        // arrival has run.
        //
        // FIELD_GAIN is the headroom that makes a bright core mean "grains
        // overlap here" rather than "this is what a grain looks like" — see the
        // note on the constant.
        vAlpha = shimmer * depthOpac * layerDim * regionDim * uIntro
          * tvxSizeAlpha * ${FIELD_GAIN.toFixed(3)}
          * (1.0 - burst * ${BURST.fade.toFixed(3)});`
      )
      // §10.2 — THE point-size formula. This replaces PointsMaterial's own
      // assignment outright; `sizeAttenuation: false` on the material means
      // Three contributes no perspective term of its own, so everything that
      // scales the grain is visible in this one expression.
      //
      // Ordering is the correction. uDprClamped is already clamped when it
      // arrives (tier ceiling, then fragment-budget trim), so the multiply
      // happens on a bounded ratio instead of a raw one. uRenderHeight/1080
      // makes the result resolution-relative.
      //
      // depthSize (far-hemisphere cue) and the burst thinning still ride on
      // top: they are look modifiers, not scale policy, and both are unchanged.
      .replace(
        "gl_PointSize = size;",
        `float tvxBasePx = uBaseSize * uDprClamped * (uRenderHeight / 1080.0);
        gl_PointSize = tvxBasePx * (uPerspectiveScale / -mvPosition.z)
          * depthSize * tvxJitter * (1.0 - burst * ${BURST.thin.toFixed(3)});
        // Idle shimmer on SIZE, not just on alpha. On an additive field against
        // black an alpha shimmer modulates a value that is already summing with
        // its neighbours and barely registers; changing how much framebuffer a
        // grain reaches does. Weighted by the jitter so the large grains carry
        // the twinkle and the fine dust holds still, and applied as a FRACTION
        // so it is the same shimmer at every depth, tier and pixel ratio.
        gl_PointSize *= 1.0 + (sin(uTime * 5.0 + aPhase * 10.0) * 0.5 + 0.5)
          * ${SIZE_SHIMMER.toFixed(3)} * aSizeJitter;
        // The opening resolve: the field arrives small and grows into itself.
        gl_PointSize *= mix(${INTRO.sizeFloor.toFixed(2)}, 1.0, uIntro);`
      )
      // Clamped to the tier's device-pixel band. uPointMin/uPointMax are raw
      // device pixels now, NOT CSS pixels times the ratio — the ratio is
      // already inside the expression above, and multiplying it in twice is
      // precisely the double-application §10.1 describes.
      .replace(
        "#include <clipping_planes_vertex>",
        `#include <clipping_planes_vertex>
        // Per-particle cursor response, in SCREEN space rather than world
        // space. World-space repulsion would reach further on a particle that
        // happens to sit nearer the camera, so the effect would change size as
        // the form rotates; in screen space the reach is exactly what the
        // reader sees. Aspect-corrected, or the falloff is an ellipse on any
        // window that is not square.
        //
        // Runs BEFORE the clamp so the size gain is bounded by the same tier
        // ceiling as everything else — a cursor that could push a grain past
        // uPointMax would be a fill-rate hole with no upper bound.
        if (uCursorPush != 0.0 && gl_Position.w > 0.0) {
          vec2 ndc = gl_Position.xy / gl_Position.w;
          vec2 away = (ndc - uCursor) * vec2(uAspect, 1.0);
          float dist = length(away);
          // Gaussian falloff — no edge. A linear or smoothstep falloff draws a
          // visible circle in the field where the effect stops.
          float fall = exp(-(dist * dist) / (uCursorRadius * uCursorRadius));
          vec2 dir = dist > 0.0001 ? away / dist : vec2(0.0);
          // The push scales with the burst, so the field is most responsive to
          // the pointer exactly when it is already coming apart.
          gl_Position.xy += dir * (uCursorPush + burst * uCursorPush * 2.0)
            * fall * gl_Position.w;
          // THE part that reads as alive: grains swell toward the pointer, so
          // the additive accumulation brightens under it and the reader appears
          // to be carrying a light across the field. Displacement alone only
          // ever reads as the field getting out of the way.
          gl_PointSize += fall * uCursorSize * uDprClamped * uIntro;
        }
        gl_PointSize = clamp(gl_PointSize, uPointMin, uPointMax);`
      );
    shader.fragmentShader = shader.fragmentShader
      .replace("#include <common>", "#include <common>\nvarying float vAlpha;\nvarying vec3 vTint;")
      .replace(
        "vec4 diffuseColor = vec4( diffuse, opacity );",
        twoTone
          ? // Per-particle hue replaces the material's single diffuse colour.
            "vec4 diffuseColor = vec4( vTint, opacity * vAlpha );"
          : "vec4 diffuseColor = vec4( diffuse, opacity * vAlpha );"
      );
  };

  const points = new THREE.Points(geometry, material);
  // Holder carries the globe's axial tilt + mouse parallax so those never touch
  // the flat formations (which live on `points` and stay upright). The idle spin
  // is on `points.rotation.y`; the tilt on `holder.rotation.z`.
  const holder = new THREE.Group();
  // `spin` sits between them for geo mode, which needs two independent Y
  // rotations: the reader-facing one (idle spin + drag) and a fixed 90°·bend on
  // `points` that aligns the unwrap's own axis convention with the repo's
  // latLonToVec3 (verified: they differ by exactly +90° about Y at bend 1).
  // Keeping them separate is what lets the trade-route overlay — which is built
  // in latLonToVec3 space — hang off `spin` and stay welded to the particles
  // through the entire morph. For globe/planar pages `spin` is identity.
  const spin = new THREE.Group();
  spin.add(points);
  holder.add(spin);
  scene.add(holder);

  // ── Ambient backdrop field ──────────────────────────────────────────────
  // A SECOND, independent point system that never morphs: grains scattered
  // through a large volume behind the main form, turning slowly across the whole
  // page. The reference runs one of these behind its morph cloud and it is most
  // of why that field reads as depth rather than as a flat sprite sheet — the
  // main form has something to be in FRONT of.
  //
  // Deliberately cheap and dumb: fixed positions, no morph attributes, no
  // per-frame CPU. It inherits the live spectrum uniforms, so it recolours with
  // whatever the current stage is wearing and never fights it.
  const ambient = (() => {
    if (reducedMotion || !AMBIENT.enabled) return null;
    const n = Math.round(count * AMBIENT.countRatio);
    if (n < 1) return null;
    const g = new THREE.BufferGeometry();
    const pos = new Float32Array(n * 3);
    const ph = new Float32Array(n);
    // Rejection-sampled into a spherical SHELL, not a cube: a cube puts its
    // corners closest to the camera, so the drift reads as a rotating box.
    for (let i = 0; i < n; i++) {
      const r = AMBIENT.innerR + Math.random() * (AMBIENT.outerR - AMBIENT.innerR);
      const th = Math.random() * Math.PI * 2;
      const cp = 2 * Math.random() - 1;
      const sp = Math.sqrt(1 - cp * cp);
      pos[i * 3] = r * sp * Math.cos(th) * globeRadius;
      pos[i * 3 + 1] = r * sp * Math.sin(th) * globeRadius * AMBIENT.flatten;
      pos[i * 3 + 2] = r * cp * globeRadius;
      ph[i] = Math.random() * Math.PI * 2;
    }
    g.setAttribute("position", new THREE.BufferAttribute(pos, 3));
    g.setAttribute("aPhase", new THREE.BufferAttribute(ph, 1));
    const m = new THREE.PointsMaterial({
      color: 0xffffff,
      size: (lightGround ? POINT_WORLD_SIZE.light : POINT_WORLD_SIZE.dark) * AMBIENT.sizeRatio,
      map: texture,
      blending: lightGround ? THREE.NormalBlending : THREE.AdditiveBlending,
      transparent: true,
      depthWrite: false,
      opacity: 0,
    });
    m.onBeforeCompile = (shader) => {
      shader.uniforms.uTime = shimmerUniform;
      shader.uniforms.uSpectrumA = uSpectrumA;
      shader.uniforms.uSpectrumB = uSpectrumB;
      shader.uniforms.uSpectrumC = uSpectrumC;
      shader.uniforms.uSpectrumD = uSpectrumD;
      shader.vertexShader = shader.vertexShader
        .replace(
          "#include <common>",
          `#include <common>
        attribute float aPhase;
        uniform float uTime;
        uniform vec3 uSpectrumA;
        uniform vec3 uSpectrumB;
        uniform vec3 uSpectrumC;
        uniform vec3 uSpectrumD;
        varying float vAlpha;
        varying vec3 vTint;`
        )
        .replace(
          "#include <project_vertex>",
          `#include <project_vertex>
        float t = fract(aPhase * 0.15915494);
        vec3 c = mix(uSpectrumA, uSpectrumB, smoothstep(0.0, 0.34, t));
        c = mix(c, uSpectrumC, smoothstep(0.33, 0.67, t));
        c = mix(c, uSpectrumD, smoothstep(0.66, 1.0, t));
        vTint = c;
        // Slow independent twinkle. Deeper than the main field's so the backdrop
        // never pulses in time with it, which would read as one object.
        vAlpha = 0.45 + 0.55 * sin(uTime * 0.35 + aPhase * 2.0);`
        );
      shader.fragmentShader = shader.fragmentShader
        .replace(
          "#include <common>",
          "#include <common>\nvarying float vAlpha;\nvarying vec3 vTint;"
        )
        .replace(
          "vec4 diffuseColor = vec4( diffuse, opacity );",
          "vec4 diffuseColor = vec4( vTint, opacity * vAlpha );"
        );
    };
    const p = new THREE.Points(g, m);
    // Its OWN scene, not `scene` and not `holder`: out of `holder` so it does not
    // inherit the form's tilt, parallax or idle spin and stops reading as
    // backdrop; out of `scene` so it is never fed to the bloom pass.
    ambientScene.add(p);
    return { points: p, geometry: g, material: m };
  })();

  // Responsive fit — every formation is sized to occupy a consistent share of
  // what the camera can actually SEE, so the morph reads the same on a 13"
  // laptop as it does on a 27" monitor.
  //
  // This used to be `clamp(min(innerWidth, innerHeight) / 1200, 0.5, 0.82)`,
  // which is wrong: a perspective camera's vertical FOV is fixed, so the
  // visible world height is CONSTANT (~11.35 units here) no matter how large
  // the window is. Dividing by a pixel count therefore shrank the formation on
  // smaller windows for a reason that does not optically exist — the field
  // rendered at ~81% of the visible height on a large desktop but only ~54-65%
  // on a laptop, roughly half the area, which is why the morph looked small and
  // easy to miss on anything but a big screen.
  //
  // Deriving it from the frustum instead makes apparent size independent of
  // window pixels. Width still constrains it on narrow/portrait windows, where
  // the horizontal extent genuinely is the limiting dimension.
  const CAMERA_BASE_Z = CAMERA_SETTLED_Z; // captured before any orbit dolly or intro push
  /**
   * Fit the subject's bounding sphere to the frame, from the aspect ratio.
   *
   *   hFov    = 2 * atan(tan(vFov / 2) * aspect)
   *   fitDist = radius / sin(min(vFov, hFov) / 2)
   *   z       = fitDist * FRAMING_MARGIN
   *
   * Expressed as an object scale at a FIXED camera distance rather than as a
   * camera move, because these are optically the same operation and only this
   * form leaves the orbital dolly (which owns camera.position) alone.
   *
   * Two things changed from the previous fit and both matter at the edges of the
   * viewport matrix. It used the frustum HALF-EXTENT (a tan) where the true
   * bounding-sphere fit is a sin — they agree near square aspect ratios and
   * diverge exactly where the subject was cropping, at 9:19.5. And it clamped
   * the result to [0.3, 0.82], which is what made the subject float small on an
   * ultrawide and overrun the frame on a phone: past the clamp the fit simply
   * stopped being a fit. FRAMING_MARGIN is calibrated so this reproduces the
   * approved framing exactly at 1440×900 — a re-expression, not a retune.
   */
  const fitScale = () => {
    const vFov = THREE.MathUtils.degToRad(camera.fov);
    const aspect = canvasWidth() / Math.max(1, canvasHeight());
    const hFov = 2 * Math.atan(Math.tan(vFov / 2) * aspect);
    const radius = globeRadius * formationScale;
    const fitDist = radius / Math.sin(Math.min(vFov, hFov) / 2);
    return CAMERA_BASE_Z / (fitDist * FRAMING_MARGIN);
  };
  holder.scale.setScalar(fitScale());
  // Start at the formation size so the hero globe doesn't visibly grow in from
  // 1× on load (the render loop only eases toward this target).
  points.scale.setScalar(formationScale);

  /** Visible half-height in world units at the form's settled depth. */
  function visibleHalfHeight(): number {
    return Math.tan(THREE.MathUtils.degToRad(CAMERA_FOV) / 2) * CAMERA_BASE_Z;
  }
  /** Visible half-width in world units at the form's settled depth. */
  function visibleHalfWidth(): number {
    return visibleHalfHeight() * (canvasWidth() / Math.max(1, canvasHeight()));
  }

  // ── Deep field ────────────────────────────────────────────────────────────
  // A bed of grains behind everything, bound to the FRUSTUM rather than to the
  // form. AMBIENT above is a shell that hugs the formation and travels with it,
  // so wherever the form is dim the shell is dim too — which is why the
  // sections that recede the field used to render as a black rectangle. This
  // one is never faded by a beat, never morphs, and extends past the frustum on
  // every axis so its edges are never in shot.
  //
  // Cheap by construction: one draw call, two attributes, no per-frame CPU
  // beyond a rotation. Sits in its own scene so it can be composited after the
  // post chain — a bloomed full-frame field of overlapping additive grains is
  // exactly the white wash the AMBIENT shell caused on its first attempt.
  const deepField = (() => {
    if (reducedMotion || !DEEP_FIELD.enabled) return null;
    const n = DEEP_FIELD.count;
    const g = new THREE.BufferGeometry();
    const pos = new Float32Array(n * 3);
    const ph = new Float32Array(n);
    // Sized off the widest aspect this canvas is likely to take rather than the
    // current one, so a window drag to ultrawide never reveals an edge. The
    // spread multiplier already carries most of that margin.
    const halfH = visibleHalfHeight() * DEEP_FIELD.spread;
    const halfW = Math.max(visibleHalfWidth(), visibleHalfHeight() * 2) * DEEP_FIELD.spread;
    const near = CAMERA_BASE_Z * DEEP_FIELD.depth.near;
    const far = CAMERA_BASE_Z * DEEP_FIELD.depth.far;
    for (let i = 0; i < n; i++) {
      pos[i * 3] = (Math.random() * 2 - 1) * halfW;
      pos[i * 3 + 1] = (Math.random() * 2 - 1) * halfH;
      pos[i * 3 + 2] = far + Math.random() * (near - far);
      ph[i] = Math.random() * Math.PI * 2;
    }
    g.setAttribute("position", new THREE.BufferAttribute(pos, 3));
    g.setAttribute("aPhase", new THREE.BufferAttribute(ph, 1));
    // Colours round-robin across the five particle tokens plus the gold, so the
    // bed carries the same palette as the field without ever being resolved
    // from a literal here.
    const bedColours = [
      tokenColor("--gold-particle"),
      tokenColor("--particle-a"),
      tokenColor("--particle-b"),
      tokenColor("--particle-c"),
      tokenColor("--particle-d"),
    ];
    const uBed = { value: bedColours };
    const m = new THREE.PointsMaterial({
      color: 0xffffff,
      size: (lightGround ? POINT_WORLD_SIZE.light : POINT_WORLD_SIZE.dark) * DEEP_FIELD.sizeRatio,
      map: texture,
      blending: lightGround ? THREE.NormalBlending : THREE.AdditiveBlending,
      transparent: true,
      depthWrite: false,
      opacity: 0,
    });
    m.onBeforeCompile = (shader) => {
      shader.uniforms.uTime = shimmerUniform;
      shader.uniforms.uBed = uBed;
      shader.uniforms.uIntro = uIntro;
      shader.vertexShader = shader.vertexShader
        .replace(
          "#include <common>",
          `#include <common>
        attribute float aPhase;
        uniform float uTime;
        uniform vec3 uBed[5];
        uniform float uIntro;
        varying float vAlpha;
        varying vec3 vTint;`
        )
        .replace(
          "#include <project_vertex>",
          `#include <project_vertex>
        // Round-robin, derived from the phase so it costs no extra attribute.
        int tvxBedIdx = int(mod(floor(aPhase * 12.7), 5.0));
        vTint = uBed[tvxBedIdx];
        // Slower and deeper than either of the other two fields, so the three
        // layers never pulse together and read as one object.
        vAlpha = (0.35 + 0.65 * sin(uTime * 0.22 + aPhase * 3.0)) * uIntro;`
        );
      shader.fragmentShader = shader.fragmentShader
        .replace(
          "#include <common>",
          "#include <common>\nvarying float vAlpha;\nvarying vec3 vTint;"
        )
        .replace(
          "vec4 diffuseColor = vec4( diffuse, opacity );",
          "vec4 diffuseColor = vec4( vTint, opacity * vAlpha );"
        );
    };
    const p = new THREE.Points(g, m);
    p.frustumCulled = false;
    deepScene.add(p);
    return { points: p, geometry: g, material: m };
  })();

  // Horizontal offset for the globe / formations. Placed at a consistent
  // fraction of the visible half-width (so the composition reads the same on
  // every aspect ratio) AND clamped so the globe is always fully on-screen —
  // never cut off on a narrow laptop, never stranded in dead space on an
  // ultrawide. Recomputed on resize so opening the site at any window size (or
  // resizing it) lands the field in the right place instead of a stale offset.
  const computeSide = (): number => {
    const w = canvasWidth();
    if (w <= 575) return 0; // mobile: centred, no side offset
    // Visible half-width in world units at the globe's depth. Reads the shared
    // lens constant and the SETTLED distance — a hardcoded 35 here was a second
    // copy of the FOV that would silently disagree with the camera, and
    // camera.position.z is now a moving value (orbit dolly, intro push).
    const halfW = visibleHalfWidth();
    // Globe's on-screen radius (incl. the outer shell) at the LARGEST formation
    // size, so we can guarantee it stays inside the frustum with margin. Uses the
    // configured formation scale because that's the biggest the field ever gets —
    // the ports globe (PORTS_SCALE) is smaller, so it clears comfortably too.
    const onscreenR = globeRadius * fitScale() * formationScale * 1.08;
    const frac = w <= 1024 ? 0.34 : 0.42; // how far right of centre it sits
    const maxRight = Math.max(0, halfW - onscreenR * 1.12); // fully-visible cap
    return Math.min(halfW * frac, maxRight);
  };
  let side = computeSide();
  // Beat pages park the field beside their headline copy and sweep it around.
  // Stage and geo pages are composed on the centre: the camera orbits a stage
  // form (off-centre, it would swing rather than turn), and a world map has to be
  // centred to be a world map.
  //
  // A page that has BOTH — home, whose shape sequence is now scrubbed through
  // stage buffers while its beats keep parking the field beside each section's
  // copy column — is composed on its sweeps, not on the centre.
  const centred = (!!buildStages && beats.length === 0) || geoMode;
  scene.position.x = centred ? 0 : side;

  const posAttr = geometry.attributes.position as THREE.BufferAttribute;
  const toAttr = geometry.attributes.aTo as THREE.BufferAttribute;
  const delayAttr = geometry.attributes.aDelay as THREE.BufferAttribute;
  const accentAAttr = geometry.attributes.aAccentA as THREE.BufferAttribute;
  const accentBAttr = geometry.attributes.aAccentB as THREE.BufferAttribute;

  /**
   * Freeze the field's CURRENT on-screen positions into the FROM buffer and
   * point the TO buffer at `target`, so a morph that interrupts one already in
   * flight starts from where the grains actually are rather than snapping back
   * to the last stage.
   *
   * This is the only place the position buffers are rewritten — once per morph,
   * not once per frame. Everything between morphs is a single uniform write.
   */
  function setStage(target: Float32Array, stagger = false) {
    const t = uProgress.value;
    const wasStaggered = uStagger.value > 0.5;
    // The burst is part of what is ON SCREEN, so freezing the blend alone would
    // snap away the swell at the moment of the swap. Mirrored here with the same
    // envelope and the same per-grain direction as tvxBurst/tvxScatterDir.
    // Uniform across the field (uBurstT is a uniform, not a per-grain value), so
    // it is evaluated once rather than per particle.
    const frozenBurst = burstEnvelope(uBurstT.value) * uBurst.value;
    const frozenSwell = 1 + frozenBurst * BURST.radial;
    // Per-grain, because the scatter term is scaled by aSizeJitter in the
    // shader. Multiplied inside the loop rather than hoisted, or an interrupted
    // burst would freeze every grain at the average reach and the field would
    // visibly re-sort itself at the moment of the swap.
    const frozenScatterBase = frozenBurst * BURST.scatter;
    for (let i = 0; i < count; i++) {
      // Mirror the vertex shader's blend exactly, or an interrupted morph
      // would visibly jump.
      const local = wasStaggered ? smoothstep(delays[i], delays[i] + 0.55, t) : t;
      const idx = i * 3;
      positions[idx] += (targets[idx] - positions[idx]) * local;
      positions[idx + 1] += (targets[idx + 1] - positions[idx + 1]) * local;
      positions[idx + 2] += (targets[idx + 2] - positions[idx + 2]) * local;
      if (frozenBurst > 0) {
        const phase = phases[i];
        const a = phase * 1.7;
        const b = phase * 2.3 + 1.1;
        const sb = Math.sin(b);
        const frozenScatter = frozenScatterBase * sizeJitter[i];
        // normalize(vec3(cos(a)*sin(b), sin(a)*sin(b), cos(b))) — already unit
        // length by construction, so no divide is needed here either.
        positions[idx] = positions[idx] * frozenSwell + Math.cos(a) * sb * frozenScatter;
        positions[idx + 1] = positions[idx + 1] * frozenSwell + Math.sin(a) * sb * frozenScatter;
        positions[idx + 2] = positions[idx + 2] * frozenSwell + Math.cos(b) * frozenScatter;
      }
    }
    targets.set(target);
    posAttr.needsUpdate = true;
    toAttr.needsUpdate = true;
    uStagger.value = stagger ? 1 : 0;
    uProgress.value = 0;
  }

  /** Drop the field onto `stage` with no travel — used under reduced motion. */
  function snapTo(stage: Float32Array, stageAccent?: Float32Array) {
    positions.set(stage);
    targets.set(stage);
    posAttr.needsUpdate = true;
    toAttr.needsUpdate = true;
    if (stageAccent) {
      accentA.set(stageAccent);
      accentB.set(stageAccent);
      accentAAttr.needsUpdate = true;
      accentBAttr.needsUpdate = true;
    }
    uStagger.value = 0;
    uProgress.value = 1;
  }

  const morphProgress = uProgress; // GSAP tweens the uniform directly

  let animId = 0;
  let paused = false;
  let currentFlat = false; // hero starts on the spinning globe
  let currentIsGlobe = true; // drives axial tilt, parallax and depth cueing
  /**
   * How far the field has become the shared eagle, 0..1, interpolated across
   * the closing morph exactly like `drift`.
   *
   * Drives the mark's size (EAGLE_SCALE) so the logo is identical on every
   * route regardless of what that page's own formationScale is, and eases in
   * rather than switching, so the mark grows or shrinks into its fixed size as
   * it forms instead of snapping at the stage boundary.
   */
  let eagleMix = 0;
  // Name of the shape the field is currently on (or travelling toward). Makes
  // morphTo idempotent, so re-applying the state already on screen — which
  // happens constantly now that beats restore each other on scroll-up — never
  // restarts the 4s elastic mid-flight.
  let currentShapeName: string | null = null;
  // Ambient drift target, eased toward in the render loop (see uDrift).
  let driftTarget = 0;
  // Per-stage Y rotation (Shape.spinY), accumulated so easing the rate to zero
  // parks the form where it got to instead of unwinding it back to square.
  let spinYTarget = 0;
  let spinYAccum = 0;
  // Connection-line draw-in. `uDraw` advances 0→1 to sweep the strokes out from
  // their origin nodes; `uLinkAlpha` fades the whole set with the stage that owns
  // them. Both are set from the stage timeline, not per frame.
  const uDraw = { value: 0 };
  const uLinkAlpha = { value: 0 };
  let linkTargetAlpha = 0;
  // Orbital camera dolly progress, 0..1 across the page (scrubbed).
  const orbit = { value: 0 };
  // Opening camera push, as a MULTIPLIER on the settled distance. 1 = settled.
  const introCam = { value: reducedMotion ? 1 : INTRO.cameraStart };
  // Scroll-linked spatial path progress, 0..1 across the page (scrubbed).
  const pathProgress = { value: 0 };
  const CAMERA_Z = camera.position.z;
  const orbitSweep = (cameraOrbit?.sweepDeg ?? 26) * (Math.PI / 180);
  const orbitDolly = cameraOrbit?.dolly ?? 5;
  // A planar lattice takes its parallax on the camera (±2°), not on the holder —
  // rotating a flat form toward the cursor would shear it.
  const CAMERA_PARALLAX = 2 * (Math.PI / 180);

  // Continuous scroll-linked field motion for beat pages (see SceneConfig).
  // `scrollProgress` is 0..1 down the page, scrubbed; the render loop turns it
  // into extra globe rotation and a vertical parallax.
  const scrollProgress = { value: 0 };
  const scrollSpin = (scrollMotion?.spinDeg ?? 90) * (Math.PI / 180);
  const scrollDriftY = scrollMotion?.driftY ?? 1;
  // Rotation already handed to the globe, so a leg spent on a flat shape (which
  // takes no scroll rotation) absorbs its share instead of banking it up and
  // dumping the whole lot the moment the globe comes back.
  let appliedScrollSpin = 0;

  // ── Geo mode motion ───────────────────────────────────────────────────────
  // The flat map is ~2π·R wide, over six times the sphere's diameter, so the form
  // scales down as it flattens. A uniform scale keeps the projection exact — the
  // map is still a true equirectangular unwrap, just framed to fit.
  const GEO_FLAT_SCALE = 0.72;
  // Reader drag on the globe. `dragVel` carries inertia so releasing a spin lets
  // it coast down rather than stopping dead.
  let dragging = false;
  let dragVel = 0;
  let dragLastX = 0;
  let dragOffset = 0;
  let idleSpin = 0;
  /** Trade-route overlay (line geometry + packets + hub markers). Geo mode only. */
  let tradeArcs: TradeArcs | null = null;
  /** Region the reader has scrolled to; handed to uActiveRegion through a dip. */
  let pendingRegion = 0;
  const DRAG_SENSITIVITY = 0.0055; // radians per pixel
  // Named-port overlay for the Global Presence globe. Declared before the render
  // loop (which references them) but populated later once R/globeRadius exist.
  let portGroup: THREE.Group | null = null;
  let portsMode = false; // true only while the ports globe is the active field
  const portSprites: THREE.Sprite[] = [];
  /**
   * How many ports have been revealed — a FLOAT, scrubbed from the reader's
   * position through the section that shows them, not a boolean.
   *
   * `ports: true` on a beat used to switch on every marker, every label and
   * every lane in one frame. One flag for fourteen cities meant the network
   * could only ever arrive as a wall, and because the beat's own trigger was
   * satisfied early it arrived before the reader had asked for anything. A
   * port is drawn only once this passes its ordinal (index 0 is Surat, the
   * origin, so the network always grows outward from its source), which is the
   * CPU-side equivalent of the `step(aPortIndex, uPortsRevealed)` the directive
   * calls for — there are at most fourteen sprites, so a per-sprite compare
   * costs less than the attribute it would replace.
   */
  let portsRevealed = 0;
  const arcs: ArcAnim[] = []; // Surat → hub trade lanes on the ports globe
  const _wp = new THREE.Vector3();
  const _cp = new THREE.Vector3();
  const _edge = new THREE.Vector3();
  const _right = new THREE.Vector3();
  /** Screen-space label boxes claimed this frame — see the ports render block. */
  const _portBoxes: { x0: number; x1: number; y: number }[] = [];
  // Pointer parallax — the globe subtly leans toward the cursor.
  const pointer = { x: 0, y: 0 };
  const pointerTarget = { x: 0, y: 0 };
  // The FIELD's own copy of the pointer, lerped harder than the formation lean.
  // See the render loop for why the two cannot share one coefficient.
  const cursorSmooth = { x: 0, y: 0 };
  function handlePointer(e: PointerEvent) {
    pointerTarget.x = (e.clientX / window.innerWidth) * 2 - 1;
    pointerTarget.y = (e.clientY / window.innerHeight) * 2 - 1;
    if (dragging) {
      const dx = e.clientX - dragLastX;
      dragLastX = e.clientX;
      dragOffset += dx * DRAG_SENSITIVITY;
      dragVel = dx * DRAG_SENSITIVITY;
    }
  }
  window.addEventListener("pointermove", handlePointer);

  // Drag-to-spin. The canvas is pointer-events:none (it must never intercept a
  // click), so the listener is on the window and gated instead: only while the
  // form is substantially spherical, and never when the press began on something
  // interactive — otherwise dragging to select text or swipe a control would
  // also throw the globe.
  function handleDragStart(e: PointerEvent) {
    if (!draggable || reducedMotion || uBend.value < 0.6) return;
    // Mouse and pen only. A touch drag competes directly with scrolling — a
    // diagonal swipe would throw the globe on the way down the page — and the
    // globe is small enough on a phone that dragging it isn't the point.
    if (e.pointerType === "touch") return;
    if (e.pointerType === "mouse" && e.button !== 0) return;
    const el = e.target as HTMLElement | null;
    if (el?.closest("a, button, input, textarea, select, [role='button'], [contenteditable]")) return;
    dragging = true;
    dragLastX = e.clientX;
    dragVel = 0;
  }
  function handleDragEnd() {
    dragging = false;
  }
  if (draggable) {
    window.addEventListener("pointerdown", handleDragStart);
    window.addEventListener("pointerup", handleDragEnd);
    window.addEventListener("pointercancel", handleDragEnd);
  }

  const clock = new THREE.Clock();

  // ── Graduated degradation ─────────────────────────────────────────────────
  //
  // Nothing is ever binary-killed. The ladder descends one rung at a time and
  // every rung is reversible when headroom returns:
  //
  //   1  reduce pixel ratio one step
  //   2  reduce particle count one step
  //   3  reduce grain intensity one step
  //   4  disable the grain pass
  //   5  settle to a static composed frame (hands off to onDegrade)
  //
  // No rung may be skipped and none may be entered on a single dropped frame —
  // a rung needs a SUSTAINED window below threshold, because one slow frame is
  // GC or a tab switch, not a device that cannot hold the field. Ascending
  // needs a longer clean window than descending needed a dirty one, so a device
  // sitting on the boundary settles instead of oscillating.
  const LADDER_TOP = 5;
  let rung = 0;
  let underBudgetFrames = 0;
  let degraded = false;
  /** Particles actually drawn. Rung 2 trims the draw range; the pool is untouched. */
  let drawCount = count;

  // §9.1 — warmup is not evidence.
  //
  // The old monitor started counting from the first loop frame and excluded a
  // flat 1.5s. Those are the slowest frames the application will ever produce —
  // shader link, first texture upload, first buffer upload — and sampling them
  // is how a cold start could trip the ladder before the opening form had even
  // assembled. Sampling now begins only after the READY signal (the compile
  // gate below), and then only once both a frame count and a wall-clock window
  // have passed.
  let sampling = false;
  let warmupFrames = 0;
  let warmupElapsedMs = 0;

  // §9.2 — a rolling median over BUDGET_MEDIAN_WINDOW frames replaces the old
  // binary "is this frame over budget" test. A median cannot be moved by the
  // occasional GC pause that a consecutive-frame counter treated as evidence.
  const frameSamples: number[] = [];
  let sampleCursor = 0;
  let breachFrames = 0;

  const rollingMedianMs = () => {
    if (frameSamples.length < BUDGET_MEDIAN_WINDOW) return 0;
    const sorted = frameSamples.slice().sort((a, b) => a - b);
    return sorted[Math.floor(sorted.length / 2)];
  };

  // §9.4 — a trip must be provable, not inferred. Silent in every normal
  // session; ?motionDebug surfaces the reason and the measured value.
  const debugMotion = isMotionDebugEnabled();
  // Descent telemetry. The amplitude directive roughly triples fill-rate
  // demand, so the question that decides whether the new budgets are right is
  // not "does this machine degrade" but "how often does a NORMAL desktop
  // degrade" — if that is more than a few percent of sessions, the budget is
  // wrong and the answer is a lower DPR ceiling, not a smaller grain.
  //
  // Counted always (it is two integers), reported only under ?motionDebug, and
  // stored on the window so a session can be inspected after the fact rather
  // than only while the console is open.
  let descents = 0;
  let firstDescentMs = 0;
  const sessionStart = performance.now();
  /** Console summary of the `phase()` marks above. ?motionDebug only. */
  const reportPhases = () => {
    if (!debugMotion) return;
    const rows = performance
      .getEntriesByType("measure")
      .filter((m) => m.name.startsWith("tvx:"))
      .map((m) => `  ${m.name.slice(4).padEnd(14)} ${m.duration.toFixed(0).padStart(6)}ms`);
    console.info(
      `[particle-scene] load path (count=${count}, tier=${renderClass})\n${rows.join("\n")}`
    );
  };

  const logLadder = (direction: "down" | "up", reason: string, measured: number) => {
    if (direction === "down") {
      descents++;
      if (!firstDescentMs) firstDescentMs = performance.now() - sessionStart;
      (window as unknown as { __tvxLadder?: unknown }).__tvxLadder = {
        tier: renderClass,
        rung,
        descents,
        firstDescentMs: Math.round(firstDescentMs),
        count,
        dpr: renderer.getPixelRatio(),
      };
    }
    if (!debugMotion) return;
    console.info(
      `[particle-scene] ladder ${direction} → rung ${rung} | ${reason} | ` +
        `median=${measured.toFixed(1)}ms budget=${FRAME_BUDGET_MS}ms tier=${renderClass} | ` +
        `descents=${descents} first=${Math.round(firstDescentMs)}ms`
    );
  };

  const applyRung = () => {
    // 1 — pixel ratio.
    dprScale = rung >= 1 ? Math.max(0.5, 1 - DPR_STEP) : 1;
    renderer.setPixelRatio(rendererPixelRatio());
    composer?.setSize(canvasWidth(), canvasHeight());
    syncPointSize();
    // 2 — particle count. Trimming the draw range keeps every buffer, every
    // attribute and the morph's own state intact, so stepping back up is free
    // and never reseeds the field.
    drawCount = rung >= 2 ? Math.round(count * COUNT_STEP) : count;
    geometry.setDrawRange(0, drawCount);
    // 3 / 4 — the DOCUMENT grain field, which is now the site's only grain.
    // Rung 3 stops its 25Hz reseed and holds a static texture; rung 4 thins it.
    // It is never switched off: a page without grain does not match its
    // siblings, and a missing texture reads as a rendering fault rather than as
    // a performance decision. Both steps are reversible, and neither can lift a
    // device above its own tier floor (see lib/grain.ts).
    requestGrainStep(rung >= 4 ? 2 : rung >= 3 ? 1 : 0);
    // 5 — the caller's static composed frame.
    if (rung >= LADDER_TOP && onDegrade && !degraded) {
      degraded = true;
      onDegrade();
    }
  };

  // GPU idle gate (see the end of renderLoop). BLANK_ALPHA is below the
  // threshold at which a single point sprite contributes a distinguishable
  // value to an 8-bit framebuffer, so crossing it cannot pop.
  const BLANK_ALPHA = 0.004;
  const BLANK_COMMIT_FRAMES = 2;
  let blankFrames = 0;

  // Opt-in only (?perf=1) — the 60fps budget can only be confirmed on real
  // hardware, so this is the readout for doing that. Null in normal sessions.
  const perfHud = isPerfHudEnabled()
    ? createPerfHud({
        particles: count,
        dpr: renderer.getPixelRatio(),
        tier: renderClass,
      })
    : null;

  function renderLoop() {
    // Delta-time normalization: every idle motion below is scaled by real
    // elapsed seconds, so speed is identical at 30, 60, or 144fps. Clamp the
    // step so a background tab returning doesn't jump the animation — but
    // keep the raw value too, for the frame-budget monitor below, which needs
    // to see genuinely slow frames rather than a clamped-away view of them.
    const rawDelta = clock.getDelta();
    perfHud?.sample(rawDelta);
    // §5.2 — hard per-frame ceiling, independent of the global ticker. Lag
    // smoothing (restored in LenisProvider) is the first line of defence; this
    // is the second, so even a frame that arrives with seconds of accumulated
    // time on it can only advance the field by one frame's worth.
    const delta = Math.min(rawDelta, INTRO_MAX_FRAME_DELTA);
    const dt60 = delta * 60; // frames-equivalent, for the old per-frame rates

    // Backdrop turns on its own slow axis, independent of the form's spin — two
    // different rates at two different depths is what sells the parallax.
    if (ambient) ambient.points.rotation.y += AMBIENT.spinY * delta;
    // Third layer, slower again — three rates at three depths.
    if (deepField) deepField.points.rotation.z += DEEP_FIELD.spinY * delta;

    if (onDegrade && !degraded && sampling) {
      // §9.1 — warmup window, measured from the ready signal rather than from
      // the first frame. Both gates must clear: a device that renders 90 fast
      // frames in under 1500ms is still inside its own upload spike.
      if (warmupFrames < BUDGET_WARMUP_FRAMES || warmupElapsedMs < BUDGET_WARMUP_MS) {
        warmupFrames++;
        warmupElapsedMs += rawDelta * 1000;
      } else {
        // Ring buffer — fixed allocation, no per-frame array growth.
        frameSamples[sampleCursor] = rawDelta * 1000;
        sampleCursor = (sampleCursor + 1) % BUDGET_MEDIAN_WINDOW;

        const median = rollingMedianMs();
        if (median > 0) {
          if (median > FRAME_BUDGET_MS) {
            breachFrames++;
            underBudgetFrames = 0;
            // §9.2 — sustained breach, not a single sample over threshold.
            // §9.3 — one rung at a time; the ladder can never jump to static.
            if (breachFrames >= BUDGET_SUSTAINED_BREACH_FRAMES && rung < LADDER_TOP) {
              breachFrames = 0;
              rung++;
              logLadder("down", `sustained breach ≥${BUDGET_SUSTAINED_BREACH_FRAMES} frames`, median);
              applyRung();
            }
          } else {
            underBudgetFrames++;
            breachFrames = 0;
            if (underBudgetFrames >= RECOVER_WINDOW_FRAMES && rung > 0) {
              underBudgetFrames = 0;
              rung--;
              logLadder("up", `clean window ≥${RECOVER_WINDOW_FRAMES} frames`, median);
              applyRung();
            }
          }
        }
      }
    }
    // prefers-reduced-motion: freeze the per-particle twinkle too, not just spin.
    if (!reducedMotion) shimmerUniform.value += delta * 2.2; // GPU per-particle shimmer clock

    const kSettle = 1 - Math.pow(0.9, dt60);
    const kParallax = 1 - Math.pow(0.95, dt60); // ~0.05 per 60fps frame
    pointer.x += (pointerTarget.x - pointer.x) * kParallax;
    pointer.y += (pointerTarget.y - pointer.y) * kParallax;
    // The FIELD's cursor is tracked on its own, faster coefficient (0.12 per
    // 60fps frame) than the formation's parallax lean (0.05). They are two
    // different gestures: the lean is the whole body noticing you and should be
    // slow, the displacement is grains reacting under the pointer and has to
    // keep up or it reads as lag rather than as weight. Still lerped, never
    // snapped — a hard-tracked field looks nervous.
    const kCursor = 1 - Math.pow(1 - CURSOR.lerp, dt60);
    cursorSmooth.x += (pointerTarget.x - cursorSmooth.x) * kCursor;
    cursorSmooth.y += (pointerTarget.y - cursorSmooth.y) * kCursor;
    // NDC has +Y up; the pointer is tracked in CSS coordinates, where +Y is
    // down. Without the flip the field pushes away from the reflection of the
    // cursor across the horizon, which reads as the effect being broken rather
    // than inverted.
    uCursor.value.set(cursorSmooth.x, -cursorSmooth.y);
    uAspect.value = canvasWidth() / Math.max(1, canvasHeight());
    // Reduced motion keeps the field still: a form that lunges at the pointer is
    // exactly the kind of unrequested movement the preference exists to stop.
    // A coarse pointer gets none of it either — there is no hover on a
    // touchscreen, so the only thing a tap-driven bulge can do is fire once,
    // somewhere the reader is not looking, mid-scroll.
    const cursorLive = !reducedMotion && !coarsePointer;
    uCursorPush.value = cursorLive ? CURSOR.push : 0;
    uCursorSize.value = cursorLive ? CURSOR.sizeGain : 0;

    // uGlobe eases 0..1 so depth cueing / Layer-B dimming fade in and out with
    // the formation rather than popping on a morph.
    uGlobeUniform.value += ((currentIsGlobe ? 1 : 0) - uGlobeUniform.value) * kSettle;

    // prefers-reduced-motion: no idle spin/breathing — the object still
    // relocates and reshapes as the user scrolls (see morphTo/sweep below),
    // it just doesn't move on its own between scroll events.
    // Ambient drift + link fades ease toward their targets rather than snapping,
    // so a stage crossing never pops. Held outside the motion branch so the link
    // opacity still resolves under prefers-reduced-motion (where it lands on the
    // settled mesh with its connections already drawn).
    uDrift.value += (driftTarget - uDrift.value) * kSettle;
    uLinkAlpha.value += (linkTargetAlpha - uLinkAlpha.value) * kSettle;
    if (reducedMotion) {
      uDrift.value = 0;
      uLinkAlpha.value = linkTargetAlpha;
    }

    // Scroll-linked field motion (beat pages — see SceneConfig.scrollMotion).
    //
    // Two terms, and they are split by what each formation can survive. The
    // rotation is claimed by the globe branch below and only there, because a
    // flat mark turned about Y goes edge-on. The vertical parallax is a
    // translation of the whole field, so it is safe on every formation and is
    // what keeps the backdrop answering the scroll while a flat shape is up.
    const wantScrollSpin = scrollMotion && !reducedMotion ? scrollSpin * scrollProgress.value : 0;
    if (scrollMotion && !reducedMotion) {
      // Not the globe? Absorb this frame's share so it is never applied twice.
      if (!currentIsGlobe) appliedScrollSpin = wantScrollSpin;
      const wantY = -scrollDriftY * scrollProgress.value;
      holder.position.y += (wantY - holder.position.y) * kSettle;
    }

    if (geoMode) {
      // Region highlight hand-off. If the reader has moved to a different cluster,
      // fade the current highlight out first, swap the id at the bottom of the
      // dip, then fade back in — so clusters pass the light between them instead
      // of one snapping off as the next snaps on.
      const wantActive = pendingRegion !== 0 && uActiveRegion.value === pendingRegion ? 1 : 0;
      uRegionActive.value += (wantActive - uRegionActive.value) * kSettle * 1.6;
      if (uActiveRegion.value !== pendingRegion && uRegionActive.value < 0.06) {
        uActiveRegion.value = pendingRegion;
      }

      // Depth cueing and the ocean-shell dimmer are sphere-only reads, so they
      // ride the bend directly: full while spherical, gone once flat. No extra
      // state — the existing uGlobe machinery already gates both.
      uGlobeUniform.value = uBend.value;
      // 90°·bend aligns the unwrap's axes with latLonToVec3 at bend 1 and leaves
      // the flat map unrotated at bend 0.
      //
      // It is unwound as the eagle forms. That 90° is a GLOBE correction, but it
      // is applied to the whole Points object, so it was also being applied to
      // the sampled eagle buffer the analytic position blends into — turning
      // the closing mark, a flat XY silhouette, a quarter turn about its own
      // vertical axis. On this page the shared logo was rendering nearly
      // edge-on, at a completely different orientation from the same mark on
      // the five stage routes.
      points.rotation.y = (Math.PI / 2) * uBend.value * (1 - uEagleBlend.value);

      // THE MARK LOCKS. Everything below is a globe read — idle spin, drag,
      // axial tilt, cursor parallax — and every one of them kept running once
      // the globe had converged into the eagle, because the eagle finale on
      // this page is a shader blend rather than a stage swap and so never
      // reached the `currentFlat` branch that locks the mark on every other
      // route. The result was the closing logo slowly revolving on Y, at a
      // different angle in every screenshot, on the one page that shows it
      // largest. `locked` eases all of it out on the same blend that forms the
      // mark, so the eagle arrives already still.
      const locked = 1 - uEagleBlend.value;
      if (!reducedMotion) {
        // Idle spin fades out with the bend — a spinning flat map is nonsense —
        // and with the eagle blend, for the same reason: a spinning logo is not
        // a logo.
        idleSpin += IDLE_OMEGA * uBend.value * locked * delta;
        if (!dragging) {
          dragOffset += dragVel * dt60;
          dragVel *= Math.pow(0.94, dt60);
        }
        // The accumulated drag unwinds to zero as the mark forms, so a reader
        // who spun the globe on the way down still gets the mark square.
        dragOffset += (0 - dragOffset) * kSettle * uEagleBlend.value;
        spin.rotation.y = idleSpin + dragOffset;
        // Axial tilt and cursor parallax are also sphere reads; both ease away
        // as it flattens so the map ends up square to the camera.
        holder.rotation.z += (AXIAL_TILT * uBend.value * locked - holder.rotation.z) * kSettle;
        holder.rotation.x +=
          (pointer.y * PARALLAX_MAX * uBend.value * locked - holder.rotation.x) * kParallax;
        holder.rotation.y += (0 - holder.rotation.y) * kSettle * uEagleBlend.value;
      } else {
        holder.rotation.set(0, 0, 0);
      }

      // Uniform scale down as it flattens, so the ~2π·R-wide map frames cleanly.
      // The mark then takes its own fixed size — see EAGLE_SCALE.
      const bendScale = formationScale * (GEO_FLAT_SCALE + (1 - GEO_FLAT_SCALE) * uBend.value);
      const geoScale = bendScale + (EAGLE_SCALE - bendScale) * uEagleBlend.value;
      if (reducedMotion) spin.scale.setScalar(geoScale);
      else spin.scale.setScalar(spin.scale.x + (geoScale - spin.scale.x) * kSettle);
      points.scale.setScalar(1);

      // The overlay's own sphere↔flat blend is driven from the same bend that
      // unwraps the particles, which is why the arcs stay welded to the cloud.
      tradeArcs?.setFlatBlend(1 - uBend.value);
      // The camera lets the overlay declutter its labels in screen space.
      tradeArcs?.update(camera);
    } else if (!reducedMotion && planar && currentFlat) {
      // LOCKED formation on a planar page (the shared eagle finale, or any
      // other flat: true stage) — same treatment as the globe branch's
      // currentFlat case below: the mark holds static once settled, no
      // in-plane spin, no Y spin, no breath.
      points.rotation.z += (0 - points.rotation.z) * kSettle;
      points.rotation.x += (0 - points.rotation.x) * kSettle;
      points.rotation.y += (0 - points.rotation.y) * kSettle;
      spinYAccum = points.rotation.y;
      holder.rotation.set(0, 0, 0);
    } else if (!reducedMotion && planar) {
      // Planar lattice: slow in-plane spin on Z (a Y spin would collapse it
      // edge-on) plus a shallow breath. Depth comes from the camera orbit below,
      // not from rotating the form out of its plane.
      points.rotation.z += (2 * Math.PI) / 150 * delta; // 150s/rev
      points.rotation.x += (0 - points.rotation.x) * kSettle;
      // A stage that asks for it also turns on Y (see Shape.spinY) — the rate is
      // interpolated per stage, so a cube revolves and a process chain settles.
      spinYAccum += spinYTarget * delta;
      points.rotation.y = spinYAccum;
      holder.rotation.set(0, 0, 0);
    } else if (!reducedMotion) {
      if (currentIsGlobe) {
        // Idle rotation: single Y-axis, constant velocity, 26s/rev (Phase 3.2.1).
        // Tilt lives on the holder (23.4°); no secondary-axis wobble on points.
        // Keeps rotating while ports are up so every city cycles into view; only
        // gently eased below full speed so labels stay readable as they pass.
        // Scroll adds to the idle rate rather than replacing it, and it is added
        // as a DELTA against what has already been applied — so scrolling turns
        // the globe under the reader's hand while the constant idle rotation
        // carries on underneath, and reversing the scroll unwinds exactly what
        // it wound on.
        points.rotation.y +=
          IDLE_OMEGA * (portsMode ? 0.75 : 1) * delta + (wantScrollSpin - appliedScrollSpin);
        appliedScrollSpin = wantScrollSpin;
        points.rotation.x += (0 - points.rotation.x) * kSettle;
        holder.rotation.z += (AXIAL_TILT - holder.rotation.z) * kSettle;
        holder.rotation.x += (pointer.y * PARALLAX_MAX - holder.rotation.x) * kParallax;
        holder.rotation.y += (pointer.x * PARALLAX_MAX - holder.rotation.y) * kParallax;
      } else if (currentFlat) {
        // LOCKED formation (trade map / eagle logo / cargo plane). The centroid
        // must not drift, rotate, or breathe — ease all residual motion to zero.
        points.rotation.y += (0 - points.rotation.y) * kSettle;
        points.rotation.x += (0 - points.rotation.x) * kSettle;
        holder.rotation.z += (0 - holder.rotation.z) * kSettle;
        holder.rotation.x += (0 - holder.rotation.x) * kSettle;
        holder.rotation.y += (0 - holder.rotation.y) * kSettle;
      } else {
        // Ambient footer drift — slow single-axis wander, no tilt or parallax.
        points.rotation.y += IDLE_OMEGA * 0.35 * delta;
        points.rotation.x += (0 - points.rotation.x) * kSettle;
        holder.rotation.z += (0 - holder.rotation.z) * kSettle;
        holder.rotation.x += (0 - holder.rotation.x) * kSettle;
        holder.rotation.y += (0 - holder.rotation.y) * kSettle;
      }
    }

    // Formation size (kept outside the motion branches so it also applies under
    // prefers-reduced-motion, just without the easing). The hero globe and the
    // flat shapes render at FORMATION_SCALE; the ports globe holds at the
    // smaller PORTS_SCALE so it stays clear of the global-presence copy.
    let targetScale = currentIsGlobe && portsMode ? PORTS_SCALE : formationScale;
    // The mark takes its OWN size, not the page's. Blended on eagleMix so it
    // arrives at that size rather than jumping to it at the stage boundary.
    if (eagleMix > 0) targetScale = targetScale + (EAGLE_SCALE - targetScale) * eagleMix;
    // Subtle breathing on the planar lattice — ±1.8%, slow enough to read as
    // respiration rather than a pulse. Suppressed once locked onto a flat:
    // true stage (the eagle finale) — that mark holds fully still.
    if (planar && !reducedMotion && !currentFlat) targetScale *= 1 + 0.018 * Math.sin(shimmerUniform.value * 0.32);
    if (reducedMotion) points.scale.setScalar(targetScale);
    else points.scale.setScalar(points.scale.x + (targetScale - points.scale.x) * kSettle);

    // Orbital camera dolly. The camera swings along an arc around the form and
    // creeps closer across the page, so a planar lattice gains real parallax
    // depth without the form itself having to leave its plane. Mouse parallax
    // (±2°) rides on the same angle.
    if (cameraOrbit && !reducedMotion) {
      const angle = (orbit.value - 0.5) * orbitSweep + pointer.x * CAMERA_PARALLAX;
      // introCam is a MULTIPLIER on the orbit radius, not a write to
      // camera.position.z, so the opening push-in and the scrubbed dolly
      // compose instead of overwriting each other's frame.
      const radius = (CAMERA_Z - orbitDolly * orbit.value) * introCam.value;
      camera.position.x = Math.sin(angle) * radius;
      camera.position.z = Math.cos(angle) * radius;
      // radius × the angle is the small-angle arc length, so this is a true ±2°
      // vertical offset rather than an arbitrary world-unit nudge.
      camera.position.y = -pointer.y * CAMERA_PARALLAX * radius;
      camera.lookAt(0, 0, 0);
    } else if (introCam.value !== 1) {
      // No orbit on this page: the intro is the only thing moving the camera.
      camera.position.z = CAMERA_Z * introCam.value;
    }

    // Scroll-linked spatial path — the field travelling laterally and in depth
    // across the page rather than swapping shapes on the spot. On `spin`, which
    // no other system writes to, so it layers over the beat sweeps
    // (scene.position), the scroll parallax (holder.position) and the orbital
    // dolly (camera.position) without contending for any of them.
    if (fieldPath && !reducedMotion) {
      const p = pathProgress.value * (FIELD_PATH.x.length - 1);
      const i = Math.min(Math.floor(p), FIELD_PATH.x.length - 2);
      // power3.inOut between waypoints, evaluated inline: the path is one
      // scrubbed scalar, so easing it here costs nothing and avoids four
      // chained tweens all writing the same object.
      const f = p - i;
      const e = f < 0.5 ? 4 * f * f * f : 1 - Math.pow(-2 * f + 2, 3) / 2;
      const amp = fieldPath * (isMobile ? FIELD_PATH.mobileScale : 1);
      const halfW = visibleHalfWidth();
      const halfH = visibleHalfHeight();
      const lerp = (a: number[], k: number) => a[i] + (a[i + 1] - a[i]) * k;
      spin.position.set(
        lerp(FIELD_PATH.x as unknown as number[], e) * halfW * amp,
        lerp(FIELD_PATH.y as unknown as number[], e) * halfH * amp,
        lerp(FIELD_PATH.z as unknown as number[], e) * CAMERA_BASE_Z * amp
      );
    }

    // No per-frame position write: the morph is a vertex-shader mix of the two
    // stage buffers, so the only per-frame CPU cost is the uProgress uniform
    // that GSAP or the scroll scrub already set.

    // Port labels: fade each toward its target only when it faces the camera
    // (front hemisphere) AND its ordinal has been reached by the scrubbed
    // reveal, so the network grows outward from Surat under the reader's own
    // scroll instead of arriving whole. Cheap — at most fourteen sprites.
    // Hides the group once fully faded.
    if (portGroup && portGroup.visible) {
      points.getWorldPosition(_cp);
      _cp.project(camera);
      let anyVisible = false;
      // Screen-space boxes claimed so far this frame; a label that would land on
      // one is dropped rather than drawn over it. Priority is ordinal order,
      // which is the order the array is already in — Surat at index 0.
      _portBoxes.length = 0;
      const camRight = _right.setFromMatrixColumn(camera.matrixWorld, 0);
      portSprites.forEach((s, i) => {
        s.getWorldPosition(_wp);
        _edge.copy(_wp).addScaledVector(camRight, s.scale.x);
        _wp.project(camera);
        _edge.project(camera);
        const front = _wp.z < _cp.z; // nearer to camera than the globe centre
        // step(index, revealed) — the ordinal gate.
        const revealed = i < portsRevealed;
        const x0 = _wp.x - PORT_LABEL_GUTTER;
        const x1 = _wp.x + Math.abs(_edge.x - _wp.x) + PORT_LABEL_GUTTER;
        const clash =
          front &&
          revealed &&
          _portBoxes.some((b) => x0 < b.x1 && x1 > b.x0 && Math.abs(b.y - _wp.y) < PORT_LABEL_PAD_Y);
        const want = portsMode && front && revealed && !clash ? 1 : 0;
        if (want) _portBoxes.push({ x0, x1, y: _wp.y });
        const m = s.material as THREE.SpriteMaterial;
        m.opacity += (want - m.opacity) * kSettle;
        if (m.opacity > 0.01) anyVisible = true;
      });
      // Trade-lane arcs + travelling packets. A lane is drawn only once BOTH its
      // ends exist — the origin is index 0 and a lane inherits its destination's
      // ordinal — so the network is never shown reaching a city that has not
      // arrived yet.
      for (const a of arcs) {
        const arcTarget = portsMode && a.portIndex < portsRevealed ? 1 : 0;
        const lm = a.line.material as THREE.LineBasicMaterial;
        lm.opacity += (arcTarget * 0.42 - lm.opacity) * kSettle;
        a.off = (a.off + delta * a.speed) % 1;
        a.curve.getPoint(a.off, _wp);
        a.packet.position.copy(_wp);
        a.packet.getWorldPosition(_wp);
        _wp.project(camera);
        const pFront = _wp.z < _cp.z;
        const pm = a.packet.material as THREE.SpriteMaterial;
        pm.opacity += ((arcTarget && pFront ? 1 : 0) - pm.opacity) * kSettle;
        if (lm.opacity > 0.01 || pm.opacity > 0.01) anyVisible = true;
      }
      if (!portsMode && !anyVisible) portGroup.visible = false;
    }

    // GPU idle gate. This canvas is position:fixed over the whole viewport, so
    // an IntersectionObserver can never call it off-screen — yet for most of a
    // 15,000px document the field is faded to zero, and every one of those
    // frames is still a full count-point draw plus (off mobile) the entire post
    // chain, producing nothing a reader can see. Once the points, the port
    // overlay and the trade arcs have all settled to invisible we commit one
    // last frame (so the canvas actually holds the empty state rather than a
    // stale one) and then stop issuing draw calls. The loop itself keeps
    // running — it is also the state machine — so the field is already correct
    // the instant a beat asks it back.
    // The deep field is deliberately never faded by a beat, so once it is up the
    // canvas is never blank and this gate can never close. That is correct and
    // it is the point of the layer: the saving the gate used to make was made
    // across viewports that rendered as solid black, which is the defect it is
    // now paying to remove. It still closes before the intro has run and under
    // any future config that turns the deep field off.
    const deepAlpha = deepField ? deepField.material.opacity : 0;
    if (
      material.opacity <= BLANK_ALPHA &&
      deepAlpha <= BLANK_ALPHA &&
      !portGroup?.visible &&
      !tradeArcs?.group.visible
    ) {
      blankFrames++;
    } else {
      blankFrames = 0;
    }
    if (blankFrames <= BLANK_COMMIT_FRAMES) {
      if (composer) {
        composer.render();
      } else {
        renderer.render(scene, camera);
      }
      // The ambient backdrop is composited LAST, straight onto the canvas the
      // composer just wrote, with clearing suppressed. Drawing it here rather
      // than as a composer pass is what keeps it out of the bloom path — which
      // is the entire reason the earlier version washed the page white — while
      // avoiding the pass-ordering trap where a trailing RenderPass steals
      // renderToScreen and strands the bloomed frame in an offscreen buffer.
      if (ambient || deepField) {
        const prevAutoClear = renderer.autoClear;
        renderer.autoClear = false;
        if (ambient) renderer.render(ambientScene, camera);
        if (deepField) renderer.render(deepScene, camera);
        renderer.autoClear = prevAutoClear;
      }
    }
    // Once degraded, stop self-scheduling — the caller's onDegrade handler
    // owns teardown (dispose() also cancels animId, this just avoids one more
    // wasted frame in between).
    //
    // Under prefers-reduced-motion there is no loop at all: the frame above is
    // the settled composition, and it is re-issued only when something the
    // reader did actually changes it (a re-fit, or the one geo eagle latch).
    if (!degraded && !reducedMotion) animId = requestAnimationFrame(renderLoop);
  }
  // §7.2 / §6.5 — the loop is NOT started here.
  //
  // It used to be, and that single line was the whole of the initial-state
  // defect: the first frames painted several hundred lines before the block
  // that authors stage zero had run, so whatever the material was constructed
  // with went to screen. The loop now starts from the compile gate below, after
  // the pose is authored and after the pipeline is warm.

  /** One frame, on demand. The whole animation contract under reduced motion. */
  function requestRender() {
    if (disposed || degraded) return;
    if (composer) composer.render();
    else renderer.render(scene, camera);
  }

  function handleVisibilityChange() {
    if (reducedMotion) return; // no loop to suspend
    if (document.hidden) {
      paused = true;
      cancelAnimationFrame(animId);
    } else if (paused) {
      paused = false;
      // Swallow the whole hidden interval. Without this the first frame back
      // carries a 60-second delta into every rate below — a visible burst of
      // catch-up motion — and its raw value trips the budget monitor as well.
      clock.getDelta();
      // The frames either side of a tab switch are not evidence of anything.
      // Discard the whole sample window rather than just the counters, or the
      // median carries the hidden interval's outlier for 45 frames.
      breachFrames = 0;
      underBudgetFrames = 0;
      frameSamples.length = 0;
      sampleCursor = 0;
      renderLoop();
    }
  }
  document.addEventListener("visibilitychange", handleVisibilityChange);

  let lastCssWidth = width;
  let lastCssHeight = height;

  /**
   * THE re-fit. Strict order, every time:
   *   pixel ratio → setSize → camera.aspect → updateProjectionMatrix →
   *   composer.setSize → every post-pass resolution uniform.
   *
   * The last step is the one routinely omitted, and it is exactly why grain
   * changes character after a resize: the pass keeps sampling against the
   * resolution it was compiled with while the framebuffer underneath it has
   * moved.
   */
  function handleResize() {
    const rect = canvas.getBoundingClientRect();
    // Falls back to the window only if the canvas has not been laid out yet
    // (the first re-fit can land before the element is in the document).
    const w = Math.round(rect.width) || window.innerWidth;
    const h = Math.round(rect.height) || window.innerHeight;
    cssWidth = w;
    cssHeight = h;

    // Height-only nudges below the chrome threshold are the mobile URL bar, not
    // a resize. Gated on a COARSE POINTER, never on the user-agent: the old
    // WebKit-only filter suppressed genuine window drags on desktop Safari,
    // which is a desktop bug wearing a mobile guard.
    const heightOnly = w === lastCssWidth && Math.abs(h - lastCssHeight) > 0;
    if (heightOnly && coarsePointer && Math.abs(h - lastCssHeight) < CHROME_HEIGHT_TOLERANCE_PX) {
      return;
    }
    lastCssWidth = w;
    lastCssHeight = h;

    const ratio = rendererPixelRatio();
    renderer.setPixelRatio(ratio);
    renderer.setSize(w, h, false);
    camera.aspect = w / Math.max(1, h);
    camera.updateProjectionMatrix();
    composer?.setSize(w, h);
    // Post-processing resolution uniforms. composer.setSize propagates to every
    // pass's own setSize, which is what updates each EffectPass's `resolution`.
    // Omitting this step is why a post pass changes character after a resize —
    // it keeps sampling against the resolution it was compiled with while the
    // framebuffer underneath it has moved.
    syncPointSize();

    assertBackingStore(canvas, w, h, renderer.getPixelRatio(), "particle-scene");

    holder.scale.setScalar(fitScale()); // keep the globe proportionate on resize
    // Re-place the field for the new viewport. Only snap it while the hero is on
    // screen (before the first scroll formation) so a mid-page resize doesn't
    // yank the field sideways under the reader; deeper sections re-place on
    // their next scroll trigger.
    side = computeSide();
    if (!centred && window.scrollY < window.innerHeight * 0.6) scene.position.x = side;
    // Under reduced motion the loop is not running, so a re-fit must issue the
    // one frame itself or the canvas holds a stale composition at the old size.
    if (reducedMotion) requestRender();
  }

  // Driven by a ResizeObserver on the canvas's own box — NOT by window.resize,
  // which fires on every URL-bar movement and does not fire at all on a
  // container-only layout change. Debounced at 150ms, immediate on
  // orientationchange (see lib/device.ts).
  const releaseResize = observeContainerResize(canvas, handleResize);

  // Same value as globeRadius above, aliased under the name the port overlay
  // and hero assembly below already use.
  const R = globeRadius; // nominal shape radius in world units


  // Build this page's shapes. Async only because the eagle decodes its PNG
  // alpha channel; every other builder resolves immediately.
  const shapes = await phase("shapes", () => buildShapes(shapeKeys, shapeCtx));
  if (globeBuilt) shapes.set("globe", globeBuilt.shape);

  const registry: ShapeRegistry = {
    get(key) {
      const s = shapes.get(key);
      if (!s) throw new Error(`particle-scene: stage builder wants unlisted shape "${key}" — add it to SceneConfig.shapes`);
      return s;
    },
  };

  // Built at the scene's own pool size, so every stage is morph-compatible with
  // the shared buffers regardless of which device tier we landed on.
  const stages = buildStages
    ? await phase("stages", () => buildStages(shapeCtx, registry))
    : undefined;

  // Geo field. Fills the attributes allocated above, plus the ocean-shell layer
  // flag and the static HQ accent mask — in geo mode the accented node never moves,
  // so both accent buffers hold the same mask and the shader's mix is constant.
  if (buildGeoField && geoData && regionData) {
    const field = await buildGeoField(shapeCtx);
    geoData.set(field.geo);
    regionData.set(field.region);
    layerData.set(field.layer);
    accentA.set(field.accent);
    accentB.set(field.accent);
    (geometry.attributes.aGeo as THREE.BufferAttribute).needsUpdate = true;
    (geometry.attributes.aRegion as THREE.BufferAttribute).needsUpdate = true;
    (geometry.attributes.aLayer as THREE.BufferAttribute).needsUpdate = true;
    accentAAttr.needsUpdate = true;
    accentBAttr.needsUpdate = true;
  }

  // Shared eagle finale for a geo page. Sampled once per session and cached, so a
  // route change or a remount reuses the buffer.
  if (geoMode && eagleData && geoStages?.some((g) => g.eagle)) {
    const eagle = await buildEagleStage(shapeCtx);
    eagleData.set(eagle.data);
    (geometry.attributes.aEagle as THREE.BufferAttribute).needsUpdate = true;
  }

  // Trade-route overlay. Built at unit radius (its marker geometry is sized for
  // that) inside a group scaled to world units, and given flat dimensions of
  // exactly 2π × π — which is the unwrap's own plane, since that flattens to
  // R world units per radian. That exact agreement is what keeps the arcs landing
  // on the continents the particles draw, at every bend between sphere and map.
  if (geoMode && wantsRoutes) {
    // On the dark ground TradeArcs keeps its own tokens (route blue, gold origins,
    // slate destinations) — that is the palette it was designed against. Only a
    // light-ground page overrides them, where those hues would sit outside a
    // two-tone paper palette.
    tradeArcs = new TradeArcs(
      1,
      reducedMotion,
      2 * Math.PI,
      Math.PI,
      lightGround && palette
        ? {
            route: tokenColor(palette.primary).getHex(),
            origin: tokenColor(palette.accent).getHex(),
            destination: tokenColor(palette.primary).getHex(),
          }
        : {},
      isMobile
    );
    const arcRoot = new THREE.Group();
    arcRoot.scale.setScalar(globeRadius);
    arcRoot.add(tradeArcs.group);
    // On `spin`, NOT on `points` — points carries the 90°·bend alignment rotation
    // and the arcs are already in latLonToVec3 space.
    spin.add(arcRoot);
  }

  // `stages` / `geoStages` pages carry their own forms and have no registry hero.
  const heroShape = hero ? shapes.get(hero) : undefined;
  if (hero && !heroShape) throw new Error(`particle-scene: hero shape "${hero}" failed to build`);
  if (!hero && !stages?.length && !geoStages?.length) {
    throw new Error(
      "particle-scene: config needs a `hero` shape, a `stages` sequence, or `geoStages`"
    );
  }

  // Cities come from the shared dataset (src/data/trade-cities.ts) — the same list
  // the Global Presence flat map draws, so the two surfaces cannot drift apart.
  // Surat is the single origin; packets flow from it out to every hub.
  const CITIES = TRADE_CITIES;

  const makePortSprite = (name: string, origin: boolean): THREE.Sprite => {
    const dpr = 2;
    // Surat (origin) is the standout — larger + warm gold. Destinations are
    // small and muted (a soft slate, NOT bright white) so they don't read as
    // neon and don't fight each other for attention.
    const fontPx = origin ? 21 : 15;
    const weight = origin ? 700 : 500;
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d")!;
    const fontStack = `${weight} ${fontPx}px 'Lufga','Inter',system-ui,sans-serif`;
    ctx.font = fontStack;
    const textW = ctx.measureText(name).width;
    const padX = 5;
    const dotR = origin ? 6 : 4;
    const gap = 8;
    const w = Math.ceil(dotR * 2 + gap + textW + padX * 2);
    const h = Math.ceil(fontPx + 12);
    canvas.width = w * dpr;
    canvas.height = h * dpr;
    ctx.scale(dpr, dpr);
    ctx.font = fontStack;
    ctx.textBaseline = "middle";
    // marker dot
    ctx.fillStyle = readToken(origin ? "--port-origin-dot" : "--port-dest-dot");
    ctx.beginPath();
    ctx.arc(padX + dotR, h / 2, dotR, 0, Math.PI * 2);
    ctx.fill();
    // city name — faint shadow so it reads over the grains without glowing
    // Derived from the ground token, not a literal — a fixed navy plate behind
    // every label is exactly what shows up as a blue smear on a black page.
    ctx.shadowColor = tokenColor("--bg").getStyle().replace("rgb(", "rgba(").replace(")", ", 0.9)");
    ctx.shadowBlur = 4;
    ctx.fillStyle = readToken(origin ? "--port-origin-text" : "--port-dest-text");
    ctx.fillText(name, padX + dotR * 2 + gap, h / 2 + 1);
    const tex = new THREE.CanvasTexture(canvas);
    tex.anisotropy = 4;
    tex.needsUpdate = true;
    const mat = new THREE.SpriteMaterial({
      map: tex,
      transparent: true,
      depthTest: false,
      depthWrite: false,
      opacity: 0,
    });
    const sprite = new THREE.Sprite(mat);
    // Local size (the whole globe scales up in ports mode — see render loop —
    // so these stay small on screen even though the globe grows).
    const worldH = origin ? R * 0.3 : R * 0.19;
    sprite.scale.set(worldH * (w / h), worldH, 1);
    sprite.center.set(0, 0.5); // anchor at the dot, so text reads to the right
    return sprite;
  };

  // The overlay is home / global-presence only: fourteen canvas-texture label
  // sprites plus thirteen arc geometries and their packet sprites. Pages whose
  // choreography never shows the ports globe skip building any of it.
  if (wantsPorts) {
    portGroup = new THREE.Group();
    portGroup.visible = false;
    const cityVecs: Record<string, THREE.Vector3> = {};
    for (const c of CITIES) {
      const sprite = makePortSprite(c.name, !!c.origin);
      const [x, y, z] = latLonToVec3(c.lat, c.lon, globeRadius * 1.045);
      sprite.position.set(x, y, z);
      sprite.renderOrder = c.origin ? 4 : 3; // labels over arcs; Surat over labels
      portGroup.add(sprite);
      portSprites.push(sprite);
      cityVecs[c.name] = new THREE.Vector3(...latLonToVec3(c.lat, c.lon, globeRadius * 1.01));
    }

    // Connecting arcs + travelling packets: one lane from Surat to every hub. Each
    // arc bulges off the sphere (higher for longer lanes) and a gold "packet"
    // sprite runs Surat → hub along it, looping — the trade flowing outward.
    const surat = cityVecs["Surat"];
    // Bound outside the callback: TypeScript cannot carry the enclosing
    // null-narrowing of the mutable `portGroup` into a closure.
    const group = portGroup;
    // Indexed, so each lane can carry its destination's ordinal — the same
    // index the label sprites were pushed at, since both walk CITIES in order.
    CITIES.forEach((c, portIndex) => {
      if (c.origin) return;
      const dest = cityVecs[c.name];
      const mid = surat.clone().add(dest).multiplyScalar(0.5);
      const lift = globeRadius * (1.1 + surat.distanceTo(dest) / (globeRadius * 4.2));
      mid.setLength(lift);
      const curve = new THREE.QuadraticBezierCurve3(surat.clone(), mid, dest.clone());
      const lineGeo = new THREE.BufferGeometry().setFromPoints(curve.getPoints(64));
      const lineMat = new THREE.LineBasicMaterial({
        color: tokenColor("--gold-particle"),
        transparent: true,
        opacity: 0,
        blending: THREE.AdditiveBlending,
        depthTest: false,
        depthWrite: false,
      });
      const line = new THREE.Line(lineGeo, lineMat);
      line.renderOrder = 1;
      group.add(line);
      const packetMat = new THREE.SpriteMaterial({
        map: texture,
        color: tokenColor("--gold-packet"),
        transparent: true,
        opacity: 0,
        blending: THREE.AdditiveBlending,
        depthTest: false,
        depthWrite: false,
      });
      const packet = new THREE.Sprite(packetMat);
      packet.scale.setScalar(globeRadius * 0.05); // small flowing dots
      packet.renderOrder = 2;
      group.add(packet);
      arcs.push({
        line,
        packet,
        curve,
        speed: 0.16 + Math.random() * 0.12,
        off: Math.random(),
        portIndex,
      });
    });
    points.add(portGroup);
  }

  const showPorts = () => {
    if (portGroup) portGroup.visible = true;
    portsMode = true;
  };
  const hidePorts = () => {
    portsMode = false; // render loop fades the sprites out, then hides the group
    // Rewind the reveal, so scrolling back down replays it rather than
    // returning to a network that is already complete.
    portsRevealed = 0;
    gsap.killTweensOf(portsRevealedProxy);
    portsRevealedProxy.value = 0;
  };
  /**
   * The scrubbed reveal driver. A plain object rather than a bare number so
   * ScrollTrigger can tween it; `portsRevealed` mirrors it for the render loop.
   */
  const portsRevealedProxy = { value: 0 };

  function morphTo(shape: Shape, onProgress?: (eased: number) => void) {
    if (shape.name === currentShapeName && !onProgress) return;
    currentShapeName = shape.name;
    currentFlat = !!shape.flat;
    currentIsGlobe = shape.name === "globe";

    if (reducedMotion) {
      // Jump-cut: land on the target shape immediately, no elastic travel
      // and no speed pulse — the object stays static between scroll steps.
      applySpectrum(shape, 0);
      snapTo(shape.data);
      onProgress?.(1); // jump-cut still resolves any blend the caller drives off this call
      return;
    }

    gsap.killTweensOf(morphProgress);
    setStage(shape.data);
    // Burst is a property of TRAVEL, so it is armed per-morph rather than left
    // on: set after setStage (which reads the OUTGOING amplitude to freeze the
    // current frame) and before the tween that will drive it.
    uBurst.value = burstAmp;
    // Colour must track the form's VISIBLE arrival, not the tween's nominal
    // length. `elastic.out(1, 0.75)` puts the shape on target in ~0.6s and then
    // spends the remaining ~3.4s ringing around it — so crossing colour over the
    // full PERIOD.morph left a fully-formed cargo ship still bleeding globe-blue
    // for three seconds after it had arrived. Shape and hue landing at visibly
    // different times is what read as the field being out of step with itself.
    applySpectrum(shape, DURATION.long);
    // The swell runs on its own linear clock over the same window, so it is a
    // symmetric out-and-back regardless of what the position ease is doing.
    gsap.killTweensOf(uBurstT);
    uBurstT.value = 0;
    if (burstAmp > 0) {
      gsap.to(uBurstT, { value: 1, duration: BURST.duration, ease: "none" });
    }
    gsap.to(morphProgress, {
      value: 1,
      // PERIOD.morph, not the DURATION ladder: this is the discrete beat morph's
      // own travel time and the elastic overshoot is the morph itself. Collapsing
      // it onto a transition duration would change what happens, not how
      // smoothly it happens. Held for the Chairman under the duration escalation.
      duration: PERIOD.morph,
      ease: EASE_MORPH_ARRIVAL,
      onUpdate: onProgress ? () => onProgress(morphProgress.value) : undefined,
    });
  }

  /**
   * Tween the field's four spectrum stops to a shape's own palette.
   *
   * Colour travels WITH the morph rather than switching on arrival: the globe's
   * blue-greens bleed into the hull's steel over the same window the geometry
   * takes to become a hull, so the field never shows a frame of the new form in
   * the old colour. A shape without a spectrum simply holds the current one.
   */
  function applySpectrum(shape: Shape | undefined, duration: number) {
    const spec = shape?.spectrum;
    if (!spec) return;
    const stops = [uSpectrumA, uSpectrumB, uSpectrumC, uSpectrumD];
    stops.forEach((stop, i) => {
      const target = new THREE.Color(spec[i]);
      gsap.killTweensOf(stop.value);
      if (reducedMotion || duration <= 0) {
        stop.value.copy(target);
        return;
      }
      // Tweening the Color's channels directly — THREE.Color is a plain
      // {r,g,b} object as far as GSAP is concerned, and the uniform holds a
      // reference, so no per-frame uniform write is needed.
      gsap.to(stop.value, {
        r: target.r,
        g: target.g,
        b: target.b,
        duration,
        ease: "none",
      });
    });
  }

  /**
   * CPU twin of the vertex shader's `tvxBurst`. Must stay bit-compatible in
   * shape (not in float precision) with the GLSL, or freezing an in-flight
   * morph in setStage lands the grains somewhere they were never drawn.
   */
  function burstEnvelope(t: number): number {
    const w = Math.sin(smoothstep(BURST.from, BURST.to, t) * Math.PI);
    return w * w * w;
  }

  function smoothstep(edge0: number, edge1: number, x: number): number {
    const s = Math.min(1, Math.max(0, (x - edge0) / (edge1 - edge0 || 1)));
    return s * s * (3 - 2 * s);
  }

  // ── Connection lines ───────────────────────────────────────────────────────
  // The mesh stage's node-to-node connections, as line geometry rather than
  // particles. The stroke draw-in is done entirely in the vertex shader: each
  // segment's far endpoint is pulled back toward its origin by a per-segment
  // fraction of uDraw, so the lines grow outward from their nodes. Staggering by
  // segment index means they draw in sequence rather than all at once. No CPU
  // work per frame — one uniform.
  const linkStageIndex = stages?.findIndex((s) => s.links && s.links.length) ?? -1;
  let linkMesh: THREE.LineSegments | null = null;
  let linkMaterial: THREE.ShaderMaterial | null = null;
  if (stages && linkStageIndex >= 0) {
    const src = stages[linkStageIndex].links!;
    const segments = src.length / 6;
    const from = new Float32Array(segments * 2 * 3);
    const to = new Float32Array(segments * 2 * 3);
    const side = new Float32Array(segments * 2);
    const seq = new Float32Array(segments * 2);
    const pos = new Float32Array(segments * 2 * 3);
    for (let s = 0; s < segments; s++) {
      const a = src.subarray(s * 6, s * 6 + 3);
      const b = src.subarray(s * 6 + 3, s * 6 + 6);
      for (let v = 0; v < 2; v++) {
        const o = (s * 2 + v) * 3;
        from.set(a, o);
        to.set(b, o);
        pos.set(v === 0 ? a : b, o);
        side[s * 2 + v] = v;
        seq[s * 2 + v] = segments > 1 ? s / (segments - 1) : 0;
      }
    }
    const linkGeo = new THREE.BufferGeometry();
    // `position` is what the renderer derives the draw count from; the shader
    // reconstructs the real endpoints from aFrom/aTo.
    linkGeo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
    linkGeo.setAttribute("aFrom", new THREE.BufferAttribute(from, 3));
    linkGeo.setAttribute("aTo", new THREE.BufferAttribute(to, 3));
    linkGeo.setAttribute("aSide", new THREE.BufferAttribute(side, 1));
    linkGeo.setAttribute("aSeq", new THREE.BufferAttribute(seq, 1));
    linkMaterial = new THREE.ShaderMaterial({
      uniforms: {
        uDraw,
        uLinkAlpha,
        uColor: { value: palette ? tokenColor(palette.accent) : tokenColor("--gold-particle") },
      },
      transparent: true,
      depthWrite: false,
      depthTest: false,
      blending: lightGround ? THREE.NormalBlending : THREE.AdditiveBlending,
      vertexShader: `
        attribute vec3 aFrom;
        attribute vec3 aTo;
        attribute float aSide;
        attribute float aSeq;
        uniform float uDraw;
        varying float vFade;
        // STAGGER reserves the first 55% of uDraw for spreading the segments'
        // start times; each then has the remaining 45% to complete.
        const float STAGGER = 0.55;
        void main() {
          float local = clamp((uDraw - aSeq * STAGGER) / (1.0 - STAGGER), 0.0, 1.0);
          vec3 p = aFrom + (aTo - aFrom) * (aSide * local);
          vFade = local;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0);
        }`,
      fragmentShader: `
        uniform vec3 uColor;
        uniform float uLinkAlpha;
        varying float vFade;
        void main() {
          // 0.42 keeps the strokes a structural hint rather than a diagram.
          gl_FragColor = vec4(uColor, uLinkAlpha * vFade * 0.42);
        }`,
    });
    linkMesh = new THREE.LineSegments(linkGeo, linkMaterial);
    linkMesh.frustumCulled = false;
    linkMesh.renderOrder = 1;
    points.add(linkMesh); // rides the lattice's spin, scale and breathing
  }

  // ── Scrubbed stage timeline ────────────────────────────────────────────────
  // The whole sequence is one scalar: `t` runs 0 → stages.length-1, its integer
  // part selecting which pair of stages is loaded into the FROM/TO buffers and
  // its fraction driving uProgress. Buffers are rewritten only when the integer
  // part changes — a handful of times across a full page scroll — so scrolling
  // inside a segment costs exactly one float write per frame, and scrolling back
  // up is symmetric for free.
  let activeSegment = -1;

  /**
   * True from the moment the opening pose is authored until the 2.1s assemble
   * has finished (or the reader has scrolled far enough to take the playhead
   * off stage zero, whichever comes first).
   *
   * The assemble and the scrubbed timeline both drive uProgress and both own
   * the position buffers, so exactly one of them may be live at a time. Without
   * this the timeline won its first frame unconditionally: `loadSegment(0)`
   * overwrites the scatter shell with stage zero's settled positions, zeroes
   * uStagger and kills the assemble tween — so the assemble was authored,
   * armed, and then destroyed before the compile gate ever let it run. Nothing
   * about it was visible on any route.
   */
  let assembling = false;
  /** The playhead the timeline asked for while the assemble held the field. */
  let deferredPlayhead = 0;

  /**
   * Hand the field from the assemble to the scrubbed timeline, once.
   *
   * `activeSegment` is reset so the first post-assemble setTimelinePos reloads
   * the buffers the assemble has been holding, rather than short-circuiting on
   * a segment index it never actually loaded.
   */
  function endAssemble() {
    if (!assembling) return;
    assembling = false;
    gsap.killTweensOf(morphProgress);
    uStagger.value = 0;
    if (geoStages) {
      // Geo mode has no stage timeline to take uProgress over — it is the
      // assemble's uniform and nothing else ever writes it. A reader who
      // scrolls part-way through the settle hands the field over early, so
      // without this the globe would hold at whatever fraction of scattered it
      // had reached, for the life of the page.
      uProgress.value = 1;
    }
    activeSegment = -1;
    setTimelinePos(deferredPlayhead);
  }

  function loadSegment(i: number) {
    if (!stages || i === activeSegment) return;
    activeSegment = i;
    // If the hero assemble is still easing uProgress, the timeline is taking
    // over — stop the tween writing the same uniform.
    gsap.killTweensOf(morphProgress);
    const a = stages[i];
    const b = stages[i + 1];
    positions.set(a.data);
    targets.set(b.data);
    posAttr.needsUpdate = true;
    toAttr.needsUpdate = true;
    if (a.accent) accentA.set(a.accent);
    if (b.accent) accentB.set(b.accent);
    accentAAttr.needsUpdate = true;
    accentBAttr.needsUpdate = true;
    uStagger.value = 0;
    // Each scrubbed segment is a travelling morph in its own right, so every
    // leg of the sequence gets its own swell — the same per-leg envelope the
    // reference gets from fract(progress * 3).
    // Scaled back: a scrubbed leg can be parked at its peak. See BURST.scrubScale.
    uBurst.value = burstAmp * BURST.scrubScale;
    // Scrubbed legs carry colour too. Given a short window rather than 0 so a
    // fast flick through several segments still reads as a blend.
    applySpectrum(b, DURATION.standard);
    // NOTE: currentFlat / currentIsGlobe are NOT set here. They are derived per
    // frame in setTimelinePos from whichever stage the reader is nearer, which
    // matters now that a sequence can contain a globe: switching to the globe's
    // idle spin and axial tilt at segment LOAD would turn the outgoing form —
    // a flat container, in home's case — about Y for the length of a whole
    // section, and a flat mark turned about Y collapses edge-on.
  }

  /** Show or hide the route overlay. Both calls are idempotent inside TradeArcs. */
  function setRoutes(on: boolean) {
    if (!tradeArcs) return;
    if (on) tradeArcs.playIn();
    else tradeArcs.playOut();
  }

  /**
   * Illuminate a regional cluster (0 clears). Rather than swapping the active id
   * under a live highlight — which reads as a hard cut — the request is queued and
   * the highlight dips through neutral first (see the render loop), so the
   * clusters hand off to each other.
   */
  function setRegion(region: number) {
    pendingRegion = region;
  }

  /**
   * Geo timeline: interpolate `bend` between the two stages being blended. This is
   * the whole unwrap — one float per frame, no buffer writes, which is why the
   * signature moment costs the same as sitting still.
   */
  function setGeoTimeline(t: number) {
    if (!geoStages) return;
    const last = geoStages.length - 1;
    const clamped = Math.min(Math.max(t, 0), last);
    const i = Math.min(Math.floor(clamped), last - 1);
    const f = clamped - i;
    const a = geoStages[i];
    const b = geoStages[i + 1];
    uBend.value = a.bend + (b.bend - a.bend) * f;
    const dA = a.drift ?? 0;
    const dB = b.drift ?? 0;
    driftTarget = dA + (dB - dA) * f;
    // The shared eagle finale. Interpolated on the same fraction as bend and
    // drift, so the map dissolves into the mark rather than switching to it.
    uEagleBlend.value = (a.eagle ? 1 : 0) + ((b.eagle ? 1 : 0) - (a.eagle ? 1 : 0)) * f;
    // Whichever stage the reader is closer to owns the overlay. The routes fade
    // out as the eagle takes over — the closing mark stands alone.
    setRoutes(f > 0.5 ? !!b.routes : !!a.routes);
    // Sequence the route draw against the scroll, so arcs grow outward from Surat
    // as the reader moves through the section rather than on a timer of their own.
    if (tradeArcs) {
      const routeStage = geoStages.findIndex((g) => g.routes);
      if (routeStage >= 0) tradeArcs.setDrawProgress(clamped - (routeStage - 1));
    }
  }

  /** Playhead past this and the reader has genuinely left stage zero. */
  const ASSEMBLE_YIELD = 0.02;

  function setTimelinePos(t: number) {
    // While the opening assemble holds the field, the timeline records where it
    // wants to be but writes nothing. At scroll 0 that is 0 anyway — this only
    // matters when a refresh fires mid-assemble, or when the reader starts
    // scrolling during it. Past a couple of percent they have made a real
    // choice, so the assemble yields immediately rather than making them wait
    // out an animation they have already scrolled away from.
    if (assembling) {
      deferredPlayhead = t;
      if (t <= ASSEMBLE_YIELD) return;
      endAssemble();
      return;
    }
    if (geoStages) {
      setGeoTimeline(t);
      return;
    }
    if (!stages) return;
    const last = stages.length - 1;
    const clamped = Math.min(Math.max(t, 0), last);
    const i = Math.min(Math.floor(clamped), last - 1);
    loadSegment(i);
    uProgress.value = clamped - i;
    // Scrubbed segments are already linear in the scroll fraction, so the
    // envelope shares the position driver directly — one swell per leg, tied to
    // the reader's own scrolling rather than to a clock.
    //
    // This is also what makes BURST.scrubScale: 1 safe. The envelope is a cubed
    // sine over a smoothstep window, so it is exactly 0 at fraction 0 and 1 —
    // which are precisely the values a settled stage holds. A page can never
    // come to rest inflated, however large the amplitude.
    uBurstT.value = uProgress.value;

    // Idle character follows whichever stage the reader is NEARER, not the one
    // the segment is travelling toward. See the note in loadSegment.
    const near = uProgress.value > 0.5 ? stages[i + 1] : stages[i];
    currentFlat = !!near.flat;
    currentIsGlobe = near.name === "globe";

    // Drift is interpolated between the two stages being blended, so the closing
    // stage's loose wander arrives gradually rather than switching on.
    const dA = stages[i].drift ?? 0;
    const dB = stages[i + 1].drift ?? 0;
    driftTarget = dA + (dB - dA) * uProgress.value;
    const sA = stages[i].spinY ?? 0;
    const sB = stages[i + 1].spinY ?? 0;
    spinYTarget = sA + (sB - sA) * uProgress.value;

    // The shared mark's size, interpolated on the same fraction as drift and
    // spin — see EAGLE_SCALE.
    const eA = stages[i].name === "eagle" ? 1 : 0;
    const eB = stages[i + 1].name === "eagle" ? 1 : 0;
    eagleMix = eA + (eB - eA) * uProgress.value;

    // Connections draw in across the final third of the morph that completes the
    // mesh, hold at full through that stage, then fade as the next morph pulls
    // the lattice apart.
    if (linkStageIndex >= 0) {
      const env = linkEnvelope ?? {
        drawFrom: linkStageIndex - 0.38,
        drawTo: linkStageIndex,
        fadeFrom: linkStageIndex,
        fadeTo: linkStageIndex + 0.55,
      };
      uDraw.value = Math.min(
        Math.max((clamped - env.drawFrom) / (env.drawTo - env.drawFrom || 1), 0),
        1
      );
      linkTargetAlpha = 1 - smoothstep(env.fadeFrom, env.fadeTo, clamped);
    }
  }

  // Hero: scatter every grain into a chaotic shell, then let each fall into the
  // hero shape on its own 0–400ms-delayed track, so the form coalesces like
  // settling dust rather than snapping in on one synchronized keyframe (§2).
  // On Careers this convergence *is* the beat — the motion carries the idea, so
  // it survives the mobile particle budget better than any silhouette.
  /**
   * §5.3 / §6.5 — set by assembleInto, invoked ONLY by the compile gate.
   *
   * The assemble authors its stage-zero pose synchronously (scatter shell,
   * progress 0, opacity 0) and then stops. Nothing moves until the gate calls
   * this. That separation is what makes "constructed paused at progress zero"
   * true of a system whose opening beat is a tween rather than a timeline
   * object: the pose exists, the motion does not.
   */
  let startIntro: (() => void) | null = null;

  /**
   * Author the unformed pose: a random shell in the FROM buffer, one arrival
   * delay per grain, every progress uniform at zero and the field invisible.
   *
   * Every synchronous write, no tweens — the caller hands the motion to the
   * compile gate. Shared by the stage-buffer assemble and the geo one, which is
   * the point: the invariant "every route opens unformed" is now one function
   * two call sites use, not a behaviour one mode happened to implement.
   */
  function authorUnformedPose() {
    // Claim the field. Until endAssemble() runs, the scrubbed timeline records
    // its playhead but writes neither uProgress nor the position buffers.
    assembling = true;
    deferredPlayhead = 0;
    activeSegment = -1;

    // Scatter shell — written straight into the FROM buffer, with each grain
    // given its own arrival delay in aDelay. uStagger=1 makes the shader honour
    // those delays, so the form settles like dust instead of snapping in.
    for (let i = 0; i < count; i++) {
      const r = R * 2.6 + Math.random() * R * 3.2;
      const th = Math.random() * Math.PI * 2;
      const ph = Math.acos(2 * Math.random() - 1);
      const idx = i * 3;
      positions[idx] = r * Math.sin(ph) * Math.cos(th);
      positions[idx + 1] = r * Math.sin(ph) * Math.sin(th);
      positions[idx + 2] = r * Math.cos(ph);
      delays[i] = Math.random() * 0.4; // 0–400ms per-particle stagger
    }
    posAttr.needsUpdate = true;
    delayAttr.needsUpdate = true;
    uStagger.value = 1;
    // §7.2 — the opening `.set()` of every animated property to stage zero.
    // Explicit, and sourced from the same object material construction used, so
    // the two cannot drift apart. Construction defaults are never relied upon.
    uProgress.value = INTRO_STATE_INITIAL.progress;
    morphProgress.value = INTRO_STATE_INITIAL.progress;
    uBurstT.value = INTRO_STATE_INITIAL.burstT;
    uDrift.value = INTRO_STATE_INITIAL.drift;
    // No burst on the assemble. The grains are already arriving from a random
    // shell — swelling them outward mid-flight just reads as more scatter, and
    // it fights the settling the stagger window exists to create.
    uBurst.value = INTRO_STATE_INITIAL.burst;

    material.opacity = INTRO_STATE_INITIAL.opacity;
    if (ambient) ambient.material.opacity = INTRO_STATE_INITIAL.opacity;
  }

  /**
   * The assemble tween itself — the one piece of motion the gate owns.
   *
   * Split out for the same reason as the pose above: geo mode runs the
   * identical 2.1s settle, and "identical" has to mean one tween definition.
   */
  function armAssemble() {
    gsap.to(material, { opacity: heroOpacity, duration: DURATION.long, ease: EASE.entry });
    // Backdrop fades up behind the assemble, a beat later and slower, so the
    // depth is established after the form rather than competing with its arrival.
    if (ambient) {
      gsap.to(ambient.material, {
        opacity: capOpacity(AMBIENT.opacity),
        duration: DURATION.long * 1.5,
        delay: DURATION.standard,
        ease: EASE.entry,
      });
    }
    gsap.killTweensOf(morphProgress);
    // PERIOD.assemble — the per-particle settling window, not a transition.
    // Unchanged: §1.3 locks the choreography, and this is the same tween with
    // the same duration and the same ease. Only its start is now gated.
    //
    // onComplete hands the field to the scrubbed timeline at whatever playhead
    // the reader's scroll has reached in the meantime. Without the handover the
    // timeline would stay muted for the life of the page.
    gsap.to(morphProgress, {
      value: 1,
      duration: PERIOD.assemble,
      ease: EASE.scrub,
      onComplete: endAssemble,
    });
  }

  function assembleInto(shape: Shape) {
    currentShapeName = shape.name;
    currentFlat = !!shape.flat;
    currentIsGlobe = shape.name === "globe";
    // The opening form never passes through morphTo, so it would otherwise
    // assemble in the page's token spectrum and only find its own colour at the
    // first scroll beat. Set instantly — there is nothing on screen yet to
    // cross-fade from.
    applySpectrum(shape, 0);
    if (reducedMotion) {
      snapTo(shape.data);
      material.opacity = heroOpacity;
      return;
    }

    authorUnformedPose();
    targets.set(shape.data);
    toAttr.needsUpdate = true;

    // The pose is authored. NOTHING above started a tween — every line of it is
    // a synchronous write, so the scene can be rendered, compiled and measured
    // in this state for as long as the gate needs without the sequence having
    // begun. The motion is handed to the gate instead.
    startIntro = () => {
      startIntro = null;
      armAssemble();
    };
  }

  /**
   * The geo-mode assemble.
   *
   * Geo mode has no stage buffers to morph between — every position is derived
   * in the vertex shader from aGeo and uBend — so it is the one mode that could
   * not use assembleInto. It previously had no opening at all: the globe was
   * authored complete at construction and the gate simply faded it up, which is
   * why /global-presence was the route that most obviously "loaded in final
   * form". The shader now blends the scatter shell in `position` toward the
   * analytic form on the same staggered t, so this is the same 2.1s settle the
   * other five routes run, on the same tween, at the same cost.
   */
  function assembleGeo() {
    authorUnformedPose();
    startIntro = () => {
      startIntro = null;
      armAssemble();
    };
  }

  let revealDelayMs = 0;

  // Initial state. (Caller signals preloader-done once this instance's promise
  // resolves — see ParticleCanvas.tsx.)
  if (geoStages?.length) {
    // §7.2 — authored, not inherited. Geo routes have no assemble to hide
    // behind, so stage zero is written explicitly here and the field is held at
    // zero opacity until the gate opens. This is the branch that put a fully
    // resolved globe on screen at construction time.
    material.opacity = INTRO_STATE_INITIAL.opacity;
    if (reducedMotion) {
      // Reduced motion resting state: the FLAT map, already unwrapped, with Surat,
      // every route drawn and every label visible. No unwrap, no spin, no drift —
      // TradeArcs' own reduced-motion path draws the network in one go.
      //
      // The eagle is then held as the page's final state once the reader reaches the
      // CTA, switched instantly by a single trigger below rather than morphed. That
      // keeps both halves of the brief: nothing animates, but the closing signature
      // is still the state the page ends on.
      uBend.value = 0;
      uEagleBlend.value = 0;
      driftTarget = 0;
      setRoutes(true);
      // The geo assemble blends `position` (the scatter shell) toward the
      // analytic form on uProgress, so a reduced-motion reader must be handed
      // the finished end of that blend explicitly. Left at 0 the entire field
      // would collapse onto the origin — the assemble's own start state, which
      // is exactly the frame reduced motion must never see.
      uProgress.value = 1;
      uStagger.value = 0;
      // §7.3 — the reduced-motion path is an EXPLICIT branch and it renders a
      // finished state immediately. It is never reached as a side effect of a
      // stalled or skipped timeline, and it does not wait on the gate.
      material.opacity = heroOpacity;
    } else {
      // Settle on stage 0 — the globe. Spherical, no routes, no eagle blend:
      // whatever geoStages[0] declares and nothing beyond it.
      uBend.value = geoStages[0].bend;
      uEagleBlend.value = INTRO_STATE_INITIAL.eagleBlend;
      driftTarget = geoStages[0].drift ?? 0;
      setRoutes(!!geoStages[0].routes);
      // Held at stage zero, invisible, until the gate opens — §6.5. The reveal
      // is now a 2.1s assemble out of a scatter shell rather than a fade onto
      // an already-formed globe: see assembleGeo.
      revealDelayMs = 900;
      assembleGeo();
    }
    currentIsGlobe = false; // geo mode drives uGlobe from bend directly
    currentFlat = false;
  } else if (stages?.length) {
    if (reducedMotion) {
      // Reduced motion settles on ONE stage and holds it for the whole page.
      //
      // Which one depends on what the page is anchored to. A stage page's
      // identity is its FINALE — the shared eagle, the closing signature — so
      // it settles on the last stage. A page that also carries beats (home) is
      // anchored to its HERO: settling it on the eagle would mean a
      // reduced-motion reader opens the site on the CTA's mark instead of the
      // globe the headline is written against, which is not a smaller version
      // of the experience, it is a different page.
      const settled = beats.length ? stages[0] : stages[stages.length - 1];
      // Instantly, and before the snap. A stage carries its own four-stop
      // spectrum (the globe's ocean-and-land, the hull's painted steel) and
      // nothing else on this branch applies it, so without this a
      // reduced-motion reader gets the settled FORM wearing the page's generic
      // token palette — a globe in violet and rose rather than in water and
      // land. It never showed while every scrubbed page opened on an abstract
      // lattice; it shows the moment one of them opens on a globe.
      applySpectrum(settled, 0);
      snapTo(settled.data, settled.accent);
      currentFlat = !!settled.flat;
      currentIsGlobe = false;
      driftTarget = 0;
      spinYTarget = 0;
      // The eagle finale carries no connections, so the link layer stays down —
      // drawing a network over the closing mark would be nonsense.
      uDraw.value = 0;
      linkTargetAlpha = 0;
      material.opacity = heroOpacity;
    } else {
      assembleInto(stages[0]);
      revealDelayMs = 900;
      if (stages[0].accent) {
        accentA.set(stages[0].accent);
        accentB.set(stages[0].accent);
        accentAAttr.needsUpdate = true;
        accentBAttr.needsUpdate = true;
      }
      driftTarget = stages[0].drift ?? 0;
      spinYTarget = stages[0].spinY ?? 0;
    }
  } else if (heroShape) {
    assembleInto(heroShape);
    revealDelayMs = reducedMotion ? 0 : 900;
  }

  // ── §6 — warm start and compile gate ───────────────────────────────────────
  //
  // The stall Antigonus defends against is not removed by defending against it.
  // Shader program linking and the first attribute upload happen inside the
  // first rendered frame; if the sequence is already running in that frame, it
  // runs under a freeze. So the sequence does not start until the pipeline is
  // warm and the device has demonstrated it can hold two frames.
  //
  // §6.2 note: every stage's position buffer is already materialised before
  // this point — `buildStages` is awaited during construction — so there is no
  // lazy morph-target creation at stage boundaries to eliminate. What remains
  // is the per-boundary re-upload in loadSegment(), addressed by marking the
  // morph attributes dynamic and forcing their first upload here, off-timeline.
  let readyTimer = 0;
  let gateFrame = 0;
  let gateOpened = false;

  /**
   * THE arrival.
   *
   * Two tweens on one timeline, and they are deliberately offset rather than
   * simultaneous: the field materialises from t=0 and the camera starts moving
   * half a second later, so the reader sees something resolve out of nothing
   * and THEN feels themselves travel toward it. Started together, the push
   * reads as a zoom on a thing that was already there.
   *
   * `uIntro` is not the material's opacity — that channel belongs to the
   * choreography, which tweens it all page long — so no later beat can
   * accidentally undo or pre-empt the arrival.
   *
   * Under reduced motion neither tween is built: both uniforms are constructed
   * at their settled values, so the field is simply present.
   */
  function runIntro() {
    if (reducedMotion) {
      uIntro.value = 1;
      introCam.value = 1;
      return;
    }
    uIntro.value = 0;
    introCam.value = INTRO.cameraStart;
    const tl = gsap.timeline();
    tl.to(uIntro, { value: 1, duration: INTRO.duration, ease: INTRO.ease }, 0);
    tl.to(
      introCam,
      { value: 1, duration: INTRO.duration, ease: INTRO.ease },
      INTRO.cameraDelay
    );
    // The deep field comes up with the arrival and then stays up for the life
    // of the page. It is the only layer no beat may touch.
    if (deepField) {
      tl.to(
        deepField.material,
        { opacity: DEEP_FIELD.opacity, duration: INTRO.duration, ease: EASE.entry },
        0
      );
    }
    introTimeline = tl;
  }
  let introTimeline: gsap.core.Timeline | null = null;

  const openGate = () => {
    if (gateOpened || disposed) return;
    gateOpened = true;
    if (readyTimer) {
      clearTimeout(readyTimer);
      readyTimer = 0;
    }
    // Budget sampling begins HERE, not at first frame — §9.1. Everything before
    // this point is warmup by definition.
    sampling = true;
    clock.getDelta(); // discard the whole gate interval
    if (!reducedMotion) renderLoop();
    // The arrival runs from the gate, not from construction: it is the one
    // sequence that must never play under a compile stall, because the whole
    // point of it is that the reader watches it.
    runIntro();
    startIntro?.();
    reportPhases();
  };

  const ready: Promise<void> = new Promise((resolve) => {
    const settle = () => {
      openGate();
      // The reveal delay is unchanged choreography — it is the beat the hero
      // copy waits on, and §1.3 forbids re-timing it. It now runs from the gate
      // rather than from construction, so on a cold start the copy and the
      // field still arrive together instead of the copy waiting out a freeze.
      if (revealDelayMs === 0) resolve();
      else readyTimer = window.setTimeout(resolve, revealDelayMs);
    };

    if (reducedMotion) {
      // §7.3 — explicit branch. The static composition is already authored
      // above; render it once and resolve. No gate, no loop, no sequence.
      requestRender();
      openGate();
      resolve();
      return;
    }

    // Morph attributes are rewritten at every stage boundary. Telling the
    // driver so lets it pick a streaming allocation instead of treating each
    // rewrite as a fresh static upload.
    posAttr.setUsage(THREE.DynamicDrawUsage);
    toAttr.setUsage(THREE.DynamicDrawUsage);
    accentAAttr.setUsage(THREE.DynamicDrawUsage);
    accentBAttr.setUsage(THREE.DynamicDrawUsage);
    posAttr.needsUpdate = true;
    toAttr.needsUpdate = true;
    accentAAttr.needsUpdate = true;
    accentBAttr.needsUpdate = true;

    // §6.4 — hard cap. A gate that never opens is a worse failure than a late
    // start, so this fires regardless of what is still outstanding.
    const capTimer = window.setTimeout(() => {
      if (debugMotion && !gateOpened) {
        console.info(`[particle-scene] compile gate hit the ${COMPILE_GATE_MAX_MS}ms cap — starting anyway`);
      }
      settle();
    }, COMPILE_GATE_MAX_MS);

    const gateStart = performance.now();

    // §6.1 — pre-warm. The directive specifies compileAsync where available and
    // compile() as the fallback; this build takes the fallback deliberately.
    //
    // compileAsync is present in this Three version but is DEFECTIVE against
    // this scene graph: it polls `checkMaterialsReady`, which walks a material
    // Set and dereferences `.isReady` on an entry that is undefined here,
    // throwing `TypeError: Cannot read properties of undefined (reading
    // 'isReady')`. The throw happens inside Three's own polling callback, so it
    // is reachable by neither a try/catch around the call nor a .catch() on the
    // returned promise — it surfaces as an uncaught error and the promise never
    // settles. Verified in-browser across all three routes before switching.
    //
    // compile() links the same programs synchronously and has none of that. It
    // costs one blocking call, which is exactly what the gate exists to absorb:
    // this runs while the field is at zero opacity and nothing is animating.
    const warm: Promise<unknown> = Promise.resolve().then(() => phase("compile", () => {
      try {
        renderer.compile(scene, camera);
        // Both backdrops link their own programs and they are drawn straight to
        // the canvas after the composer, outside the pass chain — so if they
        // are not warmed here their first draw is a link stall in the middle of
        // the arrival, which is the one frame the gate exists to protect.
        renderer.compile(ambientScene, camera);
        renderer.compile(deepScene, camera);
      } catch {
        // A compile failure is not fatal — the frame probe still runs and the
        // cap still fires. Nothing here may prevent the sequence starting.
      }
    }));

    // §6.3 — all three conditions. Fonts are included because a webfont landing
    // mid-sequence reflows the sections the ScrollTriggers are measured against.
    const fonts: Promise<unknown> = document.fonts?.ready ?? Promise.resolve();

    // Neither condition may hang the gate. §6.4's cap is the outer guarantee;
    // this is the inner one, so a compile that never settles still reaches the
    // frame probe instead of burning the full cap on a device that was ready.
    const bounded = <T,>(p: Promise<T>) =>
      Promise.race([p, new Promise((r) => setTimeout(r, COMPILE_GATE_MAX_MS * 0.6))]);

    Promise.all([bounded(warm), bounded(fonts)]).then(() => {
      if (disposed || gateOpened) return;
      // One frame off-timeline: forces the first real draw — texture binds,
      // attribute uploads, the post chain's own targets — while nothing is
      // animating and the field is still at zero opacity.
      requestRender();

      // Two CONSECUTIVE frames within budget before the sequence may start.
      // A device still uploading will miss this and fall through to the cap.
      let clean = 0;
      let last = performance.now();
      const probe = () => {
        if (disposed || gateOpened) return;
        const now = performance.now();
        const frameMs = now - last;
        last = now;
        requestRender();
        clean = frameMs <= FRAME_BUDGET_MS ? clean + 1 : 0;
        if (clean >= 2) {
          if (debugMotion) {
            console.info(`[particle-scene] compile gate cleared in ${Math.round(now - gateStart)}ms`);
          }
          clearTimeout(capTimer);
          settle();
          return;
        }
        gateFrame = requestAnimationFrame(probe);
      };
      gateFrame = requestAnimationFrame(probe);
    });
  });

  // §8.5 — bfcache restore. The page comes back fully built with its uniforms
  // wherever the last session left them, so without this a back-navigation
  // lands on a formed mid-sequence state and nothing re-runs. Reset to stage
  // zero and re-run the gate.
  function handlePageShow(event: PageTransitionEvent) {
    if (!event.persisted || disposed || reducedMotion) return;
    gateOpened = false;
    sampling = false;
    // The arrival has to be re-armed too, or a back-navigation lands on a page
    // whose field is already fully materialised and whose camera is already in.
    introTimeline?.kill();
    gsap.killTweensOf([uIntro, introCam]);
    uIntro.value = 0;
    introCam.value = INTRO.cameraStart;
    if (deepField) {
      gsap.killTweensOf(deepField.material);
      deepField.material.opacity = 0;
    }
    warmupFrames = 0;
    warmupElapsedMs = 0;
    frameSamples.length = 0;
    sampleCursor = 0;
    breachFrames = 0;
    underBudgetFrames = 0;
    if (stages?.length) assembleInto(stages[0]);
    else if (heroShape) assembleInto(heroShape);
    else if (geoStages?.length) {
      uBend.value = geoStages[0].bend;
      uEagleBlend.value = INTRO_STATE_INITIAL.eagleBlend;
      setRoutes(!!geoStages[0].routes);
      assembleGeo();
    }
    requestRender();
    requestAnimationFrame(() => openGate());
  }
  window.addEventListener("pageshow", handlePageShow);

  // Scroll choreography — a deliberate, sparse sequence, supplied per page as
  // a beat list (see SceneConfig). The field only forms a shape at a handful of
  // narrative beats and is faded out everywhere else, so it never competes with
  // content-heavy sections. Every page follows the same grammar: a thesis shape
  // in the hero, one or two development beats, then a resolve into the eagle at
  // the CTA — which is what makes five separate choreographies read as one site.
  // See docs/research/ANIMATION_CHOREOGRAPHY.md.
  // (Horizontal placement `side` is computed above via computeSide() and kept
  // current on resize — see handleResize.)

  // ScrollTriggers created by this scene instance, so dispose() can kill only
  // its own — a blanket ScrollTrigger.getAll() kill would also wipe out
  // triggers owned by other parts of the app.
  const instanceScrollTriggers: ScrollTrigger[] = [];
  // The tweens those triggers drive. Killing a ScrollTrigger leaves its tween
  // alive and still holding the scene's objects, so both sides are tracked and
  // both are killed on teardown — otherwise a route change leaves a scrubbed
  // tween pointing at a disposed scene's THREE objects.
  const instanceTweens: gsap.core.Tween[] = [];

  // Defer ScrollTrigger creation so the DOM exists. Cancelled on dispose, so a
  // scene torn down in the same frame it was created (React Strict Mode's
  // double-mount, or a fast route change) never binds triggers at all.
  const bindFrame = requestAnimationFrame(() => {
    if (disposed) return;

    // Scroll-linked field motion. Bound FIRST, ahead of the mode branches below
    // (each of which returns), so it is available to beat pages and stage pages
    // alike rather than being trapped inside one of them the way `cameraOrbit`
    // is. Defaults to the whole document, which is what a beat page wants: the
    // field should answer the scroll everywhere, not only where a beat sits.
    if (scrollMotion && !reducedMotion) {
      const el = scrollMotion.trigger ? document.querySelector(scrollMotion.trigger) : null;
      const tween = gsap.to(scrollProgress, {
        value: 1,
        ease: EASE.scrub,
        scrollTrigger: {
          trigger: el ?? document.body,
          start: "top top",
          end: "bottom bottom",
          scrub: SCRUB,
          invalidateOnRefresh: true,
        },
      });
      instanceTweens.push(tween);
      if (tween.scrollTrigger) instanceScrollTriggers.push(tween.scrollTrigger);
    }

    // Scroll-linked spatial path. Bound alongside scrollMotion, ahead of the
    // mode branches, for the same reason: it is a property of the page's whole
    // scroll range, not of any one section or mode.
    if (fieldPath > 0 && !reducedMotion) {
      const el = fieldPathTrigger ? document.querySelector(fieldPathTrigger) : null;
      const tween = gsap.to(pathProgress, {
        value: 1,
        ease: EASE.scrub,
        scrollTrigger: {
          trigger: el ?? document.body,
          start: "top top",
          end: "bottom bottom",
          scrub: SCRUB,
          invalidateOnRefresh: true,
        },
      });
      instanceTweens.push(tween);
      if (tween.scrollTrigger) instanceScrollTriggers.push(tween.scrollTrigger);
    }

    // Scrubbed stage sequence. Every morph is bound to real section boundaries
    // and driven by scroll position, so the reader is scrubbing the animation
    // rather than triggering it. Under prefers-reduced-motion none of this is
    // built at all — the field stays on the settled mesh set up above, which is
    // why a reduced-motion reader never sees a shape pop mid-scroll.
    // Both scrubbed modes (position-buffer `stages` and analytic `geoStages`) use
    // the same binding machinery — only what a stage MEANS differs.
    const stageCount = stages?.length ?? geoStages?.length ?? 0;
    if (stageCount > 1 && !reducedMotion) {
      // THE playhead is the SUM of every binding's own 0→1 progress, not the
      // absolute position of whichever binding last fired.
      //
      // Each binding used to write `i + t` directly. Every binding's onUpdate
      // fires during ScrollTrigger.refresh() regardless of whether its range has
      // been reached, so at scroll 0 the LAST binding wrote its own index — a
      // four-stage page opened on stage 3, fully formed, with its links drawn
      // and its assemble already killed. That is the "loads in final form"
      // defect, and it fired on every route on every cold load, refresh and soft
      // navigation, because a refresh is not a scroll event and no amount of
      // scroll-restoration work could reach it.
      //
      // Summing is not a workaround for the refresh: it is the correct model.
      // Binding i owns the timeline interval [i, i+1], so a binding the reader
      // has not reached contributes 0 and one they have scrolled past
      // contributes 1. Inside binding i the sum is exactly `i + t` — identical
      // to the old behaviour while scrolling — and at scroll 0 it is exactly 0,
      // which is what the assemble needs to exist at all.
      const stageT = new Array<number>(stageCount - 1).fill(0);
      const playhead = () => stageT.reduce((a, b) => a + b, 0);
      stageBindings.slice(0, stageCount - 1).forEach((binding, i) => {
        const proxy = { t: 0 };
        const settle = (t: number) => {
          stageT[i] = t;
          setTimelinePos(playhead());
        };
        const tween = gsap.to(proxy, {
          t: 1,
          ease: EASE.scrub,
          scrollTrigger: {
            trigger: binding.trigger,
            endTrigger: binding.endTrigger ?? binding.trigger,
            start: binding.start ?? "top center",
            end: binding.end ?? "center center",
            // Numeric, not `true`. A smoothing coefficient only: keyframes,
            // direction and endpoints are untouched, and restoring `true`
            // reverts it exactly. Raw scrub is what makes a flung scroll read
            // as a jump rather than as the morph being carried.
            scrub: SCRUB,
            // Start and end are measured from live layout, so without this they
            // freeze at first-paint values and drift on every reflow — the
            // reason the morph resolves correctly on the build machine and
            // early or late everywhere else.
            invalidateOnRefresh: true,
            // Clamp on the way out in both directions, so a fast flick or an
            // anchor jump that skips past the range still leaves the timeline on
            // the correct integer stage instead of a stale fraction.
            onLeave: () => settle(1),
            onLeaveBack: () => settle(0),
          },
          onUpdate: () => settle(proxy.t),
        });
        instanceTweens.push(tween);
        if (tween.scrollTrigger) instanceScrollTriggers.push(tween.scrollTrigger);
      });

      // Slow orbital dolly across the page's whole scroll range.
      if (cameraOrbit) {
        const orbitTween = gsap.to(orbit, {
          value: 1,
          ease: EASE.scrub,
          scrollTrigger: {
            trigger: cameraOrbit.trigger,
            start: "top top",
            end: "bottom bottom",
            scrub: SCRUB,
            invalidateOnRefresh: true,
          },
        });
        instanceTweens.push(orbitTween);
        if (orbitTween.scrollTrigger) instanceScrollTriggers.push(orbitTween.scrollTrigger);
      }

      // Regional clusters illuminate in sequence as they scroll into view. Plain
      // enter/enterBack rather than a scrub: a cluster is either the one being
      // discussed or it isn't, and the dip-and-hand-off easing lives in the
      // render loop.
      for (const cue of regionCues) {
        const st = ScrollTrigger.create({
          trigger: cue.trigger,
          start: cue.start ?? "top 65%",
          invalidateOnRefresh: true,
          onEnter: () => setRegion(cue.region),
          onEnterBack: () => setRegion(cue.region),
        });
        instanceScrollTriggers.push(st);
      }

      // A page with stages AND beats (home) falls through to the beat block
      // below, where the beats bind their SIDE EFFECTS only — sweep, ports,
      // opacity — while the scrubbed sequence above owns every shape change.
      // That split is what lets the morph be scroll-driven without giving up
      // the composition: the sweeps still park each form beside the copy column
      // its section was laid out around.
      if (!beats.length) {
        ScrollTrigger.refresh();
        return;
      }
    }
    if (geoStages && reducedMotion) {
      // The one exception to "reduced motion binds nothing": an instant, untweened
      // swap to the eagle at the CTA, so the page still ends on the shared mark.
      const finale = stageBindings[stageBindings.length - 1];
      const eagleStageExists = geoStages.some((g) => g.eagle);
      if (finale && eagleStageExists) {
        const st = ScrollTrigger.create({
          trigger: finale.endTrigger ?? finale.trigger,
          start: finale.end ?? "top center",
          invalidateOnRefresh: true,
          onEnter: () => {
            uEagleBlend.value = 1;
            setRoutes(false);
            requestRender();
          },
          onLeaveBack: () => {
            uEagleBlend.value = 0;
            setRoutes(true);
            requestRender();
          },
        });
        instanceScrollTriggers.push(st);
        ScrollTrigger.refresh();
      }
      return;
    }
    // Reduced motion on a stage page: nothing to bind. A stage page WITH beats
    // still binds nothing under reduced motion — the beats' only remaining jobs
    // are a sweep and an opacity fade, both of which are motion.
    if ((stages || geoStages) && reducedMotion) return;
    if (geoStages) return;

    /**
     * True when a scrubbed stage sequence owns the field's shape. The beats then
     * carry side effects only, and `applyState` must not morph — two systems
     * writing the position buffers would fight, and the discrete one would win
     * whichever frame it fired on.
     */
    const stagesOwnShape = !!stages?.length;

    const sweep = (trigger: string, to: number) => {
      const tween = gsap.to(scene.position, {
        x: to,
        // Explicit `none`. Without it GSAP applies its default power1.out ON TOP
        // of the scrub, double-curving the sweep — the field drifted at one rate
        // under a slow scroll and another under a fast one for exactly this
        // reason.
        ease: EASE.scrub,
        scrollTrigger: {
          trigger,
          scrub: SCRUB,
          start: "top bottom",
          end: "top center",
          invalidateOnRefresh: true,
        },
      });
      instanceTweens.push(tween);
      if (tween.scrollTrigger) instanceScrollTriggers.push(tween.scrollTrigger);
      return tween;
    };

    // Fade the whole field's opacity (used to fully hide it over content-heavy
    // sections and bring it back for the next formation).
    const fade = (opacity: number, dur: number = DURATION.standard) => {
      gsap.killTweensOf(material);
      gsap.to(material, { opacity, duration: dur, ease: EASE.entry });
    };

    const on = (
      trigger: string,
      {
        start = "top center",
        ...handlers
      }: {
        start?: string;
        onEnter?: () => void;
        onEnterBack?: () => void;
        onLeave?: () => void;
        onLeaveBack?: () => void;
      }
    ) => {
      const st = ScrollTrigger.create({ trigger, start, invalidateOnRefresh: true, ...handlers });
      instanceScrollTriggers.push(st);
      return st;
    };

    // Drive the page's beat list.
    //
    // Beat state is DERIVED, never latched. Each beat resolves to a COMPLETE
    // field state — shape + opacity + ports — inheriting anything it doesn't
    // name from the beat before it, with the hero shape as the base. Then:
    //
    //   onEnter / onEnterBack → this beat's state
    //   onLeaveBack           → the PREVIOUS beat's state (hero for beat 0)
    //
    // which makes the whole sequence reversible by construction. The earlier
    // version only ever applied a beat forward and had no way to undo the
    // shape it replaced, so the home hero morphed globe→vessel on the way down
    // and then stayed a vessel forever on the way back up. `onLeaveBack` on a
    // beat is now an OVERRIDE layered on that restored state, not the only
    // thing that happens on the way out.
    interface BeatState {
      shape?: Shape;
      opacity: number;
      ports: boolean;
      fadeDuration?: number;
    }

    // The state the field is in before any beat has fired: the hero shape, at
    // full field opacity, ports down (portsMode starts false).
    const baseState: BeatState = { shape: heroShape, opacity: fieldOpacity, ports: false };

    const states: BeatState[] = [];
    for (const beat of beats) {
      const shape = beat.shape ? shapes.get(beat.shape) : undefined;
      if (beat.shape && !shape) {
        // A beat naming a shape the registry didn't build would silently show
        // the previous formation — loud enough to catch in dev, harmless live.
        console.warn(`particle-scene: beat "${beat.trigger}" wants unbuilt shape "${beat.shape}"`);
      }
      const prev = states[states.length - 1] ?? baseState;
      states.push({
        // A beat with no `shape` holds whatever the last one formed.
        shape: shape ?? prev.shape,
        opacity: beat.opacity ?? 1,
        ports: !!beat.ports,
        fadeDuration: beat.fadeDuration,
      });
    }

    const applyState = (state: BeatState) => {
      if (state.ports) showPorts();
      else hidePorts();
      fade(capOpacity(state.opacity), state.fadeDuration);
      if (state.shape && !stagesOwnShape) morphTo(state.shape);
    };

    beats.forEach((beat, i) => {
      if (beat.sweep !== undefined) sweep(beat.trigger, side * beat.sweep);

      const back = states[i - 1] ?? baseState;
      const override = beat.onLeaveBack;
      const backState: BeatState = override
        ? {
            shape: back.shape,
            opacity: override.opacity ?? back.opacity,
            ports: override.ports ?? back.ports,
            fadeDuration: override.fadeDuration ?? back.fadeDuration,
          }
        : back;

      on(beat.trigger, {
        start: beat.start,
        onEnter: () => applyState(states[i]),
        onEnterBack: () => applyState(states[i]),
        onLeaveBack: () => applyState(backState),
      });

      // The port network's own reveal. SCRUBBED across the section that shows
      // it, so the cities light one at a time under the reader's scroll — the
      // beat above only decides that the overlay is up, never how much of it.
      if (beat.ports && portSprites.length) {
        const tween = gsap.to(portsRevealedProxy, {
          value: portSprites.length,
          ease: EASE.scrub,
          scrollTrigger: {
            trigger: beat.trigger,
            start: "top 85%",
            end: "bottom center",
            scrub: SCRUB,
            invalidateOnRefresh: true,
          },
          onUpdate: () => {
            portsRevealed = portsRevealedProxy.value;
          },
        });
        instanceTweens.push(tween);
        if (tween.scrollTrigger) instanceScrollTriggers.push(tween.scrollTrigger);
      }
    });

    ScrollTrigger.refresh();
  });

  // ── Initial-load robustness ────────────────────────────────────────────────
  // The canvas mounts asynchronously and the page keeps reflowing after first
  // paint (web fonts swap in, images/hero pin resize, the preloader releases
  // scroll). So the canvas size and every scroll-trigger position computed above
  // are stale on load — which is exactly why a manual window resize "fixed" the
  // globe. Replay that resize automatically at each moment the layout can still
  // change, so it lands correct on load at any display size, no interaction.
  const settleTimers: number[] = [];
  const resync = () => {
    if (disposed) return;
    handleResize(); // camera aspect + renderer size + fitScale + re-place globe
    ScrollTrigger.refresh(); // recompute every pin/scrub start–end position
  };
  if (document.readyState === "complete") {
    settleTimers.push(window.setTimeout(resync, 0));
  } else {
    window.addEventListener("load", resync, { once: true });
  }
  // Web fonts reflow headings (which move the pinned sections) — refresh once
  // they're ready.
  document.fonts?.ready.then(resync).catch(() => {});
  // Safety net for anything that settles slightly later (images, preloader).
  settleTimers.push(window.setTimeout(resync, 400));
  settleTimers.push(window.setTimeout(resync, 1200));

  return {
    domElement: canvas,
    ready,
    dispose() {
      disposed = true;
      if (readyTimer) clearTimeout(readyTimer);
      settleTimers.forEach((t) => clearTimeout(t));
      window.removeEventListener("load", resync);
      window.removeEventListener("pageshow", handlePageShow);
      // The compile gate's probe loop is its own rAF chain, separate from the
      // render loop's — a scene torn down mid-gate (Strict Mode double-mount, a
      // fast route change) must cancel both or the probe keeps rendering into a
      // disposed renderer.
      if (gateFrame) cancelAnimationFrame(gateFrame);
      cancelAnimationFrame(animId);
      releaseResize();
      window.removeEventListener("pointermove", handlePointer);
      window.removeEventListener("pointerdown", handleDragStart);
      window.removeEventListener("pointerup", handleDragEnd);
      window.removeEventListener("pointercancel", handleDragEnd);
      tradeArcs?.dispose();
      canvas.removeEventListener("webglcontextlost", onContextLost, false);
      canvas.removeEventListener("webglcontextrestored", onContextRestored, false);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      // Not composer.dispose(): it also disposes Pass.fullscreenGeometry, a
      // static triangle shared by every EffectComposer on the page — doing
      // so here would break any composer created after this one remounts
      // (e.g. navigating back to this route). Dispose only what this
      // instance owns.
      if (composer) {
        composer.passes.forEach((pass) => pass.dispose());
        composer.inputBuffer?.dispose();
        composer.outputBuffer?.dispose();
      }
      renderer.dispose();
      // dispose() frees Three's own GPU resources but leaves the WebGL context
      // itself alive and attached to the (now detached) canvas. Browsers cap
      // live contexts at ~16 — six route navigations each leaking one is how a
      // later navigation fails in a way that looks exactly like a shader bug.
      // forceContextLoss is the only way to hand it back.
      renderer.forceContextLoss();
      geometry.dispose();
      material.dispose();
      if (ambient) {
        gsap.killTweensOf(ambient.material);
        ambientScene.remove(ambient.points);
        ambient.geometry.dispose();
        ambient.material.dispose();
      }
      if (deepField) {
        gsap.killTweensOf(deepField.material);
        deepScene.remove(deepField.points);
        deepField.geometry.dispose();
        deepField.material.dispose();
      }
      introTimeline?.kill();
      linkMesh?.geometry.dispose();
      linkMaterial?.dispose();
      // Port-globe overlay: dispose each label/arc's own geometry + material
      // (and its unique canvas texture — but not the shared particle `texture`,
      // freed once below).
      portGroup?.traverse((o) => {
        const obj = o as THREE.Mesh & THREE.Line & THREE.Sprite;
        obj.geometry?.dispose?.();
        const m = obj.material as THREE.Material & { map?: THREE.Texture | null };
        if (m) {
          if (m.map && m.map !== texture) m.map.dispose();
          m.dispose();
        }
      });
      texture.dispose();
      perfHud?.dispose();
      // Every GSAP object this instance owns: the morph/fade/sweep tweens it
      // fired imperatively (killed by target) and the scroll-driven ones it
      // tracked. Left alive, these keep writing into a disposed scene's THREE
      // objects after a route change.
      cancelAnimationFrame(bindFrame);
      gsap.killTweensOf([
        morphProgress,
        uBurstT,
        material,
        scene.position,
        orbit,
        uIntro,
        introCam,
        pathProgress,
      ]);
      instanceTweens.forEach((t) => t.kill());
      instanceScrollTriggers.forEach((st) => st.kill());
    },
  };
}

