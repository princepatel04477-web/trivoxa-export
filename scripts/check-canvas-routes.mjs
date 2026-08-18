#!/usr/bin/env node
/**
 * Route smoke test: every page must mount a WebGL surface.
 *
 * This exists because /industries lost its particle field and shipped that way.
 * Nothing failed, nothing warned — the page simply rendered as a flat dark
 * rectangle next to five routes that did not, and it was found by looking at a
 * screenshot. A regression that only a human eye can catch will ship again.
 *
 * The assertion is deliberately weak and therefore durable: SOME canvas is
 * mounted and has non-zero backing-store dimensions. It does not care whether
 * the route runs the particle field or a GLSL film, because both are legitimate
 * and which one a route wants is a design decision. What it will not tolerate
 * is a route with neither.
 *
 * Usage:
 *   npm run dev            # in another terminal
 *   node scripts/check-canvas-routes.mjs [baseUrl]
 *
 * Exits non-zero on the first route with no surface, so it can gate a deploy.
 */

// Playwright is NOT a dependency of this project, and this script deliberately
// does not make it one — a 300MB browser download is not a fair price to attach
// to `npm install` for every contributor. It is imported dynamically so the
// script explains itself instead of dying on a module-resolution error.
let chromium;
try {
  ({ chromium } = await import("playwright"));
} catch {
  console.error(
    "check-canvas-routes needs Playwright, which this project does not depend on.\n" +
      "Install it for this run:\n\n" +
      "  npm i -D playwright && npx playwright install chromium\n"
  );
  process.exit(2);
}

const BASE = process.argv[2] ?? "http://localhost:3000";

/**
 * Every route the verification gate names, plus the secondary pages that run a
 * film. Locale-prefixed: the app redirects `/group` → `/group` but resolves the
 * canvas the same either way, and pinning the locale keeps the run
 * deterministic.
 */
const ROUTES = [
  "/en",
  "/en/group",
  "/en/businesses",
  "/en/industries",
  "/en/global-presence",
  "/en/insights",
  "/en/careers",
  "/en/about",
  "/en/contact",
  "/en/compliance",
  "/en/rfq",
];

/**
 * The low-end gate in ParticleCanvas swaps the field for a static fallback on a
 * software rasteriser, which is exactly what a headless browser is. Without
 * this the test would measure the fallback on every route and prove nothing.
 * Same flag the engine already documents for measurement harnesses.
 */
const FORCE = "?forceParticles=1&forceShader=1";

const failures = [];

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });

for (const route of ROUTES) {
  await page.goto(`${BASE}${route}${FORCE}`, { waitUntil: "networkidle" });
  // The canvas is mounted from a dynamic, client-only chunk behind a compile
  // gate, so it is never present on first paint. Poll rather than sample once.
  let surface = null;
  for (let attempt = 0; attempt < 20 && !surface; attempt++) {
    surface = await page.evaluate(() =>
      [...document.querySelectorAll("canvas")]
        .map((c) => ({ w: c.width, h: c.height, cls: c.className }))
        // The GrainGlobe/GrainOverlay helpers keep offscreen 300x150 scratch
        // canvases that are never displayed; a route carried by one of those
        // has no background at all.
        .find((c) => c.w > 400 && c.h > 300) ?? null
    );
    if (!surface) await page.waitForTimeout(250);
  }
  if (surface) {
    console.log(`  ok   ${route}  canvas ${surface.w}x${surface.h}`);
  } else {
    console.error(`  FAIL ${route}  no WebGL surface mounted`);
    failures.push(route);
  }
}

await browser.close();

if (failures.length) {
  console.error(`\n${failures.length} route(s) with no background surface:\n  ${failures.join("\n  ")}`);
  process.exit(1);
}
console.log(`\nAll ${ROUTES.length} routes mount a surface.`);
