"use client";

import { gsap } from "@/lib/gsap";
import { DURATION, EASE, STAGGER, STAGGER_CHAR } from "@/lib/motion";

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

/** Headings: clipPath masked reveal, inset 0 0 100% 0 -> 0 0 0 0, 0.9s, triggered at 80% viewport. */
export function revealHeadings(scope: Element, selector = "[data-reveal-heading]") {
  if (prefersReducedMotion()) {
    gsap.utils.toArray<HTMLElement>(selector, scope).forEach((el) => releaseReveal(el, "data-reveal-heading"));
    return;
  }
  gsap.utils.toArray<HTMLElement>(selector, scope).forEach((el) => {
    gsap.fromTo(
      el,
      { clipPath: "inset(0 0 100% 0)" },
      {
        clipPath: "inset(0 0 0% 0)",
        // Task 5 — establishment motion discipline: slower, ease-out, restrained.
        duration: DURATION.standard,
        ease: REVEAL_EASE,
        onComplete: () => releaseReveal(el, "data-reveal-heading"),
        scrollTrigger: { trigger: el, start: "top 80%", invalidateOnRefresh: true },
      }
    );
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
  // Opt-in, so this is a no-op on every section that has not asked for it.
  revealChars(scope);
}

/* Operation Midnight Navy · Phase 2 — the scroll-velocity skewY on display
   headings (formerly useVelocitySkew, mounted site-wide) was removed per client
   rejection of text tilt. No rotation/skew of any axis remains in text reveals;
   the reveal choreography above (clip-path headings, fade-rise body, scale
   images) is intentionally preserved and tilt-free. */
