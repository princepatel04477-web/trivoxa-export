# Trivoxa Group vs USTA Agency — Particle & Motion Production-Quality Gap

*Audited 17 Aug 2026 by reading the live runtime of both sites: shader source, GSAP/scroll config, uniform values, and per-tier particle budgets. Every number below is pulled from the shipped bundles, not estimated.*

---

## 1. What each site is actually running

| | **usta.agency** | **trivoxagroup.com** |
|---|---|---|
| Renderer | Three.js **r151** | Three.js **r185** |
| Animation | GSAP **3.12.2** | GSAP **3.15.0** |
| Scroll engine | GSAP **ScrollSmoother** (`smooth: 1.5`, `effects: true`) | **Lenis 1.3.25** (`lerp: 0.09`, `duration: 1.2`) |
| Plugins | ScrollTrigger, ScrollSmoother, **SplitText**, Observer | ScrollTrigger only |
| Particle material | **Pure `ShaderMaterial`** — hand-written vertex + fragment GLSL | `PointsMaterial` + `onBeforeCompile` string-patching of stock chunks |
| Geometry source | 4× GLB meshes sampled with `MeshSurfaceSampler` into `position` / `position2` / `position3` / `position4` attributes | Procedural shape generators (`globe`, `cargo-ship`, `container`, `eagle`) |
| Canvas | `position: fixed; z-index: -1`, DPR 2, `antialias: false` when DPR ≥ 2 | same layering; DPR ceiling 2 desktop / **1.5 on WebKit**, degrades in 0.25 steps |

**Verdict on stack:** Trivoxa's stack is *newer and better engineered* (adaptive DPR, frame budget, degrade/recover windows, depth cueing, light/dark mode). The gap is **not technical capability — it is amplitude.** Every single motion constant on Trivoxa is tuned 2–18× more conservatively than USTA's.

---

## 2. The gap, quantified

### 2.1 Density and pixel presence — the single biggest cause of "dull"

| Parameter | USTA | Trivoxa | Gap |
|---|---|---|---|
| Desktop particle count | **30,000** (fixed) | `BASE 18000 × (viewportArea / 921600) × tierFactor`, clamped to **MIN 4000 / MAX 18000** | **0.55×** at best, **0.13×** on a small window |
| Mobile particle count | 15,000 | 18000 × area × 1.24 → often ~4–6k | ~0.3× |
| Point size (screen) | `2.5 × (clamp(6·scale, 2, 6) + sin(t·5)·1.9·k − 1.5·burst·k) + cursorProx·12`<br>→ **≈ 5–15 px idle, up to ~27 px near cursor** | `clamp(size · depthSize · (1 − 0.48·burst), uPointMin, uPointMax)`<br>with **`POINT_SIZE_MIN_CSS_PX 0.5` / `POINT_SIZE_MAX_CSS_PX 6`** | **hard-ceilinged at 6 px** vs USTA's ~15–27 px |
| Blending | `AdditiveBlending` **always** → overlapping grains bloom to white-hot cores | `AdditiveBlending` in dark, **`NormalBlending` in light** | no accumulation highlights in light mode |
| Per-particle size jitter | `scale` attribute is `Math.random()` ×2 → wide size spread, reads as depth | `depthSize` only, `mix(0.6, 1.0, frontness)` | **narrow size spread → flat, uniform, "screen-door" texture** |
| Idle shimmer | `sin(uTime·5 + sinOffset)` modulating **point size** ±1.9 px per particle | `uDrift` positional only | USTA twinkles; Trivoxa sits still |

> **This is why Trivoxa's globe reads as a dim teal mesh instead of a luminous cloud.** ~16k particles at ≤6 px with no size variance and no size-shimmer cannot produce hot cores. USTA gets its glow from 30k additive grains whose sizes range 5→27 px and pulse individually.

### 2.2 The morph "explosion" — scale of the transition

USTA vertex shader:

```glsl
float vawe = sin(smoothstep(0.1, 0.95, fractProgress) * 3.14159);
vawe *= vawe * vawe;                                  // cubed → sharp spike at midpoint
vec4 pos = vec4(mixedPosition * (1.0 + vawe * 5.0), 1.0);   // ← 6× RADIAL EXPANSION
modelPosition.xyz += normalize(normal) * vawe * 6.0 * scale; // ← +6 world units outward
```

Trivoxa config:

```js
BURST: { radial: 2.4, scatter: 3.8, thin: 0.48, fade: 0.32,
         from: 0.1, to: 0.95, duration: 1.3, scrubScale: 0 }
```

| | USTA | Trivoxa | Gap |
|---|---|---|---|
| Radial expansion multiplier | **× 6.0** | × 2.4 | **2.5× weaker** |
| Extra normal-direction displacement | `+ 6.0 × scale` world units | `scatter 3.8` (absolute, not multiplied by size) | ~1.6× weaker |
| Envelope | identical `sin(smoothstep(0.1, 0.95, t)·π)³` — **Trivoxa already copies this correctly** | same | ✅ no gap |
| **Driven by** | **`scrub: 1` — continuously scrubbed across a `100vh × 1.5 × 7` (≈10.5 viewports) ScrollTrigger** | **`scrubScale: 0` — a fixed 1.3 s tween that fires on section enter** | **the defining gap** |

> **The morph doesn't feel connected to the user on Trivoxa.** On USTA your scroll wheel *is* the timeline: scroll faster and the cloud detonates faster, stop mid-explosion and it hangs there. On Trivoxa a section crosses a threshold and a canned 1.3 s animation plays. That single architectural difference is worth more than every other item on this list combined.

### 2.3 Camera and depth

| | USTA | Trivoxa | Gap |
|---|---|---|---|
| FOV | **60°** | **35°** | Trivoxa is ~1.7× flatter — near/far particles are nearly the same size, killing parallax |
| Intro | `camera.z 60 → 12` over **3 s `Power4.easeOut`**, in parallel with `uIntro 0 → 1` (also 3 s Power4.easeOut), started 0.5 s into the timeline | *none* | no arrival moment |
| Preloader | `LoadingManager` → `#counter` percentage → GSAP `snap: "innerText"` → curtain lift into the intro | *none* | the intro sells the whole site before content appears |
| Cloud position over scroll | 4 chained `power3.inOut` tweens: `x:3→−4→8→−4→0`, `y:0→−2→−1→−1`, `z:0→−3→0→−5` — the camera "flies through" the cloud | shape swaps in place | no spatial journey |
| Far-field falloff | `alpha *= 1 − smoothstep(1, −3, z)·0.8` → **0.2…1.0** | `depthOpac = mix(0.35, 1.0, frontness)`, `depthSize = mix(0.6, 1.0, …)` | comparable ✅ |
| Ambient starfield | separate `Points`, **700 grains in a 20-unit cube**, 6-colour round-robin, always visible | `AMBIENT { countRatio 0.16, innerR 1.7, outerR 3.4, flatten 0.62, opacity 0.7 }` — a shell hugging the globe | Trivoxa has no deep-space bed; USTA's field extends past the frustum so it never feels bounded |

### 2.4 Cursor interaction — near-total absence on Trivoxa

USTA:
```glsl
float distTpc = 1.0 - smoothstep(0.0, 4.0, length(modelPosition.xy - cursor.xy));
modelPosition.xyz += normalize(vec3(diff, 1.0)) * distTpc * (0.5 + vawe * 1.0);
gl_PointSize = ... + distTpc * 12.0;   // ← particles GROW 12 px toward the cursor
```

Trivoxa:
```js
CURSOR: { radius: 0.35, push: 0.055 }
```

| | USTA | Trivoxa | Gap |
|---|---|---|---|
| Influence radius | **4.0 world units** | **0.35 world units** | **11.4× smaller** |
| Push strength | 0.5 → 1.5 units (scales with burst) | **0.055 units** | **~9–27× weaker** |
| Size response | **+12 px** at cursor centre | none | missing entirely |
| Custom cursor element | 16 px white dot, **`mix-blend-mode: difference`** (inverts whatever it crosses) | 8 px dot + 32 px ring, `mix-blend-mode: normal` | no interaction with content |

> A 0.35-unit radius on a globe of radius ~1.6 means the cursor affects roughly **2% of the field's projected area**, with a displacement smaller than one particle's own idle drift. **Functionally, Trivoxa's cursor interaction does not exist to the eye.**

### 2.5 Field opacity across the page

Trivoxa's beat map:

```json
[ {".hp-trust": "cargo-ship", sweep: 0.8},
  {".hp-about": "container",  sweep: 0.7},
  {".hp-sec-4": opacity 0.28},          ← field nearly gone
  {".hp-global": "globe", sweep: 1, ports: true},
  {".hp-values": opacity 0.28},         ← field nearly gone
  {".hp-cta":   "eagle", sweep: 0},
  {".footer":   opacity 0.3} ]          ← field nearly gone
```

Combined with `VIGNETTE { dark: { darkness: 0.35, offset: 0.35 } }`, the particle system is **dimmed to 28–30 % for roughly half the 16,341 px page**. USTA holds `uOpacity: 1` on desktop for the entire scroll. Screenshots of `.hp-about` and `.hp-sec-4` come back **completely black** — those viewports have no visual event at all.

### 2.6 DOM-side motion (everything that isn't the canvas)

| | USTA | Trivoxa | Gap |
|---|---|---|---|
| Text reveals | **`SplitText`** with `type: "chars"`, `"words,lines"`, `"chars,words"` — per-character staggered reveals | `.home-reveal` / `.industries-index__reveal` **block-level class fades**; live DOM contains **0 split characters** | headline reveals are the #1 perceived-craft signal, and they're absent |
| Stagger | `stagger: { amount: 0.2 }` and `{ amount: 0.5 }`, plus `stagger: 0.1` | `STAGGER 0.05`, `STAGGER_CHAR 0.025` (defined but unused — nothing is split) | — |
| Ease vocabulary | `expo`, `power4`, `back`, `back.in`, `power3.inOut`, `Power4.easeOut` | `cubic-bezier(.5, 1, .89, 1)` (≈ easeOutCirc), `power1.inOut`, `elastic.out(1, 0.75)` | USTA uses **high-exponent** eases that snap; Trivoxa's are gentle and read as sluggish |
| Durations | `0.5`, `0.8`, `1`, `3` (the 3 s intro carries real weight) | `short .35 / standard .8 / long 2.4` — but almost everything uses `.2s`–`.3s` CSS | Trivoxa's motion is too short to register as intentional |
| CSS transitions in DOM | GSAP timelines throughout | **`color`, `background-color`, `border-color` only** at `0.2–0.3 s`. Exactly **one** element on the page transitions `transform`. | **No scale, no translate, no blur, no clip-path anywhere** |
| Marquee strips | `xPercent` loop, **hover slows `timeScale` to 0.15** via `power3.out` 0.5 s | strips render at constant speed, no hover response | missing |
| Nav / dropdown | `gsap.from(li, { duration: .5, ease: "back", autoAlpha: 0, y: -50, stagger: { amount: .2 } })` | CSS colour fade | missing |

---

## 3. Root-cause summary — why Trivoxa feels weak and dull

1. **Amplitude, not architecture.** Trivoxa's engine is arguably better built. Its constants are tuned like a *background texture*; USTA's are tuned like a *lead actor*.
2. **A 6 px point-size ceiling** makes additive blending mathematically unable to produce bright cores.
3. **The morph is time-based, not scroll-scrubbed** (`scrubScale: 0`) — the user never feels they are driving it.
4. **35° FOV** flattens the cloud into a decal instead of a volume.
5. **Cursor influence radius of 0.35 units** is below the perceptual threshold.
6. **The field is dimmed to 28 % for half the page**, so there is nothing to look at across long stretches.
7. **Zero character-level text animation and zero transform transitions** in the DOM — the canvas is the only thing moving, and it's whispering.

---

# 4. Prompts for upgrading trivoxagroup.com

Run these **in order** against your codebase. Each is self-contained, gives exact numbers, and states an acceptance check. Do not run them all at once — ship and eyeball each one.

---

### Prompt 1 — Raise the particle budget and break the point-size ceiling

```
In the particle field config (the object exporting PARTICLES, POINT_SIZE_MIN_CSS_PX,
POINT_SIZE_MAX_CSS_PX, POINT_WORLD_SIZE), make these changes:

1. PARTICLES: BASE 18000 -> 34000, MAX 18000 -> 34000, MIN 4000 -> 12000,
   REFERENCE_AREA stays 921600. Keep tierFactor { desktop: 1, tablet: 0.78,
   mobile: 0.55 } — lower mobile from 1.24 to 0.55 so phones get ~12k, not
   a starved 4k field.
2. POINT_SIZE_MAX_CSS_PX: 6 -> 22. POINT_SIZE_MIN_CSS_PX: 0.5 -> 1.2.
   The 6px ceiling is what makes additive blending unable to form bright
   cores — this is the single highest-impact change in the whole upgrade.
3. POINT_WORLD_SIZE: dark 0.09 -> 0.16, light 0.0765 -> 0.13.
4. Add a per-particle size-variance attribute: aSizeJitter = Math.random(),
   and in the vertex shader multiply point size by
   clamp(0.35 + aSizeJitter * 1.9, 0.35, 2.25).
   A wide size spread is what makes a point cloud read as volumetric depth
   instead of a uniform screen-door texture.
5. Add per-particle size shimmer, driven by the existing aPhase attribute:
   size += (sin(uTime * 5.0 + aPhase * 10.0) * 0.5 + 0.5) * 3.2 * aSizeJitter;
   Apply BEFORE the clamp to uPointMin/uPointMax.

Then re-check the FRAGMENT_BUDGET guard (desktop 8.3e6). Recompute it for the
new sizes; if the degrade path now trips on a normal desktop, raise the desktop
budget to 1.6e7 and let DPR_STEP handle genuinely weak GPUs. Do not solve a
fill-rate problem by lowering point size again — lower DPR instead.

Acceptance: on a 1440px-wide dark hero, dense regions of the globe should show
white/near-white saturated cores where grains overlap, not flat mid-tone dots.
```

---

### Prompt 2 — Scrub the morph to the scroll instead of firing a fixed tween

```
Today the shape morph is a time-based tween: BURST.duration 1.3 with
BURST.scrubScale 0, fired by discrete ScrollTrigger beats on section enter.
Replace this with a continuously scrubbed master timeline, matching how
usta.agency drives its field.

1. Create ONE master ScrollTrigger on the page content wrapper:
     trigger: "#content" (or the main scroll container)
     start:  "top top"
     end:    () => `+=${window.innerHeight * (isMobile ? 1.3 : 1.5) * 7}`
     scrub:  1        // raise SCRUB from 0.6 to 1.0
   Tween a single uniform uProgress 0 -> 1 with ease "none" on this trigger.

2. In the vertex shader, derive the stage from uProgress instead of from
   per-beat tweens:
     float progress      = uProgress * (float(STAGE_COUNT) - 0.001);
     float fractProgress = fract(progress);
     vec3 posA = mix(shapeA, shapeB, step(1.0, progress));
     vec3 posB = mix(shapeB, shapeC, step(2.0, progress));
     vec3 mixedPosition = mix(posA, posB, smoothstep(0.01, 0.99, fractProgress));
   Extend to as many stage attributes as you have shapes (globe, cargo-ship,
   container, eagle => 4 position attributes: position, position2,
   position3, position4).

3. Set BURST.scrubScale to 1 and drive the burst envelope from fractProgress,
   not from elapsed time:
     float burst = sin(smoothstep(BURST.from, BURST.to, fractProgress) * 3.14159);
     burst = burst * burst * burst;
   Keep the CPU-side burstEnvelope() mirror in sync — it must use fractProgress
   from the same uProgress value or an interrupted morph will jump.

4. Delete the per-beat `duration` and `EASE_MORPH_ARRIVAL: elastic.out(1, 0.75)`
   path for shape changes. Elastic arrival reads as bouncy/cheap next to a
   scrubbed smoothstep. Keep elastic only for small UI accents, if at all.

5. Keep the existing beats array for side-effects only (ports on/off, region
   cues, copy sync) — but strip every `shape` and `opacity` key from it.

Acceptance: scrolling with a trackpad at varying speed must visibly change how
fast the cloud expands and reassembles. Stopping mid-scroll must freeze the
cloud mid-explosion and hold it there.
```

---

### Prompt 3 — Triple the explosion amplitude

```
In the particle config, change BURST from
  { radial: 2.4, scatter: 3.8, thin: 0.48, fade: 0.32, from: 0.1, to: 0.95 }
to
  { radial: 5.0, scatter: 6.0, thin: 0.45, fade: 0.28, from: 0.1, to: 0.95 }

And in the vertex shader make the radial term a MULTIPLIER on the position
vector, not an additive offset — this is what gives usta.agency its 6x scale
swing:

  vec3 exploded = mixedPosition * (1.0 + burst * uBurstRadial);   // 1.0 -> 6.0
  vec4 modelPosition = modelMatrix * vec4(exploded, 1.0);
  modelPosition.xyz += normalize(aScatterDir) * burst * uBurstScatter * aSizeJitter;

Note the `* aSizeJitter` on the scatter term: bigger grains fly further, which
is what makes the burst look like a physical detonation rather than a uniform
inflation.

Also thin the grains during the burst so the explosion reads as dispersal
rather than a solid mass getting bigger:
  size *= (1.0 - burst * BURST.thin);
  alpha *= (1.0 - burst * BURST.fade);

Acceptance: at the midpoint of a morph the field must fill the entire viewport
edge-to-edge, then reconverge. Right now it stays inside roughly the same
bounding sphere the whole time.
```

---

### Prompt 4 — Open up the camera and add an intro

```
1. Camera FOV: 35 -> 55. A 35deg lens makes near and far particles nearly the
   same size, which is why the globe reads as a flat decal. Re-derive
   FRAMING_MARGIN (currently 1.5382) for the new FOV so the globe still fits
   its intended frame at every breakpoint — do not just eyeball the distance.

2. Add an intro sequence that runs after the WebGL warmup (WARMUP_SECONDS 1.5)
   and replaces the current hard cut:

   const tl = gsap.timeline();
   tl.to(uIntro, { value: 1, duration: 3, ease: "power4.out" }, 0);
   tl.to(camera.position, { z: targetZ, duration: 3, ease: "power4.out" }, 0.5);
   // camera starts at z = targetZ * 5, ends at targetZ

   In the fragment shader multiply final alpha by uIntro, and in the vertex
   shader multiply point size by mix(0.4, 1.0, uIntro), so the field
   materialises AND resolves rather than just fading in.

3. Add a real preloader gated on the asset/geometry build:
   - a fixed full-bleed black overlay with a centred "TRIVOXA <n>%" counter
   - drive n with gsap.to(counterObj, { duration: 1, innerText: pct,
     snap: "innerText" }) from your loader's progress callback
   - on complete, gsap.to(overlay, { autoAlpha: 0, duration: 0.6,
     ease: "power2.inOut" }) and start the intro timeline
   - hard fail-safe: dismiss after TRANSITION.failSafeMs (2500ms) regardless

4. Add a scroll-linked camera path so the user travels through the cloud
   instead of watching it swap shapes in place. On the same master timeline
   from Prompt 2, chain 4 tweens on the field's position with ease
   "power3.inOut", each duration 1:
     start (3, 0, 0) -> (-4, -2, 0) -> (8, 0, -3) -> (-4, -1, 0) -> (0, -1, -5)
   Multiply all values by 0.5 on mobile.

Acceptance: first paint is a black screen with a counter, then the field
resolves out of nothing over ~3s as the camera pushes in. Scrolling then moves
the cloud laterally across the viewport, not just through shape states.
```

---

### Prompt 5 — Make the cursor actually do something

```
CURSOR is currently { radius: 0.35, push: 0.055 } in world units. On a globe of
radius ~1.6 that affects about 2% of the projected field with a displacement
smaller than the idle drift — it is below the perceptual threshold.

1. CURSOR: { radius: 0.35 -> 2.6, push: 0.055 -> 0.55 }.

2. In the vertex shader, add a size response — this is the part that reads as
   "alive" and Trivoxa has none of it:

     vec2 diff        = modelPosition.xy - uCursor.xy;
     float proximity  = 1.0 - smoothstep(0.0, uCursorRadius, length(diff));
     modelPosition.xyz += normalize(vec3(diff, 1.0)) * proximity
                          * (uCursorPush + burst * uCursorPush * 2.0);
     size += proximity * 9.0;   // grains swell toward the pointer

3. Lerp uCursor toward the raw pointer position at 0.12 per frame rather than
   snapping — a hard-tracked cursor field looks nervous.

4. Custom cursor element: set mix-blend-mode: difference on .custom-cursor-dot
   and .custom-cursor-ring so they invert whatever they cross. Add a hover
   state that scales the ring from 32px to 72px with
   `transform 0.35s cubic-bezier(0.16, 1, 0.3, 1)` over links, buttons and
   cards. Currently both are mix-blend-mode: normal and never react.

5. Suppress all of the above under prefers-reduced-motion and on coarse
   pointers.

Acceptance: moving the pointer across the hero must visibly carve a bright
bulge through the particle field, trailing slightly behind the pointer.
```

---

### Prompt 6 — Stop dimming the field to 28% for half the page

```
The beats array currently sets field opacity to 0.28 on .hp-sec-4 and
.hp-values, and 0.3 on .footer. Combined with VIGNETTE dark
{ darkness: 0.35, offset: 0.35 }, the particle system is near-invisible for
roughly half of a 16,341px page. Two viewports render as literally solid black.

1. Remove every standalone `opacity` beat. Replace with a floor of 0.62:
   any section that needs the field to recede gets 0.62, never 0.28.
2. Footer: 0.3 -> 0.55.
3. VIGNETTE dark: { darkness: 0.35 -> 0.24, offset: 0.35 -> 0.42 }.
4. Where copy legibility is the real reason for dimming, do NOT dim the field.
   Instead put a local radial scrim behind the text block:
   radial-gradient(ellipse at center, rgba(0,0,0,0.82) 0%,
   rgba(0,0,0,0.55) 45%, transparent 78%).
   This keeps the field alive globally while making individual paragraphs
   readable — dimming the whole canvas to fix one paragraph is the wrong lever.
5. Add an ambient deep-field: a second Points object of 900 grains randomly
   distributed in a 22-unit cube (independent of the globe's AMBIENT shell,
   which only spans innerR 1.7 - outerR 3.4). Colour them round-robin from
   [--gold-particle, --particle-a, --particle-b, --particle-c, --particle-d],
   additive, depthWrite false, size 0.6x the main field. This is what keeps
   usta.agency's background from ever feeling empty, and it costs <1% of frame
   budget.

Acceptance: no viewport anywhere on the page renders as solid black. Scroll the
whole page and confirm there is always something on the canvas.
```

---

### Prompt 7 — Add character-level text reveals

```
The DOM currently has zero split characters. Reveals are block-level class
fades (.home-reveal, .industries-index__reveal). This is the largest
perceived-craft gap outside the canvas.

1. Add GSAP SplitText (or a self-hosted equivalent if licensing is a concern —
   e.g. splitting into spans manually, or the free GSAP 3.13+ SplitText).

2. Hero H1 ("Building the Future of Global Commerce."):
     const split = new SplitText(h1, { type: "chars,words" });
     gsap.from(split.chars, {
       yPercent: 120, autoAlpha: 0, duration: 0.9,
       ease: "expo.out", stagger: { amount: 0.5 }
     });
   Wrap each line in overflow:hidden so characters rise from behind a mask.
   Fire it from the intro timeline in Prompt 4, not on scroll.

3. Section headings (.home-heading, .industries-index__name): split
   type "words,lines", masked line reveal:
     gsap.from(split.lines, { yPercent: 100, duration: 0.8,
       ease: "power4.out", stagger: 0.08,
       scrollTrigger: { trigger: el, start: "top 82%" } });

4. Body copy (.home-lead, .industries-index__desc): split "lines", fade+rise
   16px, duration 0.7, ease "power3.out", stagger 0.06. Do NOT split body
   copy into characters — it looks cheap and wrecks screen readers.

5. Always call split.revert() on unmount, and skip splitting entirely under
   prefers-reduced-motion (fall back to a simple 0.3s opacity fade).
   Set aria-label on the original text before splitting.

6. Use the existing STAGGER_CHAR 0.025 / STAGGER 0.05 constants — they were
   defined for this and are currently dead config.

Acceptance: the hero headline must resolve character by character over ~1.4s
on load, and every section heading must reveal line by line from a mask on
scroll-in.
```

---

### Prompt 8 — Rebuild the easing and hover vocabulary

```
Audit of the live DOM: only three CSS transitions exist on the entire page —
`color`, `background-color`, `border-color` at 0.2-0.3s, plus exactly ONE
element transitioning `transform`. There is no scale, translate, blur, or
clip-path motion anywhere. This is why the site feels static between scroll
events.

1. Replace --ease-out (currently cubic-bezier(.5, 1, .89, 1), ~easeOutCirc)
   with a higher-exponent curve:
     --ease-out:  cubic-bezier(0.16, 1, 0.3, 1);      /* expo.out */
     --ease-inout: cubic-bezier(0.65, 0, 0.35, 1);    /* power3.inOut */
     --ease-back: cubic-bezier(0.34, 1.56, 0.64, 1);  /* back.out */
   Keep --ease-entry / --ease-exit for the existing view transitions.

2. Durations: --dur-fast .2s -> .28s, --dur-base .3s -> .45s. Sub-300ms
   transitions read as instant, not as motion.

3. Every card (.trust-card, .industries-index__*, service tiles):
     transition: transform var(--dur-base) var(--ease-out),
                 border-color var(--dur-base) var(--ease-out),
                 background-color var(--dur-base) var(--ease-out);
     &:hover { transform: translateY(-6px) scale(1.012); }
   Plus a gold hairline that draws in — animate border-color from
   var(--color-rule) to var(--hairline-gold).

4. Primary buttons (.home-cta, "Request a Quote"): add a fill sweep.
   A ::before pseudo at scaleX(0), transform-origin left, scaling to 1 over
   0.45s var(--ease-out) on hover, with the label in a higher stacking
   context. Colour-only hovers are the tell of an unfinished site.

5. Marquee strips (the "BUILDING MATERIALS · ASIA-PACIFIC · ..." ticker):
   they currently run at constant speed with no interaction. Add:
     const slow = gsap.to({ v: 1 }, { v: 0.15, paused: true, duration: 0.5,
       ease: "power3.out", onUpdate() { loop.timeScale(this.targets()[0].v) } });
     strip.addEventListener("mouseenter", () => slow.play());
     strip.addEventListener("mouseleave", () => slow.reverse());

6. Nav / dropdown: replace the colour fade with
     gsap.from(items, { duration: 0.5, ease: "back.out(1.7)", autoAlpha: 0,
       y: -50, stagger: { amount: 0.2 } });

Acceptance: every interactive element must respond with a transform, not just
a colour change. Hovering the marquee must visibly slow it.
```

---

### Prompt 9 — Tune the scroll feel

```
1. Lenis is at { lerp: 0.09, duration: 1.2 }. Pick ONE mode — lerp and
   duration are mutually exclusive in Lenis and passing both makes the feel
   non-deterministic. Use:
     { duration: 1.35,
       easing: t => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
       wheelMultiplier: 1.0, touchMultiplier: 1.6, smoothWheel: true }
   This is close to ScrollSmoother's smooth: 1.5, which is what gives
   usta.agency its weighted glide.

2. Raise SCRUB from 0.6 to 1.0 globally (already covered for the master
   timeline in Prompt 2 — apply it to the remaining triggers too).

3. Add ScrollTrigger.normalizeScroll(true) to kill iOS address-bar jitter,
   and gsap.ticker.lagSmoothing(500, 33) so a dropped frame doesn't cause a
   visible jump in the scrubbed morph.

4. Wire Lenis into GSAP's ticker rather than letting both run their own RAF:
     lenis.on("scroll", ScrollTrigger.update);
     gsap.ticker.add(t => lenis.raf(t * 1000));
     gsap.ticker.lagSmoothing(0);
   Two independent RAF loops driving a scrubbed shader is a classic source of
   micro-stutter.

Acceptance: a single trackpad flick must coast with visible weight, and the
particle morph must stay glued to the scroll position with no lag spike.
```

---

### Prompt 10 — Performance guardrails and verification

```
The changes above roughly triple fill-rate demand. Before shipping, harden the
existing degrade path and verify.

1. FRAGMENT_BUDGET: recompute for count 34000 at up to 22px. Set desktop 1.6e7,
   tablet 8e6, mobile 4.8e6.
2. DPR_CEILING_WEBKIT is currently { tablet: 1.25, desktop: 1.5 }. Keep it —
   Safari's compositor genuinely needs the headroom. But degrade DPR BEFORE
   degrading particle count or point size; the field's look is defined by size
   and density, and users notice those far more than a slightly softer canvas.
3. Keep DEGRADE_WINDOW_FRAMES 60 / RECOVER_WINDOW_FRAMES 180 and FRAME_BUDGET_MS
   20. Add telemetry for how often desktop actually degrades — if it's >5% of
   sessions, the budget is wrong, not the design.
4. Set antialias: false whenever devicePixelRatio >= 2 (usta.agency does
   exactly this) — MSAA buys nothing on a point cloud and costs real fill.
5. Full prefers-reduced-motion path: static globe, no burst, no cursor push,
   no character reveals, opacity transitions only.

Verify before shipping:
- Chrome DevTools Performance, 6x CPU throttle, scroll the full page: no frame
  over 20ms in the scrubbed morph region.
- Compare side by side with usta.agency at the same window size and confirm
  comparable luminance in the densest region of the cloud.
- Test on a real mid-range Android and a 2019-era MacBook, not just a dev machine.
- Lighthouse performance score must not drop more than 4 points vs. current.
```

---

## 5. One caution

USTA is an experimental design studio; the visual language is the product. Trivoxa is an international trade and business group with a serif-and-gold identity and a "trusted partner" promise. **Match USTA's production quality — the amplitude, the scrub-linked motion, the craft — but not its aesthetic recklessness.**

Concretely: take Prompts 1, 2, 3, 5, 6, 7, 9 at full strength. On Prompts 4 and 8, favour the restrained end — a 55° FOV rather than USTA's 60°, `power3`/`expo` eases rather than `back` on anything larger than a nav item, and keep the preloader to a plain counter rather than a display-type flourish. Credibility is Trivoxa's core asset; the motion should read as *expensive*, not as *loud*.
