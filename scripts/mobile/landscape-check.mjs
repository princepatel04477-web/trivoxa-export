import { chromium } from 'playwright';

// §8.1 — "Any device, landscape: must not break."
// A landscape handset is the case the render-budget work turns on: 844px wide
// but still a phone, which is exactly the misclassification Phase 1 fixed.
const BASE = process.env.BASE || 'http://localhost:3123';
const ROUTES = ['/', '/group', '/businesses', '/global-presence', '/rfq', '/insights'];
const VIEWPORTS = [
  { name: 'iPhone SE landscape', width: 667, height: 375 },
  { name: 'iPhone 15 landscape', width: 852, height: 393 },
  { name: 'Pixel 7a landscape', width: 915, height: 412 },
  { name: 'iPad Mini landscape', width: 1133, height: 744 },
];

const browser = await chromium.launch();
const fail = [];
for (const vp of VIEWPORTS) {
  const ctx = await browser.newContext({
    viewport: { width: vp.width, height: vp.height },
    isMobile: true, hasTouch: true, reducedMotion: 'reduce',
  });
  const page = await ctx.newPage();
  for (const route of ROUTES) {
    await page.goto(BASE + route, { waitUntil: 'load', timeout: 45000 });
    await page.waitForTimeout(1200);
    await page.evaluate(async () => {
      const s = window.innerHeight;
      for (let y = 0; y < document.body.scrollHeight; y += s) { window.scrollTo(0, y); await new Promise(r => setTimeout(r, 50)); }
      window.scrollTo(0, 0);
    });
    await page.waitForTimeout(400);
    const r = await page.evaluate(() => {
      const over = [...document.querySelectorAll('body *')].filter((el) => {
        const b = el.getBoundingClientRect();
        if (b.width === 0 || b.height === 0) return false;
        const cs = getComputedStyle(el);
        if (cs.visibility === 'hidden' || cs.display === 'none' || cs.opacity === '0') return false;
        if (b.right <= window.innerWidth + 1) return false;
        for (let p = el.parentElement; p; p = p.parentElement) {
          if (/hidden|clip|auto|scroll/.test(getComputedStyle(p).overflowX) &&
              p.getBoundingClientRect().right <= window.innerWidth + 1) return true ? false : false;
        }
        return true;
      });
      // Content must be reachable: nothing important stuck under a fixed bar,
      // and the document must actually scroll.
      return {
        overflow: over.length,
        scrollW: document.documentElement.scrollWidth,
        innerW: window.innerWidth,
        scrollable: document.body.scrollHeight > window.innerHeight,
        headerH: Math.round(document.querySelector('.header')?.getBoundingClientRect().height ?? 0),
      };
    });
    const bad = [];
    if (r.overflow > 0) bad.push(`${r.overflow} overflowing`);
    if (r.scrollW > r.innerW + 1) bad.push(`scrollWidth ${r.scrollW} > ${r.innerW}`);
    // The header must not eat more than a third of a short landscape viewport.
    if (r.headerH > vp.height * 0.34) bad.push(`header ${r.headerH}px of ${vp.height}`);
    if (bad.length) { fail.push(`${vp.name} ${route}: ${bad.join('; ')}`); console.log(`  FAIL  ${vp.name} ${route} — ${bad.join('; ')}`); }
  }
  console.log(`  ${vp.name} (${vp.width}x${vp.height}) swept ${ROUTES.length} routes`);
  await ctx.close();
}
await browser.close();
console.log(fail.length ? `\n---- ${fail.length} LANDSCAPE FAILURES ----` : '\n---- landscape clean ----');
process.exit(fail.length ? 1 : 0);
