import { chromium } from 'playwright';

// §7 — navigation and conversion chrome, measured on the built site.
const BASE = process.env.BASE || 'http://localhost:3123';
const fail = [];
const ok = (c, m) => { console.log(`${c ? '  PASS' : '  FAIL'}  ${m}`); if (!c) fail.push(m); };

const browser = await chromium.launch();
const ctx = await browser.newContext({
  viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true,
});
const page = await ctx.newPage();

// ---------- §7.1 drawer ----------
console.log('\n[§7.1] drawer');
await page.goto(BASE + '/', { waitUntil: 'load', timeout: 45000 });
await page.waitForTimeout(2500);

// Scroll down so the lock has a non-zero offset to preserve, then back up a
// little — §7.3 hides the header on scroll-down, so reaching the trigger at all
// means scrolling up, which is exactly what a reader does.
await page.evaluate(() => window.scrollTo(0, 1900));
await page.waitForTimeout(700);
await page.evaluate(() => window.scrollTo(0, 1800));
await page.waitForTimeout(900);
const beforeY = await page.evaluate(() => window.scrollY);
const triggerReachable = await page.evaluate(() => {
  const r = document.querySelector('.hamburger').getBoundingClientRect();
  return r.top >= 0 && r.bottom <= window.innerHeight;
});
ok(triggerReachable, 'trigger returns on scroll-up (§7.3)');

await page.click('.hamburger');
await page.waitForTimeout(600);

const opened = await page.evaluate(() => {
  const nav = document.querySelector('.mobile-nav');
  const rows = [...document.querySelectorAll('.mobile-nav .nav__content > ul > li > a, .mobile-nav .nav__content > ul > li > button')];
  return {
    navActive: document.body.classList.contains('nav-active'),
    bodyPosition: getComputedStyle(document.body).position,
    bodyTop: document.body.style.top,
    inert: nav?.hasAttribute('inert'),
    minRow: Math.min(...rows.map((r) => Math.round(r.getBoundingClientRect().height))),
    rowCount: rows.length,
    focusInside: !!document.activeElement?.closest('.mobile-nav'),
    historyDepth: history.length,
  };
});
ok(opened.navActive, 'drawer opens on the trigger');
ok(opened.bodyPosition === 'fixed', `background scroll locked via position:fixed (got ${opened.bodyPosition})`);
ok(opened.bodyTop === `-${beforeY}px`, `scroll offset captured (${opened.bodyTop} for scrollY ${beforeY})`);
ok(!opened.inert, 'open drawer is not inert');
ok(opened.minRow >= 48, `drawer rows >= 48px (min ${opened.minRow} across ${opened.rowCount})`);
ok(opened.focusInside, 'focus moves into the drawer');

// The page behind must not have moved.
const lockedScroll = await page.evaluate(() => {
  window.scrollTo(0, 0); // an attempt the lock should make irrelevant
  return document.body.style.top;
});
ok(lockedScroll === `-${beforeY}px`, 'offset survives a scroll attempt while open');

// §7.1 — hardware back closes the drawer.
await page.goBack();
await page.waitForTimeout(700);
const afterBack = await page.evaluate(() => ({
  navActive: document.body.classList.contains('nav-active'),
  bodyPosition: getComputedStyle(document.body).position,
  y: window.scrollY,
  path: location.pathname,
}));
ok(!afterBack.navActive, 'hardware back closes the drawer');
ok(afterBack.bodyPosition !== 'fixed', 'scroll lock released on close');
ok(Math.abs(afterBack.y - beforeY) < 4, `scroll position restored (${afterBack.y} vs ${beforeY})`);
ok(afterBack.path === '/', 'back closed the drawer rather than navigating away');

// ---------- §7.2 persistent quote affordance ----------
console.log('\n[§7.2] quote affordance');
await page.goto(BASE + '/', { waitUntil: 'load', timeout: 45000 });
await page.waitForTimeout(2200);
const atTop = await page.evaluate(() => !!document.querySelector('.mobile-sticky-cta'));
ok(!atTop, 'hidden over the hero');

await page.evaluate(() => window.scrollTo(0, window.innerHeight * 1.2));
await page.waitForTimeout(900);
const shown = await page.evaluate(() => {
  const bar = document.querySelector('.mobile-sticky-cta');
  const link = bar?.querySelector('a');
  const x = bar?.querySelector('.mobile-sticky-cta__dismiss');
  const r = link?.getBoundingClientRect();
  const xr = x?.getBoundingClientRect();
  return {
    present: !!bar,
    label: link?.textContent?.trim(),
    ctaH: r ? Math.round(r.height) : 0,
    dismiss: xr ? `${Math.round(xr.width)}x${Math.round(xr.height)}` : null,
    padded: document.documentElement.classList.contains('has-sticky-cta'),
    inThumbZone: r ? r.top > window.innerHeight * 0.45 : false,
  };
});
ok(shown.present, 'appears once the hero has left');
ok(shown.label === 'Request a Quote', `wording matches the CTA vocabulary ("${shown.label}")`);
ok(shown.ctaH >= 44, `CTA height >= 44px (${shown.ctaH})`);
ok(shown.dismiss === '44x44', `dismiss control is 44x44 (${shown.dismiss})`);
ok(shown.padded, 'page padding class applied while visible');
ok(shown.inThumbZone, 'sits in the bottom half of the screen');

const footerPad = await page.evaluate(() => {
  const f = document.querySelector('.footer');
  return f ? parseFloat(getComputedStyle(f).paddingBottom) : -1;
});
ok(footerPad >= 78, `footer clears the bar (padding-bottom ${footerPad}px)`);

await page.click('.mobile-sticky-cta__dismiss');
await page.waitForTimeout(500);
const afterDismiss = await page.evaluate(() => ({
  present: !!document.querySelector('.mobile-sticky-cta'),
  padded: document.documentElement.classList.contains('has-sticky-cta'),
  footerPad: parseFloat(getComputedStyle(document.querySelector('.footer')).paddingBottom),
}));
ok(!afterDismiss.present, 'dismisses');
ok(!afterDismiss.padded, 'padding removed with the bar');
ok(afterDismiss.footerPad < 78, `footer padding released (${afterDismiss.footerPad}px)`);

// …and stays dismissed across a route change.
await page.goto(BASE + '/group/', { waitUntil: 'load', timeout: 45000 });
await page.waitForTimeout(2000);
await page.evaluate(() => window.scrollTo(0, window.innerHeight * 1.5));
await page.waitForTimeout(800);
const nextRoute = await page.evaluate(() => !!document.querySelector('.mobile-sticky-cta'));
ok(!nextRoute, 'stays dismissed for the session');

// ---------- §7.3 header ----------
console.log('\n[§7.3] header');
await page.goto(BASE + '/', { waitUntil: 'load', timeout: 45000 });
await page.waitForTimeout(2200);
const headerTop = await page.evaluate(() => Math.round(document.querySelector('.header').getBoundingClientRect().height));
await page.evaluate(() => window.scrollTo(0, 2400));
await page.waitForTimeout(900);
const headerScrolled = await page.evaluate(() => {
  const h = document.querySelector('.header');
  return { condensed: h.classList.contains('header--scrolled'), h: Math.round(h.getBoundingClientRect().height) };
});
ok(headerScrolled.condensed, 'condenses on scroll');
ok(headerScrolled.h <= headerTop, `height does not grow when condensed (${headerTop} -> ${headerScrolled.h})`);

// ---------- §7.4 form ----------
console.log('\n[§7.4] quote form');
await page.goto(BASE + '/rfq/', { waitUntil: 'load', timeout: 45000 });
await page.waitForTimeout(2200);
// Enter the product path if the chooser is showing.
const chooser = await page.$('.rfq-path-card');
if (chooser) { await chooser.click(); await page.waitForTimeout(900); }

const fields = await page.evaluate(() => {
  const out = [];
  for (const el of document.querySelectorAll('.rfq-field input, .rfq-field select, .rfq-field textarea')) {
    const r = el.getBoundingClientRect();
    const label = el.closest('.rfq-field')?.querySelector('.rfq-field__label')?.textContent?.trim();
    out.push({
      label,
      fontSize: parseFloat(getComputedStyle(el).fontSize),
      h: Math.round(r.height),
      autocomplete: el.getAttribute('autocomplete'),
      inputmode: el.getAttribute('inputmode'),
      type: el.getAttribute('type'),
      hasLabel: !!label,
    });
  }
  const grid = document.querySelector('.rfq-grid');
  return { fields: out, gridCols: grid ? getComputedStyle(grid).gridTemplateColumns : null };
});
ok(fields.fields.length > 0, `found ${fields.fields.length} fields`);
ok(fields.fields.every((f) => f.fontSize >= 16), `every control >= 16px (min ${Math.min(...fields.fields.map((f) => f.fontSize))})`);
ok(fields.fields.every((f) => f.hasLabel), 'every field has a persistent visible label');
ok((fields.gridCols || '').split(' ').length === 1, `single column at 390px (${fields.gridCols})`);
const named = fields.fields.filter((f) => /Company Name|Contact Name|Business Email|Country of Import/.test(f.label || ''));
ok(named.length > 0 && named.every((f) => f.autocomplete), `identity fields carry autocomplete (${named.map((f) => f.autocomplete).join(', ')})`);

// Blur validation, not per-keystroke.
const email = await page.$('.rfq-field input[type="email"]');
if (email) {
  await email.click();
  await email.type('not-an-email');
  await page.waitForTimeout(400);
  const during = await page.evaluate(() => document.querySelectorAll('.rfq-field__error').length);
  await page.evaluate(() => document.activeElement.blur());
  await page.waitForTimeout(500);
  const after = await page.evaluate(() => document.querySelectorAll('.rfq-field__error').length);
  ok(during === 0, `silent while typing (${during} errors shown)`);
  ok(after > 0, `validates on blur (${after} error shown)`);

  // …and withdraws the complaint once fixed.
  await email.click();
  await page.evaluate(() => { const e = document.querySelector('.rfq-field input[type="email"]'); e.value=''; });
  await email.fill('buyer@example.com');
  await page.evaluate(() => document.activeElement.blur());
  await page.waitForTimeout(500);
  const fixed = await page.evaluate(() => document.querySelectorAll('.rfq-field__error').length);
  ok(fixed === 0, `error cleared once corrected (${fixed} remaining)`);
}

const actions = await page.evaluate(() => {
  const btns = [...document.querySelectorAll('.rfq-actions .tvx-btn')];
  const cs = document.querySelector('.rfq-actions') ? getComputedStyle(document.querySelector('.rfq-actions')) : null;
  return {
    dir: cs?.flexDirection,
    sizes: btns.map((b) => `${Math.round(b.getBoundingClientRect().width)}x${Math.round(b.getBoundingClientRect().height)}`),
    minH: btns.length ? Math.min(...btns.map((b) => Math.round(b.getBoundingClientRect().height))) : 0,
  };
});
ok(actions.dir === 'column-reverse', `actions stack on mobile (${actions.dir})`);
ok(actions.minH >= 52, `action buttons >= 52px tall (${actions.sizes.join(', ')})`);

await browser.close();
console.log(fail.length ? `\n---- ${fail.length} FAILURES ----` : '\n---- all chrome checks pass ----');
process.exit(fail.length ? 1 : 0);
