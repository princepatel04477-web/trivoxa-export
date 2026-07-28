/**
 * Minimal stand-in for the four `framer` APIs a vendored Framer code component
 * imports.
 *
 * The `framer` package is Framer's CANVAS runtime — it exists to let a
 * component introspect whether it is being drawn on the design canvas, in
 * preview, or in a static export, and to declare inspector controls. None of
 * that has meaning in this app, and the package cannot be resolved in a browser
 * outside Framer's own import map, so a component that imports it will not load
 * at all without this shim.
 *
 * Everything here is deliberately inert except `useIsStaticRenderer`, which is
 * genuinely useful (see below).
 */

/**
 * Where the component believes it is rendering.
 *
 * Vendored components typically compare `RenderTarget.current()` against
 * `RenderTarget.canvas` to decide whether to skip their animation loop while
 * sitting on a designer's canvas. We are never on the canvas, so `current()`
 * reports `preview` and those branches are simply never taken.
 */
export const RenderTarget = {
  canvas: "CANVAS",
  export: "EXPORT",
  preview: "PREVIEW",
  thumbnail: "THUMBNAIL",
  current: () => "PREVIEW",
} as const;

/**
 * Framer calls a render "static" when it wants a single painted frame and no
 * animation loop — a thumbnail or an export.
 *
 * That is exactly the contract `prefers-reduced-motion` asks for, so this is
 * wired to the media query rather than stubbed to `false`. A component built
 * for Framer therefore gets a correct reduced-motion fallback for free, using
 * the path its own author already wrote and tested: fully-formed geometry, no
 * intro assembly, one `renderer.render()` call, no `requestAnimationFrame`.
 *
 * Read once at mount. It intentionally does not subscribe to changes — these
 * components read it during scene construction, so reacting to a mid-session
 * toggle would require a full teardown, and the caller remounts on that anyway.
 */
export function useIsStaticRenderer(): boolean {
  if (typeof window === "undefined") return true;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

/**
 * Inspector control descriptors. Only ever consumed by Framer's UI, so this is
 * a no-op — but the call must exist, because vendored components invoke it at
 * module scope and a missing export would throw on import.
 */
export function addPropertyControls(): void {
  /* no inspector here */
}

/**
 * The control-type enum used to build the descriptor object passed to
 * `addPropertyControls`.
 *
 * That object literal is still EVALUATED at module scope even though we discard
 * it, so every `ControlType.X` lookup has to return something rather than throw
 * on an undefined property. A Proxy answers any key with its own name, which
 * keeps this correct if the component references a control type we have not
 * enumerated.
 */
export const ControlType: Record<string, string> = new Proxy(
  {},
  { get: (_target, key) => (typeof key === "string" ? key : "") }
);
