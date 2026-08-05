"use client";

import { useEffect, useRef } from "react";
import { gsap } from "@/lib/gsap";
import { DURATION, EASE, PERIOD } from "@/lib/motion";
import { Logo } from "@/components/brand/Logo";

export type CraneVariant = "loader" | "hero" | "success" | "subtle";

/**
 * The single site-wide crane animation (spec §2). One component, four
 * behaviors — no scattered one-off animations:
 *
 * - `loader`  — page/route transition: the crane hoists the Trivoxa logo.
 * - `hero`    — idle ambient motion for hero sections.
 * - `success` — plays once: the crane delivers a container (RFQ/contact sent).
 * - `subtle`  — low-opacity background accent, barely-moving.
 *
 * Pure inline SVG + GSAP (both already in the bundle — no Lottie, no
 * Three.js). Honors prefers-reduced-motion with a static frame. Tweens only
 * touch transforms/attributes — the DOM tree is never restructured, so this
 * is safe to unmount mid-navigation.
 */
export default function Crane({
  variant,
  className,
  onComplete,
}: {
  variant: CraneVariant;
  className?: string;
  onComplete?: () => void;
}) {
  const rootRef = useRef<SVGSVGElement>(null);
  const trolleyRef = useRef<SVGGElement>(null);
  const cableRef = useRef<SVGLineElement>(null);
  const loadRef = useRef<SVGGElement>(null);
  const logoRef = useRef<SVGGElement>(null);

  useEffect(() => {
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const trolley = trolleyRef.current;
    const cable = cableRef.current;
    const load = loadRef.current;
    const logo = logoRef.current;
    if (!trolley || !cable || !load) return;

    /** Hoist depth: cable y2 and load y track together. */
    const setHoist = (depth: number) => {
      cable.setAttribute("y2", String(depth));
      gsap.set(load, { y: depth });
      if (logo) gsap.set(logo, { y: depth });
    };

    if (reduced) {
      // Static, meaningful frame per variant — no motion at all.
      setHoist(variant === "success" ? 150 : 90);
      gsap.set(trolley, { x: variant === "success" ? 120 : 40 });
      if (variant === "success") onComplete?.();
      return;
    }

    const ctx = gsap.context(() => {
      if (variant === "hero" || variant === "subtle") {
        const drift = variant === "subtle" ? 22 : 55;
        const dur = variant === "subtle" ? PERIOD.craneSubtle : PERIOD.craneHero;
        setHoist(90);
        const tl = gsap.timeline({ repeat: -1, yoyo: true, defaults: { ease: EASE.ambient } });
        tl.fromTo(trolley, { x: 10 }, { x: 10 + drift, duration: dur });
        // Load bobs gently against the trolley drift.
        gsap.to(load, {
          rotation: 1.6,
          transformOrigin: "50% 0%",
          duration: PERIOD.craneBob,
          repeat: -1,
          yoyo: true,
          ease: EASE.ambient,
        });
        const hoist = { d: 90 };
        gsap.to(hoist, {
          d: 104,
          duration: PERIOD.craneHoist,
          repeat: -1,
          yoyo: true,
          ease: EASE.ambient,
          onUpdate: () => setHoist(hoist.d),
        });
      }

      if (variant === "loader") {
        // The crane lifts the logo plate from the quay to the boom.
        setHoist(170);
        gsap.set(trolley, { x: 40 });
        const hoist = { d: 170 };
        const tl = gsap.timeline({ repeat: -1, repeatDelay: 0.6 });
        tl.to(hoist, {
          d: 60,
          duration: DURATION.standard,
          ease: EASE.ambient,
          onUpdate: () => setHoist(hoist.d),
        })
          .to(trolley, { x: 120, duration: DURATION.standard, ease: EASE.ambient }, "-=0.3")
          .to(hoist, {
            d: 96,
            duration: DURATION.standard,
            ease: EASE.entry,
            onUpdate: () => setHoist(hoist.d),
          })
          .to(trolley, { x: 40, duration: DURATION.standard, ease: EASE.ambient, delay: 0.4 })
          .to(hoist, {
            d: 170,
            duration: DURATION.standard,
            ease: EASE.ambient,
            onUpdate: () => setHoist(hoist.d),
          });
      }

      if (variant === "success") {
        // One-shot delivery: trolley carries the container out and sets it down.
        setHoist(70);
        gsap.set(trolley, { x: 10 });
        gsap.set(load, { opacity: 1 });
        const hoist = { d: 70 };
        const tl = gsap.timeline({
          onComplete: () => onComplete?.(),
        });
        tl.to(trolley, { x: 120, duration: DURATION.standard, ease: EASE.ambient })
          .to(hoist, {
            d: 152,
            duration: DURATION.standard,
            ease: EASE.ambient,
            onUpdate: () => setHoist(hoist.d),
          })
          // Release: cable retracts, container stays on the quay.
          .set(load, { attr: { "data-delivered": "true" } })
          .to(
            hoist,
            {
              d: 40,
              duration: DURATION.standard,
              ease: EASE.exit,
              onUpdate: () => {
                cable.setAttribute("y2", String(hoist.d));
              },
            },
            "+=0.25"
          )
          .to(trolley, { x: 30, duration: DURATION.standard, ease: EASE.ambient }, "-=0.4");
      }
    }, rootRef);

    return () => ctx.revert();
  }, [variant, onComplete]);

  return (
    <svg
      ref={rootRef}
      className={`crane crane--${variant}${className ? ` ${className}` : ""}`}
      viewBox="0 0 420 320"
      fill="none"
      role="img"
      aria-label="Port crane"
      aria-hidden={variant === "subtle" ? true : undefined}
    >
      {/* Quay + rails */}
      <line className="crane__stroke" x1="8" y1="300" x2="412" y2="300" />
      <line className="crane__stroke crane__stroke--faint" x1="150" y1="308" x2="412" y2="308" />

      {/* Gantry legs */}
      <path className="crane__stroke" d="M190 300 L214 96 M262 300 L246 96" />
      <path className="crane__stroke crane__stroke--faint" d="M198 236 L256 236 M204 180 L252 180" />
      {/* Wheels */}
      <circle className="crane__stroke" cx="190" cy="294" r="6" />
      <circle className="crane__stroke" cx="262" cy="294" r="6" />

      {/* Boom over the water + machinery house */}
      <line className="crane__stroke" x1="20" y1="96" x2="404" y2="96" />
      <rect className="crane__stroke" x="300" y="76" width="52" height="20" rx="2" />
      {/* Pylon + tie ropes */}
      <path className="crane__stroke" d="M262 96 L286 34 L310 96" />
      <line className="crane__stroke crane__stroke--faint" x1="286" y1="34" x2="24" y2="92" />
      <line className="crane__stroke crane__stroke--faint" x1="286" y1="34" x2="400" y2="92" />

      {/* Trolley + hoist (GSAP moves the group on x, cable/load on y) */}
      <g ref={trolleyRef}>
        <rect className="crane__stroke" x="30" y="88" width="26" height="12" rx="2" />
        <line ref={cableRef} className="crane__stroke" x1="43" y1="100" x2="43" y2="90" />
        {/* Container — the loader variant hoists the logo plate instead */}
        <g ref={loadRef} className="crane__load" style={variant === "loader" ? { display: "none" } : undefined}>
          <rect className="crane__stroke crane__container" x="20" y="0" width="46" height="26" rx="2" />
          <path
            className="crane__stroke crane__stroke--faint"
            d="M29 0 V26 M38 0 V26 M47 0 V26 M56 0 V26"
          />
          {/* Spreader bar */}
          <line className="crane__stroke" x1="20" y1="-4" x2="66" y2="-4" />
        </g>
        {/* Logo plate — only rendered/visible for the loader variant */}
        {variant === "loader" && (
          <g ref={logoRef} className="crane__logo-plate">
            <rect className="crane__stroke crane__container" x="8" y="0" width="70" height="30" rx="3" />
            <Logo
              variant="full"
              tone="dark"
              decorative
              x={14}
              y={6}
              width={58}
              height={18}
              preserveAspectRatio="xMidYMid meet"
            />
          </g>
        )}
      </g>
    </svg>
  );
}
