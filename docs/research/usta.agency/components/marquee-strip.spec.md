# Mechanic Spec — Marquee (`.strip`)

- **Interaction model:** time-driven loop + hover-reactive `timeScale`
- **Evidence:** `source/app.main.js` lines ~48–73; `source/hoisted.css`
- **Screenshots:** `desktop-05b-expertise-marquee.png`, `desktop-07-team-marquees.png`

## Mechanism

```js
document.querySelectorAll(".strip").forEach(strip => {
  const { duration = 30, direction } = strip.dataset
  const keys = [0, -25]
  if (direction) keys.reverse()                       // reverse → [-25, 0]

  strip.innerHTML += strip.innerHTML + strip.innerHTML + strip.innerHTML   // ⚠ see below

  const loop = gsap.to(strip, {
    keyframes: { xPercent: keys, ease: "none", easeEach: "none" },
    duration, repeat: -1, ease: "none"
  })

  const slow = gsap.to({ value: 1 }, {
    value: .15, paused: true, duration: .5, ease: "power3.out",
    onUpdate() { loop.timeScale(this.targets()[0].value) }
  })

  strip.addEventListener("mouseenter", () => slow.play())
  strip.addEventListener("mouseleave", () => slow.reverse())
})
```

### The duplication is ×4, and the line is subtle

`strip.innerHTML += strip.innerHTML + strip.innerHTML + strip.innerHTML`

The right-hand side is evaluated **before** assignment, so all three reads return the *original*
content. Result is `original + original×3` = **4 copies**. Translating `xPercent: 0 → -25` moves
by exactly one copy's width, which is why the loop is seamless.

If you re-implement as `strip.innerHTML = strip.innerHTML.repeat(4)` you get the same result.
If you write `for (i<3) strip.innerHTML += strip.innerHTML` you get **8** copies and `-25%` is wrong.

### Markup counts — corrected

| Strip | spans in **raw HTML** | after ×4 duplication |
|---|---|---|
| Expertise banner | **2** | 8 |
| Team row 1 | 4 | 16 |
| Team row 2 | 4 | 16 |
| Team row 3 | 5 | 20 |

(Earlier drafts of `BEHAVIORS.md` / `PAGE_TOPOLOGY.md` said "8 in markup → 32" for the expertise
banner. Verified against raw source: it is 2 → 8. Corrected in those files; see `ERRATA.md`.)

### Hover slow-down

`timeScale` eases `1 → 0.15` over 0.5 s `power3.out` on enter, and reverses on leave. Note it is
tweening a **plain object**, not the timeline, and pushing the value through `onUpdate` — this is
how you get an eased `timeScale` change (you cannot tween `timeScale` directly with an ease and
get the same result). The strip does not stop; it crawls at 15%.

## Per-strip parameters

| Strip | `data-duration` | `data-direction` | Effective |
|---|---|---|---|
| Expertise banner | *absent* → **30** | forward | `xPercent 0 → -25` over 30 s |
| Team row 1 | `32` | forward | 32 s |
| Team row 2 | `35` | `reverse` | `xPercent -25 → 0` over 35 s |
| Team row 3 | `30` | forward | 30 s |

All four also carry `.slower` in markup, and `.strip.slower { animation-duration: 40s }` — but see
the dead-CSS note below; it has no effect.

## Dead CSS — do not copy

```css
.strip          { width: max-content; animation: run 20s linear infinite;
                  transition: animation-duration ease-out }
.strip.reverse  { animation-direction: reverse }
.strip.slower   { animation-duration: 40s }
```

**There is no `@keyframes run` anywhere in either stylesheet** (verified: 0 occurrences of
`keyframes` in both files). The `animation` declarations are dangling references and do nothing.
`transition: animation-duration` is also meaningless — `animation-duration` is not an animatable
property. The entire marquee is GSAP.

The only line in that block that matters is **`width: max-content`**, without which the flex row
would wrap instead of overflowing.

## Typography inside a strip

Each item is `<span class="mr-8 md:mr-10 lg:mr-20">` (margin-right 32 / 40 / 80px) wrapping a word
in `.text-filled` (solid white) or `.text-outline` (transparent + white stroke), alternating.

```css
.strip-title .text-outline,
.strip-title .text-filled          { display:inline-flex; align-items:center }
.strip-title .text-outline::after,
.strip-title .text-filled::after   { content:""; margin-left:2rem; margin-top:1rem;
                                     width:.5rem; height:.5rem; border-radius:9999px;
                                     background:#fff; display:inline-block }
@media (min-width:768px)  { …::after { margin-left: 2.5rem } }
@media (min-width:1024px) { …::after { margin-left: 5rem } }
```

So every marquee word is followed by an **8px white dot** as a separator, offset 32 / 40 / 80px.

Team rows additionally render a role line and a LinkedIn link:
```css
.strip-title a         { display:flex; align-items:flex-end; gap:1rem }
.strip-title a::before { content:"-" }     /* the dash before the LinkedIn glyph */
```

## Measured widths (1440)

| Element | computed width |
|---|---|
| `#expertise h3.strip` | 9041 px |
| `.strip-title` (team row 1) | 8851 px |

## Responsive

| | 1440 | 768 | 390 |
|---|---|---|---|
| Expertise banner font | 150px (`xl:text-[150px]`) | 60px | 60px |
| Team `.strip-title` font | 110px (`lg`) / 130px (`2xl`) | 75px | 60px (`max-width:480` override) |
| Item margin-right | 80px | 40px | 32px |
| Dot `::after` margin-left | 80px | 40px | 32px |

Durations and the `-25%` translate are viewport-independent — so the strip travels the same
*proportion* per second at every width, and therefore fewer pixels/sec on mobile. It reads slower
on a phone, which is correct.

## Porting notes (Trivoxa)

- The ×4 + `-25%` pairing is the seamless-loop recipe. Keep them locked together.
- Eased `timeScale` via a proxy object is the reusable trick; a bare `timeScale` set is abrupt.
- Hover-to-slow (not hover-to-pause) keeps the surface alive while letting someone read it.
- Drop the dead `animation:` CSS entirely — it is noise that implies a CSS fallback that does not exist.
