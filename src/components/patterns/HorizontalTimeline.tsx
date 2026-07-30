"use client";

import { useRef, useState } from "react";
import { gsap, ScrollTrigger } from "@/lib/gsap";
import { useIsomorphicLayoutEffect } from "@/lib/use-isomorphic-layout-effect";

export interface TimelineStep {
  title: string;
  description: string;
}

/** Horizontal process timeline. Desktop: the section pins and the rail of
 * nodes translates on x as the user scrolls; whichever node is nearest
 * center is "active" (dot scales up, title turns champagne, rest dim).
 * Mobile / reduced-motion: a plain vertical list, no pin. */
export default function HorizontalTimeline({ steps }: { steps: TimelineStep[] }) {
  const ref = useRef<HTMLDivElement>(null);
  const railRef = useRef<HTMLOListElement>(null);
  const [active, setActive] = useState(0);

  // Layout effect, not useEffect: this pins the timeline (see
  // use-isomorphic-layout-effect.ts for why pinning requires it).
  useIsomorphicLayoutEffect(() => {
    if (!ref.current || !railRef.current) return;
    const ctx = gsap.context(() => {
      const mm = gsap.matchMedia();
      mm.add("(prefers-reduced-motion: no-preference) and (min-width: 900px)", () => {
        const rail = railRef.current!;
        const distance = () => Math.max(0, rail.scrollWidth - ref.current!.clientWidth);
        gsap.to(rail, {
          x: () => -distance(),
          ease: "none",
          scrollTrigger: {
            trigger: ref.current,
            pin: true,
            scrub: 0.5,
            start: "top top",
            end: () => `+=${distance()}`,
            invalidateOnRefresh: true,
            onUpdate: (self) => {
              setActive(Math.round(self.progress * (steps.length - 1)));
            },
          },
        });
        ScrollTrigger.refresh();
      });
    }, ref);
    return () => ctx.revert();
  }, [steps.length]);

  return (
    <div className="h-timeline" ref={ref}>
      <ol className="h-timeline__rail" ref={railRef}>
        {steps.map((step, i) => (
          <li
            key={step.title}
            className={`h-timeline__step${i === active ? " is-active" : ""}`}
          >
            <span className="h-timeline__dot" aria-hidden="true" />
            <span className="h-timeline__num">{String(i + 1).padStart(2, "0")}</span>
            <h3 className="h-timeline__title">{step.title}</h3>
            <p className="h-timeline__desc">{step.description}</p>
          </li>
        ))}
      </ol>
    </div>
  );
}
