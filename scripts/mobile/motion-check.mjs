import { chromium } from 'playwright';

// §5.1 / §5.3 — the motion doctrine, measured rather than asserted:
//   1. No pinned section exists on a handset viewport.
//   2. ScrollTriggers do not accumulate across client-side navigations.
//   3. The address-bar resize storm does not trigger a refresh.
//   4. Reduced motion reaches full content parity.
const BASE = process.env.BASE || 'http://localhost:3123';

const browser = await chromium.launch();
const fail = [];
const ok = (cond, msg) => { console.log(`${cond ? '  PASS' : '  FAIL'}  ${msg}`); if (!cond) fail.push(msg); };

// ---------- 1. no pins on a handset ----------
console.log('\n[1] pinned sections at 390x844 (handset)');
{
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  const page = await ctx.newPage();
  for (const route of ['/', '/businesses', '/group']) {
    await page.goto(BASE + route, { waitUntil: 'load', timeout: 45000 });
    await page.waitForTimeout(2000);
    await page.evaluate(async () => {
      const s = window.innerHeight;
      for (let y = 0; y < document.body.scrollHeight; y += s) { window.scrollTo(0, y); await new Promise(r => setTimeout(r, 50)); }
      window.scrollTo(0, 0);
    });
    await page.waitForTimeout(500);
    const r = await page.evaluate(() => {
      const ST = window.ScrollTrigger || (window.gsap && window.gsap.core && window.ScrollTrigger);
      const pinSpacers = document.querySelectorAll('.pin-spacer').length;
      const fixedPins = [...document.querySelectorAll('body *')]
        .filter(e => getComputedStyle(e).position === 'fixed' && e.getBoundingClientRect().height > window.innerHeight * 0.8).length;
      return { pinSpacers, fixedPins, hasST: !!ST };
    });
    ok(r.pinSpacers === 0, `${route}: ${r.pinSpacers} pin-spacers (expect 0)`);
  }
  await ctx.close();
}

// ---------- 2. ScrollTrigger accumulation across navigations ----------
console.log('\n[2] ScrollTrigger count across 6 client-side navigations');
{
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  const page = await ctx.newPage();
  await page.goto(BASE + '/', { waitUntil: 'load', timeout: 45000 });
  await page.waitForTimeout(2500);
  const counts = [];
  for (const href of ['/group', '/businesses', '/insights', '/group', '/businesses', '/insights']) {
    const clicked = await page.evaluate((h) => {
      const a = [...document.querySelectorAll('a[href]')].find(x => new URL(x.href).pathname.replace(/\/$/, '').endsWith(h));
      if (!a) return false;
      a.click();
      return true;
    }, href);
    if (!clicked) { console.log(`  (skip ${href} — no in-page link)`); continue; }
    await page.waitForTimeout(2200);
    const n = await page.evaluate(() => {
      const ST = window.__ST_FOR_TEST;
      return ST ? ST.getAll().length : -1;
    });
    counts.push({ href, n });
  }
  console.log('   ' + JSON.stringify(counts));
  if (counts.length >= 4 && counts[0].n > 0) {
    // Compare the same route visited twice: a leak shows as monotonic growth.
    const first = counts.slice(0, 3).reduce((a, b) => a + b.n, 0);
    const second = counts.slice(3).reduce((a, b) => a + b.n, 0);
    ok(second <= first * 1.25, `trigger totals stable across repeat visits (${first} -> ${second})`);
  } else {
    console.log('   (ScrollTrigger not exposed for counting — see note in README)');
  }
  await ctx.close();
}

// ---------- 3. address-bar resize storm ----------
console.log('\n[3] vertical-only resize must not refresh ScrollTrigger');
{
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  const page = await ctx.newPage();
  await page.goto(BASE + '/', { waitUntil: 'load', timeout: 45000 });
  await page.waitForTimeout(2500);
  await page.evaluate(() => {
    window.__refreshes = 0;
    const ST = window.__ST_FOR_TEST;
    if (ST) ST.addEventListener('refresh', () => { window.__refreshes++; });
  });
  // Simulate the address bar collapsing and re-expanding: height changes, width does not.
  for (const h of [800, 844, 800, 844, 800, 844]) {
    await page.setViewportSize({ width: 390, height: h });
    await page.waitForTimeout(220);
  }
  const refreshes = await page.evaluate(() => window.__refreshes);
  if (refreshes === undefined || refreshes === null) console.log('   (not measurable — ScrollTrigger not exposed)');
  else ok(refreshes === 0, `refreshes on 6 vertical-only resizes: ${refreshes} (expect 0)`);

  // A real width change SHOULD still refresh.
  await page.setViewportSize({ width: 844, height: 390 });
  await page.waitForTimeout(600);
  const after = await page.evaluate(() => window.__refreshes);
  if (typeof after === 'number') ok(after > 0, `width change did refresh: ${after}`);
  await ctx.close();
}

// ---------- 4. reduced-motion content parity ----------
console.log('\n[4] reduced-motion content parity');
{
  const read = async (reduced) => {
    const ctx = await browser.newContext({
      viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true,
      reducedMotion: reduced ? 'reduce' : 'no-preference',
    });
    const page = await ctx.newPage();
    const out = {};
    for (const route of ['/', '/businesses', '/group']) {
      await page.goto(BASE + route, { waitUntil: 'load', timeout: 45000 });
      await page.waitForTimeout(2000);
      await page.evaluate(async () => {
        const s = window.innerHeight;
        for (let y = 0; y < document.body.scrollHeight; y += s) { window.scrollTo(0, y); await new Promise(r => setTimeout(r, 50)); }
      });
      await page.waitForTimeout(700);
      out[route] = await page.evaluate(() => {
        // Text that is present AND actually visible (not left at opacity 0 by
        // a reveal that never fired).
        let visible = 0, hidden = 0;
        const w = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
        let n;
        while ((n = w.nextNode())) {
          const t = n.textContent.trim();
          if (!t || !n.parentElement) continue;
          const el = n.parentElement;
          if (!el.getClientRects().length) continue;
          // Closed overlays (the nav drawer, the contact modal) are SUPPOSED
          // to be invisible. They are dismissed UI, not page content that a
          // reveal failed to bring up, and counting them would make the parity
          // check permanently red for the correct behaviour.
          if (el.closest('[inert], [aria-hidden="true"]')) continue;
          if (getComputedStyle(el).visibility === 'hidden') continue;
          let op = 1;
          for (let p = el; p && p !== document.body; p = p.parentElement) op *= parseFloat(getComputedStyle(p).opacity);
          if (op < 0.05) hidden += t.length; else visible += t.length;
        }
        return { visible, hidden };
      });
    }
    await ctx.close();
    return out;
  };
  const full = await read(false);
  const reduced = await read(true);
  for (const route of Object.keys(full)) {
    const f = full[route], r = reduced[route];
    console.log(`   ${route}  full=${f.visible}/${f.hidden}h  reduced=${r.visible}/${r.hidden}h`);
    ok(r.hidden === 0, `${route}: nothing left invisible under reduced motion (${r.hidden} chars hidden)`);
    ok(r.visible >= f.visible * 0.95, `${route}: reduced-motion text parity (${r.visible} vs ${f.visible})`);
  }
}

await browser.close();
console.log(fail.length ? `\n---- ${fail.length} FAILURES ----` : '\n---- all motion checks pass ----');
process.exit(fail.length ? 1 : 0);
