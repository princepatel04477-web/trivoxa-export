/**
 * Single source of truth for "what class of hardware is this, and how much
 * fragment work may a surface spend on it".
 *
 * Every WebGL and 2D canvas surface on the site consumes this module. Nothing
 * decides its own render budget locally — that is how the site ended up with
 * three different DPR policies and a phone in landscape being served the
 * desktop post-processing chain.
 *
 * The critical distinction this module draws, and which viewport width alone
 * cannot: a 844px-wide viewport is a *phone in landscape*, not a tablet. Width
 * is a layout signal. It is not a hardware signal. Classification here reads
 * the SHORTEST viewport edge (which is orientation-invariant) together with
 * pointer coarseness, so a device keeps its class when it is rotated.
 */

export type DeviceClass = "mobile" | "tablet" | "desktop";

/** Breakpoint ladder rungs, in px. See §3.1 of the mobile directive. */
export const BREAKPOINT = {
  /** up to 389 — small handsets */
  xs: 390,
  /** 390–429 — baseline handset, the design target */
  sm: 430,
  /** 430–767 — large handsets, landscape phones */
  md: 768,
  /** 768–1023 — tablet portrait */
  lg: 1024,
} as const;

/**
 * DPR ceilings per class.
 *
 * Uncapped DPR was the single largest cost in the mobile profile: a DPR-3
 * handset renders 9× the fragments of a DPR-1 one for a difference no eye can
 * resolve on a 6" panel. 1.5 is the point past which additional device pixels
 * stop buying perceptible sharpness on a hand-held display.
 */
const MAX_DPR: Record<DeviceClass, number> = {
  mobile: 1.5,
  tablet: 1.75,
  desktop: 2,
};

let cached: DeviceClass | null = null;

/** True when the primary input is a finger rather than a mouse. */
export function isTouchPrimary(): boolean {
  if (typeof window === "undefined" || typeof window.matchMedia !== "function") return false;
  return window.matchMedia("(pointer: coarse)").matches;
}

/**
 * The device's hardware class, resolved once per session.
 *
 * Not recomputed on resize or rotation by design — a phone does not become a
 * tablet when it is turned sideways, and re-tiering mid-session would mean
 * reallocating every renderer's backing store on an address-bar collapse.
 */
export function deviceClass(): DeviceClass {
  if (cached) return cached;
  if (typeof window === "undefined") return "desktop"; // SSR: never gate on this

  if (isTouchPrimary()) {
    // Touch: classify on the SHORTEST edge, so orientation cannot change the
    // answer. A 390×844 handset reports 390 whether it is held upright or
    // sideways, and therefore keeps its budget when it is rotated.
    const shortEdge = Math.min(window.innerWidth, window.innerHeight);
    cached = shortEdge < BREAKPOINT.md ? "mobile" : shortEdge < BREAKPOINT.lg ? "tablet" : "desktop";
  } else {
    // Pointer: classify on WIDTH alone. A desktop window's height is a user
    // choice, not a hardware fact — a 1440×600 window is a short window on a
    // real GPU, and taking its shortest edge would demote an approved desktop
    // session to the mobile budget.
    cached = window.innerWidth < BREAKPOINT.md ? "mobile" : "desktop";
  }

  return cached;
}

/** True on phones and landscape phones. The gate for every mobile budget. */
export function isMobileDevice(): boolean {
  return deviceClass() === "mobile";
}

/* ============================================================================
   RENDER TIER (§4.2)

   `deviceClass()` above answers "what kind of hardware is this". The tier
   answers the different question "how much work may a surface actually spend",
   which is not the same thing: a mid-tier Android and a flagship are both
   `mobile`, and one of them can carry three times the geometry of the other.

   ONE resolver, exported from one module, consumed by every WebGL surface.
   The directive is explicit that components must not each decide for
   themselves — that is how the site previously ended up with three different
   DPR policies.
   ============================================================================ */

export type RenderTier = "high" | "mid" | "low" | "static";

/** Descending order, so demotion is `TIER_ORDER[index + 1]`. */
const TIER_ORDER: RenderTier[] = ["high", "mid", "low", "static"];

/** Where a session's runtime demotion is remembered. */
const DEMOTION_KEY = "trivoxa:tier-demotions";

/**
 * §4.2's runtime probe: p95 frame time over the first 90 frames after mount.
 * Above 20ms (the 50fps floor) the device is demoted one tier and STAYS
 * demoted for the session — including across route changes, which is what the
 * sessionStorage persistence is for. Re-running the penalty on every route
 * would mean paying 90 frames of bad performance repeatedly to relearn a fact
 * already established.
 */
const PROBE_FRAMES = 90;
const PROBE_P95_BUDGET_MS = 20;

function storedDemotions(): number {
  if (typeof sessionStorage === "undefined") return 0;
  try {
    return Number(sessionStorage.getItem(DEMOTION_KEY)) || 0;
  } catch {
    // Private mode / disabled storage: run undemoted rather than throwing. The
    // frame-budget monitor in particle-scene remains the hard safety net.
    return 0;
  }
}

function persistDemotion(count: number): void {
  if (typeof sessionStorage === "undefined") return;
  try {
    sessionStorage.setItem(DEMOTION_KEY, String(count));
  } catch {
    /* nothing to do — see storedDemotions() */
  }
}

/** True when the user has asked the OS or the browser to spend less data. */
function saveData(): boolean {
  const c = (navigator as Navigator & { connection?: { saveData?: boolean } }).connection;
  return c?.saveData === true;
}

/**
 * The base tier, before any runtime demotion — a pure function of the device's
 * declared capability and the user's stated preferences.
 */
function baseTier(): RenderTier {
  if (typeof window === "undefined") return "high"; // SSR: never gate on this

  // STATIC is a user instruction, not a measurement, so it outranks everything
  // and cannot be climbed out of by a fast GPU.
  if (prefersReducedMotion() || saveData()) return "static";

  const nav = navigator as Navigator & { deviceMemory?: number };
  const cores = nav.hardwareConcurrency ?? 4;
  // deviceMemory is Chromium-only. Safari and Firefox report undefined, and
  // treating that as 0 would demote every iPhone on the site to LOW — so it
  // reads as "unknown, assume the mid-tier floor" exactly as gpu-capability.ts
  // already does.
  const memory = nav.deviceMemory ?? 4;

  if (deviceClass() === "desktop") return "high";

  // §4.2's thresholds verbatim.
  if (memory >= 8 && cores >= 8) return "high";
  if (memory >= 4) return "mid";
  return "low";
}

let tierCache: RenderTier | null = null;

/**
 * The tier this session renders at. Resolved once, then held: re-tiering
 * mid-session would mean reallocating every renderer's backing store, and a
 * device does not change what it is.
 */
export function renderTier(): RenderTier {
  if (tierCache) return tierCache;
  const base = baseTier();
  // A demotion recorded earlier in the session applies immediately, so the
  // second route does not have to rediscover it.
  const index = Math.min(
    TIER_ORDER.indexOf(base) + storedDemotions(),
    TIER_ORDER.length - 1
  );
  tierCache = TIER_ORDER[index];
  return tierCache;
}

/** Demote one tier and remember it for the rest of the session. */
export function demoteTier(): RenderTier {
  const current = renderTier();
  // STATIC is the floor, and a session already there has nothing to give back.
  if (current === "static") return current;
  persistDemotion(storedDemotions() + 1);
  tierCache = TIER_ORDER[Math.min(TIER_ORDER.indexOf(current) + 1, TIER_ORDER.length - 1)];
  return tierCache;
}

/**
 * §4.2's runtime probe. Feed it every frame's duration; it samples the first
 * PROBE_FRAMES and then demotes once if the p95 missed the budget.
 *
 * p95 rather than a mean because the mean hides exactly the failure that
 * matters — a scene holding 60fps with a 40ms hitch every twelfth frame reads
 * as smooth on average and as stuttering to a person.
 *
 * Returns a `sample(ms)` function; calling it after the verdict is a no-op, so
 * callers can hand it every frame without their own bookkeeping.
 */
export function createFrameProbe(onDemote?: (tier: RenderTier) => void): (ms: number) => void {
  const samples: number[] = [];
  let done = false;

  return (ms: number) => {
    if (done) return;
    // A frame that took longer than a quarter second is a tab switch, a GC
    // pause or a debugger break, not a rendering cost. Including it would let
    // a single background moment demote a capable device for the session.
    if (ms > 250) return;
    samples.push(ms);
    if (samples.length < PROBE_FRAMES) return;

    done = true;
    samples.sort((a, b) => a - b);
    const p95 = samples[Math.floor(samples.length * 0.95)];
    if (p95 > PROBE_P95_BUDGET_MS) {
      const next = demoteTier();
      onDemote?.(next);
    }
  };
}

/**
 * §4.3's budget table, as a multiplier on the desktop instance count.
 * LOW keeps 15% rather than dropping to the poster outright — the poster is
 * what STATIC is for, and what the frame-budget monitor escalates to.
 */
export const TIER_PARTICLE_SCALE: Record<RenderTier, number> = {
  high: 1,
  mid: 0.35,
  low: 0.15,
  static: 0,
};

/** §4.3 — post-processing is off from MID down. */
export function tierAllowsPostProcessing(tier: RenderTier = renderTier()): boolean {
  return tier === "high";
}

/** §4.5 — simultaneous animated trade-route arcs. */
export const TIER_MAX_ARCS: Record<RenderTier, number> = {
  high: Infinity,
  mid: 6,
  low: 3,
  static: 0,
};

/** §4.5 — "Disable auto-rotate on LOW; the user drags or it sits still." */
export function tierAllowsAutoRotate(tier: RenderTier = renderTier()): boolean {
  return tier === "high" || tier === "mid";
}

/** §4.3 — LOW and STATIC render the poster frame instead of a live scene. */
export function tierRendersPoster(tier: RenderTier = renderTier()): boolean {
  return tier === "static";
}

/** The DPR ceiling for this device, already intersected with its real DPR. */
export function pixelRatio(scale = 1): number {
  if (typeof window === "undefined") return 1;
  const dpr = window.devicePixelRatio || 1;
  return Math.min(dpr, MAX_DPR[deviceClass()]) * scale;
}

/** Applies the clamped ratio to a THREE.WebGLRenderer-shaped object. */
export function clampPixelRatio(
  renderer: { setPixelRatio(value: number): void },
  scale = 1
): number {
  const ratio = pixelRatio(scale);
  renderer.setPixelRatio(ratio);
  return ratio;
}

/** `prefers-reduced-motion: reduce`, read synchronously. */
export function prefersReducedMotion(): boolean {
  if (typeof window === "undefined" || typeof window.matchMedia !== "function") return false;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

/**
 * Cancels a RAF loop whenever `element` is off-screen or the tab is hidden,
 * and resumes it on re-entry. Returns a disposer.
 *
 * `start` must be idempotent — it is called on every resume — and is
 * responsible for scheduling the next frame itself. `stop` cancels the
 * outstanding frame.
 *
 * Both conditions are folded into one gate so a canvas that scrolls off-screen
 * while the tab is hidden does not resume on tab-focus alone.
 */
export function suspendWhenOffscreen(
  element: Element,
  start: () => void,
  stop: () => void
): () => void {
  // Starts stopped: the observer fires synchronously on observe(), and that
  // first callback is what starts the loop if the element is already on screen.
  // Initialising to `true` here would make that first sync a no-op and the loop
  // would never begin.
  let visible = !document.hidden;
  let onScreen = false;
  let running = false;

  const sync = () => {
    const want = visible && onScreen;
    if (want === running) return;
    running = want;
    if (want) start();
    else stop();
  };

  const observer = new IntersectionObserver(
    ([entry]) => {
      onScreen = entry.isIntersecting;
      sync();
    },
    { threshold: 0 }
  );
  observer.observe(element);

  const onVisibility = () => {
    visible = !document.hidden;
    sync();
  };
  document.addEventListener("visibilitychange", onVisibility);

  return () => {
    observer.disconnect();
    document.removeEventListener("visibilitychange", onVisibility);
  };
}
