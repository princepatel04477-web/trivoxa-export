# Mobile gates (§8.2 / §8.3)

Measures the §8.2 gates a headless browser can answer honestly, on the **built**
site, across every route and every must-pass width.

```bash
npm run build
bash scripts/mobile/serve.sh                 # always restart through this
node scripts/mobile/audit.mjs                # 360 / 390 / 430, all routes
node scripts/mobile/motion-check.mjs         # §5  motion doctrine on touch
node scripts/mobile/chrome-check.mjs         # §7  drawer, CTA, header, form
node scripts/mobile/vitals-check.mjs         # CLS, LCP, keyboard pass
node scripts/mobile/landscape-check.mjs      # §8.1 landscape
node scripts/mobile/desktop-check.mjs        # desktop non-regression
```

Requires Playwright, which is deliberately **not** a dependency of this
project — it is a verification tool, not something the site ships:

```bash
npm install --no-save playwright && npx playwright install chromium
```

## Gates covered

| Gate | Threshold | Script |
|---|---|---|
| Horizontal overflow at 360/390/430 | zero elements past the viewport edge | audit |
| Tap targets under 44px | zero | audit |
| Text under 13px | zero | audit |
| Cumulative Layout Shift | < 0.05 | vitals |
| Largest Contentful Paint | < 2.5s | vitals |
| Reduced-motion parity | full content, zero motion | motion |
| Keyboard pass, drawer + form | clean | vitals |
| Landscape | must not break | landscape |

Not covered: sustained frame rate, Lighthouse Performance, INP and device
temperature. §8.1 judges those on a throttled mid-tier Android, and headless
Chromium rasterises WebGL through SwiftShader — any number produced here would
measure the rasteriser rather than the site. See `docs/research/MOBILE_SIGNOFF.md`.

## Options

- `WIDTHS=360,390,430` — viewport widths to sweep
- `ONLY=/rfq` — restrict to one route
- `MOTION=on` — measure with animations live (default is
  `prefers-reduced-motion`, so geometry is settled and the numbers are
  repeatable; it is also the §5.4 parity state)
- `BASE=http://localhost:3123` — server under test

## Always restart the server through `serve.sh`

A server left running across a rebuild keeps serving HTML that references
chunk hashes the new build no longer has. Every stylesheet then 500s, the
audit measures an **unstyled** page, and the numbers it reports are
meaningless — this cost a full debugging cycle once already. `serve.sh`
kills whatever holds the port before starting, so it cannot recur.

## Measurement notes

Two cases where the naive check reports a defect that is not one, and how
the harness resolves them:

- **Clipped children.** An element wider than the viewport inside an
  ancestor with `overflow-x: hidden|auto|scroll` is contained, not
  overflowing. The marquee rows are the standing example — the audit
  walks up for a clipping ancestor before flagging.
- **Checkboxes.** A checkbox inside a `<label>` is tappable across the
  whole label, so the label's box is the honest hit area to measure, not
  the 16px control.
