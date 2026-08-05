# Mechanic Specs — usta.agency

One spec per **mechanic**, as required by `../EXTRACTION_BRIEF.md`. These describe *how things
move, blend and respond* — triggers, thresholds, before/after values, curves, durations, z-order.
They deliberately do not describe what the site says or which colour it is.

Every value is from the shipped source (`../source/`) or from `getComputedStyle()` at
1440 / 768 / 390. Nothing is estimated. Where a number could not be measured reliably in a
headless browser (the per-frame cursor lerp), the spec says so and quotes the source target instead.

| Spec | Interaction model | Answers |
|---|---|---|
| [`smooth-scroll-shell`](smooth-scroll-shell.spec.md) | scroll (library) | Q7 — what carries the "buttery" read |
| [`preloader-intro`](preloader-intro.spec.md) | time, gated on load | — |
| [`text-reveal-words-splitted`](text-reveal-words-splitted.spec.md) | scroll, play-once | Q6, Q7 |
| [`marquee-strip`](marquee-strip.spec.md) | time + hover | — |
| [`custom-cursor`](custom-cursor.spec.md) | pointer | Q2 |
| [`nav-dropdown`](nav-dropdown.spec.md) | hover ≥769 / click ≤768 | — |
| [`hover-wipe-bg-animate`](hover-wipe-bg-animate.spec.md) | hover, pure CSS | Q2, Q3 |
| [`webgl-particle-field`](webgl-particle-field.spec.md) | scroll + pointer + time | **Q1, Q5**, Q6 |
| [`postfx-dot-grid`](postfx-dot-grid.spec.md) | time, viewport-reactive | **Q4** |

"Q*n*" refers to the open questions in `../EXTRACTION_BRIEF.md`. All seven are now closed.

## Reading order

Start with **`smooth-scroll-shell`** — the DOM contract it describes (fixed overlays must be
siblings of `#smooth-wrapper`) is a precondition for everything else on the page.

Then **`webgl-particle-field`** and **`postfx-dot-grid`**, which together account for essentially
all of the site's visual character. The remaining six are conventional DOM/GSAP work.

## The one-line summary of the whole page

> Nothing here is click-driven except the nav. Scroll drives every visual; hover drives cursor
> size, marquee speed and the expertise wipe. There are no tabs, accordions, carousels or state
> switching anywhere.

## Before porting anything

Read [`../ERRATA.md`](../ERRATA.md). It lists two shipped shader bugs and three real breakpoint
defects in the target that should **not** be reproduced, plus four corrections to the first-pass
docs.
