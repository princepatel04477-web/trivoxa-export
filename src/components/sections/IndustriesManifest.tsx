"use client";

import { useRef } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { gsap, ScrollTrigger } from "@/lib/gsap";
import { prefersReducedMotion } from "@/hooks/useScrollAnimations";
import { useIsomorphicLayoutEffect } from "@/lib/use-isomorphic-layout-effect";
import { taxonomy, featuredTaxonomy } from "@/lib/data/taxonomy";

const TOTAL = String(featuredTaxonomy.length).padStart(2, "0");

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
  const trackRef = useRef<HTMLDivElement>(null);
  const progressRef = useRef<HTMLSpanElement>(null);

  // Layout effect, not useEffect: this pins the section (see
  // use-isomorphic-layout-effect.ts for why pinning requires it).
  useIsomorphicLayoutEffect(() => {
    if (!sectionRef.current || !trackRef.current) return;

    const reduced = prefersReducedMotion();

    const ctx = gsap.context(() => {
      const head = ".industries-folio__eyebrow, .industries-folio__title";
      if (reduced) {
        gsap.set(head, { opacity: 1, y: 0 });
      } else {
        gsap.to(head, {
          opacity: 1,
          y: 0,
          duration: 0.8,
          ease: "power3.out",
          stagger: 0.06,
          scrollTrigger: { trigger: sectionRef.current, start: "top 78%" },
        });
      }

      // Under reduced motion the whole horizontal act is skipped: no pin, no
      // scrub, no snap. The stylesheet stacks the track vertically at the same
      // media condition, so all six panels are reachable by ordinary scrolling
      // — without this the carousel simply pinned and the reader could never
      // reach panels 2-6 without the scrubbed motion they opted out of.
      if (!reduced && window.innerWidth > 767) {
        const track = trackRef.current!;
        const panels = gsap.utils.toArray<HTMLElement>(".industries-folio__panel", track);

        gsap.to(track, {
          x: () => -(track.scrollWidth - window.innerWidth),
          ease: "none",
          scrollTrigger: {
            trigger: sectionRef.current,
            start: "top top",
            end: () => "+=" + (track.scrollWidth - window.innerWidth),
            scrub: 1,
            pin: true,
            invalidateOnRefresh: true,
            // Settle on whole panels so the carousel never comes to rest
            // mid-transition (which clips the active title on the left and
            // lets the next panel peek in on the right).
            snap: {
              snapTo: 1 / (panels.length - 1),
              duration: { min: 0.15, max: 0.4 },
              ease: "power1.inOut",
            },
            onUpdate: (self) => {
              const idx = Math.min(panels.length - 1, Math.floor(self.progress * panels.length));
              if (progressRef.current) progressRef.current.textContent = String(idx + 1).padStart(2, "0");
            },
          },
        });

        ScrollTrigger.refresh();
      }
    }, sectionRef);

    return () => ctx.revert();
  }, []);

  return (
    <section className="hp-sec-2 industries-folio" ref={sectionRef}>
      <div className="industries-folio__head container">
        <span className="industries-folio__eyebrow">{t("eyebrow")}</span>
        <h2 className="industries-folio__title">{t("heading")}</h2>
      </div>
      <div className="industries-folio__track" ref={trackRef}>
        {INDUSTRIES.map((ind, i) => (
          <div className="industries-folio__panel" key={ind.name}>
            <div className="industries-folio__text">
              <span className="industries-folio__index">{String(i + 1).padStart(2, "0")}</span>
              <h3 className="industries-folio__name">{ind.name}</h3>
              <p className="industries-folio__desc">{ind.desc}</p>
            </div>
            <div
              className="industries-folio__image"
              style={{ backgroundImage: `url(${ind.image})` }}
              role="img"
              aria-label={ind.name}
            />
          </div>
        ))}
      </div>
      <div className="industries-folio__progress">
        <span ref={progressRef}>01</span> / {TOTAL}
      </div>
      <div className="industries-folio__viewall container">
        <Link href="/industries/" className="btn-ghost">
          {t("viewAll", { count: taxonomy.length })} →
        </Link>
      </div>
    </section>
  );
}
