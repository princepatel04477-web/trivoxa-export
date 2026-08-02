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
