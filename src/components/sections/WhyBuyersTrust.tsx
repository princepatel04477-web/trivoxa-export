"use client";

import { useEffect, useRef } from "react";
import { useTranslations } from "next-intl";
import { gsap } from "@/lib/gsap";
import { prefersReducedMotion } from "@/hooks/useScrollAnimations";
import { Link } from "@/i18n/navigation";

const PILLAR_KEYS = ["p1", "p2", "p3", "p4"] as const;

export default function WhyBuyersTrust() {
  const t = useTranslations("home.trust");
  const PILLARS = PILLAR_KEYS.map((k) => ({
    title: t(`${k}Title`),
    body: t(`${k}Body`),
  }));
  const ref = useRef<HTMLElement>(null);

  useEffect(() => {
    if (!ref.current) return;
    // See previews.tsx — `.home-reveal` resolves visible in CSS under reduced
    // motion, so no tween and no trigger are created here.
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

  return (
    <section className="home-sec hp-trust" ref={ref}>
      <div className="container">
        <div className="head-col">
          <div className="home-eyebrow home-reveal">{t("eyebrow")}</div>
          <h2 className="home-heading home-reveal">{t("heading")}</h2>
        </div>
        <div className="trust-grid">
          {PILLARS.map((p) => (
            <div className="trust-card home-reveal" key={p.title}>
              <h3 className="trust-card__title">{p.title}</h3>
              <p className="trust-card__body">{p.body}</p>
            </div>
          ))}
        </div>
        <div className="home-cta home-reveal">
          <Link className="btn-gold" href="/businesses/product-exports/">
            {t("cta")}
          </Link>
        </div>
      </div>
    </section>
  );
}
