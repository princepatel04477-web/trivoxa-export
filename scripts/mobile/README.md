# Mobile gates (§8.2 / §8.3)

Measures the three gates that can be checked statically, on the **built**
site, across every route and every must-pass width.

```bash
npm run build
bash scripts/mobile/serve.sh                 # always restart through this
node scripts/mobile/audit.mjs                # 360 / 390 / 430, all routes
node scripts/mobile/desktop-check.mjs        # desktop non-regression
```

Requires Playwright, which is deliberately **not** a dependency of this
project — it is a verification tool, not something the site ships:

```bash
npm install --no-save playwright && npx playwright install chromium
```

## Gates covered

| Gate | Threshold |
|---|---|
| Horizontal overflow at 360/390/430 | zero elements past the viewport edge |
| Tap targets under 44px | zero |
| Text under 13px | zero |

Not covered here: sustained frame rate, Lighthouse, LCP/CLS/INP and device
temperature. Those are judged on a throttled mid-tier Android per §8.1 and
cannot be produced by headless Chromium on a software rasteriser.

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
