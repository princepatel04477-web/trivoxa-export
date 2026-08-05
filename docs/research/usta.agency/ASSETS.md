# Asset Inventory — usta.agency

Enumerated from the DOM and from the network log (`static: true`).

> **Download status (updated after the browser pass).** All URLs below were fetched and verified
> reachable, then **deliberately removed from the repo again** — `EXTRACTION_BRIEF.md` forbids
> copying the target's assets, and 8.4 MB of another agency's GLTF models plus 2 MB of font
> subsets are exactly that. What remains under `assets/` is two 600-byte SVGs kept as visual
> reference. Verified sizes are recorded below so nothing needs re-fetching to be costed.
>
> There is no `scripts/download-assets.mjs` and there should not be — Phase 2 does not run.

## 3D models (required — these ARE the hero)

Ordered by **morph sequence**, which is not the order the config array declares — see
`components/webgl-particle-field.spec.md` §2.

| # | URL | Verified size | Attribute | Sampler |
|---|---|---|---|---|
| 1 | `/_astro/rocket_v2.33f015f5.gltf` | 1,379,858 b | `position` | `mainSamplerIndex: 0` |
| 2 | `/_astro/satellite_v2.76b104df.gltf` | 3,866,932 b | `position2` | `mainSamplerIndex: 1` |
| 3 | `/_astro/terra.4f65f023.gltf` | 2,086,574 b | `position3` | `single: true` |
| 4 | `/_astro/astronauta_v5.df173f4e.gltf` | 1,040,684 b | `position4` | `mainSamplerIndex: 4` |

**8.37 MB total.** Self-contained `.gltf` (no sibling `.bin` or texture requests), so a plain fetch
of each is sufficient. All four must parse before the preloader can reach 100% — the counter is
driven by a `THREE.LoadingManager` with `total = 4`.

## Fonts

Served from `/_astro/`, woff2 variable, unicode-range subset. Only the **latin** subsets were
actually fetched on an English page load:

| URL | Family | Axis |
|---|---|---|
| `/_astro/montserrat-latin-wght-normal.bb2f9008.woff2` | Montserrat Variable | 100–900 |
| `/_astro/oswald-latin-wght-normal.241ced7f.woff2` | Oswald Variable | 200–700 |

Also declared but not loaded on this route: `*-latin-ext-*`, `*-cyrillic-*`, `*-cyrillic-ext-*`,
`*-vietnamese-*` for both families (10 `@font-face` blocks total).

**Recommendation:** don't download these — use `next/font/google` for Oswald + Montserrat and let
Next handle subsetting. Same files, better pipeline.

## Images

| URL | Used by | Natural size | Instances |
|---|---|---|---|
| `/linkedin-in.svg` | every team-member link | 131 × 150 | **51** in DOM (marquee ×4 duplication of 13 unique members) |

That is the **only** raster/vector image on the page. No hero image, no backgrounds, no overlays,
no layered compositions — the visual richness is entirely WebGL + type.

## SVG (inline → extract to `icons.tsx`)

**6 `<svg>` in DOM**, of which 2 are ours (the rest belong to the CookieScript badge).

### `UstaLogoIcon` — `<a href="/" data-cursor="400">` in the header
`class="logo h-6" height="24" viewBox="0 0 1220 299" fill="none"` — renders 98 × 24, `fill="currentColor"`:

```
M0 18.4226C280.577 18.4226 -6.26934 18.4226 274.308 18.4226V161.846C274.308 237.464 212.772 299 137.154 299C61.5361 299 0 237.464 0 161.846V18.4226Z
M831.508 293.888H694.354V153.551H637.544V19.1938H884.846V153.551H831.508V293.888Z
M1045.82 0L1219.05 293.502H872.597L1045.82 0Z
M559.226 165.125H324.849V293.984H529.036C602.629 293.984 620.28 193.578 559.226 165.125Z
M376.257 153.551H591.73V19.1938H385.999C348.383 19.1938 317.808 52.0838 317.808 87.3851C317.808 122.686 340.184 145.256 376.257 153.551Z
```

### `MenuIcon` — hamburger inside `.has-dropdown button`
Renders 20 × 16.47, three horizontal bars, `currentColor`. Re-extract the exact path in Phase 2 or
substitute an equivalent 3-bar glyph at 20×16.

### `LinkedInIcon`
Currently an `<img src="/linkedin-in.svg">` at `width=24 height=20`, `class="block w-5 lg:w-7"`
(20px → 28px rendered). Either download the file or inline it as a component.

## Favicon / SEO

| URL | rel | Notes |
|---|---|---|
| `/favicon.svg` | `icon`, `image/svg+xml` | only icon declared — no apple-touch-icon, no webmanifest. Kept: `assets/img/favicon.svg` (621 b) |
| `/cover.png` | `og:image` (`image/png`) | ✅ **exists** — verified, 863,910 b. Declared in meta but never requested by the page. Not retained. |
| `/sitemap-index.xml` | `sitemap` | not needed for the clone |

## Meta to port into `layout.tsx`

```
title        Usta Agency - BOOST YOUR BRAND
description  We create digital experience at the intersection between design andtechnology,
             helping our clients toimagine the future, today.
             ↑ note the two missing spaces — the site's own bug, from stripping <strong> tags
og:title        Usta Agency - BOOST YOUR BRAND
og:description  (same as description)
og:locale       en_GB          og:locale:alternate  en_GB
og:site_name    USTA AGENCY
og:url          /              og:image             /cover.png   og:image:type  image/png
viewport        width=device-width, initial-scale=1.0
lang            en
```

There is an `/it` locale route linked from the header ("It") — out of scope for this clone unless
requested.

## Not to download

`googletagmanager.com/gtm.js`, `cdn.cookie-script.com/s/*.js`, `form.jotform.com/static/feedback2.js`
— third-party, out of scope.
