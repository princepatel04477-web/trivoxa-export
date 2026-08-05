# usta.agency — extraction record

> ## ⚠ SUPERSEDED IN PART — read `ERRATA.md` first
>
> This file is the **first-pass, static-only** record, written before browser automation was
> available. A full browser pass has since run (screenshots at 1440/768/390, interaction sweep,
> computed styles) and a shader-level read of the bundle. Two conclusions below are **wrong**:
>
> 1. *"The particles are the grain"* — they are not. The grain is a separate `ShaderPass`
>    dot-grid. See `components/postfx-dot-grid.spec.md`.
> 2. *"the `/clone-website` pipeline could not run its extraction phase"* — no longer true.
>    Playwright MCP is connected; Phase 1 ran in full.
>
> Everything under **Decisions taken against this evidence** still stands — those are project
> decisions, not findings.

**Method: STATIC ONLY.** At the time of writing, no browser automation was connected to this
workspace, so the `/clone-website` pipeline could not run its extraction phase. Everything
below was read from the site's shipped source over HTTP:

- `/` (markup)
- `/_astro/hoisted.4c39c7ce.js` (752 KB — app + Three.js + GSAP)
- `/_astro/index.ba2dd3e4.css`, `/_astro/hoisted.d75b784e.css`

**What this method cannot produce**, and therefore what is NOT in this file:
computed styles, screenshots, per-state capture, scroll/click/hover sweeps,
responsive breakpoint observation. Those are the skill's core and all of them
need a live browser. Nothing here is estimated — if it is written down, it was
read from a file.

---

## Stack

| Concern | Finding |
|---|---|
| Framework | Astro (`/_astro/` bundles, one hoisted script) |
| 3D | Three.js — `WebGLRenderer`, `PerspectiveCamera`, `BufferGeometry`, `ShaderMaterial`, `Points`, `PointsMaterial`, `gl_PointSize` |
| Motion | GSAP + ScrollTrigger + ScrollSmoother + ScrollToPlugin, `normalizeScroll` |
| Smooth scroll | GSAP ScrollSmoother (NOT Lenis / Locomotive) |
| Page transitions | **None.** No Barba, Swup, or Astro ViewTransitions. `window.location.href=` — full page loads. |
| DPR | clamped; a `devicePixelRatio < 2` branch is present |
| CSS | Tailwind |

## Particle shader — uniform interface

```
uniform float uIntro       entrance driver
uniform float uOpacity
uniform float uProgress    morph driver (scroll-scrubbed)
uniform float uSize
uniform float uTime
uniform vec2  uCursor      per-particle pointer interaction
uniform vec2  uResolution
uniform vec3  uColorA, uColorB, uColorC, uColorD
```

`random(` appears 41× and `noise(` 2× inside the shader source. **The grain is
in the shader, not in the DOM** — there is no `feTurbulence`, no noise texture
and no grain layer anywhere in their CSS. ✅ Still correct.

> ~~The particles are the grain.~~ **Wrong.** The grain is a *second, independent* full-screen
> `ShaderPass` that draws an animated dot-grid masked to the dark regions of the frame
> (`1. - smoothstep(0., 0.2, brightestChannel)`). It would render with zero particles on screen.
> Grid density is viewport-driven (`uSize` 40→300) and each cell re-rolls every frame, so it
> shimmers rather than sitting still like film grain.
> Full analysis: `components/postfx-dot-grid.spec.md`.

## Palette

Six stops referenced in JS: a cool-to-warm ramp running deep blue → blue →
violet → rose → salmon → orange. Values recorded in the bundle; deliberately not
transplanted (see Decisions).

## Blend

`.mix-blend-difference` and `.bg-animate { mix-blend-mode: difference }`, plus a
`difference` layer at `z-index: 999999` (a cursor). This is the "elements
getting mixed" effect.

## Motion vocabulary

- `"none"` ×43 — every scroll-linked tween. No ease on top of a scrub.
- `power3.inOut` ×4, `power3.out` ×2, `power1.inOut` ×1
- `scrub: 1` ×3; `start:"top top"`, `end:"bottom bottom"`, one `top 120%`
- Hover, in CSS, is minimal Tailwind: a `::before` travelling to `top: 0`
  (vertical wipe), plus `hover:mr-4` / `hover:pr-4` — they animate margin and
  padding, which moves the layout box.

---

## Decisions taken against this evidence

| Finding | Action on Trivoxa |
|---|---|
| Four colour uniforms | Adopted the STRUCTURE (4-stop ramp, `uSpectrumA–D`). Their six hexes were **not** copied — a palette is an identity, and lifting it makes this site read as a clone of that agency. Ours ramps cool→warm and lands on the existing brand gold. |
| `uCursor` | Adopted. Implemented as screen-space Gaussian repulsion in our own vertex shader. |
| Shader `random()` grain | Already covered by our per-particle `aPhase` shimmer. |
| ScrollSmoother | Not adopted. Lenis is already wired correctly (single rAF, `lagSmoothing(0)`); swapping is churn with no user-visible gain. |
| No page transitions | Not adopted. We keep the panel wipe — matching them here means shipping white flashes. |
| Hover animates margin/padding | Not adopted. Layout-triggering. Ours is `scaleY`, same direction, compositor-only. |
| `mix-blend-mode: difference` | Available as an opt-in utility. Not blanket-applied — it inverts text against the field and needs a live check per surface. |
