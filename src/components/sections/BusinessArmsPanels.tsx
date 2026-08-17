"use client";

import { useEffect } from "react";
import Image from "next/image";
import { useTranslations } from "next-intl";
import { gsap, ScrollTrigger } from "@/lib/gsap";
import { DURATION, EASE, STAGGER, STAGGER_CHAR } from "@/lib/motion";
import { TitleChars, PChars } from "@/lib/split-text";
import { Link } from "@/i18n/navigation";

interface Arm {
  id: string;
  index: string;
  eyebrow: string;
  title: string;
  thesis: string;
  categories: string[];
  href: string;
  cta: string;
  image: string;
  imageAlt: string;
}

export default function BusinessArmsPanels() {
  const t = useTranslations("home.businessArms");
  const tm = useTranslations("megaMenu");

  const ARMS: Arm[] = [
    {
      id: "product-exports",
      index: "01",
      eyebrow: t("arm1Eyebrow"),
      title: tm("productExports"),
      thesis: t("arm1Thesis"),
      categories: [t("cat1"), t("cat2"), t("cat3"), t("cat4"), t("cat5")],
      href: "/businesses/product-exports/",
      cta: t("arm1Cta"),
      image: "/images/businesses/product-exports-editorial.webp",
      imageAlt: "Cargo containers and export logistics at a port terminal",
    },
    {
      id: "trivoxa-digital",
      index: "02",
      eyebrow: t("arm2Eyebrow"),
      title: tm("trivoxaDigital"),
      thesis: t("arm2Thesis"),
      categories: [t("cat6"), t("cat7"), t("cat8"), t("cat9")],
      href: "/businesses/service-exports/",
      cta: t("arm2Cta"),
      image: "/images/businesses/service-exports-editorial.webp",
      imageAlt: "Technology team collaborating in a modern studio",
    },
  ];

  useEffect(() => {
    const ctx = gsap.context(() => {
      gsap.utils.toArray<HTMLElement>(".biz-arm").forEach((panel) => {
        gsap.fromTo(
          panel.querySelectorAll(".word_inner"),
          { opacity: 0, filter: "blur(6px)" },
          {
            opacity: 1,
            filter: "blur(0px)",
            duration: DURATION.standard,
            ease: EASE.entry,
            stagger: STAGGER_CHAR,
            scrollTrigger: { trigger: panel, start: "top 80%", invalidateOnRefresh: true },
          }
        );
        gsap.fromTo(
          panel.querySelectorAll(".p_inner"),
          { opacity: 0 },
          {
            opacity: 1,
            duration: DURATION.standard,
            ease: EASE.entry,
            stagger: STAGGER_CHAR,
            scrollTrigger: { trigger: panel, start: "top 80%", invalidateOnRefresh: true },
          }
        );
        gsap.fromTo(
          panel.querySelectorAll(".biz-arm__cat, .biz-arm__cta"),
          { opacity: 0, y: 16 },
          {
            opacity: 1,
            y: 0,
            duration: DURATION.standard,
            stagger: STAGGER,
            ease: EASE.entry,
            scrollTrigger: { trigger: panel, start: "top 75%", invalidateOnRefresh: true },
          }
        );
      });
      ScrollTrigger.refresh();
    });
    return () => ctx.revert();
  }, []);

  return (
    <section className="hp-sec-4 biz-arms">
      <div className="biz-arms__inner">
        {ARMS.map((arm) => (
          <article className="biz-arm" key={arm.id}>
            <div className="biz-arm__media">
              {/* fill, not width/height: .biz-arm__media already reserves a
                  16/9 box, so the browser has the layout before the bytes
                  arrive and the image contributes no shift. */}
              <Image
                src={arm.image}
                alt={arm.imageAlt}
                fill
                sizes="(max-width: 900px) 100vw, 50vw"
              />
              <span className="biz-arm__media-label">{arm.index} / 02</span>
            </div>
            <div className="biz-arm__head">
              <span className="biz-arm__eyebrow">{arm.eyebrow}</span>
              <span className="biz-arm__index" aria-hidden="true">
                {arm.index}
              </span>
            </div>
            {/* copy-scrim: local legibility. This section used to hold the
                whole particle field at 28% so its copy would read, which cost
                every other pixel on the screen its backdrop and made two
                viewports render as solid black. The field now recedes only to
                the floor (0.62) and the paragraphs that need more contrast
                than that carry their own radial scrim. */}
            <h2 className="biz-arm__title title-anim copy-scrim">
              <TitleChars text={arm.title} />
            </h2>
            <div className="biz-arm__thesis p-anim copy-scrim">
              <PChars text={arm.thesis} />
            </div>
            <ul className="biz-arm__cats" aria-label={`${arm.title} capabilities`}>
              {arm.categories.map((cat) => (
                <li className="biz-arm__cat" key={cat}>
                  {cat}
                </li>
              ))}
            </ul>
            <Link href={arm.href} className="biz-arm__cta">
              {arm.cta}
              <span aria-hidden="true">→</span>
            </Link>
          </article>
        ))}
      </div>
    </section>
  );
}
