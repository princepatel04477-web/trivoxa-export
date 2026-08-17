"use client";

import { usePathname } from "next/navigation";
import { gsap, ScrollTrigger } from "@/lib/gsap";
import { DURATION, EASE, STAGGER } from "@/lib/motion";
import { prefersReducedMotion } from "@/hooks/useScrollAnimations";
import { useIsomorphicLayoutEffect } from "@/lib/use-isomorphic-layout-effect";

/**
 * Scroll reveal for every section that never asked for one.
 *
 * The site already had a reveal vocabulary — `[data-reveal-*]` (hooks/
 * useScrollAnimations) and `.home-reveal` (the home sections) — but only about a
 * dozen components ever adopted it. Everything built from the shared primitives
 * (PageHero, Section, EditorialPanel, CtaBand, the industry/product/service page
 * bodies) carried no reveal markup at all, so those pages arrived fully formed:
 * the page transition lifted its panel and the whole route was simply THERE,
 * finished, with only the panel itself having moved.
 *
 * This closes that gap without asking every page to be re-authored. It reads the
 * DOM after mount, picks the content atoms nobody else is animating, and gives
 * them the same fade-and-rise the tagged elements get — same duration, same
 * curve, same stagger, all from lib/motion.
 *
 * WHAT IT WILL NOT TOUCH, and why each exclusion exists:
 *
 *  - anything already animated. `[data-reveal-*]`, `.home-reveal`, and the two
 *    section-owned cases (`.industries-index`, `.ticker-track`) are all driven
 *    by their own component. Two tweens on one element's opacity is a fight,
 *    and the loser is whichever one the reader happens to see.
 *  - Framer Motion subtrees. Framer writes `opacity`/`transform` inline from its
 *    `initial` prop, on the server as well as the client, so an inline value on
 *    any ancestor is the reliable tell — no import of Framer needed to detect it.
 *  - pinned and sticky subtrees. A transform on an ancestor of a pinned element
 *    changes what `position: fixed` is measured against, which is how a pin
 *    silently drifts. Detected from computed style, plus `data-no-reveal` on the
 *    two components that pin before this runs (the home hero, the horizontal
 *    timeline).
 *  - chrome. Header, nav, footer, canvases, the transition panel, the preloader.
 *
 * Reduced motion: nothing is hidden and no trigger is created — not a shortened
 * animation, an absent one.
 */

/**
 * The content atoms. Deliberately leaf-ish: revealing a whole card container
 * would move its shadow and border as one block, where revealing the heading and
 * the paragraph inside it reads as the card composing itself.
 */
const ATOMS = [
  "h1",
  "h2",
  "h3",
  "h4",
  "h5",
  "h6",
  "p",
  "li",
  "blockquote",
  "figure",
  "picture",
  "img",
  "table",
  ".tvx-eyebrow",
  ".home-eyebrow",
  ".tvx-crumb",
  ".tvx-actions",
].join(",");

/** Elements that already own their motion — never re-animated from here. */
const MANAGED = [
  "[data-reveal-heading]",
  "[data-reveal-body]",
  "[data-reveal-image]",
  "[data-reveal-chars]",
  // Per-line splits. Listed for the same reason as the others — but note that
  // `revealHeadings`/`revealLines` REMOVE their attribute the moment they take
  // ownership, so an element already claimed by them no longer matches here.
  // That is deliberate and it is why the split classes are listed too: after
  // the split the element carries `.tvx-line-mask`/split children instead, and
  // an outside tween on its opacity would fight the per-line tween.
  "[data-reveal-lines]",
  "[data-split]",
  ".word_mask",
  ".p_mask",
  ".home-reveal",
  ".industries-index",
  ".ticker-track",
].join(",");

/**
 * Page chrome and opted-out subtrees.
 *
 * `.footer` earns its place next to the `footer` tag: SiteFooter is authored as
 * `<section className="footer">`, so the element selector alone misses it
 * entirely and the whole footer — locations, link columns, the tagline — reads
 * as ordinary page content to the scan below.
 */
const OUTSIDE = [
  "header",
  "footer",
  ".footer",
  "nav",
  "canvas",
  "[data-no-reveal]",
  ".tvx-transition",
  ".preloader",
].join(",");

/** Tags that are worth revealing even with no text of their own. */
const MEDIA = new Set(["IMG", "PICTURE", "FIGURE", "TABLE"]);

/** Travel and trigger point, matched to `revealBody` so the two read as one system. */
const RISE_PX = 22;
const START = "top 88%";

/**
 * Walks from `el` up to (and including) `stop`, looking for the two conditions
 * that make an element unsafe to animate from the outside: a Framer-managed
 * ancestor (inline opacity/transform) and a pinned or sticky one.
 */
function hasUnsafeAncestor(el: HTMLElement, stop: HTMLElement): boolean {
  let node: HTMLElement | null = el;
  while (node) {
    if (node.style.opacity !== "" || node.style.transform !== "") return true;
    const position = getComputedStyle(node).position;
    if (position === "sticky" || position === "fixed") return true;
    if (node === stop) return false;
    node = node.parentElement;
  }
  return false;
}

export default function AutoReveal() {
  const pathname = usePathname();

  // Layout effect, so the hidden state is written before the browser paints the
  // first hydrated frame rather than a frame or two into it.
  useIsomorphicLayoutEffect(() => {
    if (prefersReducedMotion()) return;

    const picked: HTMLElement[] = [];
    for (const section of Array.from(document.querySelectorAll<HTMLElement>("section"))) {
      if (section.closest(OUTSIDE) || section.closest(MANAGED)) continue;
      for (const el of Array.from(section.querySelectorAll<HTMLElement>(ATOMS))) {
        if (el.closest(OUTSIDE) || el.closest(MANAGED)) continue;
        // A container whose CHILD is managed would animate the child twice —
        // once as part of this block, once by whoever owns it.
        if (el.querySelector(MANAGED)) continue;
        if (!MEDIA.has(el.tagName) && !el.textContent?.trim()) continue;
        if (hasUnsafeAncestor(el, section)) continue;
        // Only the outermost atom of any nest: a `p` inside a picked `li` rides
        // with the `li` instead of being staggered separately inside it.
        if (picked.some((p) => p.contains(el))) continue;
        picked.push(el);
      }
    }
    if (!picked.length) return;

    // Split BEFORE anything is hidden, so these are honest layout positions.
    // Atoms already on screen have no scroll event coming to reveal them — they
    // are the arrival, and they play at once. Everything else waits for its own
    // trigger.
    const fold = window.innerHeight * 0.88;
    const onArrival: HTMLElement[] = [];
    const onScroll: HTMLElement[] = [];
    for (const el of picked) {
      (el.getBoundingClientRect().top < fold ? onArrival : onScroll).push(el);
    }

    const tweens: gsap.core.Tween[] = [];
    const reveal = (targets: HTMLElement[], delay = 0) =>
      gsap.to(targets, {
        opacity: 1,
        y: 0,
        duration: DURATION.standard,
        ease: EASE.entry,
        delay,
        // A fixed total window rather than a per-element delay, so a section of
        // four paragraphs and one of twenty resolve in the same time.
        stagger: { amount: Math.min(0.7, targets.length * STAGGER) },
        overwrite: "auto",
        // Inline opacity/transform left behind would outrank any CSS state the
        // element takes afterwards (a hover dim, a Framer handoff) forever.
        clearProps: "opacity,transform",
      });

    gsap.set(picked, { opacity: 0, y: RISE_PX });
    picked.forEach((el) => el.setAttribute("data-auto-reveal", ""));

    if (onArrival.length) {
      // A beat behind the page transition's cover panel, which travels for
      // TRANSITION.reveal — revealing underneath it spends the animation where
      // nobody can see it, and arriving on a finished page is the exact
      // complaint this component exists to answer.
      tweens.push(reveal(onArrival, 0.25));
    }

    // `batch` forwards every var it is given to each ScrollTrigger it creates,
    // but its published type lists only the subset it interprets itself — so
    // `invalidateOnRefresh`, a plain ScrollTrigger property, has to be widened
    // in rather than cast away.
    const batchVars: Parameters<typeof ScrollTrigger.batch>[1] & { invalidateOnRefresh?: boolean } = {
      start: START,
      once: true,
      // Positions are measured from live layout, and this page keeps moving
      // after they are taken: fonts swap, images land, pinned sections insert
      // their spacers. Without this the start stays frozen at first-paint
      // geometry, and an element whose stored trigger point ends up past the
      // document's end never fires at all — it is left hidden, permanently,
      // which is a far worse failure than an animation firing slightly early.
      invalidateOnRefresh: true,
      onEnter: (elements) => {
        tweens.push(reveal(elements as HTMLElement[]));
      },
    };
    const batch = ScrollTrigger.batch(onScroll, batchVars);
    // The atoms were just hidden, which for a fade-and-rise changes no layout —
    // but the triggers were created against whatever geometry existed at mount,
    // and this page's own scenes refresh repeatedly as they settle. Take the
    // measurement once more, now, rather than inheriting a half-settled one.
    ScrollTrigger.refresh();

    return () => {
      batch.forEach((trigger) => trigger.kill());
      tweens.forEach((tween) => tween.kill());
      gsap.set(picked, { clearProps: "opacity,transform" });
      picked.forEach((el) => el.removeAttribute("data-auto-reveal"));
    };
  }, [pathname]);

  return null;
}
