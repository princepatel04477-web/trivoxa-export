"use client";

import { useTranslations } from "next-intl";
import { gsap, ScrollTrigger } from "@/lib/gsap";
import { useIsomorphicLayoutEffect } from "@/lib/use-isomorphic-layout-effect";
import { Link } from "@/i18n/navigation";
import { onPreloaderDone, emit } from "@/lib/site-events";
import { TitleChars, PChars } from "@/lib/split-text";
import GrainGlobe from "@/components/hero/GrainGlobe";

export default function HeroSection() {
  const t = useTranslations("home.hero");
  // Layout effect, not useEffect: this pins .hp-sec-1 (see
  // use-isomorphic-layout-effect.ts for why pinning requires it).
  useIsomorphicLayoutEffect(() => {
    const ctx = gsap.context(() => {
      const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      const tl = gsap.timeline({ paused: true });

      tl.fromTo(".header", {}, { y: 0, duration: 2.4, ease: "power2.out" });
      tl.fromTo(".hp-sec-1 .scroll-to .line > div", {}, { width: "100%", duration: 2.4 }, "<");
      tl.fromTo(".hp-sec-1 .scroll-to .text", {}, { opacity: 1, duration: 2.4 }, "<");
      tl.fromTo(".scroll-wrapper", {}, { opacity: 1, y: 0, duration: 2.4 }, "<");
      tl.fromTo(".hp-sec-1 h1", {}, { scale: 1, duration: 3.2, ease: "power2.out" }, "<");
      tl.fromTo(
        ".hp-sec-1 .word_inner",
        {},
        { opacity: 1, stagger: 0.05, filter: "blur(0px)", delay: 0.4, ease: "power1.in" },
        "<"
      );
      tl.fromTo(".hp-sec-1 .p_inner", {}, { opacity: 1, stagger: 0.025, ease: "power1.in" }, "<");

      const unsub = onPreloaderDone(() => {
        // The hero's resting state lives at the END of this timeline (headline
        // scale, scroll-cue width, wrapper opacity all animate INTO place), so
        // reduced motion cannot simply skip it — the hero would stay blank.
        // Jump straight to the resolved frame instead: same final composition,
        // no travel.
        if (reducedMotion) tl.progress(1);
        else tl.play();
      });

      // Both scroll-driven effects below are built through gsap.matchMedia
      // rather than a one-shot `window.innerWidth` test. The imperative form is
      // evaluated once at mount, so a handset that started in landscape kept a
      // pinned 120%-tall hero after rotating to portrait — and a pin is the one
      // thing that must never outlive the width it was measured for.
      // matchMedia also reverts cleanly, which is what §5.3 asks for on
      // orientation change.
      const mm = gsap.matchMedia();

      // Scroll-scrubbed cue fade — not built at all under reduced motion, per
      // the rule that no motion may be bound to the scroll position. The cue
      // itself is display:none below the sm rung (hero.css), so there is
      // nothing to fade there either.
      mm.add("(prefers-reduced-motion: no-preference) and (min-width: 430px)", () => {
        gsap.fromTo(
          ".hp-sec-1 .scroll-to",
          {},
          {
            opacity: 0,
            scrollTrigger: {
              trigger: ".hp-about",
              scrub: true,
              end: "top center",
            },
          }
        );
      });

      // The hero pin holds the section for an extra 120% of viewport height
      // while the copy fades out under the thumb. On a phone that is 120% of
      // scroll spent going nowhere, on top of a document already past 14,000px
      // — so it is a desktop-and-tablet device only (§5.1, §5.5: nothing
      // animating that the user did not scroll to).
      mm.add("(prefers-reduced-motion: no-preference) and (min-width: 768px)", () => {
        gsap
          .timeline({
            scrollTrigger: {
              trigger: ".hp-sec-1",
              start: "top top",
              end: "+=120%",
              pin: true,
              scrub: 1,
            },
          })
          .to(".hp-sec-1 .hero-tagline", { opacity: 0, y: -80, ease: "none" }, 0)
          .to(".hp-sec-1 .grain-globe", { scale: 1.15, ease: "none" }, 0)
          .to(".hp-sec-1 .title-anim, .hp-sec-1 .subtitle, .hp-sec-1 .hero-cta", { opacity: 0, ease: "none" }, 0.7);
      });

      ScrollTrigger.refresh();
      return unsub;
    });

    return () => ctx.revert();
  }, []);

  return (
    <section className="hp-sec-1">
      <GrainGlobe />
      <div className="container">
        <div className="hero-tagline p-anim">
          <span>
            <PChars text={t("eyebrow")} />
          </span>
        </div>
        <h1 className="title-anim">
          <TitleChars text={t("title")} />
        </h1>
        <div className="subtitle p-anim">
          <PChars text={t("subtitle")} />
        </div>
        <div className="hero-cta d-flex">
          <button className="primary-button" type="button" onClick={() => emit("modal:open")}>
            <span>{t("ctaQuote")}</span>
          </button>
          <Link className="ghost-button" href="/businesses/">
            <span>{t("ctaProfile")}</span>
          </Link>
        </div>
      </div>
      <div className="scroll-to">
        <div className="line">
          <div />
        </div>
        <div className="text">scroll to learn more</div>
      </div>
    </section>
  );
}
