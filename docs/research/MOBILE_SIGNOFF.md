# Mobile Corrective Directive — Sign-off (§8)

Measured against the built site, not asserted. Reproduce with:

```bash
npm install --no-save playwright && npx playwright install chromium
npm run build
bash scripts/mobile/serve.sh
node scripts/mobile/audit.mjs           # overflow / tap targets / type floor
node scripts/mobile/motion-check.mjs    # §5 motion doctrine
node scripts/mobile/chrome-check.mjs    # §7 drawer, CTA, header, form
node scripts/mobile/vitals-check.mjs    # CLS, LCP, keyboard
node scripts/mobile/landscape-check.mjs # §8.1 landscape
node scripts/mobile/desktop-check.mjs   # desktop non-regression
```

## §8.1 Device matrix

| Device | Viewport | Result |
|---|---|---|
| iPhone SE (3rd gen) | 375 × 667 | Pass |
| iPhone 15 / 16 | 393 × 852 | Pass |
| iPhone Pro Max | 430 × 932 | Pass |
| Pixel 7a / mid-tier Android | 412 × 915 | Pass — static gates only, see below |
| iPad Mini portrait | 744 × 1133 | Pass |
| Landscape (667/852/915/1133 wide) | — | Pass, 6 routes each |

Portrait sweep covers 16 routes at 360 / 375 / 390 / 393 / 412 / 430 / 744.

## §8.2 Gates

| Gate | Threshold | Result |
|---|---|---|
| Horizontal overflow at 360/390/430 | zero | **0** across 16 routes × 3 widths |
| Tap targets under 44px | zero | **0** (was 213 mid-Phase-2; audit reported 90 on the homepage) |
| Text under 13px | zero | **0** (audit reported 11.52–12.8px) |
| Cumulative Layout Shift | < 0.05 | **0.000** on all 7 sampled routes |
| Largest Contentful Paint | < 2.5s | **464–1632ms** (local network — a floor, not a field value) |
| Reduced-motion parity | full content, zero motion | Pass — 0 characters hidden, text parity ≥ full-motion |
| Keyboard / screen-reader on drawer and forms | clean | Pass — 11 checks |
| Sustained frame rate | ≥ 55fps, no dip below 45 | **Not measured — see below** |
| Lighthouse Performance (mobile, throttled) | ≥ 85 | **Not measured — see below** |
| Interaction to Next Paint | < 200ms | **Not measured — see below** |
| Device temperature after 3 minutes | no perceptible warming | **Not measurable in CI** |

### What is not signed off, and why

Four gates require a real GPU on a real handset. Headless Chromium rasterises
WebGL through SwiftShader, a software rasteriser: any frame rate, INP or
Lighthouse Performance number it produced would measure the rasteriser, not the
site. Reporting one would be worse than reporting none, so they are left open.

They are also precisely the gates the render-budget work exists to satisfy, so
they should be the first thing checked on the Pixel 7a. What *can* be said from
the code is what each surface will ask of the device:

- DPR is clamped to 1.5 on phones, 1.75 on tablets, 2 on desktop, with the class
  resolved from the shortest viewport edge so a landscape phone cannot be
  promoted to the tablet budget (Phase 1).
- Per-surface backing stores measured at 390×844 DPR 3: 0.51 MP + 0.18 MP +
  0.19 MP, against the audit's 3.38 MP and 3.88 MP (Phase 1).
- Post-processing (bloom + chromatic aberration) is HIGH tier only, so no phone
  and no tablet runs the full-screen chain (§4.3).
- Instance counts intersect the per-class ceiling with the tier budget, so
  tiering can only ever reduce work below an already-validated number (§4.3).
- The runtime probe demotes a tier if p95 frame time over the first 90 frames
  exceeds 20ms, persisted for the session (§4.2); the streak monitor still hands
  off to the poster after 10 consecutive missed frames.
- Off-screen and backgrounded canvases cancel their RAF loops entirely, and the
  GPU idle gate stops issuing draw calls once the field has settled invisible
  (Phase 1).

## §8.3 Overflow one-liner

The directive's snippet reports twelve elements on the homepage. Run verbatim it
still reports eleven — all marquee rows correctly clipped inside
`overflow: hidden` ancestors, which the snippet cannot see. `audit.mjs` walks up
for a clipping ancestor before flagging, and reports **zero real overflow**. The
html/body `overflow-x: hidden` net was stripped during Phase 1 verification so
the net could not mask a genuine defect.

## Execution sequence (§9)

| Phase | Scope | Commit |
|---|---|---|
| 1 | DPR clamp, canvas suspension, safe areas, viewport units | `77151eb` |
| 2 | Breakpoint ladder, type floors | `5dba8e1` |
| 2 | 44px tap targets + measurement harness | `4a93dc4` |
| 3 | Motion doctrine on touch | `1e5b2c4` |
| 4 | Render tier, particle budgets, globe, poster | `1acfc8a` |
| 5 | Drawer, quote affordance, header, forms | `6b61a00` |
| 5 | Progressive disclosure + fixed-overlay regression | `a2a0300` |
| 6 | Verification, CLS fix, sign-off | this commit |

## Defects found during verification

Each was found by measuring rather than by reading, and each is fixed:

1. **Homepage magazine grid overflowed 360px by 23px.** A twelve-column track
   reserved eleven 32px gaps — a 352px floor no content could go under.
2. **Reveal images overflowed during their tween.** A 4% zoom put 2% outside the
   viewport for the 0.8s the tween was in flight; dropped below the md rung.
3. **The closed contact modal was fully tabbable.** `opacity: 0` hides from a
   mouse, not from the focus order — every field in the closed quote form was
   reachable by keyboard and announced by a screen reader.
4. **Three subcategory pages rendered a completely unstyled table.**
   `ProductTable` renders `.ind-table` but `industry-page.css` was imported only
   by `/industries/[slug]`.
5. **A JS/CSS breakpoint mismatch would have trapped the reader.** The
   horizontal timeline built its pin at ≥900px while its CSS stacked the rail at
   ≤1023px; between the two the section pinned with steps 2–n unreachable.
6. **Pins survived rotation.** All three were gated on a one-shot
   `window.innerWidth`, so a handset that loaded in landscape kept a pinned hero
   and a pinned 7,680px folio after rotating to portrait.
7. **The ticker rested mid-loop under reduced motion**, cutting the corridor
   list in half, because the global block collapses animations rather than
   removing them.
8. **The drawer took ~2.5s to open** and ignored reduced motion entirely (GSAP
   tweens are not CSS animations).
9. **The drawer opened off-screen after the scroll lock landed.**
   `.mobile-nav` was `position: fixed` with no `top`, so it inherited the pinned
   body's `-1800px` offset — tapping the menu appeared to do nothing.
10. **`/rfq` shifted 0.298 CLS**, six times the gate, on the conversion page:
    `RfqForm` suspends on `useSearchParams` and had a `null` fallback.

## Standing constraints (§0)

- **No hardcoded colours.** Every colour added resolves to an existing token.
  The poster ships as a CSS mask specifically so it can take
  `var(--gold-particle)` rather than baking gold into an SVG. The one literal
  in the codebase remains `themeColor` in `layout.tsx`, documented in Phase 1 as
  coupled to `--bg`.
- **No new typefaces.** Mobile changes scale, spacing and tracking only.
- **Motion stack unchanged.** GSAP + ScrollTrigger + Lenis. Framer Motion was
  already present and is untouched; nothing was added.
- **Locked sections.** Contact/CTA logo block and "Why Choose Us" have layout
  adjustments only, via the shared ladder and floors — no content or logo
  treatment was rewritten.
- **India in data, not identity.** No headline, hero, tagline or brand-voice copy
  was changed. The only copy added is the drawer's "Back" and the CTA's dismiss
  label.
- **`prefers-reduced-motion`** is honoured on every surface touched, and
  measured for content parity rather than assumed.

## Desktop non-regression

Measured at 1440×900 after every phase: type floors resolve `0px`, gutter 32px,
`pointer: coarse` false, container 1684px / `.tvx` pages 1240px, no horizontal
overflow, and document heights unchanged (18077 / 12459 / 2825px on
`/`, `/group`, `/rfq`).
