# Motion Ledger — Operation Steady Hand

**Status:** EUMENES deliverable. Read-only snapshot taken before any value was altered.
**Scope:** every route that mounts the morph canvas or a grain pass, plus every
ScrollTrigger, ease, duration and stagger in the codebase.

---

## 0. Diagnostic sequence (§4) — the before-figure

| # | Question | Answer | Defect count |
|---|---|---|---|
| 1 | Lenis running its own rAF while GSAP's ticker also drives it? | **No.** `LenisProvider` uses `gsap.ticker.add(t => lenis.raf(t*1000))` + `lagSmoothing(0)` + `lenis.on('scroll', ScrollTrigger.update)`. Lenis 1.3 defaults `autoRaf: false` (verified in `node_modules/lenis/dist/lenis.mjs:433`). One loop. | **0** |
| 2 | Timelines on raw `scrub: true` | 9 — `particle-scene` ×3 (stage bindings, camera orbit, beat sweep), `ContactSection` ×2, `StatisticsSection` ×1, `HeroSection` ×1, `CinematicPanel` ×1, `ScrollTopWidget` ×1 | **9** |
| 3 | Scrubbed tweens also carrying an ease (double curve) | 6 — `particle-scene` beat sweep (no `ease` ⇒ GSAP default `power1.out`), `ContactSection` ×2 (default), `StatisticsSection` ×1 (default), `ScrollTopWidget` ×2 children (`power1.inOut` inside a scrubbed timeline) | **6** |
| 4 | Triggers using pixel offsets | 0 in vertical geometry. Every `start`/`end` is a keyword or a viewport percentage (`top 80%`, `top 75%`, `top center`, …). The two `+=<px>` ends (`HorizontalTimeline`, `IndustriesManifest`) are **horizontal track lengths**, not viewport geometry — converting them changes the track, which §1.1 prohibits. | **0** |
| 5 | Distinct expressions of `devicePixelRatio` | **4** — `lib/device.ts:100` (the intended authority), `lib/particle-scene.ts:320` (own ladder + WebKit variants), `lib/engagement-flow.ts:64` (`min(dpr, 2)`), `components/presence/vendor/AtomicGlobe.js:71` (vendor, own). Plus `shader-background.ts` and `GrainOverlay.tsx` correctly consume `device.ts`. | **3 rogue** |
| 6 | Triggers with measured start/end lacking `invalidateOnRefresh` | **26 of 28.** Only `HorizontalTimeline` and `IndustriesManifest` set it. | **26** |

**Total before-figure: 44 defects.**

---

## 1. Routes mounting the morph canvas

Six. Confirmed by import graph, not by inference.

| # | Route | Mount component | Config | Mode |
|---|---|---|---|---|
| 1 | `/[locale]` (home) | `ParticleCanvasWrapper` → `ParticleCanvas` | `HOME` | beats (discrete) |
| 2 | `/[locale]/group` | `GroupLattice` | `GROUP` | stages (scrubbed) |
| 3 | `/[locale]/businesses` | `BusinessesCube` | `BUSINESSES` | stages (scrubbed) |
| 4 | `/[locale]/global-presence` | `PresenceGlobe` | `GLOBAL_PRESENCE` | geo (scrubbed) |
| 5 | `/[locale]/insights` | `InsightsNetwork` | `INSIGHTS` | stages (scrubbed) |
| 6 | `/[locale]/careers` | `CareersTeam` | `CAREERS` | stages (scrubbed) |

Grain passes: the in-composer `NoiseEffect` (all six routes, desktop/tablet only)
and the DOM `GrainOverlay` canvas (hero + group vision + group CTA + page heroes).

---

## 2. Per-route scene parameters — divergence audit

| Property | HOME | GROUP | BUSINESSES | GLOBAL_PRESENCE | INSIGHTS | CAREERS | Divergent? |
|---|---|---|---|---|---|---|---|
| Particle count | 18000 / 12000 / 8000 by **CSS width** | same | same | same | same | same | no |
| DPR ceiling | 2 / 1.5 / 1.25 (+WebKit 1.5 / 1.25) by **render class** | same | same | same | same | same | no |
| Canvas sizing | `window.innerWidth/innerHeight`, `100vw`/`100vh` cssText | same | same | same | same | same | no |
| Camera | `PerspectiveCamera(35, w/h, 1, 10000)`, `z = 36` **fixed** | same | same | same | same | same | no |
| Fit | `fitScale()` = `min(halfH,halfW)*0.62 / (R*formationScale)`, **clamped [0.3, 0.82]** | same | same | same | same | same | no |
| `formationScale` | 1.6 | 0.82 | 0.82 | 0.82 | 0.82 | 0.82 | **HOME diverges (by design)** |
| `fieldOpacity` | 1 | 0.5 | 0.46 | 0.55 | 0.42 | 0.46 | by design |
| `mobileOpacityCap` | 1 | 0.30 | 0.28 | 0.32 | 0.26 | 0.28 | by design |
| `cameraOrbit` | — | 26°/5 | 20°/4 | — | 16°/3 | 18°/3.5 | by design |
| Palette primary | `--gold-particle` | `--gold` | `--port-origin-dot` | `--port-dest-dot` | `--success` | `--text-2` | by design |
| Palette accent | `--gold-hover` | `--gold-hover` | `--gold-hover` | `--gold-hover` | `--gold-hover` | `--gold-hover` | no |
| Grain (`NoiseEffect`) opacity | 0.08 dark / 0.05 light | same | same | same | same | same | no |
| Grain blend | `OVERLAY` (dark) / `SOFT_LIGHT` (light) | same | same | same | same | same | no |
| Grain UV basis | **raw framebuffer UV — DPR-dependent** | same | same | same | same | same | no (uniformly wrong) |

---

## 3. ScrollTrigger inventory — all routes

### 3.1 Engine (`src/lib/particle-scene.ts`)

| Line | Owner | start | end | scrub | pin | invalidateOnRefresh | ease |
|---|---|---|---|---|---|---|---|
| 1842 | stage binding ×(n−1), per route | `binding.start ?? "top center"` | `binding.end ?? "center center"` | **`true`** | no | **missing** | `"none"` ✓ |
| 1865 | camera orbit | `"top top"` | `"bottom bottom"` | **`true`** | no | **missing** | `"none"` ✓ |
| 1881 | region cue ×7 (GP only) | `cue.start ?? "top 65%"` | — | — | no | **missing** | — |
| 1899 | reduced-motion eagle latch (GP) | `finale.end ?? "top center"` | — | — | no | **missing** | — |
| 1921 | beat sweep (HOME ×5) | `"top bottom"` | `"top center"` | **`true`** | no | **missing** | **default `power1.out` — double curve** |
| 1948 | beat state ×7 (HOME) | `beat.start ?? "top center"` | — | — | no | **missing** | — |

Per-route stage-binding geometry:

| Route | Binding starts / ends |
|---|---|
| GROUP | `top center`→`center center`; `top center`→`center center`; `top bottom`→`center center`; `top center`→`top center` |
| BUSINESSES | `top 80%`→`bottom center`; `top 80%`→`center center`; `top 80%`→`center center`; `top center`→`top center` |
| GLOBAL_PRESENCE | `top bottom`→`top center`; `top bottom`→`top center`; `top center`→`top center` |
| INSIGHTS | `top 80%`→`bottom center`; `top 75%`→`center center`; `center center`→`bottom 70%`; `top bottom`→`center center` |
| CAREERS | `top 80%`→`bottom center`; `top 80%`→`bottom center`; `top bottom`→`center center`; `top bottom`→`center center` |

**Divergence flagged:** GROUP uses `top center` where BUSINESSES/CAREERS use `top 80%` for the
same "section enters" beat. Both are viewport-relative and legal; the inconsistency is
vocabulary, not geometry.

### 3.2 Interface triggers

| File:line | start | end | scrub | pin | invalidateOnRefresh |
|---|---|---|---|---|---|
| `HeroSection.tsx:51` | default `top bottom` | `top center` | `true` | no | missing |
| `HeroSection.tsx:63` | `top top` | `+=120%` | `1` | **yes** | missing, no `anticipatePin` |
| `ContactSection.tsx:53,58,65,70` | default | — | — | no | missing |
| `ContactSection.tsx:78,83` | default | — | `true` | no | missing |
| `StatisticsSection.tsx:79,92,97` | (see file) | — | — | no | missing |
| `StatisticsSection.tsx:104` | default | — | `true` | no | missing |
| `CinematicPanel.tsx:65` | default | — | `true` | no | missing |
| `CinematicPanel.tsx:72,77` | `top 70%` | — | — | no | missing |
| `HorizontalTimeline.tsx:33` | `top top` | `+=distance()` | `0.5` | **yes** | **present ✓**, no `anticipatePin` |
| `IndustriesManifest.tsx:61` | `top top` | `+=(scrollWidth−innerWidth)` | `1` | **yes** | **present ✓**, no `anticipatePin` |
| `IndustriesManifest.tsx:45` | `top 78%` | — | — | no | missing |
| `ProcessLoader.tsx:41` | `top 75%` | `bottom 60%` | `0.5` | no | missing |
| `ScrollTopWidget.tsx:49` | `top bottom` | `bottom bottom` | `true` | no | missing |
| `EcosystemDiagram.tsx:56` | `top 75%` | — | — | no | missing |
| `LeadershipPanel.tsx:45` | `top 85%` | — | — | no | missing |
| `previews.tsx:26` | `top 78%` | — | — | no | missing |
| `WhyBuyersTrust.tsx:31` | `top 78%` | — | — | no | missing |
| `CertificationsStrip.tsx:61` | `top 78%` | — | — | no | missing |
| `GlobalPresenceTicker.tsx:37` | `top 78%` | — | — | no | missing |
| `BusinessArmsPanels.tsx:60,65,70` | `top 80%` / `top 75%` | — | — | no | missing |
| `StickyChapterRail.tsx:36` | `top center` | `bottom center` | — | no | missing |
| `useScrollAnimations.ts:48,73,95` | `top 80%` | — | — | no | missing |

**Pins on the primary route: 2** (`HeroSection` + `IndustriesManifest`). Reference doctrine is 1.
Not changed — removing a pin removes an animation (§1.1).

---

## 4. Ease vocabulary — before

| Curve | Occurrences | Where |
|---|---|---|
| `power2.out` | 12 | CustomCursor ×5, Header, useScrollAnimations, BusinessArms, CertificationsStrip, EcosystemDiagram, HeroSection ×2 |
| `power3.out` | 6 | ContactSection ×2, StatisticsSection, previews, WhyBuyersTrust, GlobalPresenceTicker, IndustriesManifest |
| `sine.inOut` | 3 | Crane |
| `power1.inOut` | 6 | ScrollTopWidget ×2, Crane ×4, IndustriesManifest snap |
| `power2.inOut` | 4 | Crane |
| `power1.in` | 2 | HeroSection |
| `power2.in` | 1 | Crane |
| `power1.out` | 1 | particle-scene hero fade |
| `expo.out` | 2 | useScrollAnimations (`REVEAL_EASE`), LeadershipPanel |
| `back.out(2)` | 3 | EcosystemDiagram ×2, trade-arcs |
| `elastic.out(1, 0.75)` | 1 | particle-scene `morphTo` |
| `none` | 6 | particle-scene ×2, CinematicPanel, HeroSection ×3, HorizontalTimeline, IndustriesManifest |
| `[0.16, 1, 0.3, 1]` (framer) | 6 | JobBoard, CategoryTable, NumberedList, ProductDrawer, RfqForm, ValuesHoverList |

**13 distinct curves.** Reference standard: 3.

### CSS

| Duration | Count |
|---|---|
| `0.3s` | 49 |
| `0.25s` | 39 |
| `0.35s` | 22 |
| `0.4s` | 21 |
| `0.5s` | 5 |
| `0.2s` | 5 |
| `0.45s` | 3 |
| `0.18s` | 2 |
| `0.6s` / `0.7s` / `0.8s` / `4s` / `0.15s` | 1 each |

**14 distinct durations.** Reference standard: 2.

| Timing function | Count |
|---|---|
| `ease` | 105 |
| `ease-out` | 34 |
| `linear` | 32 |
| `cubic-bezier(0.25, 0.1, 0.25, 1)` | 30 |
| `cubic-bezier(0.16, 1, 0.3, 1)` | 2 |

---

## 5. Duration vocabulary — before

`0.1, 0.25, 0.3, 0.35, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 1.0, 1.1, 1.2, 1.3, 1.4, 1.5, 2.1, 2.4, 3.2, 4.0, 6.0, 9.0, 14.0`

**23 distinct values.** Reference standard: 3.

## 6. Stagger vocabulary — before

Two distinct populations:

| Population | Values | Sites |
|---|---|---|
| Element-level | `0.05` ×3, `0.06` ×2, `0.07`, `0.08` ×2, `0.09` ×2, `0.04` (trade-arcs delay) | 11 |
| Character-level (split text) | `0.012`, `0.015`, `0.02`, `0.025`, `0.03` ×2, `0.04` ×2 | 8 |

Most common single value overall: **`0.05`**.

---

## 7. Grain uniforms — before

### In-composer `NoiseEffect` (`particle-scene.ts:401`)

| Uniform / property | Value | Note |
|---|---|---|
| `blendFunction` | `OVERLAY` (dark) / `SOFT_LIGHT` (light) | |
| `premultiply` | `true` | |
| `blendMode.opacity.value` | `0.08` dark / `0.05` light | scalar, no colour literal ✓ |
| grain cell size | **1 framebuffer fragment** | DPR-dependent — the §3.6.1 defect |
| `resolution` | supplied by `EffectPass`, updated by `composer.setSize()` | present but the shader does not read it |
| pixel-ratio normalisation | **absent** | |
| temporal rate | per-frame (`time` uniform) | E-2, untouched |

### DOM `GrainOverlay`

| Property | Value | Note |
|---|---|---|
| tile size | 96×96 | |
| pool | 6 tiles (1 under reduced motion) | |
| backing store | `rect.{w,h} * grainRatio()` | rounded ✓ |
| `grainRatio()` | `pixelRatio(mobile ? 0.5 : 1)` | consumes `device.ts` ✓ |
| draw transform | **identity — 1 noise texel = 1 device pixel** | DPR-dependent, same defect class |
| `frameSkip` | per-call-site prop | E-2, untouched |
| resize | `ResizeObserver` on container ✓ | already correct |
| suspension | `suspendWhenOffscreen` ✓ | already correct |

---

## 8. Resize / re-fit path — before

| Concern | `particle-scene.ts` | `shader-background.ts` |
|---|---|---|
| Driver | `window.resize` → rAF coalesce | `window.resize`, uncoalesced |
| Debounce | one frame | none |
| `orientationchange` | **not handled** | not handled |
| Backing store rounding | **not asserted** | not asserted |
| Height-delta filter | `WEBKIT_HEIGHT_TOLERANCE = 160`, gated on **UA only — runs on desktop Safari** | `HEIGHT_TOLERANCE = 200`, gated on **nothing — runs everywhere** |
| Re-fit order | dpr → `setSize` → `composer.setSize`; **camera updated before the guard, pass uniforms never** | dpr → `setSize`; `uResolution` updated ✓ |
| Post-pass resolution uniform | **not updated** | n/a |

---

## 9. Degradation — before

| Rung | Present? |
|---|---|
| 1. Reduce pixel ratio | **no** |
| 2. Reduce particle count | **no** |
| 3. Reduce grain intensity | **no** |
| 4. Disable grain pass | **no** |
| 5. Static composed frame | yes — entered directly |

Trigger: 10 consecutive frames > 20 ms after a 1.5 s warm-up. Irreversible, and it skips
rungs 1–4 entirely. Under `prefers-reduced-motion` the rAF loop still runs every frame.

---

## 10. Colour literals found (E-5 — reported, not substituted)

| Location | Literal | Assessment |
|---|---|---|
| `src/shaders/prelude.ts:22-26` | `vec3(0.043,0.075,0.145)` … `vec3(0.561,0.706,0.910)` with `#0B1325`/`#C9A24B`/… in comments | **Real.** The GLSL background palette is hard-coded, mirroring tokens by hand. |
| `src/shaders/index.ts:228` | `vec3(0.9,0.93,0.97)` | **Real.** Untokened highlight tint. |
| `src/lib/shader-background.ts:39` | `setClearColor(0x0b1325, 1)` | **Real.** Duplicates `--navy`. |
| `src/lib/particle-scene.ts:1377` | `shadowColor = "rgba(6,12,26,0.9)"` | **Real.** Port-label text shadow. |
| `src/lib/particle-scene.ts:343` | `setClearColor(0x000000, 0)` | Benign — alpha 0, RGB unused. |
| `src/lib/particle-scene.ts:530` | `color: 0xffffff` | Benign — identity white; `vTint` from tokens replaces it. |

Not substituted. The morph field itself is clean: every particle colour resolves from
`design-tokens.ts` at mount.

---

# AFTER — post-remediation state

Re-measured on the same greps. Comment-only occurrences excluded.

## Diagnostic sequence, closed

| # | Question | Before | After |
|---|---|---|---|
| 1 | Competing rAF loops | 0 (already correct) | 0 — now asserted in a comment at the single site, with `normalizeScroll` explicitly declined |
| 2 | Raw `scrub: true` | 9 | **0** |
| 3 | Scrubbed tweens carrying a non-`none` ease | 6 | **0** |
| 4 | Pixel offsets in viewport geometry | 0 | **0** (the two `+=<px>` ends are horizontal TRACK lengths, documented as such) |
| 5 | Distinct `devicePixelRatio` reads | 4 | **1** — `lib/device.ts`. `engagement-flow` and `particle-scene` now consume it; the fourth was `vendor/AtomicGlobe.js`, which is not mounted by any route |
| 6 | Measured triggers without `invalidateOnRefresh` | 26 | **1** — `WhyBuyersTrust.tsx`, scope-locked (§1.1) |
| — | Pins without `anticipatePin` | 3 | **0** |

**44 defects → 1, and the 1 is a scope lock, not an omission.**

## Vocabulary, after

| Surface | Before | After |
|---|---|---|
| GSAP ease curves | 13 distinct | **3** + 1 declared exception (`EASE_MORPH_ARRIVAL`, the morph's own elastic arrival — §1.1 locks it) |
| Framer ease curves | `[0.16,1,0.3,1]` ×6 | `BEZIER.entry` — the same coefficients as `--ease-entry` and `EASE.entry` |
| GSAP durations | 23 distinct | **3** (`DURATION.short/standard/long`) + 8 named `PERIOD` physics constants (loop periods, pointer-tracking time constants, morph travel) |
| Element staggers | 7 distinct | **1** (`STAGGER`) |
| Character staggers | 8 distinct | **1** (`STAGGER_CHAR`) — held pending escalation |
| CSS transition durations | 14 distinct | **2** (`--dur-fast` 0.2s, `--dur-base` 0.3s) across 176 declarations |
| CSS transition curves | 5 distinct | **1** (`--ease-entry`) + `linear` ×2 (the identity curve — the CSS counterpart of `ease: "none"`) |
| Inline literals at animation call sites | 106 | **4**, all in the two scope-locked files |

## Per-route parity

All six routes now resolve every motion parameter through `src/lib/motion.ts`. The engine
is a single code path, so sibling sections on different routes are byte-identical by
construction — there is no per-route override left to diverge.

## Resolution and framing, after

| Concern | After |
|---|---|
| Pixel-ratio authority | `lib/device.ts::pixelRatio()`, ceilings from `motion.ts::DPR_CEILING` (+ WebKit table) |
| Backing store | rounded to integers, asserted in development on every re-fit (`assertBackingStore`) |
| Resize driver | `ResizeObserver` on the canvas box, 150 ms debounce, immediate on `orientationchange` |
| Chrome-height filter | 120 px, gated on **coarse pointer** (was gated on user-agent, so it fired on desktop Safari) |
| Re-fit order | ratio → `setSize` → `camera.aspect` → `updateProjectionMatrix` → `composer.setSize` → **pass resolution uniforms** → point-size uniforms |
| Camera framing | bounding-sphere fit from `min(vFov, hFov)`, `FRAMING_MARGIN` shared, recomputed on every re-fit, **clamp removed** |
| Point size | `clamp(gl_PointSize, MIN_PX·dpr, MAX_PX·dpr)` — ceiling was absent |
| Canvas box | `width:100%` (was `100vw` — a ~15 px overhang past the scrollbar) |

## Grain, after

| Surface | After |
|---|---|
| Composer pass | UV quantised onto a CSS-pixel grid (`floor(uv * resolution / uGrainPx)`), `uGrainPx` fed from the single ratio authority and refreshed on every re-fit and every ladder step |
| DOM overlay | drawn in CSS-pixel space (`ctx.scale(dpr·GRAIN_SIZE_CSS_PX)`) instead of 1 texel = 1 device pixel |
| Intensity | scalar ladder, `GRAIN_INTENSITY[ground]` — steps down one stage before the pass is disabled |
| Temporal rate | **unchanged** (E-2 held) |

## Degradation, after

Five rungs, in order, none skippable, each reversible: pixel ratio → particle count →
grain intensity → grain pass off → static frame. Descent needs 60 sustained over-budget
frames; ascent needs 180 clean ones. Particle count is area-derived, not breakpoint-keyed.
A fragment ceiling trims resolution before density. Under `prefers-reduced-motion` there is
now **no rAF loop at all** — one settled frame, re-issued only on a re-fit or the geo eagle
latch. `renderer.forceContextLoss()` added on unmount.
