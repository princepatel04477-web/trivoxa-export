"use client";

import { useEffect, useRef } from "react";
import { useTranslations } from "next-intl";
import { gsap, ScrollTrigger } from "@/lib/gsap";
import { Link } from "@/i18n/navigation";
import { revealHeadings, revealBody, prefersReducedMotion } from "@/hooks/useScrollAnimations";

// Ticker reads as destination-market coverage, not named Indian port pairs —
// the brand no longer anchors to specific origin ports on the homepage.
const CORRIDOR_KEYS = [1, 2, 3, 4, 5] as const;

export default function GlobalPresenceTicker() {
  const t = useTranslations("home.globalPresence");
  const CORRIDORS = CORRIDOR_KEYS.map((n) => ({
    region: t(`corridor${n}Region`),
    category: t(`corridor${n}Category`),
  }));
  const sectionRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const ctx = gsap.context(() => {
      revealHeadings(sectionRef.current!);
      revealBody(sectionRef.current!);
      // Opacity only — the marquee (CSS animation) owns the track's transform.
      // `.ticker-track` is opacity:0 in CSS, so under reduced motion it still
      // has to be brought up; it is set rather than tweened, and no trigger is
      // registered, so the corridor list is simply there on arrival.
      if (prefersReducedMotion()) {
        gsap.set(".ticker-track", { opacity: 1 });
        return;
      }
      gsap.to(".ticker-track", {
        opacity: 1,
        duration: 0.8,
        ease: "power3.out",
        scrollTrigger: { trigger: sectionRef.current, start: "top 78%" },
      });
      ScrollTrigger.refresh();
    }, sectionRef);
    return () => ctx.revert();
  }, []);

  const doubled = [...CORRIDORS, ...CORRIDORS];

  return (
    <section className="hp-global presence" ref={sectionRef}>
      <div className="container">
        <div className="home-eyebrow" data-reveal-body>{t("eyebrow")}</div>
        <h2 className="home-heading" data-reveal-heading>{t("heading")}</h2>
        <p className="home-lead" data-reveal-body>{t("lead")}</p>
      </div>

      <div className="ticker">
        <div className="ticker-track">
          {doubled.map((row, i) => (
            <span className="ticker-row" key={i}>
              {row.region} · {row.category}
            </span>
          ))}
        </div>
      </div>

      <p className="ticker-disclaimer" data-reveal-body>{t("disclaimer")}</p>

      {/* Stage the particle cargo-ship morph (see particle-scene.ts, .hp-global). */}
      <div className="presence-map" aria-hidden />

      <div className="container">
        <blockquote className="presence-vision" data-reveal-body>
          <p>{t("quote")}</p>
          <cite>{t("cite")}</cite>
        </blockquote>
        <div className="home-cta" data-reveal-body>
          <Link className="btn-ghost" href="/global-presence/">
            {t("cta")}
          </Link>
        </div>
      </div>
    </section>
  );
}
