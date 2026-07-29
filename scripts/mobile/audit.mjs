import { chromium } from 'playwright';

const BASE = process.env.BASE || 'http://localhost:3123';
const ROUTES = [
  '/', '/about', '/businesses', '/businesses/product-exports',
  '/businesses/product-exports/textile-apparel',
  '/businesses/product-exports/textile-apparel/fabrics',
  '/businesses/service-exports', '/careers', '/compliance', '/contact',
  '/global-presence', '/group', '/industries', '/insights', '/rfq', '/thank-you',
];
const WIDTHS = (process.env.WIDTHS || '360,390,430').split(',').map(Number);
const ONLY = process.env.ONLY;

const audit = () => {
  const out = { overflow: [], tap: [], text: [] };

  // §8.3 — anything whose box extends past the viewport's right edge.
  for (const el of document.querySelectorAll('body *')) {
    const r = el.getBoundingClientRect();
    if (r.width === 0 || r.height === 0) continue;
    if (r.right > window.innerWidth + 1 || r.left < -1) {
      const cs = getComputedStyle(el);
      if (cs.visibility === 'hidden' || cs.display === 'none' || cs.opacity === '0') continue;
      // Ignore boxes that a scrolling/clipping ancestor genuinely contains.
      let clipped = false;
      for (let p = el.parentElement; p; p = p.parentElement) {
        const pc = getComputedStyle(p);
        if (/hidden|clip|auto|scroll/.test(pc.overflowX)) {
          const pr = p.getBoundingClientRect();
          if (pr.right <= window.innerWidth + 1) { clipped = true; break; }
        }
      }
      if (clipped) continue;
      out.overflow.push({
        tag: el.tagName.toLowerCase(),
        cls: (el.className && el.className.baseVal !== undefined ? el.className.baseVal : el.className || '').toString().slice(0, 60),
        right: Math.round(r.right), w: Math.round(r.width),
      });
    }
  }

  // §6.2 — every interactive element gets a 44x44 hit area.
  const SEL = 'a[href], button, [role="button"], input:not([type=hidden]), select, textarea, summary, [tabindex]:not([tabindex="-1"])';
  for (const el of document.querySelectorAll(SEL)) {
    const cs = getComputedStyle(el);
    if (cs.visibility === 'hidden' || cs.display === 'none') continue;
    if (el.closest('[aria-hidden="true"]')) continue;
    let r = el.getBoundingClientRect();
    if (r.width === 0 || r.height === 0) continue;
    if (cs.opacity === '0') continue;
    // A checkbox/radio inside (or bound to) a label is tappable across the
    // WHOLE label, so the label's box is the honest hit area to measure.
    if (el.tagName === 'INPUT' && (el.type === 'checkbox' || el.type === 'radio')) {
      const lab = el.closest('label') ||
        (el.id && document.querySelector(`label[for="${CSS.escape(el.id)}"]`));
      if (lab) r = lab.getBoundingClientRect();
    }
    // A pseudo-element or padded ancestor may carry the real target.
    let h = r.height, w = r.width;
    for (const pseudo of ['::before', '::after']) {
      const ps = getComputedStyle(el, pseudo);
      if (ps.content && ps.content !== 'none' && ps.position === 'absolute') {
        const ph = parseFloat(ps.height), pw = parseFloat(ps.width);
        if (!Number.isNaN(ph)) h = Math.max(h, ph);
        if (!Number.isNaN(pw)) w = Math.max(w, pw);
      }
    }
    if (h < 44 || w < 44) {
      const path = [];
      for (let p = el; p && p !== document.body && path.length < 4; p = p.parentElement) {
        const c = (p.className || '').toString().trim().split(/\s+/)[0];
        path.unshift(p.tagName.toLowerCase() + (c ? '.' + c : ''));
      }
      out.tap.push({
        tag: el.tagName.toLowerCase(),
        cls: path.join('>').slice(0, 90),
        txt: (el.textContent || '').trim().slice(0, 24),
        h: Math.round(h), w: Math.round(w),
      });
    }
  }

  // §6.1 — nothing renders below 13px.
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  const seen = new Set();
  let n;
  while ((n = walker.nextNode())) {
    const t = n.textContent.trim();
    if (!t) continue;
    const el = n.parentElement;
    if (!el || seen.has(el)) continue;
    seen.add(el);
    const cs = getComputedStyle(el);
    if (cs.visibility === 'hidden' || cs.display === 'none' || cs.opacity === '0') continue;
    if (!el.getClientRects().length) continue;
    const size = parseFloat(cs.fontSize);
    if (size < 12.995) {
      out.text.push({
        cls: (el.className || '').toString().slice(0, 50),
        size: Math.round(size * 100) / 100,
        txt: t.slice(0, 24),
      });
    }
  }
  return out;
};

const browser = await chromium.launch();
const totals = { overflow: 0, tap: 0, text: 0 };
const detail = [];
for (const w of WIDTHS) {
  const ctx = await browser.newContext({
    viewport: { width: w, height: 844 },
    deviceScaleFactor: 2,
    isMobile: true,
    hasTouch: true,
    reducedMotion: process.env.MOTION === 'on' ? 'no-preference' : 'reduce',
    userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1',
  });
  const page = await ctx.newPage();
  for (const route of ROUTES.filter((r) => !ONLY || r === ONLY)) {
    try {
      await page.goto(BASE + route, { waitUntil: 'load', timeout: 45000 });
      await page.waitForTimeout(1200);
      // Reveal animations gate content; drive the page so triggers fire.
      await page.evaluate(async () => {
        const step = window.innerHeight;
        for (let y = 0; y < document.body.scrollHeight; y += step) {
          window.scrollTo(0, y);
          await new Promise((r) => setTimeout(r, 60));
        }
        window.scrollTo(0, 0);
      });
      await page.waitForTimeout(600);
      const res = await page.evaluate(audit);

      totals.overflow += res.overflow.length;
      totals.tap += res.tap.length;
      totals.text += res.text.length;
      if (res.overflow.length || res.tap.length || res.text.length) {
        detail.push({ w, route, ...res });
      }
    } catch (e) {
      detail.push({ w, route, error: String(e).slice(0, 160) });
    }
  }
  await ctx.close();
}
await browser.close();

for (const d of detail) {
  console.log(`\n=== ${d.route} @ ${d.w}px`);
  if (d.error) { console.log('  ERROR ' + d.error); continue; }
  for (const o of d.overflow) console.log(`  OVERFLOW right=${o.right} w=${o.w} <${o.tag} class="${o.cls}">`);
  const tapAgg = {};
  for (const t of d.tap) {
    const k = `${t.w}x${t.h}  ${t.cls}`;
    tapAgg[k] = (tapAgg[k] || 0) + 1;
  }
  for (const [k, c] of Object.entries(tapAgg)) console.log(`  TAP  x${c}  ${k}`);
  const txtAgg = {};
  for (const t of d.text) {
    const k = `${t.size}px  .${t.cls}  "${t.txt}"`;
    txtAgg[k] = (txtAgg[k] || 0) + 1;
  }
  for (const [k, c] of Object.entries(txtAgg)) console.log(`  TEXT x${c}  ${k}`);
}
console.log('\n---- TOTALS ----');
console.log('overflow elements:', totals.overflow);
console.log('tap targets under 44px:', totals.tap);
console.log('text under 13px:', totals.text);
