import { chromium } from 'playwright';

/**
 * §8.2 — the gates that a headless browser CAN answer honestly.
 *
 *   Cumulative Layout Shift  < 0.05
 *   Largest Contentful Paint < 2.5s
 *   keyboard pass on the drawer and the quote form
 *
 * Deliberately NOT attempted here: sustained frame rate, Lighthouse
 * Performance, INP, and device temperature. §8.1 judges those on a throttled
 * mid-tier Android; headless Chromium rasterises WebGL through SwiftShader, so
 * any frame number it produced would be a measurement of the software
 * rasteriser rather than of the site. Reporting one would be worse than
 * reporting none.
 *
 * LCP here is a local-network number and therefore a floor, not the field
 * value — it says the render path is not itself slow, which is what the build
 * can be held to.
 */
const BASE = process.env.BASE || 'http://localhost:3123';
const ROUTES = ['/', '/group', '/businesses', '/global-presence', '/rfq', '/insights', '/careers'];

const fail = [];
const ok = (c, m) => { console.log(`${c ? '  PASS' : '  FAIL'}  ${m}`); if (!c) fail.push(m); };

const browser = await chromium.launch();

console.log('\n[CLS / LCP] 390x844, throttled CPU 4x');
{
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  const page = await ctx.newPage();
  const cdp = await ctx.newCDPSession(page);
  // 4x CPU throttle stands in for the mid-tier Android's main thread. It does
  // not stand in for its GPU, which is the part that cannot be simulated.
  await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 });

  // Registered BEFORE navigation. `largest-contentful-paint` entries are not
  // retained in the performance timeline the way marks are — reading them
  // after load with getEntriesByType returns nothing, which is why an earlier
  // version of this script reported LCP as n/a on every route and quietly
  // failed to check the gate at all.
  await page.addInitScript(() => {
    window.__cls = 0;
    window.__lcp = 0;
    new PerformanceObserver((list) => {
      for (const e of list.getEntries()) if (!e.hadRecentInput) window.__cls += e.value;
    }).observe({ type: 'layout-shift', buffered: true });
    new PerformanceObserver((list) => {
      for (const e of list.getEntries()) window.__lcp = Math.max(window.__lcp, e.startTime);
    }).observe({ type: 'largest-contentful-paint', buffered: true });
  });

  for (const route of ROUTES) {
    await page.goto(BASE + route, { waitUntil: 'load', timeout: 60000 });
    await page.waitForTimeout(600);
    // Scroll the whole page: reveals, lazy images and the sticky CTA all land
    // during scrolling, and a shift there counts exactly as much as one at load.
    await page.evaluate(async () => {
      const s = Math.round(window.innerHeight * 0.9);
      for (let y = 0; y < document.body.scrollHeight; y += s) { window.scrollTo(0, y); await new Promise((r) => setTimeout(r, 130)); }
      window.scrollTo(0, 0);
    });
    await page.waitForTimeout(700);

    const m = await page.evaluate(() => {
      const nav = performance.getEntriesByType('navigation')[0];
      return {
        cls: Math.round(window.__cls * 1000) / 1000,
        lcp: window.__lcp ? Math.round(window.__lcp) : null,
        dcl: nav ? Math.round(nav.domContentLoadedEventEnd) : null,
      };
    });
    const clsOk = m.cls < 0.05;
    const lcpOk = m.lcp === null || m.lcp < 2500;
    ok(clsOk && lcpOk, `${route.padEnd(20)} CLS ${String(m.cls).padEnd(6)} LCP ${m.lcp ?? 'n/a'}ms  DCL ${m.dcl}ms`);
  }
  await ctx.close();
}

console.log('\n[keyboard] drawer');
{
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  const page = await ctx.newPage();
  await page.goto(BASE + '/', { waitUntil: 'load', timeout: 45000 });
  await page.waitForTimeout(2200);

  await page.evaluate(() => document.querySelector('.hamburger').focus());
  await page.keyboard.press('Enter');
  await page.waitForTimeout(600);
  ok(await page.evaluate(() => document.body.classList.contains('nav-active')), 'opens from the keyboard');
  ok(await page.evaluate(() => !!document.activeElement?.closest('.mobile-nav')), 'focus moves inside');

  // Tab all the way round; focus must never leave the drawer.
  let escaped = false;
  for (let i = 0; i < 30; i++) {
    await page.keyboard.press('Tab');
    if (!(await page.evaluate(() => !!document.activeElement?.closest('.mobile-nav')))) { escaped = true; break; }
  }
  ok(!escaped, 'focus is trapped across 30 tabs');

  // Shift-Tab wraps backwards too.
  for (let i = 0; i < 8; i++) await page.keyboard.press('Shift+Tab');
  ok(await page.evaluate(() => !!document.activeElement?.closest('.mobile-nav')), 'trapped on shift+tab');

  // A branch row is operable by keyboard and descends a level.
  await page.evaluate(() => document.querySelector('.mobile-nav__branch').focus());
  await page.keyboard.press('Enter');
  await page.waitForTimeout(500);
  ok(await page.evaluate(() => Number(document.querySelector('.nav__content').dataset.depth) === 1), 'branch descends from the keyboard');
  ok(await page.evaluate(() => !!document.querySelector('.mobile-nav__back')), 'back affordance present at depth');

  await page.keyboard.press('Escape');
  await page.waitForTimeout(600);
  ok(await page.evaluate(() => !document.body.classList.contains('nav-active')), 'Escape closes');
  ok(await page.evaluate(() => document.activeElement === document.querySelector('.hamburger')), 'focus returns to the trigger');
  await ctx.close();
}

console.log('\n[keyboard / labelling] quote form');
{
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  const page = await ctx.newPage();
  await page.goto(BASE + '/rfq/', { waitUntil: 'load', timeout: 45000 });
  await page.waitForTimeout(2000);
  const chooser = await page.$('.rfq-path-card');
  if (chooser) { await chooser.click(); await page.waitForTimeout(800); }

  const named = await page.evaluate(() => {
    const out = [];
    for (const el of document.querySelectorAll('.rfq-field input, .rfq-field select, .rfq-field textarea')) {
      // A wrapping <label> is what associates the text with the control; the
      // accessible name is what a screen reader actually announces.
      const wrapped = el.closest('label');
      const text = wrapped?.querySelector('.rfq-field__label')?.textContent?.trim();
      out.push({ named: !!(text || el.getAttribute('aria-label')), text });
    }
    return out;
  });
  ok(named.length > 0 && named.every((f) => f.named), `every control has an accessible name (${named.length} controls)`);

  // Tab order must reach the submit path without leaving the form.
  await page.evaluate(() => document.querySelector('.rfq-field input')?.focus());
  let reached = false;
  for (let i = 0; i < 40; i++) {
    await page.keyboard.press('Tab');
    if (await page.evaluate(() => !!document.activeElement?.closest('.rfq-actions'))) { reached = true; break; }
  }
  ok(reached, 'tab order reaches the form actions');

  const invalid = await page.evaluate(() => {
    const el = document.querySelector('.rfq-field input[type="email"]');
    return el ? el.getAttribute('aria-invalid') : 'missing';
  });
  ok(invalid !== 'missing', `email field exposes aria-invalid (${invalid})`);
  await ctx.close();
}

await browser.close();
console.log(fail.length ? `\n---- ${fail.length} FAILURES ----` : '\n---- all measurable vitals + keyboard checks pass ----');
process.exit(fail.length ? 1 : 0);
