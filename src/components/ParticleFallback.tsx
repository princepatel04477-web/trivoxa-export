/** Static, zero-cost substitute for the WebGL particle field — used when
 * isLowEndDevice() gates the field before it ever mounts, or when the
 * runtime frame-budget monitor hands off after sustained sub-50fps frames.
 * A CSS gradient (matching the particle field's --bg ground) plus a static
 * gold globe outline in place of the animated one. No canvas, no JS loop. */
export default function ParticleFallback() {
  return (
    <div className="particle-fallback" aria-hidden="true">
      <svg
        className="particle-fallback__globe"
        viewBox="0 0 200 200"
        xmlns="http://www.w3.org/2000/svg"
      >
        <circle cx="100" cy="100" r="90" />
        <ellipse cx="100" cy="100" rx="90" ry="32" />
        <ellipse cx="100" cy="100" rx="90" ry="60" />
        <line x1="10" y1="100" x2="190" y2="100" />
        <ellipse cx="100" cy="100" rx="32" ry="90" />
        <ellipse cx="100" cy="100" rx="60" ry="90" />
        <line x1="100" y1="10" x2="100" y2="190" />
      </svg>
    </div>
  );
}
