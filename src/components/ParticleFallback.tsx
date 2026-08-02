const DEG = Math.PI / 180;
/** Matches AtomicGlobeScene's centerLng — the static disc and the live globe
 * face the same way, so this reads as the same network, not a generic diagram. */
const CENTER_LON = 40;
const R = 90;
const CX = 100;
const CY = 100;

/** The same 8 hub cities the interactive globe plots (see
 * src/components/presence/AtomicGlobeScene.tsx). Surat is the origin. */
const HOTSPOTS: { lat: number; lon: number; origin?: boolean }[] = [
  { lat: 21.17, lon: 72.83, origin: true }, // Surat
  { lat: 25.2, lon: 55.27 }, // Dubai
  { lat: 1.35, lon: 103.82 }, // Singapore
  { lat: 51.51, lon: -0.13 }, // London
  { lat: 40.71, lon: -74.01 }, // New York
  { lat: -23.55, lon: -46.63 }, // São Paulo
  { lat: 6.52, lon: 3.38 }, // Lagos
  { lat: 31.23, lon: 121.47 }, // Shanghai
];

/** Orthographic projection onto the front face of the disc — points on the
 * far side are simply omitted rather than drawn through the globe. */
function project(lat: number, lon: number) {
  const latR = lat * DEG;
  const lonR = (lon - CENTER_LON) * DEG;
  const front = Math.cos(latR) * Math.cos(lonR);
  return {
    x: CX + R * Math.cos(latR) * Math.sin(lonR),
    y: CY - R * Math.sin(latR),
    visible: front > 0.06,
  };
}

const POINTS = HOTSPOTS.map((h) => ({ ...project(h.lat, h.lon), origin: h.origin }));

function seeded(i: number) {
  const x = Math.sin(i * 12.9898 + 78.233) * 43758.5453;
  return x - Math.floor(x);
}

const DUST = Array.from({ length: 760 }, (_, i) => {
  const y = 1 - (2 * (i + 0.5)) / 760;
  const radius = Math.sqrt(Math.max(0, 1 - y * y));
  const theta = i * Math.PI * (3 - Math.sqrt(5));
  const x = Math.cos(theta) * radius;
  const z = Math.sin(theta) * radius;
  const sideBias = x > 0.15 ? 1 : x > -0.15 ? 0.42 : 0.14;

  return {
    x: CX + x * R,
    y: CY - y * R + z * 2,
    r: 0.28 + seeded(i) * 0.38,
    opacity: sideBias * (0.38 + seeded(i + 41) * 0.42),
  };
});

/** Static, zero-cost substitute for the WebGL particle globe/field — shown
 * when isLowEndDevice() gates it pre-mount, when WebGL init fails, or when
 * the runtime frame-budget monitor hands off after sustained sub-50fps
 * frames. This same state is what prefers-reduced-motion users see, so it
 * is a deliberate design state — a filled globe with the real hub network
 * plotted on it — not a bare latitude/longitude wireframe. No canvas, no JS
 * loop, no client-only APIs (safe to render on the server). */
export default function ParticleFallback() {
  return (
    <div className="particle-fallback" aria-hidden="true">
      <svg
        className="particle-fallback__globe"
        viewBox="0 0 200 200"
        xmlns="http://www.w3.org/2000/svg"
      >
        {DUST.map((p, i) => (
          <circle
            key={`grain-${i}`}
            className="particle-fallback__grain"
            cx={p.x}
            cy={p.y}
            r={p.r}
            opacity={p.opacity}
          />
        ))}
        {POINTS.filter((p) => p.visible).map((p, i) => (
          <circle
            key={`hub-${i}`}
            className={p.origin ? "particle-fallback__hub particle-fallback__hub--origin" : "particle-fallback__hub"}
            cx={p.x}
            cy={p.y}
            r={p.origin ? 1.45 : 0.95}
          />
        ))}
      </svg>
    </div>
  );
}
