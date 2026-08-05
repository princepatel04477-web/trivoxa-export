# Errata — corrections from the second extraction pass

Second pass run 2026-08-05: independent re-extraction via Playwright MCP at 1440 / 768 / 390 plus a
shader-level read of `_astro/hoisted.4c39c7ce.js`. Everything below was verified against the
shipped source or `getComputedStyle()`, and the affected files have been corrected in place.

The bulk of the first pass held up — document heights, the ScrollSmoother config, the intro
timeline, `data-amount` values, the responsive table and the cursor `data-cursor` map all
reproduced exactly. These are the deltas.

---

## 1. The grain is not the particles — `EXTRACTION.md`

**Was:** *"The particles are the grain."*

**Is:** A separate full-screen `ShaderPass` draws an animated dot-grid, masked to the dark regions
of the frame (`1. - smoothstep(0., 0.2, brightestChannel)`). It is independent of the particle
system and would render with zero particles on screen. Each cell re-rolls every frame
(`random(ipos * uTime)`), so it shimmers rather than sitting still.

**Why it mattered:** this was open question #4 in `EXTRACTION_BRIEF.md`. Porting "particles as
grain" would have produced a fundamentally different texture — grain that moves *with* the
content instead of sitting behind it.

→ `components/postfx-dot-grid.spec.md`

## 2. Expertise marquee span count — `BEHAVIORS.md`, `PAGE_TOPOLOGY.md`

**Was:** "8 spans in markup, quadrupled to 32."

**Is:** **2** spans in raw markup → **8** after JS. Verified: `index.html` contains the string
`Area of` exactly twice.

The duplication line is `strip.innerHTML += strip.innerHTML + strip.innerHTML + strip.innerHTML`
— the right-hand side evaluates before assignment, so all three reads return the original content:
exactly 4 copies, which is what makes `xPercent: 0 → -25%` seamless.

## 3. `lg:col-start-2` does work — `PAGE_TOPOLOGY.md`

**Was:** *".container is not display:grid, so lg:col-start-2 does nothing"* — flagged
"verify this when building".

**Is:** There is an intermediate `<div class="grid lg:grid-cols-2 gap-20">` between `.container`
and the column. Measured on `#agency .grid`: `display: grid`,
`grid-template-columns: 584px 584px`, `gap: 80px`. The class works as written.

## 4. Morph order was never recorded — `BEHAVIORS.md`

**Was:** models listed in config-array order, with no statement of the visible sequence.

**Is:** load order ≠ morph order. `position=v0[0]`, `position2=v0[3]`, `position3=v0[2]`,
`position4=v0[1]`, giving **rocket → satellite → terra → astronaut**. Confirmed against captures
(hero = rocket, expertise = terra).

A builder reading only the old table would have sequenced it rocket → astronaut → terra →
satellite.

## 5. Dangling CSS animation — `DESIGN_TOKENS.md`

`DESIGN_TOKENS.md` correctly said "no `@keyframes` at all", but `.strip` still declares
`animation: run 20s linear infinite` (plus `.strip.reverse` / `.strip.slower` variants).
**No `@keyframes run` exists in either stylesheet** — these are dead references. So is
`transition: animation-duration`, which is not an animatable property.

Only `width: max-content` in that rule does anything. Copying the block verbatim carries three
lines of noise that imply a CSS fallback which does not exist.

## 6. Missing figures now recorded

| Item | Value |
|---|---|
| Morph point count | 30,000 desktop / 15,000 ≤768px |
| Cursor repulsion radius | 4 world units (≈29% of viewport height at `z=12`, `fov=60`) |
| Cursor max displacement | 0.5 units at rest, 1.5 at burst peak; `+12px` point size |
| Burst magnitude | up to **6×** radial scale at each leg midpoint |
| GLTF payload | 8.37 MB across 4 files |
| `/cover.png` | exists, 863,910 b (was "verify before downloading") |

## 7. Two shipped shader bugs (documented, not corrected upstream)

In the post-process fragment shader:

- `modColor *= 1./dpr;` appears **twice** on consecutive lines → brightness scales by `1/dpr²`.
- `max(max(color.r, color.g), color.g)` tests **green twice, never blue** — so blue particles
  (`#4089dd`) fail to suppress the grain around them while orange ones do.

Both are almost certainly typos, both ship, and both are visible in the captures. Reproduce only
for a byte-exact clone; fix in a port.

## 8. Breakpoint inconsistencies in the target

Three uncoordinated systems coexist:

| System | Thresholds |
|---|---|
| Tailwind CSS | 640 / 768 / 1024 / 1280 / 1536 (+ a `max-width: 480` for `.strip-title`) |
| JS mobile flag | `innerWidth <= 768` |
| Post-fx `uSize` | 540 / 768 / 1020 / 1400 |

Consequences: between **769–1023px** the nav is hover-triggered (desktop JS branch) but still
renders as a full-screen fixed scrim (mobile CSS) — effectively unopenable on a touch device in
that range. The custom cursor has a matching dead zone (JS writes position; CSS keeps it
`display:none` until 1024).

These are defects, not design. Do not reproduce them.

## 9. Stale references removed

- `PAGE_TOPOLOGY.md` pointed at a `CONTENT.json` that was never written. Replaced with a note;
  the team LinkedIn URLs are third-party personal data and stay in `source/page.html` only.
- `ASSETS.md` described itself as a manifest for a `scripts/download-assets.mjs` in "Phase 2".
  Phase 2 does not run under `EXTRACTION_BRIEF.md`; that script does not and should not exist.
- `EXTRACTION.md` opened by stating no browser automation was connected. Playwright MCP is
  connected; the header now scopes that claim to when it was written.
