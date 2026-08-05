"use client";

import { useEffect, useRef } from "react";
import { gsap, ScrollTrigger } from "@/lib/gsap";
import { SCRUB } from "@/lib/motion";

export interface ProcessStep {
  title: string;
  description: string;
}

/** Step-by-step "process loader". Each step is a rectangular panel connected
 * by a vertical progress rail that fills as the section scrolls into view —
 * completed steps light up (accent border + filled index) like a loading
 * sequence advancing. Reduced-motion / no-JS: every step shows completed. */
export default function ProcessLoader({ steps }: { steps: ProcessStep[] }) {
  const ref = useRef<HTMLDivElement>(null);
  const fillRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const root = ref.current;
    const fill = fillRef.current;
    if (!root || !fill) return;

    const ctx = gsap.context(() => {
      const mm = gsap.matchMedia();
      mm.add("(prefers-reduced-motion: no-preference)", () => {
        const items = Array.from(
          root.querySelectorAll<HTMLElement>(".process-loader__step")
        );

        const setActive = (progress: number) => {
          fill.style.setProperty("--fill", `${progress * 100}%`);
          const reached = progress * steps.length;
          items.forEach((el, i) => {
            el.classList.toggle("is-done", i + 0.6 <= reached);
            el.classList.toggle("is-active", i < reached && i + 0.6 > reached);
          });
        };

        setActive(0);
        const st = ScrollTrigger.create({
          trigger: root,
          start: "top 75%",
          end: "bottom 60%",
          scrub: SCRUB,
          invalidateOnRefresh: true,
          onUpdate: (self) => setActive(self.progress),
        });
        return () => st.kill();
      });
    }, ref);

    return () => ctx.revert();
  }, [steps.length]);

  return (
    <div className="process-loader" ref={ref}>
      <div className="process-loader__rail" aria-hidden="true">
        <span className="process-loader__fill" ref={fillRef} />
      </div>
      <ol className="process-loader__list">
        {steps.map((step, i) => (
          <li key={step.title} className="process-loader__step">
            <span className="process-loader__node" aria-hidden="true">
              <span className="process-loader__num">{String(i + 1).padStart(2, "0")}</span>
              <svg className="process-loader__check" viewBox="0 0 24 24" aria-hidden="true">
                <path d="M5 12.5l4.2 4.2L19 7" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </span>
            <div className="process-loader__body">
              <h3 className="process-loader__title">{step.title}</h3>
              <p className="process-loader__desc">{step.description}</p>
              <span className="process-loader__bar" aria-hidden="true" />
            </div>
          </li>
        ))}
      </ol>
    </div>
  );
}
