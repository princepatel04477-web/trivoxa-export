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
  BURST,
  CHROME_HEIGHT_TOLERANCE_PX,
  COUNT_STEP,
  CURSOR,
  DEGRADE_WINDOW_FRAMES,
  DPR_STEP,
  DURATION,
  EASE,
  EASE_MORPH_ARRIVAL,
  FRAGMENT_BUDGET,
  FRAME_BUDGET_MS,
  FRAMING_MARGIN,
  PARTICLES,
  PERIOD,
  POINT_SIZE_MAX_CSS_PX,
  POINT_SIZE_MIN_CSS_PX,
  POINT_WORLD_SIZE,
  RECOVER_WINDOW_FRAMES,
  SCRUB,
  VIGNETTE,
  WARMUP_SECONDS,
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
  return Math.round(THREE.MathUtils.clamp(raw, PARTICLES.MIN, PARTICLES.MAX));
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

/** One trade lane on the ports globe: a bulging arc from Surat to a hub plus a
 * light "packet" sprite that travels along it, looping. */
interface ArcAnim {
  line: THREE.Line;
  packet: THREE.Sprite;
  curve: THREE.QuadraticBezierCurve3;
  speed: number;
  off: number;
}

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
  buildStages?: (ctx: ShapeContext) => Shape[] | Promise<Shape[]>;
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
  const camera = new THREE.PerspectiveCamera(35, width / height, 1, 10000);
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

  // The globe is built here rather than through the registry because it also
  // produces the per-particle layer attribute the shader's Layer-B dimming and
  // depth cueing read. Pages that never show it skip the work entirely — it is
  // the most expensive shape by far (tens of thousands of Fibonacci points
  // tested against the continent rings).
  const globeBuilt = shapeKeys.has("globe") ? buildGlobeShape(shapeCtx) : null;

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
  const uProgress = { value: 1 };
  const uStagger = { value: 0 };
  // Morph burst amplitude, 0..1. Scales the whole BURST envelope, so a single
  // float turns the swell on for travelling morphs and off for the states where
  // it would be wrong: the hero assemble (grains are arriving from scatter — a
  // burst on top of that is just more scatter), reduced motion, and geo pages
  // (the unwrap is a rigid projection; blowing it apart destroys the read).
  const uBurst = { value: 0 };
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
  const uBurstT = { value: 0 };
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
  const uBend = { value: 1 };
  /** 0 = the page's own form, 1 = fully converged into the shared eagle mark. */
  const uEagleBlend = { value: 0 };
  /** Sphere radius / plane scale in world units per radian (isometric unwrap). */
  const uGeoR = { value: globeRadius };
  const uActiveRegion = { value: 0 };
  /** 0 = no highlight (everything at full), 1 = highlight in force. Eased. */
  const uRegionActive = { value: 0 };

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
  const uAspect = { value: 1 };
  // Ambient idle drift amplitude in world units, eased toward the active stage's
  // own value so a deliberately loose stage disperses without a jump.
  const uDrift = { value: 0 };

  // Point-size floor and ceiling, in DEVICE pixels — the CSS-pixel figures from
  // the motion config times the clamped ratio, so apparent grain size is the
  // same on a DPR-1 monitor and a DPR-3 phone.
  //
  // Three already attenuates by (scale / -mvPosition.z) with scale =
  // drawingBufferHeight * 0.5, which is the resolution-independent term the
  // directive specifies. What was missing is the CEILING: uncapped, a near
  // particle on a high-DPR handset draws an enormous sprite, costing a great
  // deal of fill for no visual gain.
  const uPointMin = { value: 1 };
  const uPointMax = { value: 1 };
  const syncPointSize = () => {
    const ratio = renderer.getPixelRatio();
    uPointMin.value = POINT_SIZE_MIN_CSS_PX * ratio;
    uPointMax.value = POINT_SIZE_MAX_CSS_PX * ratio;
  };
  syncPointSize();

  const material = new THREE.PointsMaterial({
    // Identity white. Every scene supplies a `palette`, so the fragment shader
    // takes its colour from the resolved tokens (vTint) and ignores `diffuse`.
    color: 0xffffff,
    size: lightGround ? POINT_WORLD_SIZE.light : POINT_WORLD_SIZE.dark,
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
    shader.uniforms.uAspect = uAspect;
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
        uniform float uAspect;
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
        vec3 transformed = mix(unwrap(aGeo, uBend), aEagle, uEagleBlend);
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
        float burst = tvxBurst(uBurstT) * uBurst;
        transformed *= 1.0 + burst * ${BURST.radial.toFixed(3)};
        transformed += tvxScatterDir(aPhase) * burst * ${BURST.scatter.toFixed(3)};
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
        vAlpha = shimmer * depthOpac * layerDim * regionDim * (1.0 - burst * ${BURST.fade.toFixed(3)});`
      )
      // Fold the far-hemisphere size cue into PointsMaterial's own size
      // assignment (which runs after <project_vertex>, so an earlier
      // gl_PointSize *= would be overwritten). depthSize is in scope here.
      // Thin the grains at the burst peak too — a dispersing cloud loses
      // density, it does not scale up as a unit.
      .replace(
        "gl_PointSize = size;",
        `gl_PointSize = size * depthSize * (1.0 - burst * ${BURST.thin.toFixed(3)});`
      )
      // Clamped AFTER Three's own size attenuation (which lives between
      // gl_PointSize = size and this chunk), so the ceiling actually binds.
      .replace(
        "#include <clipping_planes_vertex>",
        `#include <clipping_planes_vertex>
        gl_PointSize = clamp(gl_PointSize, uPointMin, uPointMax);

        // Per-particle cursor displacement, in SCREEN space rather than world
        // space. World-space repulsion would reach further on a particle that
        // happens to sit nearer the camera, so the effect would change size as
        // the form rotates; in screen space the reach is exactly what the
        // reader sees. Aspect-corrected, or the falloff is an ellipse on any
        // window that is not square.
        if (uCursorPush != 0.0 && gl_Position.w > 0.0) {
          vec2 ndc = gl_Position.xy / gl_Position.w;
          vec2 away = (ndc - uCursor) * vec2(uAspect, 1.0);
          float dist = length(away);
          // Gaussian falloff — no edge. A linear or smoothstep falloff draws a
          // visible circle in the field where the effect stops.
          float fall = exp(-(dist * dist) / (uCursorRadius * uCursorRadius));
          vec2 dir = dist > 0.0001 ? away / dist : vec2(0.0);
          gl_Position.xy += dir * uCursorPush * fall * gl_Position.w;
        }`
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
  const CAMERA_BASE_Z = camera.position.z; // captured before any orbit dolly
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

  // Horizontal offset for the globe / formations. Placed at a consistent
  // fraction of the visible half-width (so the composition reads the same on
  // every aspect ratio) AND clamped so the globe is always fully on-screen —
  // never cut off on a narrow laptop, never stranded in dead space on an
  // ultrawide. Recomputed on resize so opening the site at any window size (or
  // resizing it) lands the field in the right place instead of a stale offset.
  const computeSide = (): number => {
    const w = canvasWidth();
    const h = canvasHeight();
    if (w <= 575) return 0; // mobile: centred, no side offset
    // Visible half-width in world units at the globe's depth.
    const halfW = Math.tan((35 * Math.PI) / 180 / 2) * camera.position.z * (w / h);
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
  const centred = !!buildStages || geoMode;
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
    const frozenScatter = frozenBurst * BURST.scatter;
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
  const CAMERA_Z = camera.position.z;
  const orbitSweep = (cameraOrbit?.sweepDeg ?? 26) * (Math.PI / 180);
  const orbitDolly = cameraOrbit?.dolly ?? 5;
  // A planar lattice takes its parallax on the camera (±2°), not on the holder —
  // rotating a flat form toward the cursor would shear it.
  const CAMERA_PARALLAX = 2 * (Math.PI / 180);

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
  const arcs: ArcAnim[] = []; // Surat → hub trade lanes on the ports globe
  const _wp = new THREE.Vector3();
  const _cp = new THREE.Vector3();
  // Pointer parallax — the globe subtly leans toward the cursor.
  const pointer = { x: 0, y: 0 };
  const pointerTarget = { x: 0, y: 0 };
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
  let overBudgetFrames = 0;
  let underBudgetFrames = 0;
  let warmupElapsed = 0;
  let degraded = false;
  /** Particles actually drawn. Rung 2 trims the draw range; the pool is untouched. */
  let drawCount = count;

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
    const delta = Math.min(rawDelta, 0.05);
    const dt60 = delta * 60; // frames-equivalent, for the old per-frame rates

    // Backdrop turns on its own slow axis, independent of the form's spin — two
    // different rates at two different depths is what sells the parallax.
    if (ambient) ambient.points.rotation.y += AMBIENT.spinY * delta;

    if (onDegrade && !degraded) {
      warmupElapsed += rawDelta;
      if (warmupElapsed > WARMUP_SECONDS) {
        if (rawDelta * 1000 > FRAME_BUDGET_MS) {
          overBudgetFrames++;
          underBudgetFrames = 0;
          if (overBudgetFrames >= DEGRADE_WINDOW_FRAMES && rung < LADDER_TOP) {
            overBudgetFrames = 0;
            rung++;
            applyRung();
          }
        } else {
          underBudgetFrames++;
          overBudgetFrames = 0;
          if (underBudgetFrames >= RECOVER_WINDOW_FRAMES && rung > 0) {
            underBudgetFrames = 0;
            rung--;
            applyRung();
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
    // NDC has +Y up; the pointer is tracked in CSS coordinates, where +Y is
    // down. Without the flip the field pushes away from the reflection of the
    // cursor across the horizon, which reads as the effect being broken rather
    // than inverted.
    uCursor.value.set(pointer.x, -pointer.y);
    uAspect.value = canvasWidth() / Math.max(1, canvasHeight());
    // Reduced motion keeps the field still: a form that lunges at the pointer is
    // exactly the kind of unrequested movement the preference exists to stop.
    uCursorPush.value = reducedMotion ? 0 : CURSOR.push;

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
      points.rotation.y = (Math.PI / 2) * uBend.value;

      if (!reducedMotion) {
        // Idle spin fades out with the bend — a spinning flat map is nonsense.
        // Drag coasts down on release instead of stopping dead. The two are kept
        // in separate accumulators so a drag never fights the idle rotation.
        idleSpin += IDLE_OMEGA * uBend.value * delta;
        if (!dragging) {
          dragOffset += dragVel * dt60;
          dragVel *= Math.pow(0.94, dt60);
        }
        spin.rotation.y = idleSpin + dragOffset;
        // Axial tilt and cursor parallax are also sphere reads; both ease away
        // as it flattens so the map ends up square to the camera.
        holder.rotation.z += (AXIAL_TILT * uBend.value - holder.rotation.z) * kSettle;
        holder.rotation.x +=
          (pointer.y * PARALLAX_MAX * uBend.value - holder.rotation.x) * kParallax;
      } else {
        holder.rotation.set(0, 0, 0);
      }

      // Uniform scale down as it flattens, so the ~2π·R-wide map frames cleanly.
      const geoScale = formationScale * (GEO_FLAT_SCALE + (1 - GEO_FLAT_SCALE) * uBend.value);
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
        points.rotation.y += IDLE_OMEGA * (portsMode ? 0.75 : 1) * delta;
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
      const radius = CAMERA_Z - orbitDolly * orbit.value;
      camera.position.x = Math.sin(angle) * radius;
      camera.position.z = Math.cos(angle) * radius;
      // radius × the angle is the small-angle arc length, so this is a true ±2°
      // vertical offset rather than an arbitrary world-unit nudge.
      camera.position.y = -pointer.y * CAMERA_PARALLAX * radius;
      camera.lookAt(0, 0, 0);
    }

    // No per-frame position write: the morph is a vertex-shader mix of the two
    // stage buffers, so the only per-frame CPU cost is the uProgress uniform
    // that GSAP or the scroll scrub already set.

    // Port labels: fade each toward its target only when it faces the camera
    // (front hemisphere), so labels on the far side of the globe don't show
    // through. Cheap — at most ~7 sprites. Hides the group once fully faded.
    if (portGroup && portGroup.visible) {
      points.getWorldPosition(_cp);
      _cp.project(camera);
      let anyVisible = false;
      for (const s of portSprites) {
        s.getWorldPosition(_wp);
        _wp.project(camera);
        const front = _wp.z < _cp.z; // nearer to camera than the globe centre
        const want = portsMode && front ? 1 : 0;
        const m = s.material as THREE.SpriteMaterial;
        m.opacity += (want - m.opacity) * kSettle;
        if (m.opacity > 0.01) anyVisible = true;
      }
      // Trade-lane arcs + travelling packets. Arcs fade in with the globe; each
      // packet advances along its curve and fades by hemisphere so back-of-globe
      // dots don't show through.
      const arcTarget = portsMode ? 1 : 0;
      for (const a of arcs) {
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
    if (material.opacity <= BLANK_ALPHA && !portGroup?.visible && !tradeArcs?.group.visible) {
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
      if (ambient) {
        const prevAutoClear = renderer.autoClear;
        renderer.autoClear = false;
        renderer.render(ambientScene, camera);
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
  renderLoop();

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
      overBudgetFrames = 0;
      underBudgetFrames = 0;
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
  const shapes = await buildShapes(shapeKeys, shapeCtx);
  if (globeBuilt) shapes.set("globe", globeBuilt.shape);

  // Built at the scene's own pool size, so every stage is morph-compatible with
  // the shared buffers regardless of which device tier we landed on.
  const stages = buildStages ? await buildStages(shapeCtx) : undefined;

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
    for (const c of CITIES) {
      if (c.origin) continue;
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
      portGroup.add(line);
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
      portGroup.add(packet);
      arcs.push({ line, packet, curve, speed: 0.16 + Math.random() * 0.12, off: Math.random() });
    }
    points.add(portGroup);
  }

  const showPorts = () => {
    if (portGroup) portGroup.visible = true;
    portsMode = true;
  };
  const hidePorts = () => {
    portsMode = false; // render loop fades the sprites out, then hides the group
  };

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
    currentFlat = !!b.flat;
    currentIsGlobe = false;
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

  function setTimelinePos(t: number) {
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
    uBurstT.value = uProgress.value;

    // Drift is interpolated between the two stages being blended, so the closing
    // stage's loose wander arrives gradually rather than switching on.
    const dA = stages[i].drift ?? 0;
    const dB = stages[i + 1].drift ?? 0;
    driftTarget = dA + (dB - dA) * uProgress.value;
    const sA = stages[i].spinY ?? 0;
    const sB = stages[i + 1].spinY ?? 0;
    spinYTarget = sA + (sB - sA) * uProgress.value;

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
    targets.set(shape.data);
    posAttr.needsUpdate = true;
    toAttr.needsUpdate = true;
    delayAttr.needsUpdate = true;
    uStagger.value = 1;
    uProgress.value = 0;
    // No burst on the assemble. The grains are already arriving from a random
    // shell — swelling them outward mid-flight just reads as more scatter, and
    // it fights the settling the stagger window exists to create.
    uBurst.value = 0;

    material.opacity = 0;
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
    gsap.to(morphProgress, { value: 1, duration: PERIOD.assemble, ease: EASE.scrub });
  }

  let revealDelayMs = 0;

  // Initial state. (Caller signals preloader-done once this instance's promise
  // resolves — see ParticleCanvas.tsx.)
  if (geoStages?.length) {
    material.opacity = heroOpacity;
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
    } else {
      // Settle on stage 0 — the globe.
      uBend.value = geoStages[0].bend;
      driftTarget = geoStages[0].drift ?? 0;
      setRoutes(!!geoStages[0].routes);
    }
    currentIsGlobe = false; // geo mode drives uGlobe from bend directly
    currentFlat = false;
  } else if (stages?.length) {
    if (reducedMotion) {
      // Reduced motion settles on the LAST stage, which is the shared eagle
      // finale on every page — the closing signature, static. No assemble, no
      // scroll morph, no drift; the trigger branch below is skipped entirely.
      const settled = stages[stages.length - 1];
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

  let readyTimer = 0;
  const ready: Promise<void> = new Promise((resolve) => {
    if (revealDelayMs === 0) {
      resolve();
      return;
    }
    readyTimer = window.setTimeout(resolve, revealDelayMs);
  });

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
    // Scrubbed stage sequence. Every morph is bound to real section boundaries
    // and driven by scroll position, so the reader is scrubbing the animation
    // rather than triggering it. Under prefers-reduced-motion none of this is
    // built at all — the field stays on the settled mesh set up above, which is
    // why a reduced-motion reader never sees a shape pop mid-scroll.
    // Both scrubbed modes (position-buffer `stages` and analytic `geoStages`) use
    // the same binding machinery — only what a stage MEANS differs.
    const stageCount = stages?.length ?? geoStages?.length ?? 0;
    if (stageCount > 1 && !reducedMotion) {
      stageBindings.slice(0, stageCount - 1).forEach((binding, i) => {
        const proxy = { t: 0 };
        const settle = (t: number) => setTimelinePos(i + t);
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

      ScrollTrigger.refresh();
      return; // stage pages don't use the beat system below
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
    if (stages || geoStages) return; // reduced motion on a stage page: nothing to bind

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
      if (state.shape) morphTo(state.shape);
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
      gsap.killTweensOf([morphProgress, uBurstT, material, scene.position, orbit]);
      instanceTweens.forEach((t) => t.kill());
      instanceScrollTriggers.forEach((st) => st.kill());
    },
  };
}

