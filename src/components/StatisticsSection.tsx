"use client";

import { useEffect, useRef, useState, type FC } from "react";
import { gsap, ScrollTrigger } from "@/lib/gsap";
import { DURATION, EASE, SCRUB, STAGGER_CHAR } from "@/lib/motion";
import { usePrefersReducedMotion } from "@/hooks/usePrefersReducedMotion";
import { TitleChars } from "@/lib/split-text";

interface OdometerProps {
  from: string;
  to: string;
  prefix?: string;
  suffix: string;
  label: string;
  run: boolean;
}

const CHARS = [" ", "0", "1", "2", "3", "4", "5", "6", "7", "8", "9"];

const Odometer: FC<OdometerProps> = ({ from, to, prefix, suffix, label, run }) => {
  const maxLength = Math.max(from.length, to.length);
  const paddedFrom = from.padStart(maxLength, " ");
  const paddedTo = to.padStart(maxLength, " ");

  const currentVal = run ? paddedTo : paddedFrom;

  return (
    <div className="statistic d-flex">
      <div className="number">
        {prefix && <span>{prefix}</span>}
        <span className="odometer odometer-theme-minimal">
          {Array.from({ length: maxLength }).map((_, i) => {
            const char = currentVal[i] || " ";
            const charIndex = CHARS.indexOf(char);
            const translateY = -(charIndex >= 0 ? charIndex : 0) * (100 / CHARS.length);
            return (
              <span key={i} className="odometer-digit">
                <span className="odometer-digit-spacer">8</span>
                <span className="odometer-digit-inner">
                  <span className="odometer-ribbon">
                    <span
                      className="odometer-ribbon-inner"
                      style={{
                        transition: "transform 4s cubic-bezier(0.11, 0, 0.5, 0)",
                        transform: `translateY(${translateY}%)`,
                      }}
                    >
                      {CHARS.map((c, n) => (
                        <span key={n} className="odometer-value">
                          {c}
                        </span>
                      ))}
                    </span>
                  </span>
                </span>
              </span>
            );
          })}
        </span>
        <span>{suffix}</span>
      </div>
      <div className="text">{label}</div>
    </div>
  );
};

export default function StatisticsSection() {
  const triggered = useRef(false);
  const [run, setRun] = useState(false);
  // Reduced motion: the figures are content, not choreography — they read at
  // their final values with no scroll trigger, no roll and no scrubbed
  // parallax. Derived during render (not set from an effect) so the odometer
  // never renders the "from" value first and then jumps.
  const reduced = usePrefersReducedMotion();

  useEffect(() => {
    if (reduced) return;

    const ctx = gsap.context(() => {
      ScrollTrigger.create({
        trigger: ".hp-sec-3 .statistics",
        invalidateOnRefresh: true,
        onEnter: () => {
          if (!triggered.current) {
            triggered.current = true;
            setRun(true);
          }
        },
      });

      gsap.fromTo(
        ".hp-sec-3 h2",
        { scale: 0.94 },
        {
          scale: 1,
          duration: DURATION.long,
          ease: EASE.entry,
          scrollTrigger: { trigger: ".hp-sec-3 .statistics", invalidateOnRefresh: true },
        }
      );
      gsap.fromTo(
        ".hp-sec-3 .word_inner",
        { opacity: 0, filter: "blur(6px)" },
        {
          opacity: 1,
          filter: "blur(0px)",
          duration: DURATION.standard,
          ease: EASE.entry,
          stagger: STAGGER_CHAR,
          scrollTrigger: { trigger: ".hp-sec-3 .statistics", invalidateOnRefresh: true },
        }
      );

      if (window.innerWidth > 767) {
        gsap.fromTo(
          ".hp-sec-3 .left-text-wrapper .left-text .top",
          { x: 80 },
          {
            x: 0,
            ease: EASE.scrub,
            scrollTrigger: {
              trigger: ".hp-sec-3 .statistics",
              scrub: SCRUB,
              invalidateOnRefresh: true,
            },
          }
        );
      }

      ScrollTrigger.refresh();
    });

    return () => ctx.revert();
  }, [reduced]);

  const rolled = run || reduced;

  return (
    <section className="hp-sec-3">
      <div className="container">
        <div className="left-text-wrapper">
          <div className="left-text">
            <div className="top">
              <div className="line" />
              <div className="left-side-title">Our Reach</div>
            </div>
          </div>
        </div>
        <div className="statistics d-flex">
          <h2 className="title-anim">
            <TitleChars text="Building Trusted Partnerships Across Global Markets" />
          </h2>
          <div className="line" />
          <div className="numbers d-flex">
            <Odometer from="1" to="10" suffix=" +" label="INDUSTRIES SERVED" run={rolled} />
            <Odometer from="020" to="200" suffix=" +" label="PRODUCTS & SERVICES" run={rolled} />
            <Odometer from="1" to="6" suffix=" +" label="GLOBAL REGIONS" run={rolled} />
          </div>
        </div>
      </div>
    </section>
  );
}
