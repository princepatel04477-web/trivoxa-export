# Mechanic Spec — Navigation Dropdown

- **Interaction model:** **hover ≥769px / click ≤768px** — the trigger swaps at the JS mobile flag
- **Evidence:** `source/app.main.js` lines ~12–47
- **Screenshots:** `desktop-09-nav-dropdown-open.png`, `mobile-390-02-menu-open.png`

## Mechanism

```js
document.querySelectorAll(".has-dropdown").forEach(li => {
  const ul = li.querySelector("ul")
  const items = li.querySelectorAll("li")

  const tl = gsap.timeline({
    paused: true,
    onStart:            () => gsap.set(ul, { autoAlpha: 1 }),
    onReverseComplete:  () => gsap.set(ul, { autoAlpha: 0 })
  })

  tl.add(gsap.from(items, { duration: .5, ease: "back",
                            autoAlpha: 0, y: -50, stagger: { amount: .2 } }))

  if (isMobile) tl.fromTo(ul, { backgroundColor: "rgba(0,0,0,0.)" },
                              { backgroundColor: "rgba(0,0,0,0.9)", duration: .5 }, 0)

  items.forEach(item => item.addEventListener("click", e => {
    const a = e.target
    e.preventDefault(); e.stopPropagation()
    a.hash ? (smoother.scrollTo(a.hash, true), tl.reverse())
           : tl.reverse().then(() => { if (a.href) window.location.href = a.href })
  }))

  isMobile
    ? li.addEventListener("click", () => (tl.reversed() || (!tl.reversed() && tl.paused()))
                                         ? tl.play() : tl.reverse())
    : (li.addEventListener("mouseenter", () => tl.play()),
       li.addEventListener("mouseleave", () => tl.reverse()))
})
```

Notes:

- `gsap.from` with `autoAlpha: 0, y: -50` — items **drop in from above** with `ease: "back"`
  (overshoot past their resting position, then settle).
- `stagger: { amount: .2 }` — fixed 200 ms window across all 4–5 items.
- The `rgba(0,0,0,0.)` literal in the mobile scrim `fromTo` is malformed-looking but valid CSS
  (`0.` parses as `0`), so it is transparent → 90% black over 0.5 s.
- **Close-then-navigate**: an item *without* a hash reverses the timeline first and only then sets
  `location.href`, using the promise GSAP returns from `.reverse()`. An item *with* a hash scrolls
  and closes simultaneously. This is why dropdown anchors are excluded from the global
  `a[href^="#"]` handler in `smooth-scroll-shell.spec.md`.

## Panel geometry

### Desktop (≥1024px, measured at 1440)

```
position: absolute; top: 100% (28px); left: auto; right: 0;
width: max-content (~75px); padding-top: 24px;
text-align: right; background: transparent;
```

Items: `<li class="transition-[padding-right] lg:hover:pr-4"><a class="block py-4">` —
so each is 60px tall (28px line-height + 32px padding) and **hovering slides the label 16px left**
via `padding-right: 0 → 1rem`, `transition: padding-right .15s cubic-bezier(.4,0,.2,1)`.

Also carries `group-hover:opacity-100` as a CSS fallback path alongside the GSAP timeline.

### Mobile (≤768px, measured at 390)

```
position: fixed; top: 100% (52px); left: 0; right: 0;
height: 100vh (844px); width: 390px;
padding: 24px 16px 0 0;
text-align: right; background: rgba(0,0,0,.9);
```

A full-screen right-aligned scrim. Adds a fifth item, `lg:hidden`:
`<li class="lg:hidden mt-10 …"><span class="block py-4 underline">close</span></li>`
— margin-top 40px, underlined, and it carries `lg:hover:mr-4` (margin, not padding, on this one).

## Items

| Label | href | Behaviour |
|---|---|---|
| Home | `#home` | smooth-scroll + close |
| Agency | `#agency` | smooth-scroll + close |
| Solution | `#solution` | smooth-scroll + close |
| Team | `#team` | smooth-scroll + close |
| close | *(none — `<span>`)* | mobile only; falls through to `tl.reverse()` |

Sibling links outside the dropdown, in the same `<ul class="flex gap-8 items-center text-lg">`:
`Let's talk` → `#contacts`, and `It` → `/it` (a real locale route, full page load).

Trigger markup: `<li class="group has-dropdown relative"><span data-cursor="100">` containing both
the `<ul>` and a hamburger `<button>` (`w-10 h-10 p-2`, 3-bar SVG rendering 20 × 16.47).

## State table

| | closed | open |
|---|---|---|
| `ul` `autoAlpha` | `0` (also inline `opacity:0; visibility:hidden`) | `1` |
| item `y` | `-50px` | `0` |
| item `autoAlpha` | `0` | `1` |
| mobile `ul` background | `rgba(0,0,0,0)` | `rgba(0,0,0,.9)` |
| duration | 0.5 s, `ease: "back"`, stagger window 0.2 s | |

## The 769–1023px gap

`isMobile` flips at **768** but the panel's layout classes flip at **1024** (`lg:absolute`,
`lg:w-max`, `lg:bg-transparent`). Between those widths the menu is **hover-triggered** (desktop
branch) while still rendering as a **full-screen fixed black scrim** (mobile layout). On a
769–1023px touch device that is effectively unopenable. This is a real bug on the target — do not
faithfully reproduce it; align the JS flag with the CSS breakpoint.

## Porting notes (Trivoxa)

- Pick **one** breakpoint constant and share it between CSS and JS. This spec exists largely to
  document what happens when you don't.
- Close-then-navigate via the promise from `.reverse()` is a clean pattern for exit animations
  that must finish before a route change.
- `ease: "back"` on a drop-in is what separates it from a generic fade — the overshoot reads as
  physical.
