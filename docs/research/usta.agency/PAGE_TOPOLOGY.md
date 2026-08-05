# Page Topology — usta.agency (home, `/`)

Assembly blueprint. Offsets are desktop @1440×900 unless noted.
Interaction models come from `BEHAVIORS.md`; every section here is **scroll-driven or static** —
none are click-driven.

## Layer stack (z-order, bottom → top)

| z | Element | Position | Notes |
|---|---|---|---|
| `-1` | `<canvas>` | `fixed` inset-0 | Three.js — 700-point field + morphing GLTF cloud + dot-grid post-fx |
| auto | `#smooth-wrapper` > `#smooth-content` | wrapper `fixed`, overflow hidden | all page content; GSAP ScrollSmoother translates the inner div |
| `30` | `#loader` | `fixed` inset-0 | `USTA nn%` — fades out once assets hit 100% |
| `40` | `#main-header` | `fixed` top-0 | 52px, `bg-black`; **never changes on scroll** |
| `999999` | `#cursor` | `fixed` | 16px white disc, `mix-blend-difference`, `lg:` only |

`<canvas>`, `#loader`, `#main-header` and `#cursor` are all **siblings of** `#smooth-wrapper`,
never children — anything inside the wrapper gets dragged by the smooth transform.

## Flow order

| # | Working name | Selector | Top | Height | Interaction model |
|---|---|---|---|---|---|
| — | Preloader | `#loader` | fixed | 100vh | time-driven (load progress) |
| — | Header | `#main-header` | fixed | 52px | hover (dropdown) |
| 1 | Hero | `section#home` | 0 | 1071 | intro timeline, then static |
| 2 | Statement | `#content section:nth-of-type(2)` | 1521 | 900 | scroll-driven char reveal |
| 3 | Agency | `section#agency` | 2871 | 900 | scroll-driven char reveal |
| 4 | Solutions | `section#solution` | 4221 | 900 | scroll-driven char reveal |
| 5 | Expertise | `section#expertise` | 5571 | 1013 | marquee (time) + reveal + hover |
| 6 | Team intro | `section#team` | 7034 | 1012 | scroll-driven char reveal |
| 7 | Team marquees | `#content > div.overflow-hidden` | 8045 | 758 | 3 marquees (time) + hover |
| 8 | Contacts | `section#contacts` | 8983 | 900 | scroll-driven char reveal |
| 9 | Footer | `footer` | 9733 | 151 | scroll-driven char reveal |

Total document height **9883px**. Sections 2–6 each get `min-h-screen py-40 lg:mb-[50vh]`
(160px vertical padding + a 450px gap that collapses to 0 below 1024px).

Note sections 7 and 8/9 sit **outside** `<main id="content">`: `#content` ends at 8803px and
`#contacts` + `<footer>` are direct children of `#smooth-content`. That matters because
`#content` is the ScrollTrigger trigger for the particle morph and camera timelines.

---

## 1. Hero — `section#home`

`text-white min-h-screen flex items-end py-20 lg:py-60 mb-0 lg:mb-[50vh]`
Content bottom-aligned inside a `.container`.

```
h1#main-title.title.xl:text-[130px]      Oswald 600 / 130px / lh 1em / mb-16px, w=1248 x=96
   line 1  <span class="text-outline">BOOST</span>   transparent + 2px white stroke
   line 2  YOUR                                       solid white
   line 3  BRAND                                      solid white
p#main-description.subtitle.leading-[1.2].max-w-[700px]
   Montserrat 100 / 32px / lh 38.4px / color #D1D5DB / max-width 700px
   <strong> spans render at font-weight bolder (700)
```

Copy (verbatim):
> BOOST / YOUR / BRAND
> We create **digital experience** at the intersection between **design** and **technology**, helping our clients to **imagine the future**, today.

Both elements ship with inline `opacity: 0`; the intro timeline sets them visible on tween start.

## 2. Statement — `#content section:nth-of-type(2)`

`min-h-screen mb-0 lg:mb-[50vh] py-40 flex items-center` — no id.
Inner: `div.grid.gap-20.text-3xl.lg:text-[50px].leading-[1.2].md:text-center.words-splitted.font-oswald.md:uppercase[data-amount="3"]`
→ Oswald 400 / 50px / lh 60px / `text-transform: uppercase` ≥768 / centered ≥768 / w=1248.

> Applying a cross-disciplinary expertise in crafting and executing tech-based solutions to optimize industrial operations.

## 3. Agency — `section#agency`  ·  4. Solutions — `section#solution`

Identical shells, mirrored columns:

```
section.min-h-screen.mb-0.lg:mb-[50vh].py-40.flex.items-center
  div.container
    div.col-span-1[.lg:col-start-2].words-splitted.leading-[1.2]
      h2.title      Oswald 600 / 120px / lh 1em / #fff / mb-16
      p.subtitle    Montserrat 100 / 32px / lh 36px / #D1D5DB
```

| | Agency | Solutions |
|---|---|---|
| column | **right** — `lg:col-start-2`, w=584, x=760 | **left** — w=584, x=96 |
| `data-amount` | `2.5` | `3` |
| title | `AGENCY` | `SOLUTIONS` |

> **Agency** — We believe that the **power of creativity, design and emotion** is the Key to aligning businesses with their consumer's unique profiles.
>
> **Solutions** — We empower brands with **innovative digital solutions**, crafting **user-centric experiences** that enhance **brand presence** and drive **business growth.**

**Resolved — there is a real grid, one level down.** An earlier draft of this file noted that
`.container` computes to `display: block` and inferred that `lg:col-start-2` therefore did nothing.
That missed the intermediate wrapper. The actual nesting is:

```html
<div class="container">                     <!-- display:block, max-width 1280 -->
  <div class="grid lg:grid-cols-2 gap-20">  <!-- ← display:grid, THIS is the grid -->
    <div class="col-span-1 lg:col-start-2 words-splitted">…</div>
  </div>
</div>
```

Measured on `#agency .grid` at 1440: `display: grid`, `grid-template-columns: 584px 584px`,
`gap: 80px`, width 1248. So `lg:col-start-2` works exactly as written — Agency and Team occupy
column 2, Solutions column 1. Confirmed by box positions: Agency `x=760, w=584`, Solutions
`x=96, w=584`. Build it as a plain 2-column grid at `lg`, 1 column below.

## 5. Expertise — `section#expertise`

`min-h-screen mb-0 lg:mb-[50vh] py-40 flex flex-col justify-center items-center leading-[1.2]`

**5a — banner marquee** (`div.overflow-hidden` > `h3.strip`)
`font-oswald font-semibold text-[60px] md:title text-white xl:text-[150px] mb-10 md:mb-20 lg:mb-40
 no-words-splitted whitespace-nowrap flex strip`
Oswald 600 / 150px / letter-spacing 2px / mb 160px. **2 spans in markup, quadrupled to 8 by JS.**
Each span: `<span class="mr-8 md:mr-10 lg:mr-20">Area of <span class="text-outline">expertise</span></span>`
→ "Area of" solid, "expertise" outlined, followed by an 8px white dot from `::after`.

**5b — four columns** (`div.grid.md:grid-cols-2.lg:grid-cols-4.gap-10.md:gap-20`)
Grid `252px × 4`, gap 80px, w=1248.
Each column is `div.col-span-1.words-splitted[data-amount="1"]`:
- `h3.text-3xl.font-medium.border-b.border-white/20.mb-4.pb-4` — Montserrat 500 / 30px / lh 36px /
  tracking 2px / `#D1D5DB` / 1px bottom rule `rgba(255,255,255,.2)` / pb 16 / mb 16
- `li.py-2.text-xl.font-medium.bg-animate.hover:before:top-0` — Montserrat 500 / 20px / lh 28px /
  py 8 / `position:relative; z-index:10; mix-blend-mode:difference` + wipe-up `::before`

| Strategy | Creative | Tech | Production |
|---|---|---|---|
| Creative Direction | Art Direction | WebGL Development | 3D Modelling |
| Tecnology Strategy | UX/UI Design | Web Development | 3D Animation |
| Research & Development | Motion Design | Unity/Unreal | Video Production |
| | Illustration | VR/AR | Photo Production |
| | Graphics | AI | Stylist |
| | | Blockchain | |

("Tecnology" is misspelled on the live site — keep it, this is a clone.)

## 6. Team intro — `section#team`

`min-h-screen py-20 lg:py-40 flex flex-col justify-center` (no `mb-[50vh]`).
Inner `div.col-span-1.lg:col-start-2.leading-[1.2].words-splitted[data-amount="3"]`, right column
(w=584, x=760):

```
h2.title    OUR / SMART / TEAM  — 3 lines, 120px, h=378
            "SMART" is .text-outline (stroked), OUR and TEAM solid
p.subtitle  Montserrat 100 / 32px / lh 36px / #D1D5DB
```

> **Living well to work better.** Committed to solid and ethical collaborations in a **remote working** environment, we ensure our structure is **dynamically scalable**, tailored to each project's unique requirements.

## 7. Team marquees — `#content > div.overflow-hidden`

Three `h3.strip-title …flex strip slower` rows, each in its own `div.overflow-hidden`.
Oswald 600 / 110px (`lg`) / 130px (`2xl`). Row 1 `mt-20 lg:mt-40`, rows 2 & 3 `mt-12`.

Per member: `<span class="mr-8 md:mr-10 lg:mr-20">` containing
- name in `.text-filled` **or** `.text-outline` (alternating down the row)
- `<div class="text-lg md:text-xl lg:text-3xl font-light mt-3 md:mt-4 flex items-end">` with the
  role, then `<a class="mx-4 inline-block" target="_blank" data-cursor="60">` wrapping
  `<img src="/linkedin-in.svg" width="24" height="20" class="block w-5 lg:w-7">`.
  `.strip-title a::before { content: "-" }` renders the dash before the icon.

| Row | duration | direction | members |
|---|---|---|---|
| 1 | 32 | forward | **Adriano** CEO and Innovation Manager · **Francesco** Creative and Operation Manager · **Kamelija** Graphic Designer · **Pasquale** Full Stack Developer |
| 2 | 35 | **reverse** | **Mehdi** IT Expert and Full Stack Developer · **Sofia** Photographer · **Alex** 3D Artist · **Gianluca** Creative Developer |
| 3 | 30 | forward | **Riccardo** Web Developer · **Elisabetta** Graphic Designer · **Fulvio** Unity Developer · **Greta** Digital Fashion Designer & 3d Artist · **Andrea** Video production |

Each member links to a personal LinkedIn profile (`target="_blank"`, `data-cursor="60"`). Those
URLs are deliberately **not** transcribed into this repo — they are third-party personal data with
no bearing on the mechanics this extraction exists to capture. They are in
`source/page.html` if ever needed. (An earlier draft pointed at a `CONTENT.json` that was never
written; this replaces that reference.)

## 8. Contacts — `section#contacts`

`min-h-[50vh] lg:min-h-screen lg:mt-[20vh] lg:pb-40 lg:pt-0 flex items-center`
(computed margin-top 180px, padding-bottom 160px).
Inner `div.container.flex.justify-center.words-splitted[data-amount="2"]` → a centred block:

```
p.ml-1.lg:ml-2.lg:text-lg           "work with us:"  — Montserrat 400 / 18px / #D1D5DB
h2 > a[href="mailto:hello@usta.agency"][data-cursor="200"].leading-tight
                                     "hello@usta.agency" — Montserrat 200 / 100px / lh 125px / #D1D5DB
```

## 9. Footer — `footer`

`text-white pb-20 lg:absolute bottom-0 left-0 right-0 words-splitted[data-amount="3"]`
→ `section > div.container.text-white/70.mt-10.text-base`
Montserrat 400 / 16px / `rgba(255,255,255,.7)` / mt 40 / pb 80.

> ©Copyright 2025 Usta - Modena

Absolutely positioned inside `#smooth-content` at `top: 9732.69px` at `lg`; static in flow below.

## Build-order dependencies

1. **Foundation first** — Oswald + Montserrat variable fonts, the black/white/gray-300 token set,
   `cursor:none`, hidden scrollbar, selection colours, and the `.title / .subtitle / .strip-title /
   .text-outline / .bg-animate` component classes. Nothing renders correctly without these.
2. **Shell** — `#smooth-wrapper` / `#smooth-content` + ScrollSmoother, header, cursor, loader,
   canvas mount. Every section depends on the smooth-scroll DOM contract.
3. **Sections 1–9** are independent of each other and can be built in parallel.
4. **WebGL layer** is independent of all DOM sections but needs the 4 GLTF assets and its two
   ScrollTriggers (`#content` as trigger) wired at page level.
