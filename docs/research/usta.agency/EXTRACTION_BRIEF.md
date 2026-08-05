# usta.agency — extraction brief

**Mode: EXTRACTION ONLY.** Decided 2026-08-04.

This constrains the `/clone-website` run. That skill's defaults are
*pixel-perfect, customization: none, pure emulation* — it maps page topology and
dispatches builder agents to rebuild each section to match the target. Those
defaults are **overridden here**. The skill's own scope note says user
instructions win over defaults; this file is that instruction.

---

## Rules for the run

**DO**
- Phase 1 in full: screenshots at 1440 / 768 / 390, the mandatory interaction
  sweep (scroll, click, hover, responsive), page topology.
- Write specs to `docs/research/components/` describing **mechanics**: triggers,
  thresholds, before/after computed styles, transition curves and durations,
  interaction model, blend modes, z-order.
- Record findings as artifacts. Extraction is the deliverable.

**DO NOT**
- Dispatch builder agents. Phases 2–5 (Foundation Build, Component Dispatch,
  Page Assembly, Visual QA Diff) do not run.
- Touch `src/` during the run.
- Copy text, headings, section order, IA, routes, images, or palette values.
  Trivoxa's content is fixed. The target's copy and assets are theirs.
- Rebuild any Trivoxa section to match a usta.agency section.

**Transplant rule.** Only presentation MECHANICS cross over — how a thing moves,
blends, and responds. Never what it says or which colour it is. Structure, not
substance.

---

## Already answered statically — do not re-extract

See `EXTRACTION.md`. Settled: the stack (Astro, Three.js `Points` +
`ShaderMaterial`, GSAP + ScrollTrigger + ScrollSmoother), the full particle
uniform interface (`uProgress`, `uIntro`, `uSize`, `uTime`, `uCursor`,
`uOpacity`, `uResolution`, `uColorA`–`uColorD`), `random()` ×41 in-shader,
no DOM grain layer, no page-transition library, the ease vocabulary
(`"none"` ×43 + three named curves), and `mix-blend-mode: difference` on
`.mix-blend-difference` / `.bg-animate`.

## Open questions the browser pass must settle — ✅ ALL CLOSED 2026-08-05

These are the ones source alone cannot reach. Answers below; full detail in `components/`.

| # | Question | Answer | Spec |
|---|---|---|---|
| 1 | Morph: what forms, continuous or discrete? | **rocket → satellite → terra → astronaut**. One continuous scrub over 8100px (6 × vh × 1.5), but eased per-leg by `smoothstep(0.01,0.99,fract)` so it reads as 3 beats. Each leg midpoint fires a radial **burst** up to 6× scale. | `webgl-particle-field` §2 |
| 2 | Which elements carry `mix-blend-difference`? | Exactly two: `#cursor` (z 999999) and every `.bg-animate` expertise `<li>` (which also blends its inner `<div>` again). Backdrop is near-black in both cases — that is why it works. | `custom-cursor`, `hover-wipe-bg-animate` |
| 3 | `.bg-animate` — what is under it? | A `::before` white bar, `top: 100% → 0` over 0.7 s `cubic-bezier(0,0,.2,1)`, bleeding ±8px. The item blends `difference` over it, flipping gray-300 text to `rgb(46,42,36)`. Pure CSS, no JS. | `hover-wipe-bg-animate` |
| 4 | Grain: particles, or a second pass? | **A second pass.** Full-screen `ShaderPass` dot-grid, masked to dark regions, re-rolled every frame. Independent of the particles. `EXTRACTION.md` was wrong. | `postfx-dot-grid` |
| 5 | `uCursor` radius and displacement? | Radius **4 world units** (≈29% of viewport height at `z=12`/`fov=60`), smoothstep falloff. Displacement **0.5** units at rest → **1.5** at burst peak, plus **+12px** point size. World-space, not screen-space. | `webgl-particle-field` §3 |
| 6 | Which triggers pin vs scrub, at what thresholds? | **Nothing pins.** 3 scrubs: `uProgress` (`#content`, +6×vh×1.5), camera (`#content`, +7×vh×1.5), ambient rotation (`body`, top top→bottom bottom). Text reveals are **no-scrub, play-once** at `top 90%`/`60%`. The `top 120%` seen statically is ScrollSmoother's internal `sections()` helper — unused by this app. | `webgl-particle-field`, `text-reveal-words-splitted` |
| 7 | What carries the "buttery" read? | ScrollSmoother `smooth: 1.5` (long catch-up), `smoothTouch: 0.2`; plus fixed-window staggers (`stagger:{amount}`) so blocks of any length resolve in the same time; plus concurrent intro choreography. | `smooth-scroll-shell`, `text-reveal-words-splitted` |

### Original wording

1. **The morph.** What form does the field hold at rest, and what does it become?
   Capture `uProgress` at several scroll depths against a screenshot of each.
   Is the morph one continuous scrub or discrete beats?
2. **Element mixing.** Which elements actually carry `mix-blend-difference`, and
   what is beneath them at that moment? Capture the same element over the field
   and over a flat surface. This decides whether it is safe on Trivoxa at all.
3. **`.bg-animate`.** What is it, where does it sit in z-order, and what is its
   backdrop? A difference blend against nothing is a no-op — something is under
   it.
4. **Grain read.** Screenshot the field at 1:1 and zoom. Is the grain the
   particles themselves, or is there a second sampling pass inside the fragment
   shader?
5. **Cursor response.** Radius and displacement of the `uCursor` effect as a
   fraction of viewport, measured against a screenshot with the pointer parked.
6. **Scroll choreography.** Which triggers pin, which scrub, and at what
   thresholds. Static gave `scrub: 1`, `top top`, `bottom bottom`, `top 120%` —
   confirm which belongs to which section.
7. **Within-page transitions.** They have no page-to-page transitions. Record
   what carries the "buttery" read instead — reveal choreography, stagger, the
   ScrollSmoother configuration.

## Output

- `docs/research/usta.agency/BEHAVIORS.md` — the behaviour bible ✅
- `docs/research/usta.agency/PAGE_TOPOLOGY.md` — section map + interaction model ✅
- `docs/design-references/usta.agency/` — screenshots at all three widths ✅ (15)
- One spec per mechanic in `docs/research/usta.agency/components/` ✅ (9 files incl. index)

Also produced: `DESIGN_TOKENS.md`, `TECH_STACK_ANALYSIS.md`, `ASSETS.md`,
`ERRATA.md` (second-pass corrections), and `source/` — the target's own
HTML/CSS/JS as read, so every claim is auditable without re-fetching.

Then stop and report. Application to Trivoxa is a separate, explicitly
authorised step. **No `src/` file has been touched.**
