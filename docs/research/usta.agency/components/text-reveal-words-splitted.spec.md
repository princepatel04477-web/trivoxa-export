# Mechanic Spec — Scroll Text Reveal (`.words-splitted`)

- **Interaction model:** scroll-driven, **play-once, no scrub, no reverse**
- **Evidence:** `source/app.main.js` lines ~157–179
- **Screenshots:** `desktop-02-intro-statement.png`, `-03-agency.png`, `-04-solutions.png`, `-06-team.png`

## Mechanism

```js
[...document.querySelectorAll(".words-splitted")]
  .map(el => ({ splitted: new SplitText(el, { type: "chars,words",
                                              wordsClass: "overflow-hidden" }),
                amount: el.dataset.amount || .5 }))
  .forEach(({ splitted, amount }) => {
    gsap.set(splitted.chars, { autoAlpha: 0, y: 100 })
    gsap.to(splitted.chars, {
      y: 0, rotate: 0, autoAlpha: 1,
      stagger: { amount: amount / 2 },
      ease: "power3.out",
      scrollTrigger: {
        trigger: splitted.elements[0],
        start: `top ${isMobile ? "60%" : "90%"}`,
        end:   () => `+=${window.innerHeight * (isMobile ? 1 : 1.5) / 2}px`
      }
    })
  })
```

Key properties:

- **No `scrub`.** The tween is a normal timeline triggered by entry. Scrolling back up does not
  reverse it; the text stays revealed. (`toggleActions` defaults to `play none none none`.)
- `end` is declared but, without scrub, only affects the trigger's active range — not the timing.
- `rotate: 0` is in the *to* vars with no matching *from*, so it is a no-op here (chars are never
  set to a non-zero rotation). Harmless, but don't copy it thinking it does something.
- The `.map(...).forEach(...)` split means **every** `.words-splitted` element is split up-front at
  intro time, then wired. On this page that is 7 blocks / ~1,900 chars of DOM.

## Per-block stagger

`data-amount` is the *total* stagger window in seconds — GSAP divides it across all chars.
The code halves it (`amount / 2`).

| Block | Selector | `data-amount` | Effective stagger window |
|---|---|---|---|
| Statement | `#content section:nth-of-type(2) .grid` | `3` | 1.5 s |
| Agency copy | `#agency .col-span-1` | `2.5` | 1.25 s |
| Solutions copy | `#solution .col-span-1` | `3` | 1.5 s |
| Expertise column ×4 | `#expertise .col-span-1` | `1` | 0.5 s |
| Team copy | `#team .col-span-1` | `3` | 1.5 s |
| Contacts | `#contacts .container` | `2` | 1.0 s |
| Footer | `footer` | `3` | 1.5 s |

Because it is `stagger: { amount }` and not `stagger: <number>`, the window is fixed regardless of
char count — a long paragraph staggers faster per-char than a short one, and all blocks finish in
the same wall-clock time. That is why the 4 expertise columns (short) and the statement (long)
feel like the same gesture.

## Per-char state

| | before | after |
|---|---|---|
| `autoAlpha` | `0` | `1` |
| `y` | `100px` | `0` |
| ease | — | `power3.out` |

`wordsClass: "overflow-hidden"` masks each word, so chars rising 100px are clipped by their own
word box — same masking trick as the hero title, one level finer.

## Opt-out

`.no-words-splitted` marks the four marquee headings. It is **not** a CSS class with rules and
**not** read by the JS — the selector is `.words-splitted`, and those elements simply don't carry
it. The `no-` class is documentation-by-naming only. (Confirmed: `no-words-splitted` appears 0×
in the bundle.)

## Responsive

| | ≥769px | ≤768px |
|---|---|---|
| trigger start | `top 90%` | `top 60%` |
| trigger end | `+= 0.75 × vh` | `+= 0.5 × vh` |

Firing at `top 60%` on mobile means the block must be 40% up the screen before it starts — later,
because short viewports would otherwise reveal text still below the fold.

## Porting notes (Trivoxa)

- `stagger: { amount }` (fixed total window) rather than `stagger: <per-item delay>` is the
  transferable idea — it makes blocks of wildly different length feel like one system.
- Play-once, never reverse. Re-animating on scroll-back is the single most common way this effect
  turns annoying.
- Per-char with a per-word mask is expensive DOM (~1,900 spans here). Per-word with a per-line mask
  gets most of the read at a fraction of the node count.
