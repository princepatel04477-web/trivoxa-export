# Mechanic Spec — Custom Cursor

- **Interaction model:** pointer-driven (position instant, size lerped per-frame)
- **Evidence:** `source/app.main.js` lines ~199–206, ~336–338, ~485–497
- **Screenshot:** `desktop-09-nav-dropdown-open.png` (cursor expanded to 400 over the logo)

## Markup & computed style

```html
<div id="cursor" class="hidden lg:block aspect-square w-4 z-[100] fixed
                        pointer-events-none -translate-x-1/2 -translate-y-1/2
                        rounded-full bg-white"></div>
```

```css
#cursor { mix-blend-mode: difference; z-index: 999999 }   /* overrides the z-[100] utility */
html, body      { cursor: none }
[data-cursor], * { cursor: none !important }
```

Computed at 1440: `16 × 16 px`, `border-radius: 9999px`, `background: rgb(255,255,255)`,
`position: fixed`, `mix-blend-mode: difference`, `z-index: 999999`.
Below `lg` (1024px) it is `display: none` — measured box `0 × 0` at 390px.

## Position — instant, not lerped

```js
window.addEventListener("mousemove", e => {
  ndc.x =  2 * e.clientX / window.innerWidth  - 1     // also feeds the WebGL camera
  ndc.y = -2 * e.clientY / window.innerHeight + 1
  if (!isMobile) gsap.set(cursor, { top: e.clientY, left: e.clientX })
})
```

`gsap.set` — no tween. Centring is CSS (`-translate-x-1/2 -translate-y-1/2`), so the disc never
lags the pointer. **Only the size is animated.** This is the right split: a lagging cursor
position feels broken; a lagging cursor *size* feels designed.

## Size — lerped in the render loop

Inside the same rAF that drives Three.js:

```js
if (!isMobile) gsap.set(cursorEl, {
  width: MathUtils.lerp(gsap.getProperty(cursorEl, "width"), targetW, delta * 10)
})
```

`aspect-square` keeps height in step with width. Frame-rate–normalised via `delta`, so the
approach is ~exponential with a time constant of ~0.1 s.

> **Headless caveat.** Under Playwright the rAF loop runs far below 60 fps, so `delta` is large
> and `delta * 10` exceeds 1 — the lerp overshoots badly (measured 473px where the target was 100).
> Values below are the *targets* read from source, not measurements.

## Hover targets

```js
document.querySelectorAll("[data-cursor]").forEach(el => {
  el.addEventListener("mouseenter", () => { targetW = gsap.getProperty(el, "data-cursor"); glowScale = 0 })
  el.addEventListener("mouseleave", () => { targetW = 16;                                  glowScale = 1 })
})
```

| Element | `data-cursor` |
|---|---|
| Logo `<a href="/">` | **400** |
| `Let's talk` nav link | **100** |
| `It` locale link | **100** |
| Menu trigger `<span>` | **100** |
| Each team LinkedIn `<a>` (×13) | **60** |
| `hello@usta.agency` | **200** |
| *default / on leave* | **16** |

Note the second effect: entering a target sets `glowScale = 0`, which shrinks the **WebGL glow
sprite** that otherwise trails the pointer (see `webgl-particle-field.spec.md` §Glow sprite). So
hovering a link swaps a soft 3D bloom for a hard 2D disc — the two are deliberately exclusive.

## The blend is the point

`mix-blend-mode: difference` against a black page makes the disc read white; but where it crosses
white type, the type inverts to black *inside the circle*. At `data-cursor: 400` over the logo the
disc is larger than the header, so the whole nav inverts as it passes. This is the site's signature
interaction and it costs one CSS property.

It only works because the page is near-black. Over a mid-grey surface `difference` produces muddy
inversions — check per surface before applying.

## Responsive

| | ≥1024px | <1024px |
|---|---|---|
| `#cursor` | `display: block` | `display: none` |
| position listener | active | `mousemove` still fires but the `gsap.set` is skipped (`isMobile` guard, flag flips at ≤768) |

Between 769–1023px there is a **gap**: `isMobile` is false so the JS still writes `top`/`left`,
but Tailwind's `lg:block` has not kicked in, so the element is `display:none`. Harmless — wasted
writes to a hidden node — but it is a real inconsistency between the CSS breakpoint (1024) and the
JS flag (768).

## Porting notes (Trivoxa)

- Split position (instant) from size/shape (eased). Do not ease position.
- `cursor: none` must be `!important` and applied to `*`, or child elements with their own
  `cursor:` reassert the native pointer.
- Drive size from a `data-` attribute per target rather than a class per size — it scales to
  arbitrary values without CSS churn.
- `mix-blend-mode: difference` needs `pointer-events: none` on the cursor or it eats every click.
