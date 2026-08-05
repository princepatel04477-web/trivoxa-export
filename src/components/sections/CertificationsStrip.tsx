"use client";

import { useEffect, useRef } from "react";
import { useTranslations } from "next-intl";
import { gsap } from "@/lib/gsap";
import { DURATION, EASE, STAGGER } from "@/lib/motion";
import { ScrollTrigger } from "@/lib/gsap";
import { prefersReducedMotion } from "@/hooks/useScrollAnimations";
import { ACTIVE_MARKS, IN_PROGRESS_MARKS, type CertMark } from "@/lib/data/certifications";

function CertBadge({ mark }: { mark: CertMark }) {
  const stateClass =
    mark.state === "active"
      ? " cert-mark--active"
      : mark.state === "in-application"
        ? " cert-mark--application"
        : " cert-mark--target";
  return (
    <div className={`cert-mark${stateClass}`}>
      <svg
        className="cert-mark__badge"
        width="72"
        height="72"
        viewBox="0 0 72 72"
        aria-hidden="true"
      >
        <circle cx="36" cy="36" r="33" fill="none" strokeWidth="1.5" />
        <text x="36" y="41" textAnchor="middle" className="cert-mark__code-text">
          {mark.code.length > 6 ? mark.code.slice(0, 2).toUpperCase() : mark.code}
        </text>
      </svg>
      <span className="cert-mark__code">{mark.code}</span>
      <span className="cert-mark__name">{mark.name}</span>
      <span className="cert-mark__status">{mark.detail}</span>
    </div>
  );
}

/** Full certifications grid for the dedicated /compliance page — active
 * credentials presented prominently first, pending ones grouped separately
 * underneath so the page never reads as "not yet certified" at a glance. */
export default function CertificationsStrip() {
  const t = useTranslations("compliance");
  const sectionRef = useRef<HTMLElement>(null);

  useEffect(() => {
    if (!sectionRef.current) return;
    // Compliance marks are the page's substance, not decoration — under reduced
    // motion they are simply present. No fromTo, so they are never driven to
    // opacity 0 in the first place.
    if (prefersReducedMotion()) return;
    const ctx = gsap.context(() => {
      gsap.fromTo(
        ".cert-mark",
        { opacity: 0, y: 16 },
        {
          opacity: 1,
          y: 0,
          stagger: STAGGER,
          duration: DURATION.standard,
          ease: EASE.entry,
          scrollTrigger: { trigger: sectionRef.current, start: "top 78%", invalidateOnRefresh: true },
        }
      );
    }, sectionRef);
    ScrollTrigger.refresh();
    return () => ctx.revert();
  }, []);

  return (
    <section className="certifications-strip" ref={sectionRef}>
      <div className="container">
        <div className="certifications-strip__group">
          <h3 className="certifications-strip__group-title">{t("active")}</h3>
          <div className="certifications-strip__row">
            {ACTIVE_MARKS.map((mark) => (
              <CertBadge key={mark.code} mark={mark} />
            ))}
          </div>
        </div>
        <div className="certifications-strip__group">
          <h3 className="certifications-strip__group-title">{t("inProgress")}</h3>
          <div className="certifications-strip__row">
            {IN_PROGRESS_MARKS.map((mark) => (
              <CertBadge key={mark.code} mark={mark} />
            ))}
          </div>
        </div>
        <p className="certifications-strip__footnote">{t("footnote")}</p>
      </div>
    </section>
  );
}
