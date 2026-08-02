# CORRECTIVE DIRECTIVE — SITE-WIDE POLISH & DEFECT ELIMINATION

**Target:** Trivoxa Group (Next.js 14 / TypeScript / Tailwind / GSAP ScrollTrigger / Lenis / Three.js via react-three-fiber)
**Mission:** Bring the entire site to zero-defect launch state. No frontend faults, no animation faults, no backend faults, no interaction faults, no morph-system faults. Every page must behave as a multinational trading enterprise's site — precise, reversible, silent in the console.
**Execution agent:** Claude Code, operating directly in the repository.

---

## RULES OF ENGAGEMENT — READ BEFORE TOUCHING ANY FILE

These are absolute. Violating one fails the entire directive.

1. **DO NOT TOUCH — locked sections.** The Contact/CTA logo treatment, the "Why Choose Us" section content, and the GSAP ScrollTrigger + Lenis stack itself are frozen. You may *fix the wiring and configuration* of GSAP/Lenis (sync, callbacks, cleanup) — you may **not** replace, swap, or re-library the motion stack. Do not introduce Motion.dev, Framer Motion, or any competing animation runtime.
2. **Color tokens only.** Reference exclusively the color tokens already defined in the codebase (Tailwind config / CSS custom properties). Do **not** introduce new hex values, do **not** hardcode color names, do **not** rename existing tokens. If a color is wrong, it is wrong at the token level — flag it, do not patch it inline.
3. **India-as-data, not identity.** India may appear in data (HS codes, ports, specs, inner-page SEO) but never in brand identity (headlines, hero, taglines). If any polish work surfaces India in a brand slot, correct it to data placement. Do not add regional or startup cues.
4. **Globe doctrine.** The 3D globe hero on Global Presence is preserved. The flat map is used only for the trade-routes section. Trade-route arcs are line geometry, never particles. Do not convert one into the other.
5. **Performance budget is a gate, not a goal.** 60fps across device tiers is a hard requirement. `prefers-reduced-motion` fallbacks are mandatory on every animated section. A fix that ships a stutter is not a fix.
6. **No collateral edits.** Fix the fault and its direct dependencies. Do not refactor unrelated code, do not restyle passing sections, do not "improve" copy that was not flagged. Targeted edits only.
7. **Analyze before executing.** For each fault: reproduce it, identify the root cause, identify every place the same defect class recurs, then fix all instances. Never patch a symptom on one page and leave the same bug live on four others.

---

## WAR COUNCIL — ROSTER

| General | Domain | Objective |
|---|---|---|
| **Ptolemy** | Morph Engine Integrity | Every particle-morph transition is reversible, scroll-synced, and state-clean — home + five inner pages |
| **Hephaestion** | Motion & Scroll Systems | GSAP/ScrollTrigger/Lenis correctness, pinning, reduced-motion, 60fps, trigger cleanup |
| **Cassander** | Frontend, Layout & Rendering | Responsive integrity, hydration, canvas paint, CLS, font/image loading, console silence |
| **Craterus** | Interaction & Navigation | Every click, link, CTA, hover, tap, focus, and nav path resolves correctly |
| **Perdiccas** | Backend, Forms & Data | Route handlers, quote/contact submission, 404s, SEO/metadata, hollow-page integrity |
| **Antigonus** | Consistency & Doctrine | Final governance sweep — tokens, doctrine, locked sections, typographic and behavioral consistency |

---

## PTOLEMY — MORPH ENGINE INTEGRITY *(flagship)*

**Reported fault (reproduce first):** On the Home page, scrolling **down** morphs the globe into the vessel. Scrolling **up**, the vessel stays a vessel — it does not reform into the globe. The transition is one-directional. Treat this as a *class* of defect, not a single instance: the shared InstancedMesh engine drives every morph pair on the site, so the reverse failure very likely recurs across Group, Businesses, Global Presence, Insights, and Careers. Audit **every** transition pair for the same reverse defect.

**Root-cause diagnostic — run in this order:**

1. **Lenis ↔ ScrollTrigger sync.** Confirm ScrollTrigger receives Lenis's scroll deltas: `lenis.on('scroll', ScrollTrigger.update)` is wired, Lenis is driven off a ticker that also advances ScrollTrigger, and any custom `scrollerProxy` is correct. If upward deltas never reach ScrollTrigger, `onEnterBack`/`scrub` cannot fire on reverse — this alone produces the exact "forward works, reverse dead" symptom.
2. **ScrollTrigger config.** Reject `once: true`, reject `toggleActions: "play none none none"`, reject any bare `onEnter`-only callback with no reverse counterpart. The morph must be driven **either** by `scrub` (progress bound continuously to scroll) **or** by symmetric callbacks — `onEnter`/`onLeaveBack` and `onLeave`/`onEnterBack` — that call `.play()` / `.reverse()` in matched pairs.
3. **Morph progress driver.** The InstancedMesh morph must interpolate a continuous uniform (e.g. `uProgress` 0→1) between **two retained position buffers**: source (globe) and target (vessel). Confirm both endpoint buffers persist for the duration of the transition. A reverse that fails because the source buffer was overwritten or discarded is the likely culprit — the engine must be able to interpolate target→source at any moment.
4. **One-way state gates.** Hunt for any boolean like `hasMorphed = true` that is set on first entry and never reset, gating the animation so it physically cannot run backward. Morph state must be **derived from scroll progress** — idempotent and reversible — not from a latch.
5. **Shared-engine handoff.** Because one engine serves many sections/pages, confirm it resets its "current shape" on section handoff and on route change. A singleton that carries the last shape into the next section will start the wrong morph or refuse to reverse.

**Fix standard:** Prefer a **`scrub`-bound continuous morph** so forward and reverse are the *same code path* — desync becomes structurally impossible. Only if a deliberate hold-then-release beat is required should you use discrete `.play()`/`.reverse()`, and then all four directional callbacks must be wired symmetrically.

**Verification (all must pass):**
- Scroll down through the section, then up — the globe fully reforms.
- Slow scrub in both directions — morph tracks scroll 1:1, no lag, no snap.
- Fast flick both directions — no stuck intermediate frame, no half-morphed freeze.
- Navigate away and back — section re-initializes to its correct entry shape.
- Repeat the full check on every morph pair across all six pages.

---

## HEPHAESTION — MOTION & SCROLL SYSTEMS

**Inspect and correct:**
- **Trigger cleanup.** On unmount and on route change, every ScrollTrigger and GSAP tween is killed. Orphaned triggers from a previous page are a primary cause of ghost animations and reverse failures. Verify `ScrollTrigger.getAll().forEach(t => t.kill())` (or scoped `gsap.context()` cleanup) runs on teardown.
- **Refresh on layout change.** `ScrollTrigger.refresh()` fires after fonts load, images settle, and on resize/orientation change. Stale trigger positions cause animations to fire at the wrong scroll offset.
- **Pinning integrity.** Any pinned section releases cleanly, leaves no residual spacer, and does not overlap the following section on any breakpoint.
- **`prefers-reduced-motion`.** Every animated section has a fallback: morphs resolve to their final static shape, scroll-scrubbed motion is disabled, particle drift is stilled. No exceptions.
- **60fps budget.** Profile the heaviest sections (hero particle field, globe, morph transitions). Cap `devicePixelRatio`, throttle particle counts on lower tiers, ensure no layout thrash inside RAF. If a section drops frames, it is not shipped.

**Verification:** Scroll the full length of each page with the FPS meter open — no sustained dips below 60 on desktop tier. Toggle reduced-motion at OS level — every section renders its static fallback with no motion and no broken layout. Navigate rapidly between pages — no accumulating triggers (check `ScrollTrigger.getAll().length` returns to baseline).

---

## CASSANDER — FRONTEND, LAYOUT & RENDERING

**Inspect and correct:**
- **Hero canvas paint.** Flagged during audit: confirm the hero WebGL/particle canvas actually paints on the production build, not just locally. Rule out a hero that renders blank/white due to a hydration gap, a canvas mounted before context is ready, or an SSR/client mismatch on the Three.js layer.
- **Hydration.** Zero hydration mismatches. Client-only Three.js and scroll code is properly guarded (dynamic import with `ssr: false` where needed). No "Text content did not match" or "Hydration failed" warnings.
- **Responsive integrity.** Sweep every breakpoint (mobile / tablet / desktop / wide). No horizontal overflow, no clipped text, no overlapping sections, no broken grids. Cards reflow correctly.
- **CLS.** No layout shift from late-loading fonts, images, or canvases. Reserve space. Images carry explicit dimensions. Fonts load without FOUT jump.
- **Image loading.** All imagery uses `next/image` with correct sizing and priority on above-the-fold assets. No oversized payloads.
- **Console silence.** The production console is clean — no errors, no React warnings, no failed asset requests, no CORS noise.

**Verification:** DevTools open across all four breakpoints on every page — no overflow, no console output. Lighthouse CLS in the green. Hero visibly paints on the deployed URL.

---

## CRATERUS — INTERACTION & NAVIGATION

**Inspect and correct:**
- **Every link resolves.** Navbar, footer, in-body CTAs, "Explore" links, breadcrumb paths — all route to a real, correct destination. No `href="#"`, no dead anchors, no 404s.
- **CTA wiring.** "Request a Quote," "Contact Our Team," "Explore Businesses," "View Global Presence," "Explore Industries," "Become a Partner," and every "Explore Industry/Product Exports/Service Exports" button routes correctly and consistently.
- **Clicking faults.** No element that looks clickable but isn't; no hit-area that misses; no button whose click is swallowed by an overlay (a stray full-viewport canvas or particle layer with the wrong `pointer-events`). Verify `pointer-events` on decorative canvas layers is `none` so it never intercepts clicks beneath it.
- **Hover / tap / focus states.** Every interactive element has a visible hover state (desktop) and a working tap state (touch). Focus rings are present and keyboard-navigable.
- **Mobile navigation.** The nav opens, closes, traps focus while open, closes on route change, and does not scroll-lock the body permanently.
- **Language switcher** (if implemented): each option resolves; if not yet wired, it must not present as functional. No dead controls shown to buyers.

**Verification:** Click every link and CTA on every page — all resolve. Tab through each page — full keyboard reachability, visible focus. On touch emulation, the decorative layers never block a real button.

---

## PERDICCAS — BACKEND, FORMS & DATA

**Inspect and correct:**
- **Form submission.** "Request a Quote" and "Contact" flows submit successfully, validate input, show success and error states, and handle failure without a dead-end. No silent failures. Confirm the route handler / API endpoint returns correct status and the client surfaces it.
- **Route handlers & SSR/ISR.** No server errors, no unhandled rejections, no failed data fetches in the build or at runtime. Check the deploy logs.
- **404 / error boundaries.** A real, on-brand 404 page exists and routes cleanly. Error boundaries catch client failures without white-screening.
- **Metadata & SEO.** Every page carries correct `<title>`, meta description, canonical, and Open Graph tags. Inner-page SEO may carry India-as-data placement; brand slots stay clean per doctrine.
- **Hollow-page integrity.** Product pages, the Jewellery and Furniture pages, and the Insights section were flagged as hollow/empty. For each: either it carries real content or it is removed from navigation and sitemap. **A buyer must never reach an empty page.** Do not ship a live nav link to a blank route. Flag each unresolved page explicitly in your report for a content/removal decision if data is not yet available.

**Verification:** Submit both forms with valid and invalid input — correct behavior each time. Hit a bad URL — clean 404. Crawl the nav — no link lands on an empty or placeholder page. Deploy logs show no server errors.

---

## ANTIGONUS — CONSISTENCY & DOCTRINE *(final sweep)*

**Inspect and correct across the whole site:**
- **Token discipline.** No stray hex, no hardcoded color names anywhere in the diff. Everything references existing tokens.
- **Locked sections untouched.** Confirm the Contact/CTA logo treatment, "Why Choose Us" content, and the GSAP/Lenis stack were not altered beyond permitted wiring fixes.
- **Typography consistency.** Display, body, and mono roles are applied consistently and only where each belongs (mono for manifest/ledger data only). No drift.
- **Doctrine.** India appears as data, never as identity. Credibility cues (ledger rows, hairlines, footnotes, grain, documentary photography) are consistent and intact. Nothing reads as regional or startup.
- **Cross-page behavioral parity.** Every industry page, category page, and product page follows the same structure and the same interaction patterns. A fix applied to one is applied to all of its siblings.

**Verification:** Grep the diff for hex patterns and color-name literals — none present. Visually diff the locked sections against their prior state — unchanged. Walk all sibling pages — identical structure and behavior.

---

## ACCEPTANCE GATE — ALL MUST PASS BEFORE LAUNCH

- [ ] Globe↔vessel morph reverses correctly on the Home page, both scrub and flick.
- [ ] Every morph pair on all six pages reverses correctly; no stuck shapes.
- [ ] No orphaned ScrollTriggers after navigation; teardown returns to baseline.
- [ ] `prefers-reduced-motion` renders a clean static fallback on every animated section.
- [ ] 60fps sustained on desktop tier across every page; no thrash inside RAF.
- [ ] Hero canvas paints on the deployed production URL.
- [ ] Zero console errors/warnings and zero hydration mismatches in production.
- [ ] No horizontal overflow or layout break at any breakpoint on any page.
- [ ] Every link and CTA resolves; no dead anchors, no 404s, no click-swallowing overlays.
- [ ] Both forms submit, validate, and surface success/error states.
- [ ] No live navigation link lands on an empty or placeholder page.
- [ ] Diff contains no stray hex or hardcoded color names.
- [ ] Locked sections and the motion stack are unaltered beyond permitted wiring fixes.

---

## EXECUTION ORDER

1. Ptolemy first — the morph reversal is the flagship fault and its root cause (Lenis↔ScrollTrigger sync, trigger cleanup) overlaps Hephaestion's domain; fixing it correctly clears defects downstream.
2. Then Hephaestion, Cassander, Craterus, Perdiccas in sequence.
3. Antigonus runs last as the governance sweep over everyone's diffs.
4. Report each fault found, its root cause, every location it recurred, and the fix applied. Flag any page requiring a content-or-removal decision (Jewellery, Furniture, Insights, hollow product pages) rather than deciding it silently.
5. Do not report "complete" until every box in the Acceptance Gate is checked and reproduced.

**Continue.**
