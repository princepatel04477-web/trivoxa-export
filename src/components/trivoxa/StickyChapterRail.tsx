"use client";

import { useEffect, useRef } from "react";
import type { ReactNode } from "react";
import { gsap, ScrollTrigger } from "@/lib/gsap";
import { DURATION, EASE } from "@/lib/motion";
import { prefersReducedMotion } from "@/hooks/useScrollAnimations";

export interface Chapter {
  title: string;
  content: ReactNode;
}

export default function StickyChapterRail({ chapters }: { chapters: Chapter[] }) {
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!rootRef.current) return;

    const ctx = gsap.context(() => {
      const titles = gsap.utils.toArray<HTMLElement>(".sticky-rail__chapter-title", rootRef.current!);
      const contents = gsap.utils.toArray<HTMLElement>(".sticky-rail__chapter-content", rootRef.current!);

      gsap.set(titles, { opacity: 0.3 });
      gsap.set(titles[0], { opacity: 1 });

      // The dim/undim is a position indicator, not decoration, so it survives
      // reduced motion — it just stops crossfading and switches instantly.
      const duration = prefersReducedMotion() ? 0 : DURATION.short;
      const setActive = (i: number) => {
        titles.forEach((t, j) => {
          gsap.to(t, { opacity: j === i ? 1 : 0.3, duration, ease: EASE.entry });
        });
      };

      contents.forEach((content, i) => {
        ScrollTrigger.create({
          trigger: content,
          start: "top center",
          end: "bottom center",
          invalidateOnRefresh: true,
          onEnter: () => setActive(i),
          onEnterBack: () => setActive(i),
        });
      });
    }, rootRef);

    return () => ctx.revert();
  }, []);

  return (
    <div className="sticky-rail" ref={rootRef}>
      <div className="sticky-rail__left">
        <div className="sticky-rail__sticky">
          {chapters.map((c, i) => (
            <div key={c.title} className="sticky-rail__chapter-title">
              <span className="sticky-rail__index">{String(i + 1).padStart(2, "0")}</span>
              <h3>{c.title}</h3>
            </div>
          ))}
        </div>
      </div>
      <div className="sticky-rail__right">
        {chapters.map((c, i) => (
          <div key={c.title} className="sticky-rail__chapter-content">
            <h3 className="sticky-rail__mobile-title">
              <span className="sticky-rail__index">{String(i + 1).padStart(2, "0")}</span>
              {c.title}
            </h3>
            {c.content}
          </div>
        ))}
      </div>
    </div>
  );
}
