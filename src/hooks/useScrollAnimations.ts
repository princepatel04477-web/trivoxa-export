"use client";

import { gsap, SplitText } from "@/lib/gsap";
import { DURATION, EASE, STAGGER, STAGGER_CHAR } from "@/lib/motion";

/**
 * Every SplitText instance this module has created, so a route change can
 * revert them.
 *
 * SplitText rewrites the element's DOM — the original text node is replaced by
 * a tree of line/word spans — and `revert()` is the only thing that puts it
 * back. Left un-reverted, a client navigation that re-runs a reveal splits an
 * already-split element and the second pass wraps the first pass's spans,
 * compounding on every visit until the line boxes are nested a dozen deep.
 *
 * Keyed by element so a re-split of the SAME element reverts its predecessor
 * first, which is the case a plain array misses.
 */
const splits = new WeakMap<Element, SplitText>();
const liveSplits = new Set<SplitText>();

function splitOnce(el: HTMLElement, config: SplitText.Vars): SplitText {
  const previous = splits.get(el);
  if (previous) {
    previous.revert();
    liveSplits.delete(previous);
  }
  const split = SplitText.create(el, config);
  splits.set(el, split);
  liveSplits.add(split);
  // A durable marker that this element's motion is already owned.
  //
  // The `data-reveal-*` attribute is removed the instant a reveal claims an
  // element, which is what un-hides it — but that also makes the element
  // indistinguishable from an unclaimed one to anything scanning the DOM
  // afterwards. AutoReveal scans every section after mount and would otherwise
  // pick a split heading up as an unanimated `h2` and put a second tween on its
  // opacity, and two tweens on one opacity is a fight whose winner is whichever
  // the reader happens to see.
  el.setAttribute("data-split", "");
  return split;
}

/**
 * Put every split element in this module back to plain text.
 *
 * Call from a component's cleanup (or a route-level effect) alongside
 * `ctx.revert()`. gsap.context() reverts TWEENS, not DOM surgery a plugin
 * performed, so the two are not interchangeable.
 */
export function revertSplits() {
  liveSplits.forEach((s) => {
    // `.elements` is the original target list; revert() puts each one back to
    // plain text, so the ownership marker has to come off with it.
    s.elements?.forEach((el) => el.removeAttribute("data-split"));
    s.revert();
  });
  liveSplits.clear();
}

/**
 * Signature reveal ease.
 *
 * Now the shared entry curve — cubic-bezier(0.5, 1, 0.89, 1) — registered once
 * in lib/motion.ts and identical to the CSS custom property, rather than an
 * approximation of it by a named GSAP easing.
 */
export const REVEAL_EASE = EASE.entry;

/**
 * Drops the data-reveal-* attribute and the GSAP-set inline styles once a reveal
 * finishes, so CSS rules that toggle opacity/transform afterwards (e.g. a
 * hover-dim state) aren't permanently overridden by a leftover inline style.
 */
function releaseReveal(el: HTMLElement, attr: string) {
  el.removeAttribute(attr);
  gsap.set(el, { clearProps: "opacity,transform,clipPath" });
}

/**
 * Single source of truth for the reduced-motion decision.
 *
 * Exported because every animated section needs the same answer, and each one
 * re-deriving it from `window.matchMedia` was how sections quietly shipped
 * without a fallback — the check is easy to forget when it lives nowhere.
 * SSR-safe: returns false on the server, where nothing animates anyway.
 */
export function prefersReducedMotion(): boolean {
  return typeof window !== "undefined" && window.matchMedia(REDUCED_MOTION_QUERY).matches;
}

export const REDUCED_MOTION_QUERY = "(prefers-reduced-motion: reduce)";

/**
 * Headings: a MASKED LINE reveal — each line rises out from behind its own
 * bottom edge, in sequence.
 *
 * Was a clip-path wipe on the whole block: one rectangle uncovering the entire
 * heading at once. That is a transition applied TO a heading; this is the
 * heading arriving. The difference is that a per-line reveal has internal
 * rhythm — the reader watches the sentence build — where a wipe has a single
 * front edge and nothing behind it.
 *
 * Lines, not characters. A per-glyph cascade on every `h2` across the site is
 * the register of a design studio's showreel, not of a trade group's
 * credibility promise; the hero headline is the one place that register is
 * earned, and it has it. See the §5 caution in the amplitude audit.
 *
 * `autoSplit` re-splits on a font load or a resize, which is the whole reason
 * to use the plugin here rather than the hand-rolled word splitter below it:
 * line boxes depend on font metrics and container width, so a split taken
 * before the webfont lands masks the WRONG lines and the reveal plays against
 * boundaries that no longer exist. `onSplit` re-creates the tween each time and
 * returning it lets the plugin clean the previous one up.
 *
 * `aria: "auto"` leaves the original text on the element for assistive tech, so
 * a screen reader is never handed a heading fragmented into per-line spans.
 */
export function revealHeadings(scope: Element, selector = "[data-reveal-heading]") {
  if (prefersReducedMotion()) {
    gsap.utils.toArray<HTMLElement>(selector, scope).forEach((el) => releaseReveal(el, "data-reveal-heading"));
    return;
  }
  gsap.utils.toArray<HTMLElement>(selector, scope).forEach((el) => {
    el.removeAttribute("data-reveal-heading");
    splitOnce(el, {
      type: "lines",
      mask: "lines",
      autoSplit: true,
      aria: "auto",
      onSplit: (self) =>
        gsap.from(self.lines, {
          yPercent: 100,
          duration: DURATION.standard,
          ease: EASE.emphatic,
          stagger: 0.08,
          scrollTrigger: { trigger: el, start: "top 82%", invalidateOnRefresh: true },
        }),
    });
  });
}

/**
 * Body copy: a per-LINE fade-and-rise. Opt-in via `[data-reveal-lines]`.
 *
 * Deliberately not folded into `revealBody`, which fires on a whole block.
 * A lead paragraph is the one piece of body copy a reader actually reads before
 * deciding to keep scrolling, and a line-by-line arrival gives it the same
 * internal rhythm the heading above it now has — a block fade next to a line
 * reveal reads as two systems.
 *
 * 16px of travel, not the heading's full line height: body copy that rises from
 * behind a mask reads as a title. And never characters — a per-glyph body
 * paragraph looks cheap and, more to the point, turns a paragraph into a few
 * hundred spans for assistive tech to walk.
 */
export function revealLines(scope: Element, selector = "[data-reveal-lines]") {
  const els = gsap.utils.toArray<HTMLElement>(selector, scope);
  if (!els.length) return;
  if (prefersReducedMotion()) {
    els.forEach((el) => releaseReveal(el, "data-reveal-lines"));
    return;
  }
  els.forEach((el) => {
    el.removeAttribute("data-reveal-lines");
    splitOnce(el, {
      type: "lines",
      autoSplit: true,
      aria: "auto",
      onSplit: (self) =>
        gsap.from(self.lines, {
          y: 16,
          opacity: 0,
          duration: DURATION.standard,
          ease: EASE.emphatic,
          stagger: STAGGER,
          scrollTrigger: { trigger: el, start: "top 85%", invalidateOnRefresh: true },
        }),
    });
  });
}

/** Body text: y 20 -> 0, opacity 0 -> 1, stagger 0.05 per sibling. */
export function revealBody(scope: Element, selector = "[data-reveal-body]") {
  const els = gsap.utils.toArray<HTMLElement>(selector, scope);
  if (!els.length) return;
  if (prefersReducedMotion()) {
    els.forEach((el) => releaseReveal(el, "data-reveal-body"));
    return;
  }
  gsap.fromTo(
    els,
    { y: 22, opacity: 0 },
    {
      y: 0,
      opacity: 1,
      // Task 5 — 22px travel (within 16-24px), slower, gentle ease-out.
      duration: DURATION.standard,
      ease: EASE.entry,
      stagger: STAGGER,
      onComplete: () => els.forEach((el) => releaseReveal(el, "data-reveal-body")),
      scrollTrigger: { trigger: els[0], start: "top 80%", invalidateOnRefresh: true },
    }
  );
}

/** Images: scale 1.04 -> 1, opacity 0 -> 1, 0.8s (Task 5: subtler zoom, slower). */
export function revealImages(scope: Element, selector = "[data-reveal-image]") {
  if (prefersReducedMotion()) {
    gsap.utils.toArray<HTMLElement>(selector, scope).forEach((el) => releaseReveal(el, "data-reveal-image"));
    return;
  }
  gsap.utils.toArray<HTMLElement>(selector, scope).forEach((el) => {
    gsap.fromTo(
      el,
      { scale: 1.04, opacity: 0 },
      {
        scale: 1,
        opacity: 1,
        // Task 5 — restrained: 4% zoom instead of 8%, 0.8s instead of 1.2s.
        duration: DURATION.standard,
        ease: REVEAL_EASE,
        onComplete: () => releaseReveal(el, "data-reveal-image"),
        scrollTrigger: { trigger: el, start: "top 80%", invalidateOnRefresh: true },
      }
    );
  });
}

/**
 * Per-character headline reveal — OPT-IN via `[data-reveal-chars]`.
 *
 * Deliberately not folded into `revealHeadings`. The standing motion discipline
 * in this file is restraint (clip-wipe, one duration, no per-glyph work), and
 * silently upgrading every heading on the site to a character cascade would
 * override that everywhere at once. This is the louder register, available where
 * a section is meant to be loud, and absent everywhere else.
 *
 * Splits on the CLIENT, after paint, so the server HTML stays a plain heading —
 * text stays selectable and readable to a crawler, and there is no hydration
 * mismatch. Each glyph rises out of a per-word mask, which is what makes it read
 * as emerging rather than fading.
 *
 * Idempotent: an element already split is skipped, so a re-run after a client
 * navigation cannot double-wrap it.
 */
export function revealChars(scope: Element, selector = "[data-reveal-chars]") {
  const els = gsap.utils.toArray<HTMLElement>(selector, scope);
  if (!els.length) return;

  if (prefersReducedMotion()) {
    els.forEach((el) => releaseReveal(el, "data-reveal-chars"));
    return;
  }

  els.forEach((el) => {
    if (el.dataset.charsSplit === "1") return;
    const text = el.textContent ?? "";
    if (!text.trim()) return;

    // Rebuild as word spans (the mask) containing char spans (the movers).
    // Word-level masking rather than line-level: it survives re-wrapping at any
    // width without needing a re-split on resize.
    el.textContent = "";
    const chars: HTMLElement[] = [];
    text.split(/(\s+)/).forEach((token) => {
      if (!token) return;
      if (/^\s+$/.test(token)) {
        el.appendChild(document.createTextNode(token));
        return;
      }
      const word = document.createElement("span");
      word.style.display = "inline-block";
      word.style.overflow = "hidden";
      word.style.verticalAlign = "top";
      for (const ch of token) {
        const glyph = document.createElement("span");
        glyph.style.display = "inline-block";
        glyph.style.willChange = "transform";
        glyph.textContent = ch;
        word.appendChild(glyph);
        chars.push(glyph);
      }
      el.appendChild(word);
    });
    el.dataset.charsSplit = "1";
    el.removeAttribute("data-reveal-chars");
    // The CONTAINER must be forced visible, not merely released. Sections
    // commonly park their headings at `opacity: 0` in CSS awaiting a reveal;
    // clearing inline styles (what releaseReveal does) leaves that rule in force
    // and the glyphs would then animate inside an invisible element. The
    // animation now belongs to the glyphs, so the container has to stop hiding.
    gsap.set(el, { opacity: 1, y: 0, clearProps: "clipPath" });

    gsap.fromTo(
      chars,
      { yPercent: 115, opacity: 0 },
      {
        yPercent: 0,
        opacity: 1,
        duration: DURATION.standard,
        ease: EASE.entry,
        // Fixed total window, not per-glyph delay: a long headline and a short
        // one then resolve in the same time and read as one system.
        stagger: { amount: Math.min(0.6, chars.length * STAGGER_CHAR) },
        scrollTrigger: { trigger: el, start: "top 82%", invalidateOnRefresh: true },
        onComplete: () => chars.forEach((c) => (c.style.willChange = "")),
      }
    );
  });
}

/** Runs all three standard reveals within a scope. Call inside gsap.context(). */
export function initSectionReveals(scope: Element) {
  revealHeadings(scope);
  revealBody(scope);
  revealImages(scope);
  // Both opt-in, so these are no-ops on every section that has not asked.
  revealLines(scope);
  revealChars(scope);
}

/* Operation Midnight Navy · Phase 2 — the scroll-velocity skewY on display
   headings (formerly useVelocitySkew, mounted site-wide) was removed per client
   rejection of text tilt. No rotation/skew of any axis remains in text reveals;
   the reveal choreography above (clip-path headings, fade-rise body, scale
   images) is intentionally preserved and tilt-free. */
