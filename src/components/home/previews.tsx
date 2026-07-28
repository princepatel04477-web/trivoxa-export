"use client";

import { useEffect, useRef } from "react";
import { useTranslations } from "next-intl";
import { gsap } from "@/lib/gsap";
import { prefersReducedMotion } from "@/hooks/useScrollAnimations";
import { emit } from "@/lib/site-events";
import { Link } from "@/i18n/navigation";

/** Fade + rise every `.home-reveal` inside a section when it scrolls into view. */
function useReveal<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  useEffect(() => {
    if (!ref.current) return;
    // Reduced motion: the stylesheet already resolves `.home-reveal` to its
    // visible state, so the tween is not merely shortened — it is never
    // created, and no ScrollTrigger is registered for it.
    if (prefersReducedMotion()) return;
    const ctx = gsap.context(() => {
      gsap.to(".home-reveal", {
        opacity: 1,
        y: 0,
        duration: 0.9,
        ease: "power3.out",
        stagger: 0.09,
        scrollTrigger: { trigger: ref.current, start: "top 78%" },
      });
    }, ref);
    return () => ctx.revert();
  }, []);
  return ref;
}

export function AboutPreview() {
  const ref = useReveal<HTMLElement>();
  const t = useTranslations("home.about");
  return (
    <section className="home-sec hp-about" ref={ref}>
      <div className="container">
        <div className="about-grid">
          <div className="head-col">
            <div className="home-eyebrow home-reveal">{t("eyebrow")}</div>
            <h2 className="home-heading home-reveal">{t("heading")}</h2>
          </div>
          <div className="lead-col">
            <p className="home-lead home-reveal">{t("p1")}</p>
            <p className="home-lead home-reveal">{t("p2")}</p>
            <p className="home-lead home-reveal">{t("p3")}</p>
            <div className="home-cta home-reveal">
              <Link className="btn-gold" href="/group/">
                {t("cta")}
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

export function CareersPreview() {
  const ref = useReveal<HTMLElement>();
  const t = useTranslations("home.careers");
  return (
    <section className="home-sec hp-careers" ref={ref}>
      <div className="container">
        <div className="text-col">
          <div className="home-eyebrow home-reveal">{t("eyebrow")}</div>
          <h2 className="home-heading home-reveal">{t("heading")}</h2>
          <p className="home-lead home-reveal">{t("p1")}</p>
          <p className="home-lead home-reveal">{t("p2")}</p>
          <div className="home-cta home-reveal">
            <Link className="btn-gold" href="/careers/">
              {t("cta")}
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}

export function FinalCta() {
  const ref = useReveal<HTMLElement>();
  const t = useTranslations("home.finalCta");
  return (
    <section className="home-sec hp-cta" ref={ref}>
      <div className="container">
        <div className="home-eyebrow home-reveal">{t("eyebrow")}</div>
        <h2 className="home-heading home-reveal">{t("heading")}</h2>
        <p className="home-lead home-reveal">{t("lead")}</p>
        <div className="home-cta home-reveal">
          <button className="btn-gold" type="button" onClick={() => emit("modal:open")}>
            {t("ctaQuote")}
          </button>
          <Link className="btn-ghost" href="/contact/">
            {t("ctaPartner")}
          </Link>
          <Link className="btn-ghost" href="/contact/">
            {t("ctaContact")}
          </Link>
        </div>
      </div>
    </section>
  );
}
