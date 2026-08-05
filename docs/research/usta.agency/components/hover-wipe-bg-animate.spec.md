# Mechanic Spec — Hover Wipe (`.bg-animate`)

- **Interaction model:** hover-driven, **pure CSS, zero JS**
- **Evidence:** `source/hoisted.css`
- **Screenshot:** `desktop-10-expertise-item-hover.png`

## Where it is used

Only on the 19 expertise list items:

```html
<li class="py-2 text-xl font-medium bg-animate hover:before:top-0">
  <div class="mix-blend-difference">Creative Direction</div>
</li>
```

Note the **two** blend layers — `.bg-animate` sets `mix-blend-mode: difference` on the `<li>`, and
the inner `<div class="mix-blend-difference">` sets it again on the label. Both are needed: the
outer one composites the white bar against the page, the inner one composites the text against the
white bar.

## CSS (verbatim)

```css
.bg-animate {
  position: relative;
  z-index: 10;
  mix-blend-mode: difference;
}

.bg-animate::before {
  content: "";
  position: absolute;
  left: -.5rem;          /* -8px  — bleeds past the text box */
  right: -.5rem;         /* -8px */
  bottom: .5rem;         /*  8px */
  top: 100%;             /* ← rest state: fully below the box */
  z-index: 0;
  background-color: rgb(255 255 255 / 1);
  transition-property: all;
  transition-duration: .7s;
  transition-timing-function: cubic-bezier(0, 0, .2, 1);   /* ease-out */
}

.hover\:before\:top-0:hover::before { top: 0 }
```

## State table

| Property | rest | hover |
|---|---|---|
| `::before` `top` | `100%` | `0` |
| `::before` `left` / `right` | `-8px` / `-8px` | unchanged |
| `::before` `bottom` | `8px` | unchanged |
| `::before` `background` | `#fff` | unchanged |
| transition | `all .7s cubic-bezier(0,0,.2,1)` | |

Animating `top` from `100%` to `0` while `bottom` stays pinned at `8px` means the pseudo-element
**grows upward from a zero-height line** — it is a height animation expressed as an inset change.

## Why it reads the way it does

1. At rest the bar has zero height (top `100%`, bottom `8px` → inverted box, nothing painted).
2. On hover the top edge travels to `0`, sweeping a white bar up behind the text over 0.7 s.
3. `mix-blend-mode: difference` on the item inverts everything the bar covers — the `#D1D5DB`
   (gray-300) label flips to near-black (`255-209, 255-213, 255-219` = `rgb(46,42,36)`) as the bar
   passes under it.

So it is not "white bar + black text"; it is one white bar and a blend mode doing the colour work.

## Cost note

`transition-property: all` on an element with an animating `top` forces layout on the pseudo each
frame. `transition: top .7s` would be equivalent here and cheaper. On 19 simultaneous items this is
measurable; with one hovered at a time it is not. Prefer the explicit property when porting.

## Responsive

No breakpoint branches. The effect is live at every width, including touch — where `:hover` is
sticky after tap, so the bar stays up until the next tap elsewhere. The target does not guard this
with `@media (hover: hover)`.

## Porting notes (Trivoxa)

- The transferable idea is **one moving surface + a blend mode** instead of animating two colours
  in opposition. It stays correct if the underlying palette changes.
- `EXTRACTION_BRIEF.md` records the standing decision: this project uses `scaleY` from
  `transform-origin: bottom` instead — same direction, compositor-only, no layout. Keep that.
- Wrap in `@media (hover: hover) and (pointer: fine)` — the target's omission is a real defect on
  touch.
- `difference` only behaves against a near-black or near-white backdrop. Verify per surface; over
  mid-tones it muddies.
