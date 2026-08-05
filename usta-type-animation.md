# CORRECTIVE DIRECTIVE — GRAIN AND HOVER
## OPERATION: FINE TOUCH

**Issued to:** Claude Code
**Origin:** Chairman's order, narrowed — adopt the grain treatment and hover behaviour from the reference. Nothing else.
**Reference:** `usta.agency`
**Classification:** Two subsystems. Additive only.

---

## 0. SCOPE — THIS DIRECTIVE IS DELIBERATELY SMALL

You are building **two things**:

1. A **site-wide grain field**
2. A **shared hover vocabulary**

That is the entire operation.

### 0.1 THIS DIRECTIVE NARROWS OPERATION LIVING SURFACE

Operation Living Surface proposed a broad presentation-motion rebuild. **The Chairman has narrowed the order.** The following are **withdrawn** and must not be built:

- ~~Surface doctrine / living surface treatments (Leonnatus)~~ — **WITHDRAWN**
- ~~Typographic reveal system (Meleager)~~ — **WITHDRAWN**
- ~~Scroll narrative and section handoff (Nicanor)~~ — **WITHDRAWN**
- ~~Ledger marquee system (Philotas)~~ — **WITHDRAWN**
- ~~Entrance sequence (Polyperchon)~~ — **WITHDRAWN**

If Operation Living Surface has already been dispatched, **halt it and report** before proceeding. See § 5.1.

### 0.2 LOCKS — ALL PRIOR LOCKS REMAIN, PLUS THESE

1. **Existing animations are locked.** Every animation currently on the site stays exactly as it is. No stage added, removed, retimed, or reordered.
2. **Existing elements are locked.** No component added, removed, restructured, or restyled beyond the hover states defined here.
3. **Layout is locked.** No spacing, sizing, grid, or positional change.
4. **The morph system is locked.** Operation Steady Hand governs it. Do not touch its choreography.
5. **Motion stack locked.** GSAP + ScrollTrigger + Lenis.
6. **Colour locked.** No hex literals. No colour names. Tokens only. **This directive introduces zero new colours** — grain modulates luminance, hovers use existing tokens.
7. **Content locked.** Zero copy, headline, section-order, IA, or route changes.
8. **Contact/CTA logo treatment and "Why Choose Us"** — untouched.
9. **60fps** hard requirement. **`prefers-reduced-motion`** fully supported.
10. **Sibling parity** — applied to one page in a family means applied to all.

---

## 1. THE REFERENCE — WHAT WAS VERIFIED, WHAT IS TRANSLATION

**Verified:** the reference is a WebGL particle site — it is publicly described as using smoothly scrolling animated 3D particles, and it holds an Awwwards Honorable Mention. This matters directly: **their grain sits over a particle canvas in exactly the situation ours does.** The problem they solved is our problem.

**Not verified:** direct inspection of their grain shader and hover implementations failed from this position — the browser session was unresponsive and the secondary extraction returned an error. The grain and hover specifications below are therefore written to the **standard of craft for that class of build**, translated into our register. They are not a line-by-line copy.

If you want an exact match rather than an equivalent, send screen recordings of the specific hovers in question and the spec will be tightened to them.

### 1.1 THE ACTUAL DIAGNOSIS — WHY OUR GRAIN READS WEAKER THAN THEIRS

We already have a film-grain postprocess pass. The Chairman still perceives the difference. The reason is structural, not a tuning problem:

> **Our grain lives inside the WebGL canvas. Theirs lives over the entire document.**

On the reference, grain is a single unbroken field across every pixel — hero, body copy, cards, footer. It reads as one photographic surface. On ours, grain exists only where the canvas is, so the page visibly splits: a textured hero sitting above clean, flat, untextured content. That boundary is what makes our pages read as static.

**The correction is not more grain. It is grain everywhere, at one intensity, from one source.**

---

## 2. GENERALS AND MANDATES

*Fourth roster. Non-colliding with the WebGL stability directive (Seleucus, Ptolemy, Hephaestion, Cassander, Craterus, Perdiccas), Operation Steady Hand (Parmenion, Nearchus, Antigonus, Lysimachus, Coenus, Eumenes, Peucestas, Antipater), and Operation Living Surface (Leonnatus, Meleager, Nicanor, Philotas, Polyperchon, Amyntas, Clitus).*

---

### ATTALUS — Grain Unification

**Objective:** one grain field across the entire document, at one intensity, from one source.

**Orders:**

1. **Build a single document-level grain overlay.** Fixed position, full viewport, topmost in stacking order, `pointer-events: none`. It covers everything: canvas, content, navigation, footer.

2. **Noise source — CSS/compositor, not a second WebGL context.** A tiled noise texture or a baked turbulence sprite. Under no circumstances create a second WebGL or continuously-repainting canvas layer for this; the frame budget will not survive it and the context-leak risk is already under investigation.

3. **Tile discipline.** Tile size chosen so no repeat is perceptible at any viewport width. Verify at the widest breakpoint in the matrix — tiling artefacts appear on ultra-wide before anywhere else.

4. **Cell size is DPR-constant.** Consume the calibration law from Operation Steady Hand § Lysimachus: one noise cell occupies **1.5 – 2.0 CSS pixels** on every display. Scale the tile against the clamped DPR. Do not fork a second calibration.

5. **Temporal rate is fixed at 24 – 30 Hz**, driven by a stepped animation — not a per-frame JavaScript update, and not tied to refresh rate. Grain must resolve identically on a 60Hz panel and a 120Hz panel. Per-frame grain strobes at high refresh and crawls when throttled; this single detail is the difference between reading as film and reading as digital noise.

6. **Luminance only.** Blend so the pass modulates luminance and introduces no hue. Intensity resolves from a tokenized value. One value site-wide.

7. **RECONCILE WITH THE EXISTING CANVAS PASS — THIS IS THE STEP MOST LIKELY TO BE MISSED.**
   Once the document overlay exists, the hero region carries **two** grain layers and will read visibly grainier than the rest of the page. Reduce or remove the in-canvas postprocess grain so that **total perceived grain is identical inside and outside the canvas region.** Verify by capturing a screenshot spanning the canvas boundary and confirming no visible seam in grain density. If the seam is visible, the reconciliation is wrong.

8. **Tiering.** On lower device tiers, grain becomes **static** — animation stops, texture remains. Grain is never removed. A page without it will not match its siblings, and a removed texture reads as a rendering fault.

9. **Contrast verification after application.** Re-check text contrast on every surface once grain is live. If any text or focus indicator falls below standard, reduce intensity — grain does not get to cost us legibility.

**Done when:** grain is continuous across every pixel of every route, shows no seam at the canvas boundary, no tiling repeat at any width, identical apparent size at DPR 1/2/3, and identical tempo at 60Hz and 120Hz.

---

### DEMETRIUS — Hover Vocabulary

**Objective:** one shared hover system. Currently these states are almost certainly instant or near-instant, which is the single largest contributor to the site feeling unfinished at close range.

**Orders:**

1. **Build shared primitives first, apply second.** Four primitives total. Any per-page hover implementation is a defect.

2. **The four primitives:**

   | Primitive | Behaviour |
   |---|---|
   | **Directional rule** | A rule or underline wipes in from the edge the pointer entered and exits through the edge it leaves. Direction is computed from the bounding rectangle on enter and leave. Continuity of direction is what separates this from a fade — it is the effect most worth getting right. |
   | **Masked label swap** | The label translates up under a clip mask while a duplicate rises into its place. Travel distance equals one line height. For navigation and primary links. |
   | **Surface sweep** | Tokenized surface fill sweeps across the element from the pointer's entry edge. For buttons. No scale, no shadow, no lift. |
   | **Media scale in fixed frame** | On cards and image blocks, the media scales inside a fixed mask. **The frame does not move.** Paired with the directional rule on the card's label. |

3. **Timing — asymmetric.** Enter 0.28 – 0.40s. **Exit 0.20 – 0.28s, faster than enter.** Easing `power2.out`, from the Steady Hand motion configuration module. The asymmetry is the detail that reads expensive; a symmetrical hover reads as a default.

4. **Banned outright:** scale bounce, colour flash, drop shadows appearing on hover, magnetic buttons, custom cursors, cursor-following blobs, elastic or overshoot curves, anything that moves the element's layout box.

5. **Focus parity is mandatory.** Every keyboard focus state triggers the same resolved appearance as hover, using the non-directional variant of each primitive. Focus indicators stay visible and tokenized. Keyboard traversal of every route must be legible end to end.

6. **Touch.** Resolved state applied instantly on tap. No content is reachable only through hover. Verify no element depends on hover to be understood.

7. **Transform and opacity only.** No animation of width, height, margin, padding, or any layout-triggering property — including the rule wipe and the surface sweep, both of which must be built on transforms.

8. **`will-change` applied on enter, released on completion.** Permanently promoted layers exhaust GPU memory and are a live suspect in the WebGL failures already under investigation. This applies to the grain overlay as well — it is one persistent layer and one only.

**Done when:** every interactive element on every route resolves through one of the four primitives, enter and exit timings are asymmetric, and full keyboard traversal shows the same states.

---

### ARISTONOUS — Budget, Access, and Acceptance

**Orders:**

1. **The full-viewport blended grain overlay is the one real performance risk in this directive.** A blended layer across the entire viewport forces the page into a compositing path that is cheap on desktop and can be expensive on mobile. Measure on the lowest supported tier before closure. If it costs frames, the mitigation is **static grain on that tier** — never removal, never a thinner texture.

2. **Degradation order under frame pressure.** Sacrifice in this order and no other:
   1. Grain animation (grain becomes static, texture retained)
   2. Media scale on card hover
   3. Surface sweep (collapse to opacity shift)

   **The morph system is never degraded to fund this directive.**

3. **`prefers-reduced-motion`:** grain renders static and at full intensity. Hovers resolve instantly to their end state. The page must look like a deliberately still design, never like scripts that failed.

4. **Sibling parity audit** across every page in every family before closure.

5. Run § 3. No partial closure.

---

## 3. ACCEPTANCE GATE

### 3.1 Grain

| Check | Requirement |
|---|---|
| Coverage | Continuous across every pixel of every route — canvas, content, nav, footer |
| Canvas boundary | **No visible seam in grain density** where the canvas region meets the page |
| Tiling | No perceptible repeat at any width, verified at the widest breakpoint |
| DPR 1 / 2 / 3 | Cell size 1.5 – 2.0 CSS px, identical apparent size on all three |
| 60Hz vs 120Hz | Identical grain tempo, verified by recorded playback |
| Hue | Zero hue introduced; luminance modulation only |
| Intensity | One tokenized value site-wide |
| Contrast | All text and focus indicators pass standard with grain live |
| Low tier | Static grain, texture retained, never removed |
| Layers | Exactly one persistent promoted layer for grain |

### 3.2 Hover

| Check | Requirement |
|---|---|
| Coverage | Every interactive element on every route uses one of the four primitives |
| Implementation | Shared primitives only; zero per-page implementations |
| Direction | Directional rule enters and exits on the correct edges |
| Timing | Exit measurably faster than enter |
| Paint | Zero layout-triggering properties animated |
| `will-change` | Applied on enter, released on completion |
| Focus parity | Keyboard focus produces the same resolved state, visible on every step |
| Touch | Resolved state on tap; zero hover-dependent content |
| Banned effects | None present |

### 3.3 Integrity

| Check | Requirement |
|---|---|
| Animation audit | Zero changes to any existing animation |
| Element audit | Zero elements added, removed, or restructured |
| Layout audit | Zero spacing, sizing, or grid changes |
| Content audit | Zero copy, heading, section-order, IA, or route changes |
| Colour audit | Zero hex literals, zero colour names, zero new hues |
| Motion vocabulary | Zero local easing or duration literals |
| Morph system | Untouched and undegraded |
| Locked sections | Contact/CTA logo and "Why Choose Us" unchanged |
| Frame rate | 60fps sustained on every tier |
| Reduced motion | Static grain, instant hover states, looks finished |
| Sibling parity | Identical across every page in each family |

---

## 4. DIAGNOSTIC SEQUENCE — RUN BEFORE BUILDING

1. Locate the existing film-grain postprocess pass and record its current intensity. Attalus § 7 depends on this value.
2. Confirm the clamped DPR value and the Lysimachus calibration law exist and are readable. If not, escalate — do not fork a second calibration.
3. Inventory every interactive element type across all routes. Map each to one of the four primitives before writing any hover code.
4. Confirm the Steady Hand motion configuration module exists. All timings read from it.
5. Measure baseline frame rate on the lowest tier **before** adding the grain overlay, so the cost is attributable.

---

## 5. ESCALATION FLAGS

**5.1 — PRIORITY.** If Operation Living Surface has already been dispatched to build reveals, marquees, surface treatments, or an entrance sequence — halt and report before proceeding. This directive supersedes it with a narrower scope, and the two must not be executed together.

**5.2** — Reducing the in-canvas grain to match the document overlay proves impossible without altering the postprocess chain in a way that conflicts with the WebGL stability directive.

**5.3** — 60fps cannot be held on the lowest tier after the § 2 Aristonous degradation order is fully exhausted.

**5.4** — Text contrast fails on any surface at the minimum grain intensity that still reads as textured.

**5.5** — An interactive element type does not map cleanly to any of the four primitives.

**5.6** — The Steady Hand motion configuration module or the DPR clamp does not yet exist.

---

## 6. EXECUTION PROTOCOL

- One grain overlay. Four hover primitives. Built once, applied everywhere.
- Any per-page implementation of either system is a defect and is rebuilt.
- Surgical edits. Minimum file opens.
- No narration. No progress commentary.
- Report at the acceptance gate or an escalation flag only.
- Session budget is constrained. Spend it on edits.

---

## 7. FINAL ORDER

Nothing on this site changes position, timing, or wording.

Two things change: the page acquires a single unbroken photographic surface, and it responds when touched.

That is what separates a site that was built from a site that was finished.

**Same animations. Same elements. Grain everywhere. Every hover deliberate.**

Execute.
