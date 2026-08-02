/**
 * Lightweight, dependency-free device-capability gate for the WebGL particle
 * field. No external benchmark library and no network call — everything here
 * runs synchronously against APIs the browser already exposes, so it works
 * fully offline and adds no bundle weight.
 *
 * Two independent checks, either of which disqualifies the device:
 *  1. CPU/RAM floor — the per-frame morph math (rebuilding a 7-14k vertex
 *     proxy array) is CPU-bound work that contends with the render thread on
 *     low-core-count or low-memory devices, even before the GPU is touched.
 *  2. Software renderer — a WebGL context backed by a software rasterizer
 *     (SwiftShader, llvmpipe, an ANGLE fallback with no real GPU backend)
 *     cannot sustain this particle count at interactive framerates no matter
 *     how capable the CPU is; this is the actual cause of a frozen tab.
 */
export function isLowEndDevice(): boolean {
  if (typeof window === "undefined" || typeof navigator === "undefined") return false;

  const nav = navigator as Navigator & { deviceMemory?: number };
  const cores = nav.hardwareConcurrency ?? 4;
  // deviceMemory is Chromium-only; Safari/Firefox report undefined — treat
  // that as "unknown, assume mid-tier" rather than penalizing those browsers.
  const memory = nav.deviceMemory ?? 4;

  const isCoarsePointer =
    typeof window.matchMedia === "function" &&
    window.matchMedia("(pointer: coarse)").matches;

  try {
    const canvas = document.createElement("canvas");
    const gl = (canvas.getContext("webgl2") ||
      canvas.getContext("webgl")) as WebGLRenderingContext | null;
    if (!gl) {
      // Every fallback decision must be loud — this is the one that used to
      // be silent and is the leading suspect for the P0 simultaneous-failure
      // report: no signal ever told us WHY a capable machine landed here.
      console.error(
        "[gpu-capability] WebGL unavailable: canvas.getContext('webgl2') and " +
          "canvas.getContext('webgl') both returned null. Falling back to the static field."
      );
      return true;
    }

    const dbg = gl.getExtension("WEBGL_debug_renderer_info");
    const renderer = dbg
      ? String(gl.getParameter(dbg.UNMASKED_RENDERER_WEBGL)).toLowerCase()
      : "";
    const SOFTWARE_MARKERS = ["swiftshader", "llvmpipe", "software", "microsoft basic render", "d3d11 warp"];
    const matchedMarker = SOFTWARE_MARKERS.find((m) => renderer.includes(m));
    if (matchedMarker) {
      console.error(
        `[gpu-capability] Software renderer detected ("${matchedMarker}" matched in "${renderer}"). ` +
          "Falling back to the static field."
      );
      return true;
    }
  } catch (err) {
    // Previously: `catch { return true }` with no logging — any exception
    // here, for any reason, silently downgraded a capable device with zero
    // trace. This is what a client console screenshot needs to catch.
    console.error("[gpu-capability] WebGL probe threw during capability check:", err);
    return true;
  }

  // Do not let privacy-reduced CPU/RAM values alone disable desktop WebGL.
  // Brave/Safari-style fingerprinting can under-report these while the GPU is
  // perfectly usable, which was surfacing the wire-style fallback on MacBook.
  if (isCoarsePointer && (cores <= 2 || memory <= 2)) return true;

  return false;
}
