"use client";

import { useEffect, useRef } from "react";
import { useTranslations } from "next-intl";
import { gsap } from "@/lib/gsap";
import { initSectionReveals, revertSplits } from "@/hooks/useScrollAnimations";

const ARTICLES = [
  {
    tag: "Export Guide",
    title: "A Practical Guide to Sourcing from India with Confidence",
    dek: "What international buyers should know before their first shipment leaves an Indian port.",
  },
  {
    tag: "Market Intelligence",
    title: "Reading Global Demand: Where Opportunity Is Moving Next",
    dek: "A look at the trade corridors and categories seeing the fastest growth this year.",
  },
  {
    tag: "Industry Insights",
    title: "Building Supply Chains That Endure Beyond a Single Order",
    dek: "Why long-term sourcing relationships outperform one-off transactional deals.",
  },
];

export default function InsightsMagazine() {
  const t = useTranslations("home.insights");
  const ref = useRef<HTMLElement>(null);

  useEffect(() => {
    if (!ref.current) return;
    const ctx = gsap.context(() => {
      initSectionReveals(ref.current!);
    }, ref);
    return () => {
      ctx.revert();
      // SplitText rewrites the DOM; gsap.context() only reverts tweens.
      revertSplits();
    };
  }, []);

  const [featured, ...rest] = ARTICLES;

  return (
    <section className="hp-insights insights-magazine" ref={ref}>
      <div className="container">
        {/* copy-scrim: the field is parked to the RIGHT through this stretch
            of the page (the .hp-global beat's sweep, held through .hp-values)
            and this section's copy runs full width, so the globe sits directly
            behind the article column. The answer is a local scrim, not another
            global dim — see the note on FIELD_OPACITY_FLOOR in lib/motion. */}
        <div className="insights-head copy-scrim">
          <div>
            <div className="home-eyebrow" data-reveal-body>{t("eyebrow")}</div>
            <h2 className="home-heading" data-reveal-heading>{t("heading")}</h2>
          </div>
          <p className="home-lead" data-reveal-lines>
            Markets evolve. Industries transform. Our insights explore global trade, sourcing
            strategies, emerging industries, and business innovation to help organizations make
            informed decisions.
          </p>
        </div>

        {/* Article bodies don't exist yet — each card is a non-interactive
            preview (not a link to itself) rather than a dead link to the
            listing page, and is labelled accordingly. */}
        <div className="magazine-grid copy-scrim" data-reveal-body>
          <div className="magazine-feature magazine-feature--pending">
            {/* An empty <div className="magazine-feature__image"/> sat here. The
                class is a 16/9 box with a gradient fill and nothing inside, so
                it painted a blank panel above a card that already says "Coming
                soon" — two separate ways of announcing the same absence, one of
                which looks like a broken image. The card's own copy does the
                job. */}
            <span className="magazine-feature__tag">{featured.tag}</span>
            <h3 className="magazine-feature__title">{featured.title}</h3>
            <p className="magazine-feature__dek">{featured.dek}</p>
            <span className="magazine-feature__pending">Coming soon</span>
          </div>
          <div className="magazine-secondary">
            {rest.map((a) => (
              <div className="magazine-secondary__item magazine-secondary__item--pending" key={a.tag}>
                <span className="magazine-secondary__tag">{a.tag}</span>
                <h4 className="magazine-secondary__title">{a.title}</h4>
                <p className="magazine-secondary__dek">{a.dek}</p>
                <span className="magazine-secondary__pending">Coming soon</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
