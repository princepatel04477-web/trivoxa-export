"use client";

import { useEffect, useRef } from "react";
import { useTranslations } from "next-intl";
import { gsap } from "@/lib/gsap";
import { initSectionReveals } from "@/hooks/useScrollAnimations";

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
    return () => ctx.revert();
  }, []);

  const [featured, ...rest] = ARTICLES;

  return (
    <section className="hp-insights insights-magazine" ref={ref}>
      <div className="container">
        <div className="insights-head">
          <div>
            <div className="home-eyebrow" data-reveal-body>{t("eyebrow")}</div>
            <h2 className="home-heading" data-reveal-heading>{t("heading")}</h2>
          </div>
          <p className="home-lead" data-reveal-body>
            Markets evolve. Industries transform. Our insights explore global trade, sourcing
            strategies, emerging industries, and business innovation to help organizations make
            informed decisions.
          </p>
        </div>

        {/* Article bodies don't exist yet — each card is a non-interactive
            preview (not a link to itself) rather than a dead link to the
            listing page, and is labelled accordingly. */}
        <div className="magazine-grid" data-reveal-body>
          <div className="magazine-feature magazine-feature--pending">
            <div className="magazine-feature__image" data-reveal-image />
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
