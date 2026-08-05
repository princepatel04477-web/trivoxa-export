# Mechanic Spec — Post-Process Dot Grid (the "grain")

- **Interaction model:** time-driven (per-frame noise), viewport-reactive density
- **Evidence:** `source/app.main.js` lines ~224–326
- **Screenshots:** visible in every capture; clearest in `desktop-05-expertise.png`

## Open question #4 — settled

`EXTRACTION.md` (written before browser access) concluded *"the particles are the grain."*
**That is wrong.** There is a second, separate pass.

The grain is an `EffectComposer` `ShaderPass` running after `RenderPass`, drawing an animated
dot-grid into the **dark** regions of the already-rendered frame. It is independent of the
particle system and would still be there with zero particles on screen.

It is also **not** a CSS layer — no `background-image`, no `feTurbulence`, no noise PNG anywhere in
the stylesheets. Confirmed by reading both CSS files in full.

`EXTRACTION.md` has been annotated; see `ERRATA.md`.

## Pipeline

```js
const composer = new EffectComposer(renderer)
composer.addPass(new RenderPass(scene, camera))
composer.addPass(new ShaderPass(dotGridShader))
// render loop calls composer.render(), never renderer.render()
```

Renderer: `WebGLRenderer({ antialias: devicePixelRatio < 2 })` — antialiasing is dropped on
high-DPI screens where it buys least. Pixel ratio clamped to 2 on both renderer and composer.

## Uniforms

```js
{
  tDiffuse:    null,                                  // previous pass
  uTime:       0,                                     // elapsed seconds
  uIntro:      0,                                     // shared with the particle intro tween
  uResolution: new Vector2(width, height),
  uSize:       300,                                   // grid density — see table
  dpr:         Math.min(devicePixelRatio, 2),
  uOpacity:    <shared uniform object>                // 1 desktop / 0.5 mobile
}
```

## Fragment shader (verbatim)

```glsl
float random (vec2 st) {
  return fract(sin(dot(st.xy, vec2(12.9898,78.233))) * 43758.5453123);
}

void main() {
  vec2  st     = gl_FragCoord.xy / uResolution.xy;
  float aspect = uResolution.y / uResolution.x;
  st.y *= aspect;
  vec2  sti = st;

  vec4 color = texture2D(tDiffuse, vUv);

  st *= uSize;
  vec2 ipos = floor(st);                    // integer cell coords

  vec3 modColor = vec3(1. - smoothstep(0.1, 0.3, length(ipos + vec2(0.5) - st)));
  modColor *= 1./dpr;
  modColor *= 1./dpr;                       // ⚠ applied twice — see note
  modColor *= random(ipos * uTime);         // per-cell, per-frame flicker

  float tcp    = max(max(color.r, color.g), color.g);   // ⚠ .g twice — see note
  vec2  center = vec2(0.5, 0.5*aspect) * dpr;

  gl_FragColor.rgb = mix(
      color.rgb,
      modColor * 0.15 * (1. * (dpr*dpr) - length(center - sti)) * uIntro,
      1. - smoothstep(0., 0.2, tcp)         // ← mask: only where the frame is dark
  );
  gl_FragColor.a = 1.;
}
```

### How it reads

1. Screen is divided into `uSize` cells across the width (aspect-corrected vertically).
2. Each cell gets a soft round dot via `smoothstep(0.1, 0.3, dist-to-cell-centre)`.
3. `random(ipos * uTime)` re-rolls **every cell every frame** — this is the shimmer, not a static
   grain. Because `uTime` is a float multiplier rather than an offset, the pattern's rate of change
   accelerates as `uTime` grows.
4. A radial term `(dpr² - length(center - sti))` dims dots toward the screen edges — a subtle
   vignette in the grain itself.
5. `uIntro` scales it, so the grain fades in with the particles.
6. **The mask is the important part:** `1. - smoothstep(0., 0.2, tcp)` where `tcp` is the frame's
   brightest channel. Grain is applied at full strength where the frame is black and drops to zero
   wherever anything bright (a particle, white type composited later — no, type is DOM, so: any
   particle) is drawn. The dots live *between* the particles, never on top of them.

### Two quirks in the shipped source

- `modColor *= 1./dpr;` appears **twice** in consecutive lines, so brightness is scaled by `1/dpr²`,
  not `1/dpr`. On a DPR-2 display the dots are 4× dimmer than the single-division reading suggests.
  This is very likely a copy-paste slip, but it is what ships and what the captures show.
- `max(max(color.r, color.g), color.g)` tests **green twice and never blue**. A pure-blue particle
  (`#4089dd` has a high blue channel) therefore does *not* fully suppress the grain around it,
  while an orange one does. Given the palette is blue↔orange, this visibly matters. Again: almost
  certainly a typo for `color.b`, but it ships.

Reproduce both only if you want a byte-exact clone. For a port, fix them.

## Density by viewport

Recomputed on every `resize`:

```js
let s = 0
if      (w < 540)  s = 40
else if (w < 768)  s = 80
else if (w < 1020) s = 120
else if (w < 1400) s = 200
else               s = 300
uSize.value = s
```

| Viewport width | `uSize` (cells across) |
|---|---|
| < 540 | 40 |
| < 768 | 80 |
| < 1020 | 120 |
| < 1400 | 200 |
| ≥ 1400 | 300 |

Note these thresholds (540 / 768 / 1020 / 1400) match **neither** the Tailwind breakpoints
(640 / 768 / 1024 / 1280 / 1536) **nor** the JS mobile flag (768). Three different breakpoint
systems coexist in this codebase.

Density is expressed in **cells across the viewport**, so dot pitch stays roughly constant in CSS
pixels rather than scaling with the window — which is why the texture reads the same at every size.

## Resize handling

```js
window.addEventListener("resize", onResize)
function onResize() {
  isMobile = innerWidth <= 768
  camera.aspect = w/h; camera.updateProjectionMatrix()
  renderer.setSize(w, h); renderer.setPixelRatio(min(dpr, 2))
  composer.setSize(w, h); composer.setPixelRatio(min(dpr, 2))
  uResolution.value = new Vector2(w, h)
  /* uSize recomputed as above */
}
```

`isMobile` is re-evaluated here, but nothing that already read it (glow sprite existence, particle
count, ScrollTrigger start positions) is rebuilt — so resizing across 768px leaves the page in a
mixed state until reload. Worth doing better in a port.

## Porting notes (Trivoxa)

- The **dark-only mask** is the transferable idea: grain that yields to content instead of sitting
  over it. It keeps type crisp with no extra layer management.
- Per-frame `random()` per cell = shimmer; a static noise texture = film grain. They read very
  differently. This site chose shimmer.
- Density in *cells across viewport* (not fixed px) is what keeps it stable across window sizes.
- If adopting, fix the `.g`/`.b` mask bug and the doubled `1./dpr` — neither is intentional design.
- Cost is one full-screen pass. Cheap, but it does force a composer where `renderer.render()` alone
  would otherwise do.
