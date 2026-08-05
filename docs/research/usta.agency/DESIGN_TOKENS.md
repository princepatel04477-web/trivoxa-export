# Design Tokens — usta.agency

Source: `https://www.usta.agency/` inspected 2026-08-04 via Playwright MCP at 1440 / 768 / 390.
All values are from `getComputedStyle()` or the site's own stylesheets — nothing here is estimated.

Stylesheets read in full:
- `https://www.usta.agency/_astro/hoisted.d75b784e.css` (18,328 b — @font-face + custom components)
- `https://www.usta.agency/_astro/index.ba2dd3e4.css` (10,712 b — Tailwind reset + utilities)

## Colors

The palette is intentionally tiny — the page is black, the type is white/gray, and all colour comes from the WebGL layer.

| Token | Value | Used for |
|---|---|---|
| Background | `rgb(0, 0, 0)` / `#000000` | `body` background; header `bg-black` |
| Foreground (primary) | `rgb(255, 255, 255)` | headings, nav, marquee text, cursor fill |
| Foreground (muted) | `rgb(209, 213, 219)` / `#D1D5DB` (Tailwind `gray-300`) | all subtitles, expertise column titles + items, contact label, email |
| Foreground (footer) | `rgba(255, 255, 255, 0.7)` | `©Copyright 2025 Usta - Modena` |
| Hairline rule | `rgba(255, 255, 255, 0.2)` (`border-white/20`) | 1px bottom border under expertise column titles |
| Mobile menu scrim | `rgba(0, 0, 0, 0.9)` (`bg-black/90`) | full-screen dropdown < 1024px |
| Text-selection bg | `rgb(255, 243, 221)` / `#FFF3DD` | `#content *::selection` |
| Text-selection fg | `rgb(0, 0, 0)` | `#content *::selection` |
| Text stroke (outline type) | `1px white` < 1024px, `2px white` ≥ 1024px | `.text-outline` |

### WebGL particle palette
Six `THREE.Color` values cycled per-particle (`particle[i] = palette[i % 6]`):

```
#f48c18   orange       (uColorA)
#4089dd   blue         (uColorC, uColorD)
#33478B   deep indigo  (uColorB)
#8A5894   purple
#DE466E   pink
#EC9354   peach
```

Uniform assignment at init: `uColorA = #f48c18`, `uColorB = #33478B`, `uColorC = #4089dd`, `uColorD = #4089dd`.

## Typography

Two self-hosted variable fonts, both woff2 with `font-display: swap`, subset by unicode-range
(latin, latin-ext, cyrillic, cyrillic-ext, vietnamese).

| Family | Weight axis | Role |
|---|---|---|
| **Oswald Variable** | `200 700` | all display type — hero title, section titles, statement, marquees |
| **Montserrat Variable** | `100 900` | body, nav, subtitles, expertise lists, email, footer |

`html, body { font-family: "Montserrat Variable", sans-serif; cursor: none; }`

There is also a leftover `@import` for Google Fonts **Inter** (`wght@200..700`) at the top of
`hoisted.css`. No element on the page computes to Inter — treat it as dead weight, do not port it.

### Type scale (computed, desktop 1440 → mobile 390)

| Element | 1440px | 768px | 390px | Family / weight | line-height | tracking |
|---|---|---|---|---|---|---|
| `.title` (`#main-title`) | 130px (`xl:text-[130px]`) | 50px | 60px | Oswald 600 | `1em` | — |
| `.title` (section h2) | 120px | 50px | 60px | Oswald 600 | `1em` | — |
| `.subtitle` (`#main-description`, section `p`) | 32px | 30px | 24px | Montserrat 100 | `1.2` on hero, `2rem`/`36px` elsewhere | — |
| Statement (section 2) | 50px | 30px | 30px | Oswald 400, `uppercase` ≥768 | `1.2` (60px) | — |
| Expertise marquee `.strip` | 150px (`xl`) | 50px (`md:title`) | 60px | Oswald 600 | `1em` | `2px` |
| Team marquee `.strip-title` | 110px (`lg`) / 130px (`2xl`) | 75px | 60px | Oswald 600 | `1em` | — |
| Expertise column `h3` | 30px | 30px | 30px | Montserrat 500 | 36px | `2px` |
| Expertise `li` | 20px | 20px | 20px | Montserrat 500 | 28px | — |
| Team member role | 30px (`lg:text-3xl`) | 20px (`md:text-xl`) | 18px (`text-lg`) | Montserrat 300 | — | — |
| Nav links | 18px (`text-lg`) | 18px | 18px | Montserrat 400 | 28px | — |
| Contact label | 18px (`lg:text-lg`) | 16px | 16px | Montserrat 400 | 28px | — |
| Email link | 100px (`lg:text-[100px]`) | 60px (`text-[60px]`) | 36px (`text-4xl`) | Montserrat 200 | `leading-tight` (125px @100px) | — |
| Footer | 16px | 16px | 16px | Montserrat 400 | 24px | — |
| Loader | 20px (`text-xl`) | 20px | 20px | Montserrat 200 | 28px | `4px` |

`.strip-title` has an extra `@media (max-width: 480px) { font-size: 60px }` rule that overrides the
36px base — so it is 60px on phones, 50px at 640, 75px at 768, 110px at 1024, 130px at 1536.

## Spacing & layout

- **Container**: `width: 100%`, `margin-inline: auto`, `padding-inline: 1rem` (16px), max-widths
  `640 / 768 / 1024 / 1280 / 1536` at the matching breakpoints. At 1440 the content column is
  **1280px wide starting at x=80**, with 16px inner padding → text begins at **x=96**.
- **Section rhythm (≥1024px)**: every section is `min-h-screen` with `py-40` (160px) and
  `mb-[50vh]` (450px at 900px tall) — the hero uses `lg:py-60` (240px). Below 1024px the 50vh
  margin collapses to `0` and sections butt up against each other.
- **Grid gaps**: expertise grid `gap-10` (40px) → `md:gap-20` (80px); statement grid `gap-20` (80px);
  nav list `gap-8` (32px).
- Tailwind's default 4px scale is in play throughout: 4 / 8 / 12 / 16 / 24 / 32 / 40 / 48 / 80 / 160 / 240 px.

## Border radius / shadows

- Only one radius on the page: `9999px` (`rounded-full`) on the custom cursor.
- **No box-shadows anywhere.** The `.shadow` utility is compiled but unused on this route.

## Breakpoints

Stock Tailwind: `sm 640` · `md 768` · `lg 1024` · `xl 1280` · `2xl 1536`, plus one custom
`@media (max-width: 480px)` for `.strip-title`.

The JS uses its own device flag — `Dn = window.innerWidth <= 768` — recomputed on every `resize`.
It gates: cursor visibility, particle opacity, scroll-trigger start position, camera travel scale,
menu open trigger (hover vs click), and the post-processing dot size.

## Custom component classes (verbatim from hoisted.css)

```css
.title, .strip-title {
  margin-bottom: 1rem; font-family: "Oswald Variable", sans-serif;
  font-size: 50px; font-weight: 600; line-height: 1em; color: #fff;
}
@media (min-width:1024px){ .title { font-size: 120px } }

.subtitle { font-size: 1.5rem; line-height: 2rem; font-weight: 100 }
@media (min-width:768px){ .subtitle { font-size:1.875rem; line-height:2.25rem } }
@media (min-width:1024px){ .subtitle { font-size: 2rem } }

.text-outline { color: transparent; -webkit-text-stroke: 1px white }
@media (min-width:1024px){ .text-outline { -webkit-text-stroke: 2px white } }

/* dot separator injected after every marquee word */
.strip-title .text-outline, .strip-title .text-filled { display:inline-flex; align-items:center }
.strip-title .text-outline::after, .strip-title .text-filled::after {
  content:""; margin-left:2rem; margin-top:1rem; display:inline-block;
  height:.5rem; width:.5rem; border-radius:9999px; background:#fff;
}
@media (min-width:768px){ …::after { margin-left: 2.5rem } }
@media (min-width:1024px){ …::after { margin-left: 5rem } }

.strip-title a { display:flex; align-items:flex-end; gap:1rem }
.strip-title a::before { content:"-" }

/* white bar that wipes up behind an expertise item on hover */
.bg-animate { position:relative; z-index:10; mix-blend-mode:difference }
.bg-animate::before {
  content:""; position:absolute; left:-.5rem; right:-.5rem; bottom:.5rem; top:100%;
  z-index:0; background:#fff; transition: all .7s cubic-bezier(0,0,.2,1);
}
.hover\:before\:top-0:hover::before { top: 0 }

::-webkit-scrollbar { width: 0 }            /* scrollbar fully hidden */
#content { background: none }
#content *::selection { background:#FFF3DD; color:#000 }
```

## Global UI behaviours worth porting to `globals.css`

1. `cursor: none` on `html, body` — the page draws its own cursor.
2. `::-webkit-scrollbar { width: 0 }` — no visible scrollbar.
3. Custom selection colours (`#FFF3DD` on black).
4. `mix-blend-mode: difference` used twice: the cursor and every `.bg-animate` list item.
5. No CSS `@keyframes` at all — every animation is GSAP-driven. See `BEHAVIORS.md`.
