# Tech Stack Analysis — usta.agency

## What the target uses

| Concern | Target | Evidence |
|---|---|---|
| Framework | **Astro** (static output) | `/_astro/*` hashed bundles, `hoisted.*.js` naming, no `__NEXT_DATA__` / `__NUXT__` / hydration markers |
| CSS | **Tailwind CSS v3** (JIT, stock config) | full v3 preflight in both stylesheets, `--tw-*` custom-property scaffold, default 640/768/1024/1280/1536 screens, `.container` with per-breakpoint max-widths |
| Component CSS | Tailwind `@layer components` | `.title`, `.subtitle`, `.strip-title`, `.text-outline`, `.bg-animate` compiled with `@apply`-style output |
| Animation | **GSAP 3** + `ScrollTrigger` + `ScrollSmoother` + `SplitText`/SplitType | `gsapVersions` global; `ScrollSmoother.create({smooth:1.5,…})`; `#smooth-wrapper`/`#smooth-content` |
| Smooth scroll | **GSAP ScrollSmoother** — *not* Lenis, not Locomotive | no `.lenis` / `[data-scroll-container]` class anywhere; wrapper is `position:fixed` with a transformed inner div |
| 3D | **Three.js** + `EffectComposer` / `RenderPass` / custom `ShaderPass`, `GLTFLoader`, `MeshSurfaceSampler`, `OrbitControls` | `WebGLRenderer`, `PerspectiveCamera`, `BufferGeometry`, `ShaderMaterial`, `Points` in bundle |
| Fonts | self-hosted variable woff2 via **Fontsource** | `@font-face` blocks name `montserrat-*-wght-normal.*.woff2`, `oswald-*-wght-normal.*.woff2` under `/_astro/` |
| Icons | 2 inline SVGs + 1 external SVG | logo (5 paths, `viewBox="0 0 1220 299"`), hamburger, `/linkedin-in.svg` |
| Images | **none** except the LinkedIn glyph | 51 `<img>` on the page, all the same `/linkedin-in.svg` (marquee duplication) |
| Video | none | zero `<video>` elements |
| State mgmt | none | static page, no store |
| API | none | no XHR/fetch beyond assets |
| Analytics | Google Tag Manager `GTM-NB3TPR38` | inline GTM snippet |
| Consent | CookieScript (`cdn.cookie-script.com`) | injected banner + badge |
| Forms | JotForm lightbox `240245761444353` | `form.jotform.com/static/feedback2.js`, `openOnLoad:false` |

## Our equivalents

| Concern | Their choice | Ours |
|---|---|---|
| Framework | Astro static | **Next.js 16 App Router** — this route has no interactivity that needs a server; a single client component tree is enough |
| CSS | Tailwind v3 | **Tailwind v4** — the utilities used (`container`, `min-h-screen`, `grid-cols-*`, `text-[130px]`, `bg-black/90`, `border-white/20`, `mix-blend-difference`) all exist in v4. **Watch out:** v4 drops the v3 `container` plugin behaviour (per-breakpoint max-widths) — that must be re-created explicitly or the 1280px content column at 1440 will be wrong |
| Fonts | Fontsource woff2 | `next/font/google` for **Oswald** (200–700) and **Montserrat** (100–900), both variable |
| Smooth scroll | GSAP ScrollSmoother | **GSAP ScrollSmoother** — it is a Club GSAP plugin; if unavailable, Lenis + a manual translate wrapper is the fallback, but the feel will differ. Flag this before building |
| Text splitting | SplitType / SplitText | **SplitType** (MIT) — the bundle's API matches it exactly (`new SplitType(el,{type:"chars,words",wordsClass,charsClass,linesClass})` exposing `.chars` / `.words`) |
| 3D | Three.js raw | **Three.js raw** (not R3F) — the code is imperative, uses a custom composer pass and surface samplers; wrapping it in R3F adds work without benefit |
| Icons | inline SVG | `src/components/icons.tsx` — `UstaLogoIcon`, `MenuIcon`, `LinkedInIcon` |
| Analytics / consent / JotForm | GTM, CookieScript, JotForm | **out of scope** — do not port |

## Dependencies to install

```
gsap                      # + ScrollTrigger, ScrollSmoother (Club GSAP), SplitText
split-type                # if not using Club GSAP SplitText
three                     # GLTFLoader, MeshSurfaceSampler, EffectComposer from three/examples
```

`@types/three` if TS strict complains about the examples imports.

## Risks / gotchas for the build phase

1. **ScrollSmoother is a paid GSAP plugin.** Confirm availability before Phase 2 — the entire
   layout contract (`#smooth-wrapper` fixed + transformed `#smooth-content`, fixed siblings for
   header/canvas/cursor) is built around it, and swapping to Lenis changes that DOM shape.
2. **Tailwind v4 has no `container` plugin.** The 1280px max-width + 16px padding must be authored
   by hand, or every section's horizontal rhythm drifts.
3. **`-webkit-text-stroke` is the only way to get the outlined type.** No `text-shadow` fallback
   matches it. Fine in all modern browsers; will look solid-white if it ever fails.
4. **The dotted background is a WebGL post-process pass, not CSS.** Building it as a CSS
   `background-image` will look close at one viewport and wrong at every other — its grid density is
   a function of viewport width (40 → 300).
5. **4 GLTF models must be downloaded** (see `ASSETS.md`) — without them the hero is an empty black
   screen. They are the entire visual centrepiece.
6. **`cursor: none` globally** means the clone is unusable if the custom cursor fails to mount.
   Gate it behind a mounted check and keep `cursor:auto` below 1024px (the site does this already).
7. **No `@keyframes` exist.** Resist re-implementing the reveals in CSS — the stagger values
   (`data-amount / 2`) and trigger offsets (`top 90%` / `top 60%`) are what make it feel right.
