# Behaviour Bible — usta.agency

Findings from the mandatory interaction sweep (scroll / click / hover / responsive), 2026-08-04.
Where the mechanism was ambiguous from the DOM alone, the numbers below come from reading the
site's own bundle (`_astro/hoisted.4c39c7ce.js`, 752 KB) — so these are the *actual* durations,
eases and thresholds, not observations of them.

> **Headless caveat.** Playwright's renderer runs the rAF loop far below 60 fps, so every
> GSAP tween in the captured screenshots plays in slow motion and the cursor-width lerp
> (`lerp(current, target, delta*10)`) overshoots wildly — it measured 473px where the real value is
> 100px. Timings below are read from source, not timed in the browser. Screenshots labelled
> "settled" were taken after waiting the animation out.

## 0. The single most important thing

**Nothing on this page is click-driven except the nav.** There are no tabs, no accordions, no
carousels, no state switching. The interaction model is:

- **Scroll** drives everything visual (text reveals, camera, particle morph, marquee is time-driven).
- **Hover** drives the cursor size, the marquee slow-down, and the expertise-item wipe.
- **Click** exists only on nav links (smooth-scroll-to-anchor) and the mobile menu toggle.

Do not build tab machinery for any section.

## 1. Smooth scroll — GSAP ScrollSmoother (not Lenis)

```js
ScrollSmoother.create({ smooth: 1.5, speed: 1, smoothTouch: 0.2, effects: true })
smoother.scrollTo(0, false)   // forces top on load
```

DOM contract this requires:
```html
<div id="smooth-wrapper">      <!-- position:fixed; overflow:hidden; inset:0 -->
  <div id="smooth-content">    <!-- transform:translateY(-scroll); height 9883px @1440 -->
    <main id="content"> …sections… </main>
    <section id="contacts">…</section>
    <footer>…</footer>
  </div>
</div>
<canvas>                        <!-- position:fixed; z-index:-1 — OUTSIDE the wrapper -->
<header id="main-header">       <!-- position:fixed; z-40 — OUTSIDE the wrapper -->
<div id="cursor">               <!-- position:fixed; z-index:999999 -->
<div id="loader">               <!-- position:fixed; z-30 -->
```

The header, canvas, cursor and loader are all siblings of `#smooth-wrapper`, never inside it —
otherwise they would be dragged by the smooth transform.

Anchor links are intercepted:
```js
document.querySelectorAll('a[href^="#"]:not(.has-dropdown a)')
  .forEach(a => a.addEventListener('click', e => { e.preventDefault(); smoother.scrollTo(a.hash, true) }))
```

**Note:** the header itself never changes on scroll. It is `bg-black` and 52px tall at scroll 0 and
at scroll 9883. Verified by diffing computed styles at both positions — no property changes.
Do not build a shrink-on-scroll header.

## 2. Page load — the preloader

Model + texture loading drives a `THREE.LoadingManager.onProgress`:

```js
manager.onProgress = (url, loaded, total) => {
  const pct = 100 * loaded / total
  gsap.to("#counter", { duration: 1, innerText: pct.toFixed(0), snap: "innerText",
                        onComplete: pct >= 100 ? startIntro : ()=>{} })
}
```

Markup: `#loader` is a fixed full-screen flex-centre box, `text-xl font-extralight`,
`letter-spacing: 4px`, containing `<h3 class="mr-2">USTA</h3><span id="counter">0</span><span>%</span>`.

`startIntro()` timeline (`gsap.timeline()` — plays once, in this order):

| t (s) | target | from → to | duration | ease |
|---|---|---|---|---|
| 0 | `#loader` chars (SplitType `chars`) | `autoAlpha 1, y 0` → `autoAlpha 0, y 200` | 0.8 | `back.in`, `stagger:{amount:.5}`; `onComplete` sets `#loader{autoAlpha:0}` |
| 0 | `uIntro` uniform (particles + post-fx) | `0 → 1` | 3 | `Power4.easeOut` |
| 0.5 | camera position | → `z: 12` | 3 | `Power4.easeOut` |
| 0.5 | `#content` | `autoAlpha → 1` | 0.5 | default |
| 0.5 (`"<"`) | `#main-header` | `opacity 0, y -50` → `opacity 1, y 0` | 1 | `Power4.easeOut` |
| 1.75 | `#main-title` **words** (SplitType `words,lines`) | `y 200, rotate 15` → `y 0, rotate 0` | 1 | `Power4.easeOut`, `stagger: .1`; `onStart` sets `#main-title{opacity:1}` |
| 2.0 | `#main-description` **chars** (SplitType `chars,words`) | `y 50, rotate 15, opacity 0` → `y 0, rotate 0, opacity 1` | 0.5 | `Power4.easeOut`, `stagger:{amount:.5}`; `onStart` sets `#main-description{opacity:1}` |

`#main-title` splits with `linesClass:"overflow-hidden"` and `wordsClass:"inline-block"` — the
overflow-hidden line box is what makes words appear to rise out of a mask.
`#main-description` splits with `wordsClass:"overflow-hidden"`, `charsClass:"inline-block"`.

Both elements start at `opacity: 0` in the markup so nothing flashes pre-split.

## 3. Scroll-triggered text reveals — `.words-splitted`

Every block of copy below the hero carries `.words-splitted` and a `data-amount`:

```js
[...document.querySelectorAll(".words-splitted")].forEach(el => {
  const amount = el.dataset.amount || .5
  const split = new SplitType(el, { type: "chars,words", wordsClass: "overflow-hidden" })
  gsap.set(split.chars, { autoAlpha: 0, y: 100 })
  gsap.to(split.chars, {
    y: 0, rotate: 0, autoAlpha: 1,
    stagger: { amount: amount / 2 },
    ease: "power3.out",
    scrollTrigger: {
      trigger: el,
      start: `top ${isMobile ? "60%" : "90%"}`,
      end: () => `+=${window.innerHeight * (isMobile ? 1 : 1.5) / 2}px`
    }
  })
})
```

No `scrub` — it plays once on enter and does not reverse. `data-amount` per block:

| Block | `data-amount` | effective total stagger |
|---|---|---|
| Statement (section 2) | `3` | 1.5 s |
| Agency copy block | `2.5` | 1.25 s |
| Solutions copy block | `3` | 1.5 s |
| Each expertise column (×4) | `1` | 0.5 s |
| Team copy block | `3` | 1.5 s |
| Contacts block | `2` | 1.0 s |
| Footer | `3` | 1.5 s |

Elements marked `.no-words-splitted` (the four marquees) are deliberately excluded.

## 4. Marquees — `.strip` (time-driven, hover-reactive)

```js
document.querySelectorAll(".strip").forEach(strip => {
  const { duration = 30, direction } = strip.dataset
  const keys = [0, -25]; if (direction) keys.reverse()
  strip.innerHTML += strip.innerHTML + strip.innerHTML + strip.innerHTML   // 4× content
  const loop = gsap.to(strip, { keyframes: { xPercent: keys, ease:"none", easeEach:"none" },
                                duration, repeat: -1, ease: "none" })
  const slow = gsap.to({value:1}, { value: .15, paused: true, duration: .5, ease: "power3.out",
                                    onUpdate() { loop.timeScale(this.targets()[0].value) } })
  strip.addEventListener("mouseenter", () => slow.play())
  strip.addEventListener("mouseleave", () => slow.reverse())
})
```

Content is duplicated to **4×** and translated `0 → -25%`, which is what makes the loop seamless.
Hover eases `timeScale` to **0.15** over 0.5 s and restores it on leave.

> The duplication line reads `strip.innerHTML += strip.innerHTML + strip.innerHTML + strip.innerHTML`.
> The right-hand side evaluates before assignment, so all three reads return the *original* content
> → exactly **4 copies**. See `components/marquee-strip.spec.md` for why an iterative `+=` loop
> would give 8 and break the `-25%` seam.
>
> The `.strip` CSS also declares `animation: run 20s linear infinite` — but **no `@keyframes run`
> exists in either stylesheet**. It is a dangling reference and does nothing; the marquee is
> entirely GSAP. Only `width: max-content` in that rule matters.

| Strip | `data-duration` | `data-direction` | Content |
|---|---|---|---|
| Expertise banner | *(absent → 30)* | forward | `Area of expertise` **×2 in markup** → ×8 after JS |
| Team row 1 | `32` | forward | Adriano · Francesco · Kamelija · Pasquale |
| Team row 2 | `35` | **reverse** | Mehdi · Sofia · Alex · Gianluca |
| Team row 3 | `30` | forward | Riccardo · Elisabetta · Fulvio · Greta · Andrea |

Alternating fill: inside each `<span class="mr-8 md:mr-10 lg:mr-20">` the word is wrapped in
`.text-filled` (solid white) or `.text-outline` (transparent + 2px white stroke). The expertise
banner reads `Area of <span class="text-outline">expertise</span>`; team rows alternate whole names.
Each wrapped word emits a **8px white dot** via `::after` with a 80px left margin at `lg`.

## 5. Custom cursor

```html
<div id="cursor" class="hidden lg:block aspect-square w-4 z-[100] fixed pointer-events-none
                        -translate-x-1/2 -translate-y-1/2 rounded-full bg-white"></div>
```
Computed: `width/height 16px`, `border-radius 9999px`, `background #fff`,
`mix-blend-mode: difference`, `z-index: 999999`, `display:none` below 1024px.

- **Position:** set directly on `mousemove` — `gsap.set(cursor, { top: e.clientY, left: e.clientX })`
  (desktop only). Centering is CSS (`-translate-x-1/2 -translate-y-1/2`), so it never lags.
- **Size:** lerped every frame toward a target — `width = lerp(currentWidth, target, delta * 10)`.
  Default target **16**.
- **Hover targets** (`[data-cursor]`) set the target on `mouseenter` and reset to 16 on `mouseleave`.
  They also set `Nh = 0`, which shrinks the 3D glow sprite that normally follows the pointer:

| Element | `data-cursor` |
|---|---|
| Logo link | **400** |
| `Let's talk` | **100** |
| `It` (locale) | **100** |
| Menu trigger `<span>` | **100** |
| Each team LinkedIn `<a>` | **60** |
| `hello@usta.agency` | **200** |

Because of `mix-blend-mode: difference`, the expanded white disc inverts everything under it —
white nav text reads black inside the circle. Captured in
`docs/design-references/usta.agency/desktop-09-nav-dropdown-open.png`.

## 6. Navigation dropdown

```js
document.querySelectorAll(".has-dropdown").forEach(li => {
  const ul = li.querySelector("ul"), items = li.querySelectorAll("li")
  const tl = gsap.timeline({ paused:true,
    onStart: () => gsap.set(ul, { autoAlpha: 1 }),
    onReverseComplete: () => gsap.set(ul, { autoAlpha: 0 }) })
  tl.add(gsap.from(items, { duration:.5, ease:"back", autoAlpha:0, y:-50, stagger:{amount:.2} }))
  if (isMobile) tl.fromTo(ul, { backgroundColor:"rgba(0,0,0,0)" },
                              { backgroundColor:"rgba(0,0,0,0.9)", duration:.5 }, 0)

  isMobile
    ? li.addEventListener("click", () => tl.reversed() || tl.paused() ? tl.play() : tl.reverse())
    : (li.addEventListener("mouseenter", () => tl.play()),
       li.addEventListener("mouseleave", () => tl.reverse()))
})
```

**Trigger differs by width — hover ≥769px, click ≤768px.**

Items: `Home` → `#home`, `Agency` → `#agency`, `Solution` → `#solution`, `Team` → `#team`,
plus a `close` item that is `lg:hidden` (`mt-10`, `underline`). Clicking an item with a hash
smooth-scrolls and reverses the timeline; clicking one without a hash reverses first, *then*
navigates (`tl.reverse().then(() => location.href = a.href)`).

Desktop panel: `position:absolute; top:28px (top-full); right:0; width:max-content (75px);
padding-top:24px; text-align:right; background:transparent`. Items are `block py-4` (60px tall)
with `transition-[padding-right]` and `lg:hover:pr-4` — **hovered item slides 16px left** over
150 ms `cubic-bezier(.4,0,.2,1)`.

Mobile panel: `position:fixed; top:52px; right:0; left:0; height:100vh; background:rgba(0,0,0,.9);
padding-right:16px; text-align:right`. See `mobile-390-02-menu-open.png`.

## 7. Expertise list hover — `.bg-animate`

Pure CSS, no JS. Each `<li class="py-2 text-xl font-medium bg-animate hover:before:top-0">` is
`position:relative; z-index:10; mix-blend-mode:difference` with a pseudo-element:

| | rest | hover |
|---|---|---|
| `::before top` | `100%` | `0` |
| `::before left/right` | `-8px` / `-8px` | unchanged |
| `::before bottom` | `8px` | unchanged |
| `::before background` | `#fff` | unchanged |
| transition | `all .7s cubic-bezier(0,0,.2,1)` | |

A white bar wipes upward from below the item; `difference` blending flips the gray-300 text to
near-black. Verified — see `desktop-10-expertise-item-hover.png`.

## 8. The WebGL layer

`<canvas>` — `position:fixed; inset:0; z-index:-1`, appended to `<body>` by
`document.body.appendChild(renderer.domElement)`. `antialias: devicePixelRatio < 2`.

**Two point systems:**

1. **Ambient field** — `createParticles(700)`: 700 points randomly placed in a 20³ cube, each with
   a random direction normal, `opacity 1`, `scale = random()*2`, colour cycled from the 6-colour
   palette. Additive blending, `depthWrite:false`, custom vertex+fragment shaders.
   Rotates on scroll: `gsap.to(points.rotation, { y: 2π, x: 2π, scrollTrigger:{ trigger: document.body,
   scrub: 1, start:"top top", end:"bottom bottom" } })` — one full rotation over the whole page.

2. **Morphing hero shape** — **30,000 points** desktop / **15,000** ≤768px, from four GLTF meshes
   surface-sampled (`MeshSurfaceSampler`) into
   `position`, `position2`, `position3`, `position4` buffer attributes on one geometry.

   **Morph order is rocket → satellite → terra → astronaut** — *not* the order the config array
   declares. `position=v0[0]`, `position2=v0[3]`, `position3=v0[2]`, `position4=v0[1]`.
   Each leg is eased by `smoothstep(0.01,0.99,fract)` and peaks in a radial **burst** (up to 6×
   scale) at its midpoint. Full shader analysis, cursor-repulsion radius and camera waypoints:
   `components/webgl-particle-field.spec.md`.
   The shader blends between them with the `uProgress` uniform:
   ```js
   gsap.to(uniforms.uProgress, { value: 1, ease: "linear",
     scrollTrigger: { trigger:"#content", scrub:1, start:"top top",
                      end: () => `+=${innerHeight * (isMobile?1.3:1.5) * 6}px` } })
   ```
   So the morph completes over **6 viewport heights** of scroll (7.8 on mobile). Idle wobble:
   `rotation.y = sin(t*.5)*.15`, `rotation.z = sin(-t*.5)*.15`.

   Models and their placement:

   | GLTF | mainSamplerIndex | rotation (×π) | translate | scale |
   |---|---|---|---|---|
   | `rocket_v2.gltf` | 0 | `(.5, .85, -.75)` | `(4, 0, 0)` | 1.1 |
   | `astronauta_v5.gltf` | 4 | `(0, .1, -.05)` | `(0, 0, 0)` | 1.1 |
   | `terra.gltf` | 0 (`single: true`) | `(-.65, -.3, .1)` | `(3, 1, 0)` | 2 (1.5 mobile) |
   | `satellite_v2.gltf` | 1 | `(.2, .3, .3)` | `(3, -1, 1)` | 0.95 |

**Camera** — `PerspectiveCamera(60, aspect, .1)` starting at `(0, 0, 60)`, pulled to `z: 12` during
the intro. A second scrub timeline moves it through four waypoints over **7 viewport heights**
(`end: +=innerHeight * 1.5 * 7`), each leg `duration: 1, ease: "power3.inOut"`
(`r = 1` desktop, `.5` mobile):

```
start (3,0,0) → (-4r,-2r) → (8r, 0, -3r) → (-4r,-1r, 0) → (0,-1r,-5r)
```

Plus continuous pointer parallax: `camera.position.lerp({x: mouseNdc.x*4, y: mouseNdc.y*4, z}, delta*4)`.

**Post-processing** — an `EffectComposer` with a custom `ShaderPass` that overlays an animated
dot-grid on the dark areas of the frame (`random(ipos * uTime)`, masked by
`1 - smoothstep(0, .2, maxChannel)`). Grid density is viewport-dependent:

| viewport width | `uSize` |
|---|---|
| `< 540` | 40 |
| `< 768` | 80 |
| `< 1020` | 120 |
| `< 1400` | 200 |
| else | 300 |

This is the faint dotted texture visible across the whole background in every screenshot — it is
*not* a CSS background-image. `uOpacity` is `1` desktop, `0.5` mobile.

`OrbitControls` is instantiated with `enableDamping: true` and `.update()` is called each frame,
but the camera position is overwritten by GSAP, so it has no user-visible effect.

## 9. Responsive sweep

| | 1440 | 768 | 390 |
|---|---|---|---|
| Document height | 9883px | 7586px | 7112px |
| Section spacing | `py-40` + `mb-[50vh]` (450px) | `py-40`, **no** mb | `py-40`, no mb |
| Hero padding | `lg:py-60` (240px) | `py-20` (80px) | `py-20` |
| Content gutter | 96px (1280 container + 16 pad) | 16px | 16px |
| Agency / Team column | right half (`lg:col-start-2`, 584px wide, x=760) | full width | full width |
| Solutions column | left half (584px, x=96) | full width | full width |
| Expertise grid | `lg:grid-cols-4` (252px cols, 80px gap) | `md:grid-cols-2` (80px gap) | 1 col (40px gap) |
| Statement | `md:text-center`, `md:uppercase`, 50px | centered, uppercase, 30px | **left-aligned, sentence case**, 30px |
| Nav menu | hover, absolute 75px panel | click, fullscreen scrim | click, fullscreen scrim |
| Custom cursor | visible | `display:none` | `display:none` |
| Particle opacity | 1.0 | 0.5 (`≤768` is mobile) | 0.5 |
| Reveal trigger start | `top 90%` | `top 60%` | `top 60%` |
| Footer | `lg:absolute bottom-0` | static in flow | static in flow |

Layout switch points: **768px** (grid 1→2 col, statement centres+uppercases, JS mobile flag flips)
and **1024px** (grid 2→4 col, half-width columns appear, cursor turns on, 50vh section margins,
text-stroke 1px→2px, footer becomes absolute).

## 10. Third-party overlays (out of scope for the clone)

- **CookieScript** banner + persistent circular badge bottom-left (`#cookiescript_badge`,
  46px, `rgb(45,45,45)`, `z-index: 99999`). Appears in every screenshot — ignore it.
- **Google Tag Manager** `GTM-NB3TPR38`.
- **JotForm** feedback lightbox `240245761444353` ("USTA AGENCY - WORK WITH US", 700×500,
  `openOnLoad: false`, black bg / white text). Not reachable from any visible control on this route.
