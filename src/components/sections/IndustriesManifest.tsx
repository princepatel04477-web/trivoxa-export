"use client";

import { useRef } from "react";
import { useTranslations } from "next-intl";
import { gsap, ScrollTrigger } from "@/lib/gsap";
import { prefersReducedMotion } from "@/hooks/useScrollAnimations";
import { useIsomorphicLayoutEffect } from "@/lib/use-isomorphic-layout-effect";

// Industry names reuse the megaMenu keys so the nav and this section always
// agree; only the descriptions are unique to the home page.
const INDUSTRY_DEFS = [
  { nameKey: "textileApparel", descKey: "descTextile", image: "/images/industries/textile-editorial.webp" },
  { nameKey: "healthcarePharma", descKey: "descHealthcare", image: "/images/industries/healthcare-editorial.webp" },
  { nameKey: "buildingMaterials", descKey: "descBuilding", image: "/images/industries/building-editorial.webp" },
  { nameKey: "agricultureFood", descKey: "descAgri", image: "/images/industries/agriculture.jpg" },
  { nameKey: "engineeringIndustrial", descKey: "descEngineering", image: "/images/industries/engineering.jpg" },
  { nameKey: null, descKey: "descTechnology", image: "/images/industries/technology.jpg" },
] as const;

const TOTAL = String(INDUSTRY_DEFS.length).padStart(2, "0");

export default function IndustriesManifest() {
  const t = useTranslations("home.industries");
  const tm = useTranslations("megaMenu");
  const INDUSTRIES = INDUSTRY_DEFS.map((d) => ({
    name: d.nameKey ? tm(d.nameKey) : t("nameTechnology"),
    desc: t(d.descKey),
    image: d.image,
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
    </section>
  );
}
