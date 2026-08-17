"use client";

import { useTranslations } from "next-intl";
import { gsap, ScrollTrigger } from "@/lib/gsap";
import { DURATION, EASE, SCRUB, STAGGER_CHAR } from "@/lib/motion";
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

      tl.fromTo(".header", {}, { y: 0, duration: DURATION.long, ease: EASE.entry });
      tl.fromTo(
        ".hp-sec-1 .scroll-to .line > div",
        {},
        { width: "100%", duration: DURATION.long, ease: EASE.entry },
        "<"
      );
      tl.fromTo(
        ".hp-sec-1 .scroll-to .text",
        {},
        { opacity: 1, duration: DURATION.long, ease: EASE.entry },
        "<"
      );
      tl.fromTo(
        ".scroll-wrapper",
        {},
        { opacity: 1, y: 0, duration: DURATION.long, ease: EASE.entry },
        "<"
      );
      tl.fromTo(".hp-sec-1 h1", {}, { scale: 1, duration: DURATION.long, ease: EASE.entry }, "<");
      // THE headline reveal.
      //
      // Was: opacity 0→1 plus a 6px blur dissolve, on the exit curve, staggered
      // per glyph. That is a fade wearing a stagger — the glyphs never travel,
      // so the cascade reads as a flicker across the line rather than as the
      // headline assembling. Now each glyph rises out from behind its own
      // word's mask (see .word_mask in globals.css) on the emphatic curve,
      // which covers most of its distance immediately and then settles.
      //
      // `stagger: { amount }` rather than a per-glyph delay: a fixed total
      // window means a nine-word headline and a four-word one resolve in the
      // same time and read as one system. STAGGER_CHAR still sets the ceiling,
      // so a very short headline keeps its per-glyph rhythm rather than
      // collapsing to a near-simultaneous pop.
      //
      // `fromTo`, not `to`. The rest state is authored here rather than in CSS
      // because GSAP resolves a CSS percentage translate into its pixel `y`
      // channel — so a `to({ yPercent: 0 })` against a CSS `translateY(120%)`
      // zeroes a channel that was never carrying the offset, and the glyphs
      // fade in still displaced. The travel has one owner.
      const chars = gsap.utils.toArray<HTMLElement>(".hp-sec-1 .word_inner");
      tl.fromTo(
        chars,
        { yPercent: 120, opacity: 0 },
        {
          yPercent: 0,
          opacity: 1,
          delay: 0.4,
          duration: DURATION.standard,
          ease: EASE.emphatic,
          stagger: { amount: Math.min(0.5, chars.length * STAGGER_CHAR) },
          // Several hundred permanently promoted layers is real memory for a
          // 0.8s effect; the hint has done its job once the glyphs are at rest.
          onComplete: () => chars.forEach((c) => (c.style.willChange = "auto")),
        },
        "<"
      );
      const lead = gsap.utils.toArray<HTMLElement>(".hp-sec-1 .p_inner");
      tl.fromTo(
        lead,
        { yPercent: 110, opacity: 0 },
        {
          yPercent: 0,
          opacity: 1,
          duration: DURATION.standard,
          ease: EASE.emphatic,
          stagger: { amount: Math.min(0.5, lead.length * STAGGER_CHAR) },
          onComplete: () => lead.forEach((c) => (c.style.willChange = "auto")),
        },
        "<"
      );

      const unsub = onPreloaderDone(() => {
        // The hero's resting state lives at the END of this timeline (headline
        // scale, scroll-cue width, wrapper opacity all animate INTO place), so
        // reduced motion cannot simply skip it — the hero would stay blank.
        // Jump straight to the resolved frame instead: same final composition,
        // no travel.
        if (reducedMotion) tl.progress(1);
        else tl.play();
      });

      // Scroll-scrubbed cue fade — disabled outright under reduced motion, per
      // the rule that no motion may be bound to the scroll position.
      if (!reducedMotion && window.innerWidth > 575) {
        gsap.fromTo(
          ".hp-sec-1 .scroll-to",
          {},
          {
            opacity: 0,
            ease: EASE.scrub,
            scrollTrigger: {
              trigger: ".hp-about",
              scrub: SCRUB,
              end: "top center",
              invalidateOnRefresh: true,
            },
          }
        );
      }

      if (!reducedMotion && window.innerWidth > 767) {
        gsap
          .timeline({
            scrollTrigger: {
              trigger: ".hp-sec-1",
              start: "top top",
              // +=120% is a percentage of the TRIGGER's own height, not a pixel
              // offset — it scales with the viewport by construction.
              end: "+=120%",
              pin: true,
              scrub: SCRUB,
              // Pins are laid out one frame ahead, so a fast scroll cannot catch
              // the pin mid-application and show a one-frame jump.
              anticipatePin: 1,
              invalidateOnRefresh: true,
            },
          })
          .to(".hp-sec-1 .hero-tagline", { opacity: 0, y: -80, ease: EASE.scrub }, 0)
          .to(".hp-sec-1 .grain-globe", { scale: 1.15, ease: EASE.scrub }, 0)
          .to(
            ".hp-sec-1 .title-anim, .hp-sec-1 .subtitle, .hp-sec-1 .hero-cta",
            { opacity: 0, ease: EASE.scrub },
            0.7
          );
      }

      ScrollTrigger.refresh();
      return unsub;
    });

    return () => ctx.revert();
  }, []);

  return (
    // data-no-reveal: this section pins and scrubs its own copy out (see the
    // timeline above), and its headline is already a per-glyph split.
    <section className="hp-sec-1" data-no-reveal>
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
