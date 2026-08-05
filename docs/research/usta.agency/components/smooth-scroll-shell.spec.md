# Mechanic Spec — Smooth-Scroll Shell

- **Interaction model:** scroll-driven (library-managed)
- **Library:** GSAP ScrollSmoother 3.12.2 (registered alongside ScrollTrigger, SplitText, ScrollToPlugin)
- **Evidence:** `source/app.main.js`, `source/app.shaders.js` tail, `source/page.html`
- **Screenshots:** all — this shell is present in every capture

## Configuration (verbatim)

```js
gsap.registerPlugin(ScrollTrigger, SplitText, ScrollToPlugin, ScrollSmoother)
const smoother = ScrollSmoother.create({
  smooth: 1.5,        // seconds of catch-up lag
  speed: 1,
  smoothTouch: 0.2,   // much shorter on touch
  effects: true       // enables [data-speed] / [data-lag] parallax attributes
})
smoother.scrollTo(0, false)   // hard-reset to top on load, no animation
```

`effects: true` is enabled but **no element on this route carries `data-speed` or `data-lag`** —
so it costs a ScrollTrigger scan and buys nothing here. Do not cargo-cult it.

## DOM contract (non-negotiable)

```html
<header id="main-header">      <!-- fixed, z-40   — SIBLING of wrapper -->
<div id="smooth-wrapper">      <!-- fixed; inset:0; overflow:hidden; height:100%; width:100% -->
  <div id="smooth-content">    <!-- overflow:visible; width:100%; transform:translateY(-scroll) -->
    <main id="content"> …sections 1–7… </main>
    <section id="contacts">…</section>
    <footer>…</footer>
  </div>
</div>
<div id="cursor">              <!-- fixed, z-999999 — SIBLING -->
<div id="loader">              <!-- fixed, z-30     — SIBLING -->
<canvas>                       <!-- fixed, z--1     — SIBLING, appended to body by Three.js -->
```

ScrollSmoother sets the wrapper styles itself at runtime (`overflow:hidden; position:fixed;
height:100%; width:100%; top/left/right/bottom:0`) and gives `#smooth-content`
`overflow:visible; width:100%; box-sizing:border-box`. It then fakes document height by writing
`document.body.style.height` and translating the content.

**Anything that must stay put on screen has to be a sibling of `#smooth-wrapper`,
never a descendant** — a descendant rides the transform and `position:fixed` inside a
transformed ancestor is relative to that ancestor, not the viewport. This is why the header,
cursor, loader and canvas all sit outside.

## Measured consequences

| Viewport | `#smooth-content` height (= virtual doc height) |
|---|---|
| 1440 × 900 | 9883 px |
| 768 × 1024 | 7586 px |
| 390 × 844  | 7112 px |

## Anchor interception

```js
document.querySelectorAll('a[href^="#"]:not(.has-dropdown a)')
  .forEach(a => a.addEventListener('click', e => {
     e.preventDefault()
     smoother.scrollTo(a.hash, true)   // true = animate, uses the smoother's own ease
  }))
```

The `:not(.has-dropdown a)` exclusion matters — dropdown items are handled separately so the
menu can close *before* scrolling (see `nav-dropdown.spec.md`).

## Scroll position never changes the header

Diffed `getComputedStyle(#main-header)` at scrollY 0 and at 9883: **zero properties change.**
It is 52px tall, `bg-black` + `backdrop-filter: blur(20px)` +
`linear-gradient(360deg, rgba(0,0,0,.5), rgba(0,0,0,.1))` at both. There is no
shrink-on-scroll, no shadow-on-scroll, no background swap. Do not build one.

## Porting notes (Trivoxa)

Per `EXTRACTION_BRIEF.md` this project stays on **Lenis** — already wired with a single rAF and
`lagSmoothing(0)`. The transferable parts are not the library but:

1. The **sibling rule** for fixed overlays. Lenis (which transforms a wrapper in the same way when
   used in wrapper mode) has the identical constraint.
2. `smooth: 1.5 s` is a genuinely long catch-up — noticeably heavier than a typical 1.0. That
   weight is a large part of the site's "buttery" read.
3. Touch gets **~7× less** smoothing (`0.2` vs `1.5`). Matching desktop smoothing on touch is what
   makes smooth-scroll sites feel broken on phones.
