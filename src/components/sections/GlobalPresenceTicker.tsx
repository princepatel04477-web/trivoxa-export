"use client";

import { useEffect, useRef } from "react";
import { useTranslations } from "next-intl";
import { gsap, ScrollTrigger } from "@/lib/gsap";
import { DURATION, EASE } from "@/lib/motion";
import { Link } from "@/i18n/navigation";
import {
  revealHeadings,
  revealBody,
  revealLines,
  revertSplits,
  prefersReducedMotion,
} from "@/hooks/useScrollAnimations";

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
      revealLines(sectionRef.current!);
      // `.ticker-track` is opacity:0 in CSS, so under reduced motion it still
      // has to be brought up; it is set rather than tweened, and no trigger is
      // registered, so the corridor list is simply there on arrival. The
      // marquee itself is not built at all — a perpetual horizontal scroll is
      // the clearest case of motion a reader may have opted out of.
      if (prefersReducedMotion()) {
        gsap.set(".ticker-track", { opacity: 1 });
        return;
      }
      gsap.to(".ticker-track", {
        opacity: 1,
        duration: DURATION.standard,
        ease: EASE.entry,
        scrollTrigger: { trigger: sectionRef.current, start: "top 78%", invalidateOnRefresh: true },
      });

      // THE MARQUEE, moved off the CSS keyframe and onto GSAP.
      //
      // The CSS version could only be paused — `animation-play-state: paused`
      // is a hard stop, so hovering the strip yanked a moving object to a
      // standstill in one frame, which reads as a glitch rather than as a
      // response. What the interaction should say is "you're looking, so I'll
      // slow down", and that needs an eased timeScale, which CSS cannot
      // express. Same 32s period, same -50% travel over a doubled track.
      ScrollTrigger.refresh();

      const track = sectionRef.current?.querySelector<HTMLElement>(".ticker-track");
      const strip = sectionRef.current?.querySelector<HTMLElement>(".ticker");
      if (!track || !strip) return;
      {
        const loop = gsap.to(track, {
          xPercent: -50,
          duration: 32,
          ease: "none",
          repeat: -1,
        });
        // Tweening a plain object and pushing the value into timeScale, rather
        // than tweening timeScale directly: GSAP does not ease timeScale on its
        // own, and a raw assignment is the hard cut this replaces.
        const speed = { v: 1 };
        const slow = gsap.to(speed, {
          v: 0.15,
          paused: true,
          duration: DURATION.standard,
          ease: EASE.emphatic,
          onUpdate: () => loop.timeScale(speed.v),
        });
        const enter = () => slow.play();
        const leave = () => slow.reverse();
        strip.addEventListener("mouseenter", enter);
        strip.addEventListener("mouseleave", leave);
        // Registered on the context so gsap.context().revert() removes them
        // with everything else — a listener left on a detached node after a
        // route change keeps the tween alive and the node with it.
        return () => {
          strip.removeEventListener("mouseenter", enter);
          strip.removeEventListener("mouseleave", leave);
        };
      }
    }, sectionRef);
    return () => {
      ctx.revert();
      // ctx.revert() undoes tweens, not the DOM surgery SplitText performed.
      // Without this a client navigation back to home re-splits already-split
      // headings and nests the line boxes one level deeper every visit.
      revertSplits();
    };
  }, []);

  const doubled = [...CORRIDORS, ...CORRIDORS];

  return (
    <section className="hp-global presence" ref={sectionRef}>
      <div className="container">
        <div className="home-eyebrow" data-reveal-body>{t("eyebrow")}</div>
        <h2 className="home-heading" data-reveal-heading>{t("heading")}</h2>
        <p className="home-lead" data-reveal-lines>{t("lead")}</p>
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
