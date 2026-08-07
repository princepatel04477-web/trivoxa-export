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

import {
  CHROME_HEIGHT_TOLERANCE_PX,
  DPR_CEILING,
  DPR_CEILING_WEBKIT,
  REFIT_DEBOUNCE_MS,
  type DeviceTier,
} from "@/lib/motion";

export type DeviceClass = DeviceTier;

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

let cached: DeviceClass | null = null;

/** True when the primary input is a finger rather than a mouse. */
export function isTouchPrimary(): boolean {
  if (typeof window === "undefined" || typeof window.matchMedia !== "function") return false;
  return window.matchMedia("(pointer: coarse)").matches;
}

/**
 * WebKit is the renderer family with the most volatile WebGL resize behavior on
 * Apple hardware. Keep this UA check small and explicit: Chromium-based iOS
 * browsers are also WebKit under the hood, while desktop Chrome/Edge are not.
 */
export function isAppleWebKit(): boolean {
  if (typeof navigator === "undefined") return false;
  const ua = navigator.userAgent;
  return /AppleWebKit/i.test(ua) && !/(Chrome|Chromium|Edg|OPR|Firefox|FxiOS)/i.test(ua);
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

/**
 * The DPR ceiling for this device, from the shared motion config.
 *
 * WebKit on Apple hardware takes the lower ceiling where one is declared — it is
 * the renderer family with the least fill-rate headroom at a given nominal tier.
 */
export function dprCeiling(): number {
  const tier = deviceClass();
  if (isAppleWebKit()) return DPR_CEILING_WEBKIT[tier] ?? DPR_CEILING[tier];
  return DPR_CEILING[tier];
}

/**
 * THE pixel-ratio authority. One function, consumed by every canvas on every
 * route — no surface reads `window.devicePixelRatio` itself, which is how the
 * site previously ended up with four ratio policies that disagreed.
 */
export function pixelRatio(scale = 1): number {
  if (typeof window === "undefined") return 1;
  const dpr = window.devicePixelRatio || 1;
  return Math.min(dpr, dprCeiling()) * scale;
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

/**
 * The backing store for a canvas of `cssWidth` × `cssHeight` at the clamped
 * ratio, rounded to integers.
 *
 * Rounding is not cosmetic. Subpixel accumulation across repeated re-fits is
 * what drifts a nominally 2.0× backing store to 2.2× after a layout change — a
 * silently different render target that changes grain character and sharpness
 * without changing anything visible about the layout.
 */
export function backingStore(cssWidth: number, cssHeight: number, scale = 1) {
  const ratio = pixelRatio(scale);
  return {
    ratio,
    width: Math.round(cssWidth * ratio),
    height: Math.round(cssHeight * ratio),
  };
}

/**
 * Development-only invariant: is the canvas sized by the single authority above,
 * or has some other path sized it?
 *
 * Allows ONE pixel per axis. The original demanded exact equality on the grounds
 * that any inequality means a rogue sizing path — but that is not what a 1px
 * delta means here. Three.js and the postprocessing composer round the drawing
 * buffer themselves, and at a fractional device-pixel ratio the two roundings
 * legitimately disagree by one: 1430 css × 0.7 is 1001.0, and a renderer that
 * floors an intermediate lands on 1000. Both are "correct"; neither indicates a
 * second sizing path.
 *
 * Firing on that was not free. It ran every resize AND every re-fit, so a single
 * window drag emitted a burst of console.error — which is what Next's dev
 * overlay counts and surfaces as an error badge, and what buried the real
 * diagnostics in this file's own log.
 *
 * A genuine rogue path misses by far more than a pixel, so the invariant still
 * catches what it was written to catch.
 */
const BACKING_STORE_TOLERANCE_PX = 1;

export function assertBackingStore(
  canvas: HTMLCanvasElement,
  cssWidth: number,
  cssHeight: number,
  ratio: number,
  label: string
): void {
  if (process.env.NODE_ENV === "production") return;
  const w = Math.round(cssWidth * ratio);
  const h = Math.round(cssHeight * ratio);
  const dw = Math.abs(canvas.width - w);
  const dh = Math.abs(canvas.height - h);
  if (dw > BACKING_STORE_TOLERANCE_PX || dh > BACKING_STORE_TOLERANCE_PX) {
    console.error(
      `[${label}] backing-store assertion failed: ` +
        `have ${canvas.width}×${canvas.height}, want ${w}×${h} ` +
        `(css ${cssWidth}×${cssHeight} @ ${ratio})`
    );
  }
}

/**
 * Drives a re-fit from a `ResizeObserver` on the canvas's own container.
 *
 * NOT from `window.resize`: that fires on every mobile URL-bar movement (which
 * is chrome, not a resize) and does NOT fire on a container-only layout change
 * (which is a resize). Both are wrong in the direction that matters.
 *
 * Debounced at REFIT_DEBOUNCE_MS, but `orientationchange` re-fits immediately
 * and unconditionally — a rotation must not wait out a debounce mid-morph.
 *
 * Height-only deltas below CHROME_HEIGHT_TOLERANCE_PX are suppressed ONLY on a
 * coarse pointer. On a fine pointer every height change is a genuine window
 * drag and must be honoured.
 */
export function observeContainerResize(
  container: Element,
  refit: () => void
): () => void {
  let timer = 0;
  let lastW = 0;
  let lastH = 0;
  const coarse = isTouchPrimary();

  const run = () => {
    timer = 0;
    const rect = container.getBoundingClientRect();
    lastW = rect.width;
    lastH = rect.height;
    refit();
  };

  const schedule = () => {
    const rect = container.getBoundingClientRect();
    const dw = Math.abs(rect.width - lastW);
    const dh = Math.abs(rect.height - lastH);
    // URL-bar chrome on a handset: height moved a little, width did not move at
    // all. Anything else — including any width change — is a real resize.
    if (coarse && dw < 1 && dh < CHROME_HEIGHT_TOLERANCE_PX) return;
    if (timer) window.clearTimeout(timer);
    timer = window.setTimeout(run, REFIT_DEBOUNCE_MS);
  };

  const immediate = () => {
    if (timer) window.clearTimeout(timer);
    run();
  };

  const observer = new ResizeObserver(schedule);
  observer.observe(container);
  window.addEventListener("orientationchange", immediate);

  return () => {
    if (timer) window.clearTimeout(timer);
    observer.disconnect();
    window.removeEventListener("orientationchange", immediate);
  };
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
