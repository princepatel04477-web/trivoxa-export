# Mechanic Spec — Preloader & Intro Timeline

- **Interaction model:** time-driven, gated by asset-load progress
- **Evidence:** `source/app.main.js` lines ~74–196
- **Screenshot:** `desktop-01-hero.png` (post-intro, settled)

## Markup

```html
<div id="loader" style="letter-spacing: 4px"
     class="min-h-screen text-white text-xl fixed inset-0 flex items-center
            justify-center font-extralight z-30 py-10">
  <h3 class="mr-2">USTA</h3><span id="counter">0</span><span>%</span>
</div>
```

Computed: Montserrat 200 / 20px / lh 28px / `letter-spacing: 4px` / white / `z-index: 30` /
`padding: 40px 0` / full viewport, flex-centred.

Both `<main id="content">` and the two hero text nodes ship with inline `opacity: 0` so nothing
flashes before SplitText has run.

## The counter

Driven by `THREE.LoadingManager.onProgress` — i.e. by real GLTF/texture load, not a fake timer:

```js
manager.onProgress = (url, loaded, total) => {
  const pct = 100 * loaded / total
  gsap.to("#counter", {
    duration: 1,
    innerText: pct.toFixed(0),
    snap: "innerText",                       // integer steps, no decimals
    onComplete: pct >= 100 ? startIntro : () => {}
  })
}
```

Four GLTF models feed the manager, so `total` is 4 and the counter lands on 25 / 50 / 75 / 100,
each tweened over 1 s. **The intro cannot start until the last model is parsed** — on a cold cache
that is ~8.4 MB of geometry.

## Intro timeline

`gsap.timeline()`, plays once, unpaused. Positions are absolute seconds on that timeline.

| t | Target | From → To | Dur | Ease |
|---|---|---|---|---|
| 0 | `#loader` **chars** (SplitText `type:"chars"`) | → `autoAlpha 0, y 200` | 0.8 | `back.in`, `stagger:{amount:.5}` |
| 0 | `uIntro` (particle **and** post-fx uniform, both) | `0 → 1` | 3 | `Power4.easeOut` |
| 0.5 | camera position | → `z: 12` | 3 | `Power4.easeOut` |
| 0.5 | `#content` | `autoAlpha → 1` | 0.5 | default (`power1.out`) |
| 0.5 (`"<"`) | `#main-header` | `opacity 0, y -50` → `opacity 1, y 0` | 1 | `Power4.easeOut` |
| 1.75 | `#main-title` **words** | `y 200, rotate 15` → `y 0, rotate 0` | 1 | `Power4.easeOut`, `stagger: 0.1` |
| 2.0 | `#main-description` **chars** | `y 50, rotate 15, opacity 0` → `y 0, rotate 0, opacity 1` | 0.5 | `Power4.easeOut`, `stagger:{amount:.5}` |

On loader-chars complete: `gsap.set("#loader", { autoAlpha: 0 })`.
`#main-title` / `#main-description` each get `opacity: 1` via `onStart` of their own tween.

### SplitText configs

```js
new SplitText("#main-title",       { type: "words,lines",
                                     linesClass: "overflow-hidden",
                                     wordsClass: "inline-block" })
new SplitText("#main-description", { type: "chars,words",
                                     wordsClass: "overflow-hidden",
                                     charsClass: "inline-block" })
```

The `overflow-hidden` class is the whole trick: on the title it wraps each **line**, so words
translating `y: 200 → 0` are masked by their own line box and appear to rise out of nothing. On the
description it wraps each **word**, masking the chars.

`rotate: 15 → 0` runs alongside the Y — a slight de-skew as each glyph settles. Easy to miss and
a large part of why it reads as crafted rather than generic.

Note the camera pull (`z: 60 → 12`, 3 s `Power4.easeOut`) runs **under** the text reveals, so the
particle field rushes toward the viewer while the headline rises. The two are deliberately
concurrent.

## Ordering dependency

`startIntro()` also *builds* the morph geometry (`LE(v0)` — surface-samples all four models into
buffer attributes) as its first statement, before any tween. So the geometry work happens on the
same frame the loader starts leaving. On a slow device this is a visible hitch at 100%.

## Responsive

No breakpoint branches in the intro timeline itself. The mobile flag only reaches it indirectly
through the camera-travel scale factor (`r = 0.5` on ≤768) set up afterwards.

## Porting notes (Trivoxa)

- Gate on **real** asset progress, not a timer, if there are heavy assets to wait on; otherwise a
  counter is theatre and adds latency for nothing.
- The `back.in` exit on the loader (overshoot *downward* before flying off at `y: 200`) is what
  keeps it from feeling like a plain fade.
- Concurrency is the lesson: loader exit, camera pull, header drop and headline rise all overlap
  within ~3 s rather than queueing.
