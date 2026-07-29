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
  const tickerRef = useRef<HTMLDivElement>(null);

  // §5.1 — the ticker may stay: it is ambient, not navigational. But it is an
  // infinite animation, and for most of a 14,000px document it is nowhere near
  // the viewport. A compositor-only transform is cheap, not free — it still
  // costs a composited layer kept alive and a frame committed for every tick,
  // which on a phone is heat spent on something nobody is looking at.
  //
  // The class is toggled rather than the style written directly so the paused
  // state stays declarative and inspectable in CSS.
  useEffect(() => {
    const el = tickerRef.current;
    if (!el || typeof IntersectionObserver === "undefined") return;

    const io = new IntersectionObserver(
      ([entry]) => el.classList.toggle("is-offscreen", !entry.isIntersecting),
      // A little margin so it is already running by the time it is looked at,
      // rather than visibly starting from a standstill at the edge.
      { rootMargin: "120px 0px" }
    );
    io.observe(el);

    // A backgrounded tab should not be animating at all — same reasoning as
    // the canvas suspension in Phase 1.
    const onVisibility = () =>
      el.classList.toggle("is-hidden-doc", document.visibilityState === "hidden");
    document.addEventListener("visibilitychange", onVisibility);
    onVisibility();

    return () => {
      io.disconnect();
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, []);

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

      <div className="ticker" ref={tickerRef}>
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
