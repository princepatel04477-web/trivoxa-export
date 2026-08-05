/**
 * Opt-in frame-time readout for the particle field.
 *
 * Exists because the 60fps budget can only be confirmed on real hardware —
 * enable it on a device, scroll the page, and read the worst-case numbers.
 *
 * Enable with `?perf=1` in the URL, or persistently via
 * `localStorage.setItem("tvx-perf", "1")`. Off by default and tree-shaken out
 * of the hot path when off (isPerfHudEnabled is checked once at scene setup).
 */

export function isPerfHudEnabled(): boolean {
  if (typeof window === "undefined") return false;
  try {
    if (new URLSearchParams(window.location.search).get("perf") === "1") return true;
    return window.localStorage.getItem("tvx-perf") === "1";
  } catch {
    return false; // private mode / blocked storage
  }
}

export interface PerfHud {
  /** Feed the real, unclamped frame delta in seconds. */
  sample(rawDeltaSeconds: number): void;
  dispose(): void;
}

export function createPerfHud(info: { particles: number; dpr: number; tier: string }): PerfHud {
  const el = document.createElement("div");
  el.style.cssText = [
    "position:fixed",
    "top:8px",
    "left:8px",
    "z-index:2147483647",
    "padding:8px 10px",
    "font:12px/1.45 ui-monospace,SFMono-Regular,Menlo,monospace",
    "color:#D4AF5E",
    "background:rgba(0,0,0,0.86)",
    "border:1px solid rgba(212,175,94,0.35)",
    "border-radius:6px",
    "pointer-events:none",
    "white-space:pre",
  ].join(";");
  document.body.appendChild(el);

  // Rolling window of the last ~2s so the number is readable but still shows
  // sustained cost rather than a single lucky frame.
  const WINDOW = 120;
  const samples: number[] = [];
  let worst = 0;
  let over16 = 0;
  let total = 0;
  let acc = 0;

  return {
    sample(rawDeltaSeconds: number) {
      const ms = rawDeltaSeconds * 1000;
      // Ignore the first frames and tab-return spikes, which aren't render cost.
      if (ms > 250) return;
      samples.push(ms);
      if (samples.length > WINDOW) samples.shift();
      total++;
      if (ms > 16.7) over16++;
      if (ms > worst) worst = ms;

      acc += rawDeltaSeconds;
      if (acc < 0.25) return; // repaint the HUD 4x/sec, not every frame
      acc = 0;

      const avg = samples.reduce((a, b) => a + b, 0) / samples.length;
      const sorted = [...samples].sort((a, b) => a - b);
      const p95 = sorted[Math.floor(sorted.length * 0.95)] ?? 0;
      el.textContent =
        `${info.tier}  ${info.particles.toLocaleString()} pts  dpr ${info.dpr.toFixed(2)}\n` +
        `avg  ${avg.toFixed(1)}ms  (${(1000 / avg).toFixed(0)} fps)\n` +
        `p95  ${p95.toFixed(1)}ms\n` +
        `worst ${worst.toFixed(1)}ms\n` +
        `over 16.7ms: ${((over16 / total) * 100).toFixed(1)}%`;
    },
    dispose() {
      el.remove();
    },
  };
}
