"use client";

import { useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { gsap, ScrollTrigger } from "@/lib/gsap";
import { DURATION, EASE, STAGGER } from "@/lib/motion";
import {
  prefersReducedMotion,
  revealChars,
  revealHeadings,
  revealLines,
  revertSplits,
} from "@/hooks/useScrollAnimations";
import { useIsomorphicLayoutEffect } from "@/lib/use-isomorphic-layout-effect";
import { taxonomy, featuredTaxonomy } from "@/lib/data/taxonomy";

const TOTAL = String(featuredTaxonomy.length).padStart(2, "0");

/**
 * Industries — a sticky index, scroll-driven.
 *
 * This replaced a pinned horizontal carousel. The carousel had to hijack the
 * scroll wheel to work: it pinned the page, converted vertical scroll into
 * horizontal travel, and snapped between panels, so a reader could not skim past
 * it at their own pace and the section owned the viewport until it was done.
 *
 * INTERACTION MODEL: scroll-driven, IntersectionObserver-style. Nothing here is
 * click-driven. The index on the left is sticky; each industry's panel scrolls
 * past it normally, and whichever panel is crossing the reading line marks
 * itself active. Scroll direction and speed stay the reader's.
 *
 * The index is still clickable as an affordance for keyboard and pointer users,
 * but clicking is a shortcut to a scroll position, not the mechanism.
 */
export default function IndustriesManifest() {
  const t = useTranslations("home.industries");
  const tm = useTranslations("megaMenu");
  // Which industries appear and in what order comes from taxonomy.ts
  // (PTO-02) — only the translated copy is looked up per-locale here.
  const INDUSTRIES = featuredTaxonomy.map((entry) => ({
    name: entry.megaMenuKey ? tm(entry.megaMenuKey) : entry.displayName,
    desc: entry.homeDescKey ? t(entry.homeDescKey) : entry.shortDescription,
    image: entry.image ?? "/images/industries/textile-editorial.webp",
  }));

  const sectionRef = useRef<HTMLElement>(null);
  const panelRefs = useRef<(HTMLDivElement | null)[]>([]);
  const [active, setActive] = useState(0);

  useIsomorphicLayoutEffect(() => {
    if (!sectionRef.current) return;
    const reduced = prefersReducedMotion();

    const ctx = gsap.context(() => {
      // The title is handled by revealChars (per-glyph) and the eyebrow by the
      // standard rise. They must not both drive the title or the two tweens
      // fight over opacity and it flickers.
      const head = ".industries-index__eyebrow";
      // Each industry's NAME reveals line by line out of a mask and its
      // description line by line as a fade-rise (see useScrollAnimations). Run
      // in both branches: under reduced motion these release the elements from
      // their hidden CSS state rather than animating them, and skipping the
      // call would leave every industry name at opacity 0 forever.
      revealHeadings(sectionRef.current!);
      revealLines(sectionRef.current!);
      if (reduced) {
        gsap.set(".industries-index__eyebrow, .industries-index__title", { opacity: 1, y: 0 });
        gsap.set(".industries-index__panel", { opacity: 1, y: 0 });
        return;
      }

      revealChars(sectionRef.current!);

      gsap.to(head, {
        opacity: 1,
        y: 0,
        duration: DURATION.standard,
        ease: EASE.entry,
        stagger: STAGGER,
        scrollTrigger: { trigger: sectionRef.current, start: "top 78%", invalidateOnRefresh: true },
      });

      panelRefs.current.forEach((panel, i) => {
        if (!panel) return;

        // Entrance. Each panel rises into place on its own trigger — no pin, so
        // the reader's scroll is never captured.
        gsap.to(panel.querySelectorAll(".industries-index__reveal"), {
          opacity: 1,
          y: 0,
          duration: DURATION.standard,
          ease: EASE.entry,
          stagger: STAGGER,
          scrollTrigger: { trigger: panel, start: "top 80%", invalidateOnRefresh: true },
        });

        // The hairline wipes open left→right as the panel arrives, which is what
        // gives the list its rhythm — the rule draws, then the copy lands.
        gsap.to(panel.querySelector(".industries-index__rule"), {
          scaleX: 1,
          duration: DURATION.long,
          ease: EASE.entry,
          scrollTrigger: { trigger: panel, start: "top 80%", invalidateOnRefresh: true },
        });

        // Active tracking. A band across the middle of the viewport is the
        // reading line; whichever panel is crossing it owns the index.
        ScrollTrigger.create({
          trigger: panel,
          start: "top 55%",
          end: "bottom 45%",
          invalidateOnRefresh: true,
          onToggle: (self) => {
            if (self.isActive) setActive(i);
          },
        });
      });

      ScrollTrigger.refresh();
    }, sectionRef);

    return () => {
      ctx.revert();
      // SplitText rewrites the DOM; gsap.context() only reverts tweens.
      revertSplits();
    };
  }, []);

  const goTo = (i: number) => {
    const panel = panelRefs.current[i];
    if (!panel) return;
    panel.scrollIntoView({
      behavior: prefersReducedMotion() ? "auto" : "smooth",
      block: "center",
    });
  };

  return (
    <section className="hp-sec-2 industries-index" ref={sectionRef}>
      <div className="industries-index__head container">
        <span className="industries-index__eyebrow">{t("eyebrow")}</span>
        <h2 className="industries-index__title" data-reveal-chars>
          {t("heading")}
        </h2>
      </div>

      <div className="industries-index__body container">
        {/* Sticky index. aria-hidden: it duplicates the headings below for
            sighted navigation, and a screen reader should meet each industry
            once, in the panel itself. */}
        <nav className="industries-index__rail" aria-hidden="true">
          <ol className="industries-index__list">
            {INDUSTRIES.map((ind, i) => (
              <li
                key={ind.name}
                className={
                  "industries-index__item" +
                  (i === active ? " is-active" : "")
                }
              >
                <button type="button" tabIndex={-1} onClick={() => goTo(i)}>
                  <span className="industries-index__num">{String(i + 1).padStart(2, "0")}</span>
                  <span className="industries-index__label">{ind.name}</span>
                </button>
              </li>
            ))}
          </ol>
          <div className="industries-index__count">
            <span>{String(active + 1).padStart(2, "0")}</span> / {TOTAL}
          </div>
        </nav>

        <div className="industries-index__panels">
          {INDUSTRIES.map((ind, i) => (
            <div
              className={
                "industries-index__panel" + (i === active ? " is-active" : "")
              }
              key={ind.name}
              ref={(el) => {
                panelRefs.current[i] = el;
              }}
            >
              <span className="industries-index__rule" aria-hidden="true" />
              <div className="industries-index__text">
                <span className="industries-index__index industries-index__reveal">
                  {String(i + 1).padStart(2, "0")}
                </span>
                {/* Off the block `__reveal` group deliberately: these two now own
                    their own per-line reveals, and two tweens on one element's
                    opacity is a fight whose winner is whichever the reader
                    happens to see. */}
                <h3 className="industries-index__name" data-reveal-heading>{ind.name}</h3>
                <p className="industries-index__desc" data-reveal-lines>{ind.desc}</p>
              </div>
              <div
                className="industries-index__image industries-index__reveal"
                style={{ backgroundImage: `url(${ind.image})` }}
                role="img"
                aria-label={ind.name}
              />
            </div>
          ))}
        </div>
      </div>

      <div className="industries-index__viewall container">
        <Link href="/industries/" className="btn-ghost">
          {t("viewAll", { count: taxonomy.length })} →
        </Link>
      </div>
    </section>
  );
}
